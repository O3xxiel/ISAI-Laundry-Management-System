import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import AlertCard from '../components/AlertCard';
import Logo from '../components/Logo';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(usuario, contrasena);
      const from = (location.state as { from?: string })?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    }
  }

  return (
    <div className="login-page">
      <form onSubmit={onSubmit} className="login-form">
        <Logo size="lg" />
        <h1>Iniciar sesión</h1>
        <p className="login-sub">Sistema de Gestión para Lavandería</p>
        <label>
          Usuario
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
        </label>
        <label>
          Contraseña
          <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
        </label>
        {error && <AlertCard>{error}</AlertCard>}
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}
