import {
  AddIcons,
  CloseIcons,
  DeleteIcons,
  EditIcons,
  TickIcons
} from '@/components/icons/Show'
import { useLogin } from '@/components/LoginContext'
import MovieCard from '@/components/MovieCard'
import { api } from '@/utils/api'
import { isAllowedLvl } from '@/utils/levelCheck'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const Showtime = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useLogin()
  const [movie, setMovie] = useState({ showtimes: [], poster: '', trailer: '' })
  const [newShowtime, setNewShowtime] = useState({ date: '', time: '' })
  const [showAddRow, setShowAddRow] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editedShowtime, setEditedShowtime] = useState({ date: '', time: '' })
  const [error, setError] = useState('')
  const movieId = new URLSearchParams(location.search).get('movieId')
  const isLocalAdmin = isAllowedLvl(
    'movievolunteer',
    user?.usertype || 'standard'
  )
  // Split a stored date into the local-time <input> values. Going through
  // toISOString() here would render the UTC day, which lands on the wrong date
  // for evening shows in IST.
  const toLocalParts = (value) => {
    const d = new Date(value)
    const pad = (n) => String(n).padStart(2, '0')
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
  }

  const fetchMovie = async () => {
    try {
      const res = await api.get(`/movie/${movieId}`)
      if (!res.data) {
        navigate('/')
      }
      setMovie(res.data)
    } catch (e) {
      console.error('Error fetching showtimes:', e)
    }
  }
  useEffect(() => {
    if (movieId) {
      fetchMovie()
    }
  }, [location.search, navigate])

  const handleSaveShowtime = async () => {
    if (!newShowtime.date || !newShowtime.time) {
      setError('Date and time must be filled')
      return
    }
    try {
      await api.post(`/movie/${movieId}/showtimes`, {
        date: new Date(newShowtime.date + 'T' + newShowtime.time).toISOString()
      })
      await fetchMovie()
      setNewShowtime({ date: '', time: '' })
      setShowAddRow(false)
      setError('')
    } catch (err) {
      console.error('Error adding showtime:', err)
      setError(err.response?.data?.error || 'Error adding showtime')
    }
  }

  const startEditShowtime = (showtime) => {
    setEditingId(showtime._id)
    setEditedShowtime(toLocalParts(showtime.date))
    setShowAddRow(false)
    setError('')
  }

  const cancelEditShowtime = () => {
    setEditingId(null)
    setEditedShowtime({ date: '', time: '' })
    setError('')
  }

  // Reschedules the showtime in place. The seats and their tickets stay
  // attached to this showtime — only its date moves.
  const handleUpdateShowtime = async (showtimeId) => {
    if (!editedShowtime.date || !editedShowtime.time) {
      setError('Date and time must be filled')
      return
    }
    try {
      await api.post(`/movie/${movieId}/showtimes/${showtimeId}`, {
        date: new Date(
          editedShowtime.date + 'T' + editedShowtime.time
        ).toISOString()
      })
      await fetchMovie()
      cancelEditShowtime()
    } catch (err) {
      console.error('Error updating showtime:', err)
      setError(err.response?.data?.error || 'Error updating showtime')
    }
  }

  const handleDeleteShowtime = async (showtimeId) => {
    try {
      await api.post(`/movie/delete/${movieId}/${showtimeId}`)
      await fetchMovie()
      setError('')
    } catch (err) {
      console.error('Error deleting showtime:', err)
      setError(err.response?.data?.error || 'Error deleting showtime')
    }
  }

  const handleChange = (e, field) => {
    setNewShowtime({ ...newShowtime, [field]: e.target.value })
  }

  const handleEditChange = (e, field) => {
    setEditedShowtime({ ...editedShowtime, [field]: e.target.value })
  }
  if (!movie || !user) {
    return <div>Loading...</div>
  }
  return (
    <div className="flex w-full items-center flex-col gap-2 p-4 sm:p-8">
      <div className="flex max-md:flex-col-reverse max-md:items-center bg-white dark:bg-[#141414] w-full md:w-[80vw] lg:w-[60vw] gap-4 sm:gap-8 p-4 sm:p-6 rounded-lg  justify-around ">
        <div className="w-full sm:w-1/2 md:w-1/4">
          <MovieCard movie={movie} />
        </div>
        <div className="flex flex-col gap-3 items-center">
          <p className=" text-center text-2xl font-bold flex items-center gap-2">
            Showtimes{' '}
            {isLocalAdmin && (
              <span
                className="w-6 h-6 cursor-pointer"
                onClick={() => setShowAddRow(!showAddRow)}
              >
                <AddIcons />
              </span>
            )}
          </p>
          <table className="flex flex-col gap-3">
            <thead>
              <tr className="w-full text-lg">
                <th className="w-[24vw] sm:w-44 text-center">Date</th>
                <th className="w-[24vw] sm:w-40 text-center">Time</th>
                {isLocalAdmin && <th className=" text-center"></th>}
              </tr>
            </thead>

            <tbody className="flex flex-col gap-2 ">
              {movie.showtimes.map((showtime, index) =>
                editingId === showtime._id && isLocalAdmin ? (
                  <tr
                    key={showtime._id || index}
                    className="max-sm:flex-col max-sm:flex max-sm:gap-2 w-full text-medium"
                  >
                    <td className="w-[24vw] sm:w-44 text-center">
                      <input
                        type="date"
                        className="w-fit rounded-xl bg-[#0c0c0c]/15 py-2 px-2"
                        value={editedShowtime.date}
                        onChange={(e) => handleEditChange(e, 'date')}
                      />
                    </td>
                    <td className="w-[24vw] sm:w-40 text-center">
                      <input
                        type="time"
                        className="w-fit rounded-xl bg-[#0c0c0c]/15 py-2 px-2"
                        value={editedShowtime.time}
                        onChange={(e) => handleEditChange(e, 'time')}
                      />
                    </td>
                    <td className="flex gap-2 justify-center">
                      <span
                        className="cursor-pointer"
                        title="Save"
                        onClick={() => handleUpdateShowtime(showtime._id)}
                      >
                        <TickIcons />
                      </span>
                      <span
                        className="cursor-pointer"
                        title="Cancel"
                        onClick={cancelEditShowtime}
                      >
                        <CloseIcons />
                      </span>
                    </td>
                  </tr>
                ) : (
                  <tr key={showtime._id || index} className="w-full text-medium">
                    <td className="w-[24vw] sm:w-44 text-center">
                      {new Date(showtime.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="w-[24vw] sm:w-40 text-center">
                      {new Date(showtime.date).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    {isLocalAdmin && (
                      <td className="text-center">
                        <div className="flex gap-2 justify-center">
                          <span
                            onClick={() => startEditShowtime(showtime)}
                            className="w-6 h-6 cursor-pointer"
                            title="Change the time — bookings are kept"
                          >
                            <EditIcons />
                          </span>
                          <span
                            onClick={() => handleDeleteShowtime(showtime._id)}
                            className="w-6 h-6 cursor-pointer"
                            title="Delete showtime"
                          >
                            <DeleteIcons />
                          </span>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              )}
              {showAddRow && isLocalAdmin && (
                <tr className="max-sm:flex-col max-sm:flex max-sm:gap-2 w-full text-medium">
                  <td className="w-[24vw] sm:w-44 text-center">
                    <input
                      type="date"
                      className="w-fit rounded-xl bg-[#0c0c0c]/15 py-2 px-2"
                      value={newShowtime.date}
                      onChange={(e) => handleChange(e, 'date')}
                    />
                  </td>
                  <td className="w-[24vw] sm:w-40 text-center">
                    <input
                      className="w-fit rounded-xl bg-[#0c0c0c]/15 py-2 px-2"
                      type="time"
                      value={newShowtime.time}
                      onChange={(e) => handleChange(e, 'time')}
                    />
                  </td>
                  <td className="cursor-pointer" onClick={handleSaveShowtime}>
                    <TickIcons />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {error && (
            <p className="text-sm text-red-500 text-center max-w-64">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Showtime
