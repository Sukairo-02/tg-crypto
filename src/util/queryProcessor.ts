import type { InlineKeyboardMarkup } from 'node-telegram-bot-api';
import dbClient from '../database/dbObject';
import cryptoRequest from './cryptoRequest';
import type {
 tFavCache, tCryptoCache, tRecentCache, tBotNswr,
} from '../types/procTypes';

const user = dbClient.db('tgCrypto').collection('User');

// Local storages to decrease amount of api\db calls
const favCache = new Map<number, tFavCache>();
const cryptoCache = new Map<string, tCryptoCache>();
// let mapCache: string[] = []
let recentCache: tRecentCache | undefined;

const resetFavCache = (uID: number) => {
	const target = favCache.get(uID);
	if (!target) {
		return;
	}

	if (target.taskID) {
		clearTimeout(target.taskID);
	}

	// eslint-disable-next-line consistent-return
	return setTimeout(() => {
		favCache.delete(uID);
	}, 600000);
};

const getFavList = async (uID: number) => {
	const res = favCache.get(uID)?.favorites;
	if (res && res.length) {
		return res;
	}

	let cUser = await user.findOne({ uID });
	if (!cUser) {
		await user.insertOne({ uID, favorites: [] });
		cUser = await user.findOne({ uID });
	}

	favCache.set(uID, {
		favorites: cUser?.favorites,
		taskID: resetFavCache(uID),
	});

	return favCache.get(uID)!.favorites;
};

const addFavList = async (uID: number, item: string): Promise<boolean> => {
	const list = await getFavList(uID);
	if (list.find((e) => e === item)) {
		return false;
	}

	const cUser = await user.findOneAndUpdate(
		{ uID },
		// @ts-ignore -- impossible to get rid of
		{ $push: { favorites: item } },
	);

	if (!cUser) {
		throw 'Something wrong with the database. Try again later...';
	}

	favCache.set(uID, {
		// @ts-ignore -- impossible to get rid of
		favorites: cUser.favorites,
		taskID: resetFavCache(uID),
	});
	return true;
};

const delFavList = async (uID: number, item: string): Promise<boolean> => {
	const list = await getFavList(uID);
	if (!list.find((e) => e === item)) {
		return false;
	}

	const cUser = await user.findOneAndUpdate(
		{ uID },
		// @ts-ignore -- impossible to get rid of
		{ $pull: { favorites: item } },
	);

	if (!cUser) {
		throw 'Something wrong with the database. Try again later...';
	}

	favCache.set(uID, {
		// @ts-ignore -- impossible to get rid of
		favorites: cUser.favorites,
		taskID: resetFavCache(uID),
	});
	return true;
};

const queryProcessor = async (query: string[], userID: number): Promise<tBotNswr> => {
	try {
		if (!query || !query[0] || query[0][0] !== '/') {
			return { msg: 'You talking to me?' };
		}

		switch (query[0]) {
			case '/start':
				return {
					msg: 'Welcome to the world of crypto! Send /help to see your options...',
				};

			case '/help':
				return {
					msg: "Here's what you can do:\n/listrecent - Take a look at recent crypto\n/{currency_name} - Get detailed info about crypto of your choice; ex:\n<code>/BTC</code>\n<code>/ETH</code>\n/addfavorite {currency_name} - Add crypto to favorites\n/deletefavorite {currency_name} - Delete crypto from favorites\n/listfavorite - Look at your favorites",
				};

			case '/listrecent': {
				// Need to copy before working with it because of planned cache clearing
				let cRecCache = recentCache;
				if (!cRecCache) {
					const res = await cryptoRequest.getLatest();
					const data = res.data.map((e) => ({
						name: e.symbol,
						price: e.quote.USD.price,
					}));
					const updated = res.status.timestamp;
					recentCache = { data, updated };
					cRecCache = recentCache;
					setTimeout(() => {
						recentCache = undefined;
					}, 600000);
				}

				const date = cRecCache!.updated.split('T');

				let msg = `Here's some recent crypto for you as of ${date[0]} ${date[1].split('.')[0]} UTC:`;
				cRecCache!.data.forEach((e) => {
					msg += `\n/${e.name} - <code>$${e.price}</code>`;
				});
				return { msg };
			}

			case '/addfavorite': {
				const cSymb = query[1]?.toUpperCase();
				if (!cSymb) {
					return {
						msg: 'You must enter crypto name. Ex:\n<code>/addfavorite XMR</code>',
					};
				}

				return {
					msg: (await addFavList(userID, cSymb)) ? `${cSymb} succesfully added to your favorites` : `${cSymb} is already in your favorites`,
				};
			}

			case '/deletefavorite': {
				const cSymb = query[1]?.toUpperCase();
				if (!cSymb) {
					return {
						msg: 'You must enter crypto name. Ex:\n<code>/deletefavorite XMR</code>',
					};
				}

				return {
					msg: (await delFavList(userID, cSymb)) ? `${cSymb} succesfully deleted from your favorites` : `${cSymb} is not present in your favorites`,
				};
			}

			case '/listfavorite': {
				const list = await getFavList(userID);
				if (!list || !list.length) {
					return {
						msg: 'Your favorites are empty. Try adding something first...',
					};
				}

				const board: InlineKeyboardMarkup = { inline_keyboard: [] };

				list.forEach((e) => {
					board.inline_keyboard.push([
						{
							text: e,
							callback_data: `/${e}`,
						},
						{
							text: '❌',
							callback_data: `/deletefavorite ${e}`,
						},
					]);
				});

				return {
					msg: 'Here is your favorite crypto:',
					btn: board,
				};
			}

			default: {
				const cSymb = query[0].substr(1).toUpperCase();
				let cCrypCache = cryptoCache.get(cSymb);
				if (!cCrypCache) {
					const res = (await cryptoRequest.getCurrency(cSymb)).data[cSymb];
					cryptoCache.set(cSymb, {
						name: res.name,
						updated: res.last_updated,
						price: res.quote.USD.price,
						supCurrent: res.circulating_supply,
						supTotal: res.total_supply,
						supMax: res.max_supply,
						vol24h: res.quote.USD.volume_24h,
						volChange24h: res.quote.USD.volume_change_24h,
						percentChange1h: res.quote.USD.percent_change_1h,
						percentChange24h: res.quote.USD.percent_change_24h,
						percentChange7d: res.quote.USD.percent_change_7d,
						percentChange30d: res.quote.USD.percent_change_30d,
						marketCap: res.quote.USD.market_cap,
						marketCapDom: res.quote.USD.market_cap_dominance,
						fullyDiluted: res.quote.USD.fully_diluted_market_cap,
					});

					cCrypCache = cryptoCache.get(cSymb);
					setTimeout(() => {
						cryptoCache.delete(cSymb);
					}, 600000);
				}

				const uFavList = await getFavList(userID);
				const isFav = !!uFavList.find((e) => e === cSymb);

				const date = cCrypCache!.updated.split('T');
				return {
					msg: `${cCrypCache?.name} - ${date[0]} ${date[1].split('.')[0]} UTC:\nPrice - <code>$${cCrypCache?.price}</code>\n\nSupply:\n\tcurrent - <code>${cCrypCache?.supCurrent}</code>\n\ttotal - <code>${
						cCrypCache?.supTotal
					}</code>\n\tmax - <code>${cCrypCache?.supMax}</code>\n\nVolume, 24h - <code>${cCrypCache?.vol24h}</code>\nVolume change, 24h - <code>${cCrypCache?.volChange24h}</code>\nPercent change:\n\t1h - <code>${
						cCrypCache?.percentChange1h
					}%</code>\n\t24h - <code>${cCrypCache?.percentChange24h}%</code>\n\t7d - <code>${cCrypCache?.percentChange7d}%</code>\n\t30d - <code>${cCrypCache?.percentChange30d}%</code>\n\nMarket cap - <code>${
						cCrypCache?.marketCap
					}</code>\nDominance - <code>${cCrypCache?.marketCapDom}</code>\nFully diluted - <code>${cCrypCache?.fullyDiluted}</code>`,
					btn: {
						inline_keyboard: [
							[
								{
									text: `${isFav ? 'Delete from' : 'Add to'} favorites`,
									callback_data: `/${isFav ? 'delete' : 'add'}favorite ${cSymb}`,
								},
							],
						],
					},
				};
			}
		}
	} catch (e) {
		console.log(e);
		return typeof e === 'string' ? { msg: e } : { msg: 'Internal server error occured. Try again later...' };
	}
};

export = queryProcessor;
