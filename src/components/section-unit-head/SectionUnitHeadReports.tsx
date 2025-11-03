import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSearchParams } from 'react-router-dom'
import { apiService } from '../../services/api'
import * as Types from '../../types'
import './SectionUnitHead.css'
import { useDialogContext } from '../ui/DialogProvider'

export function SectionUnitHeadReports() {
  const { user } = useAuth()
  const dialog = useDialogContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [documents, setDocuments] = useState<Types.DocumentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters and view modes
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'revision_required'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [multiSelect, setMultiSelect] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Types.DocumentWithDetails | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewDoc, setReviewDoc] = useState<Types.DocumentWithDetails | null>(null)
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'constructive' as 'positive' | 'constructive' | 'action_required' | 'question',
    content: '',
  })
  
  // Approval/Revision modal for Regional Director
  const [processingAction, setProcessingAction] = useState(false)
  const [remarks, setRemarks] = useState('')

  // Load documents submitted by staff in current section
  const loadDocuments = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.getDocumentsBySection(user.SECTION_ID)
      if (response.success) {
        // Role-based filtering
        // - Division Managers: see all section documents (staff + forwarded)
        // - Section Unit Heads: only staff-submitted
        // - Regional Directors: ONLY documents forwarded to regional by division managers
        let filteredDocuments = response.data || [];

        if (user.FUNCTIONAL_ROLE === 'division_manager') {
          filteredDocuments = response.data || [];
        } else if (user.FUNCTIONAL_ROLE === 'regional_director') {
          filteredDocuments = (response.data || []).filter(doc => {
            const status = (doc as any).CURRENT_STATUS || (doc as any).STATUS
            const forwardedToRegional = (doc as any).FORWARDED_TO_REGIONAL === 1
            const forwardedByRole = (doc as any).FORWARDED_BY_ROLE === 'division_manager'
            return forwardedToRegional || status === 'Under_Regional_Review' || forwardedByRole
          })
        } else {
          filteredDocuments = (response.data || []).filter(doc => {
            const submitter = (doc as any).CREATED_BY_ROLE
            return submitter && submitter === 'staff'
          })
        }
        
        setDocuments(filteredDocuments)
      } else {
        setError(response.error || 'Failed to load documents')
        setDocuments([])
      }
    } catch (error) {
      console.error('Error loading documents:', error)
      setError('Failed to load documents')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  // Write feedback on document (for non-Regional Directors)
  const handleWriteFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedDocument || !user) return
    
    // For Regional Directors, use approval/revision flow instead
    if (user.FUNCTIONAL_ROLE === 'regional_director') {
      return
    }
    
    try {
      await apiService.createFeedback({
        recipientId: selectedDocument.CREATED_BY,
        relatedDocumentId: selectedDocument.DOCUMENT_ID,
        type: feedbackForm.type,
        content: feedbackForm.content,
      })

      // Create notification for document submitter
      await apiService.createNotification({
        userId: selectedDocument.CREATED_BY,
        type: 'feedback_received',
        title: 'Feedback on Your Submission',
        message: `${user.NAME} provided feedback on "${selectedDocument.TITLE}"`,
        relatedDocumentId: selectedDocument.DOCUMENT_ID,
        actionUrl: '/staff/feedback',
      })

      // Reset form and close modal
      setFeedbackForm({ type: 'constructive', content: '' })
      setShowFeedbackModal(false)
      setSelectedDocument(null)
      
      alert('Feedback sent successfully!')
    } catch (error) {
      console.error('Error creating feedback:', error)
      alert('Failed to send feedback. Please try again.')
    }
  }

  // Handle document approval (Regional Director - Final Approval)
  const handleApproveDocument = async () => {
    if (!selectedDocument || !user) return
    
    try {
      setProcessingAction(true)
      const response = await apiService.approveDocument(
        selectedDocument.DOCUMENT_ID,
        remarks || 'Approved by Regional Director - Final Approval'
      )
      
      if (response.success) {
        await loadDocuments()
        setShowFeedbackModal(false)
        setSelectedDocument(null)
        setRemarks('')
        alert('Document approved successfully! This is the final approval.')
      } else {
        alert('Failed to approve document: ' + (response.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error approving document:', error)
      alert('Failed to approve document. Please try again.')
    } finally {
      setProcessingAction(false)
    }
  }

  // Handle request revision (Regional Director - Send back to Division Manager)
  const handleRequestRevision = async () => {
    if (!selectedDocument || !user) return
    
    if (!remarks.trim()) {
      alert('Please provide revision instructions/remarks')
      return
    }
    
    try {
      setProcessingAction(true)
      const response = await apiService.requestRevision(
        selectedDocument.DOCUMENT_ID,
        remarks
      )
      
      if (response.success) {
        // Backend handles notification to division manager automatically
        await loadDocuments()
        setShowFeedbackModal(false)
        setSelectedDocument(null)
        setRemarks('')
        alert('Revision requested. The document has been sent back to the Division Manager.')
      } else {
        alert('Failed to request revision: ' + (response.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error requesting revision:', error)
      alert('Failed to request revision. Please try again.')
    } finally {
      setProcessingAction(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadDocuments()
    }
  }, [user])

  // Auto-open modal when documentId is in URL
  useEffect(() => {
    const documentId = searchParams.get('documentId')
    if (documentId && documents.length > 0) {
      const targetDocument = documents.find(doc => doc.DOCUMENT_ID.toString() === documentId)
      if (targetDocument) {
        setReviewDoc(targetDocument)
        setShowReviewModal(true)
        // Clear the URL parameter after opening modal
        setSearchParams({})
      }
    }
  }, [documents, searchParams, setSearchParams])


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Archived':
        return <span className="status-badge approved">APPROVED</span>
      case 'Under_Division_Review':
      case 'Under_Regional_Review':
        return <span className="status-badge pending">UNDER REVIEW</span>
      case 'Under_Section_Review':
      case 'Submitted':
        return <span className="status-badge draft">PENDING REVIEW</span>
      case 'Rejected':
        return <span className="status-badge cancelled">REJECTED</span>
      case 'Revision_Required':
        return <span className="status-badge revision">REVISION REQUIRED</span>
      default:
        return <span className="status-badge draft">{status?.toUpperCase() || 'UNKNOWN'}</span>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Enhanced filtering and sorting
  const filteredAndSortedDocuments = documents
    .filter(doc => {
      const matchesStatus = filter === 'all' || ((doc as any).CURRENT_STATUS || (doc as any).STATUS) === filter
      const matchesSearch = searchTerm === '' || 
        doc.TITLE.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.DESCRIPTION || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((doc as any).CREATED_BY_NAME || doc.createdByUser?.NAME || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesStatus && matchesSearch
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'title':
          aValue = a.TITLE.toLowerCase()
          bValue = b.TITLE.toLowerCase()
          break
        case 'status':
          aValue = (a as any).CURRENT_STATUS || (a as any).STATUS
          bValue = (b as any).CURRENT_STATUS || (b as any).STATUS
          break
        case 'date':
        default:
          aValue = new Date(a.CREATED_AT)
          bValue = new Date(b.CREATED_AT)
          break
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  // Document summary
  const documentSummary = {
    total: documents.length,
    pending: documents.filter(d => ['Submitted', 'Under_Section_Review'].includes((d as any).CURRENT_STATUS || (d as any).STATUS)).length,
    approved: documents.filter(d => ['Approved', 'Archived'].includes((d as any).CURRENT_STATUS || (d as any).STATUS)).length,
    rejected: documents.filter(d => ((d as any).CURRENT_STATUS || (d as any).STATUS) === 'Rejected').length,
    revisionRequired: documents.filter(d => ((d as any).CURRENT_STATUS || (d as any).STATUS) === 'Revision_Required').length,
    forwarded: documents.filter(d => (d as any).DOCUMENT_TYPE === 'forwarded').length,
  }

  const getTypeIcon = () => {
    // Default document icon
    return '📄'
  }

  if (loading) {
    return (
      <div className="section-unit-head-reports">
        <div className="page-header">
          <div className="header-gradient">
            <div className="header-content">
              <div className="header-icon">📊</div>
              <div className="header-text">
                <h1>Staff Reports</h1>
                <p>Review documents submitted by your staff</p>
              </div>
            </div>
          </div>
        </div>
        <div className="loading">Loading documents...</div>
      </div>
    )
  }

  return (
    <div className="section-unit-head-reports">
      <div className="page-header">
        <div className="header-gradient">
          <div className="header-content">
            <div className="header-icon">📊</div>
            <div className="header-text">
              <h1>Staff Reports</h1>
              <p>Review and provide feedback on documents submitted by your staff members</p>
            </div>
            <div className="header-stats">
              <div className="stat-item">
                <span className="stat-number" style={{ color: '#fff' }}>{documentSummary.total}</span>
                <span className="stat-label" style={{ color: '#fff' }}>Total</span>
              </div>
              <div className="stat-item">
                <span className="stat-number" style={{ color: '#fff' }}>{documentSummary.pending}</span>
                <span className="stat-label" style={{ color: '#fff' }}>Pending</span>
              </div>
              <div className="stat-item">
                <span className="stat-number" style={{ color: '#fff' }}>{documentSummary.approved}</span>
                <span className="stat-label" style={{ color: '#fff' }}>Approved</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Summary */}
      <div className="document-summary">
        <div className="summary-grid">
          <div className="summary-card total">
            <div className="card-icon-wrapper">
              <div className="card-icon">📊</div>
            </div>
            <div className="card-content">
              <div className="card-number">{documentSummary.total}</div>
              <div className="card-label">Total Documents</div>
              <div className="card-subtitle">Submitted by staff</div>
            </div>
          </div>
          
          <div className="summary-card pending">
            <div className="card-icon-wrapper">
              <div className="card-icon">⏳</div>
            </div>
            <div className="card-content">
              <div className="card-number">{documentSummary.pending}</div>
              <div className="card-label">Pending Review</div>
              <div className="card-subtitle">
                {documentSummary.pending > 0 ? 'Requires your attention' : 'All reviewed'}
              </div>
            </div>
          </div>
          
          <div className="summary-card approved">
            <div className="card-icon-wrapper">
              <div className="card-icon">✅</div>
            </div>
            <div className="card-content">
              <div className="card-number">{documentSummary.approved}</div>
              <div className="card-label">Approved</div>
              <div className="card-subtitle">
                {documentSummary.total > 0 ? `${Math.round((documentSummary.approved / documentSummary.total) * 100)}% approval rate` : 'No documents yet'}
              </div>
            </div>
          </div>
          
          {documentSummary.forwarded > 0 && (
            <div className="summary-card forwarded">
              <div className="card-icon-wrapper">
                <div className="card-icon">📤</div>
              </div>
              <div className="card-content">
                <div className="card-number">{documentSummary.forwarded}</div>
                <div className="card-label">Forwarded Documents</div>
                <div className="card-subtitle">
                  Documents forwarded to you for review
                </div>
              </div>
            </div>
          )}
          
          <div className="summary-card revision">
            <div className="card-icon-wrapper">
              <div className="card-icon">🔄</div>
            </div>
            <div className="card-content">
              <div className="card-number">{documentSummary.revisionRequired}</div>
              <div className="card-label">Revision Required</div>
              <div className="card-subtitle">
                {documentSummary.revisionRequired > 0 ? 'Needs resubmission' : 'No revisions needed'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="document-controls">
        <div className="controls-container">
          <div className="search-section">
            <div className="search-input-wrapper">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search documents, titles, or submitters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button 
                  className="search-clear"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="filters-row">
            <div className="filters-left">
              <div className="filter-group">
                <label htmlFor="status-filter">Status</label>
                <select
                  id="status-filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="revision_required">Revision Required</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="sort-by">Sort by</label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="filter-select"
                >
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                  <option value="status">Status</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="sort-order">Order</label>
                <select
                  id="sort-order"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="filter-select"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            <div className="filters-right">
              <div className="view-controls">
                <span className="view-label">View:</span>
                <button
                  className={`view-toggle ${viewMode === 'card' ? 'active' : ''}`}
                  onClick={() => setViewMode('card')}
                  title="Card view"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </button>
                <button
                  className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List view"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6"/>
                    <line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/>
                    <line x1="3" y1="12" x2="3.01" y2="12"/>
                    <line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                </button>
              </div>

              {user?.FUNCTIONAL_ROLE === 'regional_director' && (
                <div className="bulk-actions" style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className={`btn ${multiSelect ? 'btn-secondary' : 'btn-outline'}`}
                    onClick={() => { setMultiSelect(v => !v); setSelectedIds([]); }}
                  >
                    {multiSelect ? 'Cancel Select' : 'Multi-select'}
                  </button>
                  {multiSelect && selectedIds.length > 0 && (
                    <button
                      className="btn btn-danger"
                      onClick={async () => {
                        const ok = await dialog.confirm({
                          title: 'Bulk Archive',
                          message: `Archive ${selectedIds.length} selected report(s) from your view?`,
                          type: 'warning',
                          confirmText: 'Archive',
                          cancelText: 'Cancel'
                        })
                        if (!ok) return
                        const resp = await apiService.bulkArchiveDocuments(selectedIds)
                        if (resp.success) {
                          setSelectedIds([])
                          setMultiSelect(false)
                          await loadDocuments()
                        }
                      }}
                    >
                      Bulk Archive
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {error && (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h3>Unable to load documents</h3>
            <p>{error}</p>
            <button onClick={loadDocuments} className="btn btn-primary">
              Try Again
            </button>
          </div>
        </div>
      )}

      {filteredAndSortedDocuments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          </div>
          <h3>No documents found</h3>
          <p>
            {searchTerm || filter !== 'all' || categoryFilter !== 'all'
              ? 'Try adjusting your filters to see more documents.'
              : 'No documents have been submitted by staff yet.'
            }
          </p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="documents-grid">
          {filteredAndSortedDocuments.map(doc => (
            <div key={doc.DOCUMENT_ID} className={`document-card ${(doc as any).DOCUMENT_TYPE === 'forwarded' ? 'forwarded-document' : ''}`}>
              {multiSelect && (
                <div style={{ position:'absolute', top:8, left:8 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(doc.DOCUMENT_ID)}
                    onChange={(e) => {
                      setSelectedIds(prev => e.target.checked ? [...prev, doc.DOCUMENT_ID] : prev.filter(id => id !== doc.DOCUMENT_ID))
                    }}
                  />
                </div>
              )}
              {(doc as any).DOCUMENT_TYPE === 'forwarded' && (
                <div className="forwarded-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16,6 12,2 8,6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                  Forwarded Document
                </div>
              )}
              {(doc as any).DOCUMENT_TYPE === 'forwarded' && (doc as any).FORWARDED_BY_NAME && (
                <div className="forwarded-by-info">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  {(doc as any).FORWARDED_BY_NAME} forwarded this document to you
                </div>
              )}
              <div className="document-header">
                <div className="document-icon">
                  {getTypeIcon()}
                </div>
                <div className="document-badges">
                  {getStatusBadge((doc as any).CURRENT_STATUS || (doc as any).STATUS)}
                </div>
              </div>

              <div className="document-content">
                <h3 className="document-title">{doc.TITLE}</h3>
                <p className="document-description">{doc.DESCRIPTION}</p>
                
                <div className="document-meta">
                  <div className="meta-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>{(doc as any).CREATED_BY_NAME || doc.createdByUser?.NAME || 'Unknown'}</span>
                  </div>
                  <div className="meta-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    <span>{formatDate(doc.CREATED_AT)}</span>
                  </div>
                  {(doc as any).FILE_SIZE && (
                    <div className="meta-item">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                      </svg>
                      <span>{formatFileSize((doc as any).FILE_SIZE)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="document-actions">
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setSelectedDocument(doc)
                    setRemarks('')
                    setShowFeedbackModal(true)
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    <line x1="10" y1="9" x2="14" y2="9"/>
                    <line x1="10" y1="13" x2="18" y2="13"/>
                  </svg>
                  {user?.FUNCTIONAL_ROLE === 'regional_director' ? 'Review' : 'Give Feedback'}
                </button>

                {user?.FUNCTIONAL_ROLE === 'regional_director' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      const ok = await dialog.confirm({
                        title: 'Archive Report',
                        message: `Archive "${doc.TITLE}" from your reports?`,
                        type: 'warning',
                        confirmText: 'Archive',
                        cancelText: 'Cancel'
                      })
                      if (!ok) return
                      const resp = await apiService.archiveDocument(doc.DOCUMENT_ID)
                      if (resp.success) {
                        await loadDocuments()
                      }
                    }}
                  >
                    Archive
                  </button>
                )}
                
                {(doc as any).FILE_PATH && (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = (doc as any).FILE_PATH
                      link.download = (doc as any).FILE_NAME || doc.TITLE
                      link.click()
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download
                  </button>
                )}

                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => { setReviewDoc(doc); setShowReviewModal(true) }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="documents-list">
          {filteredAndSortedDocuments.map(doc => (
            <div key={doc.DOCUMENT_ID} className={`document-list-item ${(doc as any).DOCUMENT_TYPE === 'forwarded' ? 'forwarded-document' : ''}`}>
              {multiSelect && (
                <div style={{ marginRight: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(doc.DOCUMENT_ID)}
                    onChange={(e) => {
                      setSelectedIds(prev => e.target.checked ? [...prev, doc.DOCUMENT_ID] : prev.filter(id => id !== doc.DOCUMENT_ID))
                    }}
                  />
                </div>
              )}
              {(doc as any).DOCUMENT_TYPE === 'forwarded' && (
                <div className="forwarded-indicator">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16,6 12,2 8,6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                  Forwarded
                </div>
              )}
              {(doc as any).DOCUMENT_TYPE === 'forwarded' && (doc as any).FORWARDED_BY_NAME && (
                <div className="forwarded-by-text">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  {(doc as any).FORWARDED_BY_NAME} forwarded this document to you
                </div>
              )}
              <div className="document-list-content">
                <div className="document-list-main">
                  <div className="document-list-header">
                    <h4 className="document-list-title">{doc.TITLE}</h4>
                    {getStatusBadge((doc as any).CURRENT_STATUS || (doc as any).STATUS)}
                  </div>
                  <p className="document-list-description">{doc.DESCRIPTION}</p>
                  <div className="document-list-meta">
                    <span>{(doc as any).CREATED_BY_NAME || doc.createdByUser?.NAME || 'Unknown'}</span>
                    <span>•</span>
                    <span>{formatDate(doc.CREATED_AT)}</span>
                    {(doc as any).FILE_SIZE && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize((doc as any).FILE_SIZE)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="document-list-actions">
                  <button 
                    className="btn btn-primary btn-xs"
                    onClick={() => {
                      setSelectedDocument(doc)
                      setRemarks('')
                      setShowFeedbackModal(true)
                    }}
                  >
                    {user?.FUNCTIONAL_ROLE === 'regional_director' ? 'Review' : 'Feedback'}
                  </button>
                  {(doc as any).FILE_PATH && (
                    <button 
                      className="btn btn-secondary btn-xs"
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = (doc as any).FILE_PATH
                        link.download = (doc as any).FILE_NAME || doc.TITLE
                        link.click()
                      }}
                    >
                      Download
                    </button>
                  )}
                  <button 
                    className="btn btn-outline btn-xs"
                    onClick={() => { setReviewDoc(doc); setShowReviewModal(true) }}
                  >
                    Review
                  </button>
                  {user?.FUNCTIONAL_ROLE === 'regional_director' && (
                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={async () => {
                        const ok = await dialog.confirm({
                          title: 'Archive Report',
                          message: `Archive "${doc.TITLE}" from your reports?`,
                          type: 'warning',
                          confirmText: 'Archive',
                          cancelText: 'Cancel'
                        })
                        if (!ok) return
                        const resp = await apiService.archiveDocument(doc.DOCUMENT_ID)
                        if (resp.success) {
                          await loadDocuments()
                        }
                      }}
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Modal / Approval Modal */}
      {showFeedbackModal && selectedDocument && (
        <div className="modal-overlay" onClick={() => !processingAction && setShowFeedbackModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:18 }}>
                  {user?.FUNCTIONAL_ROLE === 'regional_director' ? '✅' : '💬'}
                </span>
                <h3 style={{ margin:0 }}>
                  {user?.FUNCTIONAL_ROLE === 'regional_director' ? 'Review Document' : 'Write Feedback'}
                </h3>
              </div>
              <button 
                className="btn-close" 
                onClick={() => !processingAction && setShowFeedbackModal(false)}
                disabled={processingAction}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {/* Document summary */}
              <div className="review-section" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:12 }}>
                <div className="form-group" style={{ marginTop:0 }}>
                  <label>Document</label>
                  <div>{selectedDocument.TITLE}</div>
                </div>
                <div className="form-group" style={{ marginTop:0 }}>
                  <label>Submitted by</label>
                  <div>{selectedDocument.createdByUser?.NAME || (selectedDocument as any).CREATED_BY_NAME || 'Unknown'}</div>
                </div>
                {(selectedDocument as any).FORWARDED_BY_NAME && (
                  <div className="form-group" style={{ marginTop:0 }}>
                    <label>Forwarded by</label>
                    <div>{(selectedDocument as any).FORWARDED_BY_NAME}</div>
                  </div>
                )}
              </div>
              
              {user?.FUNCTIONAL_ROLE === 'regional_director' ? (
                // Regional Director: Approval/Revision Modal
                <div>
                  <div className="form-group">
                    <label htmlFor="review-remarks">Remarks (Optional)</label>
                    <textarea
                      id="review-remarks"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={4}
                      placeholder="Add any remarks or comments..."
                      disabled={processingAction}
                    />
                  </div>
                  
                  <div style={{ 
                    marginTop: 16, 
                    padding: 16, 
                    background: '#f8fafc', 
                    borderRadius: 8,
                    border: '1px solid #e2e8f0'
                  }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
                      <strong>Note:</strong> As Regional Director, your approval will be the <strong>final approval</strong> for this document. 
                      If you request revision, the document will be sent back to the Division Manager.
                    </p>
                  </div>
                  
                  <div className="modal-footer" style={{ marginTop: 24 }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        if (!processingAction) {
                          setShowFeedbackModal(false)
                          setSelectedDocument(null)
                          setRemarks('')
                        }
                      }}
                      disabled={processingAction}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      className="btn btn-danger"
                      onClick={handleRequestRevision}
                      disabled={processingAction}
                    >
                      {processingAction ? 'Processing...' : 'Request Revision'}
                    </button>
                    <button 
                      type="button"
                      className="btn btn-success"
                      onClick={handleApproveDocument}
                      disabled={processingAction}
                    >
                      {processingAction ? 'Processing...' : 'Approve (Final Approval)'}
                    </button>
                  </div>
                </div>
              ) : (
                // Other roles: Feedback Form
                <form onSubmit={handleWriteFeedback}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:16 }}>
                    <div className="form-group">
                      <label htmlFor="feedback-type">Feedback Type</label>
                      <input
                        id="feedback-type"
                        list="feedback-types"
                        value={feedbackForm.type}
                        onChange={(e) => setFeedbackForm(prev => ({ ...prev, type: e.target.value as 'positive' | 'constructive' | 'action_required' | 'question' }))}
                        placeholder="Type or choose..."
                      />
                      <datalist id="feedback-types">
                        <option value="positive">👍 Positive</option>
                        <option value="constructive">💡 Constructive</option>
                        <option value="action_required">⚠️ Action Required</option>
                        <option value="question">❓ Question</option>
                      </datalist>
                    </div>

                    <div className="form-group" style={{ gridColumn:'2 / -1' }}>
                      <label htmlFor="feedback-content">Feedback Content *</label>
                      <textarea
                        id="feedback-content"
                        value={feedbackForm.content}
                        onChange={(e) => setFeedbackForm(prev => ({ 
                          ...prev, 
                          content: e.target.value 
                        }))}
                        rows={6}
                        placeholder="Provide detailed, actionable feedback..."
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setShowFeedbackModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Send Feedback
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {showReviewModal && reviewDoc && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:18 }}>📝</span>
                <h3 style={{ margin:0 }}>Review Document</h3>
              </div>
              <button className="btn-close" onClick={() => setShowReviewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Title */}
              <h4 style={{ marginTop:0 }}>{reviewDoc.TITLE}</h4>
              
              {/* Meta grid */}
              <div className="review-section" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div className="form-group" style={{ marginTop:0 }}>
                  <label>Submitted by</label>
                  <div>{reviewDoc.createdByUser?.NAME || (reviewDoc as any).CREATED_BY_NAME || (reviewDoc as any).SUBMITTER_NAME || 'Unknown'}</div>
                </div>
                <div className="form-group" style={{ marginTop:0 }}>
                  <label>Date</label>
                  <div>{formatDate(reviewDoc.CREATED_AT)}</div>
                </div>
              </div>

              {/* File details and actions */}
              <div className="review-section">
                <p style={{ margin:'4px 0' }}><strong>Type:</strong> 📎 File Upload</p>
                <p style={{ margin:'4px 0' }}><strong>File:</strong> {(() => {
                  const fileLink = (reviewDoc as any).FILE_LINK || (reviewDoc as any).DOCUMENT_URL || (reviewDoc as any).FILE_PATH || ''
                  
                  // Extract just the filename from the file link
                  let fileName = ''
                  if (fileLink) {
                    // Extract filename from file link - handle both absolute paths and URLs
                    if (fileLink.startsWith('http://') || fileLink.startsWith('https://')) {
                      // It's a URL
                      try {
                        const url = new URL(fileLink)
                        const pathSegments = url.pathname.split('/').filter(Boolean)
                        fileName = pathSegments.length > 0 ? decodeURIComponent(pathSegments[pathSegments.length - 1]) : ''
                      } catch {
                        fileName = decodeURIComponent((fileLink as string).split('/').pop() || '')
                      }
                    } else {
                      // It's a file path (absolute or relative)
                      fileName = fileLink.split(/[/\\]/).pop() || fileLink
                      // Remove any URL encoding if present
                      try {
                        fileName = decodeURIComponent(fileName)
                      } catch {
                        // If decode fails, use the original
                      }
                    }
                  }
                  return fileName || '—'
                })()}</p>
                {(() => {
                  const fileLink = (reviewDoc as any).FILE_LINK || (reviewDoc as any).DOCUMENT_URL || (reviewDoc as any).FILE_PATH || ''
                  return fileLink && (
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                      <a className="btn btn-secondary" href={fileLink as string} download>
                        Download File
                      </a>
                      <a className="btn btn-outline" href={fileLink as string} target="_blank" rel="noopener noreferrer">
                        Open in New Tab
                      </a>
                    </div>
                  )
                })()}
              </div>

              {reviewDoc.DESCRIPTION && (
                <div className="form-group">
                  <label>Description</label>
                  <div style={{whiteSpace:'pre-wrap'}}>{reviewDoc.DESCRIPTION}</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowReviewModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setSelectedDocument(reviewDoc); setShowFeedbackModal(true); setShowReviewModal(false); }}>Give Feedback</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}