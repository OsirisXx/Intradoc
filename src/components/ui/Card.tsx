import type { ReactNode } from 'react'

type CardProps = {
  title?: string
  actions?: ReactNode
  children?: ReactNode
}

export function Card({ title, actions, children }: CardProps) {
  return (
    <div className="card">
      {(title || actions) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          {title && <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1e293b' }}>{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}
