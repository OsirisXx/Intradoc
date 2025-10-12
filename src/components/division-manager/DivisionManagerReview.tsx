import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Table } from '../ui/Table'
import { apiService } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import * as Types from '../../types'

export function DivisionManagerReview() {
  const { user } = useAuth()
  const [pendingApprovals, setPendingApprovals] = useState<Types.PendingApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)
  
  // Modal states
  const [showActionModal, setShowActionModal] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Types.PendingApproval | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'request_revision'>('approve')
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    loadPendingApprovals()
  }, [])

  const loadPendingApprovals = async () => {
    try {
      setLoading(true)
      const response = await apiService.getPendingApprovalsForRole('division_manager', user?.USER_ID || 0)
      if (response.success) {
        setPendingApprovals(response.data || [])
      }
    } catch (error) {
      console.error('Error loading pending approvals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedDocument) return

    try {
      setProcessing(selectedDocument.document.DOCUMENT_ID)
      let response: Types.ApiResponse<Types.DocumentWithDetails>

      switch (actionType) {
        case 'approve':
          response = await apiService.forwardToRegionalDirector(selectedDocument.document.DOCUMENT_ID, remarks)
          break
        case 'reject':
          response = await apiService.rejectDocument(selectedDocument.document.DOCUMENT_ID, remarks)
          break
        case 'request_revision':
          response = await apiService.requestRevision(selectedDocument.document.DOCUMENT_ID, remarks)
          break
      }

      if (response.success) {
        // Remove from pending approvals
        setPendingApprovals(prev => 
          prev.filter(approval => approval.document.DOCUMENT_ID !== selectedDocument.document.DOCUMENT_ID)
        )
        
        setShowActionModal(false)
        setSelectedDocument(null)
        setRemarks('')
        alert(`Document ${actionType} successfully!`)
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

  const openActionModal = (document: Types.PendingApproval, action: 'approve' | 'reject' | 'request_revision') => {
    setSelectedDocument(document)
    setActionType(action)
    setShowActionModal(true)
    setRemarks('')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Under_Division_Review': return <Badge color="blue">Division Review</Badge>
      case 'Under_Section_Review': return <Badge color="amber">Section Approved</Badge>
      case 'Revision_Required': return <Badge color="red">Revision Required</Badge>
      default: return <Badge color="gray">{status}</Badge>
    }
  }

  const getTimeInStage = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const getPriorityColor = (minutes: number) => {
    if (minutes > 2880) return 'red' // > 48 hours
    if (minutes > 1440) return 'amber' // > 24 hours
    return 'green'
  }

  const getApprovalHistory = (document: Types.DocumentWithDetails) => {
    const approvals = document.approvals || []
    const sectionApproval = approvals.find(a => a.ROLE === 2) // Section Head
    return sectionApproval ? `Approved by ${sectionApproval.user?.NAME} on ${new Date(sectionApproval.DATE_APPROVED || '').toLocaleDateString()}` : 'No section approval'
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Division Review</h1>
        <p className="muted">Loading pending documents...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Division Review</h1>
        <p>Review documents approved by Section Heads in your division</p>
      </div>

      <div className="page-content">
        <Card title={`Pending Division Reviews (${pendingApprovals.length})`}>
          {pendingApprovals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              <p>No documents pending division review</p>
            </div>
          ) : (
            <Table
              columns={["Document", "Section", "Approval History", "Status", "Time in Stage", "Actions"]}
              rows={pendingApprovals.map(approval => [
                <div>
                  <div style={{ fontWeight: 600 }}>{approval.document.TITLE}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {approval.document.DESCRIPTION}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    SHA: {approval.document.FINGERPRINT_HASH.substring(0, 16)}...
                  </div>
                </div>,
                <div>
                  <div style={{ fontWeight: 500 }}>{approval.document.section?.NAME}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Created by: {approval.document.createdByUser?.NAME}
                  </div>
                </div>,
                <div style={{ fontSize: 12 }}>
                  {getApprovalHistory(approval.document)}
                </div>,
                getStatusBadge(approval.document.currentStatus?.STATUS || 'Under_Division_Review'),
                <Badge color={getPriorityColor(approval.timeInStage)}>
                  {getTimeInStage(approval.timeInStage)}
                </Badge>,
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    className="btn btn-sm btn-success"
                    onClick={() => openActionModal(approval, 'approve')}
                    disabled={processing === approval.document.DOCUMENT_ID}
                  >
                    Forward to Regional
                  </button>
                  <button 
                    className="btn btn-sm btn-warning"
                    onClick={() => openActionModal(approval, 'request_revision')}
                    disabled={processing === approval.document.DOCUMENT_ID}
                  >
                    Request Revision
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => openActionModal(approval, 'reject')}
                    disabled={processing === approval.document.DOCUMENT_ID}
                  >
                    Reject
                  </button>
                </div>
              ])}
            />
          )}
        </Card>

        <Card title="Division Review Guidelines">
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>🎯 Strategic Alignment Review</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>Alignment with division objectives and priorities</li>
                <li>Resource allocation and budget considerations</li>
                <li>Impact on division performance metrics</li>
                <li>Compliance with division-level policies</li>
              </ul>
            </div>
            <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>📊 Quality Assurance</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>Review Section Head approval and feedback</li>
                <li>Verify document completeness and accuracy</li>
                <li>Ensure proper escalation to Regional Manager</li>
                <li>Document any additional requirements</li>
              </ul>
            </div>
            <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>⏱️ Review Timeline</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li><strong>Green:</strong> Under 24 hours - Good response time</li>
                <li><strong>Yellow:</strong> 24-48 hours - Review soon</li>
                <li><strong>Red:</strong> Over 48 hours - Priority review needed</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card title="Recent Division Activity">
          <div style={{ fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span>Documents forwarded to Regional Manager today</span>
              <Badge color="blue">3</Badge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span>Documents requiring revision</span>
              <Badge color="amber">1</Badge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span>Average review time</span>
              <Badge color="green">18 hours</Badge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Division compliance rate</span>
              <Badge color="green">94%</Badge>
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
              {actionType === 'approve' && 'Forward to Regional Manager'}
              {actionType === 'reject' && 'Reject Document'}
              {actionType === 'request_revision' && 'Request Revision'}
            </h3>
            
            <div style={{ marginBottom: 16 }}>
              <strong>Document:</strong> {selectedDocument.document.TITLE}
            </div>
            
            <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 4 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                <strong>Section Approval:</strong> {getApprovalHistory(selectedDocument.document)}
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>
                {actionType === 'approve' && 'Forward Remarks (Optional)'}
                {actionType === 'reject' && 'Rejection Reason *'}
                {actionType === 'request_revision' && 'Revision Instructions *'}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
                placeholder={
                  actionType === 'approve' 
                    ? 'Optional comments when forwarding to Regional Manager...'
                    : actionType === 'reject'
                    ? 'Please provide reason for rejection...'
                    : 'Please provide specific instructions for revision...'
                }
                required={actionType !== 'approve'}
              />
            </div>

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
                  actionType === 'approve' ? 'btn-success' : 
                  actionType === 'reject' ? 'btn-danger' : 'btn-warning'
                }`}
                onClick={handleAction}
                disabled={processing !== null || (actionType !== 'approve' && !remarks.trim())}
              >
                {processing !== null ? 'Processing...' : 
                  actionType === 'approve' ? 'Forward to Regional' :
                  actionType === 'reject' ? 'Reject' : 'Request Revision'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
