import { useState, useCallback } from 'react'

interface ConfirmationDialogState {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  onConfirm?: () => void
  onCancel?: () => void
  isLoading?: boolean
}

interface AlertDialogState {
  isOpen: boolean
  title: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  buttonText?: string
  autoClose?: boolean
  autoCloseDelay?: number
}

export const useDialog = () => {
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  })

  const [alertDialog, setAlertDialog] = useState<AlertDialogState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  })

  // Confirmation dialog methods
  const showConfirmation = useCallback((config: Omit<ConfirmationDialogState, 'isOpen'>) => {
    setConfirmationDialog({
      isOpen: true,
      ...config
    })
  }, [])

  const hideConfirmation = useCallback(() => {
    setConfirmationDialog(prev => ({ ...prev, isOpen: false }))
  }, [])

  const confirm = useCallback((config: Omit<ConfirmationDialogState, 'isOpen'>) => {
    return new Promise<boolean>((resolve) => {
      showConfirmation({
        ...config,
        onConfirm: () => {
          config.onConfirm?.()
          hideConfirmation()
          resolve(true)
        },
        onCancel: () => {
          config.onCancel?.()
          hideConfirmation()
          resolve(false)
        }
      })
    })
  }, [showConfirmation, hideConfirmation])

  // Alert dialog methods
  const showAlert = useCallback((config: Omit<AlertDialogState, 'isOpen'>) => {
    setAlertDialog({
      isOpen: true,
      ...config
    })
  }, [])

  const hideAlert = useCallback(() => {
    setAlertDialog(prev => ({ ...prev, isOpen: false }))
  }, [])

  const alert = useCallback((config: Omit<AlertDialogState, 'isOpen'>) => {
    return new Promise<void>((resolve) => {
      showAlert({
        ...config,
        onClose: () => {
          config.onClose?.()
          hideAlert()
          resolve()
        }
      })
    })
  }, [showAlert, hideAlert])

  // Convenience methods
  const showSuccess = useCallback((message: string, title = 'Success') => {
    return alert({ title, message, type: 'success', autoClose: true })
  }, [alert])

  const showError = useCallback((message: string, title = 'Error') => {
    return alert({ title, message, type: 'error' })
  }, [alert])

  const showWarning = useCallback((message: string, title = 'Warning') => {
    return alert({ title, message, type: 'warning' })
  }, [alert])

  const showInfo = useCallback((message: string, title = 'Information') => {
    return alert({ title, message, type: 'info' })
  }, [alert])

  const confirmDelete = useCallback((itemName: string) => {
    return confirm({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })
  }, [confirm])

  const confirmAction = useCallback((action: string, itemName: string, type: 'danger' | 'warning' | 'info' = 'warning') => {
    return confirm({
      title: `Confirm ${action}`,
      message: `Are you sure you want to ${action.toLowerCase()} "${itemName}"?`,
      type,
      confirmText: action,
      cancelText: 'Cancel'
    })
  }, [confirm])

  return {
    // State
    confirmationDialog,
    alertDialog,
    
    // Methods
    showConfirmation,
    hideConfirmation,
    confirm,
    showAlert,
    hideAlert,
    alert,
    
    // Convenience methods
    showSuccess,
    showError,
    showWarning,
    showInfo,
    confirmDelete,
    confirmAction
  }
}
