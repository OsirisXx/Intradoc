import * as Types from '../types'
import { dateUtils } from './dateUtils'

/**
 * Task utility functions for calculations, filtering, and formatting
 */

export const taskUtils = {
  /**
   * Get task status color class
   */
  getStatusColor: (status: string): string => {
    switch (status) {
      case 'pending': return 'status-pending'
      case 'in_progress': return 'status-in-progress'
      case 'completed': return 'status-completed'
      case 'overdue': return 'status-overdue'
      default: return 'status-pending'
    }
  },

  /**
   * Get task priority color class
   */
  getPriorityColor: (priority: string): string => {
    switch (priority) {
      case 'low': return 'priority-low'
      case 'medium': return 'priority-medium'
      case 'high': return 'priority-high'
      case 'urgent': return 'priority-urgent'
      default: return 'priority-low'
    }
  },

  /**
   * Get task priority weight for sorting
   */
  getPriorityWeight: (priority: string): number => {
    switch (priority) {
      case 'urgent': return 4
      case 'high': return 3
      case 'medium': return 2
      case 'low': return 1
      default: return 0
    }
  },

  /**
   * Check if a task is overdue
   */
  isOverdue: (task: Types.TaskWithDetails): boolean => {
    return task.STATUS !== 'completed' && dateUtils.isOverdue(task.DUE_DATE)
  },

  /**
   * Check if a task is due soon
   */
  isDueSoon: (task: Types.TaskWithDetails, hoursThreshold: number = 24): boolean => {
    return task.STATUS !== 'completed' && dateUtils.isDueSoon(task.DUE_DATE, hoursThreshold)
  },

  /**
   * Get task progress percentage
   */
  getProgressPercentage: (task: Types.TaskWithDetails): number => {
    if (task.STATUS === 'completed') return 100
    if (task.STATUS === 'in_progress') return 50
    if (task.STATUS === 'pending') return 0
    return 0
  },

  /**
   * Get days until due date
   */
  getDaysUntilDue: (task: Types.TaskWithDetails): number => {
    return dateUtils.getDaysUntilDue(task.DUE_DATE)
  },

  /**
   * Get hours until due date
   */
  getHoursUntilDue: (task: Types.TaskWithDetails): number => {
    return dateUtils.getHoursUntilDue(task.DUE_DATE)
  },

  /**
   * Sort tasks by priority and due date
   */
  sortTasks: (tasks: Types.TaskWithDetails[], sortBy: 'priority' | 'dueDate' | 'status' = 'priority'): Types.TaskWithDetails[] => {
    return [...tasks].sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityA = taskUtils.getPriorityWeight(a.PRIORITY)
          const priorityB = taskUtils.getPriorityWeight(b.PRIORITY)
          if (priorityA !== priorityB) {
            return priorityB - priorityA // Higher priority first
          }
          // If same priority, sort by due date
          return new Date(a.DUE_DATE).getTime() - new Date(b.DUE_DATE).getTime()
        
        case 'dueDate':
          return new Date(a.DUE_DATE).getTime() - new Date(b.DUE_DATE).getTime()
        
        case 'status':
          const statusOrder = { 'overdue': 0, 'pending': 1, 'in_progress': 2, 'completed': 3 }
          const statusA = statusOrder[a.STATUS as keyof typeof statusOrder] ?? 4
          const statusB = statusOrder[b.STATUS as keyof typeof statusOrder] ?? 4
          return statusA - statusB
        
        default:
          return 0
      }
    })
  },

  /**
   * Filter tasks by status
   */
  filterByStatus: (tasks: Types.TaskWithDetails[], status: string): Types.TaskWithDetails[] => {
    return tasks.filter(task => task.STATUS === status)
  },

  /**
   * Filter tasks by priority
   */
  filterByPriority: (tasks: Types.TaskWithDetails[], priority: string): Types.TaskWithDetails[] => {
    return tasks.filter(task => task.PRIORITY === priority)
  },

  /**
   * Filter overdue tasks
   */
  filterOverdue: (tasks: Types.TaskWithDetails[]): Types.TaskWithDetails[] => {
    return tasks.filter(task => taskUtils.isOverdue(task))
  },

  /**
   * Filter tasks due soon
   */
  filterDueSoon: (tasks: Types.TaskWithDetails[], hoursThreshold: number = 24): Types.TaskWithDetails[] => {
    return tasks.filter(task => taskUtils.isDueSoon(task, hoursThreshold))
  },

  /**
   * Filter tasks by section
   */
  filterBySection: (tasks: Types.TaskWithDetails[], sectionId: number): Types.TaskWithDetails[] => {
    return tasks.filter(task => task.SECTION_ID === sectionId)
  },

  /**
   * Filter tasks assigned to a user
   */
  filterByAssignee: (tasks: Types.TaskWithDetails[], userId: number): Types.TaskWithDetails[] => {
    return tasks.filter(task => task.ASSIGNED_TO === userId)
  },

  /**
   * Filter tasks assigned by a user
   */
  filterByAssigner: (tasks: Types.TaskWithDetails[], userId: number): Types.TaskWithDetails[] => {
    return tasks.filter(task => task.ASSIGNED_BY === userId)
  },

  /**
   * Filter tasks that require documents
   */
  filterRequiringDocuments: (tasks: Types.TaskWithDetails[]): Types.TaskWithDetails[] => {
    return tasks.filter(task => task.REQUIRES_DOCUMENT)
  },

  /**
   * Get task statistics
   */
  getTaskStatistics: (tasks: Types.TaskWithDetails[]): {
    total: number
    completed: number
    pending: number
    inProgress: number
    overdue: number
    dueSoon: number
    completionRate: number
    averageCompletionTime: number
  } => {
    const completed = tasks.filter(t => t.STATUS === 'completed').length
    const pending = tasks.filter(t => t.STATUS === 'pending').length
    const inProgress = tasks.filter(t => t.STATUS === 'in_progress').length
    const overdue = taskUtils.filterOverdue(tasks).length
    const dueSoon = taskUtils.filterDueSoon(tasks).length
    const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
    
    // Calculate average completion time (mock calculation)
    const averageCompletionTime = tasks.length > 0 ? Math.round(tasks.length * 2.5) : 0

    return {
      total: tasks.length,
      completed,
      pending,
      inProgress,
      overdue,
      dueSoon,
      completionRate,
      averageCompletionTime
    }
  },

  /**
   * Get tasks by category
   */
  getTasksByCategory: (tasks: Types.TaskWithDetails[]): Record<string, Types.TaskWithDetails[]> => {
    return tasks.reduce((acc, task) => {
      const category = task.CATEGORY || 'Uncategorized'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(task)
      return acc
    }, {} as Record<string, Types.TaskWithDetails[]>)
  },

  /**
   * Get tasks by tags
   */
  getTasksByTags: (tasks: Types.TaskWithDetails[]): Record<string, Types.TaskWithDetails[]> => {
    return tasks.reduce((acc, task) => {
      if (task.TAGS) {
        const tags = task.TAGS.split(',').map(tag => tag.trim())
        tags.forEach(tag => {
          if (!acc[tag]) {
            acc[tag] = []
          }
          acc[tag].push(task)
        })
      }
      return acc
    }, {} as Record<string, Types.TaskWithDetails[]>)
  },

  /**
   * Search tasks by title or description
   */
  searchTasks: (tasks: Types.TaskWithDetails[], query: string): Types.TaskWithDetails[] => {
    const lowercaseQuery = query.toLowerCase()
    return tasks.filter(task => 
      task.TITLE.toLowerCase().includes(lowercaseQuery) ||
      task.DESCRIPTION.toLowerCase().includes(lowercaseQuery) ||
      (task.CATEGORY && task.CATEGORY.toLowerCase().includes(lowercaseQuery)) ||
      (task.TAGS && task.TAGS.toLowerCase().includes(lowercaseQuery))
    )
  },

  /**
   * Get task deadline status
   */
  getDeadlineStatus: (task: Types.TaskWithDetails): 'overdue' | 'due-soon' | 'on-time' | 'completed' => {
    if (task.STATUS === 'completed') return 'completed'
    if (taskUtils.isOverdue(task)) return 'overdue'
    if (taskUtils.isDueSoon(task)) return 'due-soon'
    return 'on-time'
  },

  /**
   * Format task for display
   */
  formatTaskForDisplay: (task: Types.TaskWithDetails): {
    title: string
    description: string
    status: string
    priority: string
    dueDate: string
    assignee: string
    section: string
    progress: number
    isOverdue: boolean
    isDueSoon: boolean
  } => {
    return {
      title: task.TITLE,
      description: task.DESCRIPTION,
      status: task.STATUS,
      priority: task.PRIORITY,
      dueDate: dateUtils.formatDate(task.DUE_DATE),
      assignee: task.assignedTo.NAME,
      section: task.section.NAME,
      progress: taskUtils.getProgressPercentage(task),
      isOverdue: taskUtils.isOverdue(task),
      isDueSoon: taskUtils.isDueSoon(task)
    }
  },

  /**
   * Get task completion timeline
   */
  getTaskCompletionTimeline: (tasks: Types.TaskWithDetails[]): Array<{
    date: string
    completed: number
    created: number
  }> => {
    // Mock implementation - in real app, this would calculate based on actual data
    const timeline = []
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateString = dateUtils.formatDate(date.toISOString())
      
      timeline.push({
        date: dateString,
        completed: Math.floor(Math.random() * 5),
        created: Math.floor(Math.random() * 3)
      })
    }
    
    return timeline
  }
}
