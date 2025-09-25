import { Loading } from '@/components/icons/Loading'
import { useLogin } from '@/components/LoginContext'
import { useMembershipContext } from '@/components/MembershipContext'
import MovieCard from '@/components/MovieCard'
import Seats from '@/components/Seats'
import { api } from '@/utils/api'
import { getUserType } from '@/utils/user'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'

const OnSpotBooking = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useLogin()
  const { hasMembership, memberships, checkMembershipStatus } =
    useMembershipContext()
  const [seats, setSeats] = useState(null)
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedSeats, setSelectedSeats] = useState([])
  const [showtime, setShowtime] = useState(null)
  const [availableSeats, setAvailableSeats] = useState(0)
  const [freePasses, setFreePasses] = useState(0)
  const [movieFree, setMovieFree] = useState(false)
  const userDesignation = getUserType(user.email)
  const movieId = new URLSearchParams(location.search).get('movieId')

  const fetchSeats = async (showtimeId, email) => {
    try {
      const res = await api.get(`/seatmap/${showtimeId}`, {})
      setSeats(res.data)
      const availableseats = res.data.filter((seat) => !seat.occupied).length
      setAvailableSeats(availableseats)
    } catch (error) {
      setSeats(null)
      console.error('Error fetching seats:', error)
    }
  }
  const fetchFreePasses = async (showtimeId) => {
    try {
      let x
      if (userDesignation === 'btech') {
        x = 1
      } else if (userDesignation === 'mtech/phd') {
        x = 2
      } else {
        x = 4
      }
      const res = await api.get(`/seatmap/freepasses/${showtimeId}`)
      const count1 = res.data.count
      setFreePasses(x - count1)
    } catch (error) {
      console.error('Error fetching free passes:', error)
    }
  }
  const getDateFormatted = (dateS) => {
    const date = new Date(dateS)
    const day = date.getDate()
    const suffix =
      day % 10 === 1 && day !== 11 ? (
        <sup>st</sup>
      ) : day % 10 === 2 && day !== 12 ? (
        <sup>nd</sup>
      ) : day % 10 === 3 && day !== 13 ? (
        <sup>rd</sup>
      ) : (
        <sup>th</sup>
      )

    const month = date.toLocaleString('en-IN', { month: 'short' })
    const time = date.toLocaleString('en-IN', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    })

    return { day, month, time }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const res = await api.get(`/movie/${movieId}`)
        if (res.status !== 200) {
          navigate('/')
        }
        setMovie(res.data)
        if (res.data.showtimes.length) {
          fetchSeats(res.data.showtimes[0]._id)
          fetchFreePasses(res.data.showtimes[0]._id)
          setShowtime(res.data.showtimes[0]._id)
        }
      } catch (error) {
        console.error('Error fetching movie:', error)
        navigate('/')
      }
    })()
  }, [movieId, navigate])

  useEffect(() => {
    if (movie) {
      setMovieFree(movie.free)
    }
  }, [movie])

  const maxAllowed = movieFree
    ? freePasses
    : (memberships?.find((membership) => membership.isValid)?.availQR ?? 0)
  const bookSeats = async (email) => {
    try {
      setLoading(true)
      const userRes = await api.post(`/auth/onspot`, {
        email
      })
      if (userRes.status !== 200) {
        throw new Error('Failed to create user')
      }
      const user = userRes.data
      const txnCostRes = await api.post('/membership/onspotprices', {
        seats: selectedSeats,
        userDesignation: user.designation
      })
      if (txnCostRes.status !== 200) {
        throw new Error('Failed to get transaction cost')
      }
      const { totalCost, memType } = txnCostRes.data
      const res = await api.put(`/seatmap/onspot/${showtime}`, {
        seats: selectedSeats,
        user: user.userId,
        cost: totalCost
      })
      if (res.status !== 200) {
        // Refetch seats and reset selected seats when booking fails
        await fetchSeats(showtime)
        setSelectedSeats([])
        Swal.fire({
          title: 'Booking Failed',
          html: `<p>${res.data.error || 'Failed to book seats'}</p>`,
          icon: 'error'
        })
        setLoading(false)
        return // Exit early if booking fails
      }
      try {
        const res = await api.post('/membership/requestonspot', {
          userId: user.userId,
          email,
          seats: selectedSeats,
          txnCost: totalCost,
          memType
        })
        if (res.status !== 200) {
          throw new Error('Failed to process payment')
        }
        const options = {
          atomTokenId: res.data.atomTokenId,
          merchId: res.data.merchId,
          custEmail: user.email,
          custMobile: user.phone,
          returnUrl:
            (import.meta.env.VITE_environment === 'development'
              ? 'http://localhost:8000'
              : document.location.origin) +
            '/api/membership/redirect?onspot=true,seats=' +
            selectedSeats.join(',') +
            '&showtimeId=' +
            showtime +
            '&movieId=' +
            movieId
        }
        let atom = new AtomPaynetz(options, 'uat')
        await fetchSeats(showtime)
        setSelectedSeats([])
      } catch (error) {
        console.error('Error processing payment:', error)

        // Refetch seats and reset selection on payment error
        await fetchSeats(showtime)
        setSelectedSeats([])

        Swal.fire({
          title: 'Payment Error',
          text: error.message || 'Error processing payment. Please try again.',
          icon: 'error'
        })
        setLoading(false)
        return // Exit early on payment error
      }
    } catch (error) {
      console.log(error)

      // Refetch seats and reset state on any error
      await fetchSeats(showtime)
      setSelectedSeats([])

      Swal.fire({
        title: 'Booking Error',
        text: error.message || 'Error booking seats. Please try again.',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }
  const mailUsers = async (showtimeId) => {
    try {
      const res = await api.get(`/seatmap/mail/${showtimeId}`)
      if (res.status !== 200) {
        Swal.fire({
          title: 'Error',
          text: 'Error sending mail',
          icon: 'error'
        })
      }
      navigator.clipboard.writeText(res.data.join(', '))
      Swal.fire({
        title: 'Success',
        text: 'Mail ids copied, pls paste in bcc',
        icon: 'success'
      })
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: 'Error sending mail',
        icon: 'error'
      })
    }
  }
  const BottomBar = () =>
    selectedSeats.length > 0 && (
      <div className="sticky bottom-0 z-[1200] flex w-full flex-col items-center justify-between gap-2 bg-white dark:bg-[#141414] p-2 drop-shadow-2xl sm:flex-row sm:pr-8">
        {!!selectedSeats.length && (
          <p className="text-xl font-bold">
            Total: {selectedSeats.length || 0}
          </p>
        )}
        <p className="text-xl">
          <span className="font-bold">Seats: </span> {selectedSeats.join(', ')}
        </p>
        <button
          disabled={loading}
          onClick={() => {
            if (loading) return
            if (!selectedSeats.length) {
              Swal.fire({
                title: 'Error',
                text: 'Please select seats to book',
                icon: 'error'
              })
              return
            }
            Swal.fire({
              title: 'Confirm',
              text: `Are you sure you want to book these seat(s) ${selectedSeats.join(', ')} ?`,
              icon: 'info',
              confirmButtonText: 'Yes',
              showCancelButton: true
            }).then((result) => {
              if (result.isConfirmed) {
                // ask for user's email id
                Swal.fire({
                  title: 'Enter your email',
                  input: 'email',
                  inputPlaceholder: 'Your email address',
                  showCancelButton: true
                }).then((emailResult) => {
                  if (emailResult.isConfirmed) {
                    const email = emailResult.value
                    bookSeats(email)
                  }
                })
              }
            })
          }}
          className="rounded-md bg-green-600 p-2 text-xl text-white"
        >
          {loading ? 'Booking...' : 'Book'}
        </button>
      </div>
    )

  if (!movie) {
    return <Loading />
  }
  const { success_payment, onspot } = Object.fromEntries(
    new URLSearchParams(location.search)
  )
  if (success_payment && onspot === 'true') {
    Swal.fire({
      title: 'Success',
      text: 'On-spot booking successful!',
      icon: 'success'
    })
    const searchParams = new URLSearchParams(location.search)
    searchParams.delete('success_payment')
    searchParams.delete('onspot')
    navigate({
      pathname: location.pathname,
      search: searchParams.toString()
    })
  }
  return (
    <div className="flex w-full flex-col items-center relative -mb-10">
      <div className="flex w-full flex-col items-center p-4">
        <div className="flex w-full max-md:flex-col justify-between items-center sm:items-start gap-6 p-4">
          <div className="w-[50vw] sm:w-[30vw] xl:w-[20vw]">
            <MovieCard movie={movie}>
              <p className="text-sm mt-1 overflow-y-auto hide-scroll">
                {movie?.description}
              </p>
            </MovieCard>
          </div>

          <div className="flex max-sm:w-full max-sm:flex-col  justify-between gap-4 sm:gap-6">
            <div className={`flex flex-col ${seats ? 'block' : 'hidden'}`}>
              <div>
                <span className="bg-white-50 font-roboto text-10 mr-2 cursor-pointer border border-green-600 bg-green-600 px-2 text-center"></span>
                <span className="text-md">Selected Seat</span>
              </div>
              <div>
                <span className="seat bg-white-50 font-roboto text-10 mr-2 cursor-pointer border border-red-400 bg-gray-300 px-2 text-center"></span>
                <span className="text-md">Seat Already Booked</span>
              </div>
              <div>
                <span className="seat bg-white-50 font-roboto text-10 mr-2 cursor-pointer border border-gray-400 px-2 text-center"></span>
                <span className="text-md">Seat Not Booked Yet</span>
              </div>
              <p className="mt-2 text-md">
                <span className="font-bold">
                  {movieFree
                    ? 'No. of Free Passes Left: '
                    : 'No. of Paid Passes Left: '}
                </span>
                {maxAllowed}
              </p>
              <p className="mt-2 text-md">
                <span className="font-bold">Number of seats left: </span>
                {availableSeats}
              </p>
            </div>
            <div className="flex flex-col">
              <p className="mb-1 font-bold">Showtimes available</p>
              <div className="grid grid-cols-2  sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-4 ">
                {movie?.showtimes.map((showtimeM) => {
                  const dateFor = getDateFormatted(showtimeM.date)
                  return (
                    <button
                      key={showtimeM._id}
                      onClick={() => {
                        fetchSeats(showtimeM._id)
                        setShowtime(showtimeM._id)
                        setSelectedSeats([])
                      }}
                      className={`flex flex-col items-center justify-center rounded-lg p-2 sm:p-4 text-center text-white hover:bg-green-600 hover:dark:bg-green-800 ${showtimeM._id === showtime ? 'bg-green-700 dark:bg-green-900' : 'bg-green-300 dark:bg-green-500'}`}
                    >
                      <p className="text-lg">{`${dateFor.day} ${dateFor.month}`}</p>
                      <p className="text-md">{dateFor.time}</p>
                    </button>
                  )
                })}
                <div className="hidden bg-green-700 dark:bg-green-900 " />
              </div>
              <div className="hidden bg-green-300 dark:bg-green-500" />
              <div className="flex flex-col gap-2 my-5"></div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#141414] rounded-xl p-2 sm:p-4 flex  w-full overflow-auto">
          {seats && (
            <Seats
              seats={seats}
              selectedSeats={selectedSeats}
              setSelectedSeats={setSelectedSeats}
              maxAllowed={-1}
            />
          )}
        </div>
      </div>
      <BottomBar />
    </div>
  )
}

export default OnSpotBooking
