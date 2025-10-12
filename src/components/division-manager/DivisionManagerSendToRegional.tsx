import React, { useState } from 'react'

interface Document {
  id: number
  title: string
  type: 'report' | 'task' | 'proposal' | 'budget'
  createdBy: string
  createdDate: string
  status: 'ready' | 'pending_approval' | 'approved'
}

export function DivisionManagerSendToRegional() {
  const [documents] = useState<Document[]>([
    {
      id: 1,
      title: 'Division Monthly Report - January 2024',
      type: 'report',
      createdBy: 'Engineering Section',
      createdDate: '2024-01-20',
      status: 'approved'
    },
    {
      id: 2,
      title: 'Infrastructure Development Proposal',
      type: 'proposal',
      createdBy: 'Planning Unit',
      createdDate: '2024-01-18',
      status: 'approved'
    },
    {
      id: 3,
      title: 'Q1 Budget Allocation Request',
      type: 'budget',
      createdBy: 'Finance Section',
      createdDate: '2024-01-15',
      status: 'ready'
    },
    {
      id: 4,
      title: 'Equipment Procurement Task',
      type: 'task',
      createdBy: 'Operations Unit',
      createdDate: '2024-01-12',
      status: 'pending_approval'
    }
  ])

  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([])
  const [message, setMessage] = useState('')

  const getTypeIcon = (type: Document['type']) => {
    switch (type) {
      case 'report': return '📊'
      case 'task': return '✅'
      case 'proposal': return '📋'
      case 'budget': return '💰'
      default: return '📄'
    }
  }

  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'ready': return 'status-ready'
      case 'pending_approval': return 'status-pending'
      case 'approved': return 'status-approved'
      default: return 'status-ready'
    }
  }

  const handleDocumentSelect = (documentId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    )
  }

  const handleSendToRegional = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle sending to regional manager logic here
    console.log('Sending to Regional Manager:', {
      documents: selectedDocuments,
      message
    })
  }

  const canSendDocument = (status: Document['status']) => {
    return status === 'approved' || status === 'ready'
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Send to Regional Manager</h1>
        <p>Forward approved reports and tasks to the Regional Manager</p>
      </div>

      <div className="page-content">
        <form onSubmit={handleSendToRegional}>
          <div className="documents-selection">
            <h3>Select Documents to Forward</h3>
            <div className="documents-grid">
              {documents.map((document) => (
                <div 
                  key={document.id} 
                  className={`document-card ${selectedDocuments.includes(document.id) ? 'selected' : ''} ${!canSendDocument(document.status) ? 'disabled' : ''}`}
                  onClick={() => canSendDocument(document.status) && handleDocumentSelect(document.id)}
                >
                  <div className="document-header">
                    <div className="document-icon">{getTypeIcon(document.type)}</div>
                    <div className="document-title-section">
                      <h4>{document.title}</h4>
                      <span className="document-creator">By: {document.createdBy}</span>
                    </div>
                    <span className={`status-badge ${getStatusColor(document.status)}`}>
                      {document.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="document-meta">
                    <span className="document-date">
                      Created: {new Date(document.createdDate).toLocaleDateString()}
                    </span>
                    <span className="document-type">
                      Type: {document.type.charAt(0).toUpperCase() + document.type.slice(1)}
                    </span>
                  </div>

                  {!canSendDocument(document.status) && (
                    <div className="document-note">
                      Cannot send - requires approval first
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {selectedDocuments.length > 0 && (
            <div className="form-group">
              <label htmlFor="message">Message to Regional Manager (Optional)</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Add any additional notes or context for the Regional Manager..."
              />
            </div>
          )}

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={selectedDocuments.length === 0}
            >
              Send to Regional Manager ({selectedDocuments.length} selected)
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
