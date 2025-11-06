import { useState, useEffect } from 'react'
import { apiService } from '../../services/api'
import { getFileTypeInfo } from './FileTypeIcon'
import './DocumentViewModal.css'

interface DocumentMetadata {
  documentId: number
  title: string
  description?: string
  submissionType: 'file' | 'url' | 'both'
  status: string
  createdBy: string
  createdAt: string
  fileSize?: number
  originalFilename?: string
  mimeType?: string
  sha256Hash: string
  taskContext?: {
    taskId: number
    taskTitle: string
    dueDate: string
    priority: string
    assignedBy: string
    TASK_ID?: number
    TITLE?: string
    DUE_DATE?: string
    PRIORITY?: string
    ASSIGNED_BY_NAME?: string
  }
  fileInfo?: {
    name: string
    size: number
    type: string
    lastModified: string
  }
  urlInfo?: {
    url: string
    domain: string
    title?: string
    description?: string
  }
}

interface MetadataItem {
  label: string
  value: string | React.ReactNode
  type?: 'text' | 'badge' | 'link' | 'date' | 'hash'
  copyable?: boolean
}

interface MetadataSection {
  title: string
  icon: string
  items: MetadataItem[]
  collapsible?: boolean
}

interface DocumentViewModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: number
  documentTitle?: string
  fallbackUrl?: string
  taskContext?: any
  existingMetadata?: any
}

export function DocumentViewModal({ 
  isOpen, 
  onClose, 
  documentId, 
  documentTitle = 'Document',
  fallbackUrl,
  existingMetadata
}: DocumentViewModalProps) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentType, setDocumentType] = useState<string>('')
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null)
  const [isUrlSubmission, setIsUrlSubmission] = useState(false)

  useEffect(() => {
    if (isOpen && documentId) {
      loadDocument()
    } else {
      // Clean up when modal closes
      setDocumentUrl(null)
      setError(null)
      setDocumentType('')
      setMetadata(null)
      setIsUrlSubmission(false)
    }
  }, [isOpen, documentId])

  const loadDocument = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use existing metadata if provided, otherwise fetch from API
      if (existingMetadata) {
        setMetadata(existingMetadata)
        
        // Still need to get the document URL for viewing
        const result = await apiService.downloadDocument(documentId)
        if (result.success && result.blob) {
          const url = URL.createObjectURL(result.blob)
          setDocumentUrl(url)
          setIsUrlSubmission(false)
          
          // Determine document type from filename
          let extension = ''
          if (existingMetadata.title) {
            extension = existingMetadata.title.toLowerCase().split('.').pop() || ''
          }
          setDocumentType(extension)
        } else {
          setError('Failed to load document file')
        }
        return
      }

      // Try to get the document through the API first
      const result = await apiService.downloadDocument(documentId)
      
      if (result.success) {
        if (result.isUrl) {
          // This is a URL submission (external link)
          setDocumentUrl(result.url || '')
          setIsUrlSubmission(true)
          setMetadata(result.metadata || {})
          // Better URL extension detection
          const url = (result.url || '').toLowerCase()
          const extension = url.split('.').pop()?.split('?')[0]?.split('#')[0] || ''
          // For URLs, we might want to show a generic link icon if no clear extension
          setDocumentType(extension || 'url')
        } else if (result.blob) {
          // This is a file submission
          const url = URL.createObjectURL(result.blob)
          setDocumentUrl(url)
          setIsUrlSubmission(false)
          setMetadata(result.metadata || {})
          
          // Determine document type from metadata or filename
          let extension = ''
          if (result.metadata?.fileInfo?.name) {
            extension = result.metadata.fileInfo.name.toLowerCase().split('.').pop() || ''
          } else if (result.filename) {
            extension = result.filename.toLowerCase().split('.').pop() || ''
          }
          setDocumentType(extension)
        } else {
          setError(result.error || 'Failed to load document')
        }
      } else {
        // Fallback to direct URL if available
        if (fallbackUrl) {
          setDocumentUrl(fallbackUrl)
          // Check if fallbackUrl is a local file path or external URL
          const isLocalPath = fallbackUrl.includes('uploads/') || fallbackUrl.startsWith('D:') || fallbackUrl.startsWith('C:')
          setIsUrlSubmission(!isLocalPath)
          const extension = fallbackUrl.toLowerCase().split('.').pop()?.split('?')[0] || ''
          setDocumentType(extension)
          // Set minimal metadata for fallback
          setMetadata({
            documentId: documentId,
            title: documentTitle,
            submissionType: 'file' as const,
            status: 'Submitted',
            createdBy: 'System User',
            createdAt: new Date().toISOString(),
            sha256Hash: 'Not available'
          })
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

  const handleViewContent = () => {
    if (!documentUrl) return
    
    // For file submissions (blob URLs), open in new window/tab
    // This will open PDFs and documents in the browser's native viewer
    if (isUrlSubmission) {
      // For URL submissions, open in new tab
      window.open(documentUrl, '_blank', 'noopener,noreferrer')
    } else {
      // For blob URLs, open in new window so browser can handle it
      // This will open PDFs in the browser's native PDF viewer
      const newWindow = window.open(documentUrl, '_blank', 'noopener,noreferrer')
      if (!newWindow) {
        // Fallback if popup is blocked - create a link and click it
        const a = document.createElement('a')
        a.href = documentUrl
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const createMetadataSections = (): MetadataSection[] => {
    if (!metadata) return []

    const sections: MetadataSection[] = []

    // Document Information
    sections.push({
      title: 'Document Information',
      icon: '📄',
      items: [
        { label: 'Title', value: metadata.title },
        ...(metadata.description ? [{ label: 'Description', value: metadata.description }] : []),
        { 
          label: 'Submission Type', 
          value: isUrlSubmission ? '🔗 External Link' : '📎 File Upload',
          type: 'badge'
        },
        { 
          label: 'Status', 
          value: metadata.status,
          type: 'badge'
        }
      ]
    })

    // Submission Details
    sections.push({
      title: 'Submission Details',
      icon: '📊',
      items: [
        { label: 'Submitted by', value: metadata.createdBy },
        { label: 'Submitted on', value: metadata.createdAt, type: 'date' as const },
        ...(metadata.taskContext ? [
          { label: 'Task', value: metadata.taskContext.taskTitle || metadata.taskContext.TITLE },
          { label: 'Due date', value: metadata.taskContext.dueDate || metadata.taskContext.DUE_DATE, type: 'date' as const },
          { 
            label: 'Priority', 
            value: metadata.taskContext.priority || metadata.taskContext.PRIORITY,
            type: 'badge' as const
          }
        ] : [])
      ]
    })

    // File/URL Information - Enhanced for better distinction
    if (isUrlSubmission) {
      const url = documentUrl || metadata.urlInfo?.url || ''
      const domain = metadata.urlInfo?.domain || (url ? new URL(url).hostname : 'Unknown')
      
      sections.push({
        title: 'Link Information',
        icon: '🔗',
        items: [
          { label: 'URL', value: url || 'N/A', type: 'link', copyable: true },
          { label: 'Domain', value: domain },
          { label: 'Protocol', value: url.startsWith('https:') ? 'HTTPS (Secure)' : url.startsWith('http:') ? 'HTTP' : 'Unknown', type: 'badge' as const },
          { label: 'Link Type', value: 'External Resource', type: 'badge' as const },
          ...(metadata.urlInfo?.title ? [{ label: 'Page Title', value: metadata.urlInfo.title }] : []),
          ...(metadata.urlInfo?.description ? [{ label: 'Description', value: metadata.urlInfo.description }] : [])
        ]
      })
    } else {
      const fileSize = metadata.fileInfo?.size ? formatFileSize(metadata.fileInfo.size) : 'Unknown'
      const fileType = metadata.fileInfo?.type || documentType || 'Unknown'
      
      sections.push({
        title: 'File Information',
        icon: '📎',
        items: [
          { label: 'Filename', value: metadata.fileInfo?.name || 'Unknown' },
          { label: 'Size', value: fileSize },
          { label: 'MIME Type', value: fileType },
          { label: 'Extension', value: documentType ? `.${documentType}` : 'Unknown', type: 'badge' as const },
          { label: 'Last modified', value: metadata.fileInfo?.lastModified || 'Unknown', type: 'date' as const },
          { label: 'File Type', value: 'Uploaded File', type: 'badge' as const },
          { label: 'Storage', value: 'Local Server', type: 'badge' as const }
        ]
      })
    }

    // Submission Context
    sections.push({
      title: 'Submission Context',
      icon: '📋',
      items: [
        {
          label: 'Submission Method',
          value: isUrlSubmission ? 'URL Link Submission' : 'File Upload',
          type: 'badge' as const
        },
        {
          label: 'Access Type',
          value: isUrlSubmission ? 'External Access' : 'Local Access',
          type: 'badge' as const
        },
        {
          label: 'Verification Status',
          value: isUrlSubmission ? 'Link Verified' : 'File Hash Verified',
          type: 'badge' as const
        },
        ...(metadata.taskContext ? [
          {
            label: 'Task Status',
            value: (metadata.taskContext as any).STATUS || 'Unknown',
            type: 'badge' as const
          }
        ] : [])
      ]
    })

    // Security & Verification
    sections.push({
      title: 'Security & Verification',
      icon: '🔒',
      items: [
        { 
          label: 'SHA-256 Hash', 
          value: metadata.sha256Hash ? metadata.sha256Hash.substring(0, 16) + '...' : 'Not available',
          type: 'hash' as const,
          copyable: true
        },
        {
          label: 'Integrity Check',
          value: isUrlSubmission ? 'Link Accessibility' : 'File Integrity',
          type: 'badge' as const
        },
        {
          label: 'Security Level',
          value: isUrlSubmission ? 'External (Variable)' : 'Local (Secure)',
          type: 'badge' as const
        }
      ]
    })

    return sections
  }

  const renderDocumentPreview = () => {
    if (loading) {
      return (
        <div className="document-preview-loading">
          <div className="loading-skeleton">
            <div className="skeleton-header"></div>
            <div className="skeleton-content"></div>
            <div className="skeleton-content"></div>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="document-preview-error">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Document</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadDocument}>Try Again</button>
        </div>
      )
    }

    if (!documentUrl) {
      return (
        <div className="document-preview-error">
          <div className="error-icon">📄</div>
          <h3>No Document Available</h3>
          <p>This document could not be loaded.</p>
        </div>
      )
    }

    const fileInfo = getFileTypeInfo(documentType)
    
    // For URL submissions, show simple link preview
    if (isUrlSubmission) {
      return (
        <div className="document-preview-url">
          <div className="url-preview-card">
            <div className="url-preview-header">
              <h3>{metadata?.title || documentTitle}</h3>
            </div>
            <div className="url-info">
              <p className="url-domain">🌐 {documentUrl}</p>
            </div>
            <div className="url-preview-actions">
              <button 
                className="btn btn-primary" 
                onClick={() => window.open(documentUrl, '_blank')}
              >
                Open Link
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => navigator.clipboard.writeText(documentUrl)}
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )
    }

    // For file submissions, show appropriate preview
    switch (fileInfo.previewType) {
      case 'iframe':
        // Replace iframe preview with a card that has View Content button
        return (
          <div className="document-preview-download">
            <div className="download-preview-card">
              <div className="url-preview-header">
                <h3>{metadata?.title || documentTitle}</h3>
              </div>
              {metadata?.fileInfo && (
                <div className="file-info">
                  <p className="file-name">File: {metadata.fileInfo.name}</p>
                  {metadata.fileInfo.size && (
                    <p className="file-size">Size: {formatFileSize(metadata.fileInfo.size)}</p>
                  )}
                </div>
              )}
              <div className="download-actions">
                <button 
                  className="btn btn-primary" 
                  onClick={handleViewContent}
                >
                  📄 View Content
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = documentUrl
                    a.download = metadata?.fileInfo?.name || metadata?.title || documentTitle
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                  }}
                >
                  Download File
                </button>
              </div>
            </div>
          </div>
        )

      case 'image':
        return (
          <div className="document-preview-image">
            <img 
              src={documentUrl} 
              alt={metadata?.title || documentTitle}
              className="document-image"
            />
          </div>
        )

      default:
        return (
          <div className="document-preview-download">
            <div className="download-preview-card">
              <div className="url-preview-header">
                <h3>{metadata?.title || documentTitle}</h3>
              </div>
              {metadata?.fileInfo && (
                <div className="file-info">
                  <p className="file-name">File: {metadata.fileInfo.name}</p>
                  {metadata.fileInfo.size && (
                    <p className="file-size">Size: {formatFileSize(metadata.fileInfo.size)}</p>
                  )}
                </div>
              )}
              <div className="download-actions">
                <button 
                  className="btn btn-primary" 
                  onClick={handleViewContent}
                >
                  📄 View Content
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = documentUrl
                    a.download = metadata?.fileInfo?.name || metadata?.title || documentTitle
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                  }}
                >
                  Download File
                </button>
              </div>
            </div>
          </div>
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="simple-modal-overlay" onClick={handleClose}>
      <div className="simple-modal" onClick={(e) => e.stopPropagation()}>
        {/* Simple Header */}
        <div className="simple-header">
          <div className="header-info">
            <h2 className="document-title">{metadata?.title || documentTitle}</h2>
            <div className="submission-type">
              {isUrlSubmission ? (
                <span className="type-label url">🔗 External Link</span>
              ) : (
                <span className="type-label file">📎 File Upload</span>
              )}
            </div>
          </div>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        
        {/* Simple Content */}
        <div className="simple-content">
          <div className="preview-section">
            {renderDocumentPreview()}
          </div>
          
          <div className="details-section">
            <div className="detail-item">
              <span className="detail-label">Submitted by:</span>
              <span className="detail-value">{metadata?.createdBy || 'System User'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Date:</span>
              <span className="detail-value">
                {metadata?.createdAt ? new Date(metadata.createdAt).toLocaleDateString() : 'Not available'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Type:</span>
              <span className="detail-value">
                {isUrlSubmission ? (
                  <span className="type-label url">🔗 External Link</span>
                ) : (
                  <span className="type-label file">📎 File Upload</span>
                )}
              </span>
            </div>
            {isUrlSubmission ? (
              <div className="detail-item">
                <span className="detail-label">URL:</span>
                <span className="detail-value url-text">{documentUrl || 'Not available'}</span>
              </div>
            ) : (
              <div className="detail-item">
                <span className="detail-label">File:</span>
                <span className="detail-value">{metadata?.fileInfo?.name || metadata?.title || 'Document file'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
