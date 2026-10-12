import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import type { Insumo, MotivoMovimiento, MovimientoHistorial } from '../api';
import AlertCard from '../components/AlertCard';
import Toast from '../components/Toast';

type Estado = 'sinstock' | 'reponer' | 'ok';
type Filtro = 'todos' | Estado;

const UNIDADES = ['litros', 'ml', 'kg', 'g', 'unidades'];
const UMBRAL_CONTEO = 0.05;

const MOTIVOS: Record<'entrada' | 'salida', MotivoMovimiento[]> = {
  entrada: ['Compra', 'Ajuste por conteo', 'Devolución'],
  salida: ['Consumo', 'Merma o desperdicio', 'Ajuste por conteo'],
};

const ESTADO_INFO: Record<Estado, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  sinstock: { label: 'Sin stock', className: 'status-pill--danger', Icon: XCircle },
  reponer: { label: 'Por reponer', className: 'status-pill--warning', Icon: AlertTriangle },
  ok: { label: 'OK', className: 'status-pill--success', Icon: CheckCircle2 },
};

function estadoDe(insumo: Insumo): Estado {
  const cantidad = Number(insumo.cantidadActual);
  const minimo = Number(insumo.stockMinimo);
  if (cantidad <= 0) return 'sinstock';
  if (cantidad <= minimo) return 'reponer';
  return 'ok';
}

function StatusPill({ estado }: { estado: Estado }) {
  const { label, className, Icon } = ESTADO_INFO[estado];
  return (
    <span className={`status-pill ${className}`}>
      <Icon size={13} strokeWidth={2} /> {label}
    </span>
  );
}

function BarraNivel({ insumo, estado }: { insumo: Insumo; estado: Estado }) {
  const cantidad = Number(insumo.cantidadActual);
  const minimo = Number(insumo.stockMinimo);
  const pct = minimo > 0 ? Math.min(100, (cantidad / minimo) * 100) : cantidad > 0 ? 100 : 0;
  return (
    <div className="qty-bar-track">
      <div className={`qty-bar-fill qty-bar-fill--${estado}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-panel ${wide ? 'modal-panel--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MovimientoModal({
  insumo,
  tipo,
  onClose,
  onSaved,
}: {
  insumo: Insumo;
  tipo: 'entrada' | 'salida';
  onClose: () => void;
  onSaved: (mensaje: string) => void;
}) {
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState<MotivoMovimiento>(MOTIVOS[tipo][0]);
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cantidadNum = Number(cantidad) || 0;
  const actual = Number(insumo.cantidadActual);
  const stockNuevo = tipo === 'entrada' ? actual + cantidadNum : actual - cantidadNum;
  const esNegativo = stockNuevo < 0;

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!cantidadNum || cantidadNum <= 0) {
      setError('Ingresa una cantidad mayor a 0.');
      return;
    }
    if (esNegativo) {
      setError('Esta salida dejaría el stock negativo.');
      return;
    }
    setGuardando(true);
    try {
      await api.inventario.registrarMovimiento({ insumoId: insumo.id, tipo, cantidad: cantidadNum, motivo, nota: nota || undefined });
      onSaved(`${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada para ${insumo.nombre}.`);
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <Modal title={`${tipo === 'entrada' ? 'Entrada' : 'Salida'} — ${insumo.nombre}`} onClose={onClose}>
      <form onSubmit={confirmar} className="modal-body">
        <p className="section-muted" style={{ marginTop: 0 }}>Stock actual: <strong>{insumo.cantidadActual} {insumo.unidad}</strong></p>

        <label className="field">
          <span className="field-label">Cantidad ({insumo.unidad})</span>
          <input type="number" step="0.01" min="0" autoFocus value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">Motivo</span>
          <select value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoMovimiento)}>
            {MOTIVOS[tipo].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Nota (opcional)</span>
          <input type="text" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Detalle adicional..." />
        </label>

        <p className={`stock-preview ${esNegativo ? 'stock-preview--error' : ''}`}>
          Stock nuevo: <strong>{stockNuevo.toFixed(2)} {insumo.unidad}</strong>
        </p>

        {error && <AlertCard>{error}</AlertCard>}

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" disabled={guardando || esNegativo}>Confirmar</button>
        </div>
      </form>
    </Modal>
  );
}

function NuevoInsumoModal({
  insumosExistentes,
  onClose,
  onSaved,
}: {
  insumosExistentes: Insumo[];
  onClose: () => void;
  onSaved: (mensaje: string) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState(UNIDADES[0]);
  const [cantidadActual, setCantidadActual] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  const nombreDuplicado = useMemo(
    () => insumosExistentes.some((i) => i.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()),
    [insumosExistentes, nombre],
  );

  const erroresCampo = {
    nombre: !nombre.trim() ? 'El nombre es obligatorio.' : nombreDuplicado ? 'Ya existe un insumo con este nombre.' : '',
    cantidadActual: cantidadActual !== '' && Number(cantidadActual) < 0 ? 'No puede ser negativo.' : '',
    stockMinimo: stockMinimo !== '' && Number(stockMinimo) < 0 ? 'No puede ser negativo.' : '',
  };
  const tieneErrores = Object.values(erroresCampo).some(Boolean);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral('');
    if (tieneErrores) return;
    setGuardando(true);
    try {
      await api.inventario.crear({
        nombre: nombre.trim(),
        unidad,
        cantidadActual: Number(cantidadActual) || 0,
        stockMinimo: Number(stockMinimo) || 0,
      });
      onSaved(`${nombre.trim()} agregado al inventario.`);
    } catch (err) {
      setErrorGeneral((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <Modal title="Nuevo insumo" onClose={onClose}>
      <form onSubmit={guardar} className="modal-body">
        <label className="field">
          <span className="field-label">Nombre</span>
          <input type="text" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} />
          {erroresCampo.nombre && <span className="field-error">{erroresCampo.nombre}</span>}
        </label>
        <label className="field">
          <span className="field-label">Unidad</span>
          <select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Stock inicial</span>
          <input type="number" step="0.01" min="0" value={cantidadActual} onChange={(e) => setCantidadActual(e.target.value)} />
          {erroresCampo.cantidadActual && <span className="field-error">{erroresCampo.cantidadActual}</span>}
        </label>
        <label className="field">
          <span className="field-label">Stock mínimo</span>
          <input type="number" step="0.01" min="0" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} />
          {erroresCampo.stockMinimo && <span className="field-error">{erroresCampo.stockMinimo}</span>}
        </label>

        {errorGeneral && <AlertCard>{errorGeneral}</AlertCard>}

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" disabled={guardando || tieneErrores}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

function HistorialPanel({ insumo, onClose }: { insumo: Insumo; onClose: () => void }) {
  const [historial, setHistorial] = useState<MovimientoHistorial[] | null>(null);

  useEffect(() => {
    api.inventario.historial(insumo.id).then(setHistorial);
  }, [insumo.id]);

  return (
    <div className="side-panel-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="side-panel" role="dialog" aria-modal="true" aria-label={`Historial de ${insumo.nombre}`}>
        <div className="modal-header">
          <h2>Historial — {insumo.nombre}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="side-panel-body">
          {historial == null ? (
            <div className="skeleton skeleton-card" style={{ height: 200 }} />
          ) : historial.length === 0 ? (
            <p className="section-muted">Todavía no hay movimientos registrados para este insumo.</p>
          ) : (
            <ul className="historial-list">
              {historial.map((m) => (
                <li key={m.id} className="historial-item">
                  <div className="historial-row">
                    <span className={`historial-delta ${m.tipo === 'entrada' ? 'historial-delta--positivo' : 'historial-delta--negativo'}`}>
                      {m.tipo === 'entrada' ? '+' : '−'}{m.cantidad} {insumo.unidad}
                    </span>
                    <span className="historial-fecha">{new Date(m.fecha).toLocaleString()}</span>
                  </div>
                  <div className="historial-row historial-meta">
                    <span>{m.motivo}{m.nota ? ` — ${m.nota}` : ''}</span>
                    <span>{m.usuario?.nombre ?? 'Sistema'}</span>
                  </div>
                  <div className="historial-saldo">Saldo resultante: <strong>{m.saldoResultante} {insumo.unidad}</strong></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ConteoFisicoModal({
  insumos,
  onClose,
  onSaved,
}: {
  insumos: Insumo[];
  onClose: () => void;
  onSaved: (mensaje: string) => void;
}) {
  const [valores, setValores] = useState<Record<number, string>>({});
  const [notas, setNotas] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const filas = insumos.map((insumo) => {
    const actual = Number(insumo.cantidadActual);
    const valor = valores[insumo.id];
    const tieneValor = valor != null && valor !== '';
    const real = tieneValor ? Number(valor) : actual;
    const diferencia = real - actual;
    const base = actual > 0 ? actual : real;
    const pct = base > 0 ? Math.abs(diferencia) / base : 0;
    const requiereNota = tieneValor && diferencia !== 0 && pct > UMBRAL_CONTEO;
    return { insumo, tieneValor, real, diferencia, requiereNota };
  });

  const pendientesSinNota = filas.filter((f) => f.requiereNota && !notas[f.insumo.id]?.trim());

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const cambios = filas.filter((f) => f.tieneValor && f.diferencia !== 0);
    if (cambios.length === 0) {
      setError('Ingresa al menos una cantidad real distinta a la del sistema.');
      return;
    }
    if (pendientesSinNota.length > 0) {
      setError(`Agrega una nota para: ${pendientesSinNota.map((f) => f.insumo.nombre).join(', ')} (diferencia mayor al 5%).`);
      return;
    }
    setGuardando(true);
    try {
      await api.inventario.conteo(
        cambios.map((f) => ({ insumoId: f.insumo.id, cantidadReal: f.real, nota: notas[f.insumo.id] || undefined })),
      );
      onSaved(`Conteo aplicado: ${cambios.length} ajuste${cambios.length === 1 ? '' : 's'} registrado${cambios.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <Modal title="Conteo físico" onClose={onClose} wide>
      <form onSubmit={confirmar} className="modal-body">
        <p className="section-muted" style={{ marginTop: 0 }}>
          Captura la cantidad real de cada insumo. Si la diferencia contra el sistema es mayor al 5%, se pide una nota.
        </p>
        <div className="conteo-list">
          {filas.map(({ insumo, diferencia, tieneValor, requiereNota }) => (
            <div key={insumo.id} className="conteo-row">
              <div className="conteo-row-main">
                <span className="conteo-nombre">{insumo.nombre}</span>
                <span className="section-muted">Sistema: {insumo.cantidadActual} {insumo.unidad}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={insumo.cantidadActual}
                  value={valores[insumo.id] ?? ''}
                  onChange={(e) => setValores((v) => ({ ...v, [insumo.id]: e.target.value }))}
                />
                {tieneValor && diferencia !== 0 && (
                  <span className={diferencia > 0 ? 'text-success' : 'text-warning'}>
                    {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)} {insumo.unidad}
                  </span>
                )}
              </div>
              {requiereNota && (
                <input
                  type="text"
                  className="conteo-nota"
                  placeholder="Nota obligatoria: ¿por qué la diferencia?"
                  value={notas[insumo.id] ?? ''}
                  onChange={(e) => setNotas((n) => ({ ...n, [insumo.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>

        {error && <AlertCard>{error}</AlertCard>}

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" disabled={guardando}>Confirmar conteo</button>
        </div>
      </form>
    </Modal>
  );
}

function MenuFila({ onVerHistorial, onProximamente }: { onVerHistorial: () => void; onProximamente: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener('mousedown', onClickFuera);
    return () => document.removeEventListener('mousedown', onClickFuera);
  }, []);

  return (
    <div className="row-menu" ref={ref}>
      <button type="button" className="row-menu-btn" onClick={() => setAbierto((v) => !v)} aria-label="Más acciones">
        <MoreHorizontal size={18} />
      </button>
      {abierto && (
        <div className="row-menu-list">
          <button type="button" onClick={() => { setAbierto(false); onVerHistorial(); }}>Ver historial</button>
          <button type="button" onClick={() => { setAbierto(false); onProximamente(); }}>Editar</button>
          <button type="button" onClick={() => { setAbierto(false); onProximamente(); }}>Archivar</button>
        </div>
      )}
    </div>
  );
}

export default function Inventario() {
  const [insumos, setInsumos] = useState<Insumo[] | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [movimiento, setMovimiento] = useState<{ insumo: Insumo; tipo: 'entrada' | 'salida' } | null>(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalConteo, setModalConteo] = useState(false);
  const [historialDe, setHistorialDe] = useState<Insumo | null>(null);
  const [toast, setToast] = useState('');

  function cargar() {
    api.inventario.listar().then(setInsumos);
  }

  useEffect(cargar, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  function onGuardado(mensaje: string) {
    setMovimiento(null);
    setModalNuevo(false);
    setModalConteo(false);
    setToast(mensaje);
    cargar();
  }

  const resumen = useMemo(() => {
    const lista = insumos ?? [];
    return {
      total: lista.length,
      reponer: lista.filter((i) => estadoDe(i) === 'reponer').length,
      sinstock: lista.filter((i) => estadoDe(i) === 'sinstock').length,
    };
  }, [insumos]);

  const filtrados = (insumos ?? []).filter((i) => {
    if (filtro !== 'todos' && estadoDe(i) !== filtro) return false;
    if (busqueda.trim() && !i.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())) return false;
    return true;
  });

  if (!insumos) {
    return (
      <div>
        <h1>Inventario</h1>
        <div className="inv-summary">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton skeleton-kpi" />)}
        </div>
        <div className="skeleton skeleton-card" style={{ height: 320 }} />
      </div>
    );
  }

  return (
    <div>
      <h1>Inventario</h1>

      <div className="inv-summary">
        <button type="button" className={`inv-summary-card ${filtro === 'todos' ? 'inv-summary-card--active' : ''}`} onClick={() => setFiltro('todos')}>
          <span className="inv-summary-icon"><Package size={20} strokeWidth={1.7} /></span>
          <span className="kpi-value">{resumen.total}</span>
          <span className="kpi-label">Total de insumos</span>
        </button>
        <button type="button" className={`inv-summary-card inv-summary-card--warning ${filtro === 'reponer' ? 'inv-summary-card--active' : ''}`} onClick={() => setFiltro('reponer')}>
          <span className="inv-summary-icon inv-summary-icon--warning"><AlertTriangle size={20} strokeWidth={1.7} /></span>
          <span className="kpi-value" style={{ color: 'var(--warning)' }}>{resumen.reponer}</span>
          <span className="kpi-label">Por reponer</span>
        </button>
        <button type="button" className={`inv-summary-card inv-summary-card--danger ${filtro === 'sinstock' ? 'inv-summary-card--active' : ''}`} onClick={() => setFiltro('sinstock')}>
          <span className="inv-summary-icon inv-summary-icon--danger"><XCircle size={20} strokeWidth={1.7} /></span>
          <span className="kpi-value" style={{ color: 'var(--danger)' }}>{resumen.sinstock}</span>
          <span className="kpi-label">Sin stock</span>
        </button>
      </div>

      <div className="inv-toolbar">
        <div className="inv-search">
          <Search size={16} strokeWidth={1.8} />
          <input type="text" placeholder="Buscar insumo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)}>
          <option value="todos">Todos</option>
          <option value="ok">OK</option>
          <option value="reponer">Por reponer</option>
          <option value="sinstock">Sin stock</option>
        </select>
        <div className="inv-toolbar-spacer" />
        <button type="button" className="btn-secondary" onClick={() => setModalConteo(true)} disabled={insumos.length === 0}>
          <ClipboardList size={16} /> Conteo físico
        </button>
        <button type="button" className="btn-primary" onClick={() => setModalNuevo(true)}>
          <Plus size={16} /> Nuevo insumo
        </button>
      </div>

      {filtrados.length === 0 ? (
        <div className="empty-state-block">
          <Package size={28} strokeWidth={1.5} />
          <p>{insumos.length === 0 ? 'Todavía no hay insumos registrados.' : 'Ningún insumo coincide con la búsqueda o el filtro.'}</p>
          {insumos.length === 0 && (
            <button type="button" className="btn-primary" onClick={() => setModalNuevo(true)}><Plus size={16} /> Agregar el primero</button>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Insumo</th><th>Estado</th><th>Cantidad</th><th>Stock mínimo</th><th>Alcanza para</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((i) => {
                const estado = estadoDe(i);
                return (
                  <tr key={i.id}>
                    <td data-label="Insumo"><strong>{i.nombre}</strong></td>
                    <td data-label="Estado"><StatusPill estado={estado} /></td>
                    <td data-label="Cantidad">
                      <div className="qty-cell">
                        <span className="qty-number">{i.cantidadActual} <span className="qty-unit">{i.unidad}</span></span>
                        <BarraNivel insumo={i} estado={estado} />
                      </div>
                    </td>
                    <td data-label="Stock mínimo">{i.stockMinimo} {i.unidad}</td>
                    <td data-label="Alcanza para">{i.diasRestantes != null ? `${i.diasRestantes} día${i.diasRestantes === 1 ? '' : 's'}` : '—'}</td>
                    <td data-label="Acciones">
                      <div className="row-actions">
                        <button type="button" className="btn-entrada" onClick={() => setMovimiento({ insumo: i, tipo: 'entrada' })}>
                          <Plus size={15} strokeWidth={2.2} /> Entrada
                        </button>
                        <button type="button" className="btn-salida" onClick={() => setMovimiento({ insumo: i, tipo: 'salida' })}>
                          <span className="btn-salida-icon" aria-hidden>−</span> Salida
                        </button>
                        <MenuFila
                          onVerHistorial={() => setHistorialDe(i)}
                          onProximamente={() => setToast('Disponible en una próxima actualización.')}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {movimiento && (
        <MovimientoModal
          insumo={movimiento.insumo}
          tipo={movimiento.tipo}
          onClose={() => setMovimiento(null)}
          onSaved={onGuardado}
        />
      )}
      {modalNuevo && <NuevoInsumoModal insumosExistentes={insumos} onClose={() => setModalNuevo(false)} onSaved={onGuardado} />}
      {modalConteo && <ConteoFisicoModal insumos={insumos} onClose={() => setModalConteo(false)} onSaved={onGuardado} />}
      {historialDe && <HistorialPanel insumo={historialDe} onClose={() => setHistorialDe(null)} />}
      {toast && <Toast>{toast}</Toast>}
    </div>
  );
}
