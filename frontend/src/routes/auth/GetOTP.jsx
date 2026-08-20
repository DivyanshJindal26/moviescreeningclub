import { VerifyIcon } from '@/components/icons/Auth'
import { api } from '@/utils/api'
import { checkEmail } from '@/utils/user'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'

export default function GetOTP() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!checkEmail(email)) {
      setEmail('')
      Swal.fire({
        title: 'Error',
        text: 'Invalid email id. Use institute mail id.',
        icon: 'error'
      })
      return setIsSubmitting(false)
    }
    setIsSubmitting(true)
    try {
      const res = await api.post(`/otp/user`, {
        email
      })
      if (res.status === 200) {
        setIsSubmitting(false)
        navigate('/signup', { state: { email } })
      }
    } catch (err) {
      if (err.response.status === 401) {
        Swal.fire({
          title: 'Error',
          text: 'User already exists please login',
          icon: 'error'
        })
        return setIsSubmitting(false)
      } else {
        Swal.fire({
          title: 'Error',
          text: 'Internal server error',
          icon: 'error'
        })
      }
    }
    setIsSubmitting(false)
  }

  return (
    <div className="-mt-10 flex w-full flex-col items-center bg-transparent dark:bg-gradient-to-tr dark:from-transparent dark:via-transparent dark:to-red-900 p-4 sm:p-12">
      <div className="flex gap-8 max-sm:w-full items-center justify-between rounded-lg bg-[#FFFEF9] shadow-xl  dark:bg-[#19141459]/35 p-4 sm:p-8">
        <div className="h-[50vh] lg:h-[70vh] max-md:hidden">
          <VerifyIcon />
        </div>
        <div className="flex grow flex-col items-center gap-3 max-sm:text-sm">
          <p className="text-2xl sm:text-4xl">Email Verification!</p>
          <p className="mb-4 text-lg dark:text-[#FAFAFA] sm:text-xl">
            Please verify Email to continue
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
                className="w-full sm:min-w-[300px] rounded-xl bg-[#ADADAD]/15 py-2 px-4"
                placeholder="enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </label>
            <button
              className="bg-gradient-to-r text-white  from-[#B01010] to-[#CB2727] dark:to-[#4A0707]  rounded-xl w-fi py-2 px-6 sm:px-8 sm:py-3 "
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Verifying ...' : 'Verify'}
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
