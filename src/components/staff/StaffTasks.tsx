import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import { DocumentViewModal } from '../common/DocumentViewModal'
import './StaffTasks.css'

interface Task {
  TASK_ID: number
  TITLE: string
  DESCRIPTION: string
  STATUS: string
  PRIORITY: string
  DUE_DATE: string
  ASSIGNED_BY_NAME: string
  SECTION_NAME: string
  CREATED_AT: string
  COMPLETED_AT?: string
  LINKED_DOCUMENT_ID?: number
  linkedDocument?: any
}

export function StaffTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters and view modes
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'with_submission' | 'no_submission'>('all')
  
  // Document modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<{ id: number; title: string; fallbackUrl?: string } | null>(null)

  useEffect(() => {
    if (user) {
      loadTasks()
    }
  }, [user])

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.getTasksAssignedTo(user?.USER_ID || 0)
      
      if (response.success) {
        setTasks(Array.isArray(response.data) ? response.data : [])
      } else {
        console.error('Failed to load tasks:', response.error)
        setError('Failed to load tasks')
        setTasks([])
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
      setError('Failed to load tasks')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const handleTaskStatusUpdate = async (taskId: number, newStatus: string) => {
    try {
      const response = await apiService.updateTaskStatus(taskId, newStatus)
      
      if (response.success) {
        // Update local state
        setTasks(tasks.map(task => 
          task.TASK_ID === taskId 
            ? { ...task, STATUS: newStatus, COMPLETED_AT: newStatus === 'completed' ? new Date().toISOString() : task.COMPLETED_AT }
            : task
        ))
        
        // Show success message
        alert(`Task ${newStatus === 'completed' ? 'completed' : 'status updated'} successfully!`)
      } else {
        alert(`Failed to update task status: ${response.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating task status:', error)
      alert('Failed to update task status. Please try again.')
    }
  }

  // Document review handler functions
  const handleViewSubmission = (task: Task) => {
    // Open document in modal
    if (task.LINKED_DOCUMENT_ID && task.linkedDocument) {
      const documentId = task.linkedDocument.DOCUMENT_ID || task.LINKED_DOCUMENT_ID
      const fileLink = task.linkedDocument.FILE_LINK || task.linkedDocument.DOCUMENT_URL || (task.linkedDocument as any).DOCUMENT_URL
      const documentTitle = task.linkedDocument.TITLE || task.TITLE || 'Document'
      
      setSelectedDocument({
        id: documentId,
        title: documentTitle,
        fallbackUrl: fileLink
      })
      setModalOpen(true)
    } else if (task.LINKED_DOCUMENT_ID) {
      // If we have a document ID but no linked document data
      setSelectedDocument({
        id: task.LINKED_DOCUMENT_ID,
        title: task.TITLE || 'Document'
      })
      setModalOpen(true)
    } else {
      alert('No document linked to this task.')
    }
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedDocument(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="status-badge approved">COMPLETED</span>
      case 'in_progress':
        return <span className="status-badge pending">IN PROGRESS</span>
      case 'pending':
        return <span className="status-badge draft">PENDING</span>
      case 'cancelled':
        return <span className="status-badge cancelled">CANCELLED</span>
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDueDate = (dueDate: string) => {
    return new Date(dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDueDateTime = (dueDate: string) => {
    return new Date(dueDate).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'completed' && new Date(dueDate) < new Date()
  }

  // Filter tasks based on current filters
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === 'all' || task.STATUS === statusFilter
    const matchesPriority = priorityFilter === 'all' || task.PRIORITY === priorityFilter
    const matchesSearch = task.TITLE.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.DESCRIPTION.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSubmission = submissionFilter === 'all' || 
      (submissionFilter === 'with_submission' && task.LINKED_DOCUMENT_ID) ||
      (submissionFilter === 'no_submission' && !task.LINKED_DOCUMENT_ID)
    
    return matchesStatus && matchesPriority && matchesSearch && matchesSubmission
  })

  // Task summary statistics
  const taskSummary = {
    total: tasks.length,
    completed: tasks.filter(t => t.STATUS === 'completed').length,
    pending: tasks.filter(t => t.STATUS === 'pending').length,
    inProgress: tasks.filter(t => t.STATUS === 'in_progress').length,
    overdue: tasks.filter(t => isOverdue(t.DUE_DATE, t.STATUS)).length
  }

  if (loading) {
    return (
      <div className="staff-tasks">
        <div className="page-header">
          <div className="header-gradient">
            <div className="header-content">
              <div className="header-icon">📋</div>
              <div className="header-text">
                <h1>My Tasks</h1>
                <p>View and manage your assigned tasks</p>
              </div>
            </div>
          </div>
        </div>
        <div className="loading">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="staff-tasks">
      <div className="page-header">
        <div className="header-gradient">
          <div className="header-content">
            <div className="header-icon">📋</div>
            <div className="header-text">
              <h1>My Tasks</h1>
              <p>View and manage your assigned tasks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Task Summary */}
      <div className="task-summary">
        <div className="summary-grid">
          <div className="summary-card total">
            <div className="card-icon">📊</div>
            <div className="card-content">
              <div className="card-number">{taskSummary.total}</div>
              <div className="card-label">Total Tasks</div>
              <div className="card-subtitle">
                Assigned to me
              </div>
            </div>
          </div>
          
          <div className="summary-card completed">
            <div className="card-icon">✅</div>
            <div className="card-content">
              <div className="card-number">{taskSummary.completed}</div>
              <div className="card-label">Completed</div>
              <div className="card-subtitle">
                {taskSummary.total > 0 ? `${Math.round((taskSummary.completed / taskSummary.total) * 100)}% completion rate` : 'No tasks yet'}
              </div>
            </div>
          </div>
          
          <div className="summary-card in-progress">
            <div className="card-icon">🔄</div>
            <div className="card-content">
              <div className="card-number">{taskSummary.inProgress}</div>
              <div className="card-label">In Progress</div>
              <div className="card-subtitle">Currently active</div>
            </div>
          </div>
          
          <div className="summary-card overdue">
            <div className="card-icon">⚠️</div>
            <div className="card-content">
              <div className="card-number">{taskSummary.overdue}</div>
              <div className="card-label">Overdue</div>
              <div className="card-subtitle">
                {taskSummary.overdue > 0 ? 'Needs attention' : 'All on track'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="task-controls">
        <div className="controls-container">
          <div className="search-section">
            <div className="search-input-wrapper">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            
            <button
              className="btn btn-primary"
              onClick={loadTasks}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', height: '2rem', padding: '0.375rem 0.75rem' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23,4 23,10 17,10"/>
                <polyline points="1,20 1,14 7,14"/>
                <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"/>
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="tabs-and-filters">
            {/* Filters */}
            <div className="filters-row">
              <div className="filter-group">
                <label htmlFor="status-filter">Status</label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="priority-filter">Priority</label>
                <select
                  id="priority-filter"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="submission-filter">Submission</label>
                <select
                  id="submission-filter"
                  value={submissionFilter}
                  onChange={(e) => setSubmissionFilter(e.target.value as any)}
                  className="filter-select"
                >
                  <option value="all">All Tasks</option>
                  <option value="with_submission">With Submission</option>
                  <option value="no_submission">No Submission</option>
                </select>
              </div>

              <div className="view-controls">
                <button
                  className={`view-toggle ${viewMode === 'card' ? 'active' : ''}`}
                  onClick={() => setViewMode('card')}
                  title="Card view"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </button>
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {error && (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h3>Unable to load tasks</h3>
            <p>{error}</p>
            <button 
              onClick={loadTasks} 
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', height: '2rem', padding: '0.375rem 0.75rem' }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/>
              <path d="M13 7H7l4-4 4 4z"/>
            </svg>
          </div>
          <h3>No tasks found</h3>
          <p>
            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'Try adjusting your filters to see more tasks.'
              : "You don't have any tasks assigned yet."
            }
          </p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="tasks-grid">
          {filteredTasks.map(task => (
            <div 
              key={task.TASK_ID} 
              className={`task-card ${isOverdue(task.DUE_DATE, task.STATUS) ? 'overdue' : ''}`}
            >
              <div className="task-content">
                <div className="task-main">
                  <div className="task-header">
                    <h3 className="task-title">{task.TITLE}</h3>
                    <div className="task-badges">
                      {getStatusBadge(task.STATUS)}
                      {getPriorityBadge(task.PRIORITY)}
                      {isOverdue(task.DUE_DATE, task.STATUS) && (
                        <span className="overdue-badge">OVERDUE</span>
                      )}
                      {task.LINKED_DOCUMENT_ID && (
                        <span className="submission-indicator">📄 SUBMITTED</span>
                      )}
                    </div>
                  </div>
                  <div className="task-description">
                    {task.DESCRIPTION}
                  </div>
                </div>
                
                <div className="task-sidebar">
                  <div className="task-meta">
                    <span className={`meta-value ${isOverdue(task.DUE_DATE, task.STATUS) ? 'overdue' : ''}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                      Due: {formatDueDateTime(task.DUE_DATE)}
                    </span>
                    <span className="meta-separator">•</span>
                    <span className="meta-value">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      {task.ASSIGNED_BY_NAME}
                    </span>
                    <span className="meta-separator">•</span>
                    <span className="meta-value">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h18"/>
                        <path d="M5 21V7l8-4v18"/>
                        <path d="M19 21V11l-6-4"/>
                      </svg>
                      {task.SECTION_NAME}
                    </span>
                  </div>
                  
                  {/* Submission Details */}
                  {task.LINKED_DOCUMENT_ID && task.linkedDocument ? (
                    <div className="document-preview-section">
                      <div className="submission-info">
                        <h4>📄 Submitted Work</h4>
                        <div className="document-meta">
                          <span><strong>Title:</strong> {task.linkedDocument.TITLE}</span>
                          <span><strong>Submitted:</strong> {formatDate(task.linkedDocument.CREATED_AT)}</span>
                          {task.linkedDocument.DESCRIPTION && (
                            <span><strong>Description:</strong> {task.linkedDocument.DESCRIPTION}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="document-preview-section no-submission">
                      <div className="submission-info">
                        <h4>📝 Submission Status</h4>
                        <div className="no-submission-message">
                          <span><strong>Status:</strong> No submitted work yet</span>
                          <span><strong>Progress:</strong> Awaiting submission</span>
                          <span><strong>Next Step:</strong> Complete the task</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="task-actions">
                    {(task.LINKED_DOCUMENT_ID || task.linkedDocument) && (
                      <button
                        onClick={() => handleViewSubmission(task)}
                        className="btn btn-secondary btn-xs"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '28px', minHeight: '28px' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                        </svg>
                        View Submission
                      </button>
                    )}
                    
                    {task.STATUS === 'pending' && (
                      <button
                        onClick={() => handleTaskStatusUpdate(task.TASK_ID, 'in_progress')}
                        className="btn btn-primary btn-xs"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '28px', minHeight: '28px' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="5,3 19,12 5,21"/>
                        </svg>
                        Start
                      </button>
                    )}
                    
                    {task.STATUS === 'in_progress' && (
                      <button
                        onClick={() => handleTaskStatusUpdate(task.TASK_ID, 'completed')}
                        className="btn btn-success btn-xs"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '28px', minHeight: '28px' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                        Complete
                      </button>
                    )}
                    
                    {task.STATUS === 'completed' && (
                      <div className="completed-info">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                        Completed {task.COMPLETED_AT && formatDate(task.COMPLETED_AT)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        ) : (
          <div className="tasks-list">
            {filteredTasks.map(task => (
              <div 
                key={task.TASK_ID} 
                className={`task-list-item ${isOverdue(task.DUE_DATE, task.STATUS) ? 'overdue' : ''}`}
              >
                <div className="task-list-content">
                  <div>
                    <h4 className="task-list-title">{task.TITLE}</h4>
                    <p className="task-list-description">{task.DESCRIPTION}</p>
                  </div>
                  <div className="task-list-meta">
                    <span className={`${isOverdue(task.DUE_DATE, task.STATUS) ? 'overdue' : ''}`}>
                      Due: {formatDueDateTime(task.DUE_DATE)}
                    </span>
                  </div>
                  <div className="task-list-meta">{task.ASSIGNED_BY_NAME}</div>
                  <div className="task-list-meta">{task.SECTION_NAME}</div>
                  <div className="task-list-badges">
                    {getStatusBadge(task.STATUS)}
                    {getPriorityBadge(task.PRIORITY)}
                    {isOverdue(task.DUE_DATE, task.STATUS) && (
                      <span className="overdue-badge">OVERDUE</span>
                    )}
                    {task.LINKED_DOCUMENT_ID && (
                      <span className="submission-indicator">📄 SUBMITTED</span>
                    )}
                  </div>
                  <div className="task-list-actions">
                    {(task.LINKED_DOCUMENT_ID || task.linkedDocument) && (
                      <button
                        onClick={() => handleViewSubmission(task)}
                        className="btn btn-secondary btn-xs"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '28px', minHeight: '28px' }}
                      >
                        View Submission
                      </button>
                    )}
                    
                    {task.STATUS === 'pending' && (
                      <button
                        onClick={() => handleTaskStatusUpdate(task.TASK_ID, 'in_progress')}
                        className="btn btn-primary btn-xs"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '28px', minHeight: '28px' }}
                      >
                        Start
                      </button>
                    )}
                    
                    {task.STATUS === 'in_progress' && (
                      <button
                        onClick={() => handleTaskStatusUpdate(task.TASK_ID, 'completed')}
                        className="btn btn-success btn-xs"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '28px', minHeight: '28px' }}
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      
      {/* Document View Modal */}
      {selectedDocument && (
        <DocumentViewModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
          fallbackUrl={selectedDocument.fallbackUrl}
          taskContext={selectedDocument.task}
        />
      )}
    </div>
  )
}

