import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Table } from '../ui/Table'
import { apiService } from '../../services/api'

export function AdminWorkflow() {
  const [rolePermissions, setRolePermissions] = useState<any[]>([])
  const [complianceTracking, setComplianceTracking] = useState<any[]>([])
  const [workflowConfig, setWorkflowConfig] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [showConfigModal, setShowConfigModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [permissionsRes, complianceRes, configRes] = await Promise.all([
        apiService.getRolePermissions(),
        apiService.getComplianceTracking(),
        apiService.getWorkflowConfiguration()
      ])

      if (permissionsRes.success) setRolePermissions(permissionsRes.data || [])
      if (complianceRes.success) setComplianceTracking(complianceRes.data || [])
      if (configRes.success) setWorkflowConfig(configRes.data || {})
    } catch (error) {
      console.error('Error loading workflow data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'On Track': return <Badge color="green">On Track</Badge>
      case 'At Risk': return <Badge color="amber">At Risk</Badge>
      case 'Compliant': return <Badge color="green">Compliant</Badge>
      case 'Scheduled': return <Badge color="blue">Scheduled</Badge>
      case 'Overdue': return <Badge color="red">Overdue</Badge>
      default: return <Badge color="gray">{status}</Badge>
    }
  }

  const getProgressBar = (progress: number) => {
    const color = progress >= 80 ? '#10b981' : progress >= 60 ? '#f59e0b' : '#ef4444'
    return (
      <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: 4, height: 8 }}>
        <div 
          style={{ 
            width: `${progress}%`, 
            backgroundColor: color, 
            borderRadius: 4, 
            height: 8,
            transition: 'width 0.3s ease'
          }} 
        />
      </div>
    )
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'staff': return '👤'
      case 'section_head': return '👨‍💼'
      case 'division_manager': return '👩‍💼'
      case 'regional_manager': return '👨‍💻'
      case 'admin': return '🔧'
      default: return '👤'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'staff': return 'Staff'
      case 'section_head': return 'Section Head'
      case 'division_manager': return 'Division Manager'
      case 'regional_manager': return 'Regional Manager'
      case 'admin': return 'Admin'
      default: return role
    }
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Workflow & Compliance</h1>
        <p className="muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Workflow & Compliance</h1>
      <p className="muted">Multi-level approval routing, compliance tracking, and role-based access control (RBAC) management.</p>
      
      <div className="grid">
        <Card 
          title="Role-Based Access Control" 
          actions={
            <button 
              className="btn-primary"
              onClick={() => setShowConfigModal(true)}
            >
              Configure Workflow
            </button>
          }
        >
          <Table
            columns={["Role", "Permissions", "Users", "Actions"]}
            rows={rolePermissions.map(role => [
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 8 }}>{getRoleIcon(role.role)}</span>
                <span style={{ fontWeight: 600 }}>{getRoleDisplayName(role.role)}</span>
              </div>,
              <div style={{ fontSize: 12 }}>
                {role.permissions.map((permission: string, index: number) => (
                  <div key={index} style={{ marginBottom: 2 }}>
                    • {permission}
                  </div>
                ))}
              </div>,
              <Badge color="blue">{role.userCount} users</Badge>,
              <button className="btn-small">Edit</button>
            ])}
          />
        </Card>

        <Card title="Compliance Tracking">
          <Table
            columns={["Requirement", "Section", "Status", "Progress", "Due"]}
            rows={complianceTracking.map(item => [
              item.requirement,
              item.section,
              getStatusBadge(item.status),
              <div style={{ width: 100 }}>
                {getProgressBar(item.progress)}
                <div style={{ fontSize: 11, textAlign: 'center', marginTop: 2 }}>
                  {item.progress}%
                </div>
              </div>,
              new Date(item.dueDate).toLocaleDateString()
            ])}
          />
        </Card>

        <Card title="Workflow Configuration">
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Approval Steps</div>
              {workflowConfig.steps?.map((step: any, index: number) => (
                <div key={step.id} style={{ 
                  marginBottom: 8, 
                  padding: 8, 
                  background: 'white', 
                  borderRadius: 4,
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: '50%', 
                      backgroundColor: '#3b82f6', 
                      color: 'white', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: 12, 
                      marginRight: 8 
                    }}>
                      {step.order}
                    </span>
                    <span style={{ fontWeight: 600 }}>{step.name}</span>
                    <Badge color="blue" style={{ marginLeft: 'auto' }}>
                      {getRoleDisplayName(step.role)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Workflow Settings</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span>Auto Advance</span>
                <Badge color={workflowConfig.autoAdvance ? 'green' : 'red'}>
                  {workflowConfig.autoAdvance ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Require All Approvals</span>
                <Badge color={workflowConfig.requireAllApprovals ? 'green' : 'red'}>
                  {workflowConfig.requireAllApprovals ? 'Required' : 'Optional'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Division Requirements">
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Finance</div>
              <div style={{ color: '#64748b' }}>Quarterly reports, Budget reviews, Financial compliance</div>
              <div style={{ marginTop: 8 }}>
                <Badge color="green">2 compliant</Badge>
                <Badge color="amber" style={{ marginLeft: 8 }}>1 at risk</Badge>
              </div>
            </div>
            <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Human Resources</div>
              <div style={{ color: '#64748b' }}>Policy updates, Employee records, HR compliance</div>
              <div style={{ marginTop: 8 }}>
                <Badge color="green">1 compliant</Badge>
                <Badge color="blue" style={{ marginLeft: 8 }}>1 scheduled</Badge>
              </div>
            </div>
            <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Operations</div>
              <div style={{ color: '#64748b' }}>Safety protocols, Audit reports, Operational compliance</div>
              <div style={{ marginTop: 8 }}>
                <Badge color="amber">1 at risk</Badge>
                <Badge color="blue" style={{ marginLeft: 8 }}>1 scheduled</Badge>
              </div>
            </div>
            <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>IT</div>
              <div style={{ color: '#64748b' }}>Security assessments, System documentation, IT compliance</div>
              <div style={{ marginTop: 8 }}>
                <Badge color="blue">1 scheduled</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Compliance Analytics">
          <div style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Overall Compliance</div>
              <div style={{ color: '#64748b' }}>
                {complianceTracking.length > 0 ? Math.round(complianceTracking.reduce((acc, item) => acc + item.progress, 0) / complianceTracking.length) : 0}% average completion
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>On Track</div>
              <div style={{ color: '#64748b' }}>
                {complianceTracking.filter(item => item.status === 'On Track' || item.status === 'Compliant').length} requirements
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>At Risk</div>
              <div style={{ color: '#64748b' }}>
                {complianceTracking.filter(item => item.status === 'At Risk').length} requirements
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Scheduled</div>
              <div style={{ color: '#64748b' }}>
                {complianceTracking.filter(item => item.status === 'Scheduled').length} requirements
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Workflow Configuration Modal */}
      {showConfigModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 8,
            width: '90%',
            maxWidth: 600,
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: 16 }}>Workflow Configuration</h3>
            
            <div style={{ marginBottom: 16 }}>
              <label>Auto Advance Workflow</label>
              <input 
                type="checkbox" 
                checked={workflowConfig.autoAdvance}
                onChange={(e) => setWorkflowConfig(prev => ({ ...prev, autoAdvance: e.target.checked }))}
                style={{ marginLeft: 8 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>Require All Approvals</label>
              <input 
                type="checkbox" 
                checked={workflowConfig.requireAllApprovals}
                onChange={(e) => setWorkflowConfig(prev => ({ ...prev, requireAllApprovals: e.target.checked }))}
                style={{ marginLeft: 8 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>Approval Steps</label>
              {workflowConfig.steps?.map((step: any, index: number) => (
                <div key={step.id} style={{ 
                  marginBottom: 8, 
                  padding: 8, 
                  background: '#f8fafc', 
                  borderRadius: 4 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: 8 }}>{step.order}.</span>
                    <input 
                      value={step.name}
                      onChange={(e) => {
                        const newSteps = [...workflowConfig.steps]
                        newSteps[index].name = e.target.value
                        setWorkflowConfig(prev => ({ ...prev, steps: newSteps }))
                      }}
                      style={{ flex: 1, padding: 4, marginRight: 8 }}
                    />
                    <select 
                      value={step.role}
                      onChange={(e) => {
                        const newSteps = [...workflowConfig.steps]
                        newSteps[index].role = e.target.value
                        setWorkflowConfig(prev => ({ ...prev, steps: newSteps }))
                      }}
                      style={{ padding: 4 }}
                    >
                      <option value="section_head">Section Head</option>
                      <option value="division_manager">Division Manager</option>
                      <option value="regional_manager">Regional Manager</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button 
                className="btn-secondary"
                onClick={() => setShowConfigModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={() => {
                  // Save workflow configuration
                  setShowConfigModal(false)
                  alert('Workflow configuration saved!')
                }}
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
