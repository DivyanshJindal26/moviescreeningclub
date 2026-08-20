import { api } from '@/utils/api'
import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'

const ManageUsers = () => {
  const toast = (title, icon = 'success') => {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    newEmail: '',
    designation: '',
    usertype: ''
  })
  const [allUsers, setAllUsers] = useState([])
  const [editingMembership, setEditingMembership] = useState(null)
  const [editingQR, setEditingQR] = useState(null)
  const [membershipForm, setMembershipForm] = useState({
    isValid: false,
    amount: 0,
    availQR: 0
  })
  const [qrForm, setQRForm] = useState({
    isValid: false,
    used: false,
    deleted: false
  })

  useEffect(() => {
    fetchAllUsers()
  }, [])

  const fetchAllUsers = async () => {
    try {
      const response = await api.get('/user/fetchusers')
      setAllUsers(response.data.users)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const query = searchQuery.toLowerCase()
    const results = allUsers.filter(
      (user) =>
        user.email.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query) ||
        user.phone.includes(query)
    )
    setSearchResults(results)
  }

  const fetchUserDetails = async (email) => {
    setLoading(true)
    try {
      const response = await api.get(
        `/user/details/${encodeURIComponent(email)}`
      )
      setUserDetails(response.data)
      setSelectedUser(email)
      setEditForm({
        name: response.data.user.name,
        phone: response.data.user.phone,
        newEmail: response.data.user.email,
        designation: response.data.user.designation,
        usertype: response.data.user.usertype
      })
    } catch (error) {
      console.error('Error fetching user details:', error)
      toast('Failed to fetch user details', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await api.post(
        `/user/details/${encodeURIComponent(selectedUser)}`,
        editForm
      )
      toast('User details updated successfully!')
      setEditing(false)
      // Refresh user details
      await fetchUserDetails(response.data.user.email)
      await fetchAllUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      toast(
        error.response?.data?.error || 'Failed to update user details',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) return 'N/A'
    return parsedDate.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleUpdateMembership = async (membershipId) => {
    setLoading(true)
    try {
      await api.post(`/user/membership/${membershipId}`, membershipForm)
      toast('Membership updated successfully!')
      setEditingMembership(null)
      await fetchUserDetails(selectedUser)
    } catch (error) {
      console.error('Error updating membership:', error)
      toast('Failed to update membership', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateQR = async (qrId) => {
    setLoading(true)
    try {
      await api.post(`/user/qr/${qrId}`, qrForm)
      toast('QR code updated successfully!')
      setEditingQR(null)
      await fetchUserDetails(selectedUser)
    } catch (error) {
      console.error('Error updating QR code:', error)
      toast('Failed to update QR code', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openEditMembership = (membership) => {
    setEditingMembership(membership._id)
    setMembershipForm({
      isValid: membership.isValid,
      amount: membership.amount,
      availQR: membership.availQR || 0
    })
  }

  const openEditQR = (qr) => {
    setEditingQR(qr._id)
    setQRForm({
      isValid: qr.isValid,
      used: qr.used,
      deleted: qr.deleted
    })
  }

  const handleDeleteMembership = async (membershipId) => {
    if (!window.confirm('Are you sure you want to delete this membership?')) {
      return
    }
    setLoading(true)
    try {
      await api.delete(`/user/membership/${membershipId}`)
      toast('Membership deleted successfully!')
      await fetchUserDetails(selectedUser)
    } catch (error) {
      console.error('Error deleting membership:', error)
      toast('Failed to delete membership', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteQR = async (qrId) => {
    if (!window.confirm('Are you sure you want to delete this QR code?')) {
      return
    }
    setLoading(true)
    try {
      await api.delete(`/user/qr/${qrId}`)
      toast('QR code deleted successfully!')
      await fetchUserDetails(selectedUser)
    } catch (error) {
      console.error('Error deleting QR code:', error)
      toast('Failed to delete QR code', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] p-4 sm:p-6 font-monts">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 dark:text-gray-100 mb-2">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">
            Search and manage user information
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg p-4 sm:p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input
              type="text"
              placeholder="Search by email, name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-[#141414] text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            />
            <button
              onClick={handleSearch}
              className="w-full sm:w-auto px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-md transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Search
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Search Results ({searchResults.length})
              </h3>
              <div className="space-y-3">
                {searchResults.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => fetchUserDetails(user.email)}
                    className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#141414] dark:to-[#1f1f1f] rounded-lg hover:from-blue-50 hover:to-blue-100 dark:hover:from-[#1a2333] dark:hover:to-[#1a2333] cursor-pointer transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {user.phone}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {user.usertype}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Details Section */}
        {loading && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg p-10 sm:p-12 text-center border border-gray-200 dark:border-gray-700">
            <div className="animate-spin rounded-full h-14 w-14 sm:h-16 sm:w-16 border-b-4 border-blue-500 mx-auto"></div>
            <p className="mt-6 text-gray-600 dark:text-gray-400 text-base sm:text-lg font-medium">
              Loading user details...
            </p>
          </div>
        )}

        {!loading && userDetails && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg p-6 sm:p-8 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
                  User Details
                </h2>
              </div>
              <button
                onClick={() => setEditing(!editing)}
                className={`w-full sm:w-auto px-6 py-3 rounded-lg font-semibold shadow-md transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2 ${
                  editing
                    ? 'bg-gray-500 hover:bg-gray-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {editing ? (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Cancel
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit User
                  </>
                )}
              </button>
            </div>

            {/* Edit Form */}
            {editing ? (
              <form onSubmit={handleUpdateUser} className="mb-8">
                <div className="bg-blue-50 dark:bg-[#1a2333] p-6 rounded-lg border border-blue-200 dark:border-blue-900 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit User Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-[#141414] text-gray-900 dark:text-gray-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm({ ...editForm, phone: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-[#141414] text-gray-900 dark:text-gray-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editForm.newEmail}
                        onChange={(e) =>
                          setEditForm({ ...editForm, newEmail: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-[#141414] text-gray-900 dark:text-gray-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Designation
                      </label>
                      <select
                        value={editForm.designation}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            designation: e.target.value
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-[#141414] text-gray-900 dark:text-gray-100"
                      >
                        <option value="btech">B.Tech</option>
                        <option value="mtech/phd">M.Tech/PhD</option>
                        <option value="faculty/staff">Faculty/Staff</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        User Type
                      </label>
                      <select
                        value={editForm.usertype}
                        onChange={(e) =>
                          setEditForm({ ...editForm, usertype: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-[#141414] text-gray-900 dark:text-gray-100"
                      >
                        <option value="standard">Standard</option>
                        <option value="ticketvolunteer">
                          Ticket Volunteer
                        </option>
                        <option value="movievolunteer">Movie Volunteer</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow-md transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Save Changes
                </button>
              </form>
            ) : (
              /* User Info Display */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#141414] dark:to-[#1f1f1f] rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-lg shadow-sm border border-transparent dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Name
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    {userDetails.user.name}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-lg shadow-sm border border-transparent dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Email
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    {userDetails.user.email}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-lg shadow-sm border border-transparent dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    Phone
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    {userDetails.user.phone}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-lg shadow-sm border border-transparent dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Designation
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 capitalize">
                    {userDetails.user.designation}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-lg shadow-sm border border-transparent dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    User Type
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 capitalize">
                    {userDetails.user.usertype}
                  </p>
                </div>
              </div>
            )}

            {/* Memberships Section */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                Memberships ({userDetails.memberships.length})
              </h3>
              {userDetails.memberships.length > 0 ? (
                <div className="space-y-4">
                  {userDetails.memberships.map((membership) => (
                    <div
                      key={membership._id}
                      className="bg-gradient-to-r from-white to-gray-50 dark:from-[#1a1a1a] dark:to-[#1f1f1f] p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Type
                          </p>
                          <p className="font-medium capitalize">
                            {membership.memtype}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Amount
                          </p>
                          {editingMembership === membership._id ? (
                            <input
                              type="number"
                              value={membershipForm.amount}
                              onChange={(e) =>
                                setMembershipForm({
                                  ...membershipForm,
                                  amount: parseFloat(e.target.value)
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-[#141414] text-gray-900 dark:text-gray-100"
                            />
                          ) : (
                            <p className="font-medium">₹{membership.amount}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Status
                          </p>
                          {editingMembership === membership._id ? (
                            <select
                              value={
                                membershipForm.isValid ? 'Valid' : 'Expired'
                              }
                              onChange={(e) =>
                                setMembershipForm({
                                  ...membershipForm,
                                  isValid: e.target.value === 'Valid'
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-[#141414] text-gray-900 dark:text-gray-100"
                            >
                              <option value="Valid">Valid</option>
                              <option value="Expired">Expired</option>
                            </select>
                          ) : (
                            <p
                              className={`font-medium ${
                                membership.isValid
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {membership.isValid ? 'Valid' : 'Expired'}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Purchase Date
                          </p>
                          <p className="font-medium text-sm">
                            {formatDate(membership.purchasedate)}
                          </p>
                        </div>
                        {membership.availQR !== undefined && (
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Available QR
                            </p>
                            {editingMembership === membership._id ? (
                              <input
                                type="number"
                                value={membershipForm.availQR}
                                onChange={(e) =>
                                  setMembershipForm({
                                    ...membershipForm,
                                    availQR: parseInt(e.target.value)
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-[#141414] text-gray-900 dark:text-gray-100"
                              />
                            ) : (
                              <p className="font-medium">
                                {membership.availQR}
                              </p>
                            )}
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Transaction ID
                          </p>
                          <p className="font-medium text-sm">
                            {membership.txnId}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 mt-4">
                        {editingMembership === membership._id ? (
                          <>
                            <button
                              onClick={() =>
                                handleUpdateMembership(membership._id)
                              }
                              disabled={loading}
                              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow-md transition-all duration-200 hover:shadow-lg text-sm disabled:opacity-50 flex items-center gap-2"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Save
                            </button>
                            <button
                              onClick={() => setEditingMembership(null)}
                              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold shadow-md transition-all duration-200 hover:shadow-lg text-sm flex items-center gap-2"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditMembership(membership)}
                              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-md transition-all duration-200 hover:shadow-lg text-sm flex items-center gap-2"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteMembership(membership._id)
                              }
                              disabled={loading}
                              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow-md transition-all duration-200 hover:shadow-lg text-sm disabled:opacity-50 flex items-center gap-2"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No memberships found
                </p>
              )}
            </div>

            {/* QR Codes Section */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
                QR Codes ({userDetails.qrCodes.length})
              </h3>
              {userDetails.qrCodes.length > 0 ? (
                <div className="space-y-4">
                  {userDetails.qrCodes.map((qr) => (
                    <div
                      key={qr._id}
                      className="bg-gradient-to-r from-white to-gray-50 dark:from-[#1a1a1a] dark:to-[#1f1f1f] p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          QR Code
                        </p>
                        <p className="font-mono text-xs break-all bg-gray-100 dark:bg-[#141414] p-2 rounded mt-1 text-gray-900 dark:text-gray-100">
                          {qr.code ? qr.code : 'N/A'}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            QR ID
                          </p>
                          <p className="font-medium text-sm">{qr._id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Seat
                          </p>
                          <p className="font-medium">{qr.seat || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Transaction ID
                          </p>
                          <p className="font-medium text-sm">
                            {qr.txnId || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Used
                          </p>
                          {editingQR === qr._id ? (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={qrForm.used}
                                onChange={(e) =>
                                  setQRForm({
                                    ...qrForm,
                                    used: e.target.checked
                                  })
                                }
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {qrForm.used ? 'Yes' : 'No'}
                              </span>
                            </label>
                          ) : (
                            <p
                              className={`font-medium ${
                                qr.used ? 'text-red-600' : 'text-green-600'
                              }`}
                            >
                              {qr.used ? 'Yes' : 'No'}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Valid
                          </p>
                          {editingQR === qr._id ? (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={qrForm.isValid}
                                onChange={(e) =>
                                  setQRForm({
                                    ...qrForm,
                                    isValid: e.target.checked
                                  })
                                }
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {qrForm.isValid ? 'Yes' : 'No'}
                              </span>
                            </label>
                          ) : (
                            <p
                              className={`font-medium ${
                                qr.isValid ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {qr.isValid ? 'Yes' : 'No'}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Free
                          </p>
                          <p className="font-medium">
                            {qr.free ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Registration Date
                          </p>
                          <p className="font-medium text-sm">
                            {formatDate(qr.registrationDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Expiration Date
                          </p>
                          <p className="font-medium text-sm">
                            {formatDate(qr.expirationDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Deleted
                          </p>
                          {editingQR === qr._id ? (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={qrForm.deleted}
                                onChange={(e) =>
                                  setQRForm({
                                    ...qrForm,
                                    deleted: e.target.checked
                                  })
                                }
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {qrForm.deleted ? 'Yes' : 'No'}
                              </span>
                            </label>
                          ) : (
                            <p className="font-medium">
                              {qr.deleted ? 'Yes' : 'No'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 mt-4">
                        {editingQR === qr._id ? (
                          <>
                            <button
                              onClick={() => handleUpdateQR(qr._id)}
                              disabled={loading}
                              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow-md transition-all duration-200 hover:shadow-lg text-sm disabled:opacity-50 flex items-center gap-2"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Save
                            </button>
                            <button
                              onClick={() => setEditingQR(null)}
                              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold shadow-md transition-all duration-200 hover:shadow-lg text-sm flex items-center gap-2"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditQR(qr)}
                              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-md transition-all duration-200 hover:shadow-lg text-sm flex items-center gap-2"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteQR(qr._id)}
                              disabled={loading}
                              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow-md transition-all duration-200 hover:shadow-lg text-sm disabled:opacity-50 flex items-center gap-2"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No QR codes found
                </p>
              )}
            </div>

            {/* Food Orders Section */}
            <div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                Food Orders ({userDetails.orders.length})
              </h3>
              {userDetails.orders.length > 0 ? (
                <div className="space-y-4">
                  {userDetails.orders.map((order) => (
                    <div
                      key={order._id}
                      className="bg-gradient-to-r from-white to-gray-50 dark:from-[#1a1a1a] dark:to-[#1f1f1f] p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Order ID
                          </p>
                          <p className="font-medium text-sm">{order._id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Total Amount
                          </p>
                          <p className="font-medium">₹{order.totalAmount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Status
                          </p>
                          <p className="font-medium capitalize">
                            {order.status}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Date
                          </p>
                          <p className="font-medium text-sm">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>
                      {order.items && order.items.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Items:
                          </p>
                          <div className="space-y-1">
                            {order.items.map((item, idx) => (
                              <p key={idx} className="text-sm">
                                {item.item?.name || 'Unknown'} x {item.quantity}{' '}
                                - ₹{item.price}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No food orders found
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageUsers
