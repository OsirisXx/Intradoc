import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import * as Types from '../../types';
import './SectionUnitHead.css';

const SectionUnitHeadNotifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Types.TaskNotificationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and view modes
  const [filter, setFilter] = useState('all'); // all, unread
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'type' | 'date'>('none');
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getNotifications(user?.USER_ID || 0);
      if (response.success) {
        setNotifications(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.error || 'Failed to load notifications');
        setNotifications([]);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => prev.map(notification => 
        notification.NOTIFICATION_ID === notificationId 
          ? { ...notification, IS_READ: true }
          : notification
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.IS_READ);
      
      for (const notification of unreadNotifications) {
        await apiService.markNotificationAsRead(notification.NOTIFICATION_ID);
      }
      
      // Update local state
      setNotifications(prev => prev.map(notification => 
        ({ ...notification, IS_READ: true })
      ));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconMap: { [key: string]: string } = {
      task_assigned: '📋',
      task_completed: '✅',
      document_approved: '📄',
      document_rejected: '❌',
      revision_required: '🔄',
      document_resubmitted: '📤',
      feedback_received: '💬',
      deadline_approaching: '⏰',
      deadline_overdue: '🚨',
      system_announcement: '📢',
      section_update: '📊'
    };
    return iconMap[type] || '🔔';
  };

  const getNotificationColor = (type: string) => {
    const colorMap: { [key: string]: string } = {
      task_assigned: '#3b82f6',
      task_completed: '#10b981',
      document_approved: '#10b981',
      document_rejected: '#ef4444',
      revision_required: '#f59e0b',
      document_resubmitted: '#8b5cf6',
      feedback_received: '#06b6d4',
      deadline_approaching: '#f59e0b',
      deadline_overdue: '#ef4444',
      system_announcement: '#6366f1',
      section_update: '#3b82f6'
    };
    return colorMap[type] || '#6b7280';
  };

  const getNotificationTypeLabel = (type: string) => {
    const labelMap: { [key: string]: string } = {
      task_assigned: 'New Task',
      task_completed: 'Task Done',
      document_approved: 'Document OK',
      document_rejected: 'Needs Fix',
      revision_required: 'Revise Doc',
      document_resubmitted: 'Doc Updated',
      feedback_received: 'Feedback',
      deadline_approaching: 'Due Soon',
      deadline_overdue: 'Overdue',
      system_announcement: 'Announcement',
      section_update: 'Update'
    };
    return labelMap[type] || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const notificationDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  // Enhanced filtering and grouping
  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = filter === 'all' || (filter === 'unread' && !notification.IS_READ);
    const matchesType = typeFilter === 'all' || notification.TYPE === typeFilter;
    const matchesSearch = searchTerm === '' || 
      notification.TITLE.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.MESSAGE.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesType && matchesSearch;
  });

  const groupedNotifications = () => {
    if (groupBy === 'type') {
      const grouped: { [key: string]: any[] } = {};
      filteredNotifications.forEach(notification => {
        if (!grouped[notification.TYPE]) {
          grouped[notification.TYPE] = [];
        }
        grouped[notification.TYPE].push(notification);
      });
      return grouped;
    } else if (groupBy === 'date') {
      const grouped: { [key: string]: any[] } = {};
      filteredNotifications.forEach(notification => {
        const date = new Date(notification.CREATED_AT).toDateString();
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(notification);
      });
      return grouped;
    }
    return { 'All Notifications': filteredNotifications };
  };

  const unreadCount = notifications.filter(n => !n.IS_READ).length;
  const taskNotifications = notifications.filter(n => n.TYPE.includes('task')).length;
  const documentNotifications = notifications.filter(n => n.TYPE.includes('document')).length;
  const urgentNotifications = notifications.filter(n => ['deadline_overdue', 'system_announcement'].includes(n.TYPE)).length;

  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="section-unit-head-notifications">
        <div className="page-header">
          <div className="header-gradient">
            <div className="header-content">
              <div className="header-icon">🔔</div>
              <div className="header-text">
                <h1>Notifications</h1>
                <p>Stay updated with important alerts and updates</p>
              </div>
            </div>
          </div>
        </div>
        <div className="loading">Loading notifications...</div>
      </div>
    );
  }

  const grouped = groupedNotifications();

  return (
    <div className="section-unit-head-notifications">
      <div className="page-header">
        <div className="header-gradient">
          <div className="header-content">
            <div className="header-icon">🔔</div>
            <div className="header-text">
              <h1>Notifications</h1>
              <p>Stay updated with important alerts and updates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Summary */}
      <div className="notification-summary">
        <div className="summary-grid">
          <div className="summary-card total">
            <div className="card-icon">📊</div>
            <div className="card-content">
              <div className="card-number">{notifications.length}</div>
              <div className="card-label">Total Notifications</div>
              <div className="card-subtitle">All received</div>
            </div>
          </div>
          
          <div className="summary-card unread">
            <div className="card-icon">🔴</div>
            <div className="card-content">
              <div className="card-number">{unreadCount}</div>
              <div className="card-label">Unread</div>
              <div className="card-subtitle">
                {unreadCount > 0 ? 'Requires attention' : 'All caught up!'}
              </div>
            </div>
          </div>
          
          <div className="summary-card tasks">
            <div className="card-icon">📋</div>
            <div className="card-content">
              <div className="card-number">{taskNotifications}</div>
              <div className="card-label">Task Related</div>
              <div className="card-subtitle">Task updates and assignments</div>
            </div>
          </div>
          
          <div className="summary-card urgent">
            <div className="card-icon">⚠️</div>
            <div className="card-content">
              <div className="card-number">{urgentNotifications}</div>
              <div className="card-label">Urgent</div>
              <div className="card-subtitle">
                {urgentNotifications > 0 ? 'Needs immediate attention' : 'No urgent items'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="notification-controls">
        <div className="controls-container">
          <div className="search-section">
            <div className="search-input-wrapper">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="filters-row">
            <div className="filter-group">
              <label htmlFor="filter">Status</label>
              <select
                id="filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Notifications</option>
                <option value="unread">Unread Only</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="type-filter">Type</label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Types</option>
                <option value="task_assigned">Task Assigned</option>
                <option value="task_completed">Task Completed</option>
                <option value="document_approved">Document Approved</option>
                <option value="document_rejected">Document Rejected</option>
                <option value="revision_required">Revision Required</option>
                <option value="feedback_received">Feedback Received</option>
                <option value="deadline_approaching">Deadline Approaching</option>
                <option value="deadline_overdue">Deadline Overdue</option>
                <option value="system_announcement">System Announcement</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="group-by">Group by</label>
              <select
                id="group-by"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="filter-select"
              >
                <option value="none">No Grouping</option>
                <option value="type">Type</option>
                <option value="date">Date</option>
              </select>
            </div>

            <div className="view-controls">
              <button
                className={`view-toggle ${viewMode === 'detailed' ? 'active' : ''}`}
                onClick={() => setViewMode('detailed')}
                title="Detailed view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="9" x2="15" y2="9"/>
                  <line x1="9" y1="13" x2="15" y2="13"/>
                  <line x1="9" y1="17" x2="15" y2="17"/>
                </svg>
              </button>
              <button
                className={`view-toggle ${viewMode === 'compact' ? 'active' : ''}`}
                onClick={() => setViewMode('compact')}
                title="Compact view"
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

            {unreadCount > 0 && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  markAllAsRead();
                  showToast('All notifications marked as read');
                }}
              >
                Mark All Read
              </button>
            )}
          </div>

          {/* Quick Filter Chips */}
          <div className="quick-filters">
            <button 
              className={`quick-filter ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter(filter === 'unread' ? 'all' : 'unread')}
            >
              <span className="chip-icon">🔴</span>
              Unread ({unreadCount})
            </button>
            <button 
              className={`quick-filter ${typeFilter === 'task_assigned' ? 'active' : ''}`}
              onClick={() => setTypeFilter(typeFilter === 'task_assigned' ? 'all' : 'task_assigned')}
            >
              <span className="chip-icon">📋</span>
              Task Assigned ({notifications.filter(n => n.TYPE === 'task_assigned').length})
            </button>
            <button 
              className={`quick-filter ${typeFilter === 'feedback_received' ? 'active' : ''}`}
              onClick={() => setTypeFilter(typeFilter === 'feedback_received' ? 'all' : 'feedback_received')}
            >
              <span className="chip-icon">💬</span>
              Feedback ({notifications.filter(n => n.TYPE === 'feedback_received').length})
            </button>
            <button 
              className={`quick-filter ${typeFilter === 'deadline_overdue' ? 'active' : ''}`}
              onClick={() => setTypeFilter(typeFilter === 'deadline_overdue' ? 'all' : 'deadline_overdue')}
            >
              <span className="chip-icon">🚨</span>
              Urgent ({urgentNotifications})
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {error && (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h3>Unable to load notifications</h3>
            <p>{error}</p>
            <button onClick={loadNotifications} className="btn btn-primary">
              Try Again
            </button>
          </div>
        </div>
      )}

      {filteredNotifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <h3>No notifications found</h3>
          <p>
            {searchTerm !== ''
              ? `No notifications match "${searchTerm}"`
              : filter === 'unread' 
              ? 'You have no unread notifications.'
              : typeFilter !== 'all'
              ? 'No notifications of this type.'
              : 'You don\'t have any notifications yet.'
            }
          </p>
          {searchTerm !== '' && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="btn btn-secondary"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="notifications-list">
          {Object.entries(grouped).map(([groupName, groupNotifications]) => (
            <div key={groupName} className="notification-group">
              {groupBy !== 'none' && (
                <div className="group-header">
                  <h3 className="group-title">
                    {groupName}
                  </h3>
                  <span className="group-count">{groupNotifications.length} notifications</span>
                </div>
              )}

              <div className={`notifications-grid ${viewMode}`}>
                {groupNotifications.map(notification => (
                  <div 
                    key={notification.NOTIFICATION_ID} 
                    className={`notification-card ${!notification.IS_READ ? 'unread' : ''} ${viewMode}`}
                    onClick={() => !notification.IS_READ && markAsRead(notification.NOTIFICATION_ID)}
                  >
                    <div className="card-border" style={{ borderLeftColor: getNotificationColor(notification.TYPE) }}></div>
                    
                    <div className="card-header">
                      <div className="notification-type-badge" style={{ backgroundColor: getNotificationColor(notification.TYPE) }}>
                        <span className="type-icon">{getNotificationIcon(notification.TYPE)}</span>
                        <span className="type-label">{getNotificationTypeLabel(notification.TYPE)}</span>
                      </div>
                      
                      {!notification.IS_READ && (
                        <div className="unread-badge">
                          <div className="unread-dot"></div>
                          <span>New</span>
                        </div>
                      )}
                    </div>

                    <div className="card-content">
                      <div className="notification-title">
                        {notification.TITLE}
                      </div>
                      <div className="notification-message">
                        {viewMode === 'compact' ? 
                          notification.MESSAGE.substring(0, 120) + (notification.MESSAGE.length > 120 ? '...' : '') :
                          notification.MESSAGE
                        }
                      </div>
                    </div>

                    <div className="card-footer">
                      <div className="notification-time">
                        <span className="time-relative">{formatRelativeTime(notification.CREATED_AT)}</span>
                        <span className="time-absolute">• {formatDate(notification.CREATED_AT)}</span>
                      </div>

                      <div className="card-actions">
                        {!notification.IS_READ && (
                          <button 
                            className="action-btn success"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.NOTIFICATION_ID);
                              showToast('Marked as read');
                            }}
                            title="Mark as read"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20,6 9,17 4,12"/>
                            </svg>
                            <span className="button-text">Mark as read</span>
                          </button>
                        )}
                        
                        {notification.ACTION_URL && (
                          <button 
                            className="action-btn primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = notification.ACTION_URL;
                            }}
                            title="View details"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                            <span className="button-text">View Details</span>
                          </button>
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
  );
};

export default SectionUnitHeadNotifications;