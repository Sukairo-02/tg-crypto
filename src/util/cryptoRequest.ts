import axios from 'axios';
import config from 'config';
import type { tApiLatest, tApiCurrency } from '../types/reqTypes';

const key: string = config.get('crypto.key');

const getLatest = async (): Promise<tApiLatest> => {
	let res: tApiLatest;
	try {
		res = (
			await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=20&convert=USD', {
				headers: {
					'X-CMC_PRO_API_KEY': key,
				},
			})
		).data;
	} catch (e) {
		// @ts-ignore
		switch (e?.response?.status) {
			case 0:
				break;
			case 400:
				throw 'Invalid currency. Try another...';
			case 401:
			case 403:
			case 429:
				throw 'Api request limit exceeded. Try again later...';
			default:
				throw 'External api error. Try again later...';
		}
	}

	return res!;
};

const getCurrency = async (name: string): Promise<tApiCurrency> => {
	let res: tApiCurrency;
	try {
		res = (
			await axios.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${name}&convert=USD`, {
				headers: {
					'X-CMC_PRO_API_KEY': key,
				},
			})
		).data;
	} catch (e) {
		// @ts-ignore
		switch (e?.response?.status) {
			case 0:
				break;
			case 400:
				throw 'Invalid currency. Try another...';
			case 401:
			case 403:
			case 429:
				throw 'Api request limit exceeded. Try again later...';
			default:
				throw 'External api error. Try again later...';
		}
	}

	return res!;
};

export = { getLatest, getCurrency /* , getCurrencies */ };
