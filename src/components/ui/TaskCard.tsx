import React from 'react'
import { Badge } from './Badge'
import * as Types from '../../types'

interface TaskCardProps {
  task: Types.TaskWithDetails
  showAssignee?: boolean
  showSection?: boolean
  showProgress?: boolean
  onStatusChange?: (taskId: number, newStatus: string) => void
  onComplete?: (taskId: number) => void
  onViewDetails?: (taskId: number) => void
  className?: string
}

export function TaskCard({
  task,
  showAssignee = true,
  showSection = true,
  showProgress = false,
  onStatusChange,
  onComplete,
  onViewDetails,
  className = ''
}: TaskCardProps) {
  
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

  const getProgressPercentage = () => {
    if (task.STATUS === 'completed') return 100
    if (task.STATUS === 'pending') return 0
    if (task.STATUS === 'in_progress') return 50
    return 0
  }

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(task.TASK_ID, newStatus)
    }
  }

  const handleComplete = () => {
    if (onComplete) {
      onComplete(task.TASK_ID)
    }
  }

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(task.TASK_ID)
    }
  }

  return (
    <div className={`task-card ${className} ${isOverdue(task.DUE_DATE, task.STATUS) ? 'task-overdue' : ''}`}>
      <div className="task-header">
        <div className="task-title-section">
          <h4 className="task-title">{task.TITLE}</h4>
          <div className="task-badges">
            <Badge className={`badge ${getStatusColor(task.STATUS)}`}>
              {task.STATUS.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge className={`badge ${getPriorityColor(task.PRIORITY)}`}>
              {task.PRIORITY.toUpperCase()}
            </Badge>
            {task.REQUIRES_DOCUMENT && (
              <Badge className="badge badge-info">
                REQUIRES DOCUMENT
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="task-content">
        <p className="task-description">{task.DESCRIPTION}</p>

        {showProgress && (
          <div className="task-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
            <span className="progress-text">{getProgressPercentage()}%</span>
          </div>
        )}

        <div className="task-meta">
          {showAssignee && (
            <div className="task-meta-item">
              <span className="meta-label">Assigned to:</span>
              <span className="meta-value">{task.assignedTo.NAME}</span>
            </div>
          )}
          
          {showSection && (
            <div className="task-meta-item">
              <span className="meta-label">Section:</span>
              <span className="meta-value">{task.section.NAME}</span>
            </div>
          )}

          <div className="task-meta-item">
            <span className="meta-label">Due:</span>
            <span className={`meta-value ${isOverdue(task.DUE_DATE, task.STATUS) ? 'overdue' : ''}`}>
              {formatDate(task.DUE_DATE)}
              {isOverdue(task.DUE_DATE, task.STATUS) && (
                <span className="overdue-indicator"> (Overdue)</span>
              )}
            </span>
          </div>

          {task.CATEGORY && (
            <div className="task-meta-item">
              <span className="meta-label">Category:</span>
              <span className="meta-value">{task.CATEGORY}</span>
            </div>
          )}

          {task.TAGS && (
            <div className="task-meta-item">
              <span className="meta-label">Tags:</span>
              <span className="meta-value">{task.TAGS}</span>
            </div>
          )}

          {task.COMPLETED_AT && (
            <div className="task-meta-item">
              <span className="meta-label">Completed:</span>
              <span className="meta-value">{formatDate(task.COMPLETED_AT)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="task-actions">
        {task.STATUS !== 'completed' && (
          <button 
            className="btn btn-sm btn-success"
            onClick={handleComplete}
          >
            Mark Complete
          </button>
        )}
        
        {task.STATUS === 'pending' && (
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => handleStatusChange('in_progress')}
          >
            Start Task
          </button>
        )}
        
        {task.STATUS === 'in_progress' && (
          <button 
            className="btn btn-sm btn-secondary"
            onClick={() => handleStatusChange('pending')}
          >
            Mark Pending
          </button>
        )}

        <button 
          className="btn btn-sm btn-outline-secondary"
          onClick={handleViewDetails}
        >
          View Details
        </button>
      </div>
    </div>
  )
}

// Compact version for lists
export function TaskCardCompact({ task, onViewDetails, className = '' }: {
  task: Types.TaskWithDetails
  onViewDetails?: (taskId: number) => void
  className?: string
}) {
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

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== 'completed'
  }

  return (
    <div className={`task-card-compact ${className} ${isOverdue(task.DUE_DATE, task.STATUS) ? 'task-overdue' : ''}`}>
      <div className="task-compact-header">
        <h5 className="task-compact-title">{task.TITLE}</h5>
        <div className="task-compact-badges">
          <Badge className={`badge ${getStatusColor(task.STATUS)}`}>
            {task.STATUS.replace('_', ' ')}
          </Badge>
          <Badge className={`badge ${getPriorityColor(task.PRIORITY)}`}>
            {task.PRIORITY}
          </Badge>
        </div>
      </div>
      
      <div className="task-compact-content">
        <p className="task-compact-description">{task.DESCRIPTION}</p>
        <div className="task-compact-meta">
          <span>Due: {new Date(task.DUE_DATE).toLocaleDateString()}</span>
          {isOverdue(task.DUE_DATE, task.STATUS) && (
            <span className="overdue-indicator"> (Overdue)</span>
          )}
        </div>
      </div>
      
      {onViewDetails && (
        <div className="task-compact-actions">
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={() => onViewDetails(task.TASK_ID)}
          >
            View
          </button>
        </div>
      )}
    </div>
  )
}
