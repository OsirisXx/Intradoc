import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import { DocumentViewModal } from '../common/DocumentViewModal'
import * as Types from '../../types'

export function StaffDocumentWorks() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'assigned' | 'delayed'>('assigned')
  const [assignedTasks, setAssignedTasks] = useState<Types.TaskWithDetails[]>([])
  const [delayedTasks, setDelayedTasks] = useState<Types.TaskWithDetails[]>([])
  const [userDocuments, setUserDocuments] = useState<Types.DocumentWithDetails[]>([])
  const [selectedTask, setSelectedTask] = useState<Types.TaskWithDetails | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentUrl, setDocumentUrl] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Document view modal state
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<{ id: number; title: string; fallbackUrl?: string } | null>(null)

  useEffect(() => {
    if (user) {
      loadTasks()
      loadDocuments()
    }
  }, [user])

  const loadTasks = async () => {
    if (!user) return
    
    try {
      const response = await apiService.getTasksAssignedTo(user.USER_ID)
      if (response.success) {
        const allTasks = response.data || []
        
        // Filter assigned (not completed, not overdue)
        const assigned = allTasks.filter(task => 
          task.STATUS !== 'completed' && 
          !isOverdue(task.DUE_DATE)
        )
        
        // Filter delayed (overdue and not completed)
        const delayed = allTasks.filter(task =>
          task.STATUS !== 'completed' &&
          isOverdue(task.DUE_DATE)
        )
        
        setAssignedTasks(assigned)
        setDelayedTasks(delayed)
      }
    } catch (error) {
      console.error('Error loading user tasks:', error)
    }
  }

  const loadDocuments = async () => {
    if (!user) return
    
    try {
      console.log('Loading documents for user:', user.USER_ID)
      const response = await apiService.getDocuments(user.USER_ID)
      console.log('Documents API response:', response)
      
      if (response.success) {
        // Filter to show only user's documents
        const userDocs = response.data?.filter(doc => 
          doc.CREATED_BY === user.USER_ID
        ) || []
        console.log('Filtered user documents:', userDocs)
        setUserDocuments(userDocs)
      } else {
        console.error('Failed to load documents:', response.error)
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }

  const handleTaskClick = (task: Types.TaskWithDetails) => {
    // Check if task already has a linked document
    if (task.LINKED_DOCUMENT_ID && task.linkedDocument) {
      // Show the existing submission with metadata
      setSelectedDocument({
        id: task.linkedDocument.DOCUMENT_ID || task.LINKED_DOCUMENT_ID,
        title: task.linkedDocument.TITLE || task.TITLE,
        fallbackUrl: task.linkedDocument.FILE_LINK,
        metadata: {
          documentId: task.linkedDocument.DOCUMENT_ID,
          title: task.linkedDocument.TITLE,
          createdBy: task.linkedDocument.CREATED_BY_NAME || 'System User',
          createdAt: task.linkedDocument.CREATED_AT,
          submissionType: 'file',
          sha256Hash: task.linkedDocument.FINGERPRINT_HASH,
          fileInfo: {
            name: task.linkedDocument.TITLE,
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          }
        }
      })
      setViewModalOpen(true)
    } else {
      // Allow upload
      setSelectedTask(task)
      setShowUploadModal(true)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
  }

  const handleViewDocument = (document: Types.DocumentWithDetails) => {
    setSelectedDocument({
      id: document.DOCUMENT_ID,
      title: document.TITLE,
      fallbackUrl: document.FILE_LINK,
      metadata: {
        documentId: document.DOCUMENT_ID,
        title: document.TITLE,
        createdBy: document.CREATED_BY_NAME || 'System User',
        createdAt: document.CREATED_AT,
        submissionType: 'file',
        sha256Hash: document.FINGERPRINT_HASH,
        fileInfo: {
          name: document.TITLE,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
      }
    })
    setViewModalOpen(true)
  }

  const handleCloseViewModal = () => {
    setViewModalOpen(false)
    setSelectedDocument(null)
  }

  const handleUploadForTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask || !user) return
    
    // Validate that at least one option is provided
    if (!selectedFile && !documentUrl.trim()) {
      alert('Please provide either a file or a document URL')
      return
    }
    
    try {
      setLoading(true)
      
      let uploadResponse
      
      if (selectedFile) {
        // File upload (with or without URL)
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('title', selectedTask.TITLE)
        formData.append('description', description)
        formData.append('category', '')
        formData.append('tags', selectedTask.TAGS || '')
        formData.append('uploadedBy', user.USER_ID.toString())
        formData.append('sectionId', user.SECTION_ID.toString())
        formData.append('fulfillsTaskId', selectedTask.TASK_ID.toString())
        
        // If URL is also provided, add it as additional info
        if (documentUrl.trim()) {
          formData.append('documentUrl', documentUrl)
        }
        
        console.log('Uploading document file for task:', selectedTask.TITLE)
        uploadResponse = await apiService.uploadDocument(formData)
      } else {
        // URL only upload
        console.log('Uploading document URL for task:', selectedTask.TITLE)
        uploadResponse = await apiService.uploadDocumentWithUrl({
          title: selectedTask.TITLE,
          description: description,
          documentUrl: documentUrl,
          category: '',
          tags: selectedTask.TAGS || '',
          uploadedBy: user.USER_ID,
          sectionId: user.SECTION_ID,
          fulfillsTaskId: selectedTask.TASK_ID
        })
      }
      
      if (uploadResponse.success) {
        // Update task status to in_progress
        await apiService.updateTaskStatus(selectedTask.TASK_ID, 'in_progress')
        
        // Refresh data
        await loadTasks()
        await loadDocuments()
        
        // Close modal and reset form
        setShowUploadModal(false)
        setSelectedTask(null)
        setSelectedFile(null)
        setDocumentUrl('')
        setDescription('')
        
        alert('Document uploaded successfully!')
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Error uploading document')
    } finally {
      setLoading(false)
    }
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
      day: 'numeric'
    })
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="document-works-page">
      {/* Green banner header */}
      <div className="page-header">
        <h1>DOCUMENT WORKS</h1>
      </div>
      
      {/* Two-column layout */}
      <div className="works-container">
        {/* LEFT COLUMN: Tasks */}
        <div className="tasks-section">
          {/* Tab buttons */}
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
          
          {/* Task list */}
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
        
        {/* RIGHT COLUMN: Status Table */}
        <div className="status-section">
          <div className="status-header">
            <h2 style={{ color: 'white' }}>STATUS</h2>
          </div>
          <div className="status-table">
            {userDocuments.length === 0 ? (
              <div className="empty-state">
                No documents uploaded yet
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>TITLE</th>
                    <th>STATUS</th>
                    <th>SHA-256</th>
                    <th>CREATED</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {userDocuments.map(doc => (
                    <tr key={doc.DOCUMENT_ID}>
                      <td>{doc.TITLE}</td>
                      <td>{getStatusBadge(doc.currentStatus?.STATUS || 'Submitted')}</td>
                      <td>{doc.FINGERPRINT_HASH.substring(0, 12)}...</td>
                      <td>{formatDate(doc.CREATED_AT)}</td>
                      <td>
                        <button 
                          className="view-document-btn"
                          onClick={() => handleViewDocument(doc)}
                          title="View document"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                          </svg>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="upload-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Document for Task</h2>
              <button onClick={() => setShowUploadModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Task Info */}
              <div className="task-summary">
                <h3>{selectedTask.TITLE}</h3>
                <p>{selectedTask.DESCRIPTION}</p>
                <p><strong>Due:</strong> {formatDate(selectedTask.DUE_DATE)}</p>
                <p><strong>Priority:</strong> {selectedTask.PRIORITY}</p>
              </div>
              
              {/* Upload Form */}
              <form onSubmit={handleUploadForTask}>
                <div className="upload-options-note">
                  <p>📌 You can provide a file, a URL, or both</p>
                </div>

                {/* File Upload Field */}
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

                {/* URL Field */}
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

      {/* Document View Modal */}
      {selectedDocument && (
        <DocumentViewModal
          isOpen={viewModalOpen}
          onClose={handleCloseViewModal}
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
          fallbackUrl={selectedDocument.fallbackUrl}
          existingMetadata={selectedDocument.metadata}
        />
      )}
    </div>
  )
}

