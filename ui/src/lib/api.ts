import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const extensionsApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get('/extensions', { params }),
  get: (id: string) => api.get(`/extensions/${id}`),
  create: (data: any) => api.post('/extensions', data),
  update: (id: string, data: any) => api.put(`/extensions/${id}`, data),
  delete: (id: string) => api.delete(`/extensions/${id}`),
};

export const queuesApi = {
  list: () => api.get('/queues'),
  get: (name: string) => api.get(`/queues/${name}`),
  create: (data: any) => api.post('/queues', data),
  update: (name: string, data: any) => api.put(`/queues/${name}`, data),
  delete: (name: string) => api.delete(`/queues/${name}`),
  addMember: (queueName: string, extension: string, penalty?: number) =>
    api.post(`/queues/${queueName}/members`, { extension, penalty }),
  removeMember: (queueName: string, extension: string) =>
    api.delete(`/queues/${queueName}/members/${extension}`),
  pauseMember: (queueName: string, extension: string, paused: boolean) =>
    api.put(`/queues/${queueName}/members/${extension}/pause`, { paused }),
};

export const cdrApi = {
  list: (params?: {
    startDate?: string;
    endDate?: string;
    src?: string;
    dst?: string;
    disposition?: string;
    page?: number;
    limit?: number;
  }) => api.get('/cdr', { params }),
  get: (id: number) => api.get(`/cdr/${id}`),
  stats: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/cdr/stats', { params }),
};

export const systemApi = {
  status: () => api.get('/system/status'),
  settings: () => api.get('/system/settings'),
  updateSettings: (data: Record<string, string>) =>
    api.put('/system/settings', data),
  channels: () => api.get('/system/channels'),
  audit: (params?: { page?: number; limit?: number }) =>
    api.get('/system/audit', { params }),
};

export const voicemailApi = {
  list: () => api.get('/voicemail'),
  get: (mailbox: string) => api.get(`/voicemail/${mailbox}`),
  create: (data: any) => api.post('/voicemail', data),
  update: (mailbox: string, data: any) => api.put(`/voicemail/${mailbox}`, data),
  delete: (mailbox: string) => api.delete(`/voicemail/${mailbox}`),
};

export const usersApi = {
  list: () => api.get('/users'),
  get: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};
