import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'

// Import components
import { LoginPage } from './components/auth/LoginPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { StaffTopbar } from './components/staff/StaffTopbar'
import { StaffSidebar } from './components/staff/StaffSidebar'
import { StaffDashboard } from './components/staff/StaffDashboard'
import { StaffDocumentWorks } from './components/staff/StaffDocumentWorks'
import { StaffTaskDetail } from './components/staff/StaffTaskDetail'
import { StaffTasks } from './components/staff/StaffTasks'
import { StaffNotifications } from './components/staff/StaffNotifications'
import { StaffFeedback } from './components/staff/StaffFeedback'
import { StaffSettings } from './components/staff/StaffSettings'
import { AdminDashboard } from './components/admin/AdminDashboard'
import { AdminAccountManagement } from './components/admin/AdminAccountManagement'
import { AuthProvider } from './contexts/AuthContext'
import { DialogProvider } from './components/ui/DialogProvider'

// Import role-specific components
import { DynamicSidebar } from './components/sidebars/DynamicSidebar'


// Section/Unit Head components
import { SectionUnitHeadDashboard } from './components/section-unit-head/SectionUnitHeadDashboard'
import { SectionUnitHeadReports } from './components/section-unit-head/SectionUnitHeadReports'
import SectionUnitHeadTasks from './components/section-unit-head/SectionUnitHeadTasks'
import SectionUnitHeadNotifications from './components/section-unit-head/SectionUnitHeadNotifications'
import SectionUnitHeadFeedback from './components/section-unit-head/SectionUnitHeadFeedback'
import { SectionUnitHeadPosts } from './components/section-unit-head/SectionUnitHeadPosts'
import { SectionUnitHeadDocumentWorks } from './components/section-unit-head/SectionUnitHeadDocumentWorks'
import SectionUnitHeadTaskDetail from './components/section-unit-head/SectionUnitHeadTaskDetail.tsx'
import ArchivePage from './components/common/ArchivePage'

// Division Manager components
import { DivisionManagerTaskAssignment } from './components/division-manager/DivisionManagerTaskAssignment'
import { DivisionManagerSendToRegional } from './components/division-manager/DivisionManagerSendToRegional'
import { DivisionManagerDashboard } from './components/division-manager/DivisionManagerDashboard'
import { DivisionManagerDocumentWorks } from './components/division-manager/DivisionManagerDocumentWorks'
import { DivisionManagerPosts } from './components/division-manager/DivisionManagerPosts'
import DivisionManagerFeedback from './components/division-manager/DivisionManagerFeedback'
import DivisionManagerNotifications from './components/division-manager/DivisionManagerNotifications'
import DivisionManagerTaskDetail from './components/division-manager/DivisionManagerTaskDetail.tsx'

// Regional Director components

function App() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <AuthProvider>
      <DialogProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute requiredRole="admin">
              <div className={`app-shell ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
                <DynamicSidebar />
                <main className="main">
                  <StaffTopbar onToggleSidebar={toggleSidebar} />
                  <div className="content">
                    <Routes>
                      <Route path="/" element={<AdminDashboard />} />
                      <Route path="/account-management" element={<AdminAccountManagement />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          } />
          
          {/* Staff Routes - Enhanced User Interface */}
          <Route path="/staff/*" element={
            <ProtectedRoute requiredRole="staff">
              <div className={`app-shell ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
                <StaffSidebar />
                <main className="main">
                  <StaffTopbar onToggleSidebar={toggleSidebar} />
                  <div className="content">
                    <Routes>
                      <Route path="/" element={<StaffDashboard />} />
                      <Route path="/work" element={<StaffDocumentWorks />} />
                      <Route path="/work/:taskId" element={<StaffTaskDetail />} />
                      <Route path="/tasks" element={<StaffTasks />} />
                      <Route path="/notifications" element={<StaffNotifications />} />
                      <Route path="/archive" element={<ArchivePage />} />
                      <Route path="/feedback" element={<StaffFeedback />} />
                      <Route path="/settings" element={<StaffSettings />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          } />
          
          {/* Section/Unit Head Routes */}
          <Route path="/section-unit-head/*" element={
            <ProtectedRoute requiredRole="section_unit_head">
              <div className={`app-shell ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
                <DynamicSidebar />
                <main className="main">
                  <StaffTopbar onToggleSidebar={toggleSidebar} />
                  <div className="content">
                    <Routes>
                      <Route path="/" element={<SectionUnitHeadDashboard />} />
                      <Route path="/work" element={<SectionUnitHeadDocumentWorks />} />
                      <Route path="/work/:taskId" element={<SectionUnitHeadTaskDetail />} />
                      <Route path="/tasks" element={<SectionUnitHeadTasks />} />
                      <Route path="/notifications" element={<SectionUnitHeadNotifications />} />
                      <Route path="/feedback" element={<SectionUnitHeadFeedback />} />
                      <Route path="/reports" element={<SectionUnitHeadReports />} />
                      <Route path="/posts" element={<SectionUnitHeadPosts />} />
                      <Route path="/archive" element={<ArchivePage />} />
                      <Route path="/settings" element={<StaffSettings />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          } />
          
          {/* Division Manager Routes */}
          <Route path="/division-manager/*" element={
            <ProtectedRoute requiredRole="division_manager">
              <div className={`app-shell ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
                <DynamicSidebar />
                <main className="main">
                  <StaffTopbar onToggleSidebar={toggleSidebar} />
                  <div className="content">
                    <Routes>
                      <Route path="/" element={<DivisionManagerDashboard />} />
                      <Route path="/work" element={<DivisionManagerDocumentWorks />} />
                      <Route path="/work/:taskId" element={<DivisionManagerTaskDetail />} />
                      <Route path="/task-assignment" element={<DivisionManagerTaskAssignment />} />
                      <Route path="/task-assignment/:taskId" element={<DivisionManagerTaskDetail />} />
                      <Route path="/reports" element={<SectionUnitHeadReports />} />
                      <Route path="/posts" element={<DivisionManagerPosts />} />
                      <Route path="/send-to-regional" element={<DivisionManagerSendToRegional />} />
                      <Route path="/tasks" element={<div className="page"><h1>Tasks</h1><p>Coming soon...</p></div>} />
                      <Route path="/notifications" element={<DivisionManagerNotifications />} />
                      <Route path="/feedback" element={<DivisionManagerFeedback />} />
                      <Route path="/archive" element={<ArchivePage />} />
                      <Route path="/settings" element={<StaffSettings />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          } />
          
          {/* Regional Director Routes */}
          <Route path="/regional-director/*" element={
            <ProtectedRoute requiredRole="regional_director">
              <div className={`app-shell ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
                <DynamicSidebar />
                <main className="main">
                  <StaffTopbar onToggleSidebar={toggleSidebar} />
                  <div className="content">
                    <Routes>
                      <Route path="/" element={<DivisionManagerDashboard />} />
                      <Route path="/reports" element={<SectionUnitHeadReports />} />
                      <Route path="/notifications" element={<DivisionManagerNotifications />} />
                      <Route path="/archive" element={<ArchivePage />} />
                      <Route path="/settings" element={<StaffSettings />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
        </BrowserRouter>
      </DialogProvider>
    </AuthProvider>
  )
}

export default App
