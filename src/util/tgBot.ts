import TelegramBot from 'node-telegram-bot-api';
import qProc from './queryProcessor';

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

	const botFunc = async (msg: TelegramBot.Message | TelegramBot.CallbackQuery) => {
		try {
			if (typeof msg?.from?.id !== 'number') {
				return;
			}

			// @ts-ignore -- one of those fields exist in any incoming type
			const chatID: string = msg?.chat?.id || msg?.message?.chat?.id;
			const userID: number = msg.from!.id;
			// @ts-ignore -- same here
			const raw = msg.text || msg.data || ' ';
			const query: string[] = raw.split(' ');
			const qRes = await qProc(query, userID);

			await cryptoBot.sendMessage(chatID, qRes.msg || 'Sorry, no answer has been specified...', { parse_mode: 'HTML', reply_markup: qRes.btn });
		} catch (e) {
			console.log(e, msg);
		}
	};

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
		// {
		// 	command: '/addfavorite',
		// 	description: 'Add crypto to favorites',
		// },
		// {
		// 	command: '/deletefavorite',
		// 	description: 'Delete crypto from favorites',
		// },
	]);

	cryptoBot.on('message', botFunc);

	cryptoBot.on('callback_query', botFunc);

	return cryptoBot;
};

export = { init };
