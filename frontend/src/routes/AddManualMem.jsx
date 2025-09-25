import { Loading } from '@/components/icons/Loading'
import { api } from '@/utils/api'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'

const MovieForm = () => {
  const [formData, setFormData] = useState({
    userEmail: '',
    txnId: '',
    membershipType: '',
    amount: ''
  })
  const [loading, setLoading] = useState(false)
  const [membershipOptions, setMembershipOptions] = useState([])

  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleVerify = () => {
    setLoading(true)
    api
      .get(`/user/membershipdata/${formData.userEmail}`)
      .then((res) => {
        setMembershipOptions(res.data.userPrices)
        setFormData((prev) => ({
          ...prev,
          membershipType: '',
          amount: ''
        }))
      })
      .catch((err) => {
        console.error(err)
        if (err.response?.status === 404) {
          Swal.fire({ title: 'Error', text: 'User not found!', icon: 'error' })
        }
      })
      .finally(() => setLoading(false))
  }

  const handleMembershipChange = (e) => {
    const selectedMembership = e.target.value
    setFormData((prev) => ({
      ...prev,
      membershipType: selectedMembership,
      amount:
        membershipOptions.find((m) => m.membershipName === selectedMembership)
          ?.price || ''
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    api
      .post('/membership/manual-add', formData)
      .then(() => {
        setFormData({
          userEmail: '',
          txnId: '',
          membershipType: '',
          amount: ''
        })
        navigate('/home')
      })
      .catch((err) => {
        console.log(err)
        Swal.fire({
          title: 'Error',
          text: err.response.data.error,
          icon: 'error'
        })
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 sm:gap-6 sm:p-6 relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <Loading />
        </div>
      )}
      <p className="font-bn text-2xl text-[#E40C2B] sm:text-4xl">
        Add a New Membership
      </p>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center gap-4 bg-white dark:bg-[#212121] p-6 rounded-3xl shadow-lg"
      >
        <label className="w-full">
          User Email ID:
          <input
            type="email"
            name="userEmail"
            value={formData.userEmail}
            onChange={handleChange}
            required
            className="w-full rounded-lg bg-neutral-100 dark:bg-[#141414] px-4 py-2"
          />
        </label>

        <button
          type="button"
          onClick={handleVerify}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          Verify User
        </button>
        {membershipOptions.length > 0 && (
          <>
            <label className="w-full">
              Transaction ID:
              <input
                type="text"
                name="txnId"
                value={formData.txnId}
                onChange={handleChange}
                required
                className="w-full rounded-lg bg-neutral-100 dark:bg-[#141414] px-4 py-2"
              />
            </label>
            <label className="w-full">
              Membership Type:
              <select
                name="membershipType"
                value={formData.membershipType}
                onChange={handleMembershipChange}
                required
                className="w-full rounded-lg bg-neutral-200 dark:bg-[#141414] px-4 py-2"
              >
                <option value="">Select a Membership</option>
                {membershipOptions.map((option) => (
                  <option
                    key={option.membershipName}
                    value={option.membershipName}
                  >
                    {option.membershipName}
                  </option>
                ))}
              </select>
            </label>
            <label className="w-full">
              Amount:
              <input
                type="text"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="w-full rounded-lg bg-neutral-200 dark:bg-[#141414] px-4 py-2"
              />
            </label>
            <button
              type="submit"
              className="bg-[#E40C2B] text-white px-8 py-2 rounded-xl"
            >
              Add Membership
            </button>
          </>
        )}
      </form>
    </div>
  )
}

export default MovieForm
