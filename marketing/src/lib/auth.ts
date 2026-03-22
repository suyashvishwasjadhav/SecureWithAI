export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  plan: 'free' | 'pro' | 'enterprise';
}

export const saveToken = (token: string) => {
  localStorage.setItem('ss_token', token);
};

export const getToken = () => {
  return localStorage.getItem('ss_token');
};

export const removeToken = () => {
  localStorage.removeItem('ss_token');
};

export const saveUser = (user: User) => {
  localStorage.setItem('ss_user', JSON.stringify(user));
};

export const getUser = (): User | null => {
  const user = localStorage.getItem('ss_user');
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
};

export const isLoggedIn = () => {
  return !!getToken();
};

export const logout = () => {
  removeToken();
  localStorage.removeItem('ss_user');
};
