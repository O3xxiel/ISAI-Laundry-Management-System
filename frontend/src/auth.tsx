import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';
import type { Usuario } from './api';

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  login: (usuario: string, contrasena: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then(setUsuario)
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  async function login(usuarioInput: string, contrasena: string) {
    const user = await api.auth.login({ usuario: usuarioInput, contrasena });
    setUsuario(user);
  }

  async function logout() {
    await api.auth.logout();
    setUsuario(null);
  }

  return <AuthContext.Provider value={{ usuario, cargando, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
