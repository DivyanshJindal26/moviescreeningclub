import { Star } from '@/components/icons/Buy'
import { useLogin } from '@/components/LoginContext'
import { useMembershipContext } from '@/components/MembershipContext'
import { api } from '@/utils/api'
import { getUserType } from '@/utils/user'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Swal from 'sweetalert2'

const getMemData = async () => {
  try {
    const res = await api.get('/membership/prices')
    if (res.status !== 200) {
      console.error('Error fetching membership data:', res.data.error)
      return []
    }
    return res.data
  } catch (err) {
    console.error('Error fetching membership data:', err)
    return []
  }
}

const MembershipCard = ({ mem, loading, setLoading }) => {
  const { user } = useLogin()
  const buyMembership = async () => {
    try {
      if (loading) return
      setLoading(true)
      const memtype = mem.name.toLowerCase().includes('film fest')
        ? 'filmFest'
        : mem.name
      const res = await api.post('/membership/request', {
        memtype
      })
      setLoading(false)
      if (res.status !== 200) {
        console.error('Error requesting membership:', res.data.error)
        return
      }
      const options = {
        atomTokenId: res.data.atomTokenId,
        merchId: res.data.merchId,
        custEmail: user.email,
        custMobile: user.phone,
        returnUrl:
          (import.meta.env.VITE_environment === 'development'
            ? 'http://localhost:8000'
            : document.location.origin) + '/api/membership/redirect'
      }
      let atom = new AtomPaynetz(options, 'uat')
    } catch (err) {
      Swal.fire({
        title: 'Error!',
        text: err.response?.data?.error || 'Something went wrong',
        icon: 'error'
      })
      setLoading(false)
    }
  }
  return (
    <div
      disabled={loading}
      onClick={buyMembership}
      className={`w-full bg-gradient-to-bl from-${mem.color}-400 to-${mem.color}-300 dark:to-${mem.color}-900 flex items-center justify-between gap-4 rounded-lg border-2 border-gray-900 px-4 py-8 transition-transform duration-300 hover:scale-105 hover:cursor-pointer hover:border-2 hover:border-[#332941] lg:gap-8`}
    >
      <div className="flex -rotate-90 transform flex-col items-center gap-1">
        <p className="text-2xl font-semibold uppercase">{mem.name}</p>
        <p className="font-md text-lg">Subscription</p>
      </div>
      <ul className="flex flex-col justify-center gap-2">
        <li className="flex items-center gap-2">
          <Star />
          <p>
            {mem.passType === 'filmFest' ? (
              <>
                <span className="mr-1 text-lg font-semibold">
                  {mem.movieCount}
                </span>{' '}
                {mem.movieCount > 1 ? 'Movies' : 'Movie'}
              </>
            ) : (
              <>
                <span className="mr-1 text-lg font-semibold">
                  {mem.availQR}
                </span>{' '}
                {mem.availQR > 1 ? 'Passes' : 'Pass'}
              </>
            )}
          </p>
        </li>
        <li className="flex items-center gap-2">
          <Star />
          <p>
            Price:
            <span className="ml-1 text-lg font-semibold">₹{mem.price}</span>
          </p>
        </li>
        <li className="flex items-center gap-2">
          <Star />
          <p>
            Valid till:
            <span className="ml-1 text-lg font-semibold">
              {new Date(mem.validitydate).toLocaleDateString('en-IN')}
            </span>
          </p>
        </li>
        {mem.passType === 'filmFest' && (
          <li className="flex items-center gap-2">
            <Star />
            <p className="text-sm">1 ticket per movie</p>
          </li>
        )}
        {mem.name == 'Foodie Film Fest' && (
          <li className="flex items-center gap-2">
            <Star />
            <p className="text-sm">
              Wood Fire Pizza
              <br />
              voucher worth ₹149.
            </p>
          </li>
        )}
      </ul>
    </div>
  )
}

const BuyMemberships = () => {
  const { user } = useLogin()
  const { hasMembership } = useMembershipContext()
  const [loading, setLoading] = useState(false)
  const [memData, setMemData] = useState([]) // Store fetched data
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const userDesignation = getUserType(user.email)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const data = await getMemData()
      setMemData(data)
    }
    fetchData()
  }, [])

  if (hasMembership) {
    return <Navigate to="/tickets" />
  }

  // if (!isMobile) {
  //   return (
  //     <div className="flex flex-col items-center justify-center p-8 font-monts text-center">
  //       <h2 className="font-bn text-3xl font-bold mb-4">Mobile Only</h2>
  //       <p className="text-lg text-gray-600 dark:text-gray-400">
  //         Payments are only supported on mobile devices.
  //         <br />
  //         Please open this page on your phone to purchase a membership.
  //       </p>
  //     </div>
  //   )
  // }

  const colors = [
    'red',
    'gray',
    'amber',
    'blue',
    'green',
    'purple',
    'pink',
    'indigo'
  ]
  const memberships = memData.map((mem, i) => ({
    name: mem.name,
    validitydate: Date.now() + mem.validity * 1000,
    availQR: mem.availQR,
    price: mem.price.find((p) => p.type === userDesignation)?.price || 0,
    color: colors[i % colors.length],
    passType: mem.passType || 'standard', // Backward compatibility
    movieCount: mem.movieCount || 0 // Backward compatibility
  }))

  return (
    <div className="flex flex-col items-center justify-center p-4 font-monts sm:p-8">
      <h2 className="text-center font-bn text-2xl font-bold sm:text-4xl">
        {loading ? 'Choosing...' : 'Choose Your Plan'}
      </h2>

      <div className="hidden bg-gradient-to-bl from-red-400 to-red-900"></div>
      <div className="hidden bg-gradient-to-bl from-gray-400 to-gray-900"></div>
      <div className="hidden bg-gradient-to-bl from-amber-400 to-amber-900"></div>
      <div className="hidden bg-gradient-to-bl from-blue-400 to-blue-900"></div>
      <div className="hidden bg-gradient-to-bl from-red-400 to-red-100"></div>
      <div className="hidden bg-gradient-to-bl from-gray-400 to-gray-100"></div>
      <div className="hidden bg-gradient-to-bl from-amber-400 to-amber-100"></div>
      <div className="hidden bg-gradient-to-bl from-blue-400 to-blue-100"></div>

      <div className="grid grid-cols-1 items-center justify-items-center gap-4 pt-10 sm:grid-cols-2 2xl:grid-cols-4">
        {memberships.map((mem, index) => (
          <MembershipCard key={mem.name} mem={mem} loading={loading} setLoading={setLoading} />
        ))}
      </div>
    </div>
  )
}

export default BuyMemberships
