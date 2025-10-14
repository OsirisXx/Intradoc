import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import * as Types from '../../types'
import './SectionUnitHead.css'

export function SectionUnitHeadReports() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Types.DocumentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters and view modes
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'revision_required'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Types.DocumentWithDetails | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewDoc, setReviewDoc] = useState<Types.DocumentWithDetails | null>(null)
  const [feedbackForm, setFeedbackForm] = useState({
    type: '' as string,
    content: '',
  })

  // Load documents submitted by staff in current section
  const loadDocuments = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.getDocumentsBySection(user.SECTION_ID)
      if (response.success) {
        // Filter to show documents submitted by staff (not section heads)
        const staffDocuments = (response.data || []).filter(doc => {
          const submitter = doc.CREATED_BY_ROLE
          return submitter && submitter === 'staff'
        })
        setDocuments(staffDocuments)
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

  // Write feedback on document
  const handleWriteFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedDocument || !user) return
    
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

  useEffect(() => {
    if (user) {
      loadDocuments()
    }
  }, [user])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted': return 'status-pending'
      case 'Under_Section_Review': return 'status-pending'
      case 'Under_Division_Review': return 'status-reviewed'
      case 'Under_Regional_Review': return 'status-reviewed'
      case 'Approved': return 'status-approved'
      case 'Archived': return 'status-approved'
      case 'Rejected': return 'status-rejected'
      case 'Revision_Required': return 'status-revision'
      default: return 'status-pending'
    }
  }

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
      const matchesStatus = filter === 'all' || doc.STATUS === filter
      const matchesCategory = categoryFilter === 'all' || doc.category?.CATEGORY_NAME === categoryFilter
      const matchesSearch = searchTerm === '' || 
        doc.TITLE.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.DESCRIPTION.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.createdByUser?.NAME.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesStatus && matchesCategory && matchesSearch
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'title':
          aValue = a.TITLE.toLowerCase()
          bValue = b.TITLE.toLowerCase()
          break
        case 'status':
          aValue = a.STATUS
          bValue = b.STATUS
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

  // Get unique categories for filter
  const categories = Array.from(new Set(documents.map(doc => doc.category?.CATEGORY_NAME).filter(Boolean)))

  // Document summary
  const documentSummary = {
    total: documents.length,
    pending: documents.filter(d => ['Submitted', 'Under_Section_Review'].includes(d.STATUS)).length,
    approved: documents.filter(d => ['Approved', 'Archived'].includes(d.STATUS)).length,
    rejected: documents.filter(d => d.STATUS === 'Rejected').length,
    revisionRequired: documents.filter(d => d.STATUS === 'Revision_Required').length,
  }

  const getTypeIcon = (categoryName?: string) => {
    switch (categoryName?.toLowerCase()) {
      case 'financial reports': return '💰'
      case 'safety protocols': return '🛡️'
      case 'project updates': return '📊'
      case 'incident reports': return '⚠️'
      case 'training materials': return '📚'
      case 'policy documents': return '📋'
      case 'hr documentation': return '👥'
      case 'it documentation': return '💻'
      case 'compliance reports': return '📋'
      default: return '📄'
    }
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
                <span className="stat-number">{documentSummary.total}</span>
                <span className="stat-label">Total</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{documentSummary.pending}</span>
                <span className="stat-label">Pending</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{documentSummary.approved}</span>
                <span className="stat-label">Approved</span>
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
                <label htmlFor="category-filter">Category</label>
                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
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
            <div key={doc.DOCUMENT_ID} className="document-card">
              <div className="document-header">
                <div className="document-icon">
                  {getTypeIcon(doc.category?.CATEGORY_NAME)}
                </div>
                <div className="document-badges">
                  {getStatusBadge(doc.STATUS)}
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
                    <span>{doc.createdByUser?.NAME || 'Unknown'}</span>
                  </div>
                  <div className="meta-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    <span>{formatDate(doc.CREATED_AT)}</span>
                  </div>
                  {doc.category && (
                    <div className="meta-item">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h18"/>
                        <path d="M5 21V7l8-4v18"/>
                        <path d="M19 21V11l-6-4"/>
                      </svg>
                      <span>{doc.category.CATEGORY_NAME}</span>
                    </div>
                  )}
                  {doc.FILE_SIZE && (
                    <div className="meta-item">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                      </svg>
                      <span>{formatFileSize(doc.FILE_SIZE)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="document-actions">
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setSelectedDocument(doc)
                    setShowFeedbackModal(true)
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    <line x1="10" y1="9" x2="14" y2="9"/>
                    <line x1="10" y1="13" x2="18" y2="13"/>
                  </svg>
                  Give Feedback
                </button>
                
                {doc.FILE_PATH && (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = doc.FILE_PATH
                      link.download = doc.FILE_NAME || doc.TITLE
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
            <div key={doc.DOCUMENT_ID} className="document-list-item">
              <div className="document-list-content">
                <div className="document-list-main">
                  <div className="document-list-header">
                    <h4 className="document-list-title">{doc.TITLE}</h4>
                    {getStatusBadge(doc.STATUS)}
                  </div>
                  <p className="document-list-description">{doc.DESCRIPTION}</p>
                  <div className="document-list-meta">
                    <span>{doc.createdByUser?.NAME || 'Unknown'}</span>
                    <span>•</span>
                    <span>{formatDate(doc.CREATED_AT)}</span>
                    {doc.category && (
                      <>
                        <span>•</span>
                        <span>{doc.category.CATEGORY_NAME}</span>
                      </>
                    )}
                    {doc.FILE_SIZE && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(doc.FILE_SIZE)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="document-list-actions">
                  <button 
                    className="btn btn-primary btn-xs"
                    onClick={() => {
                      setSelectedDocument(doc)
                      setShowFeedbackModal(true)
                    }}
                  >
                    Feedback
                  </button>
                  {doc.FILE_PATH && (
                    <button 
                      className="btn btn-secondary btn-xs"
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = doc.FILE_PATH
                        link.download = doc.FILE_NAME || doc.TITLE
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedDocument && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background:'#ffffff', color:'#1e293b', borderBottom:'1px solid #e2e8f0' }}>
              <h3>Write Feedback</h3>
              <button className="btn-close" onClick={() => setShowFeedbackModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="feedback-target">
                <h4>Document: {selectedDocument.TITLE}</h4>
                <p>Submitted by: {selectedDocument.createdByUser?.NAME}</p>
                <p>Category: {selectedDocument.category?.CATEGORY_NAME}</p>
              </div>
              
              <form onSubmit={handleWriteFeedback}>
                <div className="form-group">
                  <label htmlFor="feedback-type">Feedback Type</label>
                  <input
                    id="feedback-type"
                    list="feedback-types"
                    value={feedbackForm.type}
                    onChange={(e) => setFeedbackForm(prev => ({ ...prev, type: e.target.value }))}
                    placeholder="Type or choose..."
                  />
                  <datalist id="feedback-types">
                    <option value="positive">👍 Positive</option>
                    <option value="constructive">💡 Constructive</option>
                    <option value="action_required">⚠️ Action Required</option>
                    <option value="question">❓ Question</option>
                  </datalist>
                </div>

                <div className="form-group">
                  <label htmlFor="feedback-content">Feedback Content *</label>
                  <textarea
                    id="feedback-content"
                    value={feedbackForm.content}
                    onChange={(e) => setFeedbackForm(prev => ({ 
                      ...prev, 
                      content: e.target.value 
                    }))}
                    rows={6}
                    placeholder="Provide detailed feedback..."
                    required
                  />
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
            </div>
          </div>
        </div>
      )}

      {showReviewModal && reviewDoc && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header" style={{ background:'#ffffff', color:'#1e293b', borderBottom:'1px solid #e2e8f0' }}>
              <h3>Review Document</h3>
              <button className="btn-close" onClick={() => setShowReviewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Title duplicate at top, as per reference */}
              <h4 style={{ marginTop:0 }}>{reviewDoc.TITLE}</h4>
              {/* Primary section: Type and File with actions */}
              {(() => {
                const fileLink = (reviewDoc as any).FILE_LINK || (reviewDoc as any).DOCUMENT_URL || reviewDoc.FILE_PATH || ''
                
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
                
                return (
                  <div className="feedback-target">
                    <p style={{ margin:'4px 0' }}><strong>Type:</strong> 📎 File Upload</p>
                    <p style={{ margin:'4px 0' }}><strong>File:</strong> {fileName || '—'}</p>
                    {fileLink && (
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                        <a className="btn btn-secondary" href={fileLink as string} download>
                          Download File
                        </a>
                        <a className="btn btn-outline" href={fileLink as string} target="_blank" rel="noopener noreferrer">
                          Open in New Tab
                        </a>
                      </div>
                    )}
                  </div>
                )
              })()}

              <div className="form-group" style={{ marginTop:16 }}>
                <label>Submitted by:</label>
                <div>{reviewDoc.createdByUser?.NAME || (reviewDoc as any).CREATED_BY_NAME || (reviewDoc as any).SUBMITTER_NAME || 'Unknown'}</div>
              </div>
              <div className="form-group">
                <label>Date:</label>
                <div>{formatDate(reviewDoc.CREATED_AT)}</div>
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