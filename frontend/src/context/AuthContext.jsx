import { useState, useEffect, useCallback } from 'react';
import { registerUser, loginUser, fetchCurrentUser } from '../services/auth';
import { AuthContext } from './authContextObject';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check for an existing session

  // On first mount: if a token is already in localStorage (from a
  // previous visit), verify it's still valid by calling /auth/me
  // instead of trusting it blindly.
  useEffect(() => {
    const token = localStorage.getItem('flowengine_token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetchCurrentUser()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('flowengine_token');
        localStorage.removeItem('flowengine_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await loginUser({ email, password });
    localStorage.setItem('flowengine_token', token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { token, user } = await registerUser({ name, email, password });
    localStorage.setItem('flowengine_token', token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('flowengine_token');
    setUser(null);
  }, []);

  const loginWithToken = useCallback(async (token) => {
  localStorage.setItem('flowengine_token', token);
  try {
    const me = await fetchCurrentUser();
    setUser(me);
    return me;
  } catch (err) {
    localStorage.removeItem('flowengine_token');
    throw err;
  }
}, []);
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
