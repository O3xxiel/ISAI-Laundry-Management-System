import { Calculator, LayoutDashboard, Package, Receipt, ShoppingCart, Tags } from 'lucide-react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import Logo from './components/Logo';
import Caja from './pages/Caja';
import Dashboard from './pages/Dashboard';
import Facturacion from './pages/Facturacion';
import Inventario from './pages/Inventario';
import Login from './pages/Login';
import Pos from './pages/Pos';
import Servicios from './pages/Servicios';
import Ticket from './pages/Ticket';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
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
            <NavLink to="/" end><LayoutDashboard size={17} strokeWidth={1.75} /> Dashboard</NavLink>
            <NavLink to="/pos"><ShoppingCart size={17} strokeWidth={1.75} /> POS</NavLink>
            <NavLink to="/inventario"><Package size={17} strokeWidth={1.75} /> Inventario</NavLink>
            <NavLink to="/servicios"><Tags size={17} strokeWidth={1.75} /> Servicios</NavLink>
            <NavLink to="/facturacion"><Receipt size={17} strokeWidth={1.75} /> Facturación</NavLink>
            <NavLink to="/caja"><Calculator size={17} strokeWidth={1.75} /> Caja</NavLink>
          </div>
          <button onClick={() => logout()}>Cerrar sesión</button>
        </nav>
      )}
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/pos" element={<RequireAuth><Pos /></RequireAuth>} />
          <Route path="/inventario" element={<RequireAuth><Inventario /></RequireAuth>} />
          <Route path="/servicios" element={<RequireAuth><Servicios /></RequireAuth>} />
          <Route path="/facturacion" element={<RequireAuth><Facturacion /></RequireAuth>} />
          <Route path="/caja" element={<RequireAuth><Caja /></RequireAuth>} />
        </Routes>
      </main>
    </div>
  );
}
