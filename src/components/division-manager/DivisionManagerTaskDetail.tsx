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

  // Task review state
  const [reviewRemarks, setReviewRemarks] = useState('')
  const [processingReview, setProcessingReview] = useState(false)
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [forwardRemarks, setForwardRemarks] = useState('')
  // Local flag: set to true immediately after a successful approval when there are no documents
  const [approvedNoDocs, setApprovedNoDocs] = useState(false)
  // Approval history for the current user
  const [approvalHistory, setApprovalHistory] = useState<any[]>([])

  useEffect(() => {
    if (taskId && user) {
      loadTask()
      loadTaskDocuments()
      loadApprovalHistory()
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

  const loadApprovalHistory = async () => {
    if (!taskId || !user) return
    try {
      // Get approval history for documents in this task by the current user
      const response = await apiService.getTaskApprovalHistory(parseInt(taskId), user.USER_ID)
      if (response.success) {
        setApprovalHistory(response.data || [])
      }
    } catch (error) {
      console.error('Error loading approval history:', error)
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

  // Task review handlers
  const handleApproveTask = async () => {
    if (!task) return
    
    try {
      setProcessingReview(true)
      const response = await apiService.approveTaskDocuments(task.TASK_ID, false, reviewRemarks)
      
      if (!response.success) throw new Error(response.error || 'Failed to approve task')
      
      alert('Task documents approved successfully!')
      setReviewRemarks('')
      // If there are no documents, mark as approved locally so Forward section can appear
      if (taskDocuments.length === 0) {
        setApprovedNoDocs(true)
      }
      
      // Add a small delay to ensure backend has finished updating
      setTimeout(async () => {
        await loadTask()
        await loadTaskDocuments()
        await loadApprovalHistory()
      }, 500)
    } catch (error) {
      console.error('Approval error:', error)
      alert((error as Error).message)
    } finally {
      setProcessingReview(false)
    }
  }

  const handleRejectTask = async () => {
    if (!task) return
    if (!reviewRemarks.trim()) {
      alert('Please provide remarks for rejection')
      return
    }
    try {
      setProcessingReview(true)
      const response = await apiService.rejectTaskDocuments(task.TASK_ID, reviewRemarks)
      if (!response.success) throw new Error(response.error || 'Failed to reject task')
      
      alert('Task documents rejected')
      setReviewRemarks('')
      await loadTask()
      await loadTaskDocuments()
      await loadApprovalHistory()
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setProcessingReview(false)
    }
  }

  const handleForwardToRegional = async () => {
    if (!task) return
    try {
      setProcessingReview(true)
      const response = await apiService.forwardTaskToRegional(task.TASK_ID, forwardRemarks)
      if (!response.success) throw new Error(response.error || 'Failed to forward task')
      
      alert('Task forwarded to Regional Director!')
      setForwardRemarks('')
      setShowForwardModal(false)
      await loadTask()
      await loadTaskDocuments()
      await loadApprovalHistory()
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setProcessingReview(false)
    }
  }

  // Helper function to check if user has already approved this task
  const hasUserAlreadyApproved = () => {
    if (!user) return false
    
    // Check if current user has any approval records for documents in this task
    return approvalHistory.some(approval => approval.STATUS === 1) // STATUS = 1 means approved
  }

  // Helper function to check if user has already rejected this task
  const hasUserAlreadyRejected = () => {
    if (!user) return false
    
    // Check if current user has any rejection records for documents in this task
    return approvalHistory.some(approval => approval.STATUS === 0) // STATUS = 0 means rejected
  }

  // Helper function to check if task needs division manager review
  const taskNeedsDivisionReview = () => {
    if (!task || !user) return false
    
    // Task must be completed
    if (task.STATUS !== 'completed') {
      return false
    }
    
    // Division Manager should review tasks that were assigned BY them
    // (i.e., where they are ASSIGNED_BY - tasks they assigned to section heads)
    if ((task as any).ASSIGNED_BY !== user.USER_ID) {
      return false
    }
    
    // Don't show review section if user has already approved
    if (hasUserAlreadyApproved()) {
      return false
    }
    
    // Show review section for any completed task assigned BY the division manager
    // This allows reviewing tasks even without documents
    return true
  }

  // Helper function to check if task documents are approved and ready for forwarding
  const taskDocumentsApproved = () => {
    if (!task) return false
    // Task must be completed
    if (task.STATUS !== 'completed') return false
    
    // Check if user has already rejected (don't show forward if rejected)
    const userHasRejected = hasUserAlreadyRejected()
    if (userHasRejected) return false
    
    // Check if user has approved (from approval history) - this is the primary check
    const userHasApproved = hasUserAlreadyApproved()
    
    // For tasks without documents, show forward if user has approved
    if (taskDocuments.length === 0) {
      return userHasApproved || approvedNoDocs
    }
    
    // For tasks with documents, check if all documents are approved OR user has approved
    const allDocumentsApproved = taskDocuments.every(doc => doc.currentStatus?.STATUS === 'Approved')
    
    // Show forward section if either:
    // 1. All documents are approved, OR
    // 2. User has approved (from approval history)
    const canForward = allDocumentsApproved || userHasApproved
    return canForward
  }

  // Helper function to get document status badge
  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'Submitted':
        return <span className="status-badge pending">SUBMITTED</span>
      case 'Under_Division_Review':
        return <span className="status-badge pending">UNDER DIVISION REVIEW</span>
      case 'Under_Regional_Review':
        return <span className="status-badge pending">UNDER REGIONAL REVIEW</span>
      case 'Approved':
        return <span className="status-badge approved">APPROVED</span>
      case 'Rejected':
        return <span className="status-badge rejected">REJECTED</span>
      default:
        return <span className="status-badge draft">{status}</span>
    }
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

            {/* View Submission Section (for Division Manager) */}
            {taskNeedsDivisionReview() && (
              <div className="view-submission-section">
                <h3>View Submission</h3>
                <div className="submission-info">
                  <p>This task has been submitted and requires your review. Please review the documents and take appropriate action.</p>
                </div>
                
                <div className="submission-form">
                  <div className="form-group">
                    <label>Review Remarks (Optional)</label>
                    <textarea 
                      value={reviewRemarks}
                      onChange={(e) => setReviewRemarks(e.target.value)}
                      rows={3}
                      placeholder="Add any remarks or feedback..."
                    />
                  </div>
                </div>
                
                <div className="submission-actions">
                  <button 
                    type="button"
                    onClick={handleApproveTask}
                    disabled={processingReview}
                    className="btn btn-success"
                  >
                    {processingReview ? 'Processing...' : 'Approve Document'}
                  </button>
                  
                  <button 
                    type="button"
                    onClick={handleRejectTask}
                    disabled={processingReview}
                    className="btn btn-danger"
                  >
                    {processingReview ? 'Processing...' : 'Request Revision'}
                  </button>
                </div>
              </div>
            )}

            {/* Approval History Section */}
            {approvalHistory.length > 0 && (
              <div className="approval-history-section">
                <h3>Your Approval History</h3>
                <div className="approval-history-list">
                  {approvalHistory.map((approval, index) => (
                    <div key={approval.APPROVAL_ID || index} className="approval-history-item">
                      <div className="approval-header">
                        <div className={`approval-status ${approval.STATUS === 1 ? 'approved' : 'rejected'}`}>
                          {approval.STATUS === 1 ? '✓ Approved' : '✗ Rejected'}
                        </div>
                        <div className="approval-date">
                          {new Date(approval.DATE_APPROVED).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      {approval.DOCUMENT_TITLE && (
                        <div className="approval-document">
                          Document: {approval.DOCUMENT_TITLE}
                        </div>
                      )}
                      {approval.REMARKS && (
                        <div className="approval-remarks">
                          Remarks: {approval.REMARKS}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Already Actioned Section */}
            {((task as any).ASSIGNED_BY === user?.USER_ID) && task.STATUS === 'completed' && !taskNeedsDivisionReview() && approvalHistory.length === 0 && (
              <div className="already-actioned-section">
                <h3>Task Status</h3>
                <div className="actioned-info">
                  <div className="actioned-icon">ℹ️</div>
                  <div className="actioned-content">
                    <p>This task is completed and ready for review, but you haven't taken any action yet.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Forward Documents Section (appears after approval) */}
            {taskDocumentsApproved() && (
              <div className="forward-documents-section">
                <h3>Forward Documents</h3>
                <div className="forward-info">
                  <p>Documents have been approved. You can now forward them to the next level.</p>
                </div>
                
                <div className="forward-actions">
                  <button 
                    type="button"
                    onClick={() => setShowForwardModal(true)}
                    className="btn btn-primary"
                  >
                    Forward Documents
                  </button>
                </div>
              </div>
            )}
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
                        <span className="attachment-status">
                          {getDocumentStatusBadge(doc.currentStatus?.STATUS || 'Submitted')}
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

      {/* Forward Documents Modal */}
      {showForwardModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Forward Documents</h3>
              <button 
                type="button"
                onClick={() => setShowForwardModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Forward Remarks (Optional)</label>
                <textarea 
                  value={forwardRemarks}
                  onChange={(e) => setForwardRemarks(e.target.value)}
                  rows={3}
                  placeholder="Add any remarks for the forwarded documents..."
                />
              </div>
              
              <div className="forward-info">
                <p>Documents will be forwarded to the Regional Director for final review.</p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button"
                onClick={() => {
                  setShowForwardModal(false)
                  setForwardRemarks('')
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleForwardToRegional}
                disabled={processingReview}
                className="btn btn-primary"
              >
                {processingReview ? 'Forwarding...' : 'Forward to Regional Director'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}