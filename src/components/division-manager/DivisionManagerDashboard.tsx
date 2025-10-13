import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import * as Types from '../../types'
import '../section-unit-head/SectionUnitHead.css'

export function DivisionManagerDashboard() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<any[]>([])
  const [notifications, setNotifications] = useState<Types.TaskNotificationWithDetails[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [streamPosts, setStreamPosts] = useState<Types.StreamPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Types.StreamPost | null>(null)
  
  const [stats, setStats] = useState({
    totalDocuments: 0,
    pendingReviews: 0,
    activeTasks: 0,
    myTasks: 0,
    teamMembers: 0,
    completionRate: 0
  })

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [documentsRes, notificationsRes, tasksRes, postsRes] = await Promise.all([
        apiService.getDocumentsBySection(user?.SECTION_ID || 0),
        apiService.getNotifications(user?.USER_ID || 0),
        apiService.getTasksAssignedTo(user?.USER_ID || 0),
        apiService.getAllPosts()
      ])

      if (documentsRes.success) {
        const staffDocuments = documentsRes.data?.filter((doc: any) => 
          doc.CREATED_BY_ROLE === 'staff'
        ) || []
        setDocuments(staffDocuments.slice(0, 10))
      }

      if (notificationsRes.success) {
        setNotifications(notificationsRes.data?.slice(0, 3) || [])
      }

      if (tasksRes.success) {
        const taskData = tasksRes.data || []
        setTasks(taskData.slice(0, 10))
      }

      if (postsRes.success) {
        setStreamPosts(postsRes.data?.slice(0, 5) || [])
      }
      calculateStats(documentsRes.data || [], tasksRes.data || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (docs: any[], myTasks: any[]) => {
    const completedTasks = myTasks.filter(task => task.STATUS === 'completed')
    const totalTasks = myTasks.length
    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0

    setStats({
      totalDocuments: docs.length,
      pendingReviews: 0,
      activeTasks: 0,
      myTasks: myTasks.filter(task => task.STATUS !== 'completed').length,
      teamMembers: 0,
      completionRate
    })
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return '📋'
      case 'task_completed':
        return '✅'
      case 'document_approved':
        return '📄'
      case 'document_rejected':
        return '❌'
      case 'revision_required':
        return '🔄'
      case 'feedback_received':
        return '💬'
      case 'deadline_approaching':
        return '⏰'
      case 'deadline_overdue':
        return '🚨'
      default:
        return '🔔'
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

  if (loading) {
    return (
      <div className="dashboard-container-modern">
        <div className="page-header">
          <div className="header-gradient">
            <div className="header-content">
              <div className="header-icon">🏢</div>
              <div className="header-text">
                <h1>Division Dashboard</h1>
                <p>Welcome back, {user?.NAME}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="loading-skeleton">
          <div className="skeleton-stats-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-stat-card">
                <div className="skeleton-shimmer"></div>
              </div>
            ))}
          </div>
          <div className="skeleton-dashboard-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-dashboard-card">
                <div className="skeleton-shimmer"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container-modern">
      <div className="page-header">
        <div className="header-gradient">
          <div className="header-content">
            <div className="header-icon">🏢</div>
            <div className="header-text">
              <h1>Division Dashboard</h1>
              <p>Welcome back, {user?.NAME}</p>
              <div className="header-date">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card documents">
            <div className="stat-icon">📄</div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalDocuments}</div>
              <div className="stat-label">Total Documents</div>
              <div className="stat-subtitle">From staff</div>
            </div>
          </div>
          
          <div className="stat-card pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-number">{stats.pendingReviews}</div>
              <div className="stat-label">Pending Reviews</div>
              <div className="stat-subtitle">Needs attention</div>
            </div>
          </div>
          
          <div className="stat-card tasks">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-number">{stats.activeTasks}</div>
              <div className="stat-label">Active Tasks</div>
              <div className="stat-subtitle">Assigned by you</div>
            </div>
          </div>
          
          <div className="stat-card my-tasks">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">{stats.myTasks}</div>
              <div className="stat-label">My Tasks</div>
              <div className="stat-subtitle">Assigned to you</div>
            </div>
          </div>
          
          <div className="stat-card completion">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-number">{stats.completionRate}%</div>
              <div className="stat-label">Completion Rate</div>
              <div className="stat-subtitle">Task performance</div>
            </div>
          </div>
          
          <div className="stat-card team">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{stats.teamMembers}</div>
              <div className="stat-label">Team Members</div>
              <div className="stat-subtitle">Staff count</div>
            </div>
          </div>
        </div>
      </div>

      <div className="staff-dashboard-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="document-status-section">
              <div className="section-title-bar">
                <h2>RECENT DOCUMENTS FROM STAFF</h2>
              </div>
              <div className="document-status-content" style={{ padding: '20px' }}>
                {loading ? (
                  <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading...</div>
                ) : documents.length === 0 ? (
                  <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No documents submitted by staff yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {documents.map((doc: any) => (
                      <div key={doc.DOCUMENT_ID} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', transition: 'all 0.2s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1' }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b', marginBottom: '4px', lineHeight: '1.4' }}>{doc.TITLE}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>By {doc.CREATED_BY_NAME || doc.createdByUser?.NAME || 'Unknown'}</span>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span>{formatDate(doc.CREATED_AT)}</span>
                          </div>
                        </div>
                        <div style={{ marginLeft: '16px', flexShrink: 0 }}>
                          {getStatusBadge(doc.CURRENT_STATUS || doc.STATUS || 'Unknown')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="document-status-section">
              <div className="section-title-bar">
                <h2>MY TASKS</h2>
              </div>
              <div className="document-status-content" style={{ padding: '20px' }}>
                {loading ? (
                  <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading...</div>
                ) : tasks.length === 0 ? (
                  <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No tasks assigned to you</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {tasks.map(task => (
                      <div key={task.TASK_ID} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', transition: 'all 0.2s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1' }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b', marginBottom: '4px', lineHeight: '1.4' }}>{task.TITLE}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>Due: {formatDate(task.DUE_DATE)}</span>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span>By {task.assignedBy?.NAME}</span>
                          </div>
                        </div>
                        <div style={{ marginLeft: '16px', flexShrink: 0 }}>
                          {getTaskStatusBadge(task.STATUS)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="stream-posts-section" style={{ height: 'fit-content', minHeight: '600px' }}>
            <div className="section-title-bar">
              <h2>STREAM POST</h2>
            </div>
            <div className="stream-posts-content" style={{ height: 'calc(100% - 60px)', overflowY: 'auto' }}>
              {loading ? (
                <div className="empty-state">Loading...</div>
              ) : streamPosts.length === 0 ? (
                <div className="empty-state">No announcements</div>
              ) : (
                <div className="posts-container">
                  {streamPosts.map(post => {
                    const isNew = new Date(post.CREATED_AT) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                    return (
                      <div key={post.POST_ID} className="post-card" onClick={() => setSelectedPost(post)}>
                        {isNew && <div className="post-badge-new">NEW!</div>}
                        <div className="post-header">
                          <div className="post-avatar"><div className="avatar-icon"></div></div>
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
                              {/* file */}
                              {post.ATTACHMENT_FILE_URL && (() => { const info = getAttachmentInfo(post.ATTACHMENT_FILE_URL!); return (
                                <a href={info.href} target="_blank" rel="noopener noreferrer">📎 {info.name} ({info.type})</a>
                              )})()}
                              {/* external */}
                              {post.ATTACHMENT_EXTERNAL_URL && (() => { const info = getAttachmentInfo(post.ATTACHMENT_EXTERNAL_URL!); return (
                                <a href={info.href} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 12 }}>🔗 {info.name} ({info.type})</a>
                              )})()}
                              {/* generic link */}
                              {post.ATTACHMENT_LINK && !post.ATTACHMENT_EXTERNAL_URL && (() => { const info = getAttachmentInfo(post.ATTACHMENT_LINK!); return (
                                <a href={info.href} target="_blank" rel="noopener noreferrer">📎 {info.name} ({info.type})</a>
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
      </div>
      </div>
      <div className="dashboard-grid-modern">
        <div className="dashboard-card-modern">
          <div className="card-header">
            <div className="card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              Recent Documents from Staff
            </div>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => window.location.href = '/division-manager/reports'}
            >
              View All
            </button>
          </div>
          <div className="card-content">
            {documents.length === 0 ? (
              <div className="empty-state">
                <p>No documents submitted by staff yet</p>
              </div>
            ) : (
              <div className="documents-list">
                {documents.map(doc => (
                  <div key={doc.DOCUMENT_ID} className="document-item">
                    <div className="document-info">
                      <div className="document-title">{doc.TITLE}</div>
                      <div className="document-meta">
                        <span>By {doc.createdByUser?.NAME || 'Unknown'}</span>
                        <span>•</span>
                        <span>{formatDate(doc.CREATED_AT)}</span>
                      </div>
                    </div>
                    <div className="document-status">
                      {getStatusBadge(doc.STATUS)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card-modern">
          <div className="card-header">
            <div className="card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Recent Announcements
            </div>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => window.location.href = '/division-manager/notifications'}
            >
              View All
            </button>
          </div>
          <div className="card-content">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <p>No recent announcements</p>
              </div>
            ) : (
              <div className="announcements-list">
                {notifications.map(notification => (
                  <div key={notification.NOTIFICATION_ID} className="announcement-item">
                    <div className="announcement-icon">
                      {getNotificationIcon(notification.TYPE)}
                    </div>
                    <div className="announcement-content">
                      <div className="announcement-title">{notification.TITLE}</div>
                      <div className="announcement-meta">
                        <span>{formatDate(notification.CREATED_AT)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card-modern">
          <div className="card-header">
            <div className="card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/>
                <path d="M13 7H7l4-4 4 4z"/>
              </svg>
              My Tasks
            </div>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => window.location.href = '/division-manager/tasks'}
            >
              View All
            </button>
          </div>
          <div className="card-content">
            {tasks.length === 0 ? (
              <div className="empty-state">
                <p>No tasks assigned to you</p>
              </div>
            ) : (
              <div className="tasks-list">
                {tasks.map(task => (
                  <div key={task.TASK_ID} className="task-item">
                    <div className="task-info">
                      <div className="task-title">{task.TITLE}</div>
                      <div className="task-meta">
                        <span>Due: {formatDate(task.DUE_DATE)}</span>
                        <span>•</span>
                        <span>By {task.assignedBy?.NAME}</span>
                      </div>
                    </div>
                    <div className="task-badges">
                      {getTaskStatusBadge(task.STATUS)}
                      {getPriorityBadge(task.PRIORITY)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card-modern">
          <div className="card-header">
            <div className="card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <path d="M9 10h6"/>
                <path d="M9 14h3"/>
              </svg>
              Recent Stream Posts
            </div>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => window.location.href = '/division-manager/posts'}
            >
              View All
            </button>
          </div>
          <div className="card-content">
            {streamPosts.length === 0 ? (
              <div className="empty-state">
                <p>No recent posts</p>
              </div>
            ) : (
              <div className="stream-list">
                {streamPosts.map(post => (
                  <div key={post.POST_ID} className="stream-item">
                    <div className="stream-avatar">
                      <span>{post.author?.NAME?.charAt(0) || '?'}</span>
                    </div>
                    <div className="stream-content">
                      <div className="stream-author">{post.author?.NAME}</div>
                      <div className="stream-text">{post.CONTENT}</div>
                      <div className="stream-meta">
                        <span>{formatDate(post.CREATED_AT)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="quick-actions-modern">
        <div className="actions-grid-modern">
          <button 
            className="action-card-modern"
            onClick={() => window.location.href = '/division-manager/work'}
          >
            <div className="action-icon-large">📋</div>
            <div className="action-content">
              <div className="action-title">Document Works</div>
              <div className="action-description">Review staff submissions</div>
            </div>
            <div className="action-badge">{stats.totalDocuments}</div>
          </button>
          
          <button 
            className="action-card-modern"
            onClick={() => window.location.href = '/division-manager/task-assignment'}
          >
            <div className="action-icon-large">📝</div>
            <div className="action-content">
              <div className="action-title">Assign Tasks</div>
              <div className="action-description">Create new assignments</div>
            </div>
            <div className="action-badge">{stats.teamMembers}</div>
          </button>
          
          <button 
            className="action-card-modern"
            onClick={() => window.location.href = '/division-manager/feedback'}
          >
            <div className="action-icon-large">💬</div>
            <div className="action-content">
              <div className="action-title">Give Feedback</div>
              <div className="action-description">Review and respond</div>
            </div>
            <div className="action-badge">{notifications.length}</div>
          </button>
          
          <button 
            className="action-card-modern"
            onClick={() => window.location.href = '/division-manager/reports'}
          >
            <div className="action-icon-large">📊</div>
            <div className="action-content">
              <div className="action-title">Review Reports</div>
              <div className="action-description">Analyze submissions</div>
            </div>
            <div className="action-badge">{stats.pendingReviews}</div>
          </button>
          
          <button 
            className="action-card-modern"
            onClick={() => window.location.href = '/division-manager/tasks'}
          >
            <div className="action-icon-large">✅</div>
            <div className="action-content">
              <div className="action-title">My Tasks</div>
              <div className="action-description">View assignments</div>
            </div>
            <div className="action-badge">{stats.myTasks}</div>
          </button>
          
          <button 
            className="action-card-modern"
            onClick={() => window.location.href = '/division-manager/posts'}
          >
            <div className="action-icon-large">📢</div>
            <div className="action-content">
              <div className="action-title">Stream Posts</div>
              <div className="action-description">Team communications</div>
            </div>
            <div className="action-badge">{streamPosts.length}</div>
          </button>
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
                      <a href={info.href} target="_blank" rel="noopener noreferrer">📎 {info.name} ({info.type})</a>
                    )})()}
                    {selectedPost.ATTACHMENT_EXTERNAL_URL && (() => { const info = getAttachmentInfo(selectedPost.ATTACHMENT_EXTERNAL_URL!); return (
                      <a href={info.href} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 12 }}>🔗 {info.name} ({info.type})</a>
                    )})()}
                    {selectedPost.ATTACHMENT_LINK && !selectedPost.ATTACHMENT_EXTERNAL_URL && (() => { const info = getAttachmentInfo(selectedPost.ATTACHMENT_LINK!); return (
                      <a href={info.href} target="_blank" rel="noopener noreferrer">📎 {info.name} ({info.type})</a>
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
  )
}


