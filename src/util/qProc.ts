import dbClient from '../database/dbObject'
import cReq from './cRequest'

const user = dbClient.db('tgCrypto').collection('User')

//Local storages to decrease amount of api\db calls
const favCache = new Map<string, fCache>()
const cryptoCache = new Map<string, cCache>()
// let mapCache: string[] = []
let recentCache: recCache | undefined

type fCache = {
	favorites: string[]
	taskID?: NodeJS.Timeout | undefined
}

type cCache = {
	name: string
	updated: string
	price: number
	cSupply: number
	tSupply: number
	mSupply: number
	v24: number
	vc24: number
	pc1: number
	pc24: number
	pc7: number
	pc30: number
	mCap: number
	mCapDom: number
	fdCap: number
}

type recCache = {
	data: [
		{
			name: string
			price: number
		}
	]
	updated: string
}

type botNswr = {
	msg?: string | undefined
	btn?: string | undefined
}

const resFavCache = (uID: string) => {
	let target = favCache.get(uID)
	if (!target) {
		return
	}

	if (target.taskID) {
		clearTimeout(target.taskID)
	}

	return setTimeout(() => {
		favCache.delete(uID)
	}, 600000)
}

const getFavList = async (uID: string) => {
	let res = favCache.get(uID)?.favorites
	if (res && res.length) {
		return res
	}

	let cUser = await user.findOne({ uID })
	if (!cUser) {
		await user.insertOne({ uID, favorites: [] })
		cUser = await user.findOne({ uID })
	}

	//@ts-ignore
	favCache.set(uID, { favorites: cUser.favorites, taskID: resFavCache(uID) })

	//@ts-ignore
	return favCache.get(uID).favorites
}

//TO-DO: delFavList, mapCache, heroku deployment, godforsaken eslint
const addFavList = async (uID: string, item: string): Promise<boolean> => {
	const list = await getFavList(uID)
	if (list.find((e) => e === item)) {
		return false
	}

	const cUser = await user.findOneAndUpdate(
		{ uID },
		//@ts-ignore
		{ $push: { favorites: item } }
	)

	if (!cUser) {
		throw 'Something wrong with the database. Try again later...'
	}

	//@ts-ignore
	favCache.set(uID, { favorites: cUser.favorites, taskID: resFavCache(uID) })
	return true
}

const delFavList = async (uID: string, item: string): Promise<boolean> => {
	const list = await getFavList(uID)
	if (!list.find((e) => e === item)) {
		return false
	}

	const cUser = await user.findOneAndUpdate(
		{ uID },
		//@ts-ignore
		{ $pull: { favorites: item } }
	)

	if (!cUser) {
		throw 'Something wrong with the database. Try again later...'
	}

	//@ts-ignore
	favCache.set(uID, { favorites: cUser.favorites, taskID: resFavCache(uID) })
	return true
}

const qProc = async (query: string[], userID: string): Promise<botNswr> => {
	try {
		if (!query || !query[0] || query[0][0] !== '/') {
			return { msg: 'You talking to me?' }
		}

		switch (query[0]) {
			case '/start':
				return {
					msg: 'Welcome to the world of crypto! Send /help to see your options...',
				}

			case '/help':
				return {
					msg: "Here's what you can do:\n/listrecent - Take a look at recent crypto\n/{currency_name} - Get detailed info about crypto of your choice; ex:\n<code>/BTC</code>\n<code>/ETH</code>\n/addfavorite {currency_name} - Add crypto to favorites\n/deletefavorite {currency_name} - Delete crypto from favorites\n/listfavorite - Look at your favorites",
				}

			case '/listrecent': {
				//Need to copy before working with it because of planned cache clearing
				let cRecCache = recentCache
				if (!cRecCache) {
					const res = await cReq.getLatest()
					const data = res.data.map((e) => ({
						name: e.symbol,
						price: e.quote.USD.price,
					}))
					const updated = res.status.timestamp
					recentCache = { data, updated }
					cRecCache = recentCache
					setTimeout(() => {
						recentCache = undefined
					}, 600000)
				}

				const date = cRecCache.updated.split('T')

				let msg = `Here's some recent crypto for you as of ${date[0]} ${
					date[1].split('.')[0]
				} UTC:`
				cRecCache.data.forEach((e) => {
					msg = msg + `\n/${e.name} - <code>$${e.price}</code>`
				})
				return { msg }
			}

			case '/addfavorite': {
				const cSymb = query[1]?.toUpperCase()
				if (!cSymb) {
					return {
						msg: 'You must enter crypto name. Ex:\n<code>/addfavorite XMR</code>',
					}
				}

				return {
					msg: (await addFavList(userID, cSymb))
						? `${cSymb} succesfully added to your favorites`
						: `${cSymb} is already in your favorites`,
				}
			}

			case '/deletefavorite': {
				const cSymb = query[1]?.toUpperCase()
				if (!cSymb) {
					return {
						msg: 'You must enter crypto name. Ex:\n<code>/deletefavorite XMR</code>',
					}
				}

				return {
					msg: (await delFavList(userID, cSymb))
						? `${cSymb} succesfully deleted from your favorites`
						: `${cSymb} is not present in your favorites`,
				}
			}

			case '/listfavorite': {
				const list = await getFavList(userID)
				if (!list || !list.length) {
					return {
						msg: 'Your favorites are empty. Try adding something first...',
					}
				}

				const board: any = {}
				board.inline_keyboard = []

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
					])
				})

				return {
					msg: 'Here is your favorite crypto:',
					btn: JSON.stringify(board),
				}
			}

			default: {
				const cSymb = query[0].substr(1).toUpperCase()
				let cCrypCache = cryptoCache.get(cSymb)
				if (!cCrypCache) {
					const res = (await cReq.getCurrency(cSymb)).data[cSymb]
					cryptoCache.set(cSymb, {
						name: res.name,
						updated: res.last_updated,
						price: res.quote.USD.price,
						cSupply: res.circulating_supply,
						tSupply: res.total_supply,
						mSupply: res.max_supply,
						v24: res.quote.USD.volume_24h,
						vc24: res.quote.USD.volume_change_24h,
						pc1: res.quote.USD.percent_change_1h,
						pc24: res.quote.USD.percent_change_24h,
						pc7: res.quote.USD.percent_change_7d,
						pc30: res.quote.USD.percent_change_30d,
						mCap: res.quote.USD.market_cap,
						mCapDom: res.quote.USD.market_cap_dominance,
						fdCap: res.quote.USD.fully_diluted_market_cap,
					})

					cCrypCache = cryptoCache.get(cSymb)
					setTimeout(() => {
						cryptoCache.delete(cSymb)
					}, 600000)
				}

				const uFavList = await getFavList(userID)
				const isFav = !!uFavList.find((e) => e === cSymb)

				//No, it is absolutely not 'possibly undefined'
				//@ts-ignore
				const date = cCrypCache.updated.split('T')
				return {
					msg: `${cCrypCache?.name} - ${date[0]} ${
						date[1].split('.')[0]
					} UTC:\nPrice - <code>$${
						cCrypCache?.price
					}</code>\n\nSupply:\n\tcurrent - <code>${
						cCrypCache?.cSupply
					}</code>\n\ttotal - <code>${
						cCrypCache?.tSupply
					}</code>\n\tmax - <code>${
						cCrypCache?.mSupply
					}</code>\n\nVolume, 24h - <code>${
						cCrypCache?.v24
					}</code>\nVolume change, 24h - <code>${
						cCrypCache?.vc24
					}</code>\nPercent change:\n\t1h - <code>${
						cCrypCache?.pc1
					}%</code>\n\t24h - <code>${
						cCrypCache?.pc24
					}%</code>\n\t7d - <code>${
						cCrypCache?.pc7
					}%</code>\n\t30d - <code>${
						cCrypCache?.pc30
					}%</code>\n\nMarket cap - <code>${
						cCrypCache?.mCap
					}</code>\nDominance - <code>${
						cCrypCache?.mCapDom
					}</code>\nFully diluted - <code>${
						cCrypCache?.fdCap
					}</code>`,
					btn: JSON.stringify({
						inline_keyboard: [
							[
								{
									text: `${
										isFav ? 'Delete from' : 'Add to'
									} favorites`,
									callback_data: `/${
										isFav ? 'delete' : 'add'
									}favorite ${cSymb}`,
								},
							],
						],
					}),
				}
			}
		}
	} catch (e) {
		console.log(e)
		//@ts-ignore
		return typeof e === 'string'
			? { msg: e }
			: { msg: 'Internal server error occured. Try again later...' }
	}

	return {}
}

export = qProc
