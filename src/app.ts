import express from 'express'
import config from 'config'
import dbClient from './database/dbObject'

const app = express()
const PORT = config.get('server.PORT') || 3000

app.use(express.json())

const start = async () => {
	try {
		await dbClient.connect((err) => {
			console.log(err || 'Database connected succesfully!')
		})
		app.listen(PORT, () => {
			console.log(`Server has been started at port: ${PORT}`)
		})
	} catch (e) {
		console.log(e)
	} finally {
		await dbClient.close()
		console.log('Database connection has been terminated.\n')
	}
}

start()
