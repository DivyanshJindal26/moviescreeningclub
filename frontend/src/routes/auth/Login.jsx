import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'

import { useMembershipContext } from '@/components/MembershipContext'
import { HideEye, LoginIcon, ShowEye } from '@/components/icons/Auth'

import { useLogin } from '@/components/LoginContext'
import { api } from '@/utils/api'

const Login = () => {
  const { login, user } = useLogin()
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.state?.from ?? { pathname: '/home', search: '' }

  const signupEmail = location.state?.email

  const [formData, setFormData] = useState({
    email: signupEmail ?? '',
    password: ''
  })
  const { hasMembership, checkMembershipStatus } = useMembershipContext()
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (user) {
      navigate(from.pathname + from.search)
    }
  }, [user])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post(`/auth/login`, formData)
      if (res.status === 200) {
        login(res.data)
      }
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) {
        Swal.fire({ title: 'Error', text: 'User not found', icon: 'error' })
      } else if (status === 401) {
        Swal.fire({
          title: 'Error',
          text: 'Email or password is wrong',
          icon: 'error'
        })
      } else {
        Swal.fire({
          title: 'Error',
          text: 'Internal server error',
          icon: 'error'
        })
      }
    }
  }

  return (
    <div className="-mt-10 flex w-full flex-col items-center bg-transparent dark:bg-gradient-to-tr dark:from-transparent dark:via-transparent dark:to-red-900 p-4 sm:p-12">
      <div className="flex gap-8 max-sm:w-full items-center justify-between rounded-lg bg-[#FFFEF9] shadow-xl dark:bg-[#19141459]/35 p-4 sm:p-8">
        <div className="h-[40vh] lg:h-[60vh] max-md:hidden">
          <LoginIcon />
        </div>
        <div className="flex max-sm:w-full  w-fit  flex-col items-center gap-3 max-sm:text-sm">
          <p className="text-2xl sm:text-4xl">Welcome Again!</p>
          <p className="mb-4 text-lg dark:text-[#FAFAFA] sm:text-xl">
            Please Login to continue
          </p>
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col  gap-4 text-sm sm:text-lg items-center"
          >
            <label className="flex flex-col gap-2 rounded-2xl w-full">
              <span>Email</span>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full rounded-xl bg-[#ADADAD]/15 dark:bg-[#F60101]/15 py-2 px-4 sm:min-w-[300px]"
                placeholder="enter your email"
                required
                value={formData.email}
                onChange={handleChange}
              />
            </label>
            <label className="flex flex-col gap-1.5 rounded-2xl w-full items-end">
              <p className="flex gap-2 w-full">
                <span className="details">Password</span>
                <div
                  className="flex items-center w-8 cursor-pointer bg-transparent dark:bg-[#781111]/85 rounded-xl"
                  onClick={() => setShowPassword((prevState) => !prevState)}
                >
                  {showPassword ? <ShowEye /> : <HideEye />}
                </div>
              </p>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className="w-full rounded-xl bg-[#ADADAD]/15 dark:bg-[#F60101]/15 py-2 px-4"
                placeholder="Password"
                required
                value={formData.password}
                onChange={handleChange}
              />
              <Link className="text-sm text-[#BD0F0F]" to="/forgot">
                Forgot Password?
              </Link>
            </label>
            <button
              className="bg-gradient-to-r from-[#B01010] to-[#CB2727] dark:to-[#4A0707] text-white rounded-xl w-fi py-2 px-6 sm:px-8 sm:py-3 "
              type="submit"
            >
              Login
            </button>
          </form>
          <span className=" text-center ">
            Don't have an account?
            <Link className="ml-1 text-[#BD0F0F]" to="/getOTP">
              Signup
            </Link>
          </span>
        </div>
      </div>
    </div>
  )
}

export default Login
