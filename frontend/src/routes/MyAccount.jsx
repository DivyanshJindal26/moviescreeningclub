import { useLogin } from '@/components/LoginContext'
import { useMembershipContext } from '@/components/MembershipContext'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Myaccount = () => {
  const { loggedIn } = useLogin()
  const { hasMembership, checkMembershipStatus, memberships } =
    useMembershipContext()
  const navigate = useNavigate()
  const [previousMemberships, setPreviousMemberships] = useState([])
  const [currentMembership, setCurrentMembership] = useState(null)

  useEffect(() => {
    if (memberships) {
      setCurrentMembership(
        memberships.filter((membership) => membership.isValid)[0]
      )
      setPreviousMemberships(
        memberships.filter((membership) => !membership.isValid)
      )
      console.log('memberships:', memberships, previousMemberships)
    }
  }, [memberships])
  const getColor = (memType) => {
    switch (memType.toLowerCase()) {
      case 'gold':
        return 'bg-gradient-to-tl from-amber-400 to-amber-300 dark:to-amber-900'
      case 'silver':
        return 'bg-gradient-to-tl from-gray-400 to-gray-300 dark:to-gray-900'
      case 'base':
        return 'bg-gradient-to-tl  from-red-400 to-red-300 dark:to-red-900'
      case 'filmfest':
        return 'bg-gradient-to-tl from-purple-400 to-purple-300 dark:to-purple-900'
      default:
        return 'bg-gradient-to-tl from-blue-400 to-blue-300 dark:to-blue-900'
    }
  }

  // const suspendMembership = async () => {
  //   try {
  //     const res = await api.put(`/membership/suspend`, {
  //       id: currentMembership._id
  //     })
  //     if (res.status === 200) {
  //       checkMembershipStatus()
  //     }
  //   } catch (error) {
  //     console.error('Error suspending membership:', error)
  //   }
  // }

  const toTitleCase = (str) => {
    console.log(str)
    return str.replace(/\b\w+/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    })
  }
  if (!memberships) {
    return (
      <div className="h-[70vh] w-full text-center align-middle">Loading...</div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-12 p-4 sm:p-8">
      <p className="mb-4 text-2xl font-semibold lg:text-3xl">
        Your Memberships
      </p>
      {currentMembership && (
        <div className="flex w-full flex-col gap-4 max-sm:items-center sm:w-3/4">
          <p className="mb-2 text-xl font-semibold lg:text-2xl">
            Active Memberships
          </p>
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col justify-center rounded-lg bg-white shadow-lg dark:shadow-white/10 dark:bg-[#212121] px-3 py-3">
              <div
                className={`flex items-center justify-center rounded-md ${getColor(
                  currentMembership.memtype
                )} mb-4 h-[280px] w-[230px] text-center max-sm:h-[200px] lg:w-[250px]`}
                // style={getCardStyle(230, 180)}
              >
                <p className="text-xl font-semibold lg:text-4xl">
                  {toTitleCase(currentMembership.memtype)}
                </p>
              </div>
              <p>
                <strong>Purchase Date : </strong>{' '}
                {new Date(currentMembership.purchasedate).toLocaleDateString(
                  'en-IN'
                )}
              </p>
              <p className="flex capitalize">
                <strong> Validity till : </strong>{' '}
                {new Date(currentMembership.validitydate).toLocaleDateString(
                  'en-IN'
                )}
              </p>
              <p className="flex capitalize">
                <strong>
                  {currentMembership.memtype === 'filmFest'
                    ? 'Movies Left : '
                    : 'Passes Left : '}
                </strong>
                {currentMembership.memtype === 'filmFest'
                  ? (currentMembership.movieCount || 0) -
                    (currentMembership.moviesUsed || []).length
                  : currentMembership.availQR}
              </p>
            </div>
          </div>
          {/* {currentMembership && (
            <button
              onClick={suspendMembership}
              className="mt-8 w-fit rounded bg-red-500 px-4 py-2 font-bold hover:bg-red-700 text-white"
            >
              Suspend Current Membership
            </button>
          )} */}
        </div>
      )}
      {previousMemberships.length > 0 && (
        <div className="flex w-full flex-col items-center gap-2 sm:w-3/4 sm:items-start">
          <p className="mb-2 text-xl font-semibold lg:text-2xl">
            Previous Memberships
          </p>
          <div className="flex flex-wrap gap-6 max-sm:flex-col">
            {previousMemberships.map((membership, index) => (
              <div
                key={index}
                className="flex flex-col justify-center rounded-lg bg-white dark:bg-[#212121] shadow-lg dark:shadow-white/10  p-3"
              >
                <div
                  className={`rounded-md ${getColor(
                    membership.memtype
                  )} mb-5 flex h-[280px] w-[230px] items-center justify-center text-center max-sm:h-[200px] lg:w-[250px]`}
                  // style={getCardStyle(150, 180)}
                >
                  {' '}
                  <p className="text-xl font-semibold lg:text-4xl">
                    {toTitleCase(membership.memtype)}
                  </p>
                </div>
                <p>
                  <strong>Purchase Date -</strong>{' '}
                  {new Date(membership.purchasedate).toLocaleDateString(
                    'en-IN'
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {previousMemberships.length === 0 && !currentMembership && (
        <p className="text-xl sm:text-4xl">No memberships</p>
      )}
    </div>
  )
}

export default Myaccount
