import * as Types from '../types'
import { dateUtils } from './dateUtils'

/**
 * Notification utility functions for formatting, filtering, and calculations
 */

export const notificationUtils = {
  /**
   * Get notification type color class
   */
  getTypeColor: (type: string): string => {
    switch (type) {
      case 'task_assigned': return 'notification-task-assigned'
      case 'task_completed': return 'notification-task-completed'
      case 'task_overdue': return 'notification-task-overdue'
      case 'feedback_received': return 'notification-feedback-received'
      case 'document_approved': return 'notification-document-approved'
      case 'document_rejected': return 'notification-document-rejected'
      case 'revision_required': return 'notification-revision-required'
      case 'document_forwarded': return 'notification-document-forwarded'
      case 'reminder': return 'notification-reminder'
      case 'system_alert': return 'notification-system-alert'
      default: return 'notification-default'
    }
  },

  /**
   * Get notification type icon
   */
  getTypeIcon: (type: string): string => {
    switch (type) {
      case 'task_assigned': return '📋'
      case 'task_completed': return '✅'
      case 'task_overdue': return '⚠️'
      case 'feedback_received': return '💬'
      case 'document_approved': return '✅'
      case 'document_rejected': return '❌'
      case 'revision_required': return '🔄'
      case 'document_forwarded': return '📤'
      case 'reminder': return '⏰'
      case 'system_alert': return '🚨'
      default: return '📢'
    }
  },

  /**
   * Get notification priority based on type
   */
  getPriority: (type: string): 'low' | 'medium' | 'high' => {
    switch (type) {
      case 'task_overdue':
      case 'system_alert':
      case 'document_rejected':
        return 'high'
      case 'task_assigned':
      case 'feedback_received':
      case 'revision_required':
        return 'medium'
      default:
        return 'low'
    }
  },

  /**
   * Get notification display name
   */
  getDisplayName: (type: string): string => {
    switch (type) {
      case 'task_assigned': return 'Task Assigned'
      case 'task_completed': return 'Task Completed'
      case 'task_overdue': return 'Task Overdue'
      case 'feedback_received': return 'Feedback Received'
      case 'document_approved': return 'Document Approved'
      case 'document_rejected': return 'Document Rejected'
      case 'revision_required': return 'Revision Required'
      case 'document_forwarded': return 'Document Forwarded'
      case 'reminder': return 'Reminder'
      case 'system_alert': return 'System Alert'
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  },

  /**
   * Filter notifications by type
   */
  filterByType: (notifications: Types.TaskNotificationWithDetails[], type: string): Types.TaskNotificationWithDetails[] => {
    return notifications.filter(notification => notification.TYPE === type)
  },

  /**
   * Filter unread notifications
   */
  filterUnread: (notifications: Types.TaskNotificationWithDetails[]): Types.TaskNotificationWithDetails[] => {
    return notifications.filter(notification => !notification.READ)
  },

  /**
   * Filter read notifications
   */
  filterRead: (notifications: Types.TaskNotificationWithDetails[]): Types.TaskNotificationWithDetails[] => {
    return notifications.filter(notification => notification.READ)
  },

  /**
   * Filter notifications by priority
   */
  filterByPriority: (notifications: Types.TaskNotificationWithDetails[], priority: 'low' | 'medium' | 'high'): Types.TaskNotificationWithDetails[] => {
    return notifications.filter(notification => notificationUtils.getPriority(notification.TYPE) === priority)
  },

  /**
   * Filter recent notifications (within specified hours)
   */
  filterRecent: (notifications: Types.TaskNotificationWithDetails[], hours: number = 24): Types.TaskNotificationWithDetails[] => {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    return notifications.filter(notification => new Date(notification.CREATED_AT) > cutoffTime)
  },

  /**
   * Filter notifications related to a specific task
   */
  filterByTask: (notifications: Types.TaskNotificationWithDetails[], taskId: number): Types.TaskNotificationWithDetails[] => {
    return notifications.filter(notification => notification.RELATED_TASK_ID === taskId)
  },

  /**
   * Sort notifications by creation date (newest first)
   */
  sortByDate: (notifications: Types.TaskNotificationWithDetails[], ascending: boolean = false): Types.TaskNotificationWithDetails[] => {
    return [...notifications].sort((a, b) => {
      const dateA = new Date(a.CREATED_AT).getTime()
      const dateB = new Date(b.CREATED_AT).getTime()
      return ascending ? dateA - dateB : dateB - dateA
    })
  },

  /**
   * Sort notifications by priority and date
   */
  sortByPriority: (notifications: Types.TaskNotificationWithDetails[]): Types.TaskNotificationWithDetails[] => {
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 }
    return [...notifications].sort((a, b) => {
      const priorityA = priorityOrder[notificationUtils.getPriority(a.TYPE)]
      const priorityB = priorityOrder[notificationUtils.getPriority(b.TYPE)]
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      
      // If same priority, sort by date (newest first)
      return new Date(b.CREATED_AT).getTime() - new Date(a.CREATED_AT).getTime()
    })
  },

  /**
   * Get notification statistics
   */
  getStatistics: (notifications: Types.TaskNotificationWithDetails[]): {
    total: number
    unread: number
    read: number
    byType: Record<string, number>
    byPriority: Record<string, number>
    recent: number
  } => {
    const unread = notificationUtils.filterUnread(notifications).length
    const read = notificationUtils.filterRead(notifications).length
    const recent = notificationUtils.filterRecent(notifications).length
    
    const byType: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    
    notifications.forEach(notification => {
      byType[notification.TYPE] = (byType[notification.TYPE] || 0) + 1
      const priority = notificationUtils.getPriority(notification.TYPE)
      byPriority[priority] = (byPriority[priority] || 0) + 1
    })

    return {
      total: notifications.length,
      unread,
      read,
      byType,
      byPriority,
      recent
    }
  },

  /**
   * Group notifications by type
   */
  groupByType: (notifications: Types.TaskNotificationWithDetails[]): Record<string, Types.TaskNotificationWithDetails[]> => {
    return notifications.reduce((acc, notification) => {
      if (!acc[notification.TYPE]) {
        acc[notification.TYPE] = []
      }
      acc[notification.TYPE].push(notification)
      return acc
    }, {} as Record<string, Types.TaskNotificationWithDetails[]>)
  },

  /**
   * Group notifications by date
   */
  groupByDate: (notifications: Types.TaskNotificationWithDetails[]): Record<string, Types.TaskNotificationWithDetails[]> => {
    return notifications.reduce((acc, notification) => {
      const date = dateUtils.formatDate(notification.CREATED_AT)
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(notification)
      return acc
    }, {} as Record<string, Types.TaskNotificationWithDetails[]>)
  },

  /**
   * Search notifications by title or message
   */
  searchNotifications: (notifications: Types.TaskNotificationWithDetails[], query: string): Types.TaskNotificationWithDetails[] => {
    const lowercaseQuery = query.toLowerCase()
    return notifications.filter(notification => 
      notification.TITLE.toLowerCase().includes(lowercaseQuery) ||
      notification.MESSAGE.toLowerCase().includes(lowercaseQuery)
    )
  },

  /**
   * Get notification summary for dashboard
   */
  getSummary: (notifications: Types.TaskNotificationWithDetails[]): {
    totalCount: number
    unreadCount: number
    highPriorityCount: number
    recentCount: number
    overdueTasksCount: number
    pendingApprovalsCount: number
  } => {
    const stats = notificationUtils.getStatistics(notifications)
    const overdueTasksCount = notificationUtils.filterByType(notifications, 'task_overdue').length
    const pendingApprovalsCount = notificationUtils.filterByType(notifications, 'document_forwarded').length

    return {
      totalCount: stats.total,
      unreadCount: stats.unread,
      highPriorityCount: stats.byPriority.high || 0,
      recentCount: stats.recent,
      overdueTasksCount,
      pendingApprovalsCount
    }
  },

  /**
   * Format notification for display
   */
  formatNotification: (notification: Types.TaskNotificationWithDetails): {
    id: number
    type: string
    title: string
    message: string
    icon: string
    priority: string
    isRead: boolean
    createdAt: string
    relativeTime: string
    actionUrl?: string
  } => {
    return {
      id: notification.NOTIFICATION_ID,
      type: notification.TYPE,
      title: notification.TITLE,
      message: notification.MESSAGE,
      icon: notificationUtils.getTypeIcon(notification.TYPE),
      priority: notificationUtils.getPriority(notification.TYPE),
      isRead: notification.READ,
      createdAt: notification.CREATED_AT,
      relativeTime: dateUtils.formatRelativeTime(notification.CREATED_AT),
      actionUrl: notification.ACTION_URL
    }
  },

  /**
   * Check if notification is actionable
   */
  isActionable: (notification: Types.TaskNotificationWithDetails): boolean => {
    const actionableTypes = [
      'task_assigned',
      'task_overdue',
      'feedback_received',
      'revision_required',
      'document_forwarded'
    ]
    return actionableTypes.includes(notification.TYPE) || !!notification.ACTION_URL
  },

  /**
   * Get notification age in hours
   */
  getAgeInHours: (notification: Types.TaskNotificationWithDetails): number => {
    const now = new Date()
    const createdAt = new Date(notification.CREATED_AT)
    return Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
  },

  /**
   * Check if notification is stale (older than specified hours)
   */
  isStale: (notification: Types.TaskNotificationWithDetails[], hours: number = 168): boolean => { // 7 days default
    return notificationUtils.getAgeInHours(notification[0]) > hours
  },

  /**
   * Create notification summary text
   */
  createSummaryText: (notifications: Types.TaskNotificationWithDetails[]): string => {
    const stats = notificationUtils.getStatistics(notifications)
    
    if (stats.total === 0) {
      return 'No notifications'
    }
    
    const parts = []
    if (stats.unread > 0) {
      parts.push(`${stats.unread} unread`)
    }
    if (stats.recent > 0) {
      parts.push(`${stats.recent} recent`)
    }
    if (stats.byPriority.high > 0) {
      parts.push(`${stats.byPriority.high} high priority`)
    }
    
    return parts.length > 0 ? parts.join(', ') : `${stats.total} notifications`
  }
}
