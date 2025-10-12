import type { AuthUser } from '../types/auth';
import type { FunctionalRole, OrganizationalAssignment } from '../types/index';
import { getSectionIdFromOrganizationalAssignment, getFunctionalRoleFromOrganizationalAssignment } from '../types/index';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface RegisterData {
  name: string;
  idNumber: string;
  email: string;
  password: string;
  organizationalAssignment: OrganizationalAssignment;
  // functionalRole and sectionId are automatically determined from organizationalAssignment
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface PendingRegistration {
  id: number;
  name: string;
  idNumber: string;
  email: string;
  functionalRole: FunctionalRole;
  organizationalAssignment: OrganizationalAssignment;
  sectionId: number; // Auto-determined from organizationalAssignment
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface AdminUserManagement {
  approveRegistration: (id: number) => Promise<{ success: boolean; message?: string }>;
  rejectRegistration: (id: number, reason: string) => Promise<{ success: boolean; message?: string }>;
  getPendingRegistrations: () => Promise<PendingRegistration[]>;
}

// Mock user data for demonstration
const mockUsers: Array<{
  email: string;
  password: string;
  functionalRole: FunctionalRole;
  organizationalAssignment: OrganizationalAssignment;
  name: string;
  sectionId: number;
  status: 'active' | 'pending' | 'suspended' | 'inactive';
}> = [
  { email: 'admin@nia.gov.ph', password: 'admin123', functionalRole: 'admin', organizationalAssignment: 'IT', name: 'System Administrator', sectionId: 5, status: 'active' },
  { email: 'john.smith@nia.gov.ph', password: 'user123', functionalRole: 'section_unit_head', organizationalAssignment: 'Engineering', name: 'John Smith', sectionId: 1, status: 'active' },
  { email: 'sarah.johnson@nia.gov.ph', password: 'user123', functionalRole: 'staff', organizationalAssignment: 'Planning', name: 'Sarah Johnson', sectionId: 1, status: 'active' },
  { email: 'mike.chen@nia.gov.ph', password: 'user123', functionalRole: 'division_manager', organizationalAssignment: 'Engineering and Operations', name: 'Mike Chen', sectionId: 1, status: 'active' },
  { email: 'lisa.wang@nia.gov.ph', password: 'user123', functionalRole: 'staff', organizationalAssignment: 'Budget', name: 'Lisa Wang', sectionId: 3, status: 'active' },
  { email: 'david.brown@nia.gov.ph', password: 'user123', functionalRole: 'staff', organizationalAssignment: 'BAC', name: 'David Brown', sectionId: 2, status: 'active' },
  { email: 'regional.director@nia.gov.ph', password: 'user123', functionalRole: 'regional_director', organizationalAssignment: 'Engineering and Operations', name: 'Roberto Santos', sectionId: 1, status: 'active' }
];

// Mock organizational units data
const mockOrganizationalUnits = {
  divisions: [
    { id: 1, name: 'Engineering and Operations' },
    { id: 2, name: 'Administrative and Finance' }
  ],
  sections: [
    { id: 1, name: 'Engineering', divisionId: 1 },
    { id: 2, name: 'Operations', divisionId: 1 },
    { id: 3, name: 'Institutional Development', divisionId: 2 },
    { id: 4, name: 'Finance', divisionId: 2 },
    { id: 5, name: 'Administrative', divisionId: 2 }
  ],
  units: [
    // Engineering Section Units
    { id: 1, name: 'Planning', sectionId: 1 },
    { id: 2, name: 'Design', sectionId: 1 },
    { id: 3, name: 'Construction', sectionId: 1 },
    // Operations Section Units
    { id: 4, name: 'BAC', sectionId: 2 },
    { id: 5, name: 'Operations', sectionId: 2 },
    { id: 6, name: 'Equipment', sectionId: 2 },
    // Institutional Development Section Units
    { id: 7, name: 'Cashiering', sectionId: 3 },
    { id: 8, name: 'Budget', sectionId: 3 },
    { id: 9, name: 'Accounting', sectionId: 3 },
    // Finance Section Units
    { id: 10, name: 'Human Resource', sectionId: 4 },
    // Administrative Section Units
    { id: 11, name: 'Property', sectionId: 5 },
    { id: 12, name: 'IT', sectionId: 5 },
    { id: 13, name: 'Legal', sectionId: 5 },
    { id: 14, name: 'PAIS', sectionId: 5 }
  ]
};

// Mock pending registrations
let mockPendingRegistrations: PendingRegistration[] = [
  {
    id: 1,
    name: 'Maria Garcia',
    idNumber: 'EMP001',
    email: 'maria.garcia@nia.gov.ph',
    functionalRole: 'staff',
    organizationalAssignment: 'Planning',
    sectionId: 1, // Engineering Section
    requestedAt: '2024-01-15T10:30:00',
    status: 'pending'
  },
  {
    id: 2,
    name: 'Carlos Rodriguez',
    idNumber: 'EMP002',
    email: 'carlos.rodriguez@nia.gov.ph',
    functionalRole: 'section_unit_head',
    organizationalAssignment: 'Engineering',
    sectionId: 1, // Engineering Section
    requestedAt: '2024-01-16T14:15:00',
    status: 'pending'
  },
  {
    id: 3,
    name: 'Ana Martinez',
    idNumber: 'EMP003',
    email: 'ana.martinez@nia.gov.ph',
    functionalRole: 'division_manager',
    organizationalAssignment: 'Engineering and Operations',
    sectionId: 1, // Engineering Section
    requestedAt: '2024-01-17T09:45:00',
    status: 'pending'
  }
];


class AuthService {
  // Simulate API delay
  private delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Simulate API call delay
      await this.delay(1500);

      const user = mockUsers.find(
        u => u.email === credentials.email && u.password === credentials.password
      );

      if (user) {
        // Check account status
        if (user.status !== 'active') {
          return {
            success: false,
            error: 'Account is not active. Please contact IT office for assistance.'
          };
        }

        const authUser: AuthUser = {
          USER_ID: 0, // Mock user ID
          EMAIL: user.email,
          NAME: user.name,
          FUNCTIONAL_ROLE: user.functionalRole,
          ORGANIZATIONAL_ROLE: user.organizationalAssignment,
          SECTION_ID: user.sectionId,
          STATUS: user.status
        };
        
        // Store user data in localStorage for persistence
        localStorage.setItem('authUser', JSON.stringify(authUser));
        // Also store full user data for display purposes
        localStorage.setItem('fullUserData', JSON.stringify(user));

        return {
          success: true,
          user: authUser
        };
      } else {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  async register(data: RegisterData): Promise<RegisterResponse> {
    try {
      // Simulate API call delay
      await this.delay(1000);

      // Basic validation
      if (!data.name || !data.idNumber || !data.email || !data.password || !data.organizationalAssignment) {
        return {
          success: false,
          error: 'All registration fields are required.'
        };
      }

      // Check if email already exists in active users
      const existingUser = mockUsers.find(u => u.email === data.email);
      if (existingUser) {
        return {
          success: false,
          error: 'Email already exists. Please use a different email.'
        };
      }

      // Check if email already exists in pending registrations
      const existingPending = mockPendingRegistrations.find(r => r.email === data.email);
      if (existingPending) {
        return {
          success: false,
          error: 'Email already has a pending registration request. Please contact IT office for status.'
        };
      }

      // Auto-determine functional role and section ID based on organizational assignment
      const functionalRole = getFunctionalRoleFromOrganizationalAssignment(data.organizationalAssignment);
      const sectionId = getSectionIdFromOrganizationalAssignment(data.organizationalAssignment);

      // Create new pending registration
      const newRegistration: PendingRegistration = {
        id: mockPendingRegistrations.length + 1,
        name: data.name,
        idNumber: data.idNumber,
        email: data.email,
        functionalRole: functionalRole,
        organizationalAssignment: data.organizationalAssignment,
        sectionId: sectionId,
        requestedAt: new Date().toISOString(),
        status: 'pending'
      };

      mockPendingRegistrations.push(newRegistration);

      console.log('Registration Request:', newRegistration);

      return {
        success: true,
        message: 'Registration request submitted successfully. Please visit the IT office to activate your account. Your account will be reviewed and approved by the system administrator.'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Registration failed. Please try again.'
      };
    }
  }

  logout(): void {
    // Clear any stored authentication data
    localStorage.removeItem('user');
  }

  getCurrentUser(): AuthUser | null {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
      return null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      localStorage.removeItem('user');
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  hasRole(requiredRole: string): boolean {
    const user = this.getCurrentUser();
    return user?.FUNCTIONAL_ROLE === requiredRole;
  }

  hasAnyRole(allowedRoles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? allowedRoles.includes(user.FUNCTIONAL_ROLE) : false;
  }


  // Get organizational assignments for registration form
  async getOrganizationalAssignments(): Promise<OrganizationalAssignment[]> {
    await this.delay(300);
    return [
      // Divisions
      'Engineering and Operations',
      'Administrative and Finance',
      // Sections
      'Engineering',
      'Operations Section',
      'Institutional Development',
      'Finance',
      'Administrative',
      // Units - Engineering Section
      'Planning',
      'Design',
      'Construction',
      'BAC',
      // Units - Operations Section
      'Operations Unit',
      'Equipment',
      // Units - Institutional Development Section
      'Institutional Unit',
      // Units - Finance Section
      'Cashiering',
      'Budget',
      'Accounting',
      // Units - Administrative Section
      'Human Resource',
      'Property',
      // Standalone Units
      'IT',
      'Legal',
      'PAIS'
    ];
  }


  // Admin management methods
  async getPendingRegistrations(): Promise<PendingRegistration[]> {
    try {
      const response = await apiClient.get('/auth/pending-registrations');
      if (response.success) {
        return response.data || [];
      } else {
        console.error('Failed to fetch pending registrations:', response.error);
        return [];
      }
    } catch (error) {
      console.error('Error fetching pending registrations:', error);
      return [];
    }
  }

  async approveRegistration(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiClient.post(`/auth/approve-registration/${id}`, {});
      return response;
    } catch (error) {
      return { success: false, message: 'Failed to approve registration' };
    }
  }

  async rejectRegistration(id: number, reason: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiClient.post(`/auth/reject-registration/${id}`, { reason });
      return response;
    } catch (error) {
      return { success: false, message: 'Failed to reject registration' };
    }
  }
}

export const authService = new AuthService();

// Real API functions (will replace mock functions once backend is ready)
import { apiClient } from './apiClient';

export const loginAPI = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const response = await apiClient.postPublic('/auth/login', credentials);
    
    if (response.success) {
      // Store token in localStorage
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      return { success: true, user: response.user };
    } else {
      return { success: false, error: response.error };
    }
  } catch (error) {
    return { success: false, error: 'Login failed. Please try again.' };
  }
};

export const registerAPI = async (data: RegisterData): Promise<RegisterResponse> => {
  try {
    const response = await apiClient.postPublic('/auth/register', data);
    return response;
  } catch (error) {
    return { success: false, error: 'Registration failed' };
  }
};

// Check if user is authenticated
export const checkAuthAPI = async (): Promise<{ success: boolean; user?: any }> => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { success: false };
    }

    const response = await apiClient.get('/auth/me');
    if (response.success) {
      return { success: true, user: response.user };
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      return { success: false };
    }
  } catch (error) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    return { success: false };
  }
};
