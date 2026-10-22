import { Calculator, ClipboardList, LayoutDashboard, Package, Receipt, ShoppingCart, Tags, Users } from 'lucide-react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import Logo from './components/Logo';
import Caja from './pages/Caja';
import Dashboard from './pages/Dashboard';
import Empleados from './pages/Empleados';
import Facturacion from './pages/Facturacion';
import Inventario from './pages/Inventario';
import Login from './pages/Login';
import Pedidos from './pages/Pedidos';
import Pos from './pages/Pos';
import Servicios from './pages/Servicios';
import Ticket from './pages/Ticket';

// Página de aterrizaje tras iniciar sesión: el admin ve el Dashboard, el empleado
// (que no tiene acceso a esa pantalla) cae directo en Pedidos.
function Inicio() {
  const { usuario } = useAuth();
  return usuario?.rol === 'admin' ? <Dashboard /> : <Navigate to="/pedidos" replace />;
}

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/pedidos" replace />;
  return <>{children}</>;
}

export default function App() {
  const { usuario, logout } = useAuth();
  const location = useLocation();

  // El ticket se imprime aparte, sin el layout de la app (sidebar, etc.).
  if (location.pathname.startsWith('/ticket/')) {
    return (
      <Routes>
        <Route path="/ticket/:id" element={<RequireAuth><Ticket /></RequireAuth>} />
      </Routes>
    );
  }

  return (
    <div className="app">
      {usuario && (
        <nav>
          <div className="brand">
            <Logo />
            <div className="brand-text">
              <span className="brand-name">ISAI</span>
              <span className="brand-sub">Lavandería</span>
            </div>
          </div>
          <div className="nav-links">
            {usuario.rol === 'admin' && (
              <NavLink to="/" end><LayoutDashboard size={17} strokeWidth={1.75} /> Dashboard</NavLink>
            )}
            <NavLink to="/pos"><ShoppingCart size={17} strokeWidth={1.75} /> POS</NavLink>
            <NavLink to="/pedidos"><ClipboardList size={17} strokeWidth={1.75} /> Pedidos</NavLink>
            {usuario.rol === 'admin' && (
              <>
                <NavLink to="/inventario"><Package size={17} strokeWidth={1.75} /> Inventario</NavLink>
                <NavLink to="/servicios"><Tags size={17} strokeWidth={1.75} /> Servicios</NavLink>
              </>
            )}
            <NavLink to="/facturacion"><Receipt size={17} strokeWidth={1.75} /> Facturación</NavLink>
            <NavLink to="/caja"><Calculator size={17} strokeWidth={1.75} /> Caja</NavLink>
            {usuario.rol === 'admin' && (
              <NavLink to="/empleados"><Users size={17} strokeWidth={1.75} /> Empleados</NavLink>
            )}
          </div>
          <button onClick={() => logout()}>Cerrar sesión</button>
          <p className="app-credit">
            Hecho por Ozziel Yaxcal Leal
            <br />
            Universidad de San Carlos de Guatemala — CUNOR
            <br />
            Software Avanzado
          </p>
        </nav>
      )}
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Inicio /></RequireAuth>} />
          <Route path="/pos" element={<RequireAuth><Pos /></RequireAuth>} />
          <Route path="/pedidos" element={<RequireAuth><Pedidos /></RequireAuth>} />
          <Route path="/inventario" element={<RequireAuth roles={['admin']}><Inventario /></RequireAuth>} />
          <Route path="/servicios" element={<RequireAuth roles={['admin']}><Servicios /></RequireAuth>} />
          <Route path="/facturacion" element={<RequireAuth><Facturacion /></RequireAuth>} />
          <Route path="/caja" element={<RequireAuth><Caja /></RequireAuth>} />
          <Route path="/empleados" element={<RequireAuth roles={['admin']}><Empleados /></RequireAuth>} />
        </Routes>
      </main>
    </div>
  );
}
