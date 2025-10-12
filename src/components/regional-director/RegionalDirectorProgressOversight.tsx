import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import * as Types from '../../types'

export function RegionalDirectorProgressOversight() {
  const { user } = useAuth()
  const [progressMetrics, setProgressMetrics] = useState<Types.ProgressMetrics | null>(null)
  const [divisionMetrics, setDivisionMetrics] = useState<Types.DivisionMetrics[]>([])
  const [sectionMetrics, setSectionMetrics] = useState<Types.SectionMetrics[]>([])
  const [systemHealth, setSystemHealth] = useState<Types.SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDivision, setSelectedDivision] = useState<number | null>(null)
  const [selectedSection, setSelectedSection] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'divisions' | 'sections' | 'health'>('overview')

  useEffect(() => {
    loadProgressData()
  }, [])

  const loadProgressData = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Load all progress data
      const [progressResponse, divisionResponse, sectionResponse, healthResponse] = await Promise.all([
        apiService.getProgressMetrics(),
        apiService.getDivisionMetrics(),
        apiService.getSectionMetrics(),
        apiService.getSystemHealth()
      ])

      if (progressResponse.success) {
        setProgressMetrics(progressResponse.data)
      }
      if (divisionResponse.success) {
        setDivisionMetrics(divisionResponse.data || [])
      }
      if (sectionResponse.success) {
        setSectionMetrics(sectionResponse.data || [])
      }
      if (healthResponse.success) {
        setSystemHealth(healthResponse.data)
      }
    } catch (error) {
      console.error('Error loading progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredSectionMetrics = () => {
    if (!selectedDivision) return sectionMetrics
    return sectionMetrics.filter(section => section.DIVISION_ID === selectedDivision)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'status-completed'
      case 'in_progress': return 'status-in-progress'
      case 'pending': return 'status-pending'
      case 'overdue': return 'status-overdue'
      default: return 'status-pending'
    }
  }

  const getHealthColor = (percentage: number) => {
    if (percentage >= 80) return 'health-excellent'
    if (percentage >= 60) return 'health-good'
    if (percentage >= 40) return 'health-warning'
    return 'health-critical'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Progress Oversight</h1>
          <p>Loading progress data...</p>
        </div>
        <div className="page-content">
          <div className="loading">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Progress Oversight</h1>
        <p>Overview of all teams, tasks, reports, and feedback across divisions</p>
      </div>

      <div className="page-content">
        {/* Navigation Tabs */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'divisions' ? 'active' : ''}`}
            onClick={() => setActiveTab('divisions')}
          >
            Divisions
          </button>
          <button 
            className={`tab-button ${activeTab === 'sections' ? 'active' : ''}`}
            onClick={() => setActiveTab('sections')}
          >
            Sections
          </button>
          <button 
            className={`tab-button ${activeTab === 'health' ? 'active' : ''}`}
            onClick={() => setActiveTab('health')}
          >
            System Health
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && progressMetrics && (
          <div className="progress-overview">
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Total Tasks</h3>
                <div className="metric-value">{progressMetrics.TOTAL_TASKS}</div>
                <div className="metric-detail">
                  <span className="completed">{progressMetrics.COMPLETED_TASKS} completed</span>
                  <span className="pending">{progressMetrics.PENDING_TASKS} pending</span>
                </div>
              </div>
              
              <div className="metric-card">
                <h3>Documents</h3>
                <div className="metric-value">{progressMetrics.TOTAL_DOCUMENTS}</div>
                <div className="metric-detail">
                  <span className="approved">{progressMetrics.APPROVED_DOCUMENTS} approved</span>
                  <span className="pending">{progressMetrics.PENDING_DOCUMENTS} pending</span>
                </div>
              </div>
              
              <div className="metric-card">
                <h3>Feedback</h3>
                <div className="metric-value">{progressMetrics.TOTAL_FEEDBACK}</div>
                <div className="metric-detail">
                  <span className="read">{progressMetrics.READ_FEEDBACK} read</span>
                  <span className="unread">{progressMetrics.UNREAD_FEEDBACK} unread</span>
                </div>
              </div>
              
              <div className="metric-card">
                <h3>System Health</h3>
                <div className={`metric-value ${getHealthColor(progressMetrics.SYSTEM_HEALTH_SCORE)}`}>
                  {progressMetrics.SYSTEM_HEALTH_SCORE}%
                </div>
                <div className="metric-detail">
                  <span>Last updated: {formatDate(progressMetrics.LAST_UPDATED)}</span>
                </div>
              </div>
            </div>

            <div className="division-summary">
              <h3>Division Summary</h3>
              <div className="divisions-grid">
                {divisionMetrics.map((division) => (
                  <div key={division.DIVISION_ID} className="division-card">
                    <h4>{division.DIVISION_NAME}</h4>
                    <div className="division-stats">
                      <div className="stat">
                        <span className="label">Tasks:</span>
                        <span className="value">{division.COMPLETED_TASKS}/{division.TOTAL_TASKS}</span>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${(division.COMPLETED_TASKS / division.TOTAL_TASKS) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="stat">
                        <span className="label">Documents:</span>
                        <span className="value">{division.APPROVED_DOCUMENTS}/{division.TOTAL_DOCUMENTS}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Sections:</span>
                        <span className="value">{division.TOTAL_SECTIONS}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Divisions Tab */}
        {activeTab === 'divisions' && (
          <div className="divisions-detail">
            <h3>Division Details</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Division</th>
                    <th>Total Tasks</th>
                    <th>Completed</th>
                    <th>Pending</th>
                    <th>Overdue</th>
                    <th>Completion Rate</th>
                    <th>Avg Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {divisionMetrics.map((division) => (
                    <tr key={division.DIVISION_ID}>
                      <td>
                        <div className="division-info">
                          <strong>{division.DIVISION_NAME}</strong>
                          <small>{division.TOTAL_SECTIONS} sections</small>
                        </div>
                      </td>
                      <td>{division.TOTAL_TASKS}</td>
                      <td className="completed">{division.COMPLETED_TASKS}</td>
                      <td className="pending">{division.PENDING_TASKS}</td>
                      <td className="overdue">{division.OVERDUE_TASKS}</td>
                      <td>
                        <div className="progress-container">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${(division.COMPLETED_TASKS / division.TOTAL_TASKS) * 100}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">
                            {Math.round((division.COMPLETED_TASKS / division.TOTAL_TASKS) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td>{formatTime(division.AVERAGE_RESPONSE_TIME)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sections Tab */}
        {activeTab === 'sections' && (
          <div className="sections-detail">
            <div className="section-filters">
              <select 
                value={selectedDivision || ''}
                onChange={(e) => setSelectedDivision(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All Divisions</option>
                {divisionMetrics.map(division => (
                  <option key={division.DIVISION_ID} value={division.DIVISION_ID}>
                    {division.DIVISION_NAME}
                  </option>
                ))}
              </select>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Division</th>
                    <th>Total Tasks</th>
                    <th>Completed</th>
                    <th>Pending</th>
                    <th>Overdue</th>
                    <th>Completion Rate</th>
                    <th>Avg Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredSectionMetrics().map((section) => (
                    <tr key={section.SECTION_ID}>
                      <td>
                        <div className="section-info">
                          <strong>{section.SECTION_NAME}</strong>
                          <small>{section.TOTAL_USERS} users</small>
                        </div>
                      </td>
                      <td>{section.DIVISION_NAME}</td>
                      <td>{section.TOTAL_TASKS}</td>
                      <td className="completed">{section.COMPLETED_TASKS}</td>
                      <td className="pending">{section.PENDING_TASKS}</td>
                      <td className="overdue">{section.OVERDUE_TASKS}</td>
                      <td>
                        <div className="progress-container">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${(section.COMPLETED_TASKS / section.TOTAL_TASKS) * 100}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">
                            {Math.round((section.COMPLETED_TASKS / section.TOTAL_TASKS) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td>{formatTime(section.AVERAGE_RESPONSE_TIME)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* System Health Tab */}
        {activeTab === 'health' && systemHealth && (
          <div className="system-health">
            <div className="health-overview">
              <div className="health-score">
                <h3>Overall System Health</h3>
                <div className={`health-circle ${getHealthColor(systemHealth.OVERALL_HEALTH_SCORE)}`}>
                  {systemHealth.OVERALL_HEALTH_SCORE}%
                </div>
              </div>
              
              <div className="health-metrics">
                <div className="health-metric">
                  <span className="label">Task Completion Rate</span>
                  <div className="metric-bar">
                    <div 
                      className={`bar-fill ${getHealthColor(systemHealth.TASK_COMPLETION_RATE)}`}
                      style={{ width: `${systemHealth.TASK_COMPLETION_RATE}%` }}
                    ></div>
                  </div>
                  <span className="value">{systemHealth.TASK_COMPLETION_RATE}%</span>
                </div>
                
                <div className="health-metric">
                  <span className="label">Document Approval Rate</span>
                  <div className="metric-bar">
                    <div 
                      className={`bar-fill ${getHealthColor(systemHealth.DOCUMENT_APPROVAL_RATE)}`}
                      style={{ width: `${systemHealth.DOCUMENT_APPROVAL_RATE}%` }}
                    ></div>
                  </div>
                  <span className="value">{systemHealth.DOCUMENT_APPROVAL_RATE}%</span>
                </div>
                
                <div className="health-metric">
                  <span className="label">Feedback Response Rate</span>
                  <div className="metric-bar">
                    <div 
                      className={`bar-fill ${getHealthColor(systemHealth.FEEDBACK_RESPONSE_RATE)}`}
                      style={{ width: `${systemHealth.FEEDBACK_RESPONSE_RATE}%` }}
                    ></div>
                  </div>
                  <span className="value">{systemHealth.FEEDBACK_RESPONSE_RATE}%</span>
                </div>
              </div>
            </div>

            <div className="health-details">
              <div className="health-card">
                <h4>Performance Metrics</h4>
                <ul>
                  <li>Average Task Completion Time: {formatTime(systemHealth.AVERAGE_TASK_COMPLETION_TIME)}</li>
                  <li>Average Document Review Time: {formatTime(systemHealth.AVERAGE_DOCUMENT_REVIEW_TIME)}</li>
                  <li>System Uptime: {systemHealth.SYSTEM_UPTIME}%</li>
                </ul>
              </div>
              
              <div className="health-card">
                <h4>Issues & Alerts</h4>
                <ul>
                  <li>Overdue Tasks: {systemHealth.OVERDUE_TASKS}</li>
                  <li>Pending Documents: {systemHealth.PENDING_DOCUMENTS}</li>
                  <li>Unread Feedback: {systemHealth.UNREAD_FEEDBACK}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
