import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Table } from '../ui/Table'
import { apiService } from '../../services/api'
import * as Types from '../../types'

// Type aliases for cleaner code
type DocumentApprovalWithDetails = Types.DocumentApprovalWithDetails;
type DocumentWithDetails = Types.DocumentWithDetails;
type ApprovalActionForm = Types.ApprovalActionForm;

export function AdminApprovals() {
  const [approvals, setApprovals] = useState<DocumentApprovalWithDetails[]>([])
  const [documents, setDocuments] = useState<DocumentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)
  
  // Modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<DocumentApprovalWithDetails | null>(null)
  const [approvalAction, setApprovalAction] = useState<'approved' | 'rejected' | 'pending'>('pending')
  const [approvalRemarks, setApprovalRemarks] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [approvalsRes, documentsRes] = await Promise.all([
        apiService.getApprovals(),
        apiService.getDocuments()
      ])

      if (approvalsRes.success) setApprovals(approvalsRes.data || [])
      if (documentsRes.success) setDocuments(documentsRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprovalAction = async () => {
    if (!selectedApproval) return

    try {
      setProcessing(selectedApproval.APPROVAL_ID)
      const form: ApprovalActionForm = {
        documentId: selectedApproval.DOCUMENT_ID,
        status: approvalAction,
        remarks: approvalRemarks
      }

      const response = await apiService.updateApproval(form)
      
      if (response.success) {
        // Update the approval in the list
        setApprovals(prev => prev.map(approval => 
          approval.APPROVAL_ID === selectedApproval.APPROVAL_ID 
            ? { ...approval, ...response.data }
            : approval
        ))
        
        // Update document status
        setDocuments(prev => prev.map(doc => 
          doc.DOCUMENT_ID === selectedApproval.DOCUMENT_ID
            ? { 
                ...doc, 
                currentStatus: {
                  STATUS_ID: doc.currentStatus?.STATUS_ID || 1,
                  DOCUMENT_ID: doc.DOCUMENT_ID,
                  STATUS: approvalAction === 'approved' ? 'Approved' : approvalAction === 'rejected' ? 'Rejected' : 'On-Going',
                  REMARKS: approvalRemarks,
                  CREATED_AT: new Date().toISOString()
                }
              }
            : doc
        ))

        setShowApprovalModal(false)
        setSelectedApproval(null)
        setApprovalRemarks('')
        setApprovalAction('pending')
        alert(`Document ${approvalAction} successfully!`)
      } else {
        alert('Error processing approval: ' + response.error)
      }
    } catch (error) {
      console.error('Error processing approval:', error)
      alert('Error processing approval')
    } finally {
      setProcessing(null)
    }
  }

  const openApprovalModal = (approval: DocumentApprovalWithDetails) => {
    setSelectedApproval(approval)
    setShowApprovalModal(true)
    setApprovalAction('pending')
    setApprovalRemarks('')
  }

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0: return <Badge color="amber">Pending</Badge>
      case 1: return <Badge color="green">Approved</Badge>
      case 2: return <Badge color="red">Rejected</Badge>
      default: return <Badge color="gray">Unknown</Badge>
    }
  }

  const getWorkflowStep = (role: number) => {
    switch (role) {
      case 1: return 'Section Head Review'
      case 2: return 'Division Manager Review'
      case 3: return 'Regional Manager Approval'
      default: return 'Review'
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const pendingApprovals = approvals.filter(approval => approval.STATUS === 0)
  const completedApprovals = approvals.filter(approval => approval.STATUS !== 0)

  if (loading) {
    return (
      <div className="page">
        <h1>Approvals & Feedback</h1>
        <p className="muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Approvals & Feedback</h1>
      <p className="muted">Multi-step approval workflow with feedback system for document revisions and improvements.</p>
      
      <div className="grid">
        <Card 
          title="Pending My Approval" 
          actions={<Badge color="red">{pendingApprovals.length} Urgent</Badge>}
        >
          <Table
            columns={["Document", "Current Step", "Submitted", "Status", "Action"]}
            rows={pendingApprovals.map(approval => [
              approval.document?.TITLE || 'Unknown Document',
              getWorkflowStep(approval.ROLE),
              getTimeAgo(approval.DATE_SUBMITTED),
              getStatusBadge(approval.STATUS),
              <button 
                className="btn-small"
                onClick={() => openApprovalModal(approval)}
                disabled={processing === approval.APPROVAL_ID}
              >
                {processing === approval.APPROVAL_ID ? 'Processing...' : 'Review'}
              </button>
            ])}
          />
        </Card>

        <Card title="Approval Workflow">
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>1. Section Head Review</div>
              <div style={{ color: '#64748b' }}>Initial review for completeness and accuracy</div>
            </div>
            <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>2. Division Manager Review</div>
              <div style={{ color: '#64748b' }}>Secondary review for strategic alignment</div>
            </div>
            <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>3. Regional Manager Approval</div>
              <div style={{ color: '#64748b' }}>Final approval and document archival</div>
            </div>
          </div>
        </Card>

        <Card title="Feedback History">
          <div style={{ fontSize: 14 }}>
            {completedApprovals
              .filter(approval => approval.REMARKS)
              .slice(0, 5)
              .map(approval => (
                <div key={approval.APPROVAL_ID} style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {approval.document?.TITLE || 'Unknown Document'}
                  </div>
                  <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                    "{approval.REMARKS}"
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    {approval.user?.NAME || 'Unknown User'} • {getTimeAgo(approval.DATE_STATUS_CHANGED || approval.DATE_SUBMITTED)}
                  </div>
                </div>
              ))}
            {completedApprovals.filter(approval => approval.REMARKS).length === 0 && (
              <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                No feedback history available
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedApproval && (
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
            <h3 style={{ marginBottom: 16 }}>Review Document</h3>
            
            <div style={{ marginBottom: 16 }}>
              <strong>Document:</strong> {selectedApproval.document?.TITLE || 'Unknown'}
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <strong>Current Step:</strong> {getWorkflowStep(selectedApproval.ROLE)}
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <strong>Submitted:</strong> {getTimeAgo(selectedApproval.DATE_SUBMITTED)}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>Action *</label>
              <select 
                value={approvalAction}
                onChange={(e) => setApprovalAction(e.target.value as 'approved' | 'rejected' | 'pending')}
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approve</option>
                <option value="rejected">Reject</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>Remarks</label>
              <textarea
                placeholder="Add feedback or comments..."
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: 8, 
                  marginTop: 4, 
                  height: 80,
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button 
                className="btn-secondary"
                onClick={() => setShowApprovalModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleApprovalAction}
                disabled={processing === selectedApproval.APPROVAL_ID}
              >
                {processing === selectedApproval.APPROVAL_ID ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
