import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { TOKEN_KEY } from "../libs/api";

const AuthCtx = createContext();

export function AuthProvider({ children }) {
  const safeGet = (k) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
  const [token, setToken] = useState(() => safeGet(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.setToken(token);
    api.get("/auth/me")
      .then((res) => setUser(res?.user || res?.data || res || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const t = res?.token || res?.access_token || res?.data?.token || "mock-token";
    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      api.setToken(t);
      const me = await api.get("/auth/me");
      setUser(me?.user || me?.data || me || null);
    }
  };

  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    const t = res?.token || res?.access_token || res?.data?.token || "mock-token";
    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      api.setToken(t);
      const me = await api.get("/auth/me");
      setUser(me?.user || me?.data || me || null);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
  };

  const value = useMemo(() => ({ token, user, login, register, logout }), [token, user]);
  if (loading) return <div style={{ padding: 24 }}>กำลังโหลด...</div>;
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
