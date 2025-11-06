import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import * as Types from '../../types'

export function StaffNotifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Types.TaskNotificationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  useEffect(() => {
    if (user) {
      loadNotifications()
    }
  }, [user])

  // Auto-mark all notifications as read when user visits the page
  useEffect(() => {
    if (user && notifications.length > 0) {
      const hasUnreadNotifications = notifications.some(n => !n.IS_READ)
      if (hasUnreadNotifications) {
        autoMarkAllAsRead()
      }
    }
  }, [user, notifications])

  const loadNotifications = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const response = await apiService.getNotifications(user.USER_ID)
      if (response.success) {
        setNotifications(response.data || [])
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await apiService.markNotificationAsRead(notificationId)
      if (response.success) {
        const now = new Date().toISOString()
        setNotifications(prev => 
          prev.map(notif => 
            notif.NOTIFICATION_ID === notificationId 
              ? { ...notif, IS_READ: true, READ_AT: now }
              : notif
          )
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.IS_READ)
      await Promise.all(
        unreadNotifications.map(notif => apiService.markNotificationAsRead(notif.NOTIFICATION_ID))
      )
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, IS_READ: true }))
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const autoMarkAllAsRead = async () => {
    try {
      if (!user) return
      
      // Use the backend bulk endpoint for better performance
      const response = await apiService.markAllNotificationsAsRead(user.USER_ID)
      if (response.success) {
        // Update local state to reflect all notifications as read
        const now = new Date().toISOString()
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, IS_READ: true, READ_AT: notif.IS_READ ? notif.READ_AT : now }))
        )
      }
    } catch (error) {
      console.error('Error auto-marking all notifications as read:', error)
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesReadFilter = filter === 'all' || (filter === 'unread' && !notification.IS_READ)
    const matchesTypeFilter = typeFilter === 'all' || notification.TYPE === typeFilter
    return matchesReadFilter && matchesTypeFilter
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'task_assigned':
        return '📋'
      case 'document_approved':
        return '✅'
      case 'document_rejected':
        return '❌'
      case 'revision_required':
        return '🔄'
      case 'feedback_received':
        return '💬'
      default:
        return '🔔'
    }
  }

  const getNotificationTypeLabel = (type: string) => {
    const labelMap: { [key: string]: string } = {
      task_assigned: 'New Task',
      task_completed: 'Task Done',
      document_approved: 'Document OK',
      document_rejected: 'Needs Fix',
      revision_required: 'Revise Doc',
      document_resubmitted: 'Doc Updated',
      feedback_received: 'Feedback',
      deadline_approaching: 'Due Soon',
      deadline_overdue: 'Overdue',
      system_announcement: 'Announcement',
      section_update: 'Update'
    }
    return labelMap[type] || type
  }

  const unreadCount = notifications.filter(n => !n.IS_READ).length
  const urgentCount = notifications.filter(n => !n.IS_READ && (n.TYPE === 'deadline_approaching' || n.TYPE === 'deadline_overdue')).length

  const showToast = (message: string) => {
    // Simple toast notification
    const toast = document.createElement('div')
    toast.textContent = message
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #019831;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 1000;
      font-size: 14px;
    `
    document.body.appendChild(toast)
    setTimeout(() => document.body.removeChild(toast), 3000)
  }

  const getTaskNavigationUrl = (notification: Types.TaskNotificationWithDetails): string => {
    // If notification has RELATED_TASK_ID, construct the work page URL
    if (notification.RELATED_TASK_ID) {
      return `/staff/work/${notification.RELATED_TASK_ID}`
    }

    // If no RELATED_TASK_ID, go to general work page
    return '/staff/work'
  }

  return (
    <div className="staff-notifications">
      {/* Notification Summary */}
      <div className="notification-summary">
        <div className="summary-grid">
          <div className="summary-card total">
            <div className="card-icon">📊</div>
            <div className="card-number">{notifications.length}</div>
            <div className="card-label">Total</div>
            <div className="card-subtitle">All notifications</div>
          </div>
          <div className="summary-card unread">
            <div className="card-icon">🔔</div>
            <div className="card-number">{unreadCount}</div>
            <div className="card-label">Unread</div>
            <div className="card-subtitle">Need attention</div>
          </div>
          <div className="summary-card tasks">
            <div className="card-icon">📋</div>
            <div className="card-number">{notifications.filter(n => n.TYPE.includes('task')).length}</div>
            <div className="card-label">Tasks</div>
            <div className="card-subtitle">Task related</div>
          </div>
          <div className="summary-card urgent">
            <div className="card-icon">⚠️</div>
            <div className="card-number">{urgentCount}</div>
            <div className="card-label">Urgent</div>
            <div className="card-subtitle">Due soon/overdue</div>
          </div>
        </div>
      </div>

      {/* Notification Controls */}
      <div className="notification-controls">
        <div className="search-section">
          <div className="search-input-wrapper">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search notifications..." 
              className="search-input"
            />
          </div>
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label>Status:</label>
            <select 
              className="filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
            >
              <option value="all">All ({notifications.length})</option>
              <option value="unread">Unread ({unreadCount})</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Type:</label>
            <select 
              className="filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="task_assigned">New Task</option>
              <option value="task_completed">Task Done</option>
              <option value="document_approved">Document OK</option>
              <option value="document_rejected">Needs Fix</option>
              <option value="revision_required">Revise Doc</option>
              <option value="feedback_received">Feedback</option>
              <option value="deadline_approaching">Due Soon</option>
              <option value="deadline_overdue">Overdue</option>
            </select>
          </div>

          <div className="view-controls">
            <button 
              className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            <button 
              className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="quick-filters">
          <button 
            className={`quick-filter ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <span className="chip-icon">📊</span>
            All
          </button>
          <button 
            className={`quick-filter ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            <span className="chip-icon">🔔</span>
            Unread
          </button>
          <button 
            className={`quick-filter ${typeFilter === 'task_assigned' ? 'active' : ''}`}
            onClick={() => setTypeFilter('task_assigned')}
          >
            <span className="chip-icon">📋</span>
            Tasks
          </button>
          <button 
            className={`quick-filter ${typeFilter === 'document_approved' ? 'active' : ''}`}
            onClick={() => setTypeFilter('document_approved')}
          >
            <span className="chip-icon">📄</span>
            Documents
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="notifications-list">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <h3>No notifications found</h3>
            <p>{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
          </div>
        ) : (
          <div className={`notifications-grid ${viewMode}`}>
            {filteredNotifications.map(notification => (
              <div
                key={notification.NOTIFICATION_ID}
                className={`notification-card ${!notification.IS_READ ? 'unread' : ''}`}
              >
                <div className="card-border"></div>
                <div className="card-header">
                  <div className="notification-type-badge">
                    <span className="type-icon">{getNotificationIcon(notification.TYPE)}</span>
                    <span className="type-label">{getNotificationTypeLabel(notification.TYPE)}</span>
                  </div>
                  {!notification.IS_READ && (
                    <div className="unread-badge">
                      <div className="unread-dot"></div>
                    </div>
                  )}
                </div>
                
                <div className="card-content">
                  <h3 className="notification-title">{notification.MESSAGE}</h3>
                  <p className="notification-message">
                    {notification.RELATED_TASK_ID && `Task ID: ${notification.RELATED_TASK_ID}`}
                    {notification.RELATED_DOCUMENT_ID && `Document ID: ${notification.RELATED_DOCUMENT_ID}`}
                  </p>
                </div>
                
                <div className="card-footer">
                  <div className="notification-time">
                    <span className="time-relative">
                      {notification.IS_READ && notification.READ_AT 
                        ? `Read: ${formatDate(notification.READ_AT)}` 
                        : `Created: ${formatDate(notification.CREATED_AT)}`}
                    </span>
                    {notification.IS_READ && notification.READ_AT && (
                      <span className="time-absolute" style={{ marginLeft: '8px', fontSize: '0.85em', color: '#64748b' }}>
                        • Created: {formatDate(notification.CREATED_AT)}
                      </span>
                    )}
                  </div>
                  
                  <div className="card-actions">
                    {!notification.IS_READ && (
                      <button 
                        className="action-btn success"
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(notification.NOTIFICATION_ID)
                          showToast('Marked as read')
                        }}
                        title="Mark as read"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                        <span className="button-text">Mark as read</span>
                      </button>
                    )}
                    
                    {notification.TYPE === 'task_assigned' && (
                      <button 
                        className="action-btn primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          const taskUrl = getTaskNavigationUrl(notification)
                          navigate(taskUrl)
                        }}
                        title="View task"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/>
                          <path d="M13 7H7l4-4 4 4z"/>
                        </svg>
                        <span className="button-text">View Task</span>
                      </button>
                    )}
                    
                    {notification.TYPE.includes('document') && (
                      <button 
                        className="action-btn primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          const taskUrl = getTaskNavigationUrl(notification)
                          navigate(taskUrl)
                        }}
                        title="View documents"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                        </svg>
                        <span className="button-text">View Details</span>
                      </button>
                    )}

                    {notification.TYPE === 'feedback_received' && (
                      <button 
                        className="action-btn primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate('/staff/feedback')
                        }}
                        title="View feedback"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span className="button-text">View Feedback</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}