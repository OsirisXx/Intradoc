import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Table } from '../ui/Table'
import { apiService } from '../../services/api'

interface ApiUser {
  id: number;
  name: string;
  idNumber: string;
  email: string;
  functionalRole: string;
  organizationalAssignment: string;
  sectionName: string;
  status: string;
  createdAt: string;
}

export function AdminUsers() {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await apiService.getUsers()
      if (response.success && response.data) {
        setUsers(response.data as ApiUser[])
      } else {
        setError(response.error || 'Failed to load users')
      }
    } catch (err) {
      setError('Failed to load users')
    } finally {
      setLoading(false)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge color="green">Active</Badge>
      case 'pending':
        return <Badge color="amber">Pending</Badge>
      case 'inactive':
        return <Badge color="red">Inactive</Badge>
      default:
        return <Badge color="red">Unknown</Badge>
    }
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Users & Roles</h1>
        <p className="muted">Loading users...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <h1>Users & Roles</h1>
        <p className="muted">Error: {error}</p>
        <button className="btn-primary" onClick={loadUsers}>Retry</button>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Users & Roles</h1>
      <p className="muted">Manage user accounts, role assignments, section grouping, and system activity monitoring.</p>
      <div className="grid">
        <Card title="User Management" actions={<button className="btn-primary">+ Add User</button>}>
          <Table
            columns={["Name", "Section", "Role", "Status"]}
            rows={users.map(user => [
              user.name,
              user.sectionName || user.organizationalAssignment,
              getRoleDisplayName(user.functionalRole),
              getStatusBadge(user.status)
            ])}
          />
        </Card>
        <Card title="Section Groups">
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Finance</span>
                <Badge color="blue">12 users</Badge>
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Human Resources</span>
                <Badge color="blue">8 users</Badge>
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Operations</span>
                <Badge color="blue">15 users</Badge>
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>IT</span>
                <Badge color="blue">6 users</Badge>
              </div>
            </div>
          </div>
        </Card>
        <Card title="System Activity Log">
          <div style={{ fontSize: 12, maxHeight: 200, overflowY: 'auto' }}>
            <div style={{ marginBottom: 8, padding: 8, background: '#f8fafc', borderRadius: 4 }}>
              <div style={{ fontWeight: 600 }}>2024-03-25 16:45</div>
              <div>User login: john.smith@company.com</div>
            </div>
            <div style={{ marginBottom: 8, padding: 8, background: '#f8fafc', borderRadius: 4 }}>
              <div style={{ fontWeight: 600 }}>2024-03-25 16:30</div>
              <div>Document submitted: Q1 Budget Report</div>
            </div>
            <div style={{ marginBottom: 8, padding: 8, background: '#f8fafc', borderRadius: 4 }}>
              <div style={{ fontWeight: 600 }}>2024-03-25 16:15</div>
              <div>Role changed: Sarah Johnson → Section Head</div>
            </div>
            <div style={{ marginBottom: 8, padding: 8, background: '#f8fafc', borderRadius: 4 }}>
              <div style={{ fontWeight: 600 }}>2024-03-25 15:45</div>
              <div>User created: lisa.wang@company.com</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
