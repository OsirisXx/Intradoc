import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import * as Types from '../../types'
import './SectionUnitHead.css'

export function SectionUnitHeadPosts() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Types.StreamPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Types.StreamPost | null>(null)
  const [newPost, setNewPost] = useState({
    title: '',
    message: '',
    attachmentLink: ''
  })
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const response = await apiService.getAllPosts()
      if (response.success) {
        setPosts(response.data || [])
      }
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.title.trim() || !newPost.message.trim()) return

    try {
      // If a file is selected, upload first and use returned URL
      let attachmentUrl = newPost.attachmentLink?.trim() || ''
      let attachmentFileUrl: string | undefined
      let attachmentExternalUrl: string | undefined
      if (attachmentFile) {
        const form = new FormData()
        form.append('file', attachmentFile)
        const uploadRes = await apiService.uploadPostAttachment(form as any)
        if (uploadRes?.success && (uploadRes as any).url) {
          attachmentFileUrl = (uploadRes as any).url
        }
      }
      if (attachmentUrl) {
        attachmentExternalUrl = attachmentUrl
      }
      const response = await apiService.createPost({
        title: newPost.title,
        message: newPost.message,
        sectionId: user?.SECTION_ID || 1,
        attachmentLink: attachmentUrl || undefined,
        attachmentFileUrl,
        attachmentExternalUrl
      })

      if (response.success) {
        setNewPost({ title: '', message: '', attachmentLink: '' })
        setAttachmentFile(null)
        setShowCreateForm(false)
        loadPosts() // Refresh posts
      }
    } catch (error) {
      console.error('Error creating post:', error)
    }
  }

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const response = await apiService.deletePost(postId)
      if (response.success) {
        loadPosts() // Refresh posts
      }
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isNewPost = (createdAt: string) => {
    return new Date(createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
  }

  const getAttachmentInfo = (link: string) => {
    const href = link.startsWith('http') ? link : `http://localhost:3001${link}`
    try {
      const u = new URL(href)
      const segments = u.pathname.split('/').filter(Boolean)
      const last = segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : ''
      const name = last || u.hostname || href
      const ext = last.includes('.') ? (last.split('.').pop() || '').toLowerCase() : ''
      const type = ext ? ext.toUpperCase() : 'LINK'
      return { href, name, type }
    } catch {
      return { href, name: href, type: 'LINK' }
    }
  }

  return (
    <div className="page section-unit-head-posts">
      <div className="page-header">
        <h1>Posts / Stream</h1>
        <p className="muted">Internal communication platform for updates, comments, and team collaboration.</p>
      </div>

      <div className="grid">
        {/* Create Post Card */}
        <div className="card">
          <div className="card-header">
            <h3>Create Post</h3>
            <button 
              className="btn-primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : '+ Share Update'}
            </button>
          </div>
          
          {showCreateForm && (
            <form onSubmit={handleCreatePost} className="create-post-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="Post title..."
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={newPost.message}
                  onChange={(e) => setNewPost({ ...newPost, message: e.target.value })}
                  placeholder="What's happening in your department? Share updates, ask questions, or celebrate achievements..."
                  rows={4}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Attachment File (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setAttachmentFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                />
              </div>

              <div className="form-group">
                <label>Attachment Link (Optional)</label>
                <input
                  type="url"
                  value={newPost.attachmentLink}
                  onChange={(e) => setNewPost({ ...newPost, attachmentLink: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Share Post
                </button>
              </div>
            </form>
          )}
          
          {/* Removed extra actions to keep UI focused on the create form */}
        </div>

        {/* Recent Posts */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Posts</h3>
            <button className="btn-small" onClick={loadPosts}>
              🔄 Refresh
            </button>
          </div>
          
          <div className="posts-container">
            {loading ? (
              <div className="loading-state">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="empty-state">No posts yet. Be the first to share an update!</div>
            ) : (
              <div className="posts-list">
                {posts.map(post => (
                  <div key={post.POST_ID} className="post-item" onClick={() => setSelectedPost(post)}>
                    {isNewPost(post.CREATED_AT) && <div className="post-badge-new">NEW!</div>}
                    
                    <div className="post-header">
                      <div className="post-avatar">
                        <div className="avatar-icon"></div>
                      </div>
                      <div className="post-author-info">
                        <div className="post-author-name">{post.AUTHOR_NAME}</div>
                        <div className="post-author-role">{post.AUTHOR_ROLE} • {post.SECTION_NAME}</div>
                      </div>
                      <div className="post-actions">
                        {post.POSTED_BY === user?.USER_ID && (
                          <button 
                            className="btn-small btn-danger"
                            onClick={() => handleDeletePost(post.POST_ID)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <div className="post-date">{formatDate(post.CREATED_AT)}</div>
                    </div>
                    
                    <div className="post-content">
                      <h4 className="post-title">{post.TITLE}</h4>
                      <p className="post-message">{post.MESSAGE}</p>
                      {(post.ATTACHMENT_FILE_URL || post.ATTACHMENT_EXTERNAL_URL || post.ATTACHMENT_LINK) && (
                        <div className="post-attachment">
                          {post.ATTACHMENT_FILE_URL && (() => { const info = getAttachmentInfo(post.ATTACHMENT_FILE_URL!); return (
                            <a href={info.href} target="_blank" rel="noopener noreferrer">
                              📎 {info.name} ({info.type})
                            </a>
                          )})()}
                          {post.ATTACHMENT_EXTERNAL_URL && (() => { const info = getAttachmentInfo(post.ATTACHMENT_EXTERNAL_URL!); return (
                            <a href={info.href} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 12 }}>
                              🔗 {info.name} ({info.type})
                            </a>
                          )})()}
                          {post.ATTACHMENT_LINK && !post.ATTACHMENT_EXTERNAL_URL && (() => { const info = getAttachmentInfo(post.ATTACHMENT_LINK!); return (
                            <a href={info.href} target="_blank" rel="noopener noreferrer">
                              📎 {info.name} ({info.type})
                            </a>
                          )})()}
                        </div>
                      )}
                    </div>
                    
                    <div className="post-meta">
                      <span>💬 0 comments</span>
                      <span>👍 0 likes</span>
                      <span>🏷️ #{post.SECTION_NAME.toLowerCase().replace(/\s+/g, '')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {selectedPost && (
          <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Post Details</h3>
                <button className="btn-close" onClick={() => setSelectedPost(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="post-header">
                  <div className="post-avatar"><div className="avatar-icon"></div></div>
                  <div className="post-author-info">
                    <div className="post-author-name">{selectedPost.AUTHOR_NAME}</div>
                    <div className="post-author-role">{selectedPost.AUTHOR_ROLE} • {selectedPost.SECTION_NAME}</div>
                  </div>
                  <div className="post-date">{formatDate(selectedPost.CREATED_AT)}</div>
                </div>
                <div className="post-content">
                  <h4 className="post-title">{selectedPost.TITLE}</h4>
                  <p className="post-message">{selectedPost.MESSAGE}</p>
                  {(selectedPost.ATTACHMENT_FILE_URL || selectedPost.ATTACHMENT_EXTERNAL_URL || selectedPost.ATTACHMENT_LINK) && (
                    <div className="post-attachment">
                      {selectedPost.ATTACHMENT_FILE_URL && (() => { const info = getAttachmentInfo(selectedPost.ATTACHMENT_FILE_URL!); return (
                        <a href={info.href} target="_blank" rel="noopener noreferrer">
                          📎 {info.name} ({info.type})
                        </a>
                      )})()}
                      {selectedPost.ATTACHMENT_EXTERNAL_URL && (() => { const info = getAttachmentInfo(selectedPost.ATTACHMENT_EXTERNAL_URL!); return (
                        <a href={info.href} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 12 }}>
                          🔗 {info.name} ({info.type})
                        </a>
                      )})()}
                      {selectedPost.ATTACHMENT_LINK && !selectedPost.ATTACHMENT_EXTERNAL_URL && (() => { const info = getAttachmentInfo(selectedPost.ATTACHMENT_LINK!); return (
                        <a href={info.href} target="_blank" rel="noopener noreferrer">
                          📎 {info.name} ({info.type})
                        </a>
                      )})()}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedPost(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

        
      </div>
    </div>
  )
}
