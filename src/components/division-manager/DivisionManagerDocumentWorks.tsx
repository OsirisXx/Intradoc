import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import * as Types from '../../types'
import { taskUtils } from '../../utils/taskUtils'
import '../section-unit-head/SectionUnitHead.css'

export function DivisionManagerDocumentWorks() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'assigned' | 'delayed'>('assigned')
  const [assignedTasks, setAssignedTasks] = useState<Types.TaskWithDetails[]>([])
  const [delayedTasks, setDelayedTasks] = useState<Types.TaskWithDetails[]>([])
  const [divisionDocuments, setDivisionDocuments] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<Types.TaskWithDetails | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentUrl, setDocumentUrl] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadTasks()
    }
  }, [user])

  const loadTasks = async () => {
    if (!user) return
    try {
      const assignedToResponse = await apiService.getTasksAssignedTo(user.USER_ID)
      const documentsResponse = await apiService.getDocumentsBySection(user.SECTION_ID || 0)

      if (assignedToResponse.success) {
        const allTasksAssignedTo = assignedToResponse.data || []
        const assigned = allTasksAssignedTo.filter((task: any) => task.STATUS !== 'completed' && !isOverdue(task.DUE_DATE))
        const delayed = allTasksAssignedTo.filter((task: any) => task.STATUS !== 'completed' && isOverdue(task.DUE_DATE))
        setAssignedTasks(assigned)
        setDelayedTasks(delayed)
      }

      if (documentsResponse.success) {
        const docs = documentsResponse.data || []
        setDivisionDocuments(docs)
      }
    } catch (error) {
      console.error('Error loading user tasks:', error)
    }
  }

  const handleTaskClick = (task: Types.TaskWithDetails) => {
    setSelectedTask(task)
    setShowUploadModal(true)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
  }

  const handleUploadForTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask || !user) return
    if (!selectedFile && !documentUrl.trim()) {
      alert('Please provide either a file or a document URL')
      return
    }
    try {
      setLoading(true)
      let uploadResponse
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('title', selectedFile.name)
        formData.append('description', description || `Document for task: ${selectedTask.TITLE}`)
        formData.append('categoryId', '1')
        formData.append('requiresApproval', 'true')
        formData.append('uploadedBy', user.USER_ID.toString())
        formData.append('sectionId', (user.SECTION_ID || 0).toString())
        formData.append('fulfillsTaskId', selectedTask.TASK_ID.toString())
        uploadResponse = await apiService.uploadDocument(formData)
      } else {
        alert('Please select a file to upload')
        return
      }
      if (uploadResponse.success) {
        if (selectedTask.STATUS === 'pending') {
          await apiService.updateTaskStatus(selectedTask.TASK_ID, 'in_progress')
        }
        await loadTasks()
        setShowUploadModal(false)
        setSelectedTask(null)
        setSelectedFile(null)
        setDocumentUrl('')
        setDescription('')
        alert('Document uploaded successfully!')
      } else {
        console.error('Upload failed:', uploadResponse.error)
        alert('Upload failed: ' + uploadResponse.error)
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Error uploading document. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="status-badge approved">COMPLETED</span>
      case 'in_progress':
        return <span className="status-badge pending">IN PROGRESS</span>
      case 'pending':
        return <span className="status-badge draft">PENDING</span>
      case 'overdue':
        return <span className="status-badge cancelled">OVERDUE</span>
      default:
        return <span className="status-badge draft">{status.toUpperCase()}</span>
    }
  }

  const getDocumentStatusBadge = (status: string) => {
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
      day: 'numeric'
    })
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  // Get submission status for a task
  const getSubmissionStatus = (task: Types.TaskWithDetails) => {
    return taskUtils.getSubmissionStatus(task);
  };

  return (
    <div className="document-works-page">
      <div className="page-header">
        <h1>DOCUMENT WORKS</h1>
      </div>
      
      <div className="works-container">
        <div className="tasks-section">
          <div className="task-tabs">
            <button 
              className={activeTab === 'assigned' ? 'active' : ''}
              onClick={() => setActiveTab('assigned')}
            >
              ASSIGNED
            </button>
            <button 
              className={activeTab === 'delayed' ? 'active' : ''}
              onClick={() => setActiveTab('delayed')}
            >
              DELAYED
            </button>
          </div>
          
          <div className="task-list-container">
            {(activeTab === 'assigned' ? assignedTasks : delayedTasks).length === 0 ? (
              <div className="empty-state">
                {activeTab === 'assigned' ? 'No assigned tasks' : 'No delayed tasks'}
              </div>
            ) : (
              (activeTab === 'assigned' ? assignedTasks : delayedTasks).map(task => (
                <div key={task.TASK_ID} className="task-list-item" onClick={() => handleTaskClick(task)}>
                  <div className="task-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#019831" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                    </svg>
                  </div>
                  <div className="task-content">
                    <div className="task-title">{task.TITLE}</div>
                    <div className="task-subtitle">{task.DESCRIPTION}</div>
                    {/* Submission Status Badge */}
                    {task.LINKED_DOCUMENT_ID && (
                      <div className="task-submission-status" style={{
                        marginTop: '4px',
                        display: 'inline-block'
                      }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                          backgroundColor: getSubmissionStatus(task) === 'late' ? '#fee2e2' : '#dcfce7',
                          color: getSubmissionStatus(task) === 'late' ? '#991b1b' : '#166534',
                          border: `1px solid ${getSubmissionStatus(task) === 'late' ? '#fecaca' : '#bbf7d0'}`
                        }}>
                          📄 {getSubmissionStatus(task) === 'late' ? 'SUBMITTED LATE' : 'SUBMITTED'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="task-date" style={{
                    color: isOverdue(task.DUE_DATE) ? '#dc2626' : '#019831'
                  }}>
                    {formatDueDate(task.DUE_DATE)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="status-section">
          <div className="status-header">
            <h2 style={{ color: 'white' }}>STATUS</h2>
          </div>
          <div className="status-table">
            {divisionDocuments.length === 0 ? (
              <div className="empty-state">
                No documents submitted yet
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>TITLE</th>
                    <th>STATUS</th>
                    <th>SHA-256</th>
                    <th>SUBMITTED BY</th>
                    <th>CREATED</th>
                  </tr>
                </thead>
                <tbody>
                  {divisionDocuments.map(doc => (
                    <tr key={doc.DOCUMENT_ID}>
                      <td>{doc.TITLE}</td>
                      <td>{getDocumentStatusBadge(doc.currentStatus?.STATUS || 'Submitted')}</td>
                      <td>{doc.FINGERPRINT_HASH.substring(0, 12)}...</td>
                      <td>{doc.CREATED_BY_NAME || `User #${doc.CREATED_BY}` || 'Unknown'}</td>
                      <td>{formatDate(doc.CREATED_AT)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showUploadModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="upload-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Document for Task</h2>
              <button onClick={() => setShowUploadModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="task-summary">
                <h3>{selectedTask.TITLE}</h3>
                <p>{selectedTask.DESCRIPTION}</p>
                <p><strong>Due:</strong> {formatDate(selectedTask.DUE_DATE)}</p>
                <p><strong>Priority:</strong> {selectedTask.PRIORITY}</p>
              </div>
              
              <form onSubmit={handleUploadForTask}>
                <div className="upload-options-note">
                  <p>📌 You can provide a file, a URL, or both</p>
                </div>

                <div className="form-group">
                  <label>Upload File (Optional)</label>
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleFileSelect}
                  />
                  {selectedFile && (
                    <small className="file-selected">✓ Selected: {selectedFile.name}</small>
                  )}
                  {!selectedFile && (
                    <small>Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX</small>
                  )}
                </div>

                <div className="form-group">
                  <label>Document URL (Optional)</label>
                  <input 
                    type="url" 
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                    placeholder="https://example.com/document.pdf"
                  />
                  <small>Enter a direct link to the document (e.g., Google Drive, OneDrive)</small>
                </div>
                
                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Brief description of the document..."
                  />
                </div>
                
                <div className="form-actions">
                  <button type="button" onClick={() => setShowUploadModal(false)}>
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading || (!selectedFile && !documentUrl.trim())}
                  >
                    {loading ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



