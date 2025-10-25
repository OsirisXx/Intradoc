import { useState, useEffect } from 'react'
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
        setProgressMetrics(progressResponse.data || null)
      }
      if (divisionResponse.success) {
        setDivisionMetrics(divisionResponse.data || [])
      }
      if (sectionResponse.success) {
        setSectionMetrics(sectionResponse.data || [])
      }
      if (healthResponse.success) {
        setSystemHealth(healthResponse.data || null)
      }
    } catch (error) {
      console.error('Error loading progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredSectionMetrics = () => {
    if (!selectedDivision) return sectionMetrics
    return sectionMetrics.filter(section => section.divisionId === selectedDivision)
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
                <div className="metric-value">{progressMetrics.totalTasks}</div>
                <div className="metric-detail">
                  <span className="completed">{progressMetrics.completedTasks} completed</span>
                  <span className="pending">{progressMetrics.pendingTasks} pending</span>
                </div>
              </div>
              
              <div className="metric-card">
                <h3>Documents</h3>
                <div className="metric-value">{progressMetrics.totalDocuments}</div>
                <div className="metric-detail">
                  <span className="approved">{progressMetrics.approvedDocuments} approved</span>
                  <span className="pending">{progressMetrics.pendingDocuments} pending</span>
                </div>
              </div>
              
              <div className="metric-card">
                <h3>Feedback</h3>
                <div className="metric-value">{progressMetrics.totalFeedback}</div>
                <div className="metric-detail">
                  <span className="read">{progressMetrics.readFeedback} read</span>
                  <span className="unread">{progressMetrics.unreadFeedback} unread</span>
                </div>
              </div>
              
              <div className="metric-card">
                <h3>System Health</h3>
                <div className={`metric-value ${getHealthColor(progressMetrics.systemHealthScore)}`}>
                  {progressMetrics.systemHealthScore}%
                </div>
                <div className="metric-detail">
                  <span>Last updated: {formatDate(progressMetrics.lastUpdated)}</span>
                </div>
              </div>
            </div>

            <div className="division-summary">
              <h3>Division Summary</h3>
              <div className="divisions-grid">
                {divisionMetrics.map((division) => (
                  <div key={division.divisionId} className="division-card">
                    <h4>{division.divisionName}</h4>
                    <div className="division-stats">
                      <div className="stat">
                        <span className="label">Tasks:</span>
                        <span className="value">{division.completedTasks}/{division.totalTasks}</span>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${(division.completedTasks / division.totalTasks) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="stat">
                        <span className="label">Documents:</span>
                        <span className="value">{division.approvedDocuments}/{division.totalDocuments}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Sections:</span>
                        <span className="value">{division.totalSections}</span>
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
                    <tr key={division.divisionId}>
                      <td>
                        <div className="division-info">
                          <strong>{division.divisionName}</strong>
                          <small>{division.totalSections} sections</small>
                        </div>
                      </td>
                      <td>{division.totalTasks}</td>
                      <td className="completed">{division.completedTasks}</td>
                      <td className="pending">{division.pendingTasks}</td>
                      <td className="overdue">{division.overdueTasks}</td>
                      <td>
                        <div className="progress-container">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${(division.completedTasks / division.totalTasks) * 100}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">
                            {Math.round((division.completedTasks / division.totalTasks) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td>{formatTime(division.averageResponseTime)}</td>
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
                  <option key={division.divisionId} value={division.divisionId}>
                    {division.divisionName}
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
                    <tr key={section.sectionId}>
                      <td>
                        <div className="section-info">
                          <strong>{section.sectionName}</strong>
                          <small>{section.totalUsers} users</small>
                        </div>
                      </td>
                      <td>{section.divisionName}</td>
                      <td>{section.totalTasks}</td>
                      <td className="completed">{section.completedTasks}</td>
                      <td className="pending">{section.pendingTasks}</td>
                      <td className="overdue">{section.overdueTasks}</td>
                      <td>
                        <div className="progress-container">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${(section.completedTasks / section.totalTasks) * 100}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">
                            {Math.round((section.completedTasks / section.totalTasks) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td>{formatTime(section.averageResponseTime)}</td>
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
                <div className={`health-circle ${getHealthColor(systemHealth.overallHealthScore)}`}>
                  {systemHealth.overallHealthScore}%
                </div>
              </div>
              
              <div className="health-metrics">
                <div className="health-metric">
                  <span className="label">Task Completion Rate</span>
                  <div className="metric-bar">
                    <div 
                      className={`bar-fill ${getHealthColor(systemHealth.taskCompletionRate)}`}
                      style={{ width: `${systemHealth.taskCompletionRate}%` }}
                    ></div>
                  </div>
                  <span className="value">{systemHealth.taskCompletionRate}%</span>
                </div>
                
                <div className="health-metric">
                  <span className="label">Document Approval Rate</span>
                  <div className="metric-bar">
                    <div 
                      className={`bar-fill ${getHealthColor(systemHealth.documentApprovalRate)}`}
                      style={{ width: `${systemHealth.documentApprovalRate}%` }}
                    ></div>
                  </div>
                  <span className="value">{systemHealth.documentApprovalRate}%</span>
                </div>
                
                <div className="health-metric">
                  <span className="label">Feedback Response Rate</span>
                  <div className="metric-bar">
                    <div 
                      className={`bar-fill ${getHealthColor(systemHealth.feedbackResponseRate)}`}
                      style={{ width: `${systemHealth.feedbackResponseRate}%` }}
                    ></div>
                  </div>
                  <span className="value">{systemHealth.feedbackResponseRate}%</span>
                </div>
              </div>
            </div>

            <div className="health-details">
              <div className="health-card">
                <h4>Performance Metrics</h4>
                <ul>
                  <li>Average Task Completion Time: {formatTime(systemHealth.averageTaskCompletionTime)}</li>
                  <li>Average Document Review Time: {formatTime(systemHealth.averageDocumentReviewTime)}</li>
                  <li>System Uptime: {systemHealth.systemUptime}%</li>
                </ul>
              </div>
              
              <div className="health-card">
                <h4>Issues & Alerts</h4>
                <ul>
                  <li>Overdue Tasks: {systemHealth.overdueTasks}</li>
                  <li>Pending Documents: {systemHealth.pendingDocuments}</li>
                  <li>Unread Feedback: {systemHealth.unreadFeedback}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
