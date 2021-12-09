import TelegramBot from 'node-telegram-bot-api';
import qProc from './queryProcessor';

const botFunc = (cryptoBot: TelegramBot) => async (msg: TelegramBot.Message | TelegramBot.CallbackQuery) => {
	try {
		const chatID: number | string | undefined = (<TelegramBot.Message>msg)?.chat?.id || (<TelegramBot.CallbackQuery>msg)?.message?.chat?.id;
		const userID: number | undefined = msg?.from?.id;
		const raw = (<TelegramBot.Message>msg).text || (<TelegramBot.CallbackQuery>msg).data || '';
		const query: string[] = raw.split(' ');

		if (typeof userID !== 'number' || !(typeof chatID === 'string' || typeof chatID === 'number')) {
			return;
		}

		const qRes = await qProc(query, userID);

		await cryptoBot.sendMessage(chatID, qRes.msg || 'Sorry, no answer has been specified...', { parse_mode: 'HTML', reply_markup: qRes.btn });
	} catch (e) {
		console.log(e, msg);
	}
};

const init = (botToken: string, PORT: number, url?: string | undefined) => {
	let cryptoBot: TelegramBot;
	if (url) {
		cryptoBot = new TelegramBot(botToken, {
			webHook: {
				port: PORT,
			},
		});

		cryptoBot.setWebHook(`${url}/bot${botToken}`);
	} else {
		cryptoBot = new TelegramBot(botToken, {
			polling: true,
		});
	}

	cryptoBot.setMyCommands([
		{
			command: '/start',
			description: 'Begin your work with bot',
		},
		{
			command: '/help',
			description: 'Short info about bot and command list',
		},
		{
			command: '/listrecent',
			description: 'Take a look at trending crypto',
		},
		{
			command: '/listfavorite',
			description: 'Take a look at your favorites',
		},
		{
			command: '/addfavorite',
			description: 'Add crypto to favorites',
		},
		{
			command: '/deletefavorite',
			description: 'Delete crypto from favorites',
		},
	]);

	cryptoBot.on('message', botFunc(cryptoBot));

	cryptoBot.on('callback_query', botFunc(cryptoBot));

	return cryptoBot;
};

export = { init }; // Exporting in recommended way here leads to errors both here and on import
