import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isBlocked: boolean;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          setUser({
            id: data.id,
            name: data.username,
            email: data.email,
            role: data.role,
            isBlocked: data.isBlocked ?? false
          });
        })
        .catch(() => setUser(null));
    } else {
      setUser(null);
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, setUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}; 