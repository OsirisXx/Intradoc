import React from 'react'
import { Card } from '../ui/Card'

export function AdminAnnouncements() {
  return (
    <div className="page">
      <h1>Section Announcements</h1>
      <p className="muted">Create and manage section announcements with optional attachments and targeted distribution.</p>
      <div className="grid">
        <Card title="Create Announcement" actions={<button className="btn-primary">+ Post Announcement</button>}>
          <div style={{ marginBottom: 16 }}>
            <label>Announcement Title</label>
            <input placeholder="e.g., New Safety Protocol Implementation" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Target Section</label>
            <select>
              <option>All Sections</option>
              <option>Finance</option>
              <option>Human Resources</option>
              <option>Operations</option>
              <option>IT</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Message Content</label>
            <textarea placeholder="Announcement content..." style={{ height: 100 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Attachments</label>
            <input type="file" />
          </div>
        </Card>
        <Card title="Recent Announcements">
          <div style={{ fontSize: 14 }}>
            <div className="post">
              <div className="post-header">
                <div className="post-author">Operations Team</div>
                <div className="post-department">Operations</div>
                <div className="post-time">2 hours ago</div>
              </div>
              <div className="post-content">
                <div style={{ fontWeight: 600, marginBottom: 8 }}>New Safety Protocol Implementation</div>
                <div>All staff must review the updated safety protocols by end of week. New procedures include emergency evacuation routes and updated contact information.</div>
              </div>
              <div className="post-meta">
                <span>📎 safety_protocol_v2.pdf</span>
                <span>🔔 Urgent</span>
              </div>
            </div>
            <div className="post">
              <div className="post-header">
                <div className="post-author">Finance Section</div>
                <div className="post-department">Finance</div>
                <div className="post-time">1 day ago</div>
              </div>
              <div className="post-content">
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Q1 Budget Approval</div>
                <div>Q1 budget has been approved by Regional Manager. All sections can proceed with planned expenditures.</div>
              </div>
              <div className="post-meta">
                <span>✅ Approved</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
