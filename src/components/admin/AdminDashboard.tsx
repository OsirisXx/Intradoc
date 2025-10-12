import React from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Table } from '../ui/Table'

export function AdminDashboard() {
  // In a real application, you would get the user's role from context or props
  // const { userRole } = useAuth(); // Example
  const userRole = 'admin'; // For demonstration, assume admin. If 'regional_manager', apply sorting.

  let myTasks = [
    ["Review Q1 Budget Report", "Approval", "Today"],
    ["Submit Safety Audit Report", "Submission", "Mar 28"],
    ["Update HR Policy Guidelines", "Revision", "Apr 2"],
  ];

  // Simulate "Regional Dashboard" logic: display Delayed items first
  if (userRole === 'regional_manager') {
    // This is a simplified example. In a real app, tasks would have a 'status' property.
    // For now, let's assume "Submit Safety Audit Report" is a 'Delayed' item for demonstration.
    myTasks = [
      ["Submit Safety Audit Report", "Submission", "Mar 28"], // Delayed item first
      ["Review Q1 Budget Report", "Approval", "Today"],
      ["Update HR Policy Guidelines", "Revision", "Apr 2"],
    ];
  }

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="muted">Role-based overview of tasks, approvals, and deadlines for efficient document management.</p>
      <div className="grid">
        <Card title="My Tasks" actions={<Badge color="red">3 Urgent</Badge>}>
          <Table
            columns={["Task", "Type", "Due"]}
            rows={myTasks}
          />
        </Card>
        <Card title="Pending Approvals" actions={<Badge color="amber">2 Pending</Badge>}>
          <Table
            columns={["Document", "Section", "Submitted", "Status"]}
            rows={[
              ["Q1 Financial Report", "Finance", "2 hours ago", <span className="status-indicator status-on-going">On-Going</span>],
              ["Safety Protocol Update", "Operations", "1 day ago", <span className="status-indicator status-delayed">Delayed</span>],
              ["HR Guidelines Revision", "Human Resources", "3 days ago", <span className="status-indicator status-submitted">Submitted</span>],
            ]}
          />
        </Card>
        <Card title="Recent Activity">
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>Q1 Budget Report Approved</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>Regional Manager • 2 hours ago</div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>New Requirement Assigned</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>Safety Report due Apr 5 • 4 hours ago</div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>HR Policy Moved to Division Review</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>Section Head • 1 day ago</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
