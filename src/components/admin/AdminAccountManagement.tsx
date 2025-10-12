import React, { useState, useEffect } from 'react'
import { authService, type PendingRegistration } from '../../services/auth'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Table } from '../ui/Table'

export function AdminAccountManagement() {
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    loadPendingRegistrations()
  }, [])

  const loadPendingRegistrations = async () => {
    try {
      setIsLoading(true)
      const registrations = await authService.getPendingRegistrations()
      setPendingRegistrations(registrations)
    } catch (err) {
      setError('Failed to load pending registrations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      const result = await authService.approveRegistration(id)
      if (result.success) {
        alert(result.message)
        loadPendingRegistrations() // Refresh the list
      } else {
        alert(result.message || 'Failed to approve registration')
      }
    } catch (error) {
      alert('Failed to approve registration')
    }
  }

  const handleReject = async (id: number, reason: string) => {
    try {
      const result = await authService.rejectRegistration(id, reason)
      if (result.success) {
        alert(result.message)
        setShowRejectModal(false)
        setRejectionReason('')
        setSelectedRegistration(null)
        loadPendingRegistrations() // Refresh the list
      } else {
        alert(result.message || 'Failed to reject registration')
      }
    } catch (error) {
      alert('Failed to reject registration')
    }
  }

  const openRejectModal = (registration: PendingRegistration) => {
    setSelectedRegistration(registration)
    setShowRejectModal(true)
  }

  const getFunctionalRoleDisplayName = (role: string) => {
    switch (role) {
      case 'staff': return 'Staff'
      case 'section_head': return 'Section Head'
      case 'division_manager': return 'Division Manager'
      case 'regional_manager': return 'Regional Manager'
      case 'admin': return 'Admin'
      default: return role
    }
  }

  const getSectionDisplayName = (sectionId: number) => {
    // This would normally come from the sections data
    const sectionNames: Record<number, string> = {
      1: 'Engineering',
      2: 'Operations', 
      3: 'Institutional Development',
      4: 'Finance',
      5: 'Administrative'
    }
    return sectionNames[sectionId] || `Section ${sectionId}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'status-pending'
      case 'approved': return 'status-approved'
      case 'rejected': return 'status-rejected'
      default: return 'status-pending'
    }
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading pending registrations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Account Management</h1>
        <p>Review and approve pending user registrations</p>
      </div>

      <div className="page-content">
        {error && (
          <div className="error-message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {error}
          </div>
        )}

        <Card title="Pending Registrations" actions={
          <button 
            className="btn btn-secondary" 
            onClick={loadPendingRegistrations}
          >
            Refresh
          </button>
        }>
          {pendingRegistrations.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              <h3>No Pending Registrations</h3>
              <p>All registration requests have been processed.</p>
            </div>
          ) : (
            <div className="registrations-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID Number</th>
                    <th>Email</th>
                    <th>Organizational Role</th>
                    <th>Functional Role</th>
                    <th>Section</th>
                    <th>Requested Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRegistrations.map((registration) => (
                    <tr key={registration.id}>
                      <td>{registration.name}</td>
                      <td>{registration.idNumber}</td>
                      <td>{registration.email}</td>
                      <td><strong>{registration.organizationalRole}</strong></td>
                      <td>{getFunctionalRoleDisplayName(registration.functionalRole)}</td>
                      <td>{getSectionDisplayName(registration.sectionId)}</td>
                      <td>{new Date(registration.requestedAt).toLocaleDateString()}</td>
                      <td>
                        <Badge className={getStatusColor(registration.status)}>
                          {registration.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleApprove(registration.id)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => openRejectModal(registration)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Rejection Modal */}
        {showRejectModal && selectedRegistration && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Reject Registration</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowRejectModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to reject the registration for{' '}
                  <strong>{selectedRegistration.name}</strong>?
                </p>
                <div className="form-group">
                  <label htmlFor="rejection-reason">Reason for rejection (optional)</label>
                  <textarea
                    id="rejection-reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Enter reason for rejection..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleReject(selectedRegistration.id, rejectionReason)}
                >
                  Reject Registration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
