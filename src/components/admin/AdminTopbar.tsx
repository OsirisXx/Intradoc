import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL } from '../../services/apiClient'
import { authService } from '../../services/auth'

interface AdminTopbarProps {
  onToggleSidebar?: () => void
}

export function AdminTopbar({ onToggleSidebar }: AdminTopbarProps) {
  const [showDropdown, setShowDropdown] = React.useState(false)
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const handleLogout = () => {
    setShowDropdown(false)
    authService.logout()
    logout()
    navigate('/login')
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showDropdown && !target.closest('.user-menu')) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="hamburger-menu" onClick={onToggleSidebar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span className="top-title">Intranet-Based Document Monitoring & Management System</span>
      </div>
      <div className="topbar-right">
        <input className="search" placeholder="Search documents, users, or requirements..." />
        <div className="user-menu">
          <div className="user-info">
            <span className="user-name">{user?.name || 'Admin User'}</span>
            <span className="user-role">{user?.role || 'Admin'}</span>
          </div>
          <button 
            className="avatar-dropdown" 
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {user?.PROFILE_IMAGE ? (
              <img 
                src={user.PROFILE_IMAGE.startsWith('http') ? user.PROFILE_IMAGE : API_URL.replace(/\/api$/, '') + user.PROFILE_IMAGE} 
                alt="Profile" 
                className="avatar-img"
              />
            ) : (
              <div className="avatar" />
            )}
            <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {showDropdown && (
            <div className="dropdown-menu">
              <div className="dropdown-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="currentColor"/>
                  <path d="M8 10C3.58172 10 0 13.5817 0 18H16C16 13.5817 12.4183 10 8 10Z" fill="currentColor"/>
                </svg>
                Profile
              </div>
              <div className="dropdown-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0ZM8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8C14 11.3137 11.3137 14 8 14Z" fill="currentColor"/>
                  <path d="M8 4C7.44772 4 7 4.44772 7 5V7C7 7.55228 7.44772 8 8 8C8.55228 8 9 7.55228 9 7V5C9 4.44772 8.55228 4 8 4Z" fill="currentColor"/>
                  <path d="M8 10C7.44772 10 7 10.4477 7 11V12C7 12.5523 7.44772 13 8 13C8.55228 13 9 12.5523 9 12V11C9 10.4477 8.55228 10 8 10Z" fill="currentColor"/>
                </svg>
                Settings
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item logout" onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 2H14C14.5523 2 15 2.44772 15 3V13C15 13.5523 14.5523 14 14 14H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 8H2M2 8L5 5M2 8L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

