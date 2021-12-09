import type { InlineKeyboardMarkup } from 'node-telegram-bot-api';
import type { PushOperator } from 'mongodb';
import dbClient from '../database/dbObject';
import cryptoRequest from './cryptoRequest';
import type { tFavCache, tCryptoCache, tRecentCache, tBotNswr } from '../types/procTypes';

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

	let currentUser = await user.findOne({ uID });
	if (!currentUser) {
		await user.insertOne({ uID, favorites: [] });
		currentUser = await user.findOne({ uID });
	}

	favCache.set(uID, {
		favorites: currentUser?.favorites,
		taskID: resetFavCache(uID),
	});

	return favCache.get(uID)!.favorites;
};

const addFavList = async (uID: number, item: string): Promise<boolean> => {
	const list = await getFavList(uID);
	if (list.find((e) => e === item)) {
		return false;
	}

	const currentUser = await user.findOneAndUpdate({ uID }, { $push: { favorites: item } as PushOperator<Document> });

	if (!currentUser) {
		throw 'Something wrong with the database. Try again later...';
	}

	favCache.set(uID, {
		favorites: (<tFavCache>(<unknown>currentUser)).favorites,
		taskID: resetFavCache(uID),
	});
	return true;
};

const delFavList = async (uID: number, item: string): Promise<boolean> => {
	const list = await getFavList(uID);
	if (!list.find((e) => e === item)) {
		return false;
	}

	const currentUser = await user.findOneAndUpdate({ uID }, { $pull: { favorites: item } as PushOperator<Document> });

	if (!currentUser) {
		throw 'Something wrong with the database. Try again later...';
	}

	favCache.set(uID, {
		favorites: (<tFavCache>(<unknown>currentUser)).favorites,
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
				let copyRecCache = recentCache;
				if (!copyRecCache) {
					const res = await cryptoRequest.getLatest();
					const data = res.data.map((e) => ({
						name: e.symbol,
						price: e.quote.USD.price,
					}));
					const updated = res.status.timestamp;
					recentCache = { data, updated };
					copyRecCache = recentCache;

					let earliest: number;
					res.data.forEach((e) => {
						const updateDate = new Date(e.last_updated).getTime();
						if (!earliest || updateDate < earliest) {
							earliest = updateDate;
						}
					});
					setTimeout(() => {
						recentCache = undefined;
					}, 60050 - (Date.now() - earliest!));
					// Now cache is somewhat synchronized with api's data update time
				}

				if (!new Date(copyRecCache!.updated)) {
					throw { msg: 'Error: API sent invalid date...\n', reason: copyRecCache?.updated }; // Message is meant for server only
				}

				const date = copyRecCache!.updated.split('T');

				let msg = `Here's some recent crypto for you as of ${date[0]} ${date[1].split('.')[0]} UTC:`;
				copyRecCache!.data.forEach((e) => {
					msg += `\n/${e.name} - <code>$${e.price}</code>`;
				});
				return { msg };
			}

			case '/addfavorite': {
				const currentSymbol = query[1]?.toUpperCase();

				if (!currentSymbol) {
					return {
						msg: 'You must enter crypto name. Ex:\n<code>/addfavorite XMR</code>',
					};
				}

				let copyCrypCache = cryptoCache.get(currentSymbol);
				if (!copyCrypCache) {
					const res = (await cryptoRequest.getCurrency(currentSymbol)).data[currentSymbol];
					cryptoCache.set(currentSymbol, {
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

					const updateDate = new Date(res.last_updated).getTime();

					copyCrypCache = cryptoCache.get(currentSymbol);
					setTimeout(() => {
						cryptoCache.delete(currentSymbol);
					}, 60050 - (Date.now() - updateDate));
					// Now cache is somewhat synchronized with api's data update time
				}

				return {
					msg: (await addFavList(userID, currentSymbol)) ? `${currentSymbol} succesfully added to your favorites` : `${currentSymbol} is already in your favorites`,
				};
			}

			case '/deletefavorite': {
				const currentSymbol = query[1]?.toUpperCase();
				if (!currentSymbol) {
					return {
						msg: 'You must enter crypto name. Ex:\n<code>/deletefavorite XMR</code>',
					};
				}

				return {
					msg: (await delFavList(userID, currentSymbol)) ? `${currentSymbol} succesfully deleted from your favorites` : `${currentSymbol} is not present in your favorites`,
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
				const currentSymbol = query[0].substr(1).toUpperCase();
				let copyCrypCache = cryptoCache.get(currentSymbol);
				if (!copyCrypCache) {
					const res = (await cryptoRequest.getCurrency(currentSymbol)).data[currentSymbol];
					cryptoCache.set(currentSymbol, {
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

					const updateDate = new Date(res.last_updated).getTime();

					copyCrypCache = cryptoCache.get(currentSymbol);
					setTimeout(() => {
						cryptoCache.delete(currentSymbol);
					}, 60050 - (Date.now() - updateDate));
					// Now cache is somewhat synchronized with api's data update time
				}

				const uFavList = await getFavList(userID);
				const isFav = !!uFavList.find((e) => e === currentSymbol);

				if (!new Date(copyCrypCache!.updated)) {
					throw { msg: 'Error: API sent invalid date...\n', reason: copyCrypCache?.updated }; // Message is meant for server only
				}

				const date = copyCrypCache!.updated.split('T');
				return {
					msg: `${copyCrypCache?.name}:\n\tRequest date - <code>${date[0]} ${date[1].split('.')[0]} UTC</code>\n\tPrice - <code>$${copyCrypCache?.price}</code>\n\n\tSupply:\n\t\tcurrent - <code>${
						copyCrypCache?.supCurrent
					}</code>\n\t\ttotal - <code>${copyCrypCache?.supTotal}</code>\n\t\tmax - <code>${copyCrypCache?.supMax}</code>\n\n\tVolume, 24h - <code>${copyCrypCache?.vol24h}</code>\n\tVolume change, 24h - <code>${
						copyCrypCache?.volChange24h
					}</code>\n\tPercent change:\n\t\t1h - <code>${copyCrypCache?.percentChange1h}%</code>\n\t\t24h - <code>${copyCrypCache?.percentChange24h}%</code>\n\t\t7d - <code>${copyCrypCache?.percentChange7d}%</code>\n\t\t30d - <code>${
						copyCrypCache?.percentChange30d
					}%</code>\n\n\tMarket cap - <code>${copyCrypCache?.marketCap}</code>\n\tDominance - <code>${copyCrypCache?.marketCapDom}</code>\n\tFully diluted - <code>${copyCrypCache?.fullyDiluted}</code>`,
					btn: {
						inline_keyboard: [
							[
								{
									text: `${isFav ? 'Delete from' : 'Add to'} favorites`,
									callback_data: `/${isFav ? 'delete' : 'add'}favorite ${currentSymbol}`,
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

export = queryProcessor; // Both ESLint and Typescript don't let me change this one either
