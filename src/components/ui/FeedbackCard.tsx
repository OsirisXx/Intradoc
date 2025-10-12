import React from 'react'
import { Badge } from './Badge'
import * as Types from '../../types'

interface FeedbackCardProps {
  feedback: Types.TaskFeedbackWithDetails
  showAuthor?: boolean
  showRelatedItem?: boolean
  showTimestamp?: boolean
  onMarkAsRead?: (feedbackId: number) => void
  onReply?: (feedbackId: number) => void
  className?: string
}

export function FeedbackCard({
  feedback,
  showAuthor = true,
  showRelatedItem = true,
  showTimestamp = true,
  onMarkAsRead,
  onReply,
  className = ''
}: FeedbackCardProps) {
  
  const getFeedbackTypeColor = (type: string) => {
    switch (type) {
      case 'positive': return 'feedback-positive'
      case 'constructive': return 'feedback-constructive'
      case 'action_required': return 'feedback-action-required'
      case 'question': return 'feedback-question'
      default: return 'feedback-neutral'
    }
  }

  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case 'positive': return '✅'
      case 'constructive': return '💡'
      case 'action_required': return '⚠️'
      case 'question': return '❓'
      default: return '💬'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleMarkAsRead = () => {
    if (onMarkAsRead) {
      onMarkAsRead(feedback.FEEDBACK_ID)
    }
  }

  const handleReply = () => {
    if (onReply) {
      onReply(feedback.FEEDBACK_ID)
    }
  }

  return (
    <div className={`feedback-card ${className} ${!feedback.READ ? 'feedback-unread' : ''}`}>
      <div className="feedback-header">
        <div className="feedback-type-section">
          <span className="feedback-icon">{getFeedbackTypeIcon(feedback.TYPE)}</span>
          <Badge className={`badge ${getFeedbackTypeColor(feedback.TYPE)}`}>
            {feedback.TYPE.replace('_', ' ').toUpperCase()}
          </Badge>
          {!feedback.READ && (
            <Badge className="badge badge-new">NEW</Badge>
          )}
        </div>
        
        {showTimestamp && (
          <div className="feedback-timestamp">
            {formatDate(feedback.CREATED_AT)}
          </div>
        )}
      </div>

      <div className="feedback-content">
        <p className="feedback-message">{feedback.CONTENT}</p>

        {showAuthor && (
          <div className="feedback-author">
            <span className="author-label">From:</span>
            <span className="author-name">{feedback.author.NAME}</span>
            <span className="author-role">({feedback.author.FUNCTIONAL_ROLE.replace('_', ' ')})</span>
          </div>
        )}

        {showRelatedItem && feedback.relatedTask && (
          <div className="feedback-related">
            <span className="related-label">Related Task:</span>
            <span className="related-title">{feedback.relatedTask.TITLE}</span>
          </div>
        )}
      </div>

      <div className="feedback-actions">
        {!feedback.READ && (
          <button 
            className="btn btn-sm btn-primary"
            onClick={handleMarkAsRead}
          >
            Mark as Read
          </button>
        )}
        
        {onReply && (
          <button 
            className="btn btn-sm btn-secondary"
            onClick={handleReply}
          >
            Reply
          </button>
        )}

        {feedback.TYPE === 'action_required' && feedback.relatedTask && (
          <button 
            className="btn btn-sm btn-warning"
            onClick={() => {
              // Navigate to related task or document
              if (feedback.relatedTask) {
                window.location.href = '/staff/tasks'
              }
            }}
          >
            View Task
          </button>
        )}
      </div>
    </div>
  )
}

// Compact version for lists
export function FeedbackCardCompact({ feedback, onMarkAsRead, className = '' }: {
  feedback: Types.TaskFeedbackWithDetails
  onMarkAsRead?: (feedbackId: number) => void
  className?: string
}) {
  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case 'positive': return '✅'
      case 'constructive': return '💡'
      case 'action_required': return '⚠️'
      case 'question': return '❓'
      default: return '💬'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className={`feedback-card-compact ${className} ${!feedback.READ ? 'feedback-unread' : ''}`}>
      <div className="feedback-compact-header">
        <span className="feedback-icon">{getFeedbackTypeIcon(feedback.TYPE)}</span>
        <h6 className="feedback-compact-title">{feedback.TYPE.replace('_', ' ')}</h6>
        {!feedback.READ && (
          <Badge className="badge badge-new">NEW</Badge>
        )}
      </div>
      
      <div className="feedback-compact-content">
        <p className="feedback-compact-message">{feedback.CONTENT}</p>
        <div className="feedback-compact-meta">
          <span>From: {feedback.author.NAME}</span>
          <span>•</span>
          <span>{formatDate(feedback.CREATED_AT)}</span>
        </div>
      </div>
      
      {!feedback.READ && onMarkAsRead && (
        <div className="feedback-compact-actions">
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={() => onMarkAsRead(feedback.FEEDBACK_ID)}
          >
            Mark Read
          </button>
        </div>
      )}
    </div>
  )
}

// Feedback summary for dashboards
export function FeedbackSummary({ feedbacks }: { feedbacks: Types.TaskFeedbackWithDetails[] }) {
  const unreadCount = feedbacks.filter(f => !f.READ).length
  const typeCounts = feedbacks.reduce((acc, feedback) => {
    acc[feedback.TYPE] = (acc[feedback.TYPE] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const recentCount = feedbacks.filter(f => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return new Date(f.CREATED_AT) > oneDayAgo
  }).length

  return (
    <div className="feedback-summary">
      <div className="feedback-summary-header">
        <h4>Feedback Summary</h4>
        <Badge className="badge badge-info">{feedbacks.length} Total</Badge>
      </div>
      
      <div className="feedback-summary-stats">
        <div className="stat-item">
          <span className="stat-label">Unread:</span>
          <span className="stat-value">{unreadCount}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Recent (24h):</span>
          <span className="stat-value">{recentCount}</span>
        </div>
      </div>
      
      <div className="feedback-summary-types">
        {Object.entries(typeCounts).map(([type, count]) => (
          <div key={type} className="type-item">
            <span className="type-label">{type.replace('_', ' ')}:</span>
            <span className="type-value">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
