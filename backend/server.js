require('node:dns/promises').setServers(['8.8.8.8', '1.1.1.1'])
require('module-alias/register')
const { config } = require('dotenv')
config({ path: './.env' })

const fs = require('fs')
const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const cors = require('cors')
const { createServer } = require('https')
const path = require('path')
const cookieParser = require('cookie-parser')

const apiRoute = require('@/routes')
// Initialize the payment reconciliation background worker.
// Importing the module is enough — it self-schedules on load.
require('@/utils/reconciliation')

const PORT = process.env.PORT ?? 8000

const app = express()
app.set('trust proxy', 1)

const sslOptions = {
  cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  key: fs.readFileSync(process.env.SSL_KEY_PATH),
  ca: process.env.SSL_CA_PATH ? fs.readFileSync(process.env.SSL_CA_PATH) : undefined
}

const server = createServer(sslOptions, app)

mongoose
  .connect(`${process.env.MongoDB}`, { family: 4 })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error))

app.use(cors({ origin: true, credentials: true }))
// DONT REMOVE THIS 2 LINES ITS REQUIRED BY NT DATA PAY
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, '../frontend/dist')))

app.use((req, _, next) => {
  if (
    !req.url.match(/(assets|images|index\.html|.*\.(svg|png|jpg|jpeg))$/) &&
    process.env.NODE_ENV !== 'production'
  ) {
    console.log(`${req.method} ${req.url}`)
  }
  next()
})

app.use('/api', apiRoute)

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'))
})

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message)
  if (res.headersSent) return next(err)
  res.status(500).json({ error: 'Internal server error' })
})

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (HTTPS)`)
})
