type tQuote = {
	price: number;
	volume_24h: number;
	volume_change_24h: number;
	percent_change_1h: number;
	percent_change_24h: number;
	percent_change_7d: number;
	percent_change_30d?: number | undefined;
	market_cap: number;
	market_cap_dominance: number;
	fully_diluted_market_cap: number;
	last_updated: string;
};

type tStatus = {
	timestamp: string;
	error_code: number;
	error_message: string;
	elapsed: number;
	credit_count: number;
};

type tData = {
	id: number;
	name: string;
	symbol: string;
	slug: string;
	is_active?: number | undefined;
	is_fiat?: number | undefined;
	cmc_rank: number;
	num_market_pairs: number;
	circulating_supply: number;
	total_supply: number;
	max_supply: number | null;
	last_updated: string;
	date_added: string;
	tags: string[];
	platform: {
		id: number;
		name: string;
		symbol: string;
		slug: string;
		token_address: string;
	} | null;
	quote: { [name: string]: tQuote };
};

type tApiLatest = {
	data: tData[];
	status: tStatus;
};

type tApiCurrency = {
	data: { [name: string]: tData };
	status: tStatus;
};

export type { tApiLatest, tApiCurrency };
