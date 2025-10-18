import React, { createContext, useContext, ReactNode } from 'react'
import { ConfirmationDialog } from './ConfirmationDialog'
import { AlertDialog } from './AlertDialog'
import { useDialog } from '../../hooks/useDialog'

interface DialogContextType {
  showConfirmation: (config: any) => void
  hideConfirmation: () => void
  confirm: (config: any) => Promise<boolean>
  showAlert: (config: any) => void
  hideAlert: () => void
  alert: (config: any) => Promise<void>
  showSuccess: (message: string, title?: string) => Promise<void>
  showError: (message: string, title?: string) => Promise<void>
  showWarning: (message: string, title?: string) => Promise<void>
  showInfo: (message: string, title?: string) => Promise<void>
  confirmDelete: (itemName: string) => Promise<boolean>
  confirmAction: (action: string, itemName: string, type?: 'danger' | 'warning' | 'info') => Promise<boolean>
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

export const useDialogContext = () => {
  const context = useContext(DialogContext)
  if (context === undefined) {
    throw new Error('useDialogContext must be used within a DialogProvider')
  }
  return context
}

interface DialogProviderProps {
  children: ReactNode
}

export const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
  const dialog = useDialog()

  return (
    <DialogContext.Provider value={dialog}>
      {children}
      
      {/* Global Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={dialog.confirmationDialog.isOpen}
        title={dialog.confirmationDialog.title}
        message={dialog.confirmationDialog.message}
        confirmText={dialog.confirmationDialog.confirmText}
        cancelText={dialog.confirmationDialog.cancelText}
        type={dialog.confirmationDialog.type}
        onConfirm={dialog.confirmationDialog.onConfirm || (() => {})}
        onCancel={dialog.confirmationDialog.onCancel || (() => {})}
        isLoading={dialog.confirmationDialog.isLoading}
      />
      
      {/* Global Alert Dialog */}
      <AlertDialog
        isOpen={dialog.alertDialog.isOpen}
        title={dialog.alertDialog.title}
        message={dialog.alertDialog.message}
        type={dialog.alertDialog.type}
        buttonText={dialog.alertDialog.buttonText}
        onClose={() => dialog.hideAlert()}
        autoClose={dialog.alertDialog.autoClose}
        autoCloseDelay={dialog.alertDialog.autoCloseDelay}
      />
    </DialogContext.Provider>
  )
}
