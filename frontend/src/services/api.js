import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('token', data.data.token);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.token}`;
          return api(original);
        } catch (_) {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data) => api.put('/auth/change-password', data),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

// Dashboard
export const dashboardAPI = {
  getAdmin: () => api.get('/dashboard/admin'),
  getTeacher: () => api.get('/dashboard/teacher'),
  getParent: () => api.get('/dashboard/parent'),
  getStudent: () => api.get('/dashboard/student'),
  getAccountant: () => api.get('/dashboard/accountant'),
};

// Students
export const studentAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/students/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => api.delete(`/students/${id}`),
  toggleStatus: (id) => api.patch(`/students/${id}/status`),
  getFeeStatus: (id, params) => api.get(`/students/${id}/fees`, { params }),
  promote: (id, data) => api.post(`/students/${id}/promote`, data),
  bulkImport: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/students/bulk-import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// Teachers
export const teacherAPI = {
  getAll: (params) => api.get('/teachers', { params }),
  getById: (id) => api.get(`/teachers/${id}`),
  create: (data) => api.post('/teachers', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/teachers/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => api.delete(`/teachers/${id}`),
  assignSubject: (id, data) => api.post(`/teachers/${id}/assign-subject`, data),
  removeAssignment: (teacherId, assignmentId) => api.delete(`/teachers/${teacherId}/assignments/${assignmentId}`),
  getMyClasses: () => api.get('/teachers/my-classes'),
};

// Parents
export const parentAPI = {
  getAll: (params) => api.get('/parents', { params }),
  getById: (id) => api.get(`/parents/${id}`),
  create: (data) => api.post('/parents', data),
  update: (id, data) => api.put(`/parents/${id}`, data),
  getChildren: (id) => api.get(`/parents/${id}/children`),
};

// Fees
export const feeAPI = {
  getStructures: (params) => api.get('/fees/structures', { params }),
  createStructure: (data) => api.post('/fees/structures', data),
  updateStructure: (id, data) => api.put(`/fees/structures/${id}`, data),
  deleteStructure: (id) => api.delete(`/fees/structures/${id}`),
  getPayments: (params) => api.get('/fees/payments', { params }),
  recordPayment: (data) => api.post('/fees/payments', data),
  getReceipt: (id) => api.get(`/fees/payments/${id}`),
  downloadReceipt: (id) => api.get(`/fees/payments/${id}/receipt`, { responseType: 'blob' }),
  getDashboard: (params) => api.get('/fees/dashboard', { params }),
  getOutstanding: (params) => api.get('/fees/outstanding', { params }),
};

// Examinations
export const examAPI = {
  getAll: (params) => api.get('/examinations', { params }),
  create: (data) => api.post('/examinations', data),
  getScores: (examId) => api.get(`/examinations/${examId}/scores`),
  saveScores: (examId, data) => api.post(`/examinations/${examId}/scores`, data),
  approve: (examId) => api.put(`/examinations/${examId}/approve`),
  update: (examId, data) => api.put(`/examinations/${examId}`, data),
  remove: (examId) => api.delete(`/examinations/${examId}`),
  getTermResults: (params) => api.get('/examinations/term-results', { params }),
  generateTermReport: (data) => api.post('/examinations/generate-term-report', data),
  publishResults: (data) => api.post('/examinations/publish-results', data),
  downloadReportCard: (studentId, params) => api.get(`/examinations/students/${studentId}/report-card`, { params, responseType: 'blob' }),
  updateRemarks: (data) => api.put('/examinations/remarks', data),
};

// Settings
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAcademicYears: () => api.get('/settings/academic-years'),
  createAcademicYear: (data) => api.post('/settings/academic-years', data),
  getTerms: (params) => api.get('/settings/terms', { params }),
  createTerm: (data) => api.post('/settings/terms', data),
  getClasses: () => api.get('/settings/classes'),
  createClass: (data) => api.post('/settings/classes', data),
  updateClass: (id, data) => api.put(`/settings/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/settings/classes/${id}`),
  getSubjects: () => api.get('/settings/subjects'),
  createSubject: (data) => api.post('/settings/subjects', data),
  updateSubject: (id, data) => api.put(`/settings/subjects/${id}`, data),
  getAuditLogs: (params) => api.get('/settings/audit-logs', { params }),
};

// Reports
export const reportAPI = {
  studentPerformance: (params) => api.get('/reports/student-performance', { params }),
  classPerformance: (params) => api.get('/reports/class-performance', { params }),
  feeCollection: (params) => api.get('/reports/fee-collection', { params }),
  subjectAnalysis: (params) => api.get('/reports/subject-analysis', { params }),
  exportFeeCollection: (params) => api.get('/reports/fee-collection/export', { params, responseType: 'blob' }),
  exportStudents: (params) => api.get('/reports/students/export', { params, responseType: 'blob' }),
  classReportPDF: (params) => api.get('/reports/class-report/pdf', { params, responseType: 'blob' }),
};

// Notifications
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// Admin Users (system accounts)
export const adminUsersAPI = {
  getAll: () => api.get('/admin-users'),
  create: (data) => api.post('/admin-users', data),
  update: (id, data) => api.put(`/admin-users/${id}`, data),
  deactivate: (id) => api.delete(`/admin-users/${id}`),
};

export default api;
