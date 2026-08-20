const Queue = require('bull')
const Order = require('@/models/food/order.model')
const paymentTimeoutQueue = new Queue('food-payment-timeout')
paymentTimeoutQueue.process(async (job) => {
  const { orderId } = job.data
  const order = await Order.findById(orderId)

  if (order && !order.paid) {
    for (const item of order.foodList) {
      const food = await Food.findById(item._id)
      food.quantity += item.quantity
      await food.save()
    }
    await order.deleteOne()
  }
})
