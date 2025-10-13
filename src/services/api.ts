import * as Types from '../types';
import { apiClient } from './apiClient';

// Type aliases for cleaner code
type Document = Types.Document;
type DocumentWithDetails = Types.DocumentWithDetails;
type DocumentCategory = Types.DocumentCategory;
type DocumentRequirement = Types.DocumentRequirement;
type DocumentRequirementWithDetails = Types.DocumentRequirementWithDetails;
type DocumentApproval = Types.DocumentApproval;
type DocumentApprovalWithDetails = Types.DocumentApprovalWithDetails;
type User = Types.User;
type Section = Types.Section;
type Division = Types.Division;
type Unit = Types.Unit;
type DocumentSubmissionForm = Types.DocumentSubmissionForm;
type RequirementCreationForm = Types.RequirementCreationForm;
type ApprovalActionForm = Types.ApprovalActionForm;
type ApiResponse<T> = Types.ApiResponse<T>;
type PaginatedResponse<T> = Types.PaginatedResponse<T>;

// New type aliases for task management
type Task = Types.Task;
type TaskWithDetails = Types.TaskWithDetails;
type TaskFeedback = Types.TaskFeedback;
type TaskFeedbackWithDetails = Types.TaskFeedbackWithDetails;
type TaskNotification = Types.TaskNotification;
type TaskNotificationWithDetails = Types.TaskNotificationWithDetails;
type TaskCreationForm = Types.TaskCreationForm;
type TaskFilters = Types.TaskFilters;
type FeedbackForm = Types.FeedbackForm;
type NotificationForm = Types.NotificationForm;
type ProgressMetrics = Types.ProgressMetrics;
type DivisionMetrics = Types.DivisionMetrics;
type SectionMetrics = Types.SectionMetrics;
type SystemHealth = Types.SystemHealth;

// Mock data - In a real application, these would be API calls
class ApiService {
  private baseUrl = 'http://localhost:3001/api'; // Adjust based on your backend

  // Real API calls using apiClient
  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      const response = await apiClient.get('/auth/users');
      return response;
    } catch (error) {
      console.error('Error fetching users:', error);
      return { success: false, error: 'Failed to fetch users' };
    }
  }

  // Mock data storage
  private documents: DocumentWithDetails[] = [
    {
      DOCUMENT_ID: 1,
      TITLE: 'Q1 Budget Report',
      DESCRIPTION: 'Quarterly budget analysis and projections',
      FILE_LINK: 'https://drive.google.com/file/d/1abc123/view',
      FINGERPRINT_HASH: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
      CATEGORY_ID: 1,
      SECTION_ID: 1,
      ASSIGNED_TO: 2,
      CREATED_BY: 1,
      CREATED_AT: '2024-03-25T10:00:00Z',
      FREQUENCY: 'Quarterly',
      TAGS: 'budget, quarterly, finance',
      category: { CATEGORY_ID: 1, NAME: 'Financial Reports', DESCRIPTION: 'Financial documents and reports' },
      section: { SECTION_ID: 1, NAME: 'Finance', DIVISION_ID: 1 },
      assignedUser: { USER_ID: 2, NAME: 'John Smith', ID_NUMBER: 'EMP001', EMAIL: 'john@company.com', PASSWORD: '', SECTION_ID: 1, FUNCTIONAL_ROLE: 'staff', ORGANIZATIONAL_ASSIGNMENT: 'Engineering', STATUS: 'active', CREATED_AT: '2024-01-01T00:00:00Z' },
      createdByUser: { USER_ID: 1, NAME: 'Admin User', ID_NUMBER: 'ADM001', EMAIL: 'admin@company.com', PASSWORD: '', SECTION_ID: 5, FUNCTIONAL_ROLE: 'admin', ORGANIZATIONAL_ASSIGNMENT: 'IT', STATUS: 'active', CREATED_AT: '2024-01-01T00:00:00Z' },
      currentStatus: { STATUS_ID: 1, DOCUMENT_ID: 1, STATUS: 'On-Going', REMARKS: 'Under review', CREATED_AT: '2024-03-25T10:00:00Z' }
    },
    {
      DOCUMENT_ID: 2,
      TITLE: 'Safety Guidelines v2.1',
      DESCRIPTION: 'Updated safety protocols and procedures',
      FILE_LINK: 'https://drive.google.com/file/d/2def456/view',
      FINGERPRINT_HASH: 'd4e5f6g7h8i9012345678901234567890abcdef1234567890abcdef123456',
      CATEGORY_ID: 2,
      SECTION_ID: 2,
      ASSIGNED_TO: 3,
      CREATED_BY: 1,
      CREATED_AT: '2024-03-20T14:30:00Z',
      FREQUENCY: 'Annually',
      TAGS: 'safety, protocols, guidelines',
      category: { CATEGORY_ID: 2, NAME: 'Safety Protocols', DESCRIPTION: 'Safety and security documentation' },
      section: { SECTION_ID: 2, NAME: 'Operations', DIVISION_ID: 1 },
      assignedUser: { USER_ID: 3, NAME: 'Sarah Johnson', ID_NUMBER: 'EMP002', EMAIL: 'sarah@company.com', PASSWORD: '', SECTION_ID: 2, FUNCTIONAL_ROLE: 'staff', ORGANIZATIONAL_ASSIGNMENT: 'Operations', STATUS: 'active', CREATED_AT: '2024-01-01T00:00:00Z' },
      createdByUser: { USER_ID: 1, NAME: 'Admin User', ID_NUMBER: 'ADM001', EMAIL: 'admin@company.com', PASSWORD: '', SECTION_ID: 5, FUNCTIONAL_ROLE: 'admin', ORGANIZATIONAL_ASSIGNMENT: 'IT', STATUS: 'active', CREATED_AT: '2024-01-01T00:00:00Z' },
      currentStatus: { STATUS_ID: 2, DOCUMENT_ID: 2, STATUS: 'Approved', CREATED_AT: '2024-03-22T09:15:00Z' }
    }
  ];

  private categories: DocumentCategory[] = [
    { CATEGORY_ID: 1, NAME: 'Financial Reports', DESCRIPTION: 'Financial documents and reports' },
    { CATEGORY_ID: 2, NAME: 'Safety Protocols', DESCRIPTION: 'Safety and security documentation' },
    { CATEGORY_ID: 3, NAME: 'HR Documentation', DESCRIPTION: 'Human resources policies and procedures' },
    { CATEGORY_ID: 4, NAME: 'IT Documentation', DESCRIPTION: 'Information technology documentation' },
    { CATEGORY_ID: 5, NAME: 'Compliance Reports', DESCRIPTION: 'Regulatory compliance documentation' },
    { CATEGORY_ID: 6, NAME: 'Policy Documents', DESCRIPTION: 'Organizational policies and procedures' }
  ];

  private sections: Section[] = [
    { SECTION_ID: 1, NAME: 'Finance', DIVISION_ID: 1 },
    { SECTION_ID: 2, NAME: 'Operations', DIVISION_ID: 1 },
    { SECTION_ID: 3, NAME: 'Engineering', DIVISION_ID: 1 },
    { SECTION_ID: 4, NAME: 'Institutional Development', DIVISION_ID: 2 },
    { SECTION_ID: 5, NAME: 'Administrative', DIVISION_ID: 2 }
  ];

  private divisions: Division[] = [
    { DIVISION_ID: 1, NAME: 'Engineering and Operations', DESCRIPTION: 'Engineering and operations division' },
    { DIVISION_ID: 2, NAME: 'Administrative and Finance', DESCRIPTION: 'Administrative and finance division' }
  ];

  private units: Unit[] = [
    { UNIT_ID: 1, NAME: 'Planning', SECTION_ID: 1 },
    { UNIT_ID: 2, NAME: 'Design', SECTION_ID: 1 },
    { UNIT_ID: 3, NAME: 'Construction', SECTION_ID: 1 },
    { UNIT_ID: 4, NAME: 'BAC', SECTION_ID: 2 },
    { UNIT_ID: 5, NAME: 'Operations', SECTION_ID: 2 },
    { UNIT_ID: 6, NAME: 'Equipment', SECTION_ID: 2 },
    { UNIT_ID: 7, NAME: 'Cashiering', SECTION_ID: 3 },
    { UNIT_ID: 8, NAME: 'Budget', SECTION_ID: 3 },
    { UNIT_ID: 9, NAME: 'Accounting', SECTION_ID: 3 },
    { UNIT_ID: 10, NAME: 'Human Resource', SECTION_ID: 4 },
    { UNIT_ID: 11, NAME: 'Property', SECTION_ID: 5 },
    { UNIT_ID: 12, NAME: 'IT', SECTION_ID: 5 },
    { UNIT_ID: 13, NAME: 'Legal', SECTION_ID: 5 },
    { UNIT_ID: 14, NAME: 'PAIS', SECTION_ID: 5 }
  ];

  private users: User[] = [
    { USER_ID: 1, NAME: 'Admin User', ID_NUMBER: 'ADM001', EMAIL: 'admin@company.com', PASSWORD: '', SECTION_ID: 5, FUNCTIONAL_ROLE: 'admin', ORGANIZATIONAL_ASSIGNMENT: 'IT', STATUS: 'active', CREATED_AT: '2024-01-01T00:00:00Z' },
    { USER_ID: 2, NAME: 'John Smith', ID_NUMBER: 'EMP001', EMAIL: 'john@company.com', PASSWORD: '', SECTION_ID: 1, FUNCTIONAL_ROLE: 'staff', ORGANIZATIONAL_ASSIGNMENT: 'Engineering', STATUS: 'active', CREATED_AT: '2024-01-01T00:00:00Z' },
    { USER_ID: 3, NAME: 'Sarah Johnson', ID_NUMBER: 'EMP002', EMAIL: 'sarah@company.com', PASSWORD: '', SECTION_ID: 2, FUNCTIONAL_ROLE: 'staff', ORGANIZATIONAL_ASSIGNMENT: 'Operations', STATUS: 'active', CREATED_AT: '2024-01-01T00:00:00Z' }
  ];

  // Mock task data
  private tasks: TaskWithDetails[] = [
    {
      TASK_ID: 1,
      TITLE: 'Complete Safety Report',
      DESCRIPTION: 'Prepare monthly safety inspection report',
      ASSIGNED_TO: 2,
      ASSIGNED_BY: 1,
      DUE_DATE: '2024-04-15',
      STATUS: 'pending',
      PRIORITY: 'high',
      CATEGORY: 'Safety',
      TAGS: 'safety, monthly, inspection',
      CREATED_AT: '2024-03-25T10:00:00Z',
      COMPLETED_AT: null,
      assignedToUser: { USER_ID: 2, NAME: 'John Smith', ID_NUMBER: 'EMP001', EMAIL: 'john@company.com', PASSWORD: '', SECTION_ID: 1, FUNCTIONAL_ROLE: 'staff', ORGANIZATIONAL_ASSIGNMENT: 'Engineering', STATUS: 'active', CREATED_AT: '2024-01-01T00:00:00Z' },
      assignedByUser: { USER_ID: 1, NAME: 'Admin User', ID_NUMBER: 'ADM001', EMAIL: 'admin@company.com', PASSWORD: '', SECTION_ID: 5, FUNCTIONAL_ROLE: 'admin', ORGANIZATIONAL_ASSIGNMENT: 'IT', STATUS: 'active', CREATED_AT: '2024-01-01T00:00:00Z' }
    }
  ];

  // Mock feedback data
  private feedback: TaskFeedbackWithDetails[] = [
    {
      FEEDBACK_ID: 1,
      AUTHOR_ID: 1,
      RECIPIENT_ID: 2,
      RELATED_TASK_ID: 1,
      RELATED_DOCUMENT_ID: null,
      TYPE: 'positive',
      CONTENT: 'Great work on the safety report!',
      CREATED_AT: '2024-03-25T14:00:00Z',
      READ: false,
      authorUser: { USER_ID: 1, NAME: 'Admin User', ID_NUMBER: 'ADM001', EMAIL: 'admin@company.com', PASSWORD: '', SECTION_ID: 5, FUNCTIONAL_ROLE: 'admin', ORGANIZATIONAL_ASSIGNMENT: 'IT', STATUS: 'active', CREATED_AT: '2024-01-01T00:00:00Z' },
      recipientUser: { USER_ID: 2, NAME: 'John Smith', ID_NUMBER: 'EMP001', EMAIL: 'john@company.com', PASSWORD: '', SECTION_ID: 1, FUNCTIONAL_ROLE: 'staff', ORGANIZATIONAL_ASSIGNMENT: 'Engineering', STATUS: 'active', CREATED_AT: '2024-01-01T00:00:00Z' }
    }
  ];

  // Mock notification data
  private notifications: TaskNotificationWithDetails[] = [
    {
      NOTIFICATION_ID: 1,
      USER_ID: 2,
      TYPE: 'task_assigned',
      TITLE: 'New Task Assigned',
      MESSAGE: 'You have been assigned a new task: Complete Safety Report',
      ACTION_URL: '/staff/tasks',
      READ: false,
      CREATED_AT: '2024-03-25T10:00:00Z',
      user: { USER_ID: 2, NAME: 'John Smith', ID_NUMBER: 'EMP001', EMAIL: 'john@company.com', PASSWORD: '', SECTION_ID: 1, FUNCTIONAL_ROLE: 'staff', ORGANIZATIONAL_ASSIGNMENT: 'Engineering', STATUS: 'active', CREATED_AT: '2024-01-01T00:00:00Z' }
    }
  ];

  // Document methods
  async getDocuments(userId: number): Promise<ApiResponse<DocumentWithDetails[]>> {
    try {
      const response = await apiClient.get('/documents');
      return response;
    } catch (error) {
      console.error('Error fetching documents:', error);
      return { success: false, error: 'Failed to fetch documents' };
    }
  }

  async getDocumentById(documentId: number): Promise<ApiResponse<DocumentWithDetails>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const document = this.documents.find(d => d.DOCUMENT_ID === documentId);
        resolve({ success: true, data: document });
      }, 300);
    });
  }

  async uploadDocument(formData: FormData): Promise<ApiResponse<Document>> {
    try {
      const response = await apiClient.postFormData('/documents/upload', formData);
      return response;
    } catch (error) {
      console.error('Error uploading document:', error);
      return { success: false, error: 'Failed to upload document' };
    }
  }

  async getCategories(): Promise<ApiResponse<DocumentCategory[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, data: this.categories });
      }, 200);
    });
  }

  async getSections(): Promise<ApiResponse<Section[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, data: this.sections });
      }, 200);
    });
  }

  async getDivisions(): Promise<ApiResponse<Division[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, data: this.divisions });
      }, 200);
    });
  }

  async getUnits(): Promise<ApiResponse<Unit[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, data: this.units });
      }, 200);
    });
  }

  // Task methods
  async createTask(taskData: TaskCreationForm): Promise<ApiResponse<Task>> {
    try {
      const response = await apiClient.post('/tasks', taskData);
      return response;
    } catch (error) {
      console.error('Error creating task:', error);
      return { success: false, error: 'Failed to create task' };
    }
  }

  async getTasks(userId: number): Promise<ApiResponse<TaskWithDetails[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, data: this.tasks });
      }, 300);
    });
  }

  async getTasksAssignedTo(userId: number): Promise<ApiResponse<TaskWithDetails[]>> {
    try {
      const response = await apiClient.get(`/tasks/assigned-to/${userId}`);
      return response;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return { success: false, error: 'Failed to fetch tasks' };
    }
  }

  async getTasksAssignedBy(userId: number): Promise<ApiResponse<TaskWithDetails[]>> {
    try {
      const response = await apiClient.get(`/tasks/assigned-by/${userId}`);
      return response;
    } catch (error) {
      console.error('Error fetching assigned tasks:', error);
      return { success: false, error: 'Failed to fetch tasks' };
    }
  }

  async getTaskById(taskId: number): Promise<ApiResponse<TaskWithDetails>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const task = this.tasks.find(t => t.TASK_ID === taskId);
        resolve({ success: true, data: task });
      }, 300);
    });
  }

  async updateTaskStatus(taskId: number, status: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put(`/tasks/${taskId}/status`, { status });
      return response;
    } catch (error) {
      console.error('Error updating task status:', error);
      return { success: false, error: 'Failed to update task status' };
    }
  }

  async completeTask(taskId: number): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put(`/tasks/${taskId}/status`, { status: 'completed' });
      return response;
    } catch (error) {
      console.error('Error completing task:', error);
      return { success: false, error: 'Failed to complete task' };
    }
  }

  async getDocumentsBySection(sectionId: number): Promise<ApiResponse<DocumentWithDetails[]>> {
    try {
      const response = await apiClient.get(`/documents/section/${sectionId}`);
      return response;
    } catch (error) {
      console.error('Error fetching documents by section:', error);
      return { success: false, error: 'Failed to fetch documents' };
    }
  }

  async getFeedbacks(userId: number): Promise<ApiResponse<TaskFeedbackWithDetails[]>> {
    try {
      const response = await apiClient.get(`/feedback/user/${userId}`);
      return response;
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      return { success: false, error: 'Failed to fetch feedbacks' };
    }
  }

  async deleteTask(taskId: number): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/tasks/${taskId}`);
      return response;
    } catch (error) {
      console.error('Error deleting task:', error);
      return { success: false, error: 'Failed to delete task' };
    }
  }

  async getMissingItems(userId: number): Promise<ApiResponse<TaskWithDetails[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = new Date();
        const missingItems = this.tasks.filter(task => 
          task.ASSIGNED_TO === userId && 
          task.STATUS !== 'completed' && 
          new Date(task.DUE_DATE) < now
        );
        resolve({ success: true, data: missingItems });
      }, 300);
    });
  }

  async getOverdueTasks(userId: number): Promise<ApiResponse<TaskWithDetails[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = new Date();
        const overdueTasks = this.tasks.filter(task => 
          task.ASSIGNED_TO === userId && 
          task.STATUS !== 'completed' && 
          new Date(task.DUE_DATE) < now
        );
        resolve({ success: true, data: overdueTasks });
      }, 300);
    });
  }

  async linkDocumentToTask(taskId: number, documentId: number): Promise<ApiResponse<void>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Update task status to in_progress
        const task = this.tasks.find(t => t.TASK_ID === taskId);
        if (task) {
          task.STATUS = 'in_progress';
        }
        resolve({ success: true });
      }, 300);
    });
  }

  async getTaskDocuments(taskId: number): Promise<ApiResponse<DocumentWithDetails[]>> {
    try {
      const response = await apiClient.get(`/tasks/${taskId}/documents`);
      return response;
    } catch (error) {
      console.error('Error fetching task documents:', error);
      return { success: false, error: 'Failed to fetch task documents' };
    }
  }

  async uploadDocumentWithUrl(data: {
    title: string;
    description: string;
    documentUrl: string;
    category?: string;
    tags?: string;
    uploadedBy: number;
    sectionId: number;
    fulfillsTaskId?: number;
  }): Promise<ApiResponse<Document>> {
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('documentUrl', data.documentUrl);
      formData.append('category', data.category || '');
      formData.append('tags', data.tags || '');
      formData.append('uploadedBy', data.uploadedBy.toString());
      formData.append('sectionId', data.sectionId.toString());
      if (data.fulfillsTaskId) {
        formData.append('fulfillsTaskId', data.fulfillsTaskId.toString());
      }

      const response = await apiClient.postFormData('/documents/upload', formData);
      return response;
    } catch (error) {
      console.error('Error uploading document with URL:', error);
      return { success: false, error: 'Failed to upload document with URL' };
    }
  }

  // Notification methods
  async getNotifications(userId: number): Promise<ApiResponse<TaskNotificationWithDetails[]>> {
    try {
      const response = await apiClient.get(`/notifications/user/${userId}`);
      return response;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { success: false, error: 'Failed to fetch notifications' };
    }
  }

  async getUnreadNotifications(userId: number): Promise<ApiResponse<TaskNotificationWithDetails[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const unreadNotifications = this.notifications.filter(n => 
          n.USER_ID === userId && !n.READ
        );
        resolve({ success: true, data: unreadNotifications });
      }, 300);
    });
  }

  async markNotificationAsRead(notificationId: number): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put(`/notifications/${notificationId}/read`);
      return response;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: 'Failed to mark notification as read' };
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<ApiResponse<void>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.notifications.forEach(notification => {
          if (notification.USER_ID === userId) {
            notification.READ = true;
          }
        });
        resolve({ success: true });
      }, 300);
    });
  }

  async createNotification(notificationData: NotificationForm): Promise<ApiResponse<TaskNotification>> {
    try {
      const response = await apiClient.post('/notifications', notificationData);
      return response;
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: 'Failed to create notification' };
    }
  }

  // Feedback methods
  async createFeedback(feedbackData: FeedbackForm): Promise<ApiResponse<TaskFeedback>> {
    try {
      const response = await apiClient.post('/feedback', feedbackData);
      return response;
    } catch (error) {
      console.error('Error creating feedback:', error);
      return { success: false, error: 'Failed to create feedback' };
    }
  }

  async getFeedbackForUser(userId: number): Promise<ApiResponse<TaskFeedbackWithDetails[]>> {
    try {
      const response = await apiClient.get(`/feedback/user/${userId}`);
      return response;
    } catch (error) {
      console.error('Error fetching feedback:', error);
      return { success: false, error: 'Failed to fetch feedback' };
    }
  }

  async getFeedbackWrittenBy(userId: number): Promise<ApiResponse<TaskFeedbackWithDetails[]>> {
    try {
      const response = await apiClient.get(`/feedback/written-by/${userId}`);
      return response;
    } catch (error) {
      console.error('Error fetching feedback written by user:', error);
      return { success: false, error: 'Failed to fetch feedback written by user' };
    }
  }

  async getFeedbackByDocument(documentId: number): Promise<ApiResponse<TaskFeedbackWithDetails[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const documentFeedback = this.feedback.filter(f => f.RELATED_DOCUMENT_ID === documentId);
        resolve({ success: true, data: documentFeedback });
      }, 300);
    });
  }

  async getFeedbackByTask(taskId: number): Promise<ApiResponse<TaskFeedbackWithDetails[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const taskFeedback = this.feedback.filter(f => f.RELATED_TASK_ID === taskId);
        resolve({ success: true, data: taskFeedback });
      }, 300);
    });
  }

  async markFeedbackAsRead(feedbackId: number): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put(`/feedback/${feedbackId}/read`);
      return response;
    } catch (error) {
      console.error('Error marking feedback as read:', error);
      return { success: false, error: 'Failed to mark feedback as read' };
    }
  }

  // Progress oversight methods
  async getProgressMetrics(): Promise<ApiResponse<ProgressMetrics>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const metrics: ProgressMetrics = {
          totalTasks: this.tasks.length,
          completedTasks: this.tasks.filter(t => t.STATUS === 'completed').length,
          overdueTasks: this.tasks.filter(t => 
            t.STATUS !== 'completed' && new Date(t.DUE_DATE) < new Date()
          ).length,
          completionRate: 75.5,
          averageCompletionTime: 2.3
        };
        resolve({ success: true, data: metrics });
      }, 300);
    });
  }

  async getDivisionMetrics(): Promise<ApiResponse<DivisionMetrics[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const metrics: DivisionMetrics[] = [
          {
            divisionId: 1,
            divisionName: 'Engineering and Operations',
            totalTasks: 45,
            completedTasks: 34,
            overdueTasks: 3,
            completionRate: 75.6
          },
          {
            divisionId: 2,
            divisionName: 'Administrative and Finance',
            totalTasks: 32,
            completedTasks: 28,
            overdueTasks: 1,
            completionRate: 87.5
          }
        ];
        resolve({ success: true, data: metrics });
      }, 300);
    });
  }

  async getSectionMetrics(): Promise<ApiResponse<SectionMetrics[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const metrics: SectionMetrics[] = [
          {
            sectionId: 1,
            sectionName: 'Engineering',
            divisionId: 1,
            divisionName: 'Engineering and Operations',
            totalTasks: 15,
            completedTasks: 12,
            overdueTasks: 1,
            completionRate: 80.0,
            status: 'good'
          },
          {
            sectionId: 2,
            sectionName: 'Operations',
            divisionId: 1,
            divisionName: 'Engineering and Operations',
            totalTasks: 20,
            completedTasks: 15,
            overdueTasks: 2,
            completionRate: 75.0,
            status: 'warning'
          }
        ];
        resolve({ success: true, data: metrics });
      }, 300);
    });
  }

  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const health: SystemHealth = {
          overallStatus: 'healthy',
          responseTime: 150,
          uptime: 99.9,
          errorRate: 0.1,
          activeUsers: 45,
          systemLoad: 65.5
        };
        resolve({ success: true, data: health });
      }, 300);
    });
  }

  // Send to Regional Director methods
  async forwardToRegionalDirector(documentId: number, remarks: string): Promise<ApiResponse<void>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const document = this.documents.find(d => d.DOCUMENT_ID === documentId);
        if (document) {
          // Update document with forwarding info
          (document as any).FORWARDED_TO_REGIONAL = true;
          (document as any).FORWARDED_BY = 1; // Current user
          (document as any).FORWARDED_AT = new Date().toISOString();
        }
        resolve({ success: true });
      }, 300);
    });
  }

  async getForwardedDocuments(): Promise<ApiResponse<DocumentWithDetails[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const forwardedDocs = this.documents.filter(d => (d as any).FORWARDED_TO_REGIONAL);
        resolve({ success: true, data: forwardedDocs });
      }, 300);
    });
  }

  // Helper methods
  private getUsersByDivision(divisionId: number): User[] {
    return this.users.filter(user => {
      const section = this.sections.find(s => s.SECTION_ID === user.SECTION_ID);
      return section && section.DIVISION_ID === divisionId;
    });
  }

  async getUsersBySection(sectionId: number, functionalRole?: string): Promise<ApiResponse<User[]>> {
    try {
      // Real API call to backend
      let endpoint = `/users/section/${sectionId}`;
      if (functionalRole) {
        endpoint += `?functionalRole=${functionalRole}`;
      }
      
      const response = await apiClient.get(endpoint);
      return response;
    } catch (error) {
      console.error('Error fetching users by section:', error);
      return { success: false, error: 'Failed to fetch section users' };
    }
  }

  // Auto-notification helper methods
  private sendDocumentApprovalNotifications(document: DocumentWithDetails, newStatus: string, remarks?: string): void {
    const documentCreator = document.createdByUser;
    if (!documentCreator) return;

    let notificationTitle = '';
    let notificationMessage = '';
    let notificationType = '';

    switch (newStatus) {
      case 'Under_Division_Review':
        notificationTitle = 'Document Approved by Section Head';
        notificationMessage = `Your document "${document.TITLE}" has been approved by the Section Head and is now under Division Manager review.`;
        notificationType = 'document_approved';
        break;
      case 'Under_Regional_Review':
        notificationTitle = 'Document Approved by Division Manager';
        notificationMessage = `Your document "${document.TITLE}" has been approved by the Division Manager and is now under Regional Director review.`;
        notificationType = 'document_approved';
        break;
      case 'Approved':
        notificationTitle = 'Document Fully Approved';
        notificationMessage = `Congratulations! Your document "${document.TITLE}" has been fully approved and will be archived.`;
        notificationType = 'document_approved';
        break;
      default:
        notificationTitle = 'Document Status Updated';
        notificationMessage = `Your document "${document.TITLE}" status has been updated to: ${newStatus.replace('_', ' ')}.`;
        notificationType = 'document_approved';
    }

    if (remarks) {
      notificationMessage += ` Remarks: ${remarks}`;
    }

    // Create notification for document creator
    this.createNotification({
      userId: documentCreator.USER_ID,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      actionUrl: '/staff/upload'
    });
  }

  private sendDocumentRejectionNotification(document: DocumentWithDetails, remarks?: string): void {
    const documentCreator = document.createdByUser;
    if (!documentCreator) return;

    const notificationMessage = `Your document "${document.TITLE}" has been rejected.${remarks ? ` Reason: ${remarks}` : ''}`;

    this.createNotification({
      userId: documentCreator.USER_ID,
      type: 'document_rejected',
      title: 'Document Rejected',
      message: notificationMessage,
      actionUrl: '/staff/upload'
    });
  }

  private sendDocumentRevisionNotification(document: DocumentWithDetails, remarks: string): void {
    const documentCreator = document.createdByUser;
    if (!documentCreator) return;

    const notificationMessage = `Your document "${document.TITLE}" requires revision. Instructions: ${remarks}`;

    this.createNotification({
      userId: documentCreator.USER_ID,
      type: 'revision_required',
      title: 'Document Revision Required',
      message: notificationMessage,
      actionUrl: '/staff/upload'
    });
  }

  private sendDocumentResubmissionNotification(document: DocumentWithDetails): void {
    const documentCreator = document.createdByUser;
    if (!documentCreator) return;

    // Notify all approvers that document has been resubmitted
    const approvers = this.getApproversForDocument(document);

    approvers.forEach(approver => {
      this.createNotification({
        userId: approver.USER_ID,
        type: 'document_resubmitted',
        title: 'Document Resubmitted',
        message: `Document "${document.TITLE}" has been resubmitted and requires your review.`,
        actionUrl: this.getApproverReviewUrl(approver.FUNCTIONAL_ROLE)
      });
    });
  }

  private getApproversForDocument(document: DocumentWithDetails): User[] {
    // Get all users who can approve this document based on current status
    const currentStatus = document.currentStatus?.STATUS || 'Submitted';

    switch (currentStatus) {
      case 'Submitted':
        return this.users.filter(u => u.FUNCTIONAL_ROLE === 'section_unit_head' && u.SECTION_ID === document.SECTION_ID);
      case 'Under_Section_Review':
        return this.users.filter(u => u.FUNCTIONAL_ROLE === 'division_manager' && u.SECTION_ID === document.SECTION_ID);
      case 'Under_Division_Review':
        return this.users.filter(u => u.FUNCTIONAL_ROLE === 'regional_director');
      default:
        return [];
    }
  }

  private getApproverReviewUrl(role: string): string {
    switch (role) {
      case 'section_unit_head':
        return '/section-unit-head/task-assignment';
      case 'division_manager':
        return '/division-manager/review';
      case 'regional_director':
        return '/regional-director/review';
      default:
        return '/';
    }
  }

  // Document approval methods
  async getPendingApprovalsForRole(userId: number, role: string): Promise<ApiResponse<DocumentWithDetails[]>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Filter documents based on role and current status
        let pendingDocuments: DocumentWithDetails[] = [];
        
        switch (role) {
          case 'section_unit_head':
            pendingDocuments = this.documents.filter(d => 
              d.currentStatus?.STATUS === 'Submitted' && d.SECTION_ID === this.users.find(u => u.USER_ID === userId)?.SECTION_ID
            );
            break;
          case 'division_manager':
            pendingDocuments = this.documents.filter(d => 
              d.currentStatus?.STATUS === 'Under_Section_Review' && d.SECTION_ID === this.users.find(u => u.USER_ID === userId)?.SECTION_ID
            );
            break;
          case 'regional_director':
            pendingDocuments = this.documents.filter(d => 
              d.currentStatus?.STATUS === 'Under_Division_Review'
            );
            break;
        }
        
        resolve({ success: true, data: pendingDocuments });
      }, 300);
    });
  }

  async approveDocument(documentId: number, remarks: string): Promise<ApiResponse<void>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const document = this.documents.find(d => d.DOCUMENT_ID === documentId);
        if (document) {
          // Update document status
          const currentStatus = document.currentStatus?.STATUS || 'Submitted';
          let newStatus = '';
          
          switch (currentStatus) {
            case 'Submitted':
              newStatus = 'Under_Division_Review';
              break;
            case 'Under_Section_Review':
              newStatus = 'Under_Regional_Review';
              break;
            case 'Under_Division_Review':
              newStatus = 'Approved';
              break;
          }
          
          // Update status
          if (document.currentStatus) {
            document.currentStatus.STATUS = newStatus;
            document.currentStatus.REMARKS = remarks;
          }
          
          // Send notifications
          this.sendDocumentApprovalNotifications(document, newStatus, remarks);
        }
        resolve({ success: true });
      }, 300);
    });
  }

  async rejectDocument(documentId: number, remarks: string): Promise<ApiResponse<void>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const document = this.documents.find(d => d.DOCUMENT_ID === documentId);
        if (document) {
          // Update document status
          if (document.currentStatus) {
            document.currentStatus.STATUS = 'Rejected';
            document.currentStatus.REMARKS = remarks;
          }
          
          // Send notification
          this.sendDocumentRejectionNotification(document, remarks);
        }
        resolve({ success: true });
      }, 300);
    });
  }

  async requestRevision(documentId: number, remarks: string): Promise<ApiResponse<void>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const document = this.documents.find(d => d.DOCUMENT_ID === documentId);
        if (document) {
          // Update document status
          if (document.currentStatus) {
            document.currentStatus.STATUS = 'Revision_Required';
            document.currentStatus.REMARKS = remarks;
          }
          
          // Send notification
          this.sendDocumentRevisionNotification(document, remarks);
        }
        resolve({ success: true });
      }, 300);
    });
  }

  async resubmitDocument(documentId: number): Promise<ApiResponse<void>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const document = this.documents.find(d => d.DOCUMENT_ID === documentId);
        if (document) {
          // Update document status
          if (document.currentStatus) {
            document.currentStatus.STATUS = 'Submitted';
            document.currentStatus.REMARKS = 'Document resubmitted';
          }
          
          // Send notification
          this.sendDocumentResubmissionNotification(document);
        }
        resolve({ success: true });
      }, 300);
    });
  }

  // Posts/Stream API methods
  async getAllPosts(): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get('/posts');
      return response;
    } catch (error) {
      console.error('Error fetching posts:', error);
      return { success: false, error: 'Failed to fetch posts' };
    }
  }

  async getPostsBySection(sectionId: number): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get(`/posts/section/${sectionId}`);
      return response;
    } catch (error) {
      console.error('Error fetching posts by section:', error);
      return { success: false, error: 'Failed to fetch posts' };
    }
  }

  async createPost(postData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/posts', postData);
      return response;
    } catch (error) {
      console.error('Error creating post:', error);
      return { success: false, error: 'Failed to create post' };
    }
  }

  async uploadPostAttachment(formData: FormData): Promise<any> {
    try {
      const response = await apiClient.postFormData('/posts/upload', formData);
      return response;
    } catch (error) {
      console.error('Error uploading post attachment:', error);
      return { success: false, error: 'Failed to upload attachment' };
    }
  }

  async updatePost(postId: number, postData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put(`/posts/${postId}`, postData);
      return response;
    } catch (error) {
      console.error('Error updating post:', error);
      return { success: false, error: 'Failed to update post' };
    }
  }

  async deletePost(postId: number): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/posts/${postId}`);
      return response;
    } catch (error) {
      console.error('Error deleting post:', error);
      return { success: false, error: 'Failed to delete post' };
    }
  }

  // Document download with authentication
  async downloadDocument(documentId: number): Promise<{ 
    success: boolean; 
    error?: string; 
    blob?: Blob; 
    filename?: string;
    isUrl?: boolean;
    url?: string;
    metadata?: any;
    contentType?: string;
  }> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        return { success: false, error: 'Authentication token not found' };
      }

      const response = await fetch(`${this.baseUrl}/documents/download/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
        return { success: false, error: errorData.error || 'Download failed' };
      }

      // Check if this is a URL response (for external links)
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        // This is a URL response, not a file
        const urlData = await response.json();
        if (urlData.isUrl) {
          console.log('URL response with metadata:', urlData);
          return { 
            success: true, 
            isUrl: true, 
            url: urlData.url, 
            filename: urlData.filename,
            contentType: 'url',
            metadata: urlData.metadata
          };
        }
      }

      // Get filename from Content-Disposition header (for file responses)
      const contentDisposition = response.headers.get('Content-Disposition');
      const metadataHeader = response.headers.get('X-Document-Metadata');
      let filename = 'document';
      let metadata = null;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      if (metadataHeader) {
        try {
          metadata = JSON.parse(metadataHeader);
        } catch (e) {
          console.error('Failed to parse metadata header:', e);
        }
      }

      const blob = await response.blob();
      
      return { success: true, blob, filename, contentType, isUrl: false, metadata };
    } catch (error) {
      console.error('Error downloading document:', error);
      return { success: false, error: 'Failed to download document' };
    }
  }

  // Helper method to open document in new tab with authentication
  async viewDocument(documentId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const downloadResult = await this.downloadDocument(documentId);
      
      if (!downloadResult.success) {
        return { success: false, error: downloadResult.error };
      }

      if (!downloadResult.blob) {
        return { success: false, error: 'No document data received' };
      }

      // Create object URL and open in new tab
      const url = URL.createObjectURL(downloadResult.blob);
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      if (!newWindow) {
        URL.revokeObjectURL(url);
        return { success: false, error: 'Failed to open document. Please check your popup blocker settings.' };
      }

      // Clean up the object URL after a delay to allow the document to load
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);

      return { success: true };
    } catch (error) {
      console.error('Error viewing document:', error);
      return { success: false, error: 'Failed to view document' };
    }
  }
}

export const apiService = new ApiService();
