import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import { DocumentViewModal } from '../common/DocumentViewModal'
import * as Types from '../../types'
import './StaffTaskDetail.css'

export function StaffTaskDetail() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [task, setTask] = useState<Types.TaskWithDetails | null>(null)
  const [taskDocuments, setTaskDocuments] = useState<Types.DocumentWithDetails[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [documentUrl, setDocumentUrl] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingTask, setLoadingTask] = useState(true)
  
  // Document view modal state
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<{ id: number; title: string; fallbackUrl?: string } | null>(null)

  useEffect(() => {
    if (taskId && user) {
      loadTask()
      loadTaskDocuments()
    }
  }, [taskId, user])

  const loadTask = async () => {
    if (!taskId || !user) return
    
    try {
      setLoadingTask(true)
      // Get all tasks assigned to user and find the specific one
      const response = await apiService.getTasksAssignedTo(user.USER_ID)
      if (response.success) {
        const allTasks = response.data || []
        const foundTask = allTasks.find(t => t.TASK_ID.toString() === taskId)
        if (foundTask) {
          setTask(foundTask)
        } else {
          // Task not found, redirect back to work page
          navigate('/staff/work')
        }
      }
    } catch (error) {
      console.error('Error loading task:', error)
      navigate('/staff/work')
    } finally {
      setLoadingTask(false)
    }
  }

  const loadTaskDocuments = async () => {
    if (!taskId) return
    
    try {
      const response = await apiService.getTaskDocuments(parseInt(taskId))
      if (response.success) {
        setTaskDocuments(response.data || [])
      }
    } catch (error) {
      console.error('Error loading task documents:', error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleViewDocument = (document: Types.DocumentWithDetails) => {
    setSelectedDocument({
      id: document.DOCUMENT_ID,
      title: document.TITLE,
      fallbackUrl: document.FILE_LINK
    })
    setViewModalOpen(true)
  }

  const handleCloseViewModal = () => {
    setViewModalOpen(false)
    setSelectedDocument(null)
  }

  const handleUploadForTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task || !user) return
    
    // Validate that at least one option is provided
    if (selectedFiles.length === 0 && !documentUrl.trim()) {
      alert('Please provide either a file or a document URL')
      return
    }
    
    try {
      setLoading(true)
      // Upload URL first if provided
      if (documentUrl.trim()) {
        await apiService.uploadDocumentWithUrl({
          title: task.TITLE,
          description: description,
          documentUrl: documentUrl,
          category: '',
          tags: task.TAGS || '',
          uploadedBy: user.USER_ID,
          sectionId: user.SECTION_ID,
          fulfillsTaskId: task.TASK_ID
        })
      }

      // Upload selected files sequentially
      for (const file of selectedFiles) {
        await apiService.uploadDocumentWithFile({
          file,
          title: file.name,
          description: description,
          category: '',
          tags: task.TAGS || '',
          uploadedBy: user.USER_ID,
          sectionId: user.SECTION_ID,
          fulfillsTaskId: task.TASK_ID
        })
      }

      // Ensure task is at least in_progress
      await apiService.updateTaskStatus(task.TASK_ID, 'in_progress')

      // Refresh
      await loadTaskDocuments()

      // Reset selections
      setSelectedFiles([])
      setDocumentUrl('')
      setDescription('')
      alert('Upload(s) completed!')
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Error uploading document')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitTask = async () => {
    if (!task) return
    
    try {
      setSubmitting(true)
      const response = await apiService.submitTask(task.TASK_ID)
      if (!response.success) throw new Error(response.error || 'Failed to submit task')
      
      // Reload task data to reflect the status change
      await loadTask()
      await loadTaskDocuments()
    } catch (error) {
      console.error('Submit task error:', error)
      alert((error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnsubmitTask = async () => {
    if (!task) return
    try {
      setSubmitting(true)
      const response = await apiService.unsubmitTask(task.TASK_ID)
      if (!response.success) throw new Error(response.error || 'Failed')
      await loadTask()
      await loadTaskDocuments()
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }


  const handleDeleteAttachment = async (docId: number) => {
    if (!task) return
    if (!confirm('Remove this attachment?')) return
    const response = await apiService.deleteDocument(docId)
    if (!response.success) {
      alert(response.error || 'Failed to delete')
      return
    }
    await loadTaskDocuments()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Submitted':
        return <span className="status-badge pending">SUBMITTED</span>
      case 'Under_Section_Review':
        return <span className="status-badge pending">UNDER REVIEW</span>
      case 'Under_Division_Review':
        return <span className="status-badge pending">DIVISION REVIEW</span>
      case 'Under_Regional_Review':
        return <span className="status-badge pending">REGIONAL REVIEW</span>
      case 'Approved':
        return <span className="status-badge approved">APPROVED</span>
      case 'Revision_Required':
        return <span className="status-badge draft">REVISION NEEDED</span>
      case 'Rejected':
        return <span className="status-badge draft">REJECTED</span>
      default:
        return <span className="status-badge draft">{status}</span>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDueDate = (dueDate: string) => {
    return new Date(dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  if (loadingTask) {
    return (
      <div className="task-detail-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading task details...</p>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="task-detail-page">
        <div className="error-state">
          <h3>Task not found</h3>
          <p>The requested task could not be found.</p>
          <button type="button" onClick={() => navigate('/staff/work')} className="btn btn-primary">
            Back to Work
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="task-detail-page">
      {/* Back Button */}
      <div className="back-button-container">
        <button 
          type="button"
          onClick={() => navigate('/staff/work')} 
          className="back-button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to Work
        </button>
      </div>

      {/* Main Content */}
      <div className="task-detail-content">
        {/* Left Column - Task Information */}
        <div className="task-info-section">
          <div className="task-info-card">
            <div className="task-header">
              <h1 className="task-title">{task.TITLE}</h1>
              <div className="task-priority">
                <span className={`priority-badge priority-${task.PRIORITY?.toLowerCase()}`}>
                  {task.PRIORITY}
                </span>
              </div>
            </div>
            
            <div className="task-description">
              <h3>Description</h3>
              <p>{task.DESCRIPTION}</p>
            </div>

            <div className="task-details">
              <div className="detail-item">
                <label>Due Date</label>
                <span className={isOverdue(task.DUE_DATE) ? 'overdue' : ''}>
                  {formatDueDate(task.DUE_DATE)}
                </span>
              </div>
              
              <div className="detail-item">
                <label>Status</label>
                <span className="status-text">{task.STATUS}</span>
              </div>
              
              <div className="detail-item">
                <label>Created</label>
                <span>{formatDate(task.CREATED_AT)}</span>
              </div>
              
              {task.ASSIGNED_BY && (
                <div className="detail-item">
                  <label>Assigned By</label>
                  <span>{task.ASSIGNED_BY}</span>
                </div>
              )}
              
              {task.TAGS && (
                <div className="detail-item">
                  <label>Tags</label>
                  <span className="tags">{task.TAGS}</span>
                </div>
              )}
            </div>

            {/* Task Actions */}
            <div className="task-actions-section">
              <h3>Task Actions</h3>
              <div className="action-buttons">
                {task.STATUS !== 'completed' ? (
                  <button 
                    type="button"
                    onClick={handleSubmitTask} 
                    disabled={submitting}
                    className="btn btn-primary"
                  >
                    {submitting 
                      ? 'Submitting...' 
                      : taskDocuments.length > 0 
                        ? 'Submit Task' 
                        : 'Mark as Done'
                    }
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={handleUnsubmitTask} 
                    disabled={submitting}
                    className="btn btn-secondary"
                  >
                    {submitting ? 'Unsubmitting...' : 'Unsubmit Task'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Upload and Attachments */}
        <div className="upload-section">
          <div className="upload-card">
            <h2>Upload Documents</h2>
            
            <form onSubmit={handleUploadForTask} className="upload-form">
              <div className="form-group">
                <label>Upload File</label>
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  multiple
                  onChange={handleFileSelect}
                />
                {selectedFiles.length > 0 && (
                  <div className="selected-files">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="file-item">
                        <span className="file-name">✓ {file.name}</span>
                        <button 
                          type="button" 
                          onClick={() => removeSelectedFile(index)}
                          className="remove-file-btn"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Document URL</label>
                <input 
                  type="url" 
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://example.com/document.pdf"
                />
                <small>Enter a direct link to the document</small>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief description of the document..."
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading || (selectedFiles.length === 0 && !documentUrl.trim())}
                className="btn btn-primary upload-btn"
              >
                {loading ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>
          </div>

          {/* Attachments List */}
          <div className="attachments-card">
            <h3>Attachments ({taskDocuments.length})</h3>
            {taskDocuments.length === 0 ? (
              <div className="no-attachments">
                <p>No attachments yet</p>
                <small>Upload files or provide a URL to attach documents to this task.</small>
              </div>
            ) : (
              <div className="attachments-list">
                {taskDocuments.map(doc => (
                  <div key={doc.DOCUMENT_ID} className="attachment-item">
                    <div className="attachment-info">
                      <h4>{doc.TITLE}</h4>
                      <div className="attachment-meta">
                        <span className="attachment-status">
                          {getStatusBadge(doc.currentStatus?.STATUS || 'Submitted')}
                        </span>
                        <span className="attachment-date">
                          {formatDate(doc.CREATED_AT)}
                        </span>
                      </div>
                    </div>
                    <div className="attachment-actions">
                      <button 
                        type="button"
                        onClick={() => handleViewDocument(doc)}
                        className="btn btn-outline view-btn"
                      >
                        View
                      </button>
                      {task.STATUS !== 'submitted' && (
                        <button 
                          type="button"
                          onClick={() => handleDeleteAttachment(doc.DOCUMENT_ID)}
                          className="btn btn-danger delete-btn"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document View Modal */}
      {selectedDocument && (
        <DocumentViewModal
          isOpen={viewModalOpen}
          onClose={handleCloseViewModal}
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
          fallbackUrl={selectedDocument.fallbackUrl}
          existingMetadata={undefined}
        />
      )}
    </div>
  )
}
