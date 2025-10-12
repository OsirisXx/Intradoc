import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { apiService } from '../../services/api'

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [notificationsRes, settingsRes] = await Promise.all([
        apiService.getNotifications(),
        apiService.getNotificationSettings()
      ])

      if (notificationsRes.success) setNotifications(notificationsRes.data || [])
      if (settingsRes.success) setSettings(settingsRes.data || {})
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
        setNotifications(prev => prev.map(notif => 
          notif.NOTIFICATION_ID === notificationId 
            ? { ...notif, IS_READ: true }
            : notif
        ))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const updateSetting = async (key: string, value: boolean) => {
    try {
      setUpdating(true)
      const newSettings = { ...settings, [key]: value }
      const response = await apiService.updateNotificationSettings(newSettings)
      if (response.success) {
        setSettings(newSettings)
      }
    } catch (error) {
      console.error('Error updating notification settings:', error)
    } finally {
      setUpdating(false)
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const getNotificationClass = (type: string) => {
    switch (type) {
      case 'requirement': return 'notification-info'
      case 'approval': return 'notification-success'
      case 'revision': return 'notification-warning'
      case 'deadline': return 'notification-danger'
      default: return 'notification-info'
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'requirement': return '📋'
      case 'approval': return '✅'
      case 'revision': return '⚠️'
      case 'deadline': return '⏰'
      default: return '📢'
    }
  }

  const unreadCount = notifications.filter(n => !n.IS_READ).length
  const todayCount = notifications.filter(n => {
    const today = new Date().toDateString()
    const notificationDate = new Date(n.CREATED_AT).toDateString()
    return today === notificationDate
  }).length

  const urgentCount = notifications.filter(n => n.TYPE === 'deadline' || n.TYPE === 'revision').length

  if (loading) {
    return (
      <div className="page">
        <h1>Notifications & Alerts</h1>
        <p className="muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Notifications & Alerts</h1>
      <p className="muted">Automated alerts for status changes, deadlines, and new requirements with read/unread tracking.</p>
      
      <div className="grid">
        <Card 
          title="Recent Notifications" 
          actions={<Badge color="red">{unreadCount} Unread</Badge>}
        >
          <div style={{ fontSize: 14 }}>
            {notifications.map(notification => (
              <div 
                key={notification.NOTIFICATION_ID} 
                className={`notification ${getNotificationClass(notification.TYPE)} ${notification.IS_READ ? 'read' : 'unread'}`}
                style={{ 
                  marginBottom: 12, 
                  padding: 12, 
                  borderRadius: 8,
                  cursor: notification.IS_READ ? 'default' : 'pointer',
                  opacity: notification.IS_READ ? 0.7 : 1,
                  border: notification.IS_READ ? '1px solid #e2e8f0' : '1px solid #3b82f6'
                }}
                onClick={() => !notification.IS_READ && markAsRead(notification.NOTIFICATION_ID)}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ marginRight: 8 }}>{getNotificationIcon(notification.TYPE)}</span>
                  <div style={{ fontWeight: 600, flex: 1 }}>
                    {notification.TYPE === 'requirement' && 'New Requirement'}
                    {notification.TYPE === 'approval' && 'Document Approved'}
                    {notification.TYPE === 'revision' && 'Revision Requested'}
                    {notification.TYPE === 'deadline' && 'Deadline Reminder'}
                  </div>
                  {!notification.IS_READ && (
                    <div style={{ 
                      width: 8, 
                      height: 8, 
                      backgroundColor: '#ef4444', 
                      borderRadius: '50%' 
                    }} />
                  )}
                </div>
                <div style={{ color: '#64748b', marginBottom: 4 }}>
                  {notification.MESSAGE}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {getTimeAgo(notification.CREATED_AT)}
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
                No notifications available
              </div>
            )}
          </div>
        </Card>

        <Card title="Notification Settings">
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Status Changes</span>
                <button
                  className={`btn-small ${settings.statusChanges ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => updateSetting('statusChanges', !settings.statusChanges)}
                  disabled={updating}
                >
                  {settings.statusChanges ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Deadline Reminders</span>
                <button
                  className={`btn-small ${settings.deadlineReminders ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => updateSetting('deadlineReminders', !settings.deadlineReminders)}
                  disabled={updating}
                >
                  {settings.deadlineReminders ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>New Requirements</span>
                <button
                  className={`btn-small ${settings.newRequirements ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => updateSetting('newRequirements', !settings.newRequirements)}
                  disabled={updating}
                >
                  {settings.newRequirements ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Approval Requests</span>
                <button
                  className={`btn-small ${settings.approvalRequests ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => updateSetting('approvalRequests', !settings.approvalRequests)}
                  disabled={updating}
                >
                  {settings.approvalRequests ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Alert Summary">
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Today</span>
                <Badge color="red">{todayCount} notifications</Badge>
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>This Week</span>
                <Badge color="amber">{notifications.length} total</Badge>
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Urgent</span>
                <Badge color="red">{urgentCount} items</Badge>
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Unread</span>
                <Badge color="blue">{unreadCount} notifications</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Notification Types">
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ marginRight: 8 }}>📋</span>
                <span style={{ fontWeight: 600 }}>Requirements</span>
              </div>
              <div style={{ color: '#64748b' }}>New document requirements and assignments</div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ marginRight: 8 }}>✅</span>
                <span style={{ fontWeight: 600 }}>Approvals</span>
              </div>
              <div style={{ color: '#64748b' }}>Document approvals and status changes</div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ marginRight: 8 }}>⚠️</span>
                <span style={{ fontWeight: 600 }}>Revisions</span>
              </div>
              <div style={{ color: '#64748b' }}>Revision requests and feedback</div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ marginRight: 8 }}>⏰</span>
                <span style={{ fontWeight: 600 }}>Deadlines</span>
              </div>
              <div style={{ color: '#64748b' }}>Deadline reminders and overdue alerts</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
