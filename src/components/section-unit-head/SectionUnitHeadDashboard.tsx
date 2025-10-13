import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import * as Types from '../../types'
import buildingImage from '../../assets/nia.png'
import './SectionUnitHead.css'

export function SectionUnitHeadDashboard() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Types.DocumentWithDetails[]>([])
  const [notifications, setNotifications] = useState<Types.TaskNotificationWithDetails[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [assignedTasks, setAssignedTasks] = useState<any[]>([])
  const [streamPosts, setStreamPosts] = useState<Types.StreamPost[]>([])
  const [loading, setLoading] = useState(true)
  
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
      const [documentsRes, notificationsRes, tasksRes, assignedTasksRes, postsRes] = await Promise.all([
        apiService.getDocumentsBySection(user?.SECTION_ID || 0),
        apiService.getNotifications(user?.USER_ID || 0),
        apiService.getTasksAssignedTo(user?.USER_ID || 0),
        apiService.getTasksAssignedBy(user?.USER_ID || 0),
        apiService.getAllPosts()
      ])

      if (documentsRes.success) {
        // Filter to show documents submitted by staff in this section
        const staffDocuments = documentsRes.data?.filter(doc => 
          doc.CREATED_BY_ROLE === 'staff'
        ) || []
        setDocuments(staffDocuments.slice(0, 10)) // Show latest 10
      }

      if (notificationsRes.success) {
        // Show latest notifications as announcements
        setNotifications(notificationsRes.data?.slice(0, 3) || [])
      }

      if (tasksRes.success) {
        const taskData = tasksRes.data || []
        setTasks(taskData.slice(0, 10)) // Show latest 10 tasks assigned to section head
      }

      if (assignedTasksRes.success) {
        const assignedTaskData = assignedTasksRes.data || []
        setAssignedTasks(assignedTaskData.slice(0, 5)) // Show latest 5 tasks assigned by section head
      }

      if (postsRes.success) {
        setStreamPosts(postsRes.data?.slice(0, 5) || []) // Show latest 5 posts
      }

      // Calculate statistics
      calculateStats(documentsRes.data || [], tasksRes.data || [], assignedTasksRes.data || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (docs: Types.DocumentWithDetails[], myTasks: any[], assignedTasks: any[]) => {
    const staffDocs = docs.filter(doc => doc.CREATED_BY_ROLE === 'staff')
    const pendingDocs = staffDocs.filter(doc => ['Submitted', 'Under_Section_Review'].includes(doc.STATUS))
    const completedTasks = assignedTasks.filter(task => task.STATUS === 'completed')
    const totalAssignedTasks = assignedTasks.length
    const completionRate = totalAssignedTasks > 0 ? Math.round((completedTasks.length / totalAssignedTasks) * 100) : 0

    setStats({
      totalDocuments: staffDocs.length,
      pendingReviews: pendingDocs.length,
      activeTasks: assignedTasks.filter(task => task.STATUS !== 'completed').length,
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

      {/* Dashboard Grid */}
      <div className="dashboard-grid-modern">
        {/* Recent Documents */}
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
              onClick={() => window.location.href = '/section-unit-head/reports'}
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

        {/* Announcements */}
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
              onClick={() => window.location.href = '/section-unit-head/notifications'}
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

        {/* My Tasks */}
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
              onClick={() => window.location.href = '/section-unit-head/tasks'}
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

        {/* Stream */}
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
              onClick={() => window.location.href = '/section-unit-head/posts'}
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
            onClick={() => window.location.href = '/section-unit-head/task-assignment'}
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
    </div>
  )
}
