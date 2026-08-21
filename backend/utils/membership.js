const MemPrice = require('@/models/membershipprice.model')
const Membership = require('@/models/membership.model')
const { getUserType } = require('@/utils/user')

// Valid values for Membership.memtype, read straight off the schema so this
// never drifts from the model.
const MEMTYPES = Membership.schema.path('memtype').enumValues

// Look up a MembershipPrice by either its (unique) name or its passType.
// Name wins: passType is not unique, so matching on it first would silently
// pick the wrong document when several passes share a passType.
const findMemPrice = (memData, memtype) =>
  memData.find((m) => m.name === memtype) ||
  memData.find((m) => m.passType === memtype)

// Map a MembershipPrice document to the memtype stored on a Membership.
// Price names are free-form (admins type them in on the Ticket Prices page),
// so the passType is what decides a Film Fest pass — never the name.
// Returns null when the price has no corresponding memtype.
const resolveMemtype = (memDetails) => {
  if (!memDetails) return null
  if (memDetails.passType === 'filmFest') return 'filmFest'
  return MEMTYPES.includes(memDetails.name) ? memDetails.name : null
}

const getAmount = async (membership, email) => {
  const memData = await MemPrice.find()
  const type = getUserType(email)
  const memDetails = findMemPrice(memData, membership)
  if (!memDetails) throw new Error(`Unknown membership: ${membership}`)
  const priceForType = memDetails.price.find((p) => p.type === type)
  if (!priceForType) {
    throw new Error(`No ${type} price configured for ${memDetails.name}`)
  }
  return priceForType.price
}

module.exports = { getAmount, findMemPrice, resolveMemtype, MEMTYPES }
