import axios from 'axios';
import { removeToken, redirectToLogin } from './auth';

const api = axios.create({
  baseURL: (import.meta as any).env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
});

// With HttpOnly cookies, the browser automatically sends the cookie.
// We just need an interceptor for 401s.

// If the server returns 401 (token expired/invalid), send user back to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);

export const startUrlScan = async (url: string, intensity: string = 'standard') => {
  const response = await api.post('/api/scans/url', { target_url: url, intensity });
  return response.data;
};

export const startZipScan = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/api/scans/zip', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const getScan = async (id: string) => {
  const response = await api.get(`/api/scans/${id}`);
  return response.data;
};

export const getFindings = async (id: string) => {
  const response = await api.get(`/api/scans/${id}/findings`);
  return response.data;
};

export const getDashboard = async () => {
  const response = await api.get('/api/dashboard');
  return response.data;
};

export const getScans = async () => {
  const response = await api.get('/api/scans');
  return response.data;
};

export const deleteScan = async (id: string) => {
  const response = await api.delete(`/api/scans/${id}`);
  return response.data;
};

/**
 * Downloads a report file from the server.
 * Handles the special report.pdf and report.json endpoints.
 */
export const downloadReport = async (scanId: string, format: string = 'pdf') => {
  const endpoint = `/api/scans/${scanId}/report/${format}`;
  
  const response = await api.get(endpoint, {
    responseType: 'blob',
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `shieldssentinel-report-${scanId.slice(0,8)}.${format}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const downloadWafRules = async (scanId: string) => {
  const response = await api.get(`/api/scans/${scanId}/waf-rules`, {
    responseType: 'blob',
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `shieldssentinel_waf_rules_${scanId.slice(0,8)}.conf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const getCompliance = async (scanId: string) => {
  const response = await api.get(`/api/scans/${scanId}/compliance`);
  return response.data;
};

export const getAttackSurface = async (scanId: string) => {
  const response = await api.get(`/api/scans/${scanId}/attack-surface`);
  return response.data;
};

export const getCorrelations = async (scanId: string) => {
  const response = await api.get(`/api/scans/${scanId}/correlations`);
  return response.data;
};

export const startCombinedScan = async (url: string, file: File, intensity: string = 'standard') => {
  const formData = new FormData();
  formData.append('target_url', url);
  formData.append('intensity', intensity);
  formData.append('file', file);
  const response = await api.post('/api/scans/combined', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const startDemoScan = async () => {
  const response = await api.post('/api/scans/demo');
  return response.data;
};

export default api;
