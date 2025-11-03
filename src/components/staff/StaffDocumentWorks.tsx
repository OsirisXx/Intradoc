import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import { DocumentViewModal } from '../common/DocumentViewModal'
import * as Types from '../../types'

export function StaffDocumentWorks() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'assigned' | 'delayed'>('assigned')
  const [assignedTasks, setAssignedTasks] = useState<Types.TaskWithDetails[]>([])
  const [delayedTasks, setDelayedTasks] = useState<Types.TaskWithDetails[]>([])
  const [userDocuments, setUserDocuments] = useState<Types.DocumentWithDetails[]>([])
  
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
    navigate(`/staff/work/${task.TASK_ID}`)
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
                  </tr>
                </thead>
                <tbody>
                  {userDocuments.map(doc => (
                    <tr key={doc.DOCUMENT_ID}>
                      <td style={{ textAlign: 'left' }}>{doc.TITLE}</td>
                      <td>{getStatusBadge(doc.currentStatus?.STATUS || 'Submitted')}</td>
                      <td>{doc.FINGERPRINT_HASH.substring(0, 12)}...</td>
                      <td>{formatDate(doc.CREATED_AT)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

