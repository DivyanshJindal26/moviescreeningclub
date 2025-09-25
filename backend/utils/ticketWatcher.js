const OnSpotTicket = require('../models/onspot.model.js')
const SeatMap = require('../models/seatmap.model.js')

OnSpotTicket.watch(
  [], // watch all changes
  { fullDocumentBeforeChange: 'required' } // get the document before deletion
).on('change', async (change) => {
  try {
    // Only handle deleted tickets
    if (change.operationType !== 'delete') return

    const deletedTicket = change.fullDocumentBeforeChange
    if (!deletedTicket) return

    // Only release seats if the ticket was still locked (payment not confirmed)
    if (deletedTicket.status !== 'locked') return

    const { showtimeId, seats } = deletedTicket

    // Release each seat in SeatMap
    for (let seat of seats) {
      await SeatMap.updateOne(
        { showtimeId },
        { $set: { [`seats.${seat}`]: null } }
      )
      console.log(`Seat ${seat} released (payment not confirmed).`)
    }

    // Optionally, clean up QR entries associated with these seats
    const QR = require('../models/qr.model.js')
    await QR.deleteMany({
      showtime: showtimeId,
      seat: { $in: seats },
      membershipType: 'onspot'
    })
  } catch (err) {
    console.error('Error releasing OnSpot seats:', err)
  }
})
