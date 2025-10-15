import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import { DocumentViewModal } from '../common/DocumentViewModal'
import * as Types from '../../types'

export default function DivisionManagerTaskDetail() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [task, setTask] = useState<Types.TaskWithDetails | null>(null)
  const [taskDocuments, setTaskDocuments] = useState<Types.DocumentWithDetails[]>([])
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
      // Prefer tasks assigned BY division manager (since viewing others' submissions)
      const byResp = await apiService.getTasksAssignedBy(user.USER_ID)
      let foundTask: any | null = null
      if (byResp.success) {
        const tasksBy = byResp.data || []
        foundTask = tasksBy.find((t: any) => t.TASK_ID.toString() === taskId) || null
      }
      // Fallback to tasks assigned TO (in case viewing own)
      if (!foundTask) {
        const toResp = await apiService.getTasksAssignedTo(user.USER_ID)
        if (toResp.success) {
          const tasksTo = toResp.data || []
          foundTask = tasksTo.find((t: any) => t.TASK_ID.toString() === taskId) || null
        }
      }
      if (foundTask) {
        setTask(foundTask)
      } else {
        navigate('/division-manager/work')
      }
    } catch (error) {
      console.error('Error loading task:', error)
      navigate('/division-manager/work')
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
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
          <button type="button" onClick={() => navigate('/division-manager/work')} className="btn btn-primary">
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
          onClick={() => navigate('/division-manager/work')} 
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
        {/* Left Column - Task Information (read-only) */}
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
                <span>{formatDate(task.DUE_DATE)}</span>
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
                  <span>{(task as any).ASSIGNED_BY_NAME || task.ASSIGNED_BY}</span>
                </div>
              )}
              {task.TAGS && (
                <div className="detail-item">
                  <label>Tags</label>
                  <span className="tags">{task.TAGS}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Attachments only (read-only) */}
        <div className="upload-section">
          <div className="attachments-card">
            <h3>Attachments ({taskDocuments.length})</h3>
            {taskDocuments.length === 0 ? (
              <div className="no-attachments">
                <p>No attachments yet</p>
              </div>
            ) : (
              <div className="attachments-list">
                {taskDocuments.map(doc => (
                  <div key={doc.DOCUMENT_ID} className="attachment-item">
                    <div className="attachment-info">
                      <h4>{doc.TITLE}</h4>
                      <div className="attachment-meta">
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


