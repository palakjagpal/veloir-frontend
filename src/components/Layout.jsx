// frontend/src/components/Layout.jsx
import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { FiArrowRight, FiBell, FiMenu, FiSearch, FiUser, FiX, FiLogOut, FiList, FiSettings, FiHeart, FiInstagram, FiFacebook, FiTwitter, FiYoutube, FiMail, FiPhone, FiCheckCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { getImageUrl, api } from '../lib/api' 
import '../community-signup.css'
import '../newsletter-spacing.css'

export function Logo() { 
  return (
    <Link to="/" className="logo">
      <img src="/veloir-logo.png" alt="Veloir" />
      <span>veloir</span>
    </Link>
  ) 
}

function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() 

  useEffect(() => {
    const listener = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', listener)
    return () => window.removeEventListener('scroll', listener)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.profile-dropdown-wrapper')) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showDropdown])

  // Close mobile menu when route changes
  useEffect(() => {
    setOpen(false)
  }, [location.pathname]) 

  const handleLogout = async () => {
    try {
      await logout()
      setShowDropdown(false)
      setOpen(false)
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
      logout()
      navigate('/')
    }
  }

  const navLinks = [
    { name: 'Discover', path: '/bikes' },
    { name: 'Buy', path: '/bikes' },
    { name: 'Sell', path: '/bikes?type=sale' },
    { name: 'Ride', path: '/bikes?type=rent' },
    { name: 'Trade', path: '/bikes?type=trade' }
  ]

  return (
    <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
      <Logo />
      
      {/* Navigation */}
      <nav className={open ? 'mobile-open' : ''}>
        {navLinks.map(({ name, path }) => (
          <NavLink 
            onClick={() => setOpen(false)} 
            key={name} 
            to={path}
          >
            {name}
          </NavLink>
        ))}
        
        
        
        
      </nav>

      {/* Navigation Actions */}
      <div className="nav-actions">
        <Link className="icon-button desktop" to="/bikes">
          <FiSearch />
        </Link>
        <button className="icon-button desktop">
          <FiBell />
        </button>

        {user && (
          <Link className="icon-button desktop" to="/wishlist" title="Wishlist">
            <FiHeart />
          </Link>
        )}

        {/* Profile Dropdown - Desktop */}
        {user ? (
          <div className="profile-dropdown-wrapper">
            <button 
              className="profile-link"
              onClick={(e) => {
                e.stopPropagation()
                setShowDropdown(!showDropdown)
              }}
              aria-expanded={showDropdown}
              aria-haspopup="true"
            >
              <FiUser />
              <span>{user.name?.split(' ')[0] || 'User'}</span>
            </button>

            {showDropdown && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">
                    {(user.profileImage || user.avatar)? (
                      <img src={getImageUrl(user.profileImage || user.avatar)} alt={user.name} referrerPolicy="no-referrer" />
                    ) : (
                      user.name?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="dropdown-user-info">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <Link 
                  to="/my-bikes" 
                  className="dropdown-item" 
                  onClick={() => setShowDropdown(false)}
                >
                  <FiList /> My Listings
                </Link>
                <Link 
                  to="/settings" 
                  className="dropdown-item" 
                  onClick={() => setShowDropdown(false)}
                >
                  <FiSettings /> Account
                </Link>
                <button 
                  className="dropdown-item logout" 
                  onClick={handleLogout}
                >
                  <FiLogOut /> Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link className="profile-link" to="/login">
            <FiUser />
            <span>Sign in</span>
          </Link>
        )}

        <Link className="btn btn-mint desktop" to="/bikes/create">
          List your bike <FiArrowRight />
        </Link>
        
        <button className="menu" onClick={() => setOpen(!open)}>
          {open ? <FiX /> : <FiMenu />}
        </button>
      </div>
    </header>
  )
}

function CommunitySignup() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null) 

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (submitting) return

    setSubmitting(true)
    setStatus(null)

    try {
      const response = await api('/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })

      setStatus(response.alreadySubscribed ? 'already' : 'success')
      toast.success(response.message)
      setEmail('')
    } catch (err) {
      toast.error(err.message || 'Unable to subscribe right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="community-signup">
      <div className="community-signup-inner">
        <div className="community-copy">
          <p>Notes from the road.</p>
          <h2>Join the Veloir community</h2>
          <span>
            Receive curated riding routes, maintenance tips, and exclusive marketplace deals once a month.
          </span>
        </div>

        {status ? (
          <div className="community-form-success">
            <FiCheckCircle />
            <span>
              {status === 'already'
                ? "You're already part of the Veloir community!"
                : "You're subscribed! Check your inbox to say hi."}
            </span>
          </div>
        ) : (
          <form className="community-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="community-email">Your email address</label>
            <input
              id="community-email"
              type="email"
              required
              placeholder="Your email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
            />
            <button type="submit" disabled={submitting}>
              {submitting ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}


function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top wrap">
        <div className="footer-brand">
          <Logo />
          <p>Ride further. Live the journey.</p>
          <p className="footer-tagline">
            India's marketplace for buying, selling, renting and trading motorcycles.
          </p>
          <div className="footer-social">
            <a href="https://www.instagram.com" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <FiInstagram />
            </a>
            <a href="https://www.facebook.com" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
              <FiFacebook />
            </a>
            <a href="https://x.com" aria-label="X" target="_blank" rel="noopener noreferrer">
              <FiX />
            </a>
            <a href="https://www.youtube.com" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
              <FiYoutube />
            </a>
          </div>
        </div>
 
        <div className="footer-col">
          <h4>Explore</h4>
          <Link to="/bikes">Buy bikes</Link>
          <Link to="/bikes?type=rent">Rent a bike</Link>
          <Link to="/bikes?type=trade">Trade-in</Link>
          <Link to="/wishlist">Wishlist</Link>
        </div>
 
        
 
        <div className="footer-col">
          <h4>Company</h4>
          {/* TODO: build these pages/routes, then swap href="#" for real <Link to="..."> */}
          <a href="/about">About us</a>
          <a href="/careers">Careers</a>
          <a href="/notes-from-the-road">Notes from the road</a>
          <a href="/contact">Contact</a>
        </div>
 
        <div className="footer-col">
          <h4>Legal</h4>
          {/* TODO: build these pages/routes, then swap href="#" for real <Link to="..."> */}
          <a href="/privacy-policy">Privacy policy</a>
          <a href="/terms-of-service">Terms of service</a>
          <a href="/refund-policy">Refund policy</a>
        </div>
      </div>
 
      <div className="footer-bottom wrap">
        <span>© {new Date().getFullYear()} Veloir India. All rights reserved.</span>
        <div className="footer-contact">
          <a href="mailto:">
            <FiMail /> support@veloir.in
          </a>
          <a href="tel:+911234567890">
            <FiPhone /> +91 12345 67890
          </a>
        </div>
      </div>
    </footer>
  )
}
 
export default function Layout({ children }) {
  return (
    <>
      <Header />
      {children}
      <CommunitySignup />
      <Footer />
    </>
  )
}