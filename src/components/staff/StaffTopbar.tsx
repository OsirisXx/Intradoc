import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/auth'
import { API_URL } from '../../services/apiClient'
import './StaffTopbar.css'

interface StaffTopbarProps {
  onToggleSidebar?: () => void
}

export function StaffTopbar({ onToggleSidebar }: StaffTopbarProps) {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  const handleLogout = () => {
    authService.logout()
    logout()
    navigate('/login')
  }

  return (
    <header className="staff-topbar">
      {/* Left: Logo + Title */}
      <div className="topbar-brand">
        <button 
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        
        <div className="logo-container">
          {/* Building icon */}
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#019831" strokeWidth="2">
              <path d="M3 21h18"/>
              <path d="M5 21V7l8-4v18"/>
              <path d="M19 21V11l-6-4"/>
              <path d="M9 9v.01"/>
              <path d="M9 12v.01"/>
              <path d="M9 15v.01"/>
              <path d="M9 18v.01"/>
            </svg>
          </div>
          {/* Document icon */}
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#019831" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
          </div>
        </div>
        
        <div className="brand-text">
          <h1>INTRADOC</h1>
          <p>Intranet-Based Document Monitoring & Management System</p>
        </div>
      </div>
      
      {/* Right: Search + User */}
      <div className="topbar-actions">
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="user-avatar" title={`${user?.NAME || 'User'} (${user?.FUNCTIONAL_ROLE?.replace(/_/g, ' ') || 'STAFF'})`}>
          {user?.PROFILE_IMAGE ? (
            <img 
              src={user.PROFILE_IMAGE.startsWith('http') ? user.PROFILE_IMAGE : API_URL.replace(/\/api$/, '') + user.PROFILE_IMAGE} 
              alt="Profile" 
              className="user-avatar-img"
            />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          )}
        </div>
        <button 
          onClick={handleLogout}
          className="logout-btn"
          title="Logout"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
