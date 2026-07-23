require('node:dns/promises').setServers(['8.8.8.8', '1.1.1.1'])
require('module-alias/register')
const { config } = require('dotenv')
config({ path: './.env' })

const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const cors = require('cors')
const { createServer } = require('http')
const path = require('path')
const cookieParser = require('cookie-parser')

const apiRoute = require('@/routes')
// Initialize the payment reconciliation background worker.
// Importing the module is enough — it self-schedules on load.
require('@/utils/reconciliation')

const PORT = process.env.PORT ?? 8000

const app = express()
const https = createServer(app)

mongoose
  .connect(`${process.env.MongoDB}`, { family: 4 })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error))

const corsOptions = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true)
    } else {
      const allowedOrigins = [
        'https://chalchitra.iitmandi.ac.in',
        process.env.FRONTEND_URL
      ].filter(Boolean)
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    }
  },
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, Authorization'
}
app.use(cors(corsOptions))
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

https.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
