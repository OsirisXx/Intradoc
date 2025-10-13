import { useState, useEffect } from 'react'
import { apiService } from '../../services/api'
import './DocumentViewModal.css'

interface DocumentViewModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: number
  documentTitle?: string
  fallbackUrl?: string
}

export function DocumentViewModal({ 
  isOpen, 
  onClose, 
  documentId, 
  documentTitle = 'Document',
  fallbackUrl 
}: DocumentViewModalProps) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentType, setDocumentType] = useState<string>('')

  useEffect(() => {
    if (isOpen && documentId) {
      loadDocument()
    } else {
      // Clean up when modal closes
      setDocumentUrl(null)
      setError(null)
      setDocumentType('')
    }
  }, [isOpen, documentId])

  const loadDocument = async () => {
    try {
      setLoading(true)
      setError(null)

      // Try to get the document through the API first
      const result = await apiService.downloadDocument(documentId)
      
      if (result.success && result.blob) {
        // Create object URL from blob
        const url = URL.createObjectURL(result.blob)
        setDocumentUrl(url)
        
        // Determine document type from filename
        if (result.filename) {
          const extension = result.filename.toLowerCase().split('.').pop()
          setDocumentType(extension || '')
        }
      } else {
        // Fallback to direct URL if available
        if (fallbackUrl) {
          setDocumentUrl(fallbackUrl)
          const extension = fallbackUrl.toLowerCase().split('.').pop()?.split('?')[0]
          setDocumentType(extension || '')
        } else {
          setError(result.error || 'Failed to load document')
        }
      }
    } catch (error) {
      console.error('Error loading document:', error)
      setError('Failed to load document. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Clean up object URL when closing
    if (documentUrl && documentUrl.startsWith('blob:')) {
      URL.revokeObjectURL(documentUrl)
    }
    onClose()
  }

  const renderDocumentContent = () => {
    if (loading) {
      return (
        <div className="document-loading">
          <div className="loading-spinner"></div>
          <p>Loading document...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="document-error">
          <div className="error-icon">⚠️</div>
          <h3>Unable to load document</h3>
          <p>{error}</p>
          {fallbackUrl && (
            <button 
              className="btn btn-primary"
              onClick={() => window.open(fallbackUrl, '_blank')}
            >
              Open in new tab
            </button>
          )}
        </div>
      )
    }

    if (!documentUrl) {
      return (
        <div className="document-error">
          <div className="error-icon">📄</div>
          <h3>No document available</h3>
          <p>Document could not be loaded.</p>
        </div>
      )
    }

    // Render based on document type
    switch (documentType) {
      case 'pdf':
        return (
          <iframe
            src={documentUrl}
            className="document-iframe"
            title={documentTitle}
            onError={() => setError('Failed to display PDF. The file may be corrupted.')}
          />
        )
      
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return (
          <img
            src={documentUrl}
            alt={documentTitle}
            className="document-image"
            onError={() => setError('Failed to display image. The file may be corrupted.')}
          />
        )
      
      case 'txt':
        return (
          <iframe
            src={documentUrl}
            className="document-iframe text-content"
            title={documentTitle}
            onError={() => setError('Failed to display text file.')}
          />
        )
      
      case 'doc':
      case 'docx':
      case 'xls':
      case 'xlsx':
      case 'ppt':
      case 'pptx':
        // For Office documents, show a message with download option
        return (
          <div className="document-download">
            <div className="download-icon">📄</div>
            <h3>{documentTitle}</h3>
            <p>Office documents cannot be previewed in the browser. Click download to view the file.</p>
            <div className="download-actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = documentUrl
                  link.download = documentTitle
                  link.click()
                }}
              >
                Download File
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => window.open(documentUrl, '_blank')}
              >
                Open in new tab
              </button>
            </div>
          </div>
        )
      
      default:
        // For other file types, show a download option
        return (
          <div className="document-download">
            <div className="download-icon">📄</div>
            <h3>{documentTitle}</h3>
            <p>This file type cannot be previewed in the browser.</p>
            <div className="download-actions">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = documentUrl
                  link.download = documentTitle
                  link.click()
                }}
              >
                Download File
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => window.open(documentUrl, '_blank')}
              >
                Open in new tab
              </button>
            </div>
          </div>
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="document-modal-overlay" onClick={handleClose}>
      <div className="document-modal" onClick={(e) => e.stopPropagation()}>
        <div className="document-modal-header">
          <h2>{documentTitle}</h2>
          <button 
            className="close-button"
            onClick={handleClose}
            aria-label="Close modal"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="document-modal-content">
          {renderDocumentContent()}
        </div>
        
        <div className="document-modal-footer">
          <button 
            className="btn btn-secondary"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
