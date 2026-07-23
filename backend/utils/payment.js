const crypto = require('crypto')
require('dotenv').config()
const axios = require('axios')
const qs = require('qs')

const resHashKey = `${process.env.RES_HASH_KEY}`

const req_enc_key = `${process.env.REQ_ENC_KEY}`
const req_salt = `${process.env.REQ_SALT}`
const res_dec_key = `${process.env.RES_DEC_KEY}`
const res_salt = `${process.env.RES_SALT}`

const algorithm = 'aes-256-cbc'
const password = Buffer.from(req_enc_key, 'utf8')
const salt = Buffer.from(req_salt, 'utf8')
const respassword = Buffer.from(res_dec_key, 'utf8')
const ressalt = Buffer.from(res_salt, 'utf8')
const iv = Buffer.from(
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  'utf8'
)
const merchId = `${process.env.MERCH_ID}`
const merchPass = `${process.env.MERCH_PASS}`
const authUrl = `${process.env.PAY_AUTH_URL}`

const encrypt = (text) => {
  var derivedKey = crypto.pbkdf2Sync(password, salt, 65536, 32, 'sha512')
  const cipher = crypto.createCipheriv(algorithm, derivedKey, iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return `${encrypted.toString('hex')}`
}

const decrypt = (text) => {
  const encryptedText = Buffer.from(text, 'hex')
  var derivedKey = crypto.pbkdf2Sync(respassword, ressalt, 65536, 32, 'sha512')
  const decipher = crypto.createDecipheriv(algorithm, derivedKey, iv)
  let decrypted = decipher.update(encryptedText)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}

const generateSignature = (json) => {
  var signatureString =
    json.merchDetails.merchId.toString() +
    json.payDetails.atomTxnId +
    json.merchDetails.merchTxnId.toString() +
    json.payDetails.totalAmount.toFixed(2).toString() +
    json.responseDetails.statusCode.toString() +
    json.payModeSpecificData.subChannel[0].toString() +
    json.payModeSpecificData.bankDetails.bankTxnId.toString()
  var hmac = crypto.createHmac('sha512', resHashKey)
  data = hmac.update(signatureString)
  gen_hmac = data.digest('hex')
  return gen_hmac
}

const getAtomFromGateway = async (
  txnId,
  txnDate,
  amount,
  userEmailId,
  userContactNo,
  userId,
  udfs
) => {
  const reqAtomId = {
    payInstrument: {
      headDetails: {
        version: 'OTSv1.1',
        api: 'AUTH',
        platform: 'FLASH'
      },
      merchDetails: {
        merchId: merchId,
        userId: userId,
        password: merchPass,
        merchTxnId: txnId,
        merchTxnDate: txnDate
      },
      payDetails: {
        amount: amount.toString(),
        product: process.env.PROD_NAME || 'ONE',
        txnCurrency: 'INR'
      },
      custDetails: {
        custEmail: userEmailId,
        custMobile: userContactNo.toString()
      },
      extras: udfs
    }
  }
  const reqAtomIdStr = JSON.stringify(reqAtomId)
  const encReqAtomIdStr = encrypt(reqAtomIdStr)

  const resFromGateway = await axios.post(
    authUrl,
    qs.stringify({
      encData: encReqAtomIdStr,
      merchId: merchId
    }),
    {
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'application/x-www-form-urlencoded'
      }
    }
  )
  if (resFromGateway.status !== 200) {
    return res
      .status(500)
      .json({ error: 'Internal server error or Payment Gateway down' })
  }
  const parsedRespFromGateway = qs.parse(resFromGateway.data)
  if (!parsedRespFromGateway.encData) {
    return { error: 'No encData in response from Gateway' }
  }
  const decryptedResFromGateway = decrypt(parsedRespFromGateway.encData)
  const jsonDecryptedResFromGateway = JSON.parse(decryptedResFromGateway)

  if (jsonDecryptedResFromGateway.responseDetails.txnStatusCode !== 'OTS0000') {
    return { error: 'Transaction failed' }
  }
  return {
    error: null,
    atomTokenId: jsonDecryptedResFromGateway.atomTokenId,
    merchId: merchId
  }
}

// Query Atom's transaction status API to confirm payment server-side.
// Returns { f_code, mmp_txn, amt, mer_txn } — f_code === 'Ok' means success.
// Never trust the redirect payload alone; always confirm via this call.
//
// NOTE: The exact field paths in Atom's status response depend on their API
// version. If the mapping below doesn't match live responses, inspect
// rawAtomResponse in the PendingTransaction record to find the right paths.
const queryAtomTransactionStatus = async (merchTxnId, amount, date) => {
  // Fall back to deriving the status URL from the auth URL if not explicitly set
  const statusUrl =
    process.env.PAY_STATUS_URL || authUrl.replace('/auth', '/transstatus')

  const reqPayload = {
    payInstrument: {
      headDetails: {
        version: 'OTSv1.1',
        api: 'TRANSSTATUS',
        platform: 'FLASH'
      },
      merchDetails: {
        merchId: merchId,
        password: merchPass,
        userid: process.env.PROD_NAME || 'NSE',
        merchTxnId: merchTxnId,
        merchTxnDate: date
      },
      payDetails: {
        amount: amount.toString()
      }
    }
  }

  const encReq = encrypt(JSON.stringify(reqPayload))
  const response = await axios.post(
    statusUrl,
    qs.stringify({ encData: encReq, merchId }),
    {
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'application/x-www-form-urlencoded'
      }
    }
  )

  const parsed = qs.parse(response.data)
  if (!parsed.encData) {
    return { error: 'No encData in status response', raw: response.data }
  }

  const decrypted = JSON.parse(decrypt(parsed.encData))
  const instrument = decrypted.payInstrument || decrypted

  // Map Atom response fields — statusCode 'OTS0000' means success
  const statusCode = instrument.responseDetails?.statusCode
  const f_code =
    instrument.responseDetails?.f_code ||
    instrument.payDetails?.f_code ||
    (statusCode === 'OTS0000' ? 'Ok' : 'NOT Ok')

  return {
    f_code,
    mmp_txn: instrument.payDetails?.atomTxnId || instrument.mmp_txn,
    amt:
      instrument.payDetails?.totalAmount ||
      instrument.payDetails?.amount ||
      instrument.amt,
    mer_txn: instrument.merchDetails?.merchTxnId || instrument.mer_txn,
    raw: decrypted
  }
}

module.exports = {
  encrypt,
  decrypt,
  generateSignature,
  getAtomFromGateway,
  queryAtomTransactionStatus
}
