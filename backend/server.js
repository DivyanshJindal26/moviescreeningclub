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

const PORT = process.env.PORT ?? 8000

const app = express()
const https = createServer(app)

mongoose
  .connect(`${process.env.MongoDB}`)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error))

require('./utils/ticketWatcher.js')

const corsOptions = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV === 'development' || true) {
      callback(null, true)
    } else {
      const allowedOrigins = ['https://chalchitra.iitmandi.ac.in']
      if (allowedOrigins.indexOf(origin) !== -1) {
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

https.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
