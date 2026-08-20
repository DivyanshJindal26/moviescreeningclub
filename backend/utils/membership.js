const MemPrice = require('@/models/membershipprice.model')
const { getUserType } = require('@/utils/user')

const getAmount = async (membership, email) => {
  const memData = await MemPrice.find();
  const type = getUserType(email)
  const { price } = memData.find(
    (mem) => mem.name === membership || mem.passType === membership
  )
  return price.find((p) => p.type === type).price
}

module.exports = { getAmount }
