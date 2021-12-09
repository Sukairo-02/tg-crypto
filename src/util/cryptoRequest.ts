import axios from 'axios';
import config from 'config';
import type { tApiLatest, tApiCurrency, tErrorResponse } from '../types/reqTypes';

const key: string = config.get('crypto.key');

export const getLatest = async (): Promise<tApiLatest> => {
	let res: tApiLatest;
	try {
		res = (
			await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=20&convert=USD', {
				headers: {
					'X-CMC_PRO_API_KEY': key,
				},
			})
		).data;
		return res;
	} catch (e) {
		switch ((<tErrorResponse>e)?.response?.status) {
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
};

export const getCurrency = async (name: string): Promise<tApiCurrency> => {
	let res: tApiCurrency;
	try {
		res = (
			await axios.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${name}&convert=USD`, {
				headers: {
					'X-CMC_PRO_API_KEY': key,
				},
			})
		).data;
		return res;
	} catch (e) {
		switch ((<tErrorResponse>e)?.response?.status) {
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
};
