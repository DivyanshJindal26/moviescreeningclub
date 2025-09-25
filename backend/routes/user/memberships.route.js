const express = require('express')
const router = express.Router()
const {
  saveMembership,
  checkMembership,
  suspendMembership,
  requestMembership,
  assignBaseMembership,
  getMembershipPrices,
  setMembershipPrice,
  manualAdd,
  createMembership,
  getOnSpotCost,
  requestOnSpotMembership
} = require('@/controllers/user/memberships.controller')
const { verifyJWTWithRole } = require('@/middleware')

router.post('/redirect', saveMembership)
router.post('/request', verifyJWTWithRole('standard'), requestMembership)
router.get('/check', verifyJWTWithRole('standard'), checkMembership)
router.post(
  '/assign-base-membership',
  verifyJWTWithRole('admin'),
  assignBaseMembership
)
router.post('/manual-add', verifyJWTWithRole('admin'), manualAdd)
router.get('/prices', verifyJWTWithRole('standard'), getMembershipPrices)
router.post('/prices', verifyJWTWithRole('admin'), setMembershipPrice)
router.post('/create', verifyJWTWithRole('admin'), createMembership)
router.post('/onspotprices', verifyJWTWithRole('standard'), getOnSpotCost)
router.post(
  '/requestonspot',
  verifyJWTWithRole('standard'),
  requestOnSpotMembership
)
// router.put('/suspend/:id', verifyJWTWithRole('standard'), suspendMembership)
module.exports = router
