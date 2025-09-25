import {
  DarkIcon,
  LightIcon,
  LoginIcon,
  LogoutIcon,
  MenuIcon
} from '@/components/icons/nav'
import { isAllowedLvl } from '@/utils/levelCheck'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLogin } from './LoginContext'
import { useMembershipContext } from './MembershipContext'
const Navbar = () => {
  const { loggedIn, logout, user } = useLogin()
  const { hasMembership } = useMembershipContext()
  const [showMenu, setShowMenu] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('click', handleOutsideClick)
    } else {
      document.removeEventListener('click', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [showMenu])

  const toggleMenu = (event) => {
    if (event) {
      event.stopPropagation()
    }
    setShowMenu((prevState) => !prevState)
  }
  const getDisplayName = (fullName) => {
    if (!fullName) return ''
    const parts = fullName.split(' ')
    return parts[0]
  }
  return (
    <nav className="relative top-0 z-20 flex w-full items-center justify-between bg-[#FFFEF9] dark:bg-[#141414] px-4 py-3   md:sticky">
      <Link to="/" className="flex items-center gap-2">
        <img
          className="h-12 w-auto block dark:hidden"
          src="/images/logo.png"
          alt="Movies"
        />
        <img
          className="h-12 w-auto hidden dark:block"
          src="/images/logo-dark.png"
          alt="Movies"
        />
        <p className="font-bn text-[30px] font-bold text-red-600">CHALCHITRA</p>
      </Link>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (document.body.classList.contains('dark')) {
              document.body.classList.remove('dark')
              localStorage.setItem('theme', 'light')
            } else {
              document.body.classList.add('dark')
              localStorage.setItem('theme', 'dark')
            }
          }}
        >
          <div className="hidden dark:block p-2 rounded-lg hover:bg-zinc-800">
            <DarkIcon />
          </div>
          <div className="block dark:hidden p-2 -mb-0.5 rounded-lg hover:bg-gray-200">
            <LightIcon />
          </div>
        </button>
        {loggedIn ? (
          <>
            <p className="hidden rounded-md bg-red-600 px-4 py-1.5 font-semibold text-white sm:block">
              Welcome {getDisplayName(user.name)}
            </p>
            <div
              className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800"
              onClick={logout}
            >
              <LogoutIcon />
            </div>
          </>
        ) : (
          <Link
            className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800"
            to="/login"
          >
            <LoginIcon />
          </Link>
        )}

        <div className="flex items-center">
          <button
            onClick={toggleMenu}
            className="flex items-center justify-center rounded-md p-1  transition duration-150 ease-in-out hover:bg-gray-200 dark:hover:bg-zinc-800 focus:outline-none"
          >
            <MenuIcon />
          </button>
        </div>
      </div>
      <div
        ref={dropdownRef}
        className={`${
          showMenu
            ? 'absolute right-2 top-20 z-20 block w-[70vw] rounded-md bg-white dark:bg-[#141414] p-2 sm:w-[20%] sm:p-4'
            : 'hidden'
        }`}
      >
        {loggedIn ? (
          <>
            <NavItem to="/profile" toggleMenu={toggleMenu}>
              My Profile
            </NavItem>
            <NavItem to="/tickets" toggleMenu={toggleMenu}>
              My Tickets
            </NavItem>
            {!hasMembership && (
              <NavItem to="/buy" toggleMenu={toggleMenu}>
                Buy a new Membership
              </NavItem>
            )}
            <NavItem to="/vote" toggleMenu={toggleMenu}>
              Vote Page
            </NavItem>
            {isAllowedLvl('admin', user?.usertype) && (
              <>
                <NavItem to="/adddropvolunteer" toggleMenu={toggleMenu}>
                  Add/Drop Volunteer
                </NavItem>
                <NavItem to="/onspot" toggleMenu={toggleMenu}>
                  On Spot Booking
                </NavItem>
                <NavItem to="/metrics" toggleMenu={toggleMenu}>
                  Metrics
                </NavItem>
                <NavItem to="/vendorpage" toggleMenu={toggleMenu}>
                  Vendor Page
                </NavItem>
                <NavItem to="/addbasetocore" toggleMenu={toggleMenu}>
                  Add Base to Core
                </NavItem>
                <NavItem to="/ticketprices" toggleMenu={toggleMenu}>
                  Ticket Prices
                </NavItem>
              </>
            )}
            {isAllowedLvl('ticketvolunteer', user?.usertype) && (
              <>
                <NavItem to="/scanner" toggleMenu={toggleMenu}>
                  Scanner
                </NavItem>
                <NavItem to="/foodverify" toggleMenu={toggleMenu}>
                  Food Verify
                </NavItem>
              </>
            )}
            {isAllowedLvl('movievolunteer', user?.usertype) && (
              <>
                <NavItem to="/modifymovie" toggleMenu={toggleMenu}>
                  Modify Movie
                </NavItem>
                <NavItem to="/addmovie" toggleMenu={toggleMenu}>
                  Add Movie
                </NavItem>
              </>
            )}
          </>
        ) : (
          <>
            <NavItem disabled>My Profile</NavItem>
            <NavItem disabled>My QRs</NavItem>
            <NavItem disabled>Buy a new Membership</NavItem>
            <NavItem disabled>VotePage</NavItem>
          </>
        )}
        <NavItem to="/guidelines" toggleMenu={toggleMenu}>
          Booking Guidelines/Help
        </NavItem>
      </div>
    </nav>
  )
}

const NavItem = ({ to, children, toggleMenu, disabled }) => {
  const handleClick = () => {
    if (!disabled) {
      toggleMenu()
    }
  }

  return (
    <Link
      to={to}
      onClick={disabled ? null : handleClick}
      className={`block rounded-md px-3 py-2 text-base font-medium  transition duration-150 ease-in-out hover:bg-gray-300 dark:hover:bg-gray-700 outline-none ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
      aria-disabled={disabled}
    >
      {children}
    </Link>
  )
}

export default Navbar
