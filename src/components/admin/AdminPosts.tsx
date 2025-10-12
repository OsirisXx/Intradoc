import React from 'react'
import { Card } from '../ui/Card'
import { Tag } from '../ui/Tag'

export function AdminPosts() {
  return (
    <div className="page">
      <h1>Posts / Stream</h1>
      <p className="muted">Internal communication platform for updates, comments, and team collaboration.</p>
      <div className="grid">
        <Card title="Create Post" actions={<button className="btn-primary">+ Share Update</button>}>
          <div style={{ marginBottom: 16 }}>
            <textarea placeholder="What's happening in your department? Share updates, ask questions, or celebrate achievements..." style={{ height: 80 }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-small">📎 Attach File</button>
            <button className="btn-small">🏷️ Add Tags</button>
            <button className="btn-small">👥 Mention Users</button>
          </div>
        </Card>
        <Card title="Recent Posts">
          <div style={{ fontSize: 14 }}>
            <div className="post">
              <div className="post-header">
                <div className="post-author">Sarah Johnson</div>
                <div className="post-department">HR</div>
                <div className="post-time">2 hours ago</div>
              </div>
              <div className="post-content">
                New employee onboarding process is now live! 🎉 Check out the updated guidelines and streamlined workflow. This should reduce onboarding time by 30%.
              </div>
              <div className="post-meta">
                <span>💬 3 comments</span>
                <span>👍 8 likes</span>
                <span>🏷️ #onboarding #hr</span>
              </div>
            </div>
            <div className="post">
              <div className="post-header">
                <div className="post-author">Mike Chen</div>
                <div className="post-department">IT</div>
                <div className="post-time">4 hours ago</div>
              </div>
              <div className="post-content">
                System maintenance scheduled for tonight 10PM-2AM. 🔧 Minimal disruption expected. Please save your work and log out by 9:45 PM.
              </div>
              <div className="post-meta">
                <span>💬 1 comment</span>
                <span>👍 5 likes</span>
                <span>🏷️ #maintenance #it</span>
              </div>
            </div>
          </div>
        </Card>
        <Card title="Trending Topics">
          <div className="row wrap">
            <Tag>#onboarding</Tag>
            <Tag>#maintenance</Tag>
            <Tag>#safety</Tag>
            <Tag>#budget</Tag>
            <Tag>#hr</Tag>
            <Tag>#compliance</Tag>
          </div>
        </Card>
      </div>
    </div>
  )
}


