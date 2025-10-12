import type { ReactNode } from 'react'

type BadgeProps = {
  color?: 'blue' | 'green' | 'amber' | 'red'
  children?: ReactNode
}

export function Badge({ color = 'blue', children }: BadgeProps) {
  const colorClass = `badge-${color}`
  return (
    <span className={`badge ${colorClass}`}>
      {children}
    </span>
  )
}
