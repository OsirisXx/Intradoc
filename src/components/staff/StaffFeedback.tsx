import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import * as Types from '../../types'

export function StaffFeedback() {
  const { user } = useAuth()
  const [feedbacks, setFeedbacks] = useState<Types.TaskFeedbackWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<'none' | 'type' | 'author'>('none')

  useEffect(() => {
    if (user) {
      loadFeedbacks()
    }
  }, [user])

  const loadFeedbacks = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const response = await apiService.getFeedbacks(user.USER_ID)
      if (response.success) {
        setFeedbacks(response.data || [])
      }
    } catch (error) {
      console.error('Error loading feedbacks:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (feedbackId: number) => {
    try {
      const response = await apiService.markFeedbackAsRead(feedbackId)
      if (response.success) {
        setFeedbacks(prev => 
          prev.map(feedback => 
            feedback.FEEDBACK_ID === feedbackId 
              ? { ...feedback, READ: true }
              : feedback
          )
        )
      }
    } catch (error) {
      console.error('Error marking feedback as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadFeedbacks = feedbacks.filter(f => !f.READ)
      await Promise.all(
        unreadFeedbacks.map(feedback => apiService.markFeedbackAsRead(feedback.FEEDBACK_ID))
      )
      setFeedbacks(prev => 
        prev.map(feedback => ({ ...feedback, READ: true }))
      )
    } catch (error) {
      console.error('Error marking all feedbacks as read:', error)
    }
  }

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesReadFilter = filter === 'all' || (filter === 'unread' && !feedback.READ)
    const matchesTypeFilter = typeFilter === 'all' || feedback.TYPE === typeFilter
    return matchesReadFilter && matchesTypeFilter
  })

  const groupedFeedbacks = groupBy === 'none' ? filteredFeedbacks : 
    groupBy === 'type' ? 
      filteredFeedbacks.reduce((groups, feedback) => {
        const type = feedback.TYPE
        if (!groups[type]) groups[type] = []
        groups[type].push(feedback)
        return groups
      }, {} as Record<string, Types.TaskFeedbackWithDetails[]>) :
      filteredFeedbacks.reduce((groups, feedback) => {
        const author = feedback.author?.NAME || 'Unknown'
        if (!groups[author]) groups[author] = []
        groups[author].push(feedback)
        return groups
      }, {} as Record<string, Types.TaskFeedbackWithDetails[]>)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFeedbackIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'positive':
        return '👍'
      case 'constructive':
        return '💡'
      case 'action_required':
        return '⚠️'
      case 'question':
        return '❓'
      default:
        return '💬'
    }
  }

  const getFeedbackColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'positive':
        return '#10b981'
      case 'constructive':
        return '#3b82f6'
      case 'action_required':
        return '#f59e0b'
      case 'question':
        return '#8b5cf6'
      default:
        return '#6b7280'
    }
  }

  const unreadCount = feedbacks.filter(f => !f.READ).length

  return (
    <div className="feedback-page">
      <div className="page-banner">
        <h1>FEEDBACK</h1>
        {unreadCount > 0 && (
          <span style={{ 
            background: '#dc2626', 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: '12px', 
            fontSize: '12px',
            marginLeft: '12px'
          }}>
            {unreadCount} UNREAD
          </span>
        )}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className={`tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
              style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              ALL ({feedbacks.length})
            </button>
            <button
              className={`tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
              style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              UNREAD ({unreadCount})
            </button>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                background: '#019831',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Mark All Read
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', color: '#64748b' }}>Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="all">All Types</option>
              <option value="positive">Positive</option>
              <option value="constructive">Constructive</option>
              <option value="action_required">Action Required</option>
              <option value="question">Question</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', color: '#64748b' }}>Group by:</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'none' | 'type' | 'author')}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="none">None</option>
              <option value="type">Type</option>
              <option value="author">Author</option>
            </select>
          </div>
        </div>
      </div>

      <div className="feedback-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            Loading feedback...
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            {filter === 'unread' ? 'No unread feedback' : 'No feedback received yet'}
          </div>
        ) : groupBy === 'none' ? (
          <div className="feedback-list">
            {filteredFeedbacks.map(feedback => (
              <div
                key={feedback.FEEDBACK_ID}
                className={`feedback-item ${!feedback.READ ? 'unread' : ''}`}
                style={{
                  background: feedback.READ ? '#ffffff' : '#f8fafc',
                  border: `1px solid ${feedback.READ ? '#e2e8f0' : getFeedbackColor(feedback.TYPE)}`,
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => !feedback.READ && markAsRead(feedback.FEEDBACK_ID)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ fontSize: '24px', marginTop: '4px' }}>
                    {getFeedbackIcon(feedback.TYPE)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ 
                          margin: 0, 
                          fontSize: '16px', 
                          color: feedback.READ ? '#64748b' : '#1e293b',
                          fontWeight: feedback.READ ? '500' : '600'
                        }}>
                          {feedback.TYPE.replace(/_/g, ' ').toUpperCase()}
                        </h3>
                        <span style={{
                          background: getFeedbackColor(feedback.TYPE),
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {feedback.TYPE.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                          {formatDate(feedback.CREATED_AT)}
                        </span>
                        {!feedback.READ && (
                          <div style={{
                            width: '8px',
                            height: '8px',
                            background: '#019831',
                            borderRadius: '50%'
                          }} />
                        )}
                      </div>
                    </div>
                    
                    <p style={{ 
                      margin: 0, 
                      fontSize: '14px', 
                      color: '#374151',
                      lineHeight: '1.5'
                    }}>
                      {feedback.CONTENT}
                    </p>

                    <div style={{ 
                      marginTop: '12px', 
                      fontSize: '12px', 
                      color: '#64748b'
                    }}>
                      <strong>From:</strong> {feedback.author?.NAME || 'Unknown'}
                      {feedback.author?.FUNCTIONAL_ROLE && (
                        <span style={{ marginLeft: '8px' }}>
                          ({feedback.author.FUNCTIONAL_ROLE.replace(/_/g, ' ')})
                        </span>
                      )}
                    </div>

                    {feedback.RELATED_TASK_ID && (
                      <div style={{ 
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#64748b',
                          background: '#f1f5f9',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          flex: 1
                        }}>
                          <strong>Task:</strong> {feedback.relatedTask?.TITLE || 'Unknown Task'}
                          {feedback.relatedTask?.DESCRIPTION && (
                            <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.8 }}>
                              {feedback.relatedTask.DESCRIPTION.length > 60 
                                ? `${feedback.relatedTask.DESCRIPTION.substring(0, 60)}...` 
                                : feedback.relatedTask.DESCRIPTION}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = '/staff/tasks'
                          }}
                          style={{
                            background: '#019831',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          View Task
                        </button>
                      </div>
                    )}

                    {feedback.RELATED_DOCUMENT_ID && (
                      <div style={{ 
                        marginTop: '8px', 
                        fontSize: '12px', 
                        color: '#64748b',
                        background: '#f1f5f9',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        display: 'inline-block'
                      }}>
                        Document ID: {feedback.RELATED_DOCUMENT_ID}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="feedback-list-grouped">
            {Object.entries(groupedFeedbacks).map(([groupKey, groupFeedbacks]) => (
              <div key={groupKey} className="feedback-group">
                <div className="group-header" style={{
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '16px', 
                    color: '#374151',
                    fontWeight: '600'
                  }}>
                    {groupBy === 'type' ? groupKey.replace(/_/g, ' ').toUpperCase() : groupKey}
                    <span style={{ 
                      marginLeft: '8px', 
                      fontSize: '14px', 
                      color: '#6b7280',
                      fontWeight: 'normal'
                    }}>
                      ({groupFeedbacks.length} feedback{groupFeedbacks.length !== 1 ? 's' : ''})
                    </span>
                  </h3>
                </div>
                <div className="group-feedbacks">
                  {groupFeedbacks.map(feedback => (
                    <div
                      key={feedback.FEEDBACK_ID}
                      className={`feedback-item ${!feedback.READ ? 'unread' : ''}`}
                      style={{
                        background: feedback.READ ? '#ffffff' : '#f8fafc',
                        border: `1px solid ${feedback.READ ? '#e2e8f0' : getFeedbackColor(feedback.TYPE)}`,
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => !feedback.READ && markAsRead(feedback.FEEDBACK_ID)}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ fontSize: '24px', marginTop: '4px' }}>
                          {getFeedbackIcon(feedback.TYPE)}
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <h4 style={{ 
                                margin: 0, 
                                fontSize: '15px', 
                                color: feedback.READ ? '#64748b' : '#1e293b',
                                fontWeight: feedback.READ ? '500' : '600'
                              }}>
                                {feedback.TYPE.replace(/_/g, ' ').toUpperCase()}
                              </h4>
                              <span style={{
                                background: getFeedbackColor(feedback.TYPE),
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                {feedback.TYPE.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                {formatDate(feedback.CREATED_AT)}
                              </span>
                              {!feedback.READ && (
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  background: '#019831',
                                  borderRadius: '50%'
                                }} />
                              )}
                            </div>
                          </div>
                          
                          <p style={{ 
                            margin: 0, 
                            fontSize: '14px', 
                            color: '#374151',
                            lineHeight: '1.5'
                          }}>
                            {feedback.CONTENT}
                          </p>

                          <div style={{ 
                            marginTop: '12px', 
                            fontSize: '12px', 
                            color: '#64748b'
                          }}>
                            <strong>From:</strong> {feedback.author?.NAME || 'Unknown'}
                            {feedback.author?.FUNCTIONAL_ROLE && (
                              <span style={{ marginLeft: '8px' }}>
                                ({feedback.author.FUNCTIONAL_ROLE.replace(/_/g, ' ')})
                              </span>
                            )}
                          </div>

                          {feedback.RELATED_TASK_ID && (
                            <div style={{ 
                              marginTop: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              flexWrap: 'wrap'
                            }}>
                              <div style={{ 
                                fontSize: '12px', 
                                color: '#64748b',
                                background: '#f1f5f9',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                flex: 1
                              }}>
                                <strong>Task:</strong> {feedback.relatedTask?.TITLE || 'Unknown Task'}
                                {feedback.relatedTask?.DESCRIPTION && (
                                  <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.8 }}>
                                    {feedback.relatedTask.DESCRIPTION.length > 60 
                                      ? `${feedback.relatedTask.DESCRIPTION.substring(0, 60)}...` 
                                      : feedback.relatedTask.DESCRIPTION}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.location.href = '/staff/tasks'
                                }}
                                style={{
                                  background: '#019831',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                View Task
                              </button>
                            </div>
                          )}

                          {feedback.RELATED_DOCUMENT_ID && (
                            <div style={{ 
                              marginTop: '8px', 
                              fontSize: '12px', 
                              color: '#64748b',
                              background: '#f1f5f9',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              display: 'inline-block'
                            }}>
                              Document ID: {feedback.RELATED_DOCUMENT_ID}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}