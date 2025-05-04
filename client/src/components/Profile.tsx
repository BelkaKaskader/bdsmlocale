import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Avatar, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import UserManagement from './UserManagement';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const navigate = useNavigate();

  const handlePasswordSubmit = () => {
    // Здесь будет логика изменения пароля
    console.log(`Changing password to ${newPassword}`);
    setOpenPasswordDialog(false);
    setNewPassword('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ width: 100, height: 100, mr: 3 }} />
          <Box>
            <Typography variant="h4" component="h1">
              {user?.name || 'Пользователь'}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {user?.email || 'email@example.com'}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Роль: {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Button 
            variant="contained" 
            onClick={() => setOpenPasswordDialog(true)}
          >
            Сменить пароль
          </Button>
        </Box>

        {isAdmin && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h5" gutterBottom>
              Управление пользователями
            </Typography>
            <UserManagement />
          </>
        )}
      </Paper>

      <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)}>
        <DialogTitle>Смена пароля</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Новый пароль"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPasswordDialog(false)}>Отмена</Button>
          <Button onClick={handlePasswordSubmit} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile; 