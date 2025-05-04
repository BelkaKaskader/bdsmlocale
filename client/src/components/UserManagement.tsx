import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  MenuItem,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
} from '@mui/material';
import { Delete as DeleteIcon, Lock as LockIcon, LockOpen as LockOpenIcon } from '@mui/icons-material';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isBlocked: boolean;
  username: string;
}

const API_URL = 'http://localhost:5000/api/auth/users';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });

  useEffect(() => {
    fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error('Ошибка загрузки пользователей', err));
  }, []);

  const handleRoleChange = (userId: string, newRole: 'admin' | 'user') => {
    fetch(`${API_URL}/${userId}/role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ role: newRole })
    })
      .then(res => res.json())
      .then(() => {
        setUsers(users =>
          users.map(user =>
            user.id === userId ? { ...user, role: newRole } : user
          )
        );
      })
      .catch(err => console.error('Ошибка смены роли', err));
  };

  const handleBlockUser = (userId: string) => {
    fetch(`${API_URL}/${userId}/block`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(() => {
        setUsers(users =>
          users.map(user =>
            user.id === userId ? { ...user, isBlocked: !user.isBlocked } : user
          )
        );
      })
      .catch(err => console.error('Ошибка блокировки', err));
  };

  const handleDeleteUser = (userId: string) => {
    fetch(`${API_URL}/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(() => {
        setUsers(users => users.filter(user => user.id !== userId));
      })
      .catch(err => console.error('Ошибка удаления', err));
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setOpenPasswordDialog(true);
  };

  const handlePasswordSubmit = () => {
    if (!selectedUser) return;
    fetch(`${API_URL}/${selectedUser.id}/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ password: newPassword })
    })
      .then(res => res.json())
      .then(() => {
        setOpenPasswordDialog(false);
        setNewPassword('');
      })
      .catch(err => console.error('Ошибка смены пароля', err));
  };

  const handleAddUser = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          username: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role
        })
      });
      if (res.ok) {
        const created = await res.json();
        setUsers(users => [...users, created]);
        setOpenAddDialog(false);
        setNewUser({ name: '', email: '', password: '', role: 'user' });
      } else {
        alert('Ошибка при добавлении пользователя');
      }
    } catch (err) {
      alert('Ошибка при добавлении пользователя');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Button
        variant="contained"
        color="primary"
        sx={{ mb: 2 }}
        onClick={() => setOpenAddDialog(true)}
      >
        Добавить пользователя
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Имя</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'user')}
                    size="small"
                  >
                    <MenuItem value="admin">Администратор</MenuItem>
                    <MenuItem value="user">Пользователь</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  {user.isBlocked ? 'Заблокирован' : 'Активен'}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleBlockUser(user.id)}>
                    {user.isBlocked ? <LockOpenIcon /> : <LockIcon />}
                  </IconButton>
                  <IconButton onClick={() => handleDeleteUser(user.id)}>
                    <DeleteIcon />
                  </IconButton>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => handleChangePassword(user)}
                  >
                    Сменить пароль
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)}>
        <DialogTitle>Добавить пользователя</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Имя"
            fullWidth
            value={newUser.name}
            onChange={e => setNewUser({ ...newUser, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={newUser.email}
            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Пароль"
            type="password"
            fullWidth
            value={newUser.password}
            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
          />
          <Select
            fullWidth
            value={newUser.role}
            onChange={e => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' })}
            sx={{ mt: 2 }}
          >
            <MenuItem value="user">Пользователь</MenuItem>
            <MenuItem value="admin">Администратор</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Отмена</Button>
          <Button onClick={handleAddUser} variant="contained">
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)}>
        <DialogTitle>Смена пароля для {selectedUser?.name}</DialogTitle>
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

export default UserManagement; 