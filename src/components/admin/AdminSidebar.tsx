import React from 'react'
import { NavLink } from 'react-router-dom'

export function AdminSidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">IntraDoc</div>
      <nav className="nav">
        <div className="nav-section">A. Document Submission & Management</div>
        <NavLink to="/admin/documents" className="nav-link">Documents</NavLink>
        <NavLink to="/admin/requirements" className="nav-link">Requirements</NavLink>
        <NavLink to="/admin/approvals" className="nav-link">Approvals</NavLink>

        <div className="nav-section">B. Tracking & Transparency</div>
        <NavLink to="/admin/tracking" className="nav-link">Tracking</NavLink>

        <div className="nav-section">C. Notifications & Alerts</div>
        <NavLink to="/admin/notifications" className="nav-link">Notifications</NavLink>

        <div className="nav-section">D. Workflow & Compliance</div>
        <NavLink to="/admin/workflow" className="nav-link">Workflow</NavLink>

        <div className="nav-section">E. Communication & Posting</div>
        <NavLink to="/admin/announcements" className="nav-link">Announcements</NavLink>
        <NavLink to="/admin/posts" className="nav-link">Posts/Stream</NavLink>

        <div className="nav-section">F. Security & Users</div>
        <NavLink to="/admin/users" className="nav-link">Users & Roles</NavLink>

        <div className="nav-section">G. Admin Tools</div>
        <NavLink to="/admin/admin" className="nav-link">Admin</NavLink>
        <NavLink to="/admin/account-management" className="nav-link">Account Management</NavLink>
      </nav>
    </aside>
  )
}
