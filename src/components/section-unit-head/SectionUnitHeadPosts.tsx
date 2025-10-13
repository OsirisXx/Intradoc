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
  const [newPost, setNewPost] = useState({
    title: '',
    message: '',
    attachmentLink: ''
  })

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
      const response = await apiService.createPost({
        title: newPost.title,
        message: newPost.message,
        sectionId: user?.SECTION_ID || 1,
        attachmentLink: newPost.attachmentLink || undefined
      })

      if (response.success) {
        setNewPost({ title: '', message: '', attachmentLink: '' })
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
      year: 'numeric'
    })
  }

  const isNewPost = (createdAt: string) => {
    return new Date(createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
  }

  return (
    <div className="page">
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
          
          {!showCreateForm && (
            <div className="post-actions">
              <button className="btn-small">📎 Attach File</button>
              <button className="btn-small">🏷️ Add Tags</button>
              <button className="btn-small">👥 Mention Users</button>
            </div>
          )}
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
                  <div key={post.POST_ID} className="post-item">
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
                      {post.ATTACHMENT_LINK && (
                        <div className="post-attachment">
                          <a href={post.ATTACHMENT_LINK} target="_blank" rel="noopener noreferrer">
                            📎 Attachment
                          </a>
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

        {/* Trending Topics */}
        <div className="card">
          <div className="card-header">
            <h3>Trending Topics</h3>
          </div>
          <div className="tags-container">
            <span className="tag">#updates</span>
            <span className="tag">#announcements</span>
            <span className="tag">#safety</span>
            <span className="tag">#budget</span>
            <span className="tag">#hr</span>
            <span className="tag">#compliance</span>
          </div>
        </div>
      </div>
    </div>
  )
}
