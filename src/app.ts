import config from 'config';
// import tgBot from './util/tgBot';
import tgBot from './util/tgCustom';
import dbClient from './database/dbObject';

const PORT: number = Number(process.env.PORT) || config.get('server.PORT') || 3000;
const url: string = config.get('server.URL');
const botToken: string = config.get('tg.bot');

const start = async () => {
	try {
		await dbClient.connect((err) => {
			console.log(err || 'Database connected succesfully!');
		});

		tgBot(botToken, PORT, url);
	} catch (e) {
		console.log(e);
	} finally {
		await dbClient.close();
		console.log('Database connection has been terminated.\n');
	}
};

start();
