import api from './api';

export async function registerUser({ name, email, password }) {
  const { data } = await api.post('/auth/register', { name, email, password });
  return data.data; // { token, user }
}

export async function loginUser({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  return data.data; // { token, user }
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data.data.user;
}

export const oauthUrl = (provider) => `${api.defaults.baseURL}/auth/oauth/${provider}`;