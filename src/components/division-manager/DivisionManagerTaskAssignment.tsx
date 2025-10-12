import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import * as Types from '../../types'

export function DivisionManagerTaskAssignment() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Types.TaskWithDetails[]>([])
  const [divisionUsers, setDivisionUsers] = useState<Types.User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'overdue'>('all')
  const [selectedAssignee, setSelectedAssignee] = useState<number | null>(null)
  const [selectedRole, setSelectedRole] = useState<'all' | 'staff' | 'section_unit_head'>('all')

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

  // Load all users in current division
  const loadDivisionUsers = async () => {
    if (!user) return
    
    try {
      // Get user's division ID from their organizational assignment
      const divisionId = user.ORGANIZATIONAL_ASSIGNMENT === 'Engineering and Operations' ? 1 : 2
      const response = await apiService.getUsersByDivision(divisionId)
      if (response.success) {
        // Filter out admin and regional director roles
        const assignableUsers = response.data?.filter(u => 
          u.FUNCTIONAL_ROLE === 'staff' || u.FUNCTIONAL_ROLE === 'section_unit_head'
        ) || []
        setDivisionUsers(assignableUsers)
      }
    } catch (error) {
      console.error('Error loading division users:', error)
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
  const handleWriteFeedback = async (taskId: number, feedbackContent: string, feedbackType: string) => {
    if (!user) return
    
    try {
      const task = tasks.find(t => t.TASK_ID === taskId)
      if (!task) return

      await apiService.createFeedback({
        recipientId: task.ASSIGNED_TO,
        relatedTaskId: taskId,
        type: feedbackType as any,
        content: feedbackContent,
      })

      // Create notification for feedback recipient
      await apiService.createNotification({
        userId: task.ASSIGNED_TO,
        type: 'feedback_received',
        title: 'Feedback on Your Task',
        message: `${user.NAME} provided feedback on "${task.TITLE}"`,
        relatedTaskId: taskId,
        actionUrl: '/staff/feedback',
      })

      alert('Feedback sent successfully!')
    } catch (error) {
      console.error('Error creating feedback:', error)
      alert('Failed to send feedback. Please try again.')
    }
  }

  useEffect(() => {
    loadTasks()
    loadDivisionUsers()
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'staff': return 'badge badge-info'
      case 'section_unit_head': return 'badge badge-warning'
      default: return 'badge badge-secondary'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== 'completed'
  }

  // Filter tasks based on selected filters
  const filteredTasks = tasks.filter(task => {
    // Filter by assignee
    if (selectedAssignee && task.ASSIGNED_TO !== selectedAssignee) return false
    
    // Filter by role
    if (selectedRole !== 'all') {
      const assignee = divisionUsers.find(u => u.USER_ID === task.ASSIGNED_TO)
      if (!assignee || assignee.FUNCTIONAL_ROLE !== selectedRole) return false
    }
    
    // Filter by status
    if (filter === 'all') return true
    if (filter === 'overdue') {
      return isOverdue(task.DUE_DATE, task.STATUS)
    }
    return task.STATUS === filter
  })

  // Get filtered users for assignee dropdown
  const filteredUsers = divisionUsers.filter(user => {
    if (selectedRole === 'all') return true
    return user.FUNCTIONAL_ROLE === selectedRole
  })

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Task Assignment</h1>
          <p>Assign tasks to staff and section heads across your division</p>
        </div>
        <div className="page-content">
          <div className="loading">Loading tasks...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Task Assignment</h1>
        <p>Assign tasks to staff and section heads across your division</p>
      </div>

      <div className="page-content">
        {/* Controls */}
        <div className="task-management-controls mb-4">
          <div className="row align-items-center">
            <div className="col-md-4">
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                + Create New Task
              </button>
            </div>
            <div className="col-md-8">
              <div className="filter-controls">
                <div className="btn-group me-3" role="group">
                  <button
                    type="button"
                    className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setFilter('all')}
                  >
                    All ({tasks.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setFilter('pending')}
                  >
                    Pending ({tasks.filter(t => t.STATUS === 'pending').length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${filter === 'in_progress' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setFilter('in_progress')}
                  >
                    In Progress ({tasks.filter(t => t.STATUS === 'in_progress').length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${filter === 'completed' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setFilter('completed')}
                  >
                    Completed ({tasks.filter(t => t.STATUS === 'completed').length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${filter === 'overdue' ? 'btn-danger' : 'btn-outline-danger'}`}
                    onClick={() => setFilter('overdue')}
                  >
                    Overdue ({tasks.filter(t => isOverdue(t.DUE_DATE, t.STATUS)).length})
                  </button>
                </div>
                
                <select 
                  className="form-select form-select-sm me-2"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                >
                  <option value="all">All Roles</option>
                  <option value="staff">Staff Only</option>
                  <option value="section_unit_head">Section Heads Only</option>
                </select>
                
                <select 
                  className="form-select form-select-sm"
                  value={selectedAssignee || ''}
                  onChange={(e) => setSelectedAssignee(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">All People</option>
                  {filteredUsers.map(user => (
                    <option key={user.USER_ID} value={user.USER_ID}>
                      {user.NAME} ({user.FUNCTIONAL_ROLE.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Division Overview */}
        <div className="division-overview mb-4">
          <div className="row">
            <div className="col-md-3">
              <div className="metric-card">
                <h4>Total Tasks</h4>
                <span className="metric-value">{tasks.length}</span>
              </div>
            </div>
            <div className="col-md-3">
              <div className="metric-card">
                <h4>Completed</h4>
                <span className="metric-value text-success">
                  {tasks.filter(t => t.STATUS === 'completed').length}
                </span>
              </div>
            </div>
            <div className="col-md-3">
              <div className="metric-card">
                <h4>In Progress</h4>
                <span className="metric-value text-warning">
                  {tasks.filter(t => t.STATUS === 'in_progress').length}
                </span>
              </div>
            </div>
            <div className="col-md-3">
              <div className="metric-card">
                <h4>Overdue</h4>
                <span className="metric-value text-danger">
                  {tasks.filter(t => isOverdue(t.DUE_DATE, t.STATUS)).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No tasks found</h3>
            <p>
              {filter === 'all' && !selectedAssignee && selectedRole === 'all'
                ? "You haven't assigned any tasks yet. Create your first task to get started."
                : `No tasks found with the selected filters.`
              }
            </p>
          </div>
        ) : (
          <div className="tasks-list">
            {filteredTasks.map((task) => (
              <div key={task.TASK_ID} className={`task-card ${isOverdue(task.DUE_DATE, task.STATUS) ? 'task-overdue' : ''}`}>
                <div className="task-header">
                  <h4>{task.TITLE}</h4>
                  <div className="task-badges">
                    <span className={`badge ${getStatusColor(task.STATUS)}`}>
                      {task.STATUS.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`badge ${getPriorityColor(task.PRIORITY)}`}>
                      {task.PRIORITY.toUpperCase()}
                    </span>
                    {task.REQUIRES_DOCUMENT && (
                      <span className="badge badge-info">REQUIRES DOCUMENT</span>
                    )}
                  </div>
                </div>
                
                <p className="task-description">{task.DESCRIPTION}</p>
                
                <div className="task-meta">
                  <div className="task-assignee">
                    <strong>Assigned to:</strong> {task.assignedTo.NAME}
                    <span className={`badge ${getRoleBadge(task.assignedTo.FUNCTIONAL_ROLE)} ms-2`}>
                      {task.assignedTo.FUNCTIONAL_ROLE.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="task-section">
                    <strong>Section:</strong> {task.section.NAME}
                  </div>
                  <div className="task-due-date">
                    <strong>Due:</strong> {formatDate(task.DUE_DATE)}
                    {isOverdue(task.DUE_DATE, task.STATUS) && (
                      <span className="text-danger ms-2">(Overdue)</span>
                    )}
                  </div>
                  {task.CATEGORY && (
                    <div className="task-category">
                      <strong>Category:</strong> {task.CATEGORY}
                    </div>
                  )}
                  {task.COMPLETED_AT && (
                    <div className="task-completed">
                      <strong>Completed:</strong> {formatDate(task.COMPLETED_AT)}
                    </div>
                  )}
                </div>
                
                <div className="task-actions">
                  {task.STATUS === 'completed' && (
                    <button 
                      className="btn btn-sm btn-success"
                      onClick={() => {
                        const feedbackContent = prompt('Enter feedback for this completed task:')
                        const feedbackType = prompt('Feedback type (positive/constructive/action_required):')
                        if (feedbackContent && feedbackType) {
                          handleWriteFeedback(task.TASK_ID, feedbackContent, feedbackType)
                        }
                      }}
                    >
                      Write Feedback
                    </button>
                  )}
                  
                  <button className="btn btn-sm btn-outline-secondary">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Create New Task</h3>
                <button 
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleCreateTask}>
                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="task-title">Task Title *</label>
                    <input
                      type="text"
                      id="task-title"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter task title..."
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-description">Description *</label>
                    <textarea
                      id="task-description"
                      value={taskForm.description}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      placeholder="Provide detailed description of the task..."
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="assign-to">Assign to *</label>
                      <select
                        id="assign-to"
                        value={taskForm.assignedTo}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, assignedTo: Number(e.target.value) }))}
                        required
                      >
                        <option value="">Choose a person...</option>
                        {divisionUsers.map((user) => (
                          <option key={user.USER_ID} value={user.USER_ID}>
                            {user.NAME} ({user.ORGANIZATIONAL_ASSIGNMENT}) - {user.FUNCTIONAL_ROLE.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="due-date">Due Date *</label>
                      <input
                        type="date"
                        id="due-date"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="priority">Priority *</label>
                      <select
                        id="priority"
                        value={taskForm.priority}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value as any }))}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="category">Category</label>
                      <input
                        type="text"
                        id="category"
                        value={taskForm.category}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g., Administrative, Project, etc."
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="tags">Tags</label>
                    <input
                      type="text"
                      id="tags"
                      value={taskForm.tags}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="Comma-separated tags"
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={taskForm.requiresDocument}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, requiresDocument: e.target.checked }))}
                      />
                      This task requires a document upload
                    </label>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Task
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
