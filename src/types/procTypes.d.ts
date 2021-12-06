import type { InlineKeyboardMarkup } from 'node-telegram-bot-api'

type tFavCache = {
	favorites: string[]
	taskID?: NodeJS.Timeout | undefined
}

type tCryptoCache = {
	name: string
	updated: string
	price: number
	supCurrent: number
	supTotal: number
	supMax: number | null
	vol24h: number
	volChange24h: number
	percentChange1h: number
	percentChange24h: number
	percentChange7d: number
	percentChange30d?: number | undefined
	marketCap: number
	marketCapDom: number
	fullyDiluted: number
}

type tRecentCache = {
	data: {
		name: string
		price: number
	}[]
	updated: string
}

type tBotNswr = {
	msg: string
	btn?: InlineKeyboardMarkup | undefined
}

export type { tFavCache, tCryptoCache, tRecentCache, tBotNswr }
