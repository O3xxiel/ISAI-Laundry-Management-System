import { Minus, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import type { CorteCaja, CorteCajaResumen } from '../api';
import AlertCard from '../components/AlertCard';
import { useAuth } from '../auth';

const ETIQUETA_METODO: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

const ETIQUETA_TIPO_MOV: Record<string, string> = {
  cobro: 'Cobro',
  retiro: 'Retiro',
  gasto: 'Gasto',
};

function formatoFecha(d: Date): string {
  const texto = d.toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatoHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-GT', { hour: 'numeric', minute: '2-digit' });
}

function claseDiferencia(d: number | null): string {
  if (d == null || Math.abs(d) < 0.01) return '';
  return d < 0 ? 'text-danger' : 'text-success';
}

function textoDiferencia(d: number): string {
  if (Math.abs(d) < 0.01) return 'Cuadra exacto';
  return d < 0 ? `Faltan Q${Math.abs(d).toFixed(2)}` : `Sobran Q${d.toFixed(2)}`;
}

export default function Caja() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'admin';
  const [corte, setCorte] = useState<CorteCaja | null | undefined>(undefined);
  const [fondoInicial, setFondoInicial] = useState('');
  const [movAbierto, setMovAbierto] = useState(false);
  const [tipoMov, setTipoMov] = useState<'retiro' | 'gasto'>('gasto');
  const [conceptoMov, setConceptoMov] = useState('');
  const [montoMov, setMontoMov] = useState('');
  const [conteoReal, setConteoReal] = useState('');
  const [historial, setHistorial] = useState<CorteCajaResumen[] | null>(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [error, setError] = useState('');

  function cargar() {
    api.caja.corte().then(setCorte);
  }

  useEffect(cargar, []);

  async function abrirCaja(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const nuevo = await api.caja.abrir(Number(fondoInicial) || 0);
      setCorte(nuevo);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function registrarMovimiento(e: React.FormEvent) {
    e.preventDefault();
    if (!corte || !conceptoMov.trim() || !montoMov) return;
    setError('');
    try {
      const actualizado = await api.caja.registrarMovimiento(corte.id, {
        tipo: tipoMov,
        concepto: conceptoMov.trim(),
        monto: Number(montoMov),
      });
      setCorte(actualizado);
      setMovAbierto(false);
      setConceptoMov('');
      setMontoMov('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function cerrarCaja() {
    if (!corte || !conteoReal) return;
    if (!window.confirm('¿Cerrar la caja de hoy? Ya no se podrán registrar más movimientos.')) return;
    setError('');
    try {
      const cerrado = await api.caja.cerrar(corte.id, Number(conteoReal));
      setCorte(cerrado);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function toggleHistorial() {
    if (!mostrarHistorial && historial == null) {
      api.caja.historial().then(setHistorial);
    }
    setMostrarHistorial((v) => !v);
  }

  if (corte === undefined) return <div>Cargando...</div>;

  // ---------------- Estado A: caja sin abrir hoy ----------------
  if (corte === null) {
    return (
      <div>
        <h1>Corte de caja — {formatoFecha(new Date())}</h1>
        {error && <AlertCard>{error}</AlertCard>}
        <section className="pos-card" style={{ maxWidth: 380 }}>
          <h2 className="pos-card-title">Abrir caja</h2>
          <p className="section-muted">Ingresa el fondo inicial (el efectivo con el que arranca la gaveta) para empezar el día.</p>
          <form onSubmit={abrirCaja}>
            <label className="field">
              <span className="field-label">Fondo inicial</span>
              <div className="servicio-precio-input" style={{ width: '100%' }}>
                <span>Q</span>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={fondoInicial} onChange={(e) => setFondoInicial(e.target.value)} autoFocus />
              </div>
            </label>
            <button type="submit" className="btn-primary" style={{ marginTop: '0.75rem' }} disabled={!fondoInicial}>
              Abrir caja
            </button>
          </form>
        </section>
      </div>
    );
  }

  // ---------------- Estado B/C: caja abierta o ya cerrada ----------------
  const cerrada = !!corte.cerradoEn;
  const conteoNum = Number(conteoReal) || 0;
  const diferenciaPreview = conteoReal ? conteoNum - corte.efectivoEsperado : null;
  const maxMonto = Math.max(1, ...corte.desglosePorMetodo.map((m) => m.monto));

  return (
    <div>
      <div className="dashboard-header">
        <h1>Corte de caja — {formatoFecha(new Date(corte.fecha + 'T00:00:00'))}</h1>
        <div className="dashboard-header-actions">
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>
      <p className="section-muted">
        Responsable: <strong>{corte.responsable}</strong> · Abierto a las {formatoHora(corte.abiertoEn)}
        {cerrada && corte.cerradoEn && <> · Cerrado a las {formatoHora(corte.cerradoEn)}</>}
      </p>

      {error && <AlertCard>{error}</AlertCard>}

      <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-value">Q{corte.fondoInicial.toFixed(2)}</span>
          <span className="kpi-label">Fondo inicial</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">Q{corte.totalCobrado.toFixed(2)}</span>
          <span className="kpi-label">Total cobrado hoy</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">Q{corte.efectivoEsperado.toFixed(2)}</span>
          <span className="kpi-label">Efectivo esperado en caja</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{corte.pedidosCreados}</span>
          <span className="kpi-label">Pedidos recibidos hoy</span>
        </div>
      </div>

      <h2>Desglose por método de pago</h2>
      <div className="metodo-bars">
        {corte.desglosePorMetodo.map((m) => (
          <div key={m.metodo} className="metodo-bar-row">
            <span className="metodo-bar-label">{ETIQUETA_METODO[m.metodo] ?? m.metodo}</span>
            <div className="metodo-bar-track">
              <div className="metodo-bar-fill" style={{ width: `${(m.monto / maxMonto) * 100}%` }} />
            </div>
            <span className="metodo-bar-value">Q{m.monto.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-header" style={{ marginTop: '2rem', borderBottom: 'none', paddingBottom: 0, marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>Movimientos del día</h2>
        {!cerrada && !movAbierto && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => setMovAbierto(true)}>
            <Minus size={14} /> Registrar retiro o gasto
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table className="pos-table">
          <thead>
            <tr>
              <th>Hora</th><th>Tipo</th><th>Concepto</th><th className="servicio-precio-cell">Monto</th>
            </tr>
          </thead>
          <tbody>
            {movAbierto && (
              <tr className="servicio-fila-form">
                <td>{formatoHora(new Date().toISOString())}</td>
                <td>
                  <select value={tipoMov} onChange={(e) => setTipoMov(e.target.value as 'retiro' | 'gasto')}>
                    <option value="gasto">Gasto</option>
                    <option value="retiro">Retiro</option>
                  </select>
                </td>
                <td>
                  <input type="text" placeholder="Ej. Compra de jabón" value={conceptoMov} onChange={(e) => setConceptoMov(e.target.value)} autoFocus />
                </td>
                <td>
                  <div className="servicio-form-controls">
                    <div className="servicio-precio-input">
                      <span>Q</span>
                      <input type="number" step="0.01" min="0" placeholder="0.00" value={montoMov} onChange={(e) => setMontoMov(e.target.value)} />
                    </div>
                    <button type="button" className="btn-primary btn-sm" onClick={registrarMovimiento} disabled={!conceptoMov.trim() || !montoMov}>
                      Guardar
                    </button>
                    <button type="button" className="icon-btn" onClick={() => { setMovAbierto(false); setConceptoMov(''); setMontoMov(''); }} aria-label="Cancelar">
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {corte.movimientos.length === 0 && !movAbierto && (
              <tr><td colSpan={4} className="section-muted">Todavía no hay movimientos hoy.</td></tr>
            )}
            {[...corte.movimientos].reverse().map((m, i) => (
              <tr key={i}>
                <td data-label="Hora">{formatoHora(m.fecha)}</td>
                <td data-label="Tipo">
                  <span className={`status-pill ${m.tipo === 'cobro' ? 'status-pill--success' : 'status-pill--warning'}`}>
                    {ETIQUETA_TIPO_MOV[m.tipo]}
                  </span>
                </td>
                <td data-label="Concepto">{m.concepto}</td>
                <td className={`servicio-precio-cell ${m.monto < 0 ? 'text-danger' : ''}`} data-label="Monto">
                  {m.monto < 0 ? '-' : '+'}Q{Math.abs(m.monto).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!cerrada ? (
        esAdmin ? (
          <section className="pos-card" style={{ maxWidth: 420, marginTop: '1.5rem' }}>
            <h2 className="pos-card-title">Cerrar caja</h2>
            <p className="section-muted">Cuenta el efectivo real en la gaveta e ingrésalo aquí.</p>
            <label className="field">
              <span className="field-label">Conteo real</span>
              <div className="servicio-precio-input" style={{ width: '100%' }}>
                <span>Q</span>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={conteoReal} onChange={(e) => setConteoReal(e.target.value)} />
              </div>
            </label>
            {diferenciaPreview != null && (
              <p className={claseDiferencia(diferenciaPreview)} style={{ marginTop: '0.5rem' }}>
                Esperado Q{corte.efectivoEsperado.toFixed(2)} · {textoDiferencia(diferenciaPreview)}
              </p>
            )}
            <button type="button" className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={cerrarCaja} disabled={!conteoReal}>
              Cerrar caja
            </button>
          </section>
        ) : (
          <p className="section-muted" style={{ marginTop: '1.5rem' }}>
            Solo un administrador puede cerrar la caja (hacer el conteo real del día).
          </p>
        )
      ) : (
        <section className="pos-card" style={{ maxWidth: 420, marginTop: '1.5rem' }}>
          <h2 className="pos-card-title">Cierre</h2>
          <p>Conteo real: <strong>Q{(corte.conteoReal ?? 0).toFixed(2)}</strong></p>
          <p className={claseDiferencia(corte.diferencia)}>
            Esperado Q{corte.efectivoEsperado.toFixed(2)} · {textoDiferencia(corte.diferencia ?? 0)}
          </p>
        </section>
      )}

      {esAdmin && (
        <h2 style={{ marginTop: '2rem' }}>
          <button type="button" className="link-btn" onClick={toggleHistorial}>
            {mostrarHistorial ? 'Ocultar historial de cortes' : 'Ver historial de cortes'}
          </button>
        </h2>
      )}
      {esAdmin && mostrarHistorial && (
        <div className="table-wrap">
          <table className="pos-table">
            <thead>
              <tr><th>Fecha</th><th>Responsable</th><th className="servicio-precio-cell">Cobrado</th><th>Diferencia</th></tr>
            </thead>
            <tbody>
              {historial == null ? (
                <tr><td colSpan={4} className="section-muted">Cargando...</td></tr>
              ) : historial.length === 0 ? (
                <tr><td colSpan={4} className="section-muted">Todavía no hay cortes cerrados.</td></tr>
              ) : (
                historial.map((h) => (
                  <tr key={h.id}>
                    <td data-label="Fecha">{formatoFecha(new Date(h.fecha + 'T00:00:00'))}</td>
                    <td data-label="Responsable">{h.responsable}</td>
                    <td className="servicio-precio-cell" data-label="Cobrado">Q{h.totalCobrado.toFixed(2)}</td>
                    <td className={claseDiferencia(h.diferencia)} data-label="Diferencia">{h.diferencia != null ? textoDiferencia(h.diferencia) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
