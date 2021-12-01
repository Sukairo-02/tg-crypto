import rp from 'request-promise'
import config from 'config'

const key: String = config.get('crypto.key')

const getLatest = async (): Promise<any> => {
	let res
	try {
		res = await rp({
			method: 'GET',
			uri: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
			qs: {
				start: '1',
				limit: '20',
				convert: 'USD',
			},
			headers: {
				'X-CMC_PRO_API_KEY': key,
			},
			json: true,
			gzip: true,
		})
	} catch (e) {
		res = e
	}

	if (res.error) {
		switch (res.error.status.error_code) {
			case 0:
				break
			case 400:
				throw 'Invalid currency. Try another...'
			case 401:
			case 403:
			case 429:
				throw 'Api request limit exceeded. Try again later...'
			default:
				throw 'External api error. Try again later...'
		}
	}

	return res
}

const getCurrency = async (name: String): Promise<any> => {
	let res
	try {
		res = await rp({
			method: 'GET',
			uri: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
			qs: {
				symbol: name,
				convert: 'USD',
			},
			headers: {
				'X-CMC_PRO_API_KEY': key,
			},
			json: true,
			gzip: true,
		})
	} catch (e) {
		res = e
	}

	if (res.error) {
		switch (res.error.status.error_code) {
			case 0:
				break
			case 400:
				throw 'Invalid currency. Try another...'
			case 401:
			case 403:
			case 429:
				throw 'Api request limit exceeded. Try again later...'
			default:
				throw 'External api error. Try again later...'
		}
	}

	return res
}

//Doesn't respond anything for some reason
// const getCurrencies = async (): Promise<any> => {
// 	let res
// 	try {
// 		res = await rp({
// 			method: 'GET',
// 			uri: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map',
// 			headers: {
// 				'X-CMC_PRO_API_KEY': key,
// 			},
// 			json: true,
// 			gzip: true,
// 		})
// 	} catch (e) {
// 		res = e
// 	}

// 	console.log(res)

// 	if (res.error) {
// 		switch (res.error.status.error_code) {
// 			case 0:
// 				break
// 			case 400:
// 				throw 'Invalid currency. Try another...'
// 			case 401:
// 			case 403:
// 			case 429:
// 				throw 'Api request limit exceeded. Try again later...'
// 			default:
// 				throw 'External api error. Try again later...'
// 		}
// 	}

// 	return res
// }

export = { getLatest, getCurrency /*, getCurrencies*/ }
