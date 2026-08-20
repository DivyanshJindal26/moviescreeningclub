import { HideEye, ShowEye, SignupIcon } from '@/components/icons/Auth'
import { api } from '@/utils/api'
import { checkEmail } from '@/utils/user'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
export const Signup = () => {
  const location = useLocation()
  const otpEmail = location.state?.email ?? ''
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    designation: '',
    password: '',
    otp: '',
    email: otpEmail
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOTP, setShowOTP] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    if (!checkEmail(email)) {
      Swal.fire({
        title: 'Error',
        text: 'Please enter a valid college email ID.',
        icon: 'error'
      })
      return
    }

    try {
      const res = await api.post(`/auth/signup`, formData)
      if (res.status === 201) {
        return navigate('/login', { state: { email: formData.email } })
      }
    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: 'Email already registered',
        icon: 'error'
      })
      setIsSubmitting(false)
      console.error('Error occurred:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleOTPVisibility = () => {
    setShowOTP(!showOTP)
  }
  const { name, phone, password, otp, email } = formData

  return (
    <div className="-mt-10 flex w-full flex-col items-center bg-transparent dark:bg-gradient-to-tr dark:from-transparent dark:via-transparent dark:to-red-900 p-4 sm:p-12">
      <div className="flex gap-8 max-sm:w-full items-center justify-between rounded-lg bg-[#FFFEF9] shadow-xl  dark:bg-[#19141459]/35 p-4 sm:p-8">
        <div className="h-[50vh] lg:h-[70vh] max-md:hidden">
          <SignupIcon />
        </div>
        <div className="flex grow flex-col items-center gap-3 max-sm:text-sm">
          <p className="text-2xl sm:text-4xl">Sign up</p>
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col  gap-4 text-sm sm:text-lg items-center"
          >
            <label className="flex flex-col gap-2 rounded-2xl w-full">
              <span>Name</span>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Enter your name"
                required
                value={name}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#ADADAD]/15 py-2 px-4 sm:min-w-[300px]"
              />
            </label>
            <label className="flex flex-col gap-2 rounded-2xl w-full">
              <span>Email</span>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full rounded-xl bg-[#ADADAD]/15 py-2 px-4 sm:min-w-[300px]"
                placeholder="enter your email"
                required
                value={email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </label>
            <label className="flex flex-col gap-2 rounded-2xl w-full">
              <span>Phone no</span>
              <input
                className="w-full rounded-xl bg-[#ADADAD]/15 py-2 px-4 sm:min-w-[300px]"
                type="text"
                id="phone"
                name="phone"
                placeholder="Enter your phone number"
                value={phone}
                onChange={handleChange}
              />
            </label>
            <label className="flex flex-col gap-2 rounded-2xl w-full">
              <span>OTP</span>
              <input
                id="otp"
                name="otp"
                required
                value={otp}
                placeholder="OTP"
                onChange={handleChange}
                className="w-full rounded-xl bg-[#ADADAD]/15 py-2 px-4"
              />
            </label>
            <label className="flex flex-col gap-1 rounded-2xl w-full items-end">
              <p className="flex gap-2 w-full">
                <span className="details">Password</span>
                <div
                  className="flex items-center w-8"
                  onClick={() => setShowPassword((prevState) => !prevState)}
                >
                  {showPassword ? <ShowEye /> : <HideEye />}
                </div>
              </p>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className="w-full rounded-xl bg-[#ADADAD]/15 py-2 px-4"
                placeholder="Password"
                required
                value={formData.password}
                onChange={handleChange}
              />
            </label>
            <button
              className="bg-gradient-to-r text-white from-[#B01010] to-[#CB2727] dark:to-[#4A0707]  rounded-xl w-fi py-2 px-6 sm:px-8 sm:py-3 "
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sign up...' : 'Signup'}
            </button>
          </form>
          <span className=" text-center ">
            Already have an account?
            <Link className="ml-1 text-[#BD0F0F]" to="/login">
              Sign In
            </Link>
          </span>
        </div>
      </div>
    </div>
  )
}

export default Signup
