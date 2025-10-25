import { apiService } from './api'
import { NotificationService } from './NotificationService'
import * as Types from '../types'

export class ReminderService {
  private static instance: ReminderService
  private notificationService: NotificationService
  private reminderIntervals: Map<number, number> = new Map()
  private checkedTasks: Set<number> = new Set()
  private readonly REMINDER_CHECK_INTERVAL = 60000 // 1 minute
  private readonly DUE_SOON_HOURS = 24 // 24 hours before due date

  private constructor() {
    this.notificationService = NotificationService.getInstance()
  }

  static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService()
    }
    return ReminderService.instance
  }

  /**
   * Start reminder checking for a user
   */
  startReminderChecking(userId: number): void {
    // Clear existing interval if any
    this.stopReminderChecking(userId)

    // Start checking for due dates
    const interval = setInterval(async () => {
      await this.checkDueDates(userId)
    }, this.REMINDER_CHECK_INTERVAL)

    this.reminderIntervals.set(userId, interval)

    // Initial check
    this.checkDueDates(userId)
  }

  /**
   * Stop reminder checking for a user
   */
  stopReminderChecking(userId: number): void {
    const interval = this.reminderIntervals.get(userId)
    if (interval) {
      clearInterval(interval)
      this.reminderIntervals.delete(userId)
    }
  }

  /**
   * Check due dates for tasks and send reminders
   */
  async checkDueDates(userId: number): Promise<void> {
    try {
      // Get user's tasks
      const tasksResponse = await apiService.getTasksAssignedTo(userId)
      if (!tasksResponse.success || !tasksResponse.data) {
        return
      }

      const tasks = tasksResponse.data
      const now = new Date()

      for (const task of tasks) {
        // Skip if task is completed or already checked recently
        if (task.STATUS === 'completed' || this.checkedTasks.has(task.TASK_ID)) {
          continue
        }

        const dueDate = new Date(task.DUE_DATE)
        const timeUntilDue = dueDate.getTime() - now.getTime()
        const hoursUntilDue = timeUntilDue / (1000 * 60 * 60)

        // Check if task is overdue
        if (timeUntilDue < 0) {
          await this.handleOverdueTask(task, userId)
        }
        // Check if task is due soon (within 24 hours)
        else if (hoursUntilDue <= this.DUE_SOON_HOURS && hoursUntilDue > 0) {
          await this.handleDueSoonTask(task, userId, hoursUntilDue)
        }
        // Check if task is due very soon (within 1 hour)
        else if (hoursUntilDue <= 1 && hoursUntilDue > 0) {
          await this.handleDueVerySoonTask(task, userId, hoursUntilDue)
        }
      }
    } catch (error) {
      console.error('Error checking due dates:', error)
    }
  }

  /**
   * Handle overdue task
   */
  private async handleOverdueTask(task: Types.TaskWithDetails, userId: number): Promise<void> {
    // Check if we already sent an overdue notification
    const existingNotifications = await this.notificationService.getTaskNotifications(userId, task.TASK_ID)
    const hasOverdueNotification = existingNotifications.some(n => n.TYPE === 'task_overdue')

    if (!hasOverdueNotification) {
      await this.notificationService.createNotification({
        userId: userId,
        type: 'task_overdue',
        title: 'Task Overdue',
        message: `Task "${task.TITLE}" is overdue. Please complete it as soon as possible.`,
        relatedTaskId: task.TASK_ID,
        actionUrl: '/staff/tasks'
      })

      console.log(`Overdue notification sent for task: ${task.TITLE}`)
    }

    // Mark as checked for this session
    this.checkedTasks.add(task.TASK_ID)
  }

  /**
   * Handle task due soon
   */
  private async handleDueSoonTask(task: Types.TaskWithDetails, userId: number, hoursUntilDue: number): Promise<void> {
    // Check if we already sent a due soon notification
    const existingNotifications = await this.notificationService.getTaskNotifications(userId, task.TASK_ID)
    const hasDueSoonNotification = existingNotifications.some(n => n.TYPE === 'reminder' && n.MESSAGE.includes('due soon'))

    if (!hasDueSoonNotification) {
      const hours = Math.floor(hoursUntilDue)
      await this.notificationService.createNotification({
        userId: userId,
        type: 'reminder',
        title: 'Task Due Soon',
        message: `Task "${task.TITLE}" is due in ${hours} hour${hours !== 1 ? 's' : ''}. Please prioritize this task.`,
        relatedTaskId: task.TASK_ID,
        actionUrl: '/staff/tasks'
      })

      console.log(`Due soon notification sent for task: ${task.TITLE}`)
    }

    // Mark as checked for this session
    this.checkedTasks.add(task.TASK_ID)
  }

  /**
   * Handle task due very soon
   */
  private async handleDueVerySoonTask(task: Types.TaskWithDetails, userId: number, hoursUntilDue: number): Promise<void> {
    // Check if we already sent a very soon notification
    const existingNotifications = await this.notificationService.getTaskNotifications(userId, task.TASK_ID)
    const hasVerySoonNotification = existingNotifications.some(n => n.TYPE === 'reminder' && n.MESSAGE.includes('due in less than'))

    if (!hasVerySoonNotification) {
      const minutes = Math.floor(hoursUntilDue * 60)
      await this.notificationService.createNotification({
        userId: userId,
        type: 'reminder',
        title: 'Task Due Very Soon',
        message: `Task "${task.TITLE}" is due in ${minutes} minute${minutes !== 1 ? 's' : ''}. Please complete it immediately.`,
        relatedTaskId: task.TASK_ID,
        actionUrl: '/staff/tasks'
      })

      console.log(`Due very soon notification sent for task: ${task.TITLE}`)
    }

    // Mark as checked for this session
    this.checkedTasks.add(task.TASK_ID)
  }

  /**
   * Check for overdue tasks across all users (for managers)
   */
  async checkOverdueTasksForAllUsers(userId: number): Promise<void> {
    try {
      // This would typically be called by a background service
      // For now, we'll check the current user's tasks
      const response = await apiService.getOverdueTasks(userId)
      if (response.success && response.data) {
        const overdueTasks = response.data
        
        for (const task of overdueTasks) {
          // Notify the assignee
          await this.notificationService.createNotification({
            userId: task.ASSIGNED_TO,
            type: 'task_overdue',
            title: 'Task Overdue',
            message: `Task "${task.TITLE}" is overdue. Please complete it as soon as possible.`,
            relatedTaskId: task.TASK_ID,
            actionUrl: '/staff/tasks'
          })

          // Notify the manager who assigned the task
          await this.notificationService.createNotification({
            userId: task.ASSIGNED_BY,
            type: 'task_overdue',
            title: 'Assigned Task Overdue',
            message: `Task "${task.TITLE}" assigned to ${task.assignedTo.NAME} is overdue.`,
            relatedTaskId: task.TASK_ID,
            actionUrl: '/section-unit-head/task-assignment'
          })
        }
      }
    } catch (error) {
      console.error('Error checking overdue tasks:', error)
    }
  }

  /**
   * Get tasks due soon for a user
   */
  async getTasksDueSoon(userId: number, hours = 24): Promise<Types.TaskWithDetails[]> {
    try {
      const response = await apiService.getTasksAssignedTo(userId)
      if (!response.success || !response.data) {
        return []
      }

      const now = new Date()
      const dueSoonTime = new Date(now.getTime() + hours * 60 * 60 * 1000)

      return response.data.filter(task => {
        if (task.STATUS === 'completed') return false
        
        const dueDate = new Date(task.DUE_DATE)
        return dueDate <= dueSoonTime && dueDate > now
      })
    } catch (error) {
      console.error('Error getting tasks due soon:', error)
      return []
    }
  }

  /**
   * Get overdue tasks for a user
   */
  async getOverdueTasksForUser(userId: number): Promise<Types.TaskWithDetails[]> {
    try {
      const response = await apiService.getTasksAssignedTo(userId)
      if (!response.success || !response.data) {
        return []
      }

      const now = new Date()

      return response.data.filter(task => {
        if (task.STATUS === 'completed') return false
        
        const dueDate = new Date(task.DUE_DATE)
        return dueDate < now
      })
    } catch (error) {
      console.error('Error getting overdue tasks:', error)
      return []
    }
  }

  /**
   * Send custom reminder for a specific task
   */
  async sendCustomReminder(userId: number, taskId: number, message: string): Promise<boolean> {
    try {
      return await this.notificationService.createNotification({
        userId: userId,
        type: 'reminder',
        title: 'Custom Reminder',
        message: message,
        relatedTaskId: taskId,
        actionUrl: '/staff/tasks'
      })
    } catch (error) {
      console.error('Error sending custom reminder:', error)
      return false
    }
  }

  /**
   * Clear checked tasks cache (call this when user logs out or refreshes)
   */
  clearCheckedTasks(): void {
    this.checkedTasks.clear()
  }

  /**
   * Get reminder statistics for a user
   */
  async getReminderStats(userId: number): Promise<{
    totalTasks: number
    overdueTasks: number
    dueSoonTasks: number
    completedTasks: number
    completionRate: number
  }> {
    try {
      const response = await apiService.getTasksAssignedTo(userId)
      if (!response.success || !response.data) {
        return {
          totalTasks: 0,
          overdueTasks: 0,
          dueSoonTasks: 0,
          completedTasks: 0,
          completionRate: 0
        }
      }

      const tasks = response.data
      const now = new Date()
      const dueSoonTime = new Date(now.getTime() + this.DUE_SOON_HOURS * 60 * 60 * 1000)

      const overdueTasks = tasks.filter(task => {
        if (task.STATUS === 'completed') return false
        return new Date(task.DUE_DATE) < now
      })

      const dueSoonTasks = tasks.filter(task => {
        if (task.STATUS === 'completed') return false
        const dueDate = new Date(task.DUE_DATE)
        return dueDate <= dueSoonTime && dueDate > now
      })

      const completedTasks = tasks.filter(task => task.STATUS === 'completed')
      const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0

      return {
        totalTasks: tasks.length,
        overdueTasks: overdueTasks.length,
        dueSoonTasks: dueSoonTasks.length,
        completedTasks: completedTasks.length,
        completionRate: Math.round(completionRate)
      }
    } catch (error) {
      console.error('Error getting reminder stats:', error)
      return {
        totalTasks: 0,
        overdueTasks: 0,
        dueSoonTasks: 0,
        completedTasks: 0,
        completionRate: 0
      }
    }
  }

  /**
   * Cleanup method to stop all reminder checking
   */
  cleanup(): void {
    this.reminderIntervals.forEach(interval => clearInterval(interval))
    this.reminderIntervals.clear()
    this.checkedTasks.clear()
  }
}
