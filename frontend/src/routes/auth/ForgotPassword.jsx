import { ForgotIcon } from '@/components/icons/Auth'
import { api } from '@/utils/api'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
export default function ForgotPassword() {
  const [formData, setFormData] = useState({
    email: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { email } = formData
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      const res = await api.post(`/otp/forgot`, {
        email
      })
      if (res.status === 200) {
        setIsSubmitting(false)
        navigate('/update', { state: { email: formData.email } })
      }
    } catch (err) {
      if (err.response.status === 401) {
        Swal.fire({
          title: 'Error',
          text: 'User does not exist please sign up',
          icon: 'error'
        })
      } else if (err.response.status === 500) {
        Swal.fire({
          title: 'Error',
          text: 'Internal server error',
          icon: 'error'
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div className="-mt-10 flex w-full flex-col items-center bg-transparent dark:bg-gradient-to-tr dark:from-transparent dark:via-transparent dark:to-red-900 p-4 sm:p-12">
      <div className="flex gap-8 max-sm:w-full items-center justify-between rounded-lg bg-[#FFFEF9] shadow-xl  dark:bg-[#19141459]/35 p-4 sm:p-8">
        <div className="h-[50vh] lg:h-[70vh] max-md:hidden">
          <ForgotIcon />
        </div>
        <div className="flex grow flex-col items-center gap-3 max-sm:text-sm">
          <p className="text-2xl sm:text-4xl"> Forgot password?</p>
          <p className="mb-4 text-lg dark:text-[#FAFAFA] sm:text-xl">
            Enter email to receive OTP
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
                className="w-full rounded-xl bg-[#ADADAD]/15 py-2 px-4"
                placeholder="enter your email"
                required
                value={email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </label>
            <button
              className="bg-gradient-to-r text-white from-[#B01010] to-[#CB2727] dark:to-[#4A0707]  rounded-xl w-fi py-2 px-6 sm:px-8 sm:py-3 "
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting ...' : 'Submit'}
            </button>
          </form>
          <span className=" text-center ">
            Remembered the password?
            <Link className="ml-1 text-[#BD0F0F]" to="/login">
              Sign In
            </Link>
          </span>
        </div>
      </div>
    </div>
  )
}
