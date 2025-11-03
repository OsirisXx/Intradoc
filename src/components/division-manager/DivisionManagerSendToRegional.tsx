import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'

export function DivisionManagerSendToRegional() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([])
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        setLoading(true)
        setError(null)
        const res = await apiService.getDocumentsBySection(user.SECTION_ID || 0)
        if (res.success) {
          setDocuments(res.data || [])
        } else {
          setError(res.error || 'Failed to load documents')
        }
      } catch (e) {
        console.error('Load documents error', e)
        setError('Failed to load documents')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const getTypeIcon = () => {
    return '📄'
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Archived':
        return 'status-approved'
      case 'Under_Regional_Review':
      case 'Under_Division_Review':
        return 'status-pending'
      default:
        return 'status-ready'
    }
  }

  // Eligible documents for sending to regional: submitted/under division review or forwarded to DM, and not yet sent to regional
  const eligibleDocuments = useMemo(() => {
    const list = (documents || []) as any[]
    const filtered = list.filter(doc => {
      const status = (doc as any).CURRENT_STATUS || (doc as any).STATUS
      const type = (doc as any).DOCUMENT_TYPE
      const sentToRegional = (doc as any).FORWARDED_TO_REGIONAL === 1
      return !sentToRegional && (status === 'Submitted' || status === 'Under_Division_Review' || type === 'forwarded')
    })

    // Deduplicate by fingerprint hash, keep latest by DOCUMENT_ID
    const map = new Map<string, any>()
    for (const d of filtered) {
      const key = (d as any).FINGERPRINT_HASH || `id-${d.DOCUMENT_ID}`
      const prev = map.get(key)
      if (!prev || d.DOCUMENT_ID > prev.DOCUMENT_ID) {
        map.set(key, d)
      }
    }
    return Array.from(map.values())
  }, [documents])

  // Already forwarded documents: those sent to regional or under regional review
  const forwardedDocuments = useMemo(() => {
    const list = (documents || []) as any[]
    const filtered = list.filter(doc => {
      const status = (doc as any).CURRENT_STATUS || (doc as any).STATUS
      const sentToRegional = (doc as any).FORWARDED_TO_REGIONAL === 1
      return sentToRegional || status === 'Under_Regional_Review'
    })

    // Deduplicate by fingerprint hash, keep latest by DOCUMENT_ID
    const map = new Map<string, any>()
    for (const d of filtered) {
      const key = (d as any).FINGERPRINT_HASH || `id-${d.DOCUMENT_ID}`
      const prev = map.get(key)
      if (!prev || d.DOCUMENT_ID > prev.DOCUMENT_ID) {
        map.set(key, d)
      }
    }
    return Array.from(map.values())
  }, [documents])

  const handleDocumentSelect = (documentId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    )
  }

  const handleSendToRegional = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedDocuments.length === 0) return
    try {
      setSubmitting(true)
      for (const id of selectedDocuments) {
        await apiService.forwardToRegionalDirector(id, message)
      }
      // Refresh list and clear selection
      setSelectedDocuments([])
      setMessage('')
      const res = await apiService.getDocumentsBySection(user?.SECTION_ID || 0)
      if (res.success) setDocuments(res.data || [])
      alert('Selected documents have been forwarded to the Regional Director')
    } catch (err) {
      console.error('Forward to regional error', err)
      alert('Failed to forward some documents. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Send to Regional Manager</h1>
        <p>Forward approved or under review documents to the Regional Director</p>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : (
          <>
            <form onSubmit={handleSendToRegional}>
              <div className="documents-selection">
                <h3>Select Documents to Forward</h3>
                <div className="documents-grid">
                  {eligibleDocuments.length === 0 ? (
                    <div className="empty-state">No documents available to forward</div>
                  ) : eligibleDocuments.map((doc: any) => (
                    <div 
                      key={doc.DOCUMENT_ID}
                      className={`document-card ${selectedDocuments.includes(doc.DOCUMENT_ID) ? 'selected' : ''}`}
                      onClick={() => handleDocumentSelect(doc.DOCUMENT_ID)}
                    >
                      <div className="document-header">
                        <div className="document-icon">{getTypeIcon()}</div>
                        <div className="document-title-section">
                          <h4>{doc.TITLE}</h4>
                          <span className="document-creator">By: {(doc as any).CREATED_BY_NAME || doc.createdByUser?.NAME || 'Unknown'}</span>
                        </div>
                        <span className={`status-badge ${getStatusBadgeClass((doc as any).CURRENT_STATUS || (doc as any).STATUS)}`}>
                          {((doc as any).CURRENT_STATUS || (doc as any).STATUS || 'Unknown').replaceAll('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="document-meta">
                        <span className="document-date">
                          Created: {new Date(doc.CREATED_AT).toLocaleDateString()}
                        </span>
                        {(doc as any).DOCUMENT_TYPE === 'forwarded' && (
                          <span className="document-type">Forwarded to you</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDocuments.length > 0 && (
                <div className="form-group">
                  <label htmlFor="message">Message to Regional Director (Optional)</label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Add any additional notes or context..."
                  />
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={selectedDocuments.length === 0 || submitting}
                >
                  {submitting ? 'Sending...' : `Send to Regional Director (${selectedDocuments.length} selected)`}
                </button>
              </div>
            </form>

            {/* Already Forwarded Section */}
            <div className="documents-selection" style={{ marginTop: 32 }}>
              <h3>Already Forwarded</h3>
              <div className="documents-grid">
                {forwardedDocuments.length === 0 ? (
                  <div className="empty-state">No documents have been forwarded yet</div>
                ) : forwardedDocuments.map((doc: any) => (
                  <div 
                    key={doc.DOCUMENT_ID}
                    className={`document-card forwarded disabled`}
                    title="Already forwarded to Regional Director"
                  >
                    <div className="document-header">
                      <div className="document-icon">{getTypeIcon()}</div>
                      <div className="document-title-section">
                        <h4>{doc.TITLE}</h4>
                        <span className="document-creator">By: {(doc as any).CREATED_BY_NAME || doc.createdByUser?.NAME || 'Unknown'}</span>
                      </div>
                      <span className={`status-badge ${getStatusBadgeClass((doc as any).CURRENT_STATUS || (doc as any).STATUS)}`}>
                        {((doc as any).CURRENT_STATUS || (doc as any).STATUS || 'Unknown').replaceAll('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="document-meta">
                      <span className="document-date">
                        Created: {new Date(doc.CREATED_AT).toLocaleDateString()}
                      </span>
                      <span className="document-type">Already forwarded</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
