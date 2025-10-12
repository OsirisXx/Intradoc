/**
 * Utility functions index
 * Export all utility functions for easy importing
 */

export { dateUtils } from './dateUtils'
export { taskUtils } from './taskUtils'
export { notificationUtils } from './notificationUtils'

// Re-export commonly used functions for convenience
export const formatDate = (dateString: string) => dateUtils.formatDate(dateString)
export const formatDateTime = (dateString: string) => dateUtils.formatDateTime(dateString)
export const formatRelativeTime = (dateString: string) => dateUtils.formatRelativeTime(dateString)
export const isOverdue = (dateString: string) => dateUtils.isOverdue(dateString)
export const isDueSoon = (dateString: string, hours?: number) => dateUtils.isDueSoon(dateString, hours)

export const getTaskStatusColor = (status: string) => taskUtils.getStatusColor(status)
export const getTaskPriorityColor = (priority: string) => taskUtils.getPriorityColor(priority)
export const isTaskOverdue = (task: any) => taskUtils.isOverdue(task)
export const sortTasks = (tasks: any[], sortBy?: 'priority' | 'dueDate' | 'status') => taskUtils.sortTasks(tasks, sortBy)

export const getNotificationTypeIcon = (type: string) => notificationUtils.getTypeIcon(type)
export const getNotificationTypeColor = (type: string) => notificationUtils.getTypeColor(type)
export const getNotificationPriority = (type: string) => notificationUtils.getPriority(type)
export const filterUnreadNotifications = (notifications: any[]) => notificationUtils.filterUnread(notifications)
