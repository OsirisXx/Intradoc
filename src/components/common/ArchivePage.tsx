import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'
import { useNavigate } from 'react-router-dom'
import { useDialogContext } from '../ui/DialogProvider'

type Task = any

export function ArchivePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const dialog = useDialogContext()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const role = user?.FUNCTIONAL_ROLE || 'staff'
  const contextsAvailable = useMemo(() => {
    if (role === 'staff') return ['assigned_to'] as const
    if (role === 'regional_director') return ['assigned_by'] as const
    return ['assigned_to', 'assigned_by'] as const
  }, [role])
  const [context, setContext] = useState<'assigned_by' | 'assigned_to'>(
    role === 'section_unit_head' ? 'assigned_to' : role === 'staff' ? 'assigned_to' : 'assigned_by'
  )
  const isRD = role === 'regional_director'
  // RD wants combined view; we’ll load both lists and render together

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        if (isRD) {
          const [tasksResp, docsResp] = await Promise.all([
            apiService.getArchivedTasks('assigned_by'),
            apiService.getArchivedDocuments()
          ])
          if (tasksResp.success) setTasks(tasksResp.data || [])
          else setError(tasksResp.error || 'Failed to load archived tasks')
          if (docsResp.success) setDocs(docsResp.data || [])
          else setError(docsResp.error || 'Failed to load archived reports')
        } else {
          const resp = await apiService.getArchivedTasks(context)
          if (resp.success) setTasks(resp.data || [])
          else setError(resp.error || 'Failed to load archived tasks')
        }
      } catch (e) {
        setError('Failed to load archive')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [context, isRD])

  const handleOpen = (task: any) => {
    const role = user?.FUNCTIONAL_ROLE
    const id = task.TASK_ID
    if (!id) return
    if (role === 'staff') {
      navigate(`/staff/work/${id}`)
    } else if (role === 'section_unit_head') {
      navigate(`/section-unit-head/work/${id}`)
    } else if (role === 'division_manager') {
      navigate(`/division-manager/task-assignment/${id}`)
    } else {
      // fallback: try division manager detail route
      navigate(`/division-manager/task-assignment/${id}`)
    }
  }

  const handleUnarchive = async (task: any) => {
    if (!user) return
    if (task.ASSIGNED_BY !== user.USER_ID) return
    const ok = await dialog.confirm({
      title: 'Unarchive Task',
      message: `Unarchive "${task.TITLE}"? It will return to active lists for you and the assignee.`,
      type: 'info',
      confirmText: 'Unarchive',
      cancelText: 'Cancel'
    })
    if (!ok) return
    const resp = await apiService.unarchiveTask(task.TASK_ID)
    if (resp.success) {
      setTasks(prev => prev.filter(t => t.TASK_ID !== task.TASK_ID))
    }
  }

  return (
    <div className="page">
      <h1>Archive</h1>
      {/* No tabs for Regional Director; combined view */}

      {!isRD && contextsAvailable.length > 1 && (
        <div className="task-tabs" style={{ marginBottom: '1rem' }}>
          <button
            className={context === 'assigned_to' ? 'active' : ''}
            onClick={() => setContext('assigned_to')}
          >
            Assigned to me
          </button>
          <button
            className={context === 'assigned_by' ? 'active' : ''}
            onClick={() => setContext('assigned_by')}
          >
            Assigned by me
          </button>
        </div>
      )}
      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : isRD ? (
        (tasks.length === 0 && docs.length === 0) ? (
          <div className="empty-state">No archived items</div>
        ) : (
          <>
            {tasks.length > 0 && (
              <>
                <h3 style={{ margin: '12px 0' }}>Tasks</h3>
                <div className="tasks-list">
                  {tasks.map(task => (
                    <div key={task.TASK_ID} className="task-list-item">
                      <div className="task-list-content">
                        <div>
                          <h4 className="task-list-title" style={{ cursor: 'pointer' }} onClick={() => handleOpen(task)}>{task.TITLE}</h4>
                          <p className="task-list-description">{task.DESCRIPTION}</p>
                        </div>
                        <div className="task-list-meta">Due: {new Date(task.DUE_DATE).toLocaleDateString()}</div>
                        <div className="task-list-meta">Status: {String(task.STATUS).toUpperCase()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {docs.length > 0 && (
              <>
                <h3 style={{ margin: '12px 0' }}>Reports</h3>
                <div className="tasks-list">
                  {docs.map(doc => (
                    <div key={doc.DOCUMENT_ID} className="task-list-item">
                      <div className="task-list-content">
                        <div>
                          <h4 className="task-list-title">{doc.TITLE}</h4>
                          <p className="task-list-description">{doc.DESCRIPTION}</p>
                        </div>
                        <div className="task-list-meta">Section: {doc.SECTION_NAME || '—'}</div>
                        <div className="task-list-meta">Status: {String(doc.CURRENT_STATUS || '—')}</div>
                        <div style={{ marginTop: '8px' }}>
                          <button className="btn btn-secondary btn-xs" onClick={async () => {
                            const ok = await dialog.confirm({
                              title: 'Unarchive Report',
                              message: `Unarchive "${doc.TITLE}" from your reports?`,
                              type: 'info',
                              confirmText: 'Unarchive',
                              cancelText: 'Cancel'
                            })
                            if (!ok) return
                            const resp = await apiService.unarchiveDocument(doc.DOCUMENT_ID)
                            if (resp.success) {
                              setDocs(prev => prev.filter(d => d.DOCUMENT_ID !== doc.DOCUMENT_ID))
                            }
                          }}>Unarchive</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )
      ) : tasks.length === 0 ? (
        <div className="empty-state">No archived tasks</div>
      ) : (
        <div className="tasks-list">
          {tasks.map(task => (
            <div key={task.TASK_ID} className="task-list-item">
              <div className="task-list-content">
                <div>
                  <h4 className="task-list-title" style={{ cursor: 'pointer' }} onClick={() => handleOpen(task)}>{task.TITLE}</h4>
                  <p className="task-list-description">{task.DESCRIPTION}</p>
                </div>
                <div className="task-list-meta">Due: {new Date(task.DUE_DATE).toLocaleDateString()}</div>
                <div className="task-list-meta">Status: {String(task.STATUS).toUpperCase()}</div>
                {user && task.ASSIGNED_BY === user.USER_ID && (
                  <div style={{ marginTop: '8px' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => handleUnarchive(task)}>Unarchive</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ArchivePage


