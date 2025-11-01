import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'

export function RegionalDirectorSidebar() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (user) {
      loadUnreadCount()
    }
  }, [user])

  // Refresh unread count when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadUnreadCount()
      }
    }

    // Also refresh when user navigates to/from notifications page
    const handleRouteChange = () => {
      if (user) {
        loadUnreadCount()
      }
    }

    // Listen for custom event when notifications are updated
    const handleNotificationsUpdated = () => {
      console.log('Received notificationsUpdated event') // Debug log
      if (user) {
        loadUnreadCount()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('popstate', handleRouteChange)
    window.addEventListener('notificationsUpdated', handleNotificationsUpdated)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('popstate', handleRouteChange)
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdated)
    }
  }, [user])

  const loadUnreadCount = async () => {
    try {
      const response = await apiService.getNotifications(user?.USER_ID || 0)
      if (response.success) {
        const unread = response.data?.filter(n => !n.IS_READ).length || 0
        setUnreadCount(unread)
        console.log('Loaded unread count:', unread) // Debug log
      }
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  return (
    <aside className="sidebar">
      <div className="brand">IntraDoc</div>
      <nav className="nav">
        <div className="nav-section">Regional Director Dashboard</div>
        
        <NavLink to="/regional-director" className="nav-link" end>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          Home
        </NavLink>
        
        

        <NavLink to="/regional-director/reports" className="nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3h18v18H3z"/>
            <path d="M7 7h10v4H7z"/>
            <path d="M7 13h10v4H7z"/>
          </svg>
          Reports
        </NavLink>

        <NavLink to="/regional-director/notifications" className="nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Notifications
          {unreadCount > 0 && (
            <span style={{
              background: '#dc2626',
              color: 'white',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 'auto'
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </NavLink>
        
        <NavLink to="/regional-director/settings" className="nav-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
        </NavLink>
      </nav>
    </aside>
  )
}
