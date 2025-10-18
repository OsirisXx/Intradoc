import React, { useEffect } from 'react'

interface AlertDialogProps {
  isOpen: boolean
  title: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  buttonText?: string
  onClose: () => void
  autoClose?: boolean
  autoCloseDelay?: number
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  title,
  message,
  type = 'info',
  buttonText = 'OK',
  onClose,
  autoClose = false,
  autoCloseDelay = 3000
}) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose()
      }, autoCloseDelay)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose])

  if (!isOpen) return null

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          headerBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          )
        }
      case 'error':
        return {
          headerBg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          )
        }
      case 'warning':
        return {
          headerBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          )
        }
      default:
        return {
          headerBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          )
        }
    }
  }

  const typeStyles = getTypeStyles()

  return (
    <div className="alert-dialog-overlay">
      <div className="alert-dialog">
        <div 
          className="alert-dialog-header"
          style={{ background: typeStyles.headerBg }}
        >
          <div className="alert-dialog-icon">
            {typeStyles.icon}
          </div>
          <h3 className="alert-dialog-title">{title}</h3>
          <button 
            className="alert-dialog-close"
            onClick={onClose}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div className="alert-dialog-body">
          <p className="alert-dialog-message">{message}</p>
        </div>
        
        <div className="alert-dialog-footer">
          <button
            type="button"
            className="alert-dialog-btn"
            onClick={onClose}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}
