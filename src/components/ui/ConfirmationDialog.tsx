import React from 'react'

interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  if (!isOpen) return null

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          headerBg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          confirmBg: '#dc2626',
          confirmHover: '#b91c1c',
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
          confirmBg: '#f59e0b',
          confirmHover: '#d97706',
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
          confirmBg: '#3b82f6',
          confirmHover: '#2563eb',
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          )
        }
    }
  }

  const typeStyles = getTypeStyles()

  return (
    <div className="confirmation-dialog-overlay">
      <div className="confirmation-dialog">
        <div 
          className="confirmation-dialog-header"
          style={{ background: typeStyles.headerBg }}
        >
          <div className="confirmation-dialog-icon">
            {typeStyles.icon}
          </div>
          <h3 className="confirmation-dialog-title">{title}</h3>
        </div>
        
        <div className="confirmation-dialog-body">
          <p className="confirmation-dialog-message">{message}</p>
        </div>
        
        <div className="confirmation-dialog-footer">
          <button
            type="button"
            className="confirmation-dialog-btn confirmation-dialog-btn-cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="confirmation-dialog-btn confirmation-dialog-btn-confirm"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              backgroundColor: typeStyles.confirmBg,
              '--hover-color': typeStyles.confirmHover
            } as React.CSSProperties}
          >
            {isLoading ? (
              <div className="confirmation-dialog-spinner">
                <div className="spinner"></div>
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
