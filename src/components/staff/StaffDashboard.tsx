import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import * as Types from '../../types'
import buildingImage from '../../assets/nia.png'

export function StaffDashboard() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Types.DocumentWithDetails[]>([])
  const [notifications, setNotifications] = useState<Types.TaskNotificationWithDetails[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [streamPosts, setStreamPosts] = useState<Types.StreamPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Types.StreamPost | null>(null)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [documentsRes, notificationsRes, tasksRes, postsRes] = await Promise.all([
        apiService.getDocuments(user?.USER_ID || 0),
        apiService.getNotifications(user?.USER_ID || 0),
        apiService.getTasksAssignedTo(user?.USER_ID || 0),
        apiService.getAllPosts()
      ])

      if (documentsRes.success) {
        // Filter to show only user's documents
        const userDocuments = documentsRes.data?.filter(doc => 
          doc.CREATED_BY === user?.USER_ID
        ) || []
        setDocuments(userDocuments.slice(0, 10)) // Show latest 10
      }

      if (notificationsRes.success) {
        // Show latest notifications as announcements
        setNotifications(notificationsRes.data?.slice(0, 3) || [])
      }

      if (tasksRes.success) {
        const taskData = tasksRes.data || []
        setTasks(taskData.slice(0, 10)) // Show latest 10 tasks
      }

      if (postsRes.success) {
        setStreamPosts(postsRes.data?.slice(0, 5) || []) // Show latest 5 posts
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Submitted':
        return <span className="status-badge pending">SUBMITTED</span>
      case 'Under_Section_Review':
        return <span className="status-badge pending">UNDER REVIEW</span>
      case 'Under_Division_Review':
        return <span className="status-badge pending">DIVISION REVIEW</span>
      case 'Under_Regional_Review':
        return <span className="status-badge pending">REGIONAL REVIEW</span>
      case 'Approved':
        return <span className="status-badge approved">APPROVED</span>
      case 'Revision_Required':
        return <span className="status-badge draft">REVISION NEEDED</span>
      case 'Rejected':
        return <span className="status-badge draft">REJECTED</span>
      default:
        return <span className="status-badge draft">{status}</span>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="status-badge approved">COMPLETED</span>
      case 'in_progress':
        return <span className="status-badge pending">IN PROGRESS</span>
      case 'pending':
        return <span className="status-badge draft">PENDING</span>
      default:
        return <span className="status-badge draft">{status.toUpperCase()}</span>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="priority-badge urgent">URGENT</span>
      case 'high':
        return <span className="priority-badge high">HIGH</span>
      case 'medium':
        return <span className="priority-badge medium">MEDIUM</span>
      case 'low':
        return <span className="priority-badge low">LOW</span>
      default:
        return <span className="priority-badge medium">{priority.toUpperCase()}</span>
    }
  }

  const getAttachmentInfo = (link: string) => {
    const href = link.startsWith('http') ? link : `http://localhost:3001${link}`
    try {
      const u = new URL(href)
      const segments = u.pathname.split('/').filter(Boolean)
      const last = segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : ''
      const name = last || u.hostname || href
      const ext = last.includes('.') ? (last.split('.').pop() || '').toLowerCase() : ''
      const type = ext ? ext.toUpperCase() : 'LINK'
      return { href, name, type }
    } catch {
      return { href, name: href, type: 'LINK' }
    }
  }

  return (
    <div className="staff-dashboard">
      {/* Hero Banner with Building Image */}
      <div className="staff-dashboard-banner">
        <div className="banner-overlay"></div>
        <div className="banner-content">
          <h1>Welcome to INTRADOC</h1>
          <p>Intranet-Based Document Monitoring & Management System</p>
        </div>
      </div>
      
      {/* Main Dashboard Content */}
      <div className="staff-dashboard-content">
        <div className="dashboard-grid">
          {/* Left Column - Task Status */}
          <div className="document-status-section">
            <div className="section-title-bar">
              <h2>TASK STATUS</h2>
            </div>
            <div className="document-status-content">
              {loading ? (
                <div className="empty-state">Loading...</div>
              ) : tasks.length === 0 ? (
                <div className="empty-state">No tasks assigned yet</div>
              ) : (
                <table className="document-status-table">
                  <thead>
                    <tr>
                      <th>TITLE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr key={task.TASK_ID}>
                        <td>
                          <div className="document-title">{task.TITLE}</div>
                          <div className="document-date">
                            Due: {formatDate(task.DUE_DATE)}
                          </div>
                        </td>
                        <td>{getTaskStatusBadge(task.STATUS)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
          {/* Right Column - Stream Posts */}
          <div className="stream-posts-section">
            <div className="section-title-bar">
              <h2>STREAM POST</h2>
            </div>
            <div className="stream-posts-content">
              {loading ? (
                <div className="empty-state">Loading...</div>
              ) : streamPosts.length === 0 ? (
                <div className="empty-state">No announcements</div>
              ) : (
                <div className="posts-container">
                  {streamPosts.map(post => {
                    const isNew = new Date(post.CREATED_AT) > new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
                    return (
                      <div key={post.POST_ID} className="post-card" onClick={() => setSelectedPost(post)}>
                        {isNew && <div className="post-badge-new">NEW!</div>}
                        <div className="post-header">
                          <div className="post-avatar">
                            <div className="avatar-icon"></div>
                          </div>
                          <div className="post-author-info">
                            <div className="post-author-name">{post.AUTHOR_NAME}</div>
                            <div className="post-author-role">{post.AUTHOR_ROLE}</div>
                          </div>
                          <div className="post-date">{formatDate(post.CREATED_AT)}</div>
                        </div>
                        <div className="post-message">
                          <div className="post-title">{post.TITLE}</div>
                          <div className="post-content">{post.MESSAGE}</div>
                          {(post.ATTACHMENT_FILE_URL || post.ATTACHMENT_EXTERNAL_URL || post.ATTACHMENT_LINK) && (
                            <div className="post-attachment">
                              {post.ATTACHMENT_FILE_URL && (() => { const info = getAttachmentInfo(post.ATTACHMENT_FILE_URL!); return (
                                <a href={info.href} target="_blank" rel="noopener noreferrer">
                                  📎 {info.name} ({info.type})
                                </a>
                              )})()}
                              {post.ATTACHMENT_EXTERNAL_URL && (() => { const info = getAttachmentInfo(post.ATTACHMENT_EXTERNAL_URL!); return (
                                <a href={info.href} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 12 }}>
                                  🔗 {info.name} ({info.type})
                                </a>
                              )})()}
                              {post.ATTACHMENT_LINK && !post.ATTACHMENT_EXTERNAL_URL && (() => { const info = getAttachmentInfo(post.ATTACHMENT_LINK!); return (
                                <a href={info.href} target="_blank" rel="noopener noreferrer">
                                  📎 {info.name} ({info.type})
                                </a>
                              )})()}
                            </div>
                          )}
                          {isNew && <div className="post-checkmark">✓</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          {selectedPost && (
            <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Post Details</h3>
                  <button className="btn-close" onClick={() => setSelectedPost(null)}>×</button>
                </div>
                <div className="modal-body">
                  <div className="post-header">
                    <div className="post-avatar"><div className="avatar-icon"></div></div>
                    <div className="post-author-info">
                      <div className="post-author-name">{selectedPost.AUTHOR_NAME}</div>
                      <div className="post-author-role">{selectedPost.AUTHOR_ROLE}</div>
                    </div>
                    <div className="post-date">{formatDate(selectedPost.CREATED_AT)}</div>
                  </div>
                  <div className="post-message">
                    <div className="post-title">{selectedPost.TITLE}</div>
                    <div className="post-content">{selectedPost.MESSAGE}</div>
                    {(selectedPost.ATTACHMENT_FILE_URL || selectedPost.ATTACHMENT_EXTERNAL_URL || selectedPost.ATTACHMENT_LINK) && (
                      <div className="post-attachment">
                        {selectedPost.ATTACHMENT_FILE_URL && (() => { const info = getAttachmentInfo(selectedPost.ATTACHMENT_FILE_URL!); return (
                          <a href={info.href} target="_blank" rel="noopener noreferrer">
                            📎 {info.name} ({info.type})
                          </a>
                        )})()}
                        {selectedPost.ATTACHMENT_EXTERNAL_URL && (() => { const info = getAttachmentInfo(selectedPost.ATTACHMENT_EXTERNAL_URL!); return (
                          <a href={info.href} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 12 }}>
                            🔗 {info.name} ({info.type})
                          </a>
                        )})()}
                        {selectedPost.ATTACHMENT_LINK && !selectedPost.ATTACHMENT_EXTERNAL_URL && (() => { const info = getAttachmentInfo(selectedPost.ATTACHMENT_LINK!); return (
                          <a href={info.href} target="_blank" rel="noopener noreferrer">
                            📎 {info.name} ({info.type})
                          </a>
                        )})()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setSelectedPost(null)}>Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
