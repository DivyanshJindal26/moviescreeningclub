import { api } from '@/utils/api'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Swal from 'sweetalert2'
const AdminFood = () => {
  const location = useLocation()
  const showTimeId = new URLSearchParams(location.search).get('showtime')
  const [foodItems, setFoodItems] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    price: null,
    vendor: '',
    description: '',
    poster: '',
    quantity: null,
    available: true
  })
  const [editingId, setEditingId] = useState(null)
  useEffect(() => {
    getFoodItems()
  }, [])
  if (!showTimeId) return <Navigate to="/home" />
  const getFoodItems = async () => {
    try {
      const response = await api.get(`/food/show/${showTimeId}`)
      console.log(response)
      if (!response.data) {
        throw new Error('Failed to fetch food items')
      }
      setFoodItems(response.data)
    } catch (error) {
      console.error('Error fetching food items:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newFoodItem = {
      ...formData,
      showTimeId
    }

    if (editingId) {
      try {
        const response = await api.put(`/food/${editingId}`, newFoodItem)
        if (!response.ok) {
          Swal.fire({
            title: 'Error',
            text: 'Failed to update food item',
            icon: 'error'
          })
        }
        Swal.fire({
          title: 'Success',
          text: 'Food item updated successfully',
          icon: 'success'
        })
        resetForm()
        getFoodItems()
        setEditingId(null)
      } catch (error) {
        console.error('Error updating food item:', error)
      }
    } else {
      try {
        const response = await api.post('/food', newFoodItem)
        if (!response.ok) {
          Swal.fire({
            title: 'Error',
            text: 'Failed to add food item',
            icon: 'error'
          })
        }
        Swal.fire({
          title: 'Success',
          text: 'Food item added successfully',
          icon: 'success'
        })
        resetForm()
        getFoodItems()
      } catch (error) {
        console.error('Error adding food item:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      vendor: '',
      description: '',
      poster: '',
      quantity: '',
      available: true
    })
  }

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      price: item.price,
      vendor: item.vendor,
      description: item.description,
      poster: item.poster,
      quantity: item.quantity,
      available: item.available
    })
    setEditingId(item._id)
  }

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/food/${id}`)
      if (!response.ok) {
        Swal.fire({
          title: 'Error',
          text: 'Failed to delete food item',
          icon: 'error'
        })
      }
      Swal.fire({
        title: 'Success',
        text: 'Food item deleted successfully',
        icon: 'success'
      })
      getFoodItems()
    } catch (error) {
      console.error('Error deleting food item:', error)
    }
  }
  const setFormdata = (key, value) => {
    if (key === 'price' || key === 'quantity') {
      if (isNaN(value)) {
        setFormData({
          ...formData,
          [key]: formData[key]
        })
        return
      }
      if (parseInt(value) < 0) {
        value = 0
      }
      value = parseInt(value)
    }

    setFormData({
      ...formData,
      [key]: value
    })
  }
  return (
    <div className="flex max-sm:flex-col gap-5 justify-between p-5">
      <div className="flex-1 w-full sm:min-w-[300px] p-5 border border-gray-300 dark:border-gray-800 dark:bg-[#212121] rounded-lg bg-gray-100">
        <p className="mb-5 font-semibold text-xl">
          {editingId ? 'Edit Food Item' : 'Add Food Item'}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="block font-bold mb-1">Food Name:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormdata('name', e.target.value)}
              required
              className="w-full p-2 border border-gray-400 rounded"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="block font-bold mb-1">Vendor:</label>
            <input
              type="text"
              value={formData.vendor}
              onChange={(e) => setFormdata('vendor', e.target.value)}
              required
              className="w-full p-2 border border-gray-400 rounded"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="block font-bold mb-1">Price:</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormdata('price', e.target.value)}
              required
              className="w-full p-2 border border-gray-400 rounded"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="block font-bold mb-1">Quantity:</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormdata('quantity', e.target.value)}
              required
              className="w-full p-2 border border-gray-400 rounded"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="block font-bold mb-1">Description:</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormdata('description', e.target.value)}
              className="w-full p-2 border border-gray-400 rounded"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="block font-bold mb-1">Image URL:</label>
            <input
              type="text"
              value={formData.poster}
              onChange={(e) => setFormdata('poster', e.target.value)}
              required
              className="w-full p-2 border border-gray-400 rounded"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="available"
              name="availability"
              value="true"
              checked={formData.available}
              onChange={() => setFormdata('available', true)}
            />
            <label htmlFor="available">Available</label>
            <input
              type="radio"
              id="unavailable"
              name="availability"
              value="false"
              checked={!formData.available}
              onChange={() => setFormdata('available', false)}
            />
            <label htmlFor="unavailable">Unavailable</label>
          </div>
          <div className="w-full flex gap-2 mt-2">
            <button
              type="submit"
              className="grow bg-yellow-400 text-red-600 font-bold py-2 px-4 rounded hover:bg-yellow-300"
            >
              {editingId ? 'Update Food Item' : 'Add Food Item'}
            </button>
            <button
              type="reset"
              className="grow bg-red-500 text-white font-bold py-2 px-4 rounded hover:bg-red-700"
              onClick={resetForm}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <div className="flex-1 min-w-[300px] p-5 border border-gray-300 dark:border-gray-800 dark:bg-[#212121] rounded-lg bg-gray-100">
        <p className="mb-5 text-xl">Food Items List</p>
        {foodItems.length > 0 ? (
          <ul className="space-y-5">
            {foodItems.map((food) => (
              <li
                key={food._id}
                className="flex flex-col sm:flex-row items-center border-b pb-4 gap-2"
              >
                <img
                  src={food.poster}
                  alt={food.foodName}
                  className="w-full sm:w-32 max-h-32 object-cover rounded mr-4"
                />
                <div className="flex-1 w-full">
                  <h4 className="text-lg font-bold">{food.foodName}</h4>
                  <p className="text-green-600">{food.description}</p>
                  <p className="">Rs. {food.price}</p>
                  <p className="">quantity available {food.quantity}</p>
                  <p>{food.vendor}</p>
                  <p>{food.available ? 'Available' : 'Not available'}</p>
                </div>
                <div className="ml-auto flex flex-row sm:flex-col gap-2">
                  <button
                    onClick={() => handleEdit(food)}
                    className="bg-blue-500 sm:w-full text-white py-1 px-3 rounded hover:bg-blue-400"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(food._id)}
                    className="bg-red-500 sm:w-full text-white py-1 px-3 rounded hover:bg-red-400"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No food items found.</p>
        )}
      </div>
    </div>
  )
}

export default AdminFood
