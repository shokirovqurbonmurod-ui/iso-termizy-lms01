import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken } from '../lib/api.js';
import { setRoleOverrides } from '../config/menu.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleOverrides, setRoleOverridesState] = useState([]);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((u) => setUser(u))
      .catch(() => { setToken(null); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  // Rollar & Ruxsatlar sahifasida qo'lda o'zgartirilgan ruxsatlarni yuklab, menyu hisob-kitobiga uzatadi.
  useEffect(() => {
    if (!user) return;
    api.get('/role-overrides').then((list) => { setRoleOverrides(list || []); setRoleOverridesState(list || []); }).catch(() => {});
  }, [user]);

  async function reloadRoleOverrides() {
    const list = await api.get('/role-overrides').catch(() => []);
    setRoleOverrides(list || []);
    setRoleOverridesState(list || []);
  }

  async function login(phone, password, extra) {
    const { token, user } = await api.post('/auth/login', { phone, password, ...extra });
    setToken(token);
    setUser(user);
    return user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, roleOverrides, reloadRoleOverrides }}>
      {children}
    </AuthCtx.Provider>
  );
}
