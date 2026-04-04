import axios, { type AxiosInstance, type AxiosError } from 'axios';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const requestUrl = error.config?.url || '';
    const isLoginRequest = requestUrl.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginRequest) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  
  logout: () => api.post('/auth/logout'),
  
  getMe: () => api.get('/auth/me'),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Users API
export const usersApi = {
  getAll: (params?: { role?: string; isActive?: string; search?: string }) =>
    api.get('/users', { params }),
  
  getStaff: () => api.get('/users/staff'),
  
  getById: (id: number) => api.get(`/users/${id}`),
  
  create: (data: { username: string; password: string; fullName: string; role: string }) =>
    api.post('/users', data),
  
  update: (id: number, data: { fullName?: string; role?: string }) =>
    api.put(`/users/${id}`, data),
  
  updateStatus: (id: number, isActive: boolean) =>
    api.patch(`/users/${id}/status`, { isActive }),
  
  resetPassword: (id: number, newPassword: string) =>
    api.post(`/users/${id}/reset-password`, { newPassword }),
  
  delete: (id: number) => api.delete(`/users/${id}`),
};

// Lists API
export const listsApi = {
  getAll: (params?: { status?: string; search?: string; includeHidden?: string }) =>
    api.get('/lists', { params }),
  
  getById: (id: number) => api.get(`/lists/${id}`),
  
  upload: (formData: FormData) =>
    api.post('/lists/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  hide: (id: number, hidden: boolean = true) =>
    api.patch(`/lists/${id}/hide`, { hidden }),
  
  archive: (id: number) => api.patch(`/lists/${id}/archive`),
  
  reopen: (id: number) => api.patch(`/lists/${id}/reopen`),
  
  delete: (id: number) => api.delete(`/lists/${id}`),
};

// Records API
export const recordsApi = {
  getAll: (params?: {
    listId?: string;
    locationId?: string;
    status?: string;
    assignedTo?: string;
    meterId?: string;
    customer?: string;
    page?: number;
    limit?: number;
  }) => api.get('/records', { params }),
  
  getById: (id: number) => api.get(`/records/${id}`),
  
  getPending: (params?: { listId?: string; locationId?: string; page?: number; limit?: number }) =>
    api.get('/records/pending/me', { params }),
  
  getCompleted: (params?: { listId?: string; page?: number; limit?: number }) =>
    api.get('/records/completed/me', { params }),
  
  updateNewRead: (id: number, newRead: string | number, notes?: string) =>
    api.patch(`/records/${id}/new-read`, { newRead, notes }),
  
  updateStatus: (id: number, status: string) =>
    api.patch(`/records/${id}/status`, { status }),
  
  getLocations: (listId: number) => api.get(`/records/locations/${listId}`),
};

// Assignments API
export const assignmentsApi = {
  assignLocation: (listId: number, locationId: string, staffId: number) =>
    api.post('/assignments/location', { listId, locationId, staffId }),
  
  assignBulkLocations: (listId: number, locationIds: string[], staffId: number) =>
    api.post('/assignments/bulk-location', { listId, locationIds, staffId }),
  
  assignAllToStaff: (listId: number, staffId: number) =>
    api.post('/assignments/assign-all-to-staff', { listId, staffId }),
  
  reassign: (listId: number, fromStaffId: number, toStaffId: number, locationIds?: string[]) =>
    api.post('/assignments/reassign', { listId, fromStaffId, toStaffId, locationIds }),
  
  removeAssignment: (listId: number, locationId: string) =>
    api.delete('/assignments/location', { data: { listId, locationId } }),
  
  getByStaff: (staffId: number) => api.get(`/assignments/by-staff/${staffId}`),
  
  getByList: (listId: number) => api.get(`/assignments/by-list/${listId}`),
};

// Reports API
export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  
  getListProgress: () => api.get('/reports/list-progress'),
  
  getStaffProgress: () => api.get('/reports/staff-progress'),
  
  getLocationProgress: (listId: number) => api.get(`/reports/location-progress/${listId}`),
  
  getActivityLogs: (params?: { page?: number; limit?: number; userId?: string; actionType?: string }) =>
    api.get('/reports/activity-logs', { params }),
  
  getMyStats: () => api.get('/reports/my-stats'),
};

export default api;
