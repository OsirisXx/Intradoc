import { apiService } from './api'
import * as Types from '../types'

export class NotificationService {
  private static instance: NotificationService
  private notificationCache: Map<number, Types.TaskNotificationWithDetails[]> = new Map()
  private unreadCountCache: Map<number, number> = new Map()
  private lastFetchTime: Map<number, number> = new Map()
  private readonly CACHE_DURATION = 30000 // 30 seconds

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Get notifications for a user with caching
   */
  async getNotifications(userId: number, forceRefresh = false): Promise<Types.TaskNotificationWithDetails[]> {
    const now = Date.now()
    const lastFetch = this.lastFetchTime.get(userId) || 0
    
    // Return cached data if not expired and not forcing refresh
    if (!forceRefresh && (now - lastFetch) < this.CACHE_DURATION) {
      const cached = this.notificationCache.get(userId)
      if (cached) {
        return cached
      }
    }

    try {
      const response = await apiService.getNotifications(userId)
      if (response.success && response.data) {
        this.notificationCache.set(userId, response.data)
        this.lastFetchTime.set(userId, now)
        return response.data
      }
      return []
    } catch (error) {
      console.error('Error fetching notifications:', error)
      // Return cached data on error
      return this.notificationCache.get(userId) || []
    }
  }

  /**
   * Get unread notification count with caching
   */
  async getUnreadCount(userId: number, forceRefresh = false): Promise<number> {
    const now = Date.now()
    const lastFetch = this.lastFetchTime.get(userId) || 0
    
    // Return cached count if not expired and not forcing refresh
    if (!forceRefresh && (now - lastFetch) < this.CACHE_DURATION) {
      const cached = this.unreadCountCache.get(userId)
      if (cached !== undefined) {
        return cached
      }
    }

    try {
      const response = await apiService.getUnreadNotifications(userId)
      if (response.success && response.data) {
        const count = response.data.length
        this.unreadCountCache.set(userId, count)
        this.lastFetchTime.set(userId, now)
        return count
      }
      return 0
    } catch (error) {
      console.error('Error fetching unread count:', error)
      // Return cached count on error
      return this.unreadCountCache.get(userId) || 0
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: number, notificationId: number): Promise<boolean> {
    try {
      const response = await apiService.markNotificationAsRead(notificationId)
      if (response.success) {
        // Update cache
        this.invalidateCache(userId)
        return true
      }
      return false
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: number): Promise<boolean> {
    try {
      const response = await apiService.markAllNotificationsAsRead(userId)
      if (response.success) {
        // Update cache
        this.invalidateCache(userId)
        return true
      }
      return false
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(notification: Types.NotificationForm): Promise<boolean> {
    try {
      const response = await apiService.createNotification(notification)
      if (response.success) {
        // Invalidate cache for the recipient
        this.invalidateCache(notification.userId)
        return true
      }
      return false
    } catch (error) {
      console.error('Error creating notification:', error)
      return false
    }
  }

  /**
   * Get notifications by type
   */
  async getNotificationsByType(userId: number, type: string): Promise<Types.TaskNotificationWithDetails[]> {
    const notifications = await this.getNotifications(userId)
    return notifications.filter(notification => notification.TYPE === type)
  }

  /**
   * Get recent notifications (last 24 hours)
   */
  async getRecentNotifications(userId: number): Promise<Types.TaskNotificationWithDetails[]> {
    const notifications = await this.getNotifications(userId)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    return notifications.filter(notification => 
      new Date(notification.CREATED_AT) > oneDayAgo
    )
  }

  /**
   * Get notifications for a specific task
   */
  async getTaskNotifications(userId: number, taskId: number): Promise<Types.TaskNotificationWithDetails[]> {
    const notifications = await this.getNotifications(userId)
    return notifications.filter(notification => 
      notification.RELATED_TASK_ID === taskId
    )
  }

  /**
   * Check if user has any unread notifications
   */
  async hasUnreadNotifications(userId: number): Promise<boolean> {
    const count = await this.getUnreadCount(userId)
    return count > 0
  }

  /**
   * Get notification summary for dashboard
   */
  async getNotificationSummary(userId: number): Promise<{
    total: number
    unread: number
    byType: Record<string, number>
    recent: number
  }> {
    const notifications = await this.getNotifications(userId)
    const unreadCount = await this.getUnreadCount(userId)
    const recentCount = await this.getRecentNotifications(userId).then(recent => recent.length)
    
    const byType: Record<string, number> = {}
    notifications.forEach(notification => {
      byType[notification.TYPE] = (byType[notification.TYPE] || 0) + 1
    })

    return {
      total: notifications.length,
      unread: unreadCount,
      byType,
      recent: recentCount
    }
  }

  /**
   * Clear cache for a specific user
   */
  invalidateCache(userId: number): void {
    this.notificationCache.delete(userId)
    this.unreadCountCache.delete(userId)
    this.lastFetchTime.delete(userId)
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.notificationCache.clear()
    this.unreadCountCache.clear()
    this.lastFetchTime.clear()
  }

  /**
   * Set up real-time notification polling
   */
  startPolling(userId: number, interval = 30000): () => void {
    const pollInterval = setInterval(async () => {
      await this.getNotifications(userId, true) // Force refresh
      await this.getUnreadCount(userId, true) // Force refresh
    }, interval)

    // Return cleanup function
    return () => clearInterval(pollInterval)
  }

  /**
   * Get notification types with their display names
   */
  getNotificationTypeDisplayName(type: string): string {
    const typeMap: Record<string, string> = {
      'task_assigned': 'Task Assigned',
      'task_completed': 'Task Completed',
      'task_overdue': 'Task Overdue',
      'feedback_received': 'Feedback Received',
      'document_approved': 'Document Approved',
      'document_rejected': 'Document Rejected',
      'revision_required': 'Revision Required',
      'document_forwarded': 'Document Forwarded',
      'reminder': 'Reminder',
      'system_alert': 'System Alert'
    }
    
    return typeMap[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  /**
   * Get notification priority based on type
   */
  getNotificationPriority(type: string): 'low' | 'medium' | 'high' {
    const highPriority = ['task_overdue', 'system_alert', 'document_rejected']
    const mediumPriority = ['task_assigned', 'feedback_received', 'revision_required']
    
    if (highPriority.includes(type)) return 'high'
    if (mediumPriority.includes(type)) return 'medium'
    return 'low'
  }

  /**
   * Format notification message for display
   */
  formatNotificationMessage(notification: Types.TaskNotificationWithDetails): string {
    const baseMessage = notification.MESSAGE
    
    // Add action context if available
    if (notification.ACTION_URL) {
      return baseMessage
    }
    
    return baseMessage
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'task_assigned': '📋',
      'task_completed': '✅',
      'task_overdue': '⚠️',
      'feedback_received': '💬',
      'document_approved': '✅',
      'document_rejected': '❌',
      'revision_required': '🔄',
      'document_forwarded': '📤',
      'reminder': '⏰',
      'system_alert': '🚨'
    }
    
    return iconMap[type] || '📢'
  }
}
