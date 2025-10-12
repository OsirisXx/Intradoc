import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Table } from '../ui/Table'
import { apiService } from '../../services/api'
import * as Types from '../../types'

// Type aliases for cleaner code
type DocumentRequirementWithDetails = Types.DocumentRequirementWithDetails;
type DocumentCategory = Types.DocumentCategory;
type Section = Types.Section;
type Division = Types.Division;
type Unit = Types.Unit;
type User = Types.User;
type RequirementCreationForm = Types.RequirementCreationForm;

export function AdminRequirements() {
  const [requirements, setRequirements] = useState<DocumentRequirementWithDetails[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  
  // Filter states
  const [selectedDivision, setSelectedDivision] = useState<number>(0)
  const [selectedSection, setSelectedSection] = useState<number>(0)
  const [selectedUnit, setSelectedUnit] = useState<number>(0)
  
  const [formData, setFormData] = useState<RequirementCreationForm>({
    title: '',
    documentId: undefined,
    divisionId: undefined,
    sectionId: undefined,
    unitId: undefined,
    assignedTo: 0,
    dueDate: '',
    instructions: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedDivision) {
      loadUnitsBySection(selectedDivision)
    }
  }, [selectedDivision])

  const loadData = async () => {
    try {
      setLoading(true)
      const [requirementsRes, documentsRes, categoriesRes, sectionsRes, divisionsRes, unitsRes, usersRes] = await Promise.all([
        apiService.getRequirements(),
        apiService.getDocuments(),
        apiService.getCategories(),
        apiService.getSections(),
        apiService.getDivisions(),
        apiService.getUnits(),
        apiService.getUsers()
      ])

      if (requirementsRes.success) setRequirements(requirementsRes.data || [])
      if (documentsRes.success) setDocuments(documentsRes.data || [])
      if (categoriesRes.success) setCategories(categoriesRes.data || [])
      if (sectionsRes.success) setSections(sectionsRes.data || [])
      if (divisionsRes.success) setDivisions(divisionsRes.data || [])
      if (unitsRes.success) setUnits(unitsRes.data || [])
      if (usersRes.success) setUsers(usersRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUnitsBySection = async (sectionId: number) => {
    try {
      const response = await apiService.getUnitsBySection(sectionId)
      if (response.success) {
        setUnits(response.data || [])
      }
    } catch (error) {
      console.error('Error loading units:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.assignedTo || !formData.dueDate) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      const response = await apiService.createRequirement(formData)
      
      if (response.success) {
        setRequirements(prev => [response.data!, ...prev])
        setFormData({
          title: '',
          documentId: undefined,
          divisionId: undefined,
          sectionId: undefined,
          unitId: undefined,
          assignedTo: 0,
          dueDate: '',
          instructions: ''
        })
        setShowForm(false)
        alert('Requirement created successfully!')
      } else {
        alert('Error creating requirement: ' + response.error)
      }
    } catch (error) {
      console.error('Error creating requirement:', error)
      alert('Error creating requirement')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof RequirementCreationForm, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const getStatusBadge = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return <Badge color="red">Overdue</Badge>
    } else if (diffDays <= 7) {
      return <Badge color="amber">Due Soon</Badge>
    } else {
      return <Badge color="blue">On Track</Badge>
    }
  }

  const getFilteredRequirements = () => {
    return requirements.filter(req => {
      if (selectedDivision && req.division?.DIVISION_ID !== selectedDivision) return false
      if (selectedSection && req.section?.SECTION_ID !== selectedSection) return false
      if (selectedUnit && req.unit?.UNIT_ID !== selectedUnit) return false
      return true
    })
  }

  const getAnalytics = () => {
    const total = requirements.length
    const today = new Date()
    const overdue = requirements.filter(req => new Date(req.DUE_DATE) < today).length
    const dueSoon = requirements.filter(req => {
      const due = new Date(req.DUE_DATE)
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays <= 7 && diffDays >= 0
    }).length
    const onTrack = total - overdue - dueSoon

    return { total, overdue, dueSoon, onTrack }
  }

  const analytics = getAnalytics()
  const filteredRequirements = getFilteredRequirements()

  if (loading) {
    return (
      <div className="page">
        <h1>Document Requirements</h1>
        <p className="muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Document Requirements</h1>
      <p className="muted">Assign document requirements with due dates, special instructions, and section-specific criteria.</p>
      
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <label>Filter by Division</label>
          <select 
            value={selectedDivision}
            onChange={(e) => {
              setSelectedDivision(parseInt(e.target.value))
              setSelectedSection(0)
              setSelectedUnit(0)
            }}
          >
            <option value={0}>All Divisions</option>
            {divisions.map(division => (
              <option key={division.DIVISION_ID} value={division.DIVISION_ID}>
                {division.NAME}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Filter by Section</label>
          <select 
            value={selectedSection}
            onChange={(e) => {
              setSelectedSection(parseInt(e.target.value))
              setSelectedUnit(0)
            }}
          >
            <option value={0}>All Sections</option>
            {sections
              .filter(section => !selectedDivision || section.DIVISION_ID === selectedDivision)
              .map(section => (
                <option key={section.SECTION_ID} value={section.SECTION_ID}>
                  {section.NAME}
                </option>
              ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Filter by Unit</label>
          <select 
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(parseInt(e.target.value))}
          >
            <option value={0}>All Units</option>
            {units
              .filter(unit => !selectedSection || unit.SECTION_ID === selectedSection)
              .map(unit => (
                <option key={unit.UNIT_ID} value={unit.UNIT_ID}>
                  {unit.NAME}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="grid">
        <Card 
          title="Active Requirements" 
          actions={<Badge color="amber">{analytics.dueSoon} Due Soon</Badge>}
        >
          <Table
            columns={["Requirement", "Section", "Assigned To", "Due Date", "Status"]}
            rows={filteredRequirements.map(req => [
              req.document?.TITLE || 'Generic Requirement',
              req.section?.NAME || 'Unknown',
              req.assignedUser?.NAME || 'Unassigned',
              new Date(req.DUE_DATE).toLocaleDateString(),
              getStatusBadge(req.DUE_DATE)
            ])}
          />
        </Card>

        <Card 
          title="Create New Requirement" 
          actions={
            <button 
              className="btn-primary" 
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel' : '+ Add Requirement'}
            </button>
          }
        >
          {showForm && (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label>Requirement Title *</label>
                <input 
                  placeholder="e.g., Q1 Financial Report Submission"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Related Document (Optional)</label>
                <select 
                  value={formData.documentId || ''}
                  onChange={(e) => handleInputChange('documentId', e.target.value ? parseInt(e.target.value) : undefined)}
                >
                  <option value="">Select Document (Optional)</option>
                  {documents.map(doc => (
                    <option key={doc.DOCUMENT_ID} value={doc.DOCUMENT_ID}>
                      {doc.TITLE}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Division (Optional)</label>
                <select 
                  value={formData.divisionId || ''}
                  onChange={(e) => handleInputChange('divisionId', e.target.value ? parseInt(e.target.value) : undefined)}
                >
                  <option value="">Select Division (Optional)</option>
                  {divisions.map(division => (
                    <option key={division.DIVISION_ID} value={division.DIVISION_ID}>
                      {division.NAME}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Section (Optional)</label>
                <select 
                  value={formData.sectionId || ''}
                  onChange={(e) => handleInputChange('sectionId', e.target.value ? parseInt(e.target.value) : undefined)}
                >
                  <option value="">Select Section (Optional)</option>
                  {sections.map(section => (
                    <option key={section.SECTION_ID} value={section.SECTION_ID}>
                      {section.NAME}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Unit (Optional)</label>
                <select 
                  value={formData.unitId || ''}
                  onChange={(e) => handleInputChange('unitId', e.target.value ? parseInt(e.target.value) : undefined)}
                >
                  <option value="">Select Unit (Optional)</option>
                  {units.map(unit => (
                    <option key={unit.UNIT_ID} value={unit.UNIT_ID}>
                      {unit.NAME}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Assign To (Person) *</label>
                <select 
                  value={formData.assignedTo}
                  onChange={(e) => handleInputChange('assignedTo', parseInt(e.target.value))}
                  required
                >
                  <option value={0}>Select Person</option>
                  {users.map(user => (
                    <option key={user.USER_ID} value={user.USER_ID}>
                      {user.NAME} ({user.ROLE})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Due Date *</label>
                <input 
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Special Instructions</label>
                <textarea 
                  placeholder="Any special requirements, formatting guidelines, or compliance notes..."
                  style={{ height: 80 }}
                  value={formData.instructions}
                  onChange={(e) => handleInputChange('instructions', e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Requirement'}
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

        <Card title="Requirement Analytics">
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>On Track</div>
              <div style={{ color: '#64748b' }}>{analytics.onTrack} requirements • {analytics.total > 0 ? Math.round((analytics.onTrack / analytics.total) * 100) : 0}% completion rate</div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>At Risk</div>
              <div style={{ color: '#64748b' }}>{analytics.dueSoon} requirements • Due within 7 days</div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Overdue</div>
              <div style={{ color: '#64748b' }}>{analytics.overdue} requirement{analytics.overdue !== 1 ? 's' : ''} • Requires immediate attention</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
