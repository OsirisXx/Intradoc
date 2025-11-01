import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import * as Types from '../../types'
import '../section-unit-head/SectionUnitHead.css'

export function AdminDashboard() {
  const { user } = useAuth()
  const isRegionalDirector = false // Admin doesn't have regional director privileges
  const [documents, setDocuments] = useState<any[]>([])
  const [notifications, setNotifications] = useState<Types.TaskNotificationWithDetails[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [allOrgTasks, setAllOrgTasks] = useState<any[]>([])
  const [streamPosts, setStreamPosts] = useState<Types.StreamPost[]>([])
  const [documentProgress, setDocumentProgress] = useState<any[]>([])
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
      
      const [documentsRes, notificationsRes, tasksRes, postsRes, progressRes] = await Promise.all([
        apiService.getDocuments(user?.USER_ID || 0),
        apiService.getNotifications(user?.USER_ID || 0),
        apiService.getAllTasksForOversight(),
        apiService.getAllPosts(),
        apiService.getDocumentProgress(user?.USER_ID || 0)
      ])

      if (documentsRes.success) {
        // Admin sees all documents without filtering
        setDocuments(documentsRes.data?.slice(0, 10) || [])
      }

      if (notificationsRes.success) {
        setNotifications(notificationsRes.data?.slice(0, 3) || [])
      }

      if (tasksRes.success) {
        const taskData = tasksRes.data || []
        setAllOrgTasks(taskData)
      }

      if (postsRes.success) {
        setStreamPosts(postsRes.data?.slice(0, 5) || [])
      }

      if (progressRes.success) {
        setDocumentProgress(progressRes.data || [])
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

  const isTaskOverdue = (dueDate: string, status: string): boolean => {
    if (status === 'completed') return false
    const due = new Date(dueDate)
    const now = new Date()
    return due < now
  }

  const sortTasksByUrgency = (tasks: any[]): any[] => {
    return [...tasks].sort((a, b) => {
      const aOverdue = isTaskOverdue(a.DUE_DATE, a.STATUS)
      const bOverdue = isTaskOverdue(b.DUE_DATE, b.STATUS)
      
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1
      
      const statusPriority: { [key: string]: number } = {
        'pending': 1,
        'in_progress': 2,
        'completed': 3,
        'cancelled': 4
      }
      
      const aPriority = statusPriority[a.STATUS] || 5
      const bPriority = statusPriority[b.STATUS] || 5
      
      if (aPriority !== bPriority) return aPriority - bPriority
      
      return new Date(a.DUE_DATE).getTime() - new Date(b.DUE_DATE).getTime()
    })
  }

  const getNextStepRole = (status: string) => {
    switch (status) {
      case 'Submitted':
      case 'Under_Section_Review':
        return 'Section Unit Head'
      case 'Under_Division_Review':
        return 'Division Manager'
      case 'Under_Regional_Review':
        return 'Regional Director'
      case 'Approved':
      case 'Archived':
        return 'Completed'
      case 'Rejected':
        return 'None'
      case 'Revision_Required':
        return 'Resubmit Required'
      default:
        return 'Unknown'
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
              <div className="header-icon">👨‍💼</div>
              <div className="header-text">
                <h1>Admin Dashboard</h1>
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
            <div className="header-icon">👨‍💼</div>
            <div className="header-text">
              <h1>Admin Dashboard</h1>
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

      {/* Task List */}
      <div className="document-status-section" style={{ marginTop: '24px', marginBottom: '24px' }}>
        <div className="section-title-bar">
          <h2>Pending & Overdue Tasks</h2>
        </div>
        <div className="document-status-content" style={{ padding: '20px' }}>
          {loading ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading...</div>
          ) : allOrgTasks.length === 0 ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No tasks found</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Task Title</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Assigned To</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Assigned By</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Due Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Delay Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortTasksByUrgency(allOrgTasks).map(task => {
                    const overdue = isTaskOverdue(task.DUE_DATE, task.STATUS)
                    return (
                      <tr 
                        key={task.TASK_ID} 
                        style={{ 
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: overdue ? '#fef2f2' : task.STATUS === 'completed' ? '#f8fafc' : 'white',
                          borderLeft: overdue ? '4px solid #ef4444' : 'none'
                        }}
                      >
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{task.TITLE}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{task.DESCRIPTION}</div>
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#1e293b' }}>
                          {task.assignedTo?.NAME || task.ASSIGNED_TO_NAME || 'Unknown'}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#1e293b' }}>
                          {task.assignedBy?.NAME || task.ASSIGNED_BY_NAME || 'Unknown'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {getTaskStatusBadge(task.STATUS)}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#1e293b' }}>
                          {formatDate(task.DUE_DATE)}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {overdue ? (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              padding: '4px 8px', 
                              borderRadius: '12px', 
                              fontSize: '10px', 
                              fontWeight: '600', 
                              backgroundColor: '#fee2e2', 
                              color: '#991b1b',
                              textTransform: 'uppercase'
                            }}>
                              OVERDUE
                            </span>
                          ) : task.STATUS === 'completed' ? (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              padding: '4px 8px', 
                              borderRadius: '12px', 
                              fontSize: '10px', 
                              fontWeight: '600', 
                              backgroundColor: '#f3f4f6', 
                              color: '#6b7280',
                              textTransform: 'uppercase'
                            }}>
                              COMPLETED
                            </span>
                          ) : (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              padding: '4px 8px', 
                              borderRadius: '12px', 
                              fontSize: '10px', 
                              fontWeight: '600', 
                              backgroundColor: '#dcfce7', 
                              color: '#166534',
                              textTransform: 'uppercase'
                            }}>
                              ON TIME
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="staff-dashboard-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="document-status-section">
              <div className="section-title-bar">
                <h2>Recent uploaded documents</h2>
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
                              {post.ATTACHMENT_FILE_URL && (() => { const info = getAttachmentInfo(post.ATTACHMENT_FILE_URL!); return (
                                <a href={info.href} target="_blank" rel="noopener noreferrer">📎 {info.name} ({info.type})</a>
                              )})()}
                              {post.ATTACHMENT_EXTERNAL_URL && (() => { const info = getAttachmentInfo(post.ATTACHMENT_EXTERNAL_URL!); return (
                                <a href={info.href} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 12 }}>🔗 {info.name} ({info.type})</a>
                              )})()}
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

      {/* Document Progress Section - Full Width */}
      <div className="document-status-section" style={{ gridColumn: '1 / -1', width: '100%', marginTop: '24px' }}>
        <div className="section-title-bar">
          <h2>DOCUMENT PROGRESS</h2>
        </div>
        <div className="document-status-content">
          {loading ? (
            <div className="empty-state">Loading...</div>
          ) : documentProgress.length === 0 ? (
            <div className="empty-state">No documents uploaded yet</div>
          ) : (
            <table className="document-status-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '30%', textAlign: 'left' }}>DOCUMENT</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>CURRENT STATUS</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>NEXT STEP</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>DEPARTMENT</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>LAST UPDATED</th>
                </tr>
              </thead>
              <tbody>
                {documentProgress.map(doc => (
                  <tr key={doc.DOCUMENT_ID}>
                    <td style={{ textAlign: 'left', padding: '12px 8px' }}>
                      <div className="document-title" style={{ fontWeight: '500', marginBottom: '4px' }}>{doc.TITLE}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                      {getStatusBadge(doc.CURRENT_STATUS || 'Submitted')}
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                      <span className="next-step" style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '500',
                        color: '#374151'
                      }}>{getNextStepRole(doc.CURRENT_STATUS)}</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {doc.SECTION_NAME || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                      <div className="document-date" style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {doc.LAST_UPDATED ? formatDate(doc.LAST_UPDATED) : 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>


      <div className="quick-actions-modern" style={{ marginTop: '32px' }}>
        <div className="actions-grid-modern">
          <button 
            className="action-card-modern"
            onClick={() => window.location.href = '/admin/account-management'}
          >
            <div className="action-icon-large">👤</div>
            <div className="action-content">
              <div className="action-title">Account Management</div>
              <div className="action-description">Manage user accounts</div>
            </div>
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
