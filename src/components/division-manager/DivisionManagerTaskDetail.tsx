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
  // Approval history for the current user
  const [approvalHistory, setApprovalHistory] = useState<any[]>([])
  // Local flag: set to true immediately after a successful approval when there are no documents
  const [approvedNoDocs, setApprovedNoDocs] = useState(false)
  
  // Forward modal state
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [forwardRemarks, setForwardRemarks] = useState('')
  const [selectedDivisionManager, setSelectedDivisionManager] = useState<number | null>(null)
  const [divisionManagers, setDivisionManagers] = useState<any[]>([])
  const [forwardTarget, setForwardTarget] = useState<'regional' | 'division' | 'section' | null>(null)

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

  const loadDivisionManagers = async () => {
    if (!user?.SECTION_ID) return
    try {
      // Backend now handles both division ID and section ID
      const response = await apiService.getDivisionManagers(user.SECTION_ID)
      if (response.success) {
        setDivisionManagers(response.data || [])
      }
    } catch (error) {
      console.error('Error loading division managers:', error)
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
    
    // Check if any documents have "Under_Division_Review" status
    const hasDocumentsUnderReview = taskDocuments.some(doc => doc.currentStatus?.STATUS === 'Under_Division_Review')
    
    // Don't show review section if user has already taken action
    if (hasUserAlreadyApproved() || hasUserAlreadyRejected()) {
      return false
    }
    
    // Show review section if documents need review
    return hasDocumentsUnderReview
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

  // Division Manager review handlers
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
      setForwardTarget(null)
      await loadTask()
      await loadTaskDocuments()
      await loadApprovalHistory()
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setProcessingReview(false)
    }
  }

  const handleForwardToDivisionManager = async (targetDivisionManagerId: number) => {
    if (!task) return
    try {
      setProcessingReview(true)
      const response = await apiService.forwardTaskToDivisionManager(task.TASK_ID, forwardRemarks, targetDivisionManagerId)
      if (!response.success) throw new Error(response.error || 'Failed to forward task')
      
      alert('Task forwarded to Division Manager!')
      setForwardRemarks('')
      setShowForwardModal(false)
      setForwardTarget(null)
      setSelectedDivisionManager(null)
      await loadTask()
      await loadTaskDocuments()
      await loadApprovalHistory()
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setProcessingReview(false)
    }
  }

  const handleSendBackToSectionHead = async () => {
    if (!task) return
    if (!forwardRemarks.trim()) {
      alert('Please provide remarks when sending back for revision')
      return
    }
    try {
      setProcessingReview(true)
      const response = await apiService.sendBackToSectionHead(task.TASK_ID, forwardRemarks)
      if (!response.success) throw new Error(response.error || 'Failed to send back to Section Head')
      
      alert('Task sent back to Section Unit Head for revision!')
      setForwardRemarks('')
      setShowForwardModal(false)
      setForwardTarget(null)
      await loadTask()
      await loadTaskDocuments()
      await loadApprovalHistory()
    } catch (error) {
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

            {/* Task Review Section (for Division Manager) */}
            {taskNeedsDivisionReview() && (
              <div className="task-review-section">
                <h3>Review Submission</h3>
                <div className="review-info">
                  <p>This task has been forwarded from Section Unit Head and requires your review. Please review the documents and take appropriate action.</p>
                </div>
                
                <div className="review-form">
                  <div className="form-group">
                    <label>Review Remarks</label>
                    <textarea 
                      value={reviewRemarks}
                      onChange={(e) => setReviewRemarks(e.target.value)}
                      rows={3}
                      placeholder="Add any remarks or feedback..."
                    />
                  </div>
                  
                  <div className="review-actions">
                    <button 
                      type="button"
                      onClick={handleApproveTask}
                      disabled={processingReview}
                      className="btn btn-success"
                    >
                      {processingReview ? 'Processing...' : 'Approve'}
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
                    onClick={() => {
                      setShowForwardModal(true)
                      if (divisionManagers.length === 0) {
                        loadDivisionManagers()
                      }
                    }}
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
                onClick={() => {
                  setShowForwardModal(false)
                  setForwardTarget(null)
                  setSelectedDivisionManager(null)
                }}
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
              
              <div className="forward-options">
                <h4>Forward to:</h4>
                <div className="forward-option-list">
                  <button 
                    type="button"
                    className={`forward-option-btn ${forwardTarget === 'regional' ? 'selected' : ''}`}
                    onClick={() => setForwardTarget('regional')}
                  >
                    <div className="option-icon">🏢</div>
                    <div className="option-content">
                      <div className="option-title">Regional Director</div>
                      <div className="option-description">Forward to Regional Director for final review</div>
                    </div>
                  </button>
                  
                  <button 
                    type="button"
                    className={`forward-option-btn ${forwardTarget === 'division' ? 'selected' : ''}`}
                    onClick={() => {
                      setForwardTarget('division')
                      if (divisionManagers.length === 0) {
                        loadDivisionManagers()
                      }
                    }}
                  >
                    <div className="option-icon">👔</div>
                    <div className="option-content">
                      <div className="option-title">Another Division Manager</div>
                      <div className="option-description">Forward to another Division Manager</div>
                    </div>
                  </button>
                  
                  <button 
                    type="button"
                    className={`forward-option-btn ${forwardTarget === 'section' ? 'selected' : ''}`}
                    onClick={() => setForwardTarget('section')}
                  >
                    <div className="option-icon">↩️</div>
                    <div className="option-content">
                      <div className="option-title">Send Back to Section Head</div>
                      <div className="option-description">Return for revision with feedback</div>
                    </div>
                  </button>
                </div>

                {/* Division Manager Selection */}
                {forwardTarget === 'division' && (
                  <div className="form-group">
                    <label>Select Division Manager</label>
                    <select 
                      value={selectedDivisionManager || ''}
                      onChange={(e) => setSelectedDivisionManager(parseInt(e.target.value))}
                    >
                      <option value="">Choose a Division Manager...</option>
                      {divisionManagers.map(manager => (
                        <option key={manager.USER_ID} value={manager.USER_ID}>
                          {manager.NAME} ({manager.SECTION_NAME})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button"
                onClick={() => {
                  setShowForwardModal(false)
                  setForwardTarget(null)
                  setSelectedDivisionManager(null)
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (forwardTarget === 'regional') {
                    handleForwardToRegional()
                  } else if (forwardTarget === 'division') {
                    if (!selectedDivisionManager) {
                      alert('Please select a Division Manager')
                      return
                    }
                    handleForwardToDivisionManager(selectedDivisionManager)
                  } else if (forwardTarget === 'section') {
                    handleSendBackToSectionHead()
                  }
                }}
                disabled={processingReview || !forwardTarget}
                className="btn btn-primary"
              >
                {processingReview ? 'Forwarding...' : 'Forward Documents'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


