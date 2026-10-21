import { Eye, EyeOff, Lock, User } from 'lucide-react';
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
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEntrando(true);
    try {
      await login(usuario, contrasena);
      const from = (location.state as { from?: string })?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
      setEntrando(false);
    }
  }

  return (
    <div className="login-page">
      <form onSubmit={onSubmit} className="login-form">
        <Logo size="lg" />
        <h1>ISAÍ Lavandería</h1>
        <p className="login-sub">Inicia sesión para continuar</p>
        <label>
          Usuario
          <div className="login-input-wrap">
            <User size={16} />
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Tu usuario"
              autoFocus
            />
          </div>
        </label>
        <label>
          Contraseña
          <div className="login-input-wrap">
            <Lock size={16} />
            <input
              type={verPassword ? 'text' : 'password'}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="Tu contraseña"
            />
            <button
              type="button"
              className="login-toggle-pw"
              onClick={() => setVerPassword((v) => !v)}
              aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        {error && <AlertCard>{error}</AlertCard>}
        <button type="submit" disabled={entrando}>
          {entrando && <span className="login-spinner" />}
          {entrando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="app-credit">
        Hecho por Ozziel Yaxcal Leal · Universidad de San Carlos de Guatemala — CUNOR · Software Avanzado
      </p>
    </div>
  );
}
