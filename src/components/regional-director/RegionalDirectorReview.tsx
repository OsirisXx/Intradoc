import { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Table } from '../ui/Table'
import { apiService } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import * as Types from '../../types'

export function RegionalDirectorReview() {
  const { user } = useAuth()
  const [pendingApprovals, setPendingApprovals] = useState<Types.DocumentWithDetails[]>([])
  const [archivedDocuments, setArchivedDocuments] = useState<Types.DocumentWithDetails[]>([])
  const [forwardedDocuments, setForwardedDocuments] = useState<Types.DocumentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'review' | 'forwarded' | 'archive'>('review')
  
  // Modal states
  const [showActionModal, setShowActionModal] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Types.DocumentWithDetails | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'request_revision'>('approve')
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const [approvalsRes, documentsRes, forwardedRes] = await Promise.all([
        apiService.getPendingApprovalsForRole(user.USER_ID, 'regional_director'),
        apiService.getDocuments(user.USER_ID),
        apiService.getForwardedDocuments()
      ])
      
      if (approvalsRes.success) {
        setPendingApprovals(approvalsRes.data || [])
      }
      
      if (documentsRes.success) {
        const archived = documentsRes.data?.filter(doc => doc.currentStatus?.STATUS === 'Archived') || []
        setArchivedDocuments(archived)
      }

      if (forwardedRes.success) {
        setForwardedDocuments(forwardedRes.data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedDocument) return

    try {
      setProcessing(selectedDocument.DOCUMENT_ID)
      let response: Types.ApiResponse<void>

      if (actionType === 'approve') {
        response = await apiService.approveDocument(selectedDocument.DOCUMENT_ID, remarks || 'Final approval by Regional Director')
      } else {
        response = await apiService.requestRevision(selectedDocument.DOCUMENT_ID, remarks)
      }

      if (response.success) {
        if (actionType === 'approve') {
          // Move to archived documents
          setArchivedDocuments(prev => [...prev, selectedDocument])
        }
        
        // Remove from pending approvals
        setPendingApprovals(prev => 
          prev.filter(approval => approval.DOCUMENT_ID !== selectedDocument.DOCUMENT_ID)
        )
        
        setShowActionModal(false)
        setSelectedDocument(null)
        setRemarks('')
        alert(`Document ${actionType === 'approve' ? 'approved and archived' : 'sent for revision'} successfully!`)
      } else {
        alert('Error processing action: ' + response.error)
      }
    } catch (error) {
      console.error('Error processing action:', error)
      alert('Error processing action')
    } finally {
      setProcessing(null)
    }
  }

  const openActionModal = (document: Types.DocumentWithDetails, action: 'approve' | 'request_revision') => {
    setSelectedDocument(document)
    setActionType(action)
    setShowActionModal(true)
    setRemarks('')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Under_Regional_Review': return <Badge color="blue">Regional Review</Badge>
      case 'Approved': return <Badge color="green">Approved</Badge>
      case 'Archived': return <Badge color="blue">Archived</Badge>
      case 'Revision_Required': return <Badge color="red">Revision Required</Badge>
      default: return <Badge color="blue">{status}</Badge>
    }
  }


  const getCompleteApprovalHistory = (document: Types.DocumentWithDetails) => {
    const approvals = document.approvals || []
    const history = []
    
    const sectionApproval = approvals.find(a => a.ROLE === 2)
    if (sectionApproval) {
      const userName = (sectionApproval as Types.DocumentApprovalWithDetails).user?.NAME || `User ${sectionApproval.USER_ID}`
      history.push(`Section: ${userName} (${new Date(sectionApproval.DATE_APPROVED || '').toLocaleDateString()})`)
    }
    
    const divisionApproval = approvals.find(a => a.ROLE === 3)
    if (divisionApproval) {
      const userName = (divisionApproval as Types.DocumentApprovalWithDetails).user?.NAME || `User ${divisionApproval.USER_ID}`
      history.push(`Division: ${userName} (${new Date(divisionApproval.DATE_APPROVED || '').toLocaleDateString()})`)
    }
    
    return history.length > 0 ? history.join(' → ') : 'No approval history'
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Regional Review & Archive</h1>
        <p className="muted">Loading data...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Regional Review & Archive</h1>
        <p>Final approval and archival of documents from all divisions</p>
      </div>

      <div className="page-content">
        {/* Tab Navigation */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ borderBottom: '1px solid #e5e7eb' }}>
            <button
              className={`tab ${activeTab === 'review' ? 'active' : ''}`}
              onClick={() => setActiveTab('review')}
              style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              Pending Review ({pendingApprovals.length})
            </button>
            <button
              className={`tab ${activeTab === 'forwarded' ? 'active' : ''}`}
              onClick={() => setActiveTab('forwarded')}
              style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              Forwarded Documents ({forwardedDocuments.length})
            </button>
            <button
              className={`tab ${activeTab === 'archive' ? 'active' : ''}`}
              onClick={() => setActiveTab('archive')}
              style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              Archived Documents ({archivedDocuments.length})
            </button>
          </div>
        </div>

        {activeTab === 'review' && (
          <>
            <Card title="Pending Regional Reviews">
              {pendingApprovals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  <p>No documents pending regional review</p>
                </div>
              ) : (
                <Table
                  columns={["Document", "Division", "Approval Chain", "Status", "Time in Stage", "Actions"]}
                  rows={pendingApprovals.map(document => [
                    <div>
                      <div style={{ fontWeight: 600 }}>{document.TITLE}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {document.DESCRIPTION}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                        SHA: {document.FINGERPRINT_HASH.substring(0, 16)}...
                      </div>
                    </div>,
                    <div>
                      <div style={{ fontWeight: 500 }}>{document.section?.NAME}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Created by: {document.createdByUser?.NAME}
                      </div>
                    </div>,
                    <div style={{ fontSize: 12 }}>
                      {getCompleteApprovalHistory(document)}
                    </div>,
                    getStatusBadge(document.currentStatus?.STATUS || 'Under_Regional_Review'),
                    <Badge color="green">
                      Recent
                    </Badge>,
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        className="btn btn-sm btn-success"
                        onClick={() => openActionModal(document, 'approve')}
                        disabled={processing === document.DOCUMENT_ID}
                      >
                        Approve & Archive
                      </button>
                      <button 
                        className="btn btn-sm btn-warning"
                        onClick={() => openActionModal(document, 'request_revision')}
                        disabled={processing === document.DOCUMENT_ID}
                      >
                        Request Revision
                      </button>
                    </div>
                  ])}
                />
              )}
            </Card>

            <Card title="Regional Review Guidelines">
              <div style={{ fontSize: 14 }}>
                <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>🎯 Final Authority Review</div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    <li>Regional compliance and policy adherence</li>
                    <li>Strategic alignment with regional objectives</li>
                    <li>Resource impact assessment</li>
                    <li>Final quality and completeness check</li>
                  </ul>
                </div>
                <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>📋 Approval Chain Verification</div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    <li>Verify Section Head approval and feedback</li>
                    <li>Verify Division Manager approval and forwarding</li>
                    <li>Ensure all required documentation is complete</li>
                    <li>Confirm compliance with regional standards</li>
                  </ul>
                </div>
                <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>⏱️ Review Timeline</div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    <li><strong>Green:</strong> Under 48 hours - Good response time</li>
                    <li><strong>Yellow:</strong> 48-72 hours - Review soon</li>
                    <li><strong>Red:</strong> Over 72 hours - Priority review needed</li>
                  </ul>
                </div>
              </div>
            </Card>
          </>
        )}

        {activeTab === 'forwarded' && (
          <Card title="Forwarded Documents">
            {forwardedDocuments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <p>No documents have been forwarded to you yet</p>
              </div>
            ) : (
              <Table
                columns={["Document", "Division", "Forwarded By", "Forward Date", "Status", "Actions"]}
                rows={forwardedDocuments.map(document => [
                  <div>
                    <div style={{ fontWeight: 600 }}>{document.TITLE}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {document.DESCRIPTION}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                      SHA: {document.FINGERPRINT_HASH.substring(0, 16)}...
                    </div>
                  </div>,
                  <div>
                    <div style={{ fontWeight: 500 }}>{document.section?.NAME}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Created by: {document.createdByUser?.NAME}
                    </div>
                  </div>,
                  <div>
                    <div style={{ fontWeight: 500 }}>{document.assignedUser?.NAME}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {document.assignedUser?.FUNCTIONAL_ROLE.replace('_', ' ')}
                    </div>
                  </div>,
                  <div style={{ fontSize: 12 }}>
                    {document.FORWARDED_AT ? new Date(document.FORWARDED_AT).toLocaleDateString() : 'N/A'}
                  </div>,
                  getStatusBadge(document.currentStatus?.STATUS || 'Under_Regional_Review'),
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        // Move to review tab and select this document
                        setActiveTab('review')
                        // You could add logic here to highlight the specific document
                      }}
                    >
                      Review
                    </button>
                    <button className="btn btn-sm btn-outline-secondary">
                      View Details
                    </button>
                  </div>
                ])}
              />
            )}
          </Card>
        )}

        {activeTab === 'archive' && (
          <Card title="Archived Documents">
            {archivedDocuments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <p>No documents archived yet</p>
              </div>
            ) : (
              <Table
                columns={["Document", "Division", "Approval Chain", "Archived Date", "SHA-256"]}
                rows={archivedDocuments.map(document => [
                  <div>
                    <div style={{ fontWeight: 600 }}>{document.TITLE}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {document.DESCRIPTION}
                    </div>
                  </div>,
                  <div>
                    <div style={{ fontWeight: 500 }}>{document.section?.NAME}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Created by: {document.createdByUser?.NAME}
                    </div>
                  </div>,
                  <div style={{ fontSize: 12 }}>
                    {getCompleteApprovalHistory(document)}
                  </div>,
                  <div style={{ fontSize: 12 }}>
                    {new Date(document.currentStatus?.CREATED_AT || '').toLocaleDateString()}
                  </div>,
                  <code style={{ fontSize: 11 }}>
                    {document.FINGERPRINT_HASH.substring(0, 16)}...
                  </code>
                ])}
              />
            )}
          </Card>
        )}

        <Card title="Regional Summary">
          <div style={{ fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span>Documents pending regional review</span>
              <Badge color="blue">{pendingApprovals.length}</Badge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span>Documents forwarded to you</span>
              <Badge color="blue">{forwardedDocuments.length}</Badge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span>Documents archived this month</span>
              <Badge color="green">{archivedDocuments.length}</Badge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span>Average regional review time</span>
              <Badge color="green">32 hours</Badge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Regional compliance rate</span>
              <Badge color="green">98%</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Modal */}
      {showActionModal && selectedDocument && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 8,
            width: '90%',
            maxWidth: 500,
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: 16 }}>
              {actionType === 'approve' && 'Approve & Archive Document'}
              {actionType === 'request_revision' && 'Request Revision'}
            </h3>
            
            <div style={{ marginBottom: 16 }}>
              <strong>Document:</strong> {selectedDocument.TITLE}
            </div>
            
            <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 4 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                <strong>Approval Chain:</strong> {getCompleteApprovalHistory(selectedDocument)}
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>
                {actionType === 'approve' && 'Final Approval Remarks (Optional)'}
                {actionType === 'request_revision' && 'Revision Instructions *'}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
                placeholder={
                  actionType === 'approve' 
                    ? 'Optional final approval comments...'
                    : 'Please provide specific instructions for revision...'
                }
                required={actionType === 'request_revision'}
              />
            </div>

            {actionType === 'approve' && (
              <div style={{ marginBottom: 16, padding: 12, background: '#fef3c7', borderRadius: 4, border: '1px solid #f59e0b' }}>
                <div style={{ fontSize: 12, color: '#92400e' }}>
                  ⚠️ <strong>Warning:</strong> Once approved and archived, this document will be permanently stored and cannot be modified.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowActionModal(false)}
                disabled={processing !== null}
              >
                Cancel
              </button>
              <button 
                className={`btn ${
                  actionType === 'approve' ? 'btn-success' : 'btn-warning'
                }`}
                onClick={handleAction}
                disabled={processing !== null || (actionType === 'request_revision' && !remarks.trim())}
              >
                {processing !== null ? 'Processing...' : 
                  actionType === 'approve' ? 'Approve & Archive' : 'Request Revision'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
