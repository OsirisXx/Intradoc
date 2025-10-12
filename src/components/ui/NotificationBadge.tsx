import React from 'react'

interface NotificationBadgeProps {
  count: number
  maxCount?: number
  showZero?: boolean
  size?: 'small' | 'medium' | 'large'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  pulse?: boolean
  className?: string
}

export function NotificationBadge({
  count,
  maxCount = 99,
  showZero = false,
  size = 'medium',
  color = 'danger',
  pulse = false,
  className = ''
}: NotificationBadgeProps) {
  // Don't show badge if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null
  }

  // Display count or maxCount+
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString()

  // Size classes
  const sizeClasses = {
    small: 'notification-badge-sm',
    medium: 'notification-badge-md',
    large: 'notification-badge-lg'
  }

  // Color classes
  const colorClasses = {
    primary: 'notification-badge-primary',
    secondary: 'notification-badge-secondary',
    success: 'notification-badge-success',
    warning: 'notification-badge-warning',
    danger: 'notification-badge-danger',
    info: 'notification-badge-info'
  }

  // Build class names
  const badgeClasses = [
    'notification-badge',
    sizeClasses[size],
    colorClasses[color],
    pulse ? 'notification-badge-pulse' : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <span className={badgeClasses}>
      {displayCount}
    </span>
  )
}

// HOC for adding notification badge to any component
export function withNotificationBadge<T extends object>(
  Component: React.ComponentType<T>,
  badgeProps?: Omit<NotificationBadgeProps, 'count'>
) {
  return function NotificationBadgeWrapper(props: T & { notificationCount?: number }) {
    const { notificationCount, ...componentProps } = props

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Component {...(componentProps as T)} />
        {notificationCount !== undefined && (
          <NotificationBadge
            count={notificationCount}
            {...badgeProps}
            className="notification-badge-absolute"
          />
        )}
      </div>
    )
  }
}

// Hook for notification badge logic
export function useNotificationBadge(count: number, options?: {
  maxCount?: number
  showZero?: boolean
  pulse?: boolean
}) {
  const { maxCount = 99, showZero = false, pulse = false } = options || {}

  const shouldShow = count > 0 || showZero
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString()
  const shouldPulse = pulse && count > 0

  return {
    shouldShow,
    displayCount,
    shouldPulse,
    count
  }
}

// Notification badge for navigation items
export function NavNotificationBadge({ count, ...props }: NotificationBadgeProps) {
  return (
    <NotificationBadge
      count={count}
      size="small"
      color="danger"
      pulse={count > 0}
      className="nav-notification-badge"
      {...props}
    />
  )
}

// Notification badge for buttons
export function ButtonNotificationBadge({ count, ...props }: NotificationBadgeProps) {
  return (
    <NotificationBadge
      count={count}
      size="small"
      color="danger"
      className="button-notification-badge"
      {...props}
    />
  )
}

// Notification badge for tabs
export function TabNotificationBadge({ count, ...props }: NotificationBadgeProps) {
  return (
    <NotificationBadge
      count={count}
      size="small"
      color="primary"
      className="tab-notification-badge"
      {...props}
    />
  )
}
