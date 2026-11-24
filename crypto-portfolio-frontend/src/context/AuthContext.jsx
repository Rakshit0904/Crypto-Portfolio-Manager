import { useState, useEffect } from 'react';
import api from '../api/axios';
import { AuthContext } from './authContextObject';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('crypto_token')));

  useEffect(() => {
    const token = localStorage.getItem('crypto_token');
    if (!token) return;

    api
      .get('/auth/profile')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('crypto_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('crypto_token', data.token);
    setUser(data);
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('crypto_token', data.token);
    setUser(data);
  };

  const updateProfile = async (updates) => {
    const { data } = await api.put('/auth/profile', updates);
    localStorage.setItem('crypto_token', data.token);
    setUser(data);
  };

  const logout = () => {
    localStorage.removeItem('crypto_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};