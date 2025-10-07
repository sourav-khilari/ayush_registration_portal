import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AuthAPI } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    (async () => {
      try {
        const profile = await AuthAPI.profile();
        if (!mounted) return;
        setUser(profile);
      } catch (e) {
        localStorage.removeItem("token");
        setToken(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  async function login(credentials) {
    const res = await AuthAPI.login(credentials);
    const newToken = res.token;
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(res.user || null);
    return res;
  }

  async function register(payload) {
    const res = await AuthAPI.register(payload);
    const newToken = res.token;
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(res.user || null);
    return res;
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({ user, token, loading, login, register, logout }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


