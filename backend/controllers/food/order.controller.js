const Order = require('@/models/food/order.model')
const Food = require('@/models/food/food.model')
const { getAtomFromGateway, decrypt, generateSignature, queryAtomTransactionStatus } = require('@/utils/payment')
const crypto = require('crypto')
const { mailFoodOrder } = require('@/utils/mail')
const User = require('@/models/user/user.model')
const getAmount = (items) => {
  return items.reduce((acc, item) => acc + item._id.price * item.quantity, 0)
}
const createOrder = async (req, res) => {
  try {
    const { showtimeId, items } = req.body
    const foods = await Food.find({
      _id: { $in: items.map((food) => food._id) },
      available: true,
      quantity: { $gt: 0 }
    })
    const foundIds = new Set(foods.map((f) => f._id.toString()))
    const missingItems = items.filter((fwq) => !foundIds.has(fwq._id.toString()))
    if (missingItems.length > 0) {
      return res.status(400).json({
        error: 'Some food items were not found or are unavailable'
      })
    }
    const insufficientFoods = items.filter((fwq) => {
      const food = foods.find((f) => f._id.toString() === fwq._id.toString())
      return food && fwq.quantity > food.quantity
    })
    if (insufficientFoods.length > 0) {
      const errorDetails = insufficientFoods
        .map((fwq) => {
          const food = foods.find((f) => f._id.toString() === fwq._id.toString())
          return `${food.name} has only ${food.quantity} available`
        })
        .join(', ')
      return res.status(400).json({
        error: 'Insufficient quantity for the following foods: ' + errorDetails
      })
    }
    const order = new Order({
      user: req.user.userId,
      showtime: showtimeId,
      foodList: items,
      email: req.user.email,
      otp: crypto.randomBytes(16).toString('hex').slice(0, 6),
      txnId: crypto.randomBytes(16).toString('hex')
    })
    const saveFood = await Promise.all(
      items.map(async (food) => {
        const result = await Food.findOneAndUpdate(
          {
            _id: food._id,
            available: true,
            quantity: { $gte: food.quantity }
          },
          {
            $inc: { quantity: -food.quantity }
          },
          {
            new: true
          }
        )
        return result
      })
    )

    if (saveFood.includes(null)) {
      // Restore quantities for items that were decremented
      await Promise.all(
        items.map(async (food, i) => {
          if (saveFood[i] != null) {
            await Food.findByIdAndUpdate(food._id, { $inc: { quantity: food.quantity } })
          }
        })
      )
      return res.status(400).json({
        message:
          'Failed to add order: insufficient quantity or food unavailable'
      })
    }

    let saved
    try {
      saved = await order.save()
    } catch (saveErr) {
      // Restore quantities since order save failed
      await Promise.all(
        items.map(async (food) => {
          await Food.findByIdAndUpdate(food._id, { $inc: { quantity: food.quantity } })
        })
      )
      throw saveErr
    }
    await order.populate('foodList._id')
    const txnId = order.txnId
    const txnDate = new Date()
      .toISOString()
      .replace(/T/, ' ')
      .replace(/\..+/, '')
    const user = await User.findById(req.user.userId)
    const amount = getAmount(order.foodList)
    const userEmailId = user.email
    const userContactNo = user.phone
    const { error, atomTokenId, merchId } = await getAtomFromGateway(
      txnId,
      txnDate,
      amount,
      userEmailId,
      userContactNo,
      user._id.toString(),
      {
        udf1: order._id.toString(),
        udf2: user._id.toString(),
        udf3: 'FOOD',
        udf4: '',
        udf5: ''
      }
    )
    if (error) {
      return res.status(500).json({ error })
    }
    return res.status(200).json({
      atomTokenId: atomTokenId,
      txnId: txnId,
      merchId: merchId
    })
  } catch (error) {
    console.error('Error creating order:', error)
    res.status(500).json({ message: 'Failed to create order', error })
  }
}

const confirmOrder = async (req, res) => {
  try {
    const decrypted_data = decrypt(req.body.encData)
    const jsonData = JSON.parse(decrypted_data)
    console.log(jsonData)
    const signature = generateSignature(jsonData.payInstrument)
    if (signature !== jsonData.payInstrument.payDetails.signature) {
      console.log('signature mismatched!!')
      return res.redirect(
        `${process.env.FRONTEND_URL}/?err=signature_mismatched`
      )
    }
    if (jsonData.payInstrument.responseDetails.statusCode !== 'OTS0000') {
      return res.redirect(`${process.env.FRONTEND_URL}/?err=transaction_failed`)
    }

    const merchTxnId = jsonData.payInstrument.merchDetails.merchTxnId
    const payAmount = jsonData.payInstrument.payDetails.totalAmount
    const txnDate = jsonData.payInstrument.merchDetails.merchTxnDate
    try {
      const statusResult = await queryAtomTransactionStatus(merchTxnId, payAmount, txnDate)
      if (statusResult.statusCode !== 'OTS0000') {
        console.error('[confirmOrder] Atom status API rejected txn', merchTxnId, statusResult)
        return res.redirect(`${process.env.FRONTEND_URL}/?err=payment_verification_failed`)
      }
    } catch (verifyErr) {
      console.error('[confirmOrder] Atom status API error for txn', merchTxnId, verifyErr.message)
      return res.redirect(`${process.env.FRONTEND_URL}/?err=payment_verification_failed`)
    }

    const orderId = jsonData.payInstrument.extras.udf1
    const userId = jsonData.payInstrument.extras.udf2
    const email = jsonData.payInstrument.custDetails.custEmail.toLowerCase()
    const txnId = jsonData.payInstrument.merchDetails.merchTxnId

    const order = await Order.findOne({ _id: orderId, user: userId }).populate(
      'foodList._id'
    )
    if (!order) {
      return res.redirect(`${process.env.FRONTEND_URL}/?err=order_not_found`)
    }
    if (order.delivered) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/?err=order_already_delivered`
      )
    }
    order.paid = true
    await order.save()
    const items = order.foodList.map((item) => ({
      name: item._id.name,
      vendor: item._id.vendor,
      quantity: item.quantity,
      price: item._id.price
    }))
    await mailFoodOrder(items, order.otp, email)
    return res.redirect(`${process.env.FRONTEND_URL}/?msg=order_confirmed`)
  } catch (error) {
    console.error('Error saving order:', error)
    return res.redirect(
      `${process.env.FRONTEND_URL}/?err=internal_server_error`
    )
  }
}
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user.userId
    })
      .populate('showtime')
      .populate('foodList._id')
    res.status(200).json(orders)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders', error })
  }
}

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body

    const order = await Order.findOne({ otp: otp }).populate('foodList._id')

    if (!order) {
      return res.status(400).json({ error: 'Invalid email or OTP.' })
    }
    if (order.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ error: 'Invalid email or OTP.' })
    }
    if (order.delivered) {
      return res.status(400).json({ error: 'Order already delivered.' })
    }
    if (!order.paid) {
      return res.status(400).json({ error: 'Order not paid.' })
    }
    order.delivered = true
    await order.save()
    return res.status(200).json({ order })
  } catch (error) {
    console.error('Error verifying OTP:', error)
    return res.status(500).json({ message: 'Failed to verify OTP.' })
  }
}

module.exports = {
  createOrder,
  getOrders,
  confirmOrder,
  verifyOtp
}
