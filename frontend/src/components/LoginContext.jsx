import { Loading } from '@/components/icons/Loading'
import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
const LoginContext = createContext()

export const useLogin = () => useContext(LoginContext)

export const LoginProvider = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState(true)
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  useEffect(() => {
    try {
      const token = JSON.parse(localStorage.getItem('token'))
      if (token) {
        const currentTime = Date.now() / 1000
        if (token.exp + 2 * 60 < currentTime) {
          localStorage.removeItem('token')
          setLoggedIn(false)
        } else {
          setLoggedIn(true)
          setUser(token)
        }
      } else {
        setLoggedIn(false)
      }
    } catch (e) {
      localStorage.removeItem('token')
      console.log(e)
    }
  }, [loggedIn])

  const login = (token) => {
    localStorage.setItem('token', JSON.stringify(token))
    setLoggedIn(true)
  }
  const logout = () => {
    localStorage.removeItem('token')
    setLoggedIn(false)
    setUser(null)
    navigate('/login')
  }
  if (loggedIn && !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loading />
      </div>
    )
  }

  return (
    <LoginContext.Provider value={{ loggedIn, login, logout, user }}>
      {children}
    </LoginContext.Provider>
  )
}
