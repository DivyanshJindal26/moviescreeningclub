import { Loading } from '@/components/icons/Loading'
import { useLogin } from '@/components/LoginContext'
import { api } from '@/utils/api'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Swal from 'sweetalert2'

const OrderPage = () => {
  const location = useLocation()
  const { user } = useLogin()
  const showTimeId = new URLSearchParams(location.search).get('showtime')
  const [foodItems, setFoodItems] = useState([])
  const [movie, setMovie] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  useEffect(() => {
    getFoodItems()
    getMovie()
  }, [])
  if (!showTimeId) return <Navigate to="/home" />
  const getFoodItems = async () => {
    try {
      const response = await api.get(`/food/show/${showTimeId}`)
      if (!response.data) {
        throw new Error('Failed to fetch food items')
      }
      setFoodItems(response.data)
    } catch (error) {
      console.error('Error fetching food items:', error)
    }
  }
  const getMovie = async () => {
    try {
      const response = await api.get(`movie/show/${showTimeId}`)
      if (!response.data) {
        throw new Error('Failed to fetch movies')
      }
      setMovie(response.data)
    } catch (error) {
      console.error('Error fetching movies:', error)
    }
  }

  const handleIncrease = (food) => {
    const existingItem = selectedItems.find((item) => item._id === food._id)
    if (existingItem) {
      setSelectedItems(
        selectedItems.map((item) =>
          item._id === food._id
            ? {
                ...item,
                quantity: item.quantity + 1,
                price: (item.quantity + 1) * food.price
              }
            : item
        )
      )
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          _id: food._id,
          name: food.name,
          quantity: 1,
          price: food.price,
          vendor: food.vendor
        }
      ])
    }
  }

  const handleDecrease = (food) => {
    const existingItem = selectedItems.find((item) => item._id === food._id)
    if (existingItem && existingItem.quantity > 1) {
      setSelectedItems(
        selectedItems.map((item) =>
          item._id === food._id
            ? {
                ...item,
                quantity: item.quantity - 1,
                price: (item.quantity - 1) * food.price
              }
            : item
        )
      )
    } else {
      setSelectedItems(selectedItems.filter((item) => !item._id === food._id))
    }
  }

  const handleSubmitOrder = async () => {
    Swal.fire({
      title: 'Confirm',
      text: `Are you sure you want to order?`,
      icon: 'info',
      confirmButtonText: 'Yes',
      showCancelButton: true
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsSubmitting(true)
        const orderData = {
          showtimeId: showTimeId,
          items: selectedItems
        }
        try {
          const response = await api.post('/order', orderData)
          console.log(orderData)
          if (response.status !== 200) {
            Swal.fire({
              title: 'Error',
              text: 'Failed to place order',
              icon: 'error'
            })
            console.error('Error requesting membership:', response.data.error)
            return
          }
          const options = {
            atomTokenId: response.data.atomTokenId,
            merchId: response.data.merchId,
            custEmail: user.email,
            custMobile: user.phone,
            returnUrl:
              (import.meta.env.VITE_environment === 'development'
                ? 'http://localhost:8000'
                : document.location.origin) + '/api/order/redirect'
          }
          // eslint-disable-next-line no-undef
          let atom = new AtomPaynetz(options, 'uat')
          setSelectedItems([])
        } catch (error) {
          console.error('Error placing order:', error)
          const err = error.response?.data?.error

          Swal.fire({
            title: 'Error',
            text: typeof err == 'string' ? err : 'Failed to place order',
            icon: 'error'
          })
        } finally {
          setIsSubmitting(false)
          getFoodItems()
        }
      }
    })
  }

  if (!movie) {
    return <Loading />
  }
  if (!foodItems.length) {
    return (
      <div className="max-w-4xl mx-auto p-5 bg-gray-100 dark:bg-[#212121] rounded-xl font-sans flex-1 flex-col items-center">
        <h2 className="text-2xl font-bold text-red-500 text-center mb-6">
          Order Food
        </h2>
        <h3 className="text-lg font-semibold text-center mb-4">
          No Food Items
        </h3>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-5 bg-gray-100 dark:bg-[#212121] rounded-xl font-sans flex-1 flex-col items-center">
      <h2 className="text-2xl font-bold text-red-500 text-center mb-6">
        Order Food
      </h2>

      <h3 className="text-lg font-semibold text-center mb-1 capitalize">
        current Movie: {movie.title}
      </h3>
      <p className="w-full text-center  mb-4">
        showtime:{' '}
        {new Date(
          movie.showtimes.find((s) => s._id === showTimeId).date
        ).toLocaleString()}
      </p>
      <h3 className="text-lg font-semibold text-center mb-4">Select Food</h3>
      <div className="space-y-6">
        {foodItems.map((food) => (
          <div
            key={food._id}
            className="flex items-center bg-white dark:bg-[#0C0C0C] p-4 rounded-lg shadow"
          >
            <img
              src={food.poster}
              alt={food.name}
              className="w-24 h-24 object-cover rounded-lg mr-4"
            />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {food.name}
              </h2>
              <p className="text-green-600">{food.description}</p>
              <p className="text-gray-800 dark:text-gray-200">
                Rs. {food.price}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Vendor: {food.vendor}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Available : {food.quantity}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                className="bg-yellow-500 text-white font-bold px-3 py-1 rounded hover:bg-yellow-600"
                onClick={() => handleDecrease(food)}
              >
                -
              </button>
              <span className="font-bold text-lg">
                {selectedItems.find((item) => item._id === food._id)
                  ?.quantity || 0}
              </span>
              <button
                className="bg-yellow-500 text-white font-bold px-3 py-1 rounded hover:bg-yellow-600"
                onClick={() => handleIncrease(food)}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-white dark:bg-[#0C0C0C] rounded-lg shadow">
        <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
        <ul className="space-y-2">
          {selectedItems.map((item) => (
            <li
              key={`${item._id}`}
              className="text-gray-800 dark:text-gray-400"
            >
              {item.name} (Vendor: {item.vendor}) - {item.quantity} x Rs.{' '}
              {item.price / item.quantity} = Rs. {item.price}
            </li>
          ))}
        </ul>
        <p className="text-right text-xl font-semibold mt-4">
          Total Price: Rs.{' '}
          {selectedItems.reduce((total, item) => total + item.price, 0)}
        </p>
        <button
          className="mt-6 w-full bg-red-500 text-white font-bold py-3 rounded hover:bg-red-600"
          onClick={handleSubmitOrder}
          disabled={isSubmitting || !selectedItems.length}
        >
          {isSubmitting ? 'Placing...' : 'Place Order'}
        </button>
      </div>
    </div>
  )
}

export default OrderPage
