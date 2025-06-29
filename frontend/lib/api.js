import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const taskAPI = {
  getTasks: () => api.get('/api/tasks/'),
  createTask: (task) => api.post('/api/tasks/', task),
  updateTask: (id, task) => api.patch(`/api/tasks/${id}/`, task),
  deleteTask: (id) => api.delete(`/api/tasks/${id}/`),
};

export default api;
