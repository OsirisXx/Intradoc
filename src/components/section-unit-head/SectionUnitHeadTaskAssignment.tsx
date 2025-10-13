import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import * as Types from '../../types'
import './SectionUnitHead.css'

// Helper function for Philippine timezone conversion
const getPhilippineDateTime = (date: Date = new Date()): string => {
  // Convert to Philippine Time (UTC+8)
  const philippineTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  return philippineTime.toISOString().slice(0, 16);
};

export function SectionUnitHeadTaskAssignment() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Types.TaskWithDetails[]>([])
  const [staffMembers, setStaffMembers] = useState<Types.User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Types.TaskWithDetails | null>(null)
  const [taskDocuments, setTaskDocuments] = useState<Types.DocumentWithDetails[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'overdue'>('all')
  const [selectedAssignee, setSelectedAssignee] = useState<number | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({
    type: '',
    content: '',
  })

  // Task creation form state
  const [taskForm, setTaskForm] = useState<Types.TaskCreationForm>({
    title: '',
    description: '',
    assignedTo: 0,
    dueDate: '',
    priority: 'medium',
    requiresDocument: false,
    category: '',
    tags: '',
  })

  // Load tasks assigned by current user
  const loadTasks = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const response = await apiService.getTasksAssignedBy(user.USER_ID)
      if (response.success) {
        setTasks(response.data || [])
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load staff members in current section
  const loadStaffMembers = async () => {
    if (!user) return
    
    try {
      // Use backend filtering to get only staff members
      const response = await apiService.getUsersBySection(user.SECTION_ID, 'staff')
      if (response.success) {
        setStaffMembers(response.data || [])
      }
    } catch (error) {
      console.error('Error loading staff members:', error)
    }
  }

  // Create new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return
    
    try {
      const response = await apiService.createTask({
        ...taskForm,
        assignedBy: user.USER_ID,
        sectionId: user.SECTION_ID,
      })
      
      if (response.success) {
        // Create notification for assignee
        await apiService.createNotification({
          userId: taskForm.assignedTo,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned: ${taskForm.title}`,
          relatedTaskId: response.data.TASK_ID,
          actionUrl: '/staff/tasks',
        })
        
        // Reset form and close modal
        setTaskForm({
          title: '',
          description: '',
          assignedTo: 0,
          dueDate: '',
          priority: 'medium',
          requiresDocument: false,
          category: '',
          tags: '',
        })
        setShowCreateModal(false)
        await loadTasks()
        
        alert('Task assigned successfully!')
      }
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task. Please try again.')
    }
  }

  // Write feedback on completed task
  const handleWriteFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedTask) return
    
    try {
      await apiService.createFeedback({
        recipientId: selectedTask.ASSIGNED_TO,
        relatedTaskId: selectedTask.TASK_ID,
        type: feedbackForm.type,
        content: feedbackForm.content,
      })

      // Create notification for feedback recipient
      await apiService.createNotification({
        userId: selectedTask.ASSIGNED_TO,
        type: 'feedback_received',
        title: 'Feedback on Your Task',
        message: `${user.NAME} provided feedback on "${selectedTask.TITLE}"`,
        relatedTaskId: selectedTask.TASK_ID,
        actionUrl: '/staff/feedback',
      })

      // Reset form and close modal
      setFeedbackForm({ type: '', content: '' })
      setShowFeedbackModal(false)
      setSelectedTask(null)
      
      alert('Feedback sent successfully!')
    } catch (error) {
      console.error('Error creating feedback:', error)
      alert('Failed to send feedback. Please try again.')
    }
  }

  // Load documents for a specific task
  const loadTaskDocuments = async (taskId: number) => {
    try {
      const response = await apiService.getTaskDocuments(taskId)
      if (response.success) {
        setTaskDocuments(response.data || [])
      }
    } catch (error) {
      console.error('Error loading task documents:', error)
      setTaskDocuments([])
    }
  }

  // View task details
  const handleViewDetails = (task: Types.TaskWithDetails) => {
    setSelectedTask(task)
    setShowDetailsModal(true)
    loadTaskDocuments(task.TASK_ID)
  }

  // Delete task
  const handleDeleteTask = async (taskId: number) => {
    if (!user) return
    
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }
    
    try {
      const response = await apiService.deleteTask(taskId)
      if (response.success) {
        await loadTasks()
        alert('Task deleted successfully!')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Failed to delete task. Please try again.')
    }
  }

  useEffect(() => {
    loadTasks()
    loadStaffMembers()
  }, [user])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'status-pending'
      case 'in_progress': return 'status-in-progress'
      case 'completed': return 'status-completed'
      case 'overdue': return 'status-overdue'
      default: return 'status-pending'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'priority-low'
      case 'medium': return 'priority-medium'
      case 'high': return 'priority-high'
      case 'urgent': return 'priority-urgent'
      default: return 'priority-low'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== 'completed'
  }

  // Filter tasks based on selected filter
  const filteredTasks = tasks.filter(task => {
    if (selectedAssignee && task.ASSIGNED_TO !== selectedAssignee) return false
    if (filter === 'all') return true
    if (filter === 'overdue') {
      return isOverdue(task.DUE_DATE, task.STATUS)
    }
    return task.STATUS === filter
  })

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Task Assignment</h1>
          <p>Assign tasks to staff within your section or unit</p>
        </div>
        <div className="page-content">
          <div className="loading">Loading tasks...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="section-unit-head-task-assignment">
      <div className="page-header">
        <div className="header-content">
          <h2>📋 Task Assignment</h2>
          <p>Assign and manage tasks for staff within your section or unit</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-primary btn-lg"
            onClick={() => setShowCreateModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create New Task
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Task Summary Cards */}
        <div className="task-summary-cards">
          <div className="summary-card">
            <div className="summary-number">📊 {tasks.length}</div>
            <div className="summary-label">Total Tasks</div>
          </div>
          <div className="summary-card">
            <div className="summary-number">⏳ {tasks.filter(t => t.STATUS === 'pending').length}</div>
            <div className="summary-label">Pending</div>
          </div>
          <div className="summary-card">
            <div className="summary-number">🔄 {tasks.filter(t => t.STATUS === 'in_progress').length}</div>
            <div className="summary-label">In Progress</div>
          </div>
          <div className="summary-card">
            <div className="summary-number">✅ {tasks.filter(t => t.STATUS === 'completed').length}</div>
            <div className="summary-label">Completed</div>
          </div>
          <div className="summary-card">
            <div className="summary-number">⚠️ {tasks.filter(t => isOverdue(t.DUE_DATE, t.STATUS)).length}</div>
            <div className="summary-label">Overdue</div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="filters-section">
          <div className="filters-row">
            <div className="filter-group">
              <label>Filter by Status:</label>
              <div className="filter-buttons">
                <button
                  type="button"
                  className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All ({tasks.length})
                </button>
                <button
                  type="button"
                  className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                  onClick={() => setFilter('pending')}
                >
                  Pending ({tasks.filter(t => t.STATUS === 'pending').length})
                </button>
                <button
                  type="button"
                  className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
                  onClick={() => setFilter('in_progress')}
                >
                  In Progress ({tasks.filter(t => t.STATUS === 'in_progress').length})
                </button>
                <button
                  type="button"
                  className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
                  onClick={() => setFilter('completed')}
                >
                  Completed ({tasks.filter(t => t.STATUS === 'completed').length})
                </button>
                <button
                  type="button"
                  className={`filter-btn overdue ${filter === 'overdue' ? 'active' : ''}`}
                  onClick={() => setFilter('overdue')}
                >
                  Overdue ({tasks.filter(t => isOverdue(t.DUE_DATE, t.STATUS)).length})
                </button>
              </div>
            </div>

            <div className="filter-group">
              <label htmlFor="assignee-filter">Filter by Staff:</label>
              <select 
                id="assignee-filter"
                className="form-select"
                value={selectedAssignee || ''}
                onChange={(e) => setSelectedAssignee(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All Staff Members</option>
                {staffMembers.map(staff => (
                  <option key={staff.USER_ID} value={staff.USER_ID}>
                    {staff.NAME}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m0-7v4l3 3m0-7H9m6 0V8a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3"/>
                <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
              </svg>
            </div>
            <h3>No tasks found</h3>
            <p>
              {filter === 'all' && !selectedAssignee
                ? "You haven't assigned any tasks yet. Create your first task to get started."
                : `No tasks found with the selected filters.`
              }
            </p>
            {filter === 'all' && !selectedAssignee && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Create Your First Task
              </button>
            )}
          </div>
        ) : (
          <div className="tasks-grid">
            {filteredTasks.map((task) => (
              <div key={task.TASK_ID} className={`task-card ${isOverdue(task.DUE_DATE, task.STATUS) ? 'overdue' : ''}`}>
                <div className="task-content">
                  <div className="task-main">
                    <div className="task-header">
                      <h3 className="task-title">{task.TITLE}</h3>
                      <div className="task-badges">
                        <span className={`status-badge ${getStatusColor(task.STATUS)}`}>
                          {task.STATUS.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={`priority-badge ${getPriorityColor(task.PRIORITY)}`}>
                          {task.PRIORITY.toUpperCase()}
                        </span>
                        {isOverdue(task.DUE_DATE, task.STATUS) && (
                          <span className="overdue-badge">OVERDUE</span>
                        )}
                      </div>
                    </div>
                    <div className="task-description">
                      {task.DESCRIPTION}
                    </div>
                  </div>
                  
                  <div className="task-sidebar">
                    <div className="task-meta">
                      <span className="meta-value">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        {task.ASSIGNED_TO_NAME || 'Unknown'}
                      </span>
                      <span className="meta-separator">•</span>
                      <span className={`meta-value ${isOverdue(task.DUE_DATE, task.STATUS) ? 'overdue' : ''}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12,6 12,12 16,14"/>
                        </svg>
                        {formatDate(task.DUE_DATE)}
                      </span>
                      {task.CATEGORY && (
                        <>
                          <span className="meta-separator">•</span>
                          <span className="meta-value">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
                              <line x1="16" y1="8" x2="2" y2="22"/>
                              <line x1="17.5" y1="15" x2="9" y2="15"/>
                            </svg>
                            {task.CATEGORY}
                          </span>
                        </>
                      )}
                    </div>
                    
                    <div className="task-actions">
                      {task.STATUS === 'completed' && (
                        <button 
                          className="btn btn-sm btn-success"
                        onClick={() => {
                          setSelectedTask(task)
                          setShowFeedbackModal(true)
                        }}
                          title="Write feedback for completed task"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                          Feedback
                        </button>
                      )}
                      
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteTask(task.TASK_ID)}
                        title="Delete this task"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                        </svg>
                        Delete
                      </button>
                      
                      <button 
                        className="btn btn-sm btn-outline-primary" 
                        title="View task details"
                        onClick={() => handleViewDetails(task)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-content">
                <div className="modal-header">
                  <div className="header-content">
                    <h3>📋 Create New Task</h3>
                    <p>Assign a new task to a staff member in your section</p>
                  </div>
                  <button 
                    className="btn-close"
                    onClick={() => setShowCreateModal(false)}
                    title="Close modal"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleCreateTask}>
                  <div className="modal-body">
                    {/* Basic Information Section */}
                    <div className="form-section">
                      <h4 className="section-title">Basic Information</h4>
                      
                      <div className="form-group">
                        <label htmlFor="task-title">
                          Task Title <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id="task-title"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Enter a clear, descriptive task title..."
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="task-description">
                          Description <span className="required">*</span>
                        </label>
                        <textarea
                          id="task-description"
                          value={taskForm.description}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={4}
                          placeholder="Provide detailed instructions and context for this task..."
                          required
                        />
                      </div>
                    </div>

                    {/* Assignment Section */}
                    <div className="form-section">
                      <h4 className="section-title">Assignment Details</h4>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="assign-to">
                            Assign to <span className="required">*</span>
                          </label>
                          <select
                            id="assign-to"
                            value={taskForm.assignedTo}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, assignedTo: Number(e.target.value) }))}
                            required
                          >
                            <option value="">Choose a staff member...</option>
                            {staffMembers.map((staff) => (
                              <option key={staff.USER_ID} value={staff.USER_ID}>
                                {staff.NAME} {staff.ORGANIZATIONAL_ROLE ? `(${staff.ORGANIZATIONAL_ROLE})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label htmlFor="due-date">
                            Due Date & Time <span className="required">*</span>
                          </label>
                          <div className="datetime-picker-container">
                            <div className="datetime-inputs">
                              <div className="date-input-group">
                                <label htmlFor="due-date-input">Date</label>
                                <input
                                  type="date"
                                  id="due-date-input"
                                  value={taskForm.dueDate.split('T')[0] || ''}
                                  onChange={(e) => {
                                    const timePart = taskForm.dueDate.split('T')[1] || '09:00';
                                    setTaskForm(prev => ({ ...prev, dueDate: `${e.target.value}T${timePart}` }));
                                  }}
                                  min={new Date().toISOString().split('T')[0]}
                                  required
                                />
                              </div>
                              <div className="time-input-group">
                                <label htmlFor="due-time-input">Time</label>
                                <input
                                  type="time"
                                  id="due-time-input"
                                  value={taskForm.dueDate.split('T')[1] || '09:00'}
                                  onChange={(e) => {
                                    const datePart = taskForm.dueDate.split('T')[0] || '';
                                    setTaskForm(prev => ({ ...prev, dueDate: `${datePart}T${e.target.value}` }));
                                  }}
                                  required
                                />
                              </div>
                            </div>
                            <div className="quick-time-options">
                              <span className="quick-time-label">Quick options:</span>
                              <button
                                type="button"
                                className="quick-time-btn"
                                onClick={() => {
                                  const tomorrow = new Date();
                                  tomorrow.setDate(tomorrow.getDate() + 1);
                                  tomorrow.setHours(9, 0, 0, 0);
                                  setTaskForm(prev => ({ ...prev, dueDate: getPhilippineDateTime(tomorrow) }));
                                }}
                              >
                                Tomorrow 9:00 AM
                              </button>
                              <button
                                type="button"
                                className="quick-time-btn"
                                onClick={() => {
                                  const nextWeek = new Date();
                                  nextWeek.setDate(nextWeek.getDate() + 7);
                                  nextWeek.setHours(17, 0, 0, 0);
                                  setTaskForm(prev => ({ ...prev, dueDate: getPhilippineDateTime(nextWeek) }));
                                }}
                              >
                                Next Week 5:00 PM
                              </button>
                              <button
                                type="button"
                                className="quick-time-btn"
                                onClick={() => {
                                  const endOfMonth = new Date();
                                  endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
                                  endOfMonth.setHours(16, 0, 0, 0);
                                  setTaskForm(prev => ({ ...prev, dueDate: getPhilippineDateTime(endOfMonth) }));
                                }}
                              >
                                End of Month 4:00 PM
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="priority">
                            Priority <span className="required">*</span>
                          </label>
                          <select
                            id="priority"
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value as any }))}
                          >
                            <option value="low">🟢 Low - Can be done when convenient</option>
                            <option value="medium">🟡 Medium - Standard priority</option>
                            <option value="high">🟠 High - Important, needs attention soon</option>
                            <option value="urgent">🔴 Urgent - Critical, needs immediate attention</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label htmlFor="category">Category</label>
                          <input
                            type="text"
                            id="category"
                            value={taskForm.category}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, category: e.target.value }))}
                            placeholder="e.g., Administrative, Project, Training, etc."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Options Section */}
                    <div className="form-section">
                      <h4 className="section-title">Additional Options</h4>
                      
                      <div className="form-group">
                        <label htmlFor="tags">Tags</label>
                        <input
                          type="text"
                          id="tags"
                          value={taskForm.tags}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, tags: e.target.value }))}
                          placeholder="Enter comma-separated tags (e.g., quarterly, budget, 2024)"
                        />
                        <small className="form-hint">Tags help organize and filter tasks</small>
                      </div>

                      <div className="form-group">
                        <div className="checkbox-group">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={taskForm.requiresDocument}
                              onChange={(e) => setTaskForm(prev => ({ ...prev, requiresDocument: e.target.checked }))}
                            />
                            <span className="checkmark"></span>
                            <span className="checkbox-text">
                              <strong>📄 Document Required</strong>
                              <small>This task requires the staff member to upload a document upon completion</small>
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="modal-footer">
                    <div className="footer-actions">
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => setShowCreateModal(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary btn-lg">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 12l2 2 4-4"/>
                          <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                        </svg>
                        Create Task
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Task Details Modal */}
        {showDetailsModal && selectedTask && (
          <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <div className="header-content">
                    <h3>📋 Task Details</h3>
                    <p>Complete information about this task assignment</p>
                  </div>
                  <button 
                    className="btn-close"
                    onClick={() => setShowDetailsModal(false)}
                    title="Close modal"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                
                <div className="modal-body">
                  <div className="task-details-content">
                    {/* Task Header */}
                    <div className="details-header">
                      <h2>{selectedTask.TITLE}</h2>
                      <div className="details-badges">
                        <span className={`status-badge ${getStatusColor(selectedTask.STATUS)}`}>
                          {selectedTask.STATUS.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={`priority-badge ${getPriorityColor(selectedTask.PRIORITY)}`}>
                          {selectedTask.PRIORITY.toUpperCase()}
                        </span>
                        {selectedTask.REQUIRES_DOCUMENT && (
                          <span className="requirement-badge">
                            📄 Document Required
                          </span>
                        )}
                        {isOverdue(selectedTask.DUE_DATE, selectedTask.STATUS) && (
                          <span className="overdue-badge">
                            ⚠️ OVERDUE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Task Description */}
                    <div className="details-section">
                      <h4>Description</h4>
                      <p>{selectedTask.DESCRIPTION}</p>
                    </div>

                    {/* Task Metadata */}
                    <div className="details-grid">
                      <div className="details-item">
                        <label>Assigned To:</label>
                        <span className="value">{selectedTask.ASSIGNED_TO_NAME || 'Unknown'}</span>
                      </div>
                      
                      <div className="details-item">
                        <label>Assigned By:</label>
                        <span className="value">{selectedTask.ASSIGNED_BY_NAME || 'Unknown'}</span>
                      </div>
                      
                      <div className="details-item">
                        <label>Due Date:</label>
                        <span className={`value ${isOverdue(selectedTask.DUE_DATE, selectedTask.STATUS) ? 'overdue' : ''}`}>
                          {formatDate(selectedTask.DUE_DATE)}
                        </span>
                      </div>
                      
                      <div className="details-item">
                        <label>Priority:</label>
                        <span className={`value priority-${selectedTask.PRIORITY}`}>
                          {selectedTask.PRIORITY.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="details-item">
                        <label>Category:</label>
                        <span className="value">{selectedTask.CATEGORY || 'Not specified'}</span>
                      </div>
                      
                      <div className="details-item">
                        <label>Section:</label>
                        <span className="value">{selectedTask.SECTION_NAME || 'Not specified'}</span>
                      </div>
                      
                      <div className="details-item">
                        <label>Created:</label>
                        <span className="value">{formatDate(selectedTask.CREATED_AT)}</span>
                      </div>
                      
                      {selectedTask.COMPLETED_AT && (
                        <div className="details-item">
                          <label>Completed:</label>
                          <span className="value">{formatDate(selectedTask.COMPLETED_AT)}</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {selectedTask.TAGS && (
                      <div className="details-section">
                        <h4>Tags</h4>
                        <div className="tags-container">
                          {selectedTask.TAGS.split(',').map((tag, index) => (
                            <span key={index} className="tag">{tag.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Task Progress */}
                    <div className="details-section">
                      <h4>Task Progress</h4>
                      <div className="progress-info">
                        <div className="progress-item">
                          <span className="progress-label">Status:</span>
                          <span className={`progress-value ${getStatusColor(selectedTask.STATUS)}`}>
                            {selectedTask.STATUS.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        {selectedTask.STATUS === 'completed' && (
                          <div className="progress-item">
                            <span className="progress-label">Completion Time:</span>
                            <span className="progress-value">
                              {selectedTask.COMPLETED_AT ? 
                                `Completed on ${formatDate(selectedTask.COMPLETED_AT)}` : 
                                'Recently completed'
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Uploaded Documents */}
                    <div className="details-section">
                      <h4>📄 Uploaded Documents</h4>
                      {taskDocuments.length === 0 ? (
                        <div className="no-documents">
                          <p>No documents have been uploaded for this task yet.</p>
                          {selectedTask.REQUIRES_DOCUMENT && (
                            <p className="requirement-note">
                              <strong>Note:</strong> This task requires a document to be uploaded.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="documents-list">
                          {taskDocuments.map((doc) => (
                            <div key={doc.DOCUMENT_ID} className="document-item">
                              <div className="document-info">
                                <div className="document-title">{doc.TITLE}</div>
                                <div className="document-meta">
                                  <span className="document-date">
                                    Uploaded: {formatDate(doc.CREATED_AT)}
                                  </span>
                                  <span className="document-hash">
                                    SHA-256: {doc.FINGERPRINT_HASH.substring(0, 12)}...
                                  </span>
                                </div>
                                {doc.DESCRIPTION && (
                                  <div className="document-description">
                                    {doc.DESCRIPTION}
                                  </div>
                                )}
                              </div>
                              <div className="document-status">
                                {doc.currentStatus?.STATUS === 'Submitted' && (
                                  <span className="status-badge pending">SUBMITTED</span>
                                )}
                                {doc.currentStatus?.STATUS === 'Under_Section_Review' && (
                                  <span className="status-badge pending">UNDER REVIEW</span>
                                )}
                                {doc.currentStatus?.STATUS === 'Under_Division_Review' && (
                                  <span className="status-badge pending">DIVISION REVIEW</span>
                                )}
                                {doc.currentStatus?.STATUS === 'Under_Regional_Review' && (
                                  <span className="status-badge pending">REGIONAL REVIEW</span>
                                )}
                                {doc.currentStatus?.STATUS === 'Approved' && (
                                  <span className="status-badge approved">APPROVED</span>
                                )}
                                {doc.currentStatus?.STATUS === 'Revision_Required' && (
                                  <span className="status-badge draft">REVISION NEEDED</span>
                                )}
                                {doc.currentStatus?.STATUS === 'Rejected' && (
                                  <span className="status-badge draft">REJECTED</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <div className="footer-actions">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setShowDetailsModal(false)}
                    >
                      Close
                    </button>
                    {selectedTask.STATUS === 'completed' && (
                      <button 
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          setShowFeedbackModal(true)
                        }}
                      >
                        Write Feedback
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && selectedTask && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Write Feedback</h3>
                <button 
                  className="btn-close"
                  onClick={() => {
                    setShowFeedbackModal(false)
                    setSelectedTask(null)
                    setFeedbackForm({ type: '', content: '' })
                  }}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleWriteFeedback}>
                <div className="modal-body">
                  <div className="task-info mb-3">
                    <h4>Task: {selectedTask.TITLE}</h4>
                    <p className="text-muted">Assigned to: {selectedTask.ASSIGNED_TO_NAME}</p>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="feedback-type">Feedback Type *</label>
                    <input
                      id="feedback-type"
                      type="text"
                      value={feedbackForm.type}
                      onChange={(e) => setFeedbackForm(prev => ({ 
                        ...prev, 
                        type: e.target.value 
                      }))}
                      placeholder="e.g., positive, constructive, action_required, question"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="feedback-content">Feedback Content *</label>
                    <textarea
                      id="feedback-content"
                      value={feedbackForm.content}
                      onChange={(e) => setFeedbackForm(prev => ({ 
                        ...prev, 
                        content: e.target.value 
                      }))}
                      placeholder="Enter your feedback here..."
                      required
                      rows={4}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowFeedbackModal(false)
                      setSelectedTask(null)
                      setFeedbackForm({ type: '', content: '' })
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                  >
                    Send Feedback
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
