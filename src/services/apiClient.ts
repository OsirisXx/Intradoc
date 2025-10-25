export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const apiClient = {
  get: async (endpoint: string) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  },

  post: async (endpoint: string, data: any) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // Special method for file uploads (FormData)
  postFormData: async (endpoint: string, formData: FormData) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type for FormData - let browser set it with boundary
      },
      body: formData
    });
    return response.json();
  },

  put: async (endpoint: string, data: any) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  },

  delete: async (endpoint: string) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  },

  // For public endpoints (no auth required)
  postPublic: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};
