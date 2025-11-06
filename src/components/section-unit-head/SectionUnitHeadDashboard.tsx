import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import * as Types from '../../types'
import './SectionUnitHead.css'

// Interface for documents returned by getDocumentsBySection
interface SectionDocument {
  DOCUMENT_ID: number;
  TITLE: string;
  DESCRIPTION?: string;
  FILE_LINK: string;
  FINGERPRINT_HASH: string;
  CATEGORY_ID: number;
  SECTION_ID: number;
  ASSIGNED_TO?: number;
  CREATED_BY: number;
  CREATED_AT: string;
  FREQUENCY?: string;
  TAGS?: string;
  CATEGORY_NAME?: string;
  SECTION_NAME?: string;
  CREATED_BY_NAME?: string;
  CREATED_BY_ROLE?: string;
  CURRENT_STATUS?: string;
  CURRENT_REMARKS?: string;
  STATUS_DATE?: string;
}

export function SectionUnitHeadDashboard() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<SectionDocument[]>([])
  const [notifications, setNotifications] = useState<Types.TaskNotificationWithDetails[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [streamPosts, setStreamPosts] = useState<Types.StreamPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Types.StreamPost | null>(null)
  
  // Dashboard statistics
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
        // Show all documents from this section
        setDocuments(documentsRes.data?.slice(0, 10) || []) // Show latest 10
      }

      if (notificationsRes.success) {
        // Show latest notifications as announcements
        setNotifications(notificationsRes.data?.slice(0, 3) || [])
      }

      if (tasksRes.success) {
        const taskData = tasksRes.data || []
        setTasks(taskData.slice(0, 10)) // Show latest 10 tasks assigned to section head
      }

      if (postsRes.success) {
        setStreamPosts(postsRes.data?.slice(0, 5) || []) // Show latest 5 posts
      }

      // Calculate statistics
      calculateStats(documentsRes.data || [], tasksRes.data || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (docs: SectionDocument[], myTasks: any[]) => {
    const completedTasks = myTasks.filter(task => task.STATUS === 'completed')
    const totalTasks = myTasks.length
    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0

    setStats({
      totalDocuments: docs.length,
      pendingReviews: 0, // Will be calculated separately if needed
      activeTasks: 0, // Will be calculated separately if needed
      myTasks: myTasks.filter(task => task.STATUS !== 'completed').length,
      teamMembers: 0, // Will be loaded separately if needed
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
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
                <h1>Section Dashboard</h1>
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
      {/* Enhanced Header */}
      <div className="page-header">
        <div className="header-gradient">
          <div className="header-content">
            <div className="header-icon">🏢</div>
            <div className="header-text">
              <h1>Section Dashboard</h1>
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

      {/* Statistics Overview */}
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

      {/* Main Dashboard Content */}
      <div className="staff-dashboard-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left Side - Two Stacked Containers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Container - Recent Documents from Staff */}
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
                    {documents.map(doc => (
                      <div key={doc.DOCUMENT_ID} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '16px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5f9'
                        e.currentTarget.style.borderColor = '#cbd5e1'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc'
                        e.currentTarget.style.borderColor = '#e2e8f0'
                      }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: '600', 
                            fontSize: '14px', 
                            color: '#1e293b',
                            marginBottom: '4px',
                            lineHeight: '1.4'
                          }}>
                            {doc.TITLE}
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>By {doc.CREATED_BY_NAME || 'Unknown'}</span>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span>{formatDate(doc.CREATED_AT)}</span>
                          </div>
                        </div>
                        <div style={{ marginLeft: '16px', flexShrink: 0 }}>
                          {getStatusBadge(doc.CURRENT_STATUS || 'Unknown')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Bottom Container - My Tasks */}
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
                      <div key={task.TASK_ID} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '16px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5f9'
                        e.currentTarget.style.borderColor = '#cbd5e1'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc'
                        e.currentTarget.style.borderColor = '#e2e8f0'
                      }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: '600', 
                            fontSize: '14px', 
                            color: '#1e293b',
                            marginBottom: '4px',
                            lineHeight: '1.4'
                          }}>
                            {task.TITLE}
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
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
          
          {/* Right Side - One Tall Container - Stream Posts */}
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
        </div>
      </div>

      {/* Enhanced Quick Actions */}
      <div className="quick-actions-modern">
        <div className="actions-grid-modern">
          <button 
            className="action-card-modern"
            onClick={() => window.location.href = '/section-unit-head/work'}
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
            onClick={() => window.location.href = '/section-unit-head/feedback'}
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
            onClick={() => window.location.href = '/section-unit-head/reports'}
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
            onClick={() => window.location.href = '/section-unit-head/tasks'}
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
            onClick={() => window.location.href = '/section-unit-head/posts'}
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

      {/* Post Details Modal */}
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
  )
}
