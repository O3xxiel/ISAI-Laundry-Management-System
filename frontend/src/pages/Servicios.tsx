import { Pencil, Plus, Power, Search, X } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { api } from '../api';
import type { Servicio, UnidadCobro } from '../api';
import AlertCard from '../components/AlertCard';

const GRUPOS: { value: UnidadCobro; label: string }[] = [
  { value: 'peso', label: 'Por libra' },
  { value: 'pieza', label: 'Por pieza' },
  { value: 'fijo', label: 'Extras' },
];

const UNIDAD_SUFIJO: Record<UnidadCobro, string> = {
  peso: '/ lb',
  pieza: '/ pieza',
  fijo: '',
};

interface FormServicio {
  nombre: string;
  unidadCobro: UnidadCobro;
  precio: string;
}

const FORM_VACIO: FormServicio = { nombre: '', unidadCobro: 'peso', precio: '' };

function FilaForm({
  valor,
  onChange,
  onGuardar,
  onCancelar,
  autoFocus,
}: {
  valor: FormServicio;
  onChange: (v: FormServicio) => void;
  onGuardar: () => void;
  onCancelar: () => void;
  autoFocus?: boolean;
}) {
  return (
    <tr className="servicio-fila-form">
      <td>
        <input
          type="text"
          placeholder="Nombre del servicio"
          value={valor.nombre}
          onChange={(e) => onChange({ ...valor, nombre: e.target.value })}
          autoFocus={autoFocus}
        />
      </td>
      <td colSpan={2}>
        <div className="servicio-form-controls">
          <select value={valor.unidadCobro} onChange={(e) => onChange({ ...valor, unidadCobro: e.target.value as UnidadCobro })}>
            {GRUPOS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
          <div className="servicio-precio-input">
            <span>Q</span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={valor.precio}
              onChange={(e) => onChange({ ...valor, precio: e.target.value })}
            />
          </div>
          <button type="button" className="btn-primary btn-sm" onClick={onGuardar} disabled={!valor.nombre.trim() || !valor.precio}>
            Guardar
          </button>
          <button type="button" className="icon-btn" onClick={onCancelar} aria-label="Cancelar">
            <X size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Servicios() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nuevo, setNuevo] = useState<FormServicio>(FORM_VACIO);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [edit, setEdit] = useState<FormServicio>(FORM_VACIO);
  const [error, setError] = useState('');

  function cargar() {
    api.servicios.listar(true).then(setServicios);
  }

  useEffect(cargar, []);

  async function crear() {
    setError('');
    try {
      await api.servicios.crear({ nombre: nuevo.nombre.trim(), unidadCobro: nuevo.unidadCobro, precio: Number(nuevo.precio) });
      setNuevo(FORM_VACIO);
      setNuevoAbierto(false);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function abrirEdicion(s: Servicio) {
    setEditandoId(s.id);
    setEdit({ nombre: s.nombre, unidadCobro: s.unidadCobro, precio: s.precio });
  }

  async function guardarEdicion() {
    if (editandoId == null) return;
    setError('');
    try {
      await api.servicios.actualizar(editandoId, {
        nombre: edit.nombre.trim(),
        unidadCobro: edit.unidadCobro,
        precio: Number(edit.precio),
      });
      setEditandoId(null);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function desactivar(s: Servicio) {
    if (!window.confirm(`¿Desactivar "${s.nombre}"? Ya no aparecerá al crear pedidos nuevos, pero los pedidos anteriores que lo usan no se ven afectados.`)) return;
    setError('');
    try {
      await api.servicios.cambiarEstado(s.id, false);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function reactivar(s: Servicio) {
    setError('');
    try {
      await api.servicios.cambiarEstado(s.id, true);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = servicios.filter((s) => {
    if (!mostrarInactivos && !s.activo) return false;
    if (q && !s.nombre.toLowerCase().includes(q)) return false;
    return true;
  });
  const inactivosCount = servicios.filter((s) => !s.activo).length;
  const hayResultados = visibles.length > 0;

  return (
    <div>
      <h1>Catálogo de servicios</h1>

      <div className="inv-toolbar">
        <div className="inv-search">
          <Search size={16} strokeWidth={1.8} />
          <input type="text" placeholder="Buscar servicio..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className="inv-toolbar-spacer" />
        {inactivosCount > 0 && (
          <button type="button" className="link-btn" onClick={() => setMostrarInactivos((v) => !v)}>
            {mostrarInactivos ? 'Ocultar desactivados' : `Mostrar desactivados (${inactivosCount})`}
          </button>
        )}
        {!nuevoAbierto && (
          <button type="button" className="btn-primary btn-sm" onClick={() => setNuevoAbierto(true)}>
            <Plus size={15} /> Nuevo servicio
          </button>
        )}
      </div>

      {error && <AlertCard>{error}</AlertCard>}

      <div className="table-wrap">
        <table className="pos-table">
          <thead>
            <tr>
              <th>Servicio</th><th className="servicio-precio-cell">Precio</th><th></th>
            </tr>
          </thead>
          <tbody>
            {nuevoAbierto && (
              <FilaForm valor={nuevo} onChange={setNuevo} onGuardar={crear} onCancelar={() => { setNuevoAbierto(false); setNuevo(FORM_VACIO); }} autoFocus />
            )}

            {GRUPOS.map((grupo) => {
              const items = visibles
                .filter((s) => s.unidadCobro === grupo.value)
                .sort((a, b) => Number(a.precio) - Number(b.precio));
              if (items.length === 0) return null;
              return (
                <Fragment key={grupo.value}>
                  <tr className="servicio-grupo-row">
                    <td colSpan={3}>{grupo.label}</td>
                  </tr>
                  {items.map((s) =>
                    editandoId === s.id ? (
                      <FilaForm key={s.id} valor={edit} onChange={setEdit} onGuardar={guardarEdicion} onCancelar={() => setEditandoId(null)} autoFocus />
                    ) : (
                      <tr key={s.id} className={!s.activo ? 'servicio-fila--inactivo' : ''}>
                        <td data-label="Servicio">
                          {s.nombre}
                          {!s.activo && <span className="servicio-badge-inactivo">Desactivado</span>}
                        </td>
                        <td className="servicio-precio-cell" data-label="Precio">
                          Q{Number(s.precio).toFixed(2)}
                          {UNIDAD_SUFIJO[s.unidadCobro] && <span className="cell-muted"> {UNIDAD_SUFIJO[s.unidadCobro]}</span>}
                        </td>
                        <td className="servicio-acciones-cell">
                          {s.activo ? (
                            <>
                              <button type="button" className="icon-btn servicio-hover-accion" onClick={() => abrirEdicion(s)} aria-label="Editar">
                                <Pencil size={14} />
                              </button>
                              <button type="button" className="icon-btn servicio-hover-accion" onClick={() => desactivar(s)} aria-label="Desactivar">
                                <Power size={14} />
                              </button>
                            </>
                          ) : (
                            <button type="button" className="link-btn" onClick={() => reactivar(s)}>Reactivar</button>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </Fragment>
              );
            })}

            {!hayResultados && !nuevoAbierto && (
              <tr>
                <td colSpan={3} className="section-muted">No hay servicios que coincidan con la búsqueda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
