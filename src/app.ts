import tgBot from 'node-telegram-bot-api'
import config from 'config'
import dbClient from './database/dbObject'
import qProc from './util/qProc'
import express from 'express'

const PORT = process.env.PORT || config.get('server.PORT') || 3000
const botToken = config.get('tg.bot')
const url = config.get('server.URL')
const app = express()
app.use(express.json())

const cryptoBot = new tgBot(botToken, { polling: true })

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
])

const botFunc = async (msg: any) => {
	try {
		const chatID: string = msg.chat ? msg.chat.id : msg.message.chat.id
		const userID: string = msg.from.id
		const raw = msg.text || msg.data || ' '
		const query: string[] = raw.split(' ')
		const qRes = await qProc(query, userID)

		await cryptoBot.sendMessage(
			chatID,
			qRes.msg || 'Sorry, no answer has been specified...',
			{ parse_mode: 'HTML', reply_markup: qRes.btn }
		)
	} catch (e) {
		console.log(e, msg)
	}
}

cryptoBot.on('message', botFunc)

cryptoBot.on('callback_query', botFunc)

app.post(`/bot${botToken}`, (req, res) => {
	cryptoBot.processUpdate(req.body)
	res.sendStatus(200)
})

const start = async () => {
	try {
		await dbClient.connect((err) => {
			console.log(err || 'Database connected succesfully!')
		})

		app.listen(PORT, () => {
			console.log(`Server has been started at port ${PORT}.\n`)
		})

		if (url) {
			cryptoBot.setWebHook(`${url}/bot${botToken}`) //connect to URL
		}
	} catch (e) {
		console.log(e)
	} finally {
		await dbClient.close()
		console.log('Database connection has been terminated.\n')
	}
}

start()
