import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const PUBLIC_PATHS = ['/login', '/signup']

const AuthGuard: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/me', {
          credentials: 'include',
        })
        if (!res.ok) {
          // If the request fails, treat as not logged in
          if (!PUBLIC_PATHS.includes(location.pathname)) navigate('/login')
          return
        }

        const data = await res.json()
        if (!data?.loggedIn) {
          if (!PUBLIC_PATHS.includes(location.pathname)) navigate('/login')
        }
      } catch (err) {
        if (!PUBLIC_PATHS.includes(location.pathname)) navigate('/login')
      }
    }

    check()
    // re-check on path change
  }, [location.pathname, navigate])

  return null
}

export default AuthGuard
