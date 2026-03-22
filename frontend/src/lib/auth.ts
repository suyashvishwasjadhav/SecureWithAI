import api from './api';

const USER_KEY = 'ss_user';

export const saveToken = (_token: string) => {
  // Kept for backward compatibility if needed, but not used with HttpOnly cookies
};

export const getToken = (): string | null => {
  return null;
};

export const removeToken = () => {
  localStorage.removeItem(USER_KEY);
};

export const handleLogout = async () => {
  try {
    await api.post('/api/auth/logout');
  } catch (err) {}
  removeToken();
  redirectToLogin();
};

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const res = await api.get('/api/auth/me');
    if (res.status === 200) {
      localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      return true;
    }
  } catch (err) {
    removeToken();
  }
  return false;
};

/** Redirect to the marketing/auth site login page */
export const redirectToLogin = () => {
  window.location.href = 'http://localhost:4000/login';
};
