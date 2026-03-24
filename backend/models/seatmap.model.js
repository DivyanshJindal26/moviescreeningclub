const mongoose = require('mongoose')

const SeatMapSchema = new mongoose.Schema({
  showtimeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  date: { type: Date, required: true },
  seats: {
    type: Map,
    of: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QR'
    },
    required: true,
    default: () => {
      const defaultSeats = new Map()
      const rows = [
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T'
      ]
      for (let row of rows) {
        let rowCount
        switch (row) {
          case 'A':
            rowCount = 27
            break
          case 'B':
          case 'C':
            rowCount = 30
            break
          case 'D':
            rowCount = 33
            break
          case 'E':
            rowCount = 34
            break
          case 'F':
            rowCount = 36
            break
          case 'G':
            rowCount = 38
            break
          case 'H':
            rowCount = 40
            break
          case 'I':
            rowCount = 41
            break
          case 'J':
          case 'K':
          case 'L':
          case 'M':
          case 'N':
          case 'O':
          case 'P':
            rowCount = 36
            break
          case 'Q':
            rowCount = 42
            break
          case 'R':
          case 'S':
            rowCount = 43
            break
          case 'T':
            rowCount = 43
            break
          default:
            rowCount = 0
        }
        for (let i = 1; i <= rowCount; i++) {
          defaultSeats.set(row + i, null)
        }
      }
      return defaultSeats
    }
  }
})

if (!mongoose.models.SeatMap) {
  mongoose.model('SeatMap', SeatMapSchema)
}

module.exports = mongoose.models.SeatMap
