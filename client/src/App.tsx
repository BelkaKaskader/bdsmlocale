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
              <DataTable />
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
      <CssBaseline />
      <Container maxWidth="xl">
        <RouterProvider router={router} />
      </Container>
    </ThemeProvider>
  );
}

export default App;
