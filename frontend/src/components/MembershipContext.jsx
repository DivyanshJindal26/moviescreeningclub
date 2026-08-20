import { Loading } from '@/components/icons/Loading'
import { useLogin } from '@/components/LoginContext'
import { api } from '@/utils/api'
import { createContext, useContext, useEffect, useState } from 'react'
const MembershipContext = createContext()

export const useMembershipContext = () => useContext(MembershipContext)

export const MembershipProvider = ({ children }) => {
  const { user } = useLogin()
  const [hasMembership, setHasMembership] = useState(false)
  const [memberships, setMemberships] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    checkMembershipStatus()
  }, [user])

  const checkMembershipStatus = async (resp) => {
    setLoading(true)
    if (!user) {
      setHasMembership(false)
      return
    }
    if (resp) {
      setHasMembership(resp.hasMembership)
      setMemberships(resp.memberships)
      return
    }
    try {
      const res = await api.get('/membership/check')

      if (res.status === 200) {
        setHasMembership(res.data.hasMembership)
        setMemberships(res.data.memberships)
      } else {
        setHasMembership(false)
      }
    } catch {
      setHasMembership(false)
    }
    setLoading(false)
  }
  if (loading && user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loading />
      </div>
    )
  }
  return (
    <MembershipContext.Provider
      value={{ hasMembership, checkMembershipStatus, memberships }}
    >
      {children}
    </MembershipContext.Provider>
  )
}
