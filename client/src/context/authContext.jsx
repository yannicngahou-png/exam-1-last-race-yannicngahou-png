import React, { createContext, useState, useContext, useEffect } from 'react';
import API from '../api/api';

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // session verification at the initial apllication loading
  useEffect(() => {
    API.getCurrentUser()
      .then(currentUser => setUser(currentUser))
      .catch(() => setUser(null)) // no user connected
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const authenticatedUser = await API.login(username, password);
    setUser(authenticatedUser);
    return authenticatedUser;
  };

  const logout = async () => {
    await API.logout();
    setUser(null);
  };

  const value = { user, login, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <div>"Loading ..."</div>: children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

export {AuthProvider, useAuth}