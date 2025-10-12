import React from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Table } from '../ui/Table'

export function AdminTools() {
  return (
    <div className="page">
      <h1>Admin Tools</h1>
      <p className="muted">Comprehensive system administration tools for user management, role creation, section setup, and document categorization.</p>
      <div className="grid">
        <Card title="Pending Registrations" actions={
          <Link to="/admin/account-management" className="btn btn-primary">
            Manage Accounts
          </Link>
        }>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: '16px', color: '#f59e0b' }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            <h3 style={{ marginBottom: '8px' }}>Review Registration Requests</h3>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>
              New users have requested access to the system. Review and approve their accounts.
            </p>
            <Link to="/admin/account-management" className="btn btn-primary">
              View Pending Requests
            </Link>
          </div>
        </Card>
        <Card title="User Account Management" actions={<button className="btn-primary">+ Create User</button>}>
          <div style={{ marginBottom: 16 }}>
            <label>Email Address</label>
            <input placeholder="user@company.com" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Full Name</label>
            <input placeholder="John Smith" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>ID Number</label>
            <input placeholder="Enter ID Number" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Role Assignment</label>
            <select>
              <option>Staff</option>
              <option>Section Head</option>
              <option>Division Manager</option>
              <option>Regional Manager</option>
              <option>Admin</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Section</label>
            <select>
              <option>Finance</option>
              <option>Human Resources</option>
              <option>Operations</option>
              <option>IT</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Permissions</label>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Document submission, approval workflow, system access, admin privileges
            </div>
          </div>
        </Card>
        <Card title="Section Management" actions={<button className="btn-primary">+ Add Section</button>}>
          <Table
            columns={["Section", "Users", "Documents", "Status"]}
            rows={[
              ["Finance", "12", "45", <Badge color="green">Active</Badge>],
              ["Human Resources", "8", "23", <Badge color="green">Active</Badge>],
              ["Operations", "15", "67", <Badge color="green">Active</Badge>],
              ["IT", "6", "18", <Badge color="green">Active</Badge>],
            ]}
          />
        </Card>
        <Card title="Document Categories">
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Policy Documents</div>
              <div style={{ color: '#64748b' }}>Company policies, procedures, guidelines</div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Financial Reports</div>
              <div style={{ color: '#64748b' }}>Budgets, financial statements, audits</div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>HR Documentation</div>
              <div style={{ color: '#64748b' }}>Employee records, policies, training materials</div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Safety Protocols</div>
              <div style={{ color: '#64748b' }}>Safety guidelines, emergency procedures</div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>IT Documentation</div>
              <div style={{ color: '#64748b' }}>System documentation, security protocols</div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Compliance Reports</div>
              <div style={{ color: '#64748b' }}>Regulatory compliance, audit reports</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
