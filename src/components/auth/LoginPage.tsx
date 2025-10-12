import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authService, loginAPI, registerAPI } from '../../services/auth'
import type { FunctionalRole, OrganizationalAssignment } from '../../types/index'

export function LoginPage() {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [isRegistering, setIsRegistering] = React.useState(false)
  const [registerName, setRegisterName] = React.useState('')
  const [registerIdNumber, setRegisterIdNumber] = React.useState('')
  const [registerEmail, setRegisterEmail] = React.useState('')
  const [registerPassword, setRegisterPassword] = React.useState('')
  const [registerOrganizationalAssignment, setRegisterOrganizationalAssignment] = React.useState<OrganizationalAssignment | null>(null)
  const [organizationalAssignments, setOrganizationalAssignments] = React.useState<OrganizationalAssignment[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated } = useAuth()

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location.state?.from?.pathname])

  // Load organizational assignments when switching to registration
  React.useEffect(() => {
    if (isRegistering && organizationalAssignments.length === 0) {
      const loadData = async () => {
        try {
          const orgAssignments = await authService.getOrganizationalAssignments()
          setOrganizationalAssignments(orgAssignments)
        } catch (error) {
          console.error('Failed to load organizational assignments:', error)
        }
      }
      loadData()
    }
  }, [isRegistering, organizationalAssignments.length])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await loginAPI({ email, password })
      
      if (response.success && response.user) {
        login(response.user)
        
        // Redirect based on role
        if (response.user.FUNCTIONAL_ROLE === 'admin') {
          navigate('/admin')
        } else if (response.user.FUNCTIONAL_ROLE === 'staff') {
          navigate('/staff')
        } else if (response.user.FUNCTIONAL_ROLE === 'section_unit_head') {
          navigate('/section-unit-head/task-assignment')
        } else if (response.user.FUNCTIONAL_ROLE === 'division_manager') {
          navigate('/division-manager/review')
        } else if (response.user.FUNCTIONAL_ROLE === 'regional_director') {
          navigate('/regional-director/review')
        } else {
          navigate('/staff') // Default fallback
        }
      } else {
        setError(response.error || 'Login failed')
      }
    } catch (error) {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (!registerOrganizationalAssignment) {
        setError('Please select your organizational assignment.')
        return
      }

      const response = await registerAPI({
        name: registerName,
        idNumber: registerIdNumber,
        email: registerEmail,
        password: registerPassword,
        organizationalAssignment: registerOrganizationalAssignment
      })

      if (response.success) {
        alert(response.message || 'Registration request submitted. Awaiting approval from ICT Office.')
        setIsRegistering(false) // Go back to login form
        setRegisterName('')
        setRegisterIdNumber('')
        setRegisterEmail('')
        setRegisterPassword('')
        setRegisterOrganizationalAssignment(null)
      } else {
        setError(response.error || 'Registration failed')
      }
    } catch (error) {
      setError('Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-pattern"></div>
      </div>
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <h1>INTRADOC</h1>
          </div>
          <p className="auth-subtitle">{isRegistering ? 'Register Account' : 'Intranet-Based Document Monitoring & Management System'}</p>
          <p className="auth-organization">National Irrigation Administration</p>
        </div>
        
        <form className="auth-form" onSubmit={isRegistering ? handleRegister : handleLogin}>
          {error && (
            <div className="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {error}
            </div>
          )}
          
          {isRegistering ? (
            <>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="register-id-number">ID Number</label>
                  <input
                    id="register-id-number"
                    type="text"
                    placeholder="Enter your ID number"
                    value={registerIdNumber}
                    onChange={(e) => setRegisterIdNumber(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="register-name">Full Name</label>
                  <input
                    id="register-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="register-email">Email Address</label>
                  <input
                    id="register-email"
                    type="email"
                    placeholder="Enter your email address"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="register-password">Password</label>
                  <input
                    id="register-password"
                    type="password"
                    placeholder="Enter your password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group form-group-full">
                <label htmlFor="register-organizational-assignment">Organizational Assignment</label>
                <select
                  id="register-organizational-assignment"
                  value={registerOrganizationalAssignment || ''}
                  onChange={(e) => setRegisterOrganizationalAssignment(e.target.value as OrganizationalAssignment)}
                  disabled={isLoading || organizationalAssignments.length === 0}
                >
                  <option value="">Select where you work...</option>
                  
                  <optgroup label="Regional Office">
                    <option value="Regional Office">Regional Office</option>
                  </optgroup>
                  
                  <optgroup label="Divisions">
                    <option value="Engineering and Operations">Engineering and Operations</option>
                    <option value="Administrative and Finance">Administrative and Finance</option>
                  </optgroup>
                  
                  <optgroup label="Sections">
                    <option value="Engineering">Engineering</option>
                    <option value="Operations Section">Operations</option>
                    <option value="Institutional Development">Institutional Development</option>
                    <option value="Finance">Finance</option>
                    <option value="Administrative">Administrative</option>
                  </optgroup>
                  
                  <optgroup label="Units - Engineering Section">
                    <option value="Planning">Planning</option>
                    <option value="Design">Design</option>
                    <option value="Construction">Construction</option>
                    <option value="BAC">BAC (Bids and Awards Committee)</option>
                  </optgroup>
                  
                  <optgroup label="Units - Operations Section">
                    <option value="Operations Unit">Operations</option>
                    <option value="Equipment">Equipment</option>
                  </optgroup>
                  
                  <optgroup label="Units - Institutional Development Section">
                    <option value="Institutional Unit">Institutional Unit</option>
                  </optgroup>
                  
                  <optgroup label="Units - Finance Section">
                    <option value="Cashiering">Cashiering</option>
                    <option value="Budget">Budget</option>
                    <option value="Accounting">Accounting</option>
                  </optgroup>
                  
                  <optgroup label="Units - Administrative Section">
                    <option value="Human Resource">Human Resource</option>
                    <option value="Property">Property</option>
                  </optgroup>
                  
                  <optgroup label="Standalone Units">
                    <option value="IT">IT</option>
                    <option value="Legal">Legal</option>
                    <option value="PAIS">PAIS</option>
                  </optgroup>
                </select>
                <small className="form-help">
                  <strong>Your functional role will be automatically assigned:</strong>
                  <br />• Regional Office → Regional Director (full access)
                  <br />• Division → Division Manager
                  <br />• Section → Section/Unit Head
                  <br />• Unit → Staff
                </small>
              </div>
            </>
          ) : (
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
          )}
          
          {!isRegistering && (
            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span className="checkmark"></span>
                Remember me
              </label>
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>
          )}
          
          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="spinner"></div>
                {isRegistering ? 'Registering...' : 'Signing in...'}
              </>
            ) : (
              isRegistering ? 'Register' : 'Sign In'
            )}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>
            {isRegistering ? "Already have an account?" : "Don't have an account?"}{' '}
            <button className="link-button" onClick={() => setIsRegistering(!isRegistering)}>
              {isRegistering ? "Login" : "Register here"}
            </button>
          </p>
          {!isRegistering && (
            <div className="demo-credentials">
              <h4>Demo Credentials:</h4>
              <div className="credential-item">
                <strong>Admin:</strong> admin@nia.gov.ph / admin123
              </div>
              <div className="credential-item">
                <strong>Staff:</strong> sarah.johnson@nia.gov.ph / user123
              </div>
              <div className="credential-item">
                <strong>Section Head:</strong> john.smith@nia.gov.ph / user123
              </div>
              <div className="credential-item">
                <strong>Division Manager:</strong> mike.chen@nia.gov.ph / user123
              </div>
              <div className="credential-item">
                <strong>Regional Director:</strong> regional.director@nia.gov.ph / user123
              </div>
            </div>
          )}
          <div className="copyright">
            <p>© 2024 National Irrigation Administration</p>
            <p>All rights reserved</p>
          </div>
        </div>
      </div>
    </div>
  )
}
