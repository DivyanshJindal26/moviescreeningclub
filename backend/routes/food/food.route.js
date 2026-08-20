const express = require('express')
const router = express.Router()
const {
  getFoodItems,
  getFoodItemsByShowTime,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem
} = require('@/controllers/food/food.controller')
const { verifyJWTWithRole } = require('@/middleware')

router.get('/', getFoodItems)
router.get('/show/:showTimeId', getFoodItemsByShowTime)
router.post('/', verifyJWTWithRole('admin'), createFoodItem)
router.post('/update/:id', verifyJWTWithRole('admin'), updateFoodItem)
router.delete('/:id', verifyJWTWithRole('admin'), deleteFoodItem)

module.exports = router
