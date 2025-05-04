import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Container, 
  Paper 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Отправка запроса на вход:', { username });
      const response = await api.post('/auth/login', {
        username,
        password
      });
      
      console.log('Ответ от сервера:', response.data);
      
      if (!response.data.token) {
        console.error('Токен отсутствует в ответе');
        setError('Токен не получен от сервера');
        return;
      }

      console.log('Сохранение токена...');
      localStorage.setItem('token', response.data.token);
      
      // Проверяем, что токен действительно сохранился
      const savedToken = localStorage.getItem('token');
      console.log('Сохраненный токен:', savedToken ? 'Присутствует' : 'Отсутствует');
      
      if (!savedToken) {
        console.error('Ошибка: токен не сохранился в localStorage');
        setError('Ошибка при сохранении токена');
        return;
      }

      // Обновляем пользователя в контексте сразу после входа
      setUser({
        id: response.data.user.id,
        name: response.data.user.username,
        email: response.data.user.email,
        role: response.data.user.role,
        isBlocked: response.data.user.isBlocked ?? false
      });

      console.log('Вход успешен, переход на dashboard...');
      onLoginSuccess();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Ошибка входа:', err.response?.data || err);
      setError(err.response?.data?.message || 'Неверное имя пользователя или пароль');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography component="h1" variant="h5" align="center">
          Вход в систему
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Имя пользователя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <Typography color="error" align="center" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Войти
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login; 