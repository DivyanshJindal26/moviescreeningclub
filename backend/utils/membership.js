const MemPrice = require('@/models/membershipprice.model')
const { getUserType } = require('@/utils/user')

const getAmount = async (membership, email) => {
  const memData = await MemPrice.find();
  const type = getUserType(email)
  const memEntry = memData.find(
    (mem) => mem.name === membership || mem.passType === membership
  )
  if (!memEntry) {
    throw new Error(`Unknown membership type: ${membership}`)
  }
  const priceEntry = memEntry.price.find((p) => p.type === type)
  if (!priceEntry) {
    throw new Error(`No pricing found for designation "${type}" on membership "${membership}"`)
  }
  return priceEntry.price
}

module.exports = { getAmount }
