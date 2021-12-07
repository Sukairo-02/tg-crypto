import { MongoClient } from 'mongodb';
import config from 'config';

const dbClient = new MongoClient(config.get('db.conStr'), {
	// @ts-ignore
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

export = dbClient;
