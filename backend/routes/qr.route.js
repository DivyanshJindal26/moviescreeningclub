const express = require('express')
const { getQRs, check, cancelQr } = require('@/controllers/QR.controller')
const { verifyJWTWithRole } = require('@/middleware')

const router = express.Router()

router.post('/check', verifyJWTWithRole('ticketvolunteer'), check)
router.get('/', verifyJWTWithRole(), getQRs)
router.post('/cancel/:id', verifyJWTWithRole(), cancelQr)
module.exports = router
