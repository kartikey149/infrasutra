import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'sih_infra_user_v2';
const TOKEN_KEY = 'sih_infra_token_v2';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user && token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('sih_infrasutra_projects_v2');
      localStorage.removeItem('sih_infrasutra_active_project_id_v2');
    }
  }, [user, token]);

  const login = (userData, authToken) => {
    setUser(userData);
    if (authToken) {
      setToken(authToken);
      localStorage.setItem(TOKEN_KEY, authToken);
    }
    if (userData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('sih_infrasutra_projects_v2');
    localStorage.removeItem('sih_infrasutra_active_project_id_v2');
  };

  const switchRole = (newRole) => {
    if (user) {
      const updated = { ...user, role: newRole, roleKey: newRole };
      setUser(updated);
    }
  };

  // Authenticated fetch wrapper that automatically passes the Bearer token
  const authFetch = async (url, options = {}) => {
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      logout();
    }
    return res;
  };

  const role = user?.role || user?.roleKey || '';
  const isManager = role === 'manager' || role === 'planner';
  const isPlanner = role === 'planner' || role === 'manager';
  const isSupervisor = role === 'supervisor';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        switchRole,
        authFetch,
        role,
        isManager,
        isPlanner,
        isSupervisor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
