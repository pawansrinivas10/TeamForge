import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// ── Attach JWT from localStorage on every request ─────────────
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('tf_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ── Global error handler — force logout on 401 ────────────────
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('tf_token');
            localStorage.removeItem('tf_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
    signup: (data) => api.post('/auth/signup', data),
    login: (data) => api.post('/auth/login', data),
    me: () => api.get('/auth/me'),
};

// ── Users ────────────────────────────────────────────────────
export const usersAPI = {
    getAll: (params) => api.get('/users', { params }),
    getMe: () => api.get('/users/me'),
    updateMe: (data) => api.patch('/users/me', data),
    savePushToken: (token) => api.patch('/users/push-token', { pushToken: token }),
};

// ── Projects ─────────────────────────────────────────────────
export const projectsAPI = {
    getAll: (params) => api.get('/projects', { params }),
    getById: (id) => api.get(`/projects/${id}`),
    create: (data) => api.post('/projects', data),
    update: (id, d) => api.put(`/projects/${id}`, d),
    delete: (id) => api.delete(`/projects/${id}`),
};

// ── AI Agent ─────────────────────────────────────────────────
export const aiAPI = {
    match: (data) => api.post('/ai/match', data),
};

export default api;
