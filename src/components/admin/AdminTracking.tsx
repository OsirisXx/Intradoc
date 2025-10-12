import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Table } from '../ui/Table'
import { apiService } from '../../services/api'

export function AdminTracking() {
  const [trackingData, setTrackingData] = useState<any[]>([])
  const [auditTrail, setAuditTrail] = useState<any[]>([])
  const [workflowProgress, setWorkflowProgress] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedDocument) {
      loadAuditTrail(selectedDocument)
    } else {
      loadAuditTrail()
    }
  }, [selectedDocument])

  const loadData = async () => {
    try {
      setLoading(true)
      const [trackingRes, progressRes] = await Promise.all([
        apiService.getDocumentTracking(),
        apiService.getWorkflowProgress()
      ])

      if (trackingRes.success) setTrackingData(trackingRes.data || [])
      if (progressRes.success) setWorkflowProgress(progressRes.data || {})
    } catch (error) {
      console.error('Error loading tracking data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAuditTrail = async (documentId?: number) => {
    try {
      const response = await apiService.getAuditTrail(documentId)
      if (response.success) {
        setAuditTrail(response.data || [])
      }
    } catch (error) {
      console.error('Error loading audit trail:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'Draft': 'status-draft',
      'On-Going': 'status-on-going',
      'Delayed': 'status-delayed',
      'Submitted': 'status-submitted',
      'Approved': 'status-approved',
      'Rejected': 'status-rejected'
    }
    
    return (
      <span className={`status-indicator ${statusClasses[status as keyof typeof statusClasses] || 'status-pending'}`}>
        {status}
      </span>
    )
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

  const getProgressBadgeColor = (count: number) => {
    if (count === 0) return 'green'
    if (count <= 2) return 'blue'
    if (count <= 5) return 'amber'
    return 'red'
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Tracking & Transparency</h1>
        <p className="muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Tracking & Transparency</h1>
      <p className="muted">Real-time document status tracking, comprehensive audit trails, and workflow progress monitoring.</p>
      
      <div className="grid">
        <Card title="Document Status Tracking">
          <Table
            columns={["Document", "Current Status", "Next Step", "Last Updated", "Remarks", "Action"]}
            rows={trackingData.map(item => [
              item.document?.TITLE || 'Unknown Document',
              getStatusBadge(item.currentStatus?.STATUS || 'Draft'),
              item.workflow?.nextStep || 'Unknown',
              getTimeAgo(item.currentStatus?.CREATED_AT || item.document?.CREATED_AT || ''),
              item.currentStatus?.REMARKS || 'No remarks',
              <button 
                className="btn-small"
                onClick={() => setSelectedDocument(selectedDocument === item.document?.DOCUMENT_ID ? null : item.document?.DOCUMENT_ID)}
              >
                {selectedDocument === item.document?.DOCUMENT_ID ? 'Hide Trail' : 'View Trail'}
              </button>
            ])}
          />
        </Card>

        <Card title="Audit Trail">
          <div style={{ marginBottom: 16 }}>
            <label>Filter by Document:</label>
            <select 
              value={selectedDocument || ''}
              onChange={(e) => setSelectedDocument(e.target.value ? parseInt(e.target.value) : null)}
              style={{ marginLeft: 8, padding: 4 }}
            >
              <option value="">All Documents</option>
              {trackingData.map(item => (
                <option key={item.document?.DOCUMENT_ID} value={item.document?.DOCUMENT_ID}>
                  {item.document?.TITLE}
                </option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: 12, maxHeight: 200, overflowY: 'auto' }}>
            {auditTrail.map(entry => (
              <div key={entry.id} style={{ marginBottom: 8, padding: 8, background: '#f8fafc', borderRadius: 4 }}>
                <div style={{ fontWeight: 600 }}>
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
                <div>{entry.details}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {entry.action} by {entry.user}
                </div>
              </div>
            ))}
            {auditTrail.length === 0 && (
              <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
                No audit trail entries found
              </div>
            )}
          </div>
        </Card>

        <Card title="Workflow Progress">
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Section Review</span>
                <Badge color={getProgressBadgeColor(workflowProgress.sectionReview || 0)}>
                  {workflowProgress.sectionReview || 0}
                </Badge>
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Division Review</span>
                <Badge color={getProgressBadgeColor(workflowProgress.divisionReview || 0)}>
                  {workflowProgress.divisionReview || 0}
                </Badge>
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Regional Review</span>
                <Badge color={getProgressBadgeColor(workflowProgress.regionalReview || 0)}>
                  {workflowProgress.regionalReview || 0}
                </Badge>
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Archived</span>
                <Badge color="green">
                  {workflowProgress.archived || 0}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Document Analytics">
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Total Documents</div>
              <div style={{ color: '#64748b' }}>{trackingData.length} documents in system</div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Active Workflows</div>
              <div style={{ color: '#64748b' }}>
                {(workflowProgress.sectionReview || 0) + (workflowProgress.divisionReview || 0) + (workflowProgress.regionalReview || 0)} documents in progress
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Completion Rate</div>
              <div style={{ color: '#64748b' }}>
                {trackingData.length > 0 ? Math.round(((workflowProgress.archived || 0) / trackingData.length) * 100) : 0}% documents completed
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
