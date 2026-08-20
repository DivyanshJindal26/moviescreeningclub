import { useLogin } from '@/components/LoginContext'
import { useMembershipContext } from '@/components/MembershipContext'
import { Loading } from '@/components/icons/Loading'
import { api } from '@/utils/api'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'

const Tickets = () => {
  const { user } = useLogin()
  const { checkMembershipStatus } = useMembershipContext()
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [tickets, setTickets] = useState({
    used: [],
    unused: [],
    expired: [],
    cancelled: []
  })

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const res = await api.get('/qr')
      console.log(res.data)
      setTickets(res.data.qrCodes)
    } catch {
      console.log('error')
      navigate('/')
    }
    setLoading(false)
  }
  useEffect(() => {
    fetchTickets()
  }, [user])

  if (loading) {
    return (
      <div className="h-full">
        <Loading />
      </div>
    )
  }
  const handleDelete = async (e, ticket) => {
    e.stopPropagation()
    Swal.fire({
      text: `You sure you want to delete ticket for ${ticket.movie.title}- ${ticket.seat}`,
      icon: 'error',
      confirmButtonText: 'Confirm',
      showCancelButton: true
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await api.post(`/qr/cancel/${ticket.id}`)
        if (res.status === 200) {
          fetchTickets()
          checkMembershipStatus()
        }
      }
    })
  }
  return (
    <div className="flex h-full flex-col gap-6 p-8">
      <p className="w-full text-center font-bn text-xl font-bold sm:text-5xl">
        Tickets
      </p>
      {tickets.unused.length === 0 &&
        tickets.used.length === 0 &&
        tickets.expired.length === 0 && (
          <p className="mb-10 h-[50vh] w-full text-center text-xl">
            No tickets found
          </p>
        )}
      {tickets.unused.length > 0 && (
        <div className="flex flex-col gap-6">
          <p className="text-xl font-bold sm:text-2xl">Upcoming Tickets</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.unused.map(
              (ticket) =>
                ticket.movie && (
                  <div
                    key={ticket._id}
                    onClick={() => {
                      Swal.fire({
                        html: `<div className="flex flex-col items-center" style="flex-direction: column;display:flex;align-items: center" ><p><span style="font-weight: 600;">${ticket.movie.title}</span> - ${new Date(
                          ticket.movie.showtime.date
                        ).toLocaleString(
                          'en-IN'
                        )} - ${ticket.seat}</p><img src=${ticket.qrData} alt="qr code" style="height:40vh;width:40vh" />`,

                        icon: 'info',
                        backdrop: '#0e0e0eff'
                      })
                    }}
                    className="flex flex-col items-center gap-3 rounded-lg bg-white dark:bg-[#212121] p-4 shadow-md sm:flex-row"
                  >
                    <img
                      src={ticket.qrData}
                      alt="qr code"
                      className="h-36 w-36"
                    />
                    <div className="flex flex-col gap-1">
                      <p className="text-lg font-bold">{ticket.movie.title}</p>
                      {ticket.membership?.memtype === 'filmFest' && (
                        <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded w-fit">
                          Film Fest Pass
                        </span>
                      )}
                      <p>
                        {new Date(ticket.movie.showtime.date).toLocaleString(
                          'en-IN',
                          {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true
                          }
                        )}
                      </p>
                      <p>
                        <span className="font-semibold">Seat: </span>
                        {ticket.seat}
                      </p>
                      <p className="text-xs">
                        {' '}
                        <span className="font-semibold">Purchase Date: </span>
                        {new Date(ticket.registrationDate).toLocaleString(
                          'en-IN',
                          {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true
                          }
                        )}
                      </p>
                      <p className="text-xs">
                        {' '}
                        <span className="font-semibold">Expiration Date: </span>
                        {new Date(ticket.expirationDate).toLocaleString(
                          'en-IN',
                          {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true
                          }
                        )}
                      </p>
                      {
                        <button
                          onClick={(e) => handleDelete(e, ticket)}
                          className="w-fit px-4 bg-red-600 rounded-lg text-white py-2"
                        >
                          Cancel Ticket
                        </button>
                      }
                    </div>
                  </div>
                )
            )}
          </div>
        </div>
      )}
      {tickets.used.length > 0 && (
        <div className="flex flex-col gap-6">
          <p className="text-xl font-bold sm:text-2xl">Used Tickets</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.used.map((ticket) => (
              <div
                key={ticket._id}
                className="flex flex-col gap-2 rounded-lg  bg-gray-400 dark:bg-gray-800 p-4 shadow-md"
              >
                <p>
                  <span className="font-semibold">Seat: </span>
                  {ticket.seat}
                </p>
                <p>
                  {' '}
                  <span className="font-semibold">Purchase Date: </span>
                  {new Date(ticket.registrationDate).toLocaleString('en-IN')}
                </p>
                <p>
                  {' '}
                  <span className="font-semibold">Expiration Date: </span>
                  {new Date(ticket.expirationDate).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {tickets.expired.length > 0 && (
        <div className="flex flex-col gap-6">
          <p className="text-xl font-bold sm:text-2xl">Expired Tickets</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.expired.map((ticket) => (
              <div
                key={ticket._id}
                className="flex flex-col gap-2 rounded-lg bg-gray-400 dark:bg-gray-800 p-4 shadow-md"
              >
                <p>
                  <span className="font-semibold">Seat: </span>
                  {ticket.seat}
                </p>
                <p>
                  {' '}
                  <span className="font-semibold">Purchase Date: </span>
                  {new Date(ticket.registrationDate).toLocaleString('en-IN')}
                </p>
                <p>
                  {' '}
                  <span className="font-semibold">Expiration Date: </span>
                  {new Date(ticket.expirationDate).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {tickets.cancelled.length > 0 && (
        <div className="flex flex-col gap-6">
          <p className="text-xl font-bold sm:text-2xl">Cancelled Tickets</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.cancelled.map((ticket) => (
              <div
                key={ticket._id}
                className="flex flex-col gap-2 rounded-lg bg-gray-400 dark:bg-gray-800 p-4 shadow-md"
              >
                <p>
                  <span className="font-semibold">Seat: </span>
                  {ticket.seat}
                </p>
                <p>
                  {' '}
                  <span className="font-semibold">Purchase Date: </span>
                  {new Date(ticket.registrationDate).toLocaleString('en-IN')}
                </p>
                <p>
                  {' '}
                  <span className="font-semibold">Expiration Date: </span>
                  {new Date(ticket.expirationDate).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Tickets
