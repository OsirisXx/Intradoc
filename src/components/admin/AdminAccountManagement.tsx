import React, { useState, useEffect } from 'react'
import { authService, type PendingRegistration } from '../../services/auth'
import { apiService } from '../../services/api'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { useDialogContext } from '../ui/DialogProvider'
import '../section-unit-head/SectionUnitHead.css'

export function AdminAccountManagement() {
  const { showSuccess, showError, showWarning, showInfo } = useDialogContext()
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  
  // User management states
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [editingRole, setEditingRole] = useState<string>('')
  const [showRoleEditModal, setShowRoleEditModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [deletingUser, setDeletingUser] = useState<any>(null)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  useEffect(() => {
    loadPendingRegistrations()
    loadAllUsers()
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
        showSuccess(result.message, 'Registration Approved')
        loadPendingRegistrations() // Refresh the list
      } else {
        showError(result.message || 'Failed to approve registration', 'Approval Failed')
      }
    } catch (error) {
      showError('Failed to approve registration', 'Error')
    }
  }

  const handleReject = async (id: number, reason: string) => {
    try {
      const result = await authService.rejectRegistration(id, reason)
      if (result.success) {
        showSuccess(result.message, 'Registration Rejected')
        setShowRejectModal(false)
        setRejectionReason('')
        setSelectedRegistration(null)
        loadPendingRegistrations() // Refresh the list
      } else {
        showError(result.message || 'Failed to reject registration', 'Rejection Failed')
      }
    } catch (error) {
      showError('Failed to reject registration', 'Error')
    }
  }

  const loadAllUsers = async () => {
    try {
      setLoadingUsers(true)
      const usersRes = await apiService.getUsers()
      if (usersRes.success) {
        setAllUsers(usersRes.data || [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoadingUsers(false)
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
  
  const getRoleDisplayName = (functionalRole: string) => {
    switch (functionalRole) {
      case 'admin': return 'Admin'
      case 'staff': return 'Staff'
      case 'section_unit_head': return 'Section/Unit Head'
      case 'division_manager': return 'Division Manager'
      case 'regional_director': return 'Regional Director'
      default: return functionalRole
    }
  }

  const getRoleBadge = (functionalRole: string) => {
    switch (functionalRole) {
      case 'admin':
        return <span className="status-badge approved" style={{ backgroundColor: '#dc2626', color: 'white' }}>ADMIN</span>
      case 'regional_director':
        return <span className="status-badge approved" style={{ backgroundColor: '#7c3aed', color: 'white' }}>REGIONAL DIRECTOR</span>
      case 'division_manager':
        return <span className="status-badge approved" style={{ backgroundColor: '#2563eb', color: 'white' }}>DIVISION MANAGER</span>
      case 'section_unit_head':
        return <span className="status-badge pending" style={{ backgroundColor: '#f59e0b', color: 'white' }}>SECTION HEAD</span>
      case 'staff':
        return <span className="status-badge draft" style={{ backgroundColor: '#64748b', color: 'white' }}>STAFF</span>
      default:
        return <span className="status-badge draft">{functionalRole.toUpperCase()}</span>
    }
  }

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="status-badge approved">COMPLETED</span>
      case 'in_progress':
        return <span className="status-badge pending">IN PROGRESS</span>
      case 'pending':
        return <span className="status-badge draft">PENDING</span>
      default:
        return <span className="status-badge draft">{status.toUpperCase()}</span>
    }
  }

  const openRoleEditModal = (user: any) => {
    setEditingUser(user)
    setEditingRole(user.functionalRole)
    setShowRoleEditModal(true)
  }

  const handleRoleUpdate = async () => {
    if (!editingUser || !editingRole) return
    
    // Show confirmation modal
    setShowConfirmModal(true)
  }

  const confirmRoleUpdate = async () => {
    if (!editingUser || !editingRole) return

    try {
      setLoadingUsers(true)
      const response = await apiService.updateUserRole(editingUser.id, editingRole)
      
      if (response.success) {
        // Format message like: "User sarah owens role updated from regional_director to staff"
        const formattedMessage = `User ${editingUser.name} role updated from ${getRoleDisplayName(editingUser.functionalRole)} to ${getRoleDisplayName(editingRole)}`
        showSuccess(formattedMessage, 'Role Updated Successfully')
        // Refresh users list
        await loadAllUsers()
        setShowRoleEditModal(false)
        setShowConfirmModal(false)
        setEditingUser(null)
        setEditingRole('')
      } else {
        showError('Failed to update user role: ' + response.error, 'Update Failed')
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      showError('Failed to update user role', 'Error')
    } finally {
      setLoadingUsers(false)
    }
  }
  
  const openDeleteModal = (user: any) => {
    setDeletingUser(user)
    setShowDeleteConfirmModal(true)
  }
  
  const handleDeleteUser = async () => {
    if (!deletingUser) return

    try {
      setLoadingUsers(true)
      const response = await apiService.deleteUser(deletingUser.id)
      
      if (response.success) {
        showSuccess(response.message || `User ${deletingUser.name} has been deleted successfully`, 'User Deleted')
        // Refresh users list
        await loadAllUsers()
        setShowDeleteConfirmModal(false)
        setDeletingUser(null)
      } else {
        showError(response.error || 'Failed to delete user', 'Delete Failed')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      showError('Failed to delete user', 'Error')
    } finally {
      setLoadingUsers(false)
    }
  }

  const getFilteredUsers = () => {
    let filtered = roleFilter === 'all' ? allUsers : allUsers.filter((user: any) => user.functionalRole === roleFilter)
    
    // Apply sorting
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
        }
        
        return 0
      })
    }
    
    return filtered
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    
    setSortConfig({ key, direction })
  }

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return '⇅'
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓'
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

        {/* All Users Management Section - Full Width */}
        <div className="document-status-section" style={{ marginTop: '24px' }}>
          <div className="section-title-bar">
            <h2>ALL USERS</h2>
          </div>
          <div className="document-status-content">
            {/* Filter dropdown */}
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Roles</option>
                <option value="staff">Staff</option>
                <option value="section_unit_head">Section/Unit Head</option>
                <option value="division_manager">Division Manager</option>
                <option value="regional_director">Regional Director</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {loadingUsers ? (
              <div className="empty-state">Loading...</div>
            ) : getFilteredUsers().length === 0 ? (
              <div className="empty-state">No users found</div>
            ) : (
              <table className="document-status-table" style={{ width: '100%', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th 
                      style={{ 
                        width: '20%', 
                        textAlign: 'left', 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        transition: 'background-color 0.2s ease'
                      }}
                      onClick={() => handleSort('name')}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                    >
                      NAME {getSortIcon('name')}
                    </th>
                    <th 
                      style={{ 
                        width: '15%', 
                        textAlign: 'left', 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        transition: 'background-color 0.2s ease'
                      }}
                      onClick={() => handleSort('email')}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                    >
                      EMAIL {getSortIcon('email')}
                    </th>
                    <th 
                      style={{ 
                        width: '15%', 
                        textAlign: 'left', 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        transition: 'background-color 0.2s ease'
                      }}
                      onClick={() => handleSort('idNumber')}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                    >
                      ID NUMBER {getSortIcon('idNumber')}
                    </th>
                    <th 
                      style={{ 
                        width: '15%', 
                        textAlign: 'center', 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        transition: 'background-color 0.2s ease'
                      }}
                      onClick={() => handleSort('sectionName')}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                    >
                      SECTION {getSortIcon('sectionName')}
                    </th>
                    <th 
                      style={{ 
                        width: '15%', 
                        textAlign: 'center', 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        transition: 'background-color 0.2s ease'
                      }}
                      onClick={() => handleSort('functionalRole')}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                    >
                      FUNCTIONAL ROLE {getSortIcon('functionalRole')}
                    </th>
                    <th 
                      style={{ 
                        width: '10%', 
                        textAlign: 'center', 
                        cursor: 'pointer', 
                        userSelect: 'none',
                        transition: 'background-color 0.2s ease'
                      }}
                      onClick={() => handleSort('status')}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                    >
                      STATUS {getSortIcon('status')}
                    </th>
                    <th style={{ width: '10%', textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredUsers().map((user: any) => (
                    <tr key={user.id}>
                      <td style={{ textAlign: 'left', padding: '12px 8px' }}>
                        <div className="document-title" style={{ fontWeight: '500', marginBottom: '4px' }}>{user.name}</div>
                      </td>
                      <td style={{ textAlign: 'left', padding: '12px 8px', fontSize: '0.875rem', color: '#6b7280' }}>
                        {user.email}
                      </td>
                      <td style={{ textAlign: 'left', padding: '12px 8px', fontSize: '0.875rem', color: '#6b7280' }}>
                        {user.idNumber}
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {user.sectionName || 'Unknown'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                        {getRoleBadge(user.functionalRole)}
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                        {getTaskStatusBadge(user.status)}
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px 8px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => openRoleEditModal(user)}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          Edit Role
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => openDeleteModal(user)}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Rejection Modal */}
        {showRejectModal && selectedRegistration && (
          <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Reject Registration</h3>
                <button 
                  className="btn-close"
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

        {/* Role Edit Modal */}
        {showRoleEditModal && editingUser && (
          <div className="modal-overlay" onClick={() => {
            setShowRoleEditModal(false)
            setEditingUser(null)
            setEditingRole('')
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit User Role</h3>
                <button className="btn-close" onClick={() => {
                  setShowRoleEditModal(false)
                  setEditingUser(null)
                  setEditingRole('')
                }}>×</button>
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: 16 }}>
                  <strong>User:</strong> {editingUser.name}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <strong>Current Role:</strong> {getRoleDisplayName(editingUser.functionalRole)}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8 }}>
                    <strong>New Role:</strong>
                  </label>
                  <select
                    value={editingRole}
                    onChange={(e) => setEditingRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="staff">Staff</option>
                    <option value="section_unit_head">Section/Unit Head</option>
                    <option value="division_manager">Division Manager</option>
                    <option value="regional_director">Regional Director</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowRoleEditModal(false)
                    setEditingUser(null)
                    setEditingRole('')
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleRoleUpdate}
                >
                  Update Role
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Role Update */}
        {showConfirmModal && editingUser && (
          <div className="modal-overlay" onClick={() => {
            setShowConfirmModal(false)
            setShowRoleEditModal(true)
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Confirm Role Update</h3>
                <button className="btn-close" onClick={() => {
                  setShowConfirmModal(false)
                  setShowRoleEditModal(true)
                }}>×</button>
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: 16, padding: 12, background: '#fef3c7', borderRadius: 8, border: '1px solid #f59e0b' }}>
                  <div style={{ fontSize: 14, color: '#92400e' }}>
                    ⚠️ <strong>Warning:</strong> Changing a user's role will immediately affect their permissions and access in the system.
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>User:</strong> {editingUser.name}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>From:</strong> {getRoleDisplayName(editingUser.functionalRole)} → <strong>To:</strong> {getRoleDisplayName(editingRole)}
                </div>
                <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 14, color: '#64748b' }}>
                    Are you sure you want to proceed with this role change?
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowConfirmModal(false)
                    setShowRoleEditModal(true)
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-warning" 
                  onClick={confirmRoleUpdate}
                  disabled={loadingUsers}
                >
                  {loadingUsers ? 'Updating...' : 'Confirm Update'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmModal && deletingUser && (
          <div className="modal-overlay" onClick={() => {
            setShowDeleteConfirmModal(false)
            setDeletingUser(null)
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Confirm User Deletion</h3>
                <button className="btn-close" onClick={() => {
                  setShowDeleteConfirmModal(false)
                  setDeletingUser(null)
                }}>×</button>
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: 16, padding: 12, background: '#fee2e2', borderRadius: 8, border: '1px solid #f87171' }}>
                  <div style={{ fontSize: 14, color: '#991b1b' }}>
                    ⚠️ <strong>Warning:</strong> Deleting this user will permanently remove their account and all associated data. This action cannot be undone.
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>User Name:</strong> {deletingUser.name}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Email:</strong> {deletingUser.email}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Current Role:</strong> {getRoleBadge(deletingUser.functionalRole)}
                </div>
                <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 14, color: '#64748b' }}>
                    Are you absolutely sure you want to delete this user?
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowDeleteConfirmModal(false)
                    setDeletingUser(null)
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={handleDeleteUser}
                  disabled={loadingUsers}
                >
                  {loadingUsers ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
