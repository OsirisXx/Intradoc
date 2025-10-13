import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { DateTimePicker } from '../common/DateTimePicker';
import * as Types from '../../types';
import './SectionUnitHead.css';

const SectionUnitHeadTasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Types.TaskWithDetails[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Types.TaskWithDetails[]>([]);
  const [staff, setStaff] = useState<Types.User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and view modes
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [activeTab, setActiveTab] = useState<'assigned' | 'assignedBy'>('assigned');

  // Task assignment modal
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  
  // Document review modal
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<Types.TaskWithDetails | null>(null);
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'with_submission' | 'no_submission'>('all');
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: 0,
    dueDateTime: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: '',
    tags: '',
    requiresDocument: false,
  });

  useEffect(() => {
    if (user) {
      loadTasks();
      loadStaff();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load tasks assigned to this section head
      const assignedToResponse = await apiService.getTasksAssignedTo(user?.USER_ID || 0);
      // Load tasks assigned by this section head
      const assignedByResponse = await apiService.getTasksAssignedBy(user?.USER_ID || 0);
      
      if (assignedToResponse.success) {
        setTasks(Array.isArray(assignedToResponse.data) ? assignedToResponse.data : []);
      }
      
      if (assignedByResponse.success) {
        setAssignedTasks(Array.isArray(assignedByResponse.data) ? assignedByResponse.data : []);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Failed to load tasks');
      setTasks([]);
      setAssignedTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const response = await apiService.getUsersBySection(user?.SECTION_ID || 0, 'staff');
      if (response.success) {
        setStaff(response.data || []);
      }
    } catch (err) {
      console.error('Error loading staff:', err);
    }
  };

  const handleStatusUpdate = async (taskId: number, newStatus: string) => {
    try {
      await apiService.updateTaskStatus(taskId, newStatus);
      
      // Update local state for both assigned and assigned by tasks
      setTasks(prev => prev.map(task => 
        task.TASK_ID === taskId 
          ? { ...task, STATUS: newStatus as any, COMPLETED_AT: newStatus === 'completed' ? new Date().toISOString() : undefined }
          : task
      ));
      
      setAssignedTasks(prev => prev.map(task => 
        task.TASK_ID === taskId 
          ? { ...task, STATUS: newStatus as any, COMPLETED_AT: newStatus === 'completed' ? new Date().toISOString() : undefined }
          : task
      ));
    } catch (err) {
      console.error('Error updating task status:', err);
      alert('Failed to update task status');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Validate required fields
    if (!taskForm.dueDateTime) {
      alert('Please select a due date and time.');
      return;
    }
    
    try {
      // Ensure datetime is in proper format for API
      const dueDateForAPI = new Date(taskForm.dueDateTime).toISOString();

      await apiService.createTask({
        title: taskForm.title,
        description: taskForm.description,
        assignedTo: taskForm.assignedTo,
        assignedBy: user.USER_ID, // Add the missing assignedBy field
        dueDate: dueDateForAPI,
        priority: taskForm.priority,
        requiresDocument: taskForm.requiresDocument,
        category: taskForm.category,
        tags: taskForm.tags,
        sectionId: user.SECTION_ID, // Add the missing sectionId field
      });

      // Create notification for assigned user
      const assignedUser = staff.find(s => s.USER_ID === taskForm.assignedTo);
      if (assignedUser) {
        await apiService.createNotification({
          userId: taskForm.assignedTo,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `${user.NAME} assigned you a new task: "${taskForm.title}"`,
          actionUrl: '/staff/tasks',
        });
      }

      // Reset form and close modal
      setTaskForm({
        title: '',
        description: '',
        assignedTo: 0,
        dueDateTime: '',
        priority: 'medium',
        category: '',
        tags: '',
        requiresDocument: false,
      });
      setShowCreateTaskModal(false);
      
      // Reload tasks
      await loadTasks();
      
      alert('Task created successfully!');
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  // Document review handler functions
  const handleViewSubmission = (task: Types.TaskWithDetails) => {
    setSelectedTaskForReview(task);
    setShowDocumentModal(true);
  };

  const handleDownloadDocument = (fileLink: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileLink;
    link.download = fileName;
    link.click();
  };

  const handleOpenUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="status-badge approved">COMPLETED</span>
      case 'in_progress':
        return <span className="status-badge pending">IN PROGRESS</span>
      case 'pending':
        return <span className="status-badge draft">PENDING</span>
      case 'overdue':
        return <span className="status-badge cancelled">OVERDUE</span>
      default:
        return <span className="status-badge draft">{status.toUpperCase()}</span>
    }
  };

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
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'completed' && new Date(dueDate) < new Date()
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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

  // Get current tasks based on active tab
  const currentTasks = activeTab === 'assigned' ? tasks : assignedTasks;

  const filteredTasks = currentTasks.filter(task => {
    const matchesStatus = statusFilter === 'all' || task.STATUS === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.PRIORITY === priorityFilter;
    const matchesAssignee = assigneeFilter === 'all' || task.ASSIGNED_TO === parseInt(assigneeFilter);
    const matchesSearch = task.TITLE.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.DESCRIPTION.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubmission = submissionFilter === 'all' || 
      (submissionFilter === 'with_submission' && task.LINKED_DOCUMENT_ID) ||
      (submissionFilter === 'no_submission' && !task.LINKED_DOCUMENT_ID);
    
    return matchesStatus && matchesPriority && matchesAssignee && matchesSearch && matchesSubmission;
  });

  const taskSummary = {
    total: currentTasks.length,
    completed: currentTasks.filter(t => t.STATUS === 'completed').length,
    pending: currentTasks.filter(t => t.STATUS === 'pending').length,
    inProgress: currentTasks.filter(t => t.STATUS === 'in_progress').length,
    overdue: currentTasks.filter(t => isOverdue(t.DUE_DATE, t.STATUS)).length
  };

  if (loading) {
    return (
      <div className="section-unit-head-tasks">
        <div className="page-header">
          <div className="header-gradient">
            <div className="header-content">
              <div className="header-icon">📋</div>
              <div className="header-text">
                <h1>Task Management</h1>
                <p>Manage tasks for your section</p>
              </div>
            </div>
          </div>
        </div>
        <div className="loading">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="section-unit-head-tasks">
      <div className="page-header">
        <div className="header-gradient">
          <div className="header-content">
            <div className="header-icon">📋</div>
            <div className="header-text">
              <h1>Task Management</h1>
              <p>Manage tasks for your section</p>
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
                {activeTab === 'assigned' ? 'Assigned to me' : 'Assigned by me'}
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
            
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateTaskModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', height: '2rem', padding: '0.375rem 0.75rem' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create Task
            </button>
          </div>

          <div className="tabs-and-filters">
            {/* Tabs */}
            <div className="task-tabs" style={{ marginBottom: '1.5rem' }}>
              <button 
                className={activeTab === 'assigned' ? 'active' : ''}
                onClick={() => setActiveTab('assigned')}
              >
                My Tasks ({tasks.length})
              </button>
              <button 
                className={activeTab === 'assignedBy' ? 'active' : ''}
                onClick={() => setActiveTab('assignedBy')}
              >
                Assigned Tasks ({assignedTasks.length})
              </button>
            </div>

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

              {activeTab === 'assignedBy' && (
                <div className="filter-group">
                  <label htmlFor="assignee-filter">Assignee</label>
                  <select
                    id="assignee-filter"
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Assignees</option>
                    {staff.map(member => (
                      <option key={member.USER_ID} value={member.USER_ID}>
                        {member.NAME}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all'
              ? 'Try adjusting your filters to see more tasks.'
              : activeTab === 'assigned'
              ? 'You don\'t have any tasks assigned yet.'
              : 'You haven\'t assigned any tasks yet.'
            }
          </p>
          {activeTab === 'assignedBy' && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateTaskModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', height: '2rem', padding: '0.375rem 0.75rem' }}
            >
              Create Your First Task
            </button>
          )}
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
                      {(task as any).ASSIGNED_BY_NAME || task.assignedBy?.NAME}
                    </span>
                    <span className="meta-separator">•</span>
                    <span className="meta-value">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h18"/>
                        <path d="M5 21V7l8-4v18"/>
                        <path d="M19 21V11l-6-4"/>
                      </svg>
                      {(task as any).SECTION_NAME || task.section?.NAME}
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
                        onClick={() => handleStatusUpdate(task.TASK_ID, 'in_progress')}
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
                        onClick={() => handleStatusUpdate(task.TASK_ID, 'completed')}
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
                <div className="task-list-meta">
                  {(task as any).ASSIGNED_BY_NAME || task.assignedBy?.NAME}
                </div>
                <div className="task-list-meta">{(task as any).SECTION_NAME || task.section?.NAME}</div>
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
                      onClick={() => handleStatusUpdate(task.TASK_ID, 'in_progress')}
                      className="btn btn-primary btn-xs"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '28px', minHeight: '28px' }}
                    >
                      Start
                    </button>
                  )}
                  
                  {task.STATUS === 'in_progress' && (
                    <button
                      onClick={() => handleStatusUpdate(task.TASK_ID, 'completed')}
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

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTaskModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Task</h3>
              <button 
                className="btn-close"
                onClick={() => setShowCreateTaskModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="task-title">Task Title *</label>
                  <input
                    id="task-title"
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                    placeholder="Enter task title..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="task-description">Description *</label>
                  <textarea
                    id="task-description"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    required
                    rows={4}
                    placeholder="Describe the task requirements..."
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="assignee">Assign to *</label>
                    <select
                      id="assignee"
                      value={taskForm.assignedTo}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, assignedTo: parseInt(e.target.value) }))}
                      required
                    >
                      <option value={0}>Select staff member...</option>
                      {staff.map(member => (
                        <option key={member.USER_ID} value={member.USER_ID}>
                          {member.NAME} ({member.ORGANIZATIONAL_ASSIGNMENT})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <DateTimePicker
                      id="due-datetime"
                      label="Due Date & Time"
                      value={taskForm.dueDateTime}
                      onChange={(value) => setTaskForm(prev => ({ ...prev, dueDateTime: value }))}
                      required
                      min={new Date().toISOString().slice(0, 16)}
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
                      required
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
                      id="category"
                      type="text"
                      value={taskForm.category}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g., Administrative, Technical..."
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="tags">Tags</label>
                  <input
                    id="tags"
                    type="text"
                    value={taskForm.tags}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g., urgent, review, documentation (comma-separated)"
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={taskForm.requiresDocument}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, requiresDocument: e.target.checked }))}
                    />
                    <span className="checkmark"></span>
                    Requires document submission
                  </label>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateTaskModal(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', height: '2rem', padding: '0.375rem 0.75rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', height: '2rem', padding: '0.375rem 0.75rem' }}
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Review Modal */}
      {showDocumentModal && selectedTaskForReview?.linkedDocument && (
        <div className="modal-overlay" onClick={() => setShowDocumentModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: 'white' }}>Submitted Work Review</h3>
              <button className="btn-close" onClick={() => setShowDocumentModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Task Information */}
              <div className="review-section">
                <h4>Task Information</h4>
                <div className="task-review-info" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="info-item">
                    <strong>Title:</strong> {selectedTaskForReview.TITLE}
                  </div>
                  <div className="info-item">
                    <strong>Description:</strong> {selectedTaskForReview.DESCRIPTION}
                  </div>
                  <div className="info-item">
                    <strong>Assigned To:</strong> {selectedTaskForReview.assignedTo?.NAME || 'Unknown'}
                  </div>
                  <div className="info-item">
                    <strong>Due Date:</strong> {formatDueDateTime(selectedTaskForReview.DUE_DATE)}
                  </div>
                  <div className="info-item">
                    <strong>Priority:</strong> {selectedTaskForReview.PRIORITY.toUpperCase()}
                  </div>
                  <div className="info-item">
                    <strong>Status:</strong> {selectedTaskForReview.STATUS.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Document Information */}
              <div className="review-section">
                <h4>Submitted Document</h4>
                <div className="document-review-info" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="info-item">
                    <strong>Document Title:</strong> {selectedTaskForReview.linkedDocument.TITLE}
                  </div>
                  {selectedTaskForReview.linkedDocument.DESCRIPTION && (
                    <div className="info-item">
                      <strong>Description:</strong> {selectedTaskForReview.linkedDocument.DESCRIPTION}
                    </div>
                  )}
                  <div className="info-item">
                    <strong>Submitted:</strong> {formatDate(selectedTaskForReview.linkedDocument.CREATED_AT)}
                  </div>
                  <div className="info-item">
                    <strong>Document ID:</strong> {selectedTaskForReview.linkedDocument.DOCUMENT_ID}
                  </div>
                  <div className="info-item">
                    <strong>File Hash:</strong> {selectedTaskForReview.linkedDocument.FINGERPRINT_HASH.substring(0, 16)}...
                  </div>
                </div>
              </div>

              {/* File/URL Access */}
              <div className="review-section">
                <h4>Access Options</h4>
                <div className="submission-actions">
                  {selectedTaskForReview.linkedDocument.FILE_LINK && (
                    <button
                      onClick={() => handleDownloadDocument(
                        selectedTaskForReview.linkedDocument!.FILE_LINK,
                        selectedTaskForReview.linkedDocument!.TITLE
                      )}
                      className="btn btn-primary btn-xs"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download File
                    </button>
                  )}
                  
                  {selectedTaskForReview.linkedDocument.FILE_LINK && (
                    <button
                      onClick={() => window.open(selectedTaskForReview.linkedDocument!.FILE_LINK, '_blank', 'noopener,noreferrer')}
                      className="btn btn-secondary btn-xs"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15,3 21,3 21,9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                      View File
                    </button>
                  )}

                  {/* Check if there's a DOCUMENT_URL field (for external URLs) */}
                  {(selectedTaskForReview.linkedDocument as any).DOCUMENT_URL && (
                    <button
                      onClick={() => handleOpenUrl((selectedTaskForReview.linkedDocument as any).DOCUMENT_URL)}
                      className="btn btn-outline btn-xs"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                      Open URL
                    </button>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="review-section">
                <h4>Actions</h4>
                <div className="submission-actions">
                  {selectedTaskForReview.STATUS === 'in_progress' && (
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedTaskForReview.TASK_ID, 'completed');
                        setShowDocumentModal(false);
                      }}
                      className="btn btn-success btn-xs"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20,6 9,17 4,12"/>
                      </svg>
                      Mark as Completed
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      // Navigate to feedback page or open feedback modal
                      window.location.href = `/section-unit-head/feedback`;
                    }}
                    className="btn btn-outline btn-xs"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Provide Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionUnitHeadTasks;

