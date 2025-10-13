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
import { StaffTasks } from './components/staff/StaffTasks'
import { StaffNotifications } from './components/staff/StaffNotifications'
import { StaffFeedback } from './components/staff/StaffFeedback'
import { AdminTopbar } from './components/admin/AdminTopbar'
import { AdminDashboard } from './components/admin/AdminDashboard'
import { AdminDocuments } from './components/admin/AdminDocuments'
import { AdminRequirements } from './components/admin/AdminRequirements'
import { AdminApprovals } from './components/admin/AdminApprovals'
import { AdminTracking } from './components/admin/AdminTracking'
import { AdminNotifications } from './components/admin/AdminNotifications'
import { AdminWorkflow } from './components/admin/AdminWorkflow'
import { AdminAnnouncements } from './components/admin/AdminAnnouncements'
import { AdminPosts } from './components/admin/AdminPosts'
import { AdminUsers } from './components/admin/AdminUsers'
import { AdminTools } from './components/admin/AdminTools'
import { AdminAccountManagement } from './components/admin/AdminAccountManagement'
import { AuthProvider } from './contexts/AuthContext'

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

// Division Manager components
import { DivisionManagerTaskAssignment } from './components/division-manager/DivisionManagerTaskAssignment'
import { DivisionManagerSendToRegional } from './components/division-manager/DivisionManagerSendToRegional'
import { DivisionManagerDashboard } from './components/division-manager/DivisionManagerDashboard'
import { DivisionManagerDocumentWorks } from './components/division-manager/DivisionManagerDocumentWorks'
import DivisionManagerFeedback from './components/division-manager/DivisionManagerFeedback'
import DivisionManagerNotifications from './components/division-manager/DivisionManagerNotifications'

// Regional Director components
import { RegionalDirectorProgressOversight } from './components/regional-director/RegionalDirectorProgressOversight'
import { RegionalDirectorReview } from './components/regional-director/RegionalDirectorReview'

function App() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <AuthProvider>
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
                  <AdminTopbar onToggleSidebar={toggleSidebar} />
                  <div className="content">
                    <Routes>
                      <Route path="/" element={<AdminDashboard />} />
                      <Route path="/documents" element={<AdminDocuments />} />
                      <Route path="/requirements" element={<AdminRequirements />} />
                      <Route path="/approvals" element={<AdminApprovals />} />
                      <Route path="/tracking" element={<AdminTracking />} />
                      <Route path="/notifications" element={<AdminNotifications />} />
                      <Route path="/workflow" element={<AdminWorkflow />} />
                      <Route path="/announcements" element={<AdminAnnouncements />} />
                      <Route path="/posts" element={<AdminPosts />} />
                      <Route path="/users" element={<AdminUsers />} />
                      <Route path="/admin" element={<AdminTools />} />
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
                      <Route path="/tasks" element={<StaffTasks />} />
                      <Route path="/notifications" element={<StaffNotifications />} />
                      <Route path="/feedback" element={<StaffFeedback />} />
                      <Route path="/settings" element={<div className="page"><h1>Settings</h1><p>Settings page coming soon...</p></div>} />
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
                      <Route path="/tasks" element={<SectionUnitHeadTasks />} />
                      <Route path="/notifications" element={<SectionUnitHeadNotifications />} />
                      <Route path="/feedback" element={<SectionUnitHeadFeedback />} />
                      <Route path="/reports" element={<SectionUnitHeadReports />} />
                      <Route path="/posts" element={<SectionUnitHeadPosts />} />
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
                      <Route path="/task-assignment" element={<DivisionManagerTaskAssignment />} />
                      <Route path="/reports" element={<SectionUnitHeadReports />} />
                      <Route path="/send-to-regional" element={<DivisionManagerSendToRegional />} />
                      <Route path="/tasks" element={<div className="page"><h1>Tasks</h1><p>Coming soon...</p></div>} />
                      <Route path="/notifications" element={<DivisionManagerNotifications />} />
                      <Route path="/feedback" element={<DivisionManagerFeedback />} />
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
                      <Route path="/review" element={<RegionalDirectorReview />} />
                      <Route path="/progress-oversight" element={<RegionalDirectorProgressOversight />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
