// Database schema types based on database_schema.md

// Re-export auth types
export type { AuthUser } from './auth';

// Role hierarchy types
// Functional roles (what they can do in the system)
export type FunctionalRole = 'staff' | 'section_unit_head' | 'division_manager' | 'regional_director' | 'admin';

// Organizational assignments (where they work)
export type OrganizationalAssignment = 
  // Regional Office
  | 'Regional Office'
  // Divisions
  | 'Engineering and Operations'
  | 'Administrative and Finance'
  // Sections
  | 'Engineering'
  | 'Operations Section'
  | 'Institutional Development'
  | 'Finance'
  | 'Administrative'
  // Units - Engineering Section
  | 'Planning'
  | 'Design'
  | 'Construction'
  | 'BAC'
  // Units - Operations Section
  | 'Operations Unit'
  | 'Equipment'
  // Units - Institutional Development Section
  | 'Institutional Unit'
  // Units - Finance Section
  | 'Cashiering'
  | 'Budget'
  | 'Accounting'
  // Units - Administrative Section
  | 'Human Resource'
  | 'Property'
  // Standalone Units
  | 'IT'
  | 'Legal'
  | 'PAIS'; // Updated organizational structure

// Role permissions
export interface RolePermissions {
  canUpload: boolean;
  canViewTasks: boolean;
  canViewNotifications: boolean;
  canViewFeedback: boolean;
  canAssignTasks: boolean;
  canViewReports: boolean;
  canWriteFeedback: boolean;
  canSendToRegionalManager: boolean;
  canViewProgressOversight: boolean;
}

// Role hierarchy mapping
export const FUNCTIONAL_ROLE_HIERARCHY: Record<FunctionalRole, number> = {
  'staff': 1,
  'section_unit_head': 2,
  'division_manager': 3,
  'regional_director': 4,
  'admin': 5
};

// Get role permissions based on functional role
export const getRolePermissions = (role: FunctionalRole): RolePermissions => {
  switch (role) {
    case 'staff':
      return {
        canUpload: true,
        canViewTasks: true,
        canViewNotifications: true,
        canViewFeedback: true,
        canAssignTasks: false,
        canViewReports: false,
        canWriteFeedback: false,
        canSendToRegionalManager: false,
        canViewProgressOversight: false
      };
    case 'section_unit_head':
      return {
        canUpload: true,
        canViewTasks: true,
        canViewNotifications: true,
        canViewFeedback: true,
        canAssignTasks: true,
        canViewReports: true,
        canWriteFeedback: false,
        canSendToRegionalManager: false,
        canViewProgressOversight: false
      };
    case 'division_manager':
      return {
        canUpload: true,
        canViewTasks: true,
        canViewNotifications: true,
        canViewFeedback: true,
        canAssignTasks: true,
        canViewReports: true,
        canWriteFeedback: true,
        canSendToRegionalManager: true,
        canViewProgressOversight: false
      };
    case 'regional_director':
      return {
        canUpload: false,
        canViewTasks: true, // Can view all tasks (read-only)
        canViewNotifications: true, // Can view notifications
        canViewFeedback: true, // Can view all feedback activity
        canAssignTasks: false,
        canViewReports: true, // Can view all reports/documents
        canWriteFeedback: true, // Can write feedback on any submission
        canSendToRegionalManager: false,
        canViewProgressOversight: true
      };
    case 'admin':
      return {
        canUpload: true,
        canViewTasks: true,
        canViewNotifications: true,
        canViewFeedback: true,
        canAssignTasks: true,
        canViewReports: true,
        canWriteFeedback: true,
        canSendToRegionalManager: false,
        canViewProgressOversight: true
      };
    default:
      return {
        canUpload: false,
        canViewTasks: false,
        canViewNotifications: false,
        canViewFeedback: false,
        canAssignTasks: false,
        canViewReports: false,
        canWriteFeedback: false,
        canSendToRegionalManager: false,
        canViewProgressOversight: false
      };
  }
};

// Helper function to determine functional role based on organizational assignment
export const getFunctionalRoleFromOrganizationalAssignment = (organizationalAssignment: OrganizationalAssignment): FunctionalRole => {
  // Regional Director assignment
  if (organizationalAssignment === 'Regional Office') {
    return 'regional_director';
  }
  
  // Division assignments = Division Manager
  if (organizationalAssignment === 'Engineering and Operations' || 
      organizationalAssignment === 'Administrative and Finance') {
    return 'division_manager';
  }
  
  // Section assignments = Section/Unit Head
  const sections = [
    'Engineering',
    'Operations Section',  // ← Qualified name
    'Institutional Development',
    'Finance',
    'Administrative'
  ];
  
  if (sections.includes(organizationalAssignment)) {
    return 'section_unit_head';
  }
  
  // All other assignments (Units) = Staff
  return 'staff';
};

// Helper function to determine section ID based on organizational assignment
export const getSectionIdFromOrganizationalAssignment = (organizationalAssignment: OrganizationalAssignment): number => {
  // Regional Office assignment - default to Engineering section
  if (organizationalAssignment === 'Regional Office') return 1; // Default to Engineering section
  
  // Division assignments - assign to primary section
  if (organizationalAssignment === 'Engineering and Operations') return 1; // Engineering Section
  if (organizationalAssignment === 'Administrative and Finance') return 3; // Institutional Development Section
  
  // Section assignments
  if (organizationalAssignment === 'Engineering') return 1;
  if (organizationalAssignment === 'Operations Section') return 2;  // ← Qualified name
  if (organizationalAssignment === 'Institutional Development') return 3;
  if (organizationalAssignment === 'Finance') return 4;
  if (organizationalAssignment === 'Administrative') return 5;
  
  // Unit assignments - Engineering Section (Section ID = 1)
  if (['Planning', 'Design', 'Construction'].includes(organizationalAssignment)) {
    return 1;
  }
  
  // Unit assignments - Operations Section (Section ID = 2)
  if (['BAC', 'Operations Unit', 'Equipment'].includes(organizationalAssignment)) {  // ← Updated
    return 2;
  }
  
  // Unit assignments - Institutional Development Section (Section ID = 3)
  if (['Cashiering', 'Budget', 'Accounting'].includes(organizationalAssignment)) {
    return 3;
  }
  
  // Unit assignments - Finance Section (Section ID = 4)
  if (organizationalAssignment === 'Human Resource') {
    return 4;
  }
  
  // Unit assignments - Administrative Section (Section ID = 5)
  if (['Property', 'IT', 'Legal', 'PAIS'].includes(organizationalAssignment)) {
    return 5;
  }
  
  return 1; // Default fallback
};

export interface User {
  USER_ID: number;
  NAME: string;
  ID_NUMBER: string;
  EMAIL: string;
  PASSWORD: string;
  SECTION_ID: number;  // Users are always assigned to a SECTION
  FUNCTIONAL_ROLE: FunctionalRole;  // What they can do (staff, section_unit_head, division_manager, etc.)
  ORGANIZATIONAL_ASSIGNMENT: OrganizationalAssignment;  // Where they work (Engineering, Planning, etc.)
  STATUS: 'active' | 'pending' | 'suspended' | 'inactive';
  CREATED_AT: string;
  APPROVED_AT?: string;
  APPROVED_BY?: number;
  // New fields for enhanced features
  NOTIFICATION_PREFERENCES?: {
    email: boolean;
    inApp: boolean;
  };
}

export interface PendingUserRegistration {
  REGISTRATION_ID: number;
  NAME: string;
  ID_NUMBER: string;
  EMAIL: string;
  PASSWORD: string;
  SECTION_ID: number;  // User must be assigned to a SECTION
  FUNCTIONAL_ROLE: FunctionalRole;  // What they can do
  ORGANIZATIONAL_ASSIGNMENT: OrganizationalAssignment;  // Where they work
  STATUS: 'pending' | 'approved' | 'rejected';
  REQUESTED_AT: string;
  APPROVED_AT?: string;
  APPROVED_BY?: number;
  REJECTION_REASON?: string;
}

export interface Document {
  DOCUMENT_ID: number;
  TITLE: string;
  DESCRIPTION?: string;
  FILE_LINK: string;
  FINGERPRINT_HASH: string;
  CATEGORY_ID: number;
  SECTION_ID: number;
  ASSIGNED_TO?: number;
  CREATED_BY: number;
  CREATED_AT: string;
  FREQUENCY?: string;
  TAGS?: string;
  REVISION_COUNT?: number;
  CURRENT_APPROVER_ROLE?: FunctionalRole;
  CURRENT_APPROVER_ID?: number;
  // New fields for task management integration
  FULFILLS_TASK_ID?: number; // Link document to task
  FORWARDED_TO_REGIONAL?: boolean;
  FORWARDED_BY?: number;
  FORWARDED_AT?: string;
}

export interface DocumentCategory {
  CATEGORY_ID: number;
  NAME: string;
  DESCRIPTION?: string;
}

export interface DocumentApproval {
  APPROVAL_ID: number;
  DOCUMENT_ID: number;
  USER_ID: number;
  ROLE: number;
  STATUS: number; // 0=Pending, 1=Approved, 2=Rejected, 3=Revision_Requested
  REMARKS?: string;
  DATE_SUBMITTED: string;
  DATE_STATUS_CHANGED?: string;
  DATE_APPROVED?: string;
}

export interface DocumentRequirement {
  REQUIREMENT_ID: number;
  DOCUMENT_ID?: number;
  DIVISION_ID?: number;
  SECTION_ID?: number;
  UNIT_ID?: number;
  ASSIGNED_TO: number;
  DUE_DATE: string;
  INSTRUCTIONS?: string;
  CREATED_AT: string;
}

export interface DocumentStatus {
  STATUS_ID: number;
  DOCUMENT_ID: number;
  STATUS: string;
  REMARKS?: string;
  CREATED_AT: string;
}

export interface Division {
  DIVISION_ID: number;
  NAME: string;
  DESCRIPTION?: string;
}

export interface Section {
  SECTION_ID: number;
  NAME: string;
  DIVISION_ID: number;
  HEAD_ID?: number;
}

export interface Unit {
  UNIT_ID: number;
  NAME: string;
  SECTION_ID: number;
  HEAD_ID?: number;
}

// Organizational hierarchy types
export interface OrganizationalUnit {
  id: number;
  name: string;
  type: 'division' | 'section' | 'unit';
  parentId?: number;
  children?: OrganizationalUnit[];
}

// Registration form data
export interface RegistrationFormData {
  name: string;
  idNumber: string;
  email: string;
  password: string;
  organizationalAssignment: OrganizationalAssignment;  // Where they work
  // functionalRole and sectionId are automatically determined from organizationalAssignment
}

export interface SystemNotification {
  NOTIFICATION_ID: number;
  USER_ID: number;
  MESSAGE: string;
  IS_READ: boolean;
  CREATED_AT: string;
}

export interface Feedback {
  FEEDBACK_ID: number;
  DOCUMENT_ID: number;
  USER_ID: number;
  POST_ID?: number;
  COMMENT: string;
  CREATED_AT: string;
}

// Extended types for UI
export interface DocumentWithDetails extends Document {
  category?: DocumentCategory;
  section?: Section;
  assignedUser?: User;
  createdByUser?: User;
  currentStatus?: DocumentStatus;
  approvals?: DocumentApproval[];
}

export interface DocumentRequirementWithDetails extends DocumentRequirement {
  document?: Document;
  division?: Division;
  section?: Section;
  unit?: Unit;
  assignedUser?: User;
}

export interface DocumentApprovalWithDetails extends DocumentApproval {
  document?: Document;
  user?: User;
}

// Form types
export interface DocumentSubmissionForm {
  title: string;
  description?: string;
  fileLink: string;
  categoryId: number;
  sectionId: number;
  assignedTo?: number;
  frequency?: string;
  tags?: string;
}

export interface RequirementCreationForm {
  title: string;
  documentId?: number;
  divisionId?: number;
  sectionId?: number;
  unitId?: number;
  assignedTo: number;
  dueDate: string;
  instructions?: string;
}

export interface ApprovalActionForm {
  documentId: number;
  status: 'approved' | 'rejected' | 'pending' | 'request_revision';
  remarks?: string;
}

// Status types
export type DocumentStatusType = 
  | 'Draft' 
  | 'Submitted' 
  | 'Under_Section_Review' 
  | 'Under_Division_Review' 
  | 'Under_Regional_Review' 
  | 'Revision_Required' 
  | 'Approved' 
  | 'Archived' 
  | 'Rejected';

export type ApprovalStatusType = 'Pending' | 'Approved' | 'Rejected' | 'Revision_Requested';
export type FrequencyType = 'One-time' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';

// Workflow state tracking
export interface WorkflowState {
  currentStage: DocumentStatusType;
  nextStage?: DocumentStatusType;
  isComplete: boolean;
  lastActionBy?: number;
  lastActionAt?: string;
  revisionHistory?: RevisionEntry[];
}

// Revision tracking
export interface RevisionEntry {
  revisionNumber: number;
  requestedBy: number;
  requestedAt: string;
  feedback: string;
  resubmittedAt?: string;
  resubmittedBy?: number;
}

// Pending approvals for specific roles
export interface PendingApproval {
  document: DocumentWithDetails;
  currentApproval: DocumentApprovalWithDetails;
  workflowState: WorkflowState;
  timeInStage: number; // minutes
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// TASK MANAGEMENT TYPES (Google Classroom-like Features)
// ============================================================================

// Task-related types
export interface Task {
  TASK_ID: number;
  TITLE: string;
  DESCRIPTION: string;
  ASSIGNED_BY: number; // User ID of assigner
  ASSIGNED_TO: number; // User ID of assignee
  SECTION_ID: number; // For filtering/organization
  STATUS: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  PRIORITY: 'low' | 'medium' | 'high' | 'urgent';
  DUE_DATE: string; // ISO date string
  CREATED_AT: string;
  COMPLETED_AT?: string;
  REQUIRES_DOCUMENT: boolean; // Does this task need a document upload?
  LINKED_DOCUMENT_ID?: number; // If document was submitted for this task
  CATEGORY?: string; // For organization
  TAGS?: string;
}

export interface TaskWithDetails extends Task {
  assignedBy: User;
  assignedTo: User;
  section: Section;
  linkedDocument?: DocumentWithDetails;
}

// Enhanced Feedback types (beyond approval remarks)
export interface TaskFeedback {
  FEEDBACK_ID: number;
  AUTHOR_ID: number; // Who wrote the feedback
  RECIPIENT_ID: number; // Who receives it
  RELATED_DOCUMENT_ID?: number; // If feedback is on a document
  RELATED_TASK_ID?: number; // If feedback is on a task
  TYPE: 'positive' | 'constructive' | 'action_required' | 'question';
  CONTENT: string;
  CREATED_AT: string;
  READ: boolean;
}

export interface TaskFeedbackWithDetails extends TaskFeedback {
  author: User;
  recipient: User;
  relatedDocument?: DocumentWithDetails;
  relatedTask?: TaskWithDetails;
}

// Enhanced Notification types
export interface TaskNotification {
  NOTIFICATION_ID: number;
  USER_ID: number; // Who receives this notification
  TYPE: 'task_assigned' | 'document_submitted' | 'feedback_received' | 
        'due_date_reminder' | 'revision_requested' | 'approval_received' | 
        'task_completed' | 'document_forwarded';
  TITLE: string;
  MESSAGE: string;
  RELATED_TASK_ID?: number;
  RELATED_DOCUMENT_ID?: number;
  RELATED_FEEDBACK_ID?: number;
  IS_READ: boolean;
  CREATED_AT: string;
  ACTION_URL?: string; // Where to navigate when clicked
}

export interface TaskNotificationWithDetails extends TaskNotification {
  relatedTask?: TaskWithDetails;
  relatedDocument?: DocumentWithDetails;
  relatedFeedback?: TaskFeedbackWithDetails;
}

// Progress metrics for Regional Director
export interface ProgressMetrics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  pendingDocuments: number;
  completedDocuments: number;
  feedbackCount: number;
  byDivision: {
    divisionName: string;
    tasksCompleted: number;
    tasksTotal: number;
    documentsCompleted: number;
    documentsTotal: number;
  }[];
  bySectionUnit: {
    name: string;
    completionRate: number;
    overdueCount: number;
  }[];
}

// Task creation and management forms
export interface TaskCreationForm {
  title: string;
  description: string;
  assignedTo: number;
  assignedBy: number; // Required field for backend - who created the task
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requiresDocument: boolean;
  category?: string;
  tags?: string;
  sectionId?: number; // Optional field for backend
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  assignee?: number;
  assignedBy?: number;
  section?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export interface FeedbackForm {
  recipientId: number;
  relatedDocumentId?: number;
  relatedTaskId?: number;
  type: 'positive' | 'constructive' | 'action_required' | 'question';
  content: string;
}

export interface NotificationForm {
  userId: number;
  type: TaskNotification['TYPE'];
  title: string;
  message: string;
  relatedTaskId?: number;
  relatedDocumentId?: number;
  relatedFeedbackId?: number;
  actionUrl?: string;
}

// Additional types for progress oversight
export interface DivisionMetrics {
  divisionId: number;
  divisionName: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  averageCompletionTime: number; // hours
}

export interface SectionMetrics {
  sectionId: number;
  sectionName: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  staffCount: number;
}

export interface SystemHealth {
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  overdueTasks: number;
  pendingDocuments: number;
  systemUptime: number; // hours
  lastBackup?: string;
}

// Stream Posts
export interface StreamPost {
  POST_ID: number;
  TITLE: string;
  MESSAGE: string;
  POSTED_BY: number;
  SECTION_ID: number;
  ATTACHMENT_LINK?: string;
  ATTACHMENT_FILE_URL?: string;
  ATTACHMENT_EXTERNAL_URL?: string;
  CREATED_AT: string;
  AUTHOR_NAME: string;
  AUTHOR_ROLE: string;
  SECTION_NAME: string;
}

export interface StreamPostCreate {
  title: string;
  message: string;
  sectionId: number;
  attachmentLink?: string;
  attachmentFileUrl?: string;
  attachmentExternalUrl?: string;
}

export interface StreamPostUpdate {
  title?: string;
  message?: string;
  attachmentLink?: string;
  attachmentFileUrl?: string;
  attachmentExternalUrl?: string;
}