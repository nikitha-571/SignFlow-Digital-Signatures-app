import api from './api';

export const register = async (name, email, password) => {
  const response = await api.post('/api/auth/register', {
    name,
    email,
    password
  });
  
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify({
      id: response.data.id,
      name: response.data.name,
      email: response.data.email
    }));
  }
  
  return response.data;
};


export const loginWithPassword = async (email, password) => {
  const response = await api.post('/api/auth/login', {
    email,
    password
  });
  
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify({
      id: response.data.id,
      name: response.data.name,
      email: response.data.email
    }));
  }
  
  return response.data;
};


export const login = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  

  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  
  console.log('✅ User logged in:', user.email);
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  

  delete api.defaults.headers.common['Authorization'];
  
  window.location.href = '/login';
};

export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      return null;
    }
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);

    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return null;
  }
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const isAuthenticated = () => {
  const token = getToken();
  const user = getCurrentUser();
  return !!(token && user);
};