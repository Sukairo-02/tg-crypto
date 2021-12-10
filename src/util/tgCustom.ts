import axios from 'axios';
import express from 'express';
import type { Update } from 'node-telegram-bot-api'; // Only types, not the lib
import qProc from './queryProcessor';

const app = express();
app.use(express.json());

let localToken: string;

app.post('/bot', async (req: express.Request, res: express.Response) => {
	try {
		const msg: Update = req.body;
		if (!msg || !msg.update_id) {
			return res.sendStatus(200);
		}

		const chatID: number | undefined = msg.message?.chat?.id || msg.callback_query?.message?.chat?.id;
		const userID: number | undefined = msg.message?.from?.id || msg.callback_query?.from?.id;
		const rawQuery = msg.callback_query?.data || msg.message?.text || '';
		const query: string[] = rawQuery.split(' ');

		if (typeof userID !== 'number' || typeof chatID !== 'number') {
			return res.sendStatus(200);
		}

		const qRes = await qProc(query, userID);
		await axios.post(`https://api.telegram.org/bot${localToken}/sendMessage`, {
			chat_id: chatID,
			parse_mode: 'HTML',
			text: qRes.msg,
			reply_markup: JSON.stringify(qRes.btn),
		});

		return res.sendStatus(200);
	} catch (e) {
		console.log(e, req);
		return res.sendStatus(200);
	}
});

export = async (botToken: string, port: number | string, url: string) => {
	try {
		if (!botToken || !port || !url) {
			throw 'Bot error: missing data';
		}

		localToken = botToken;

		app.listen(port, () => {
			console.log(`Bot: listening to port ${port}`);
		});

		await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, { url: `${url}/bot` });
		console.log(`Bot: webhook set to url: ${url}/bot`);
	} catch (e) {
		console.log(e);
	}
};
