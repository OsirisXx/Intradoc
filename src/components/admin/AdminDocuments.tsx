import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Tag } from '../ui/Tag'
import { Table } from '../ui/Table'
import { apiService } from '../../services/api'
import * as Types from '../../types'

// Type aliases for cleaner code
type DocumentWithDetails = Types.DocumentWithDetails;
type DocumentCategory = Types.DocumentCategory;
type Section = Types.Section;
type User = Types.User;
type DocumentSubmissionForm = Types.DocumentSubmissionForm;
type FrequencyType = Types.FrequencyType;

export function AdminDocuments() {
  const [documents, setDocuments] = useState<DocumentWithDetails[]>([])
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState<DocumentSubmissionForm>({
    title: '',
    description: '',
    fileLink: '',
    categoryId: 0,
    sectionId: 0,
    assignedTo: undefined,
    frequency: 'One-time',
    tags: ''
  })

  const frequencies: FrequencyType[] = ['One-time', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually']

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [documentsRes, categoriesRes, sectionsRes, usersRes] = await Promise.all([
        apiService.getDocuments(),
        apiService.getCategories(),
        apiService.getSections(),
        apiService.getUsers()
      ])

      if (documentsRes.success) setDocuments(documentsRes.data || [])
      if (categoriesRes.success) setCategories(categoriesRes.data || [])
      if (sectionsRes.success) setSections(sectionsRes.data || [])
      if (usersRes.success) setUsers(usersRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.fileLink || !formData.categoryId || !formData.sectionId) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      const response = await apiService.createDocument(formData)
      
      if (response.success) {
        setDocuments(prev => [response.data!, ...prev])
        setFormData({
          title: '',
          description: '',
          fileLink: '',
          categoryId: 0,
          sectionId: 0,
          assignedTo: undefined,
          frequency: 'One-time',
          tags: ''
        })
        setShowForm(false)
        alert('Document submitted successfully!')
      } else {
        alert('Error submitting document: ' + response.error)
      }
    } catch (error) {
      console.error('Error submitting document:', error)
      alert('Error submitting document')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof DocumentSubmissionForm, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'Draft': 'status-draft',
      'On-Going': 'status-on-going',
      'Delayed': 'status-delayed',
      'Submitted': 'status-submitted',
      'Approved': 'status-approved',
      'Rejected': 'status-rejected'
    }
    
    return (
      <span className={`status-indicator ${statusClasses[status as keyof typeof statusClasses] || 'status-pending'}`}>
        {status}
      </span>
    )
  }

  const getSectionDocumentCounts = () => {
    const counts: { [key: string]: number } = {}
    documents.forEach(doc => {
      const sectionName = doc.section?.NAME || 'Unknown'
      counts[sectionName] = (counts[sectionName] || 0) + 1
    })
    return counts
  }

  const sectionCounts = getSectionDocumentCounts()

  if (loading) {
    return (
      <div className="page">
        <h1>Document Submission & Management</h1>
        <p className="muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Document Submission & Management</h1>
      <p className="muted">Submit cloud links, categorize, tag, and manage document approvals with SHA-256 integrity verification.</p>
      
      <div className="grid">
        <Card 
          title="Submit New Document" 
          actions={
            <button 
              className="btn-primary" 
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel' : '+ Submit Document'}
            </button>
          }
        >
          {showForm && (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label>Title *</label>
                <input 
                  placeholder="Document title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Description</label>
                <textarea 
                  placeholder="Document description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  style={{ height: 60 }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Cloud Link *</label>
                <input 
                  placeholder="Google Drive or OneDrive URL"
                  value={formData.fileLink}
                  onChange={(e) => handleInputChange('fileLink', e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Category *</label>
                <select 
                  value={formData.categoryId}
                  onChange={(e) => handleInputChange('categoryId', parseInt(e.target.value))}
                  required
                >
                  <option value={0}>Select Category</option>
                  {categories.map(category => (
                    <option key={category.CATEGORY_ID} value={category.CATEGORY_ID}>
                      {category.NAME}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Section *</label>
                <select 
                  value={formData.sectionId}
                  onChange={(e) => handleInputChange('sectionId', parseInt(e.target.value))}
                  required
                >
                  <option value={0}>Select Section</option>
                  {sections.map(section => (
                    <option key={section.SECTION_ID} value={section.SECTION_ID}>
                      {section.NAME}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Assign To (Person)</label>
                <select 
                  value={formData.assignedTo || ''}
                  onChange={(e) => handleInputChange('assignedTo', e.target.value ? parseInt(e.target.value) : undefined)}
                >
                  <option value="">Select Person (Optional)</option>
                  {users.map(user => (
                    <option key={user.USER_ID} value={user.USER_ID}>
                      {user.NAME} ({user.ROLE})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Frequency</label>
                <select 
                  value={formData.frequency}
                  onChange={(e) => handleInputChange('frequency', e.target.value as FrequencyType)}
                >
                  {frequencies.map(freq => (
                    <option key={freq} value={freq}>{freq}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Tags</label>
                <input 
                  placeholder="Comma-separated tags (e.g., quarterly, budget, compliance)"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Document'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Card>

        <Card 
          title="My Documents" 
          actions={<Badge color="blue">{documents.length} Active</Badge>}
        >
          <Table
            columns={["Title", "Status", "SHA-256", "Section", "Created"]}
            rows={documents.map(doc => [
              doc.TITLE,
              getStatusBadge(doc.currentStatus?.STATUS || 'Draft'),
              doc.FINGERPRINT_HASH.substring(0, 12) + '...',
              doc.section?.NAME || 'Unknown',
              new Date(doc.CREATED_AT).toLocaleDateString()
            ])}
          />
        </Card>

        <Card title="Section Documents">
          <div className="row wrap">
            {Object.entries(sectionCounts).map(([sectionName, count]) => (
              <Tag key={sectionName}>
                {sectionName} ({count} documents)
              </Tag>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
            <div style={{ fontSize: 14, color: '#64748b' }}>
              <strong>Document Integrity:</strong> All documents are verified using SHA-256 hashing for tamper detection.
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
