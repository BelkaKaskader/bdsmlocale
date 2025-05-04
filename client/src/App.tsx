import React, { useState, useEffect } from 'react';
import { 
  Route, 
  Navigate,
  createRoutesFromElements,
  createBrowserRouter,
  RouterProvider
} from 'react-router-dom';
import { Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Login from './components/Login';
import DataTable from './components/DataTable';
import Profile from './components/Profile';
import AppBar from './components/AppBar';
import { AuthProvider } from './contexts/AuthContext';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLoginSuccess={() => setIsAuthenticated(true)} />
            )
          } 
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <>
                <AppBar />
                <DataTable />
              </>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={
            isAuthenticated ? (
              <>
                <AppBar />
                <Profile />
              </>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Route>
    )
  );

  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <CssBaseline />
        <Container maxWidth="xl">
          <RouterProvider router={router} />
        </Container>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
