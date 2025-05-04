import React from 'react';
import { AppBar as MuiAppBar, Toolbar, IconButton, Avatar, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';

const AppBar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <MuiAppBar position="static">
      <Toolbar sx={{ justifyContent: 'flex-end' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/dashboard')} sx={{ p: 0, bgcolor: 'white', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HomeIcon sx={{ color: '#1976d2', fontSize: 28 }} />
          </IconButton>
          <IconButton onClick={handleProfileClick} sx={{ p: 0 }}>
            <Avatar 
              alt={user?.name || 'Пользователь'} 
              src="/static/images/avatar/1.jpg"
            />
          </IconButton>
          <IconButton onClick={handleLogout} sx={{ p: 0, bgcolor: 'white', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogoutIcon sx={{ color: '#d32f2f', fontSize: 28 }} />
          </IconButton>
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar; 