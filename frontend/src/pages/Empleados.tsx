import { Pencil, Plus, Power, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Empleado } from '../api';
import AlertCard from '../components/AlertCard';
import { useAuth } from '../auth';

const ROLES: { value: string; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'empleado', label: 'Empleado' },
];

interface FormEmpleado {
  nombre: string;
  usuario: string;
  contrasena: string;
  rol: string;
}

const FORM_VACIO: FormEmpleado = { nombre: '', usuario: '', contrasena: '', rol: 'empleado' };

function FilaForm({
  valor,
  onChange,
  onGuardar,
  onCancelar,
  esEdicion,
  autoFocus,
}: {
  valor: FormEmpleado;
  onChange: (v: FormEmpleado) => void;
  onGuardar: () => void;
  onCancelar: () => void;
  esEdicion?: boolean;
  autoFocus?: boolean;
}) {
  const valido = valor.nombre.trim() && valor.usuario.trim() && (esEdicion || valor.contrasena.trim());
  return (
    <tr className="servicio-fila-form">
      <td>
        <input
          type="text"
          placeholder="Nombre completo"
          value={valor.nombre}
          onChange={(e) => onChange({ ...valor, nombre: e.target.value })}
          autoFocus={autoFocus}
        />
      </td>
      <td>
        <input
          type="text"
          placeholder="usuario"
          value={valor.usuario}
          onChange={(e) => onChange({ ...valor, usuario: e.target.value })}
        />
      </td>
      <td colSpan={2}>
        <div className="servicio-form-controls">
          <select value={valor.rol} onChange={(e) => onChange({ ...valor, rol: e.target.value })}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <input
            type="password"
            placeholder={esEdicion ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            value={valor.contrasena}
            onChange={(e) => onChange({ ...valor, contrasena: e.target.value })}
            style={{ width: 170 }}
          />
          <button type="button" className="btn-primary btn-sm" onClick={onGuardar} disabled={!valido}>
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

export default function Empleados() {
  const { usuario: yo } = useAuth();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nuevo, setNuevo] = useState<FormEmpleado>(FORM_VACIO);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [edit, setEdit] = useState<FormEmpleado>(FORM_VACIO);
  const [error, setError] = useState('');

  function cargar() {
    api.usuarios.listar().then(setEmpleados);
  }

  useEffect(cargar, []);

  async function crear() {
    setError('');
    try {
      await api.usuarios.crear({
        nombre: nuevo.nombre.trim(),
        usuario: nuevo.usuario.trim(),
        contrasena: nuevo.contrasena,
        rol: nuevo.rol,
      });
      setNuevo(FORM_VACIO);
      setNuevoAbierto(false);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function abrirEdicion(e: Empleado) {
    setEditandoId(e.id);
    setEdit({ nombre: e.nombre, usuario: e.usuario, contrasena: '', rol: e.rol });
  }

  async function guardarEdicion() {
    if (editandoId == null) return;
    setError('');
    try {
      await api.usuarios.actualizar(editandoId, {
        nombre: edit.nombre.trim(),
        rol: edit.rol,
        contrasena: edit.contrasena.trim() || undefined,
      });
      setEditandoId(null);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function cambiarEstado(e: Empleado, activo: boolean) {
    if (!activo && !window.confirm(`¿Desactivar a "${e.nombre}"? Ya no podrá iniciar sesión.`)) return;
    setError('');
    try {
      await api.usuarios.cambiarEstado(e.id, activo);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Empleados</h1>
        {!nuevoAbierto && (
          <button type="button" className="btn-primary" onClick={() => setNuevoAbierto(true)}>
            <Plus size={16} /> Nuevo empleado
          </button>
        )}
      </div>

      {error && <AlertCard>{error}</AlertCard>}

      <div className="table-wrap">
        <table className="pos-table">
          <thead>
            <tr>
              <th>Nombre</th><th>Usuario</th><th>Rol</th><th></th>
            </tr>
          </thead>
          <tbody>
            {nuevoAbierto && (
              <FilaForm valor={nuevo} onChange={setNuevo} onGuardar={crear} onCancelar={() => { setNuevoAbierto(false); setNuevo(FORM_VACIO); }} autoFocus />
            )}
            {empleados.map((e) =>
              editandoId === e.id ? (
                <FilaForm key={e.id} valor={edit} onChange={setEdit} onGuardar={guardarEdicion} onCancelar={() => setEditandoId(null)} esEdicion autoFocus />
              ) : (
                <tr key={e.id} className={!e.activo ? 'servicio-fila--inactivo' : ''}>
                  <td data-label="Nombre">
                    {e.nombre}
                    {!e.activo && <span className="servicio-badge-inactivo">Desactivado</span>}
                    {e.id === yo?.id && <span className="cell-muted"> (tú)</span>}
                  </td>
                  <td className="mono" data-label="Usuario">{e.usuario}</td>
                  <td data-label="Rol">{ROLES.find((r) => r.value === e.rol)?.label ?? e.rol}</td>
                  <td className="servicio-acciones-cell">
                    {e.activo ? (
                      <>
                        <button type="button" className="icon-btn servicio-hover-accion" onClick={() => abrirEdicion(e)} aria-label="Editar">
                          <Pencil size={14} />
                        </button>
                        {e.id !== yo?.id && (
                          <button type="button" className="icon-btn servicio-hover-accion" onClick={() => cambiarEstado(e, false)} aria-label="Desactivar">
                            <Power size={14} />
                          </button>
                        )}
                      </>
                    ) : (
                      <button type="button" className="link-btn" onClick={() => cambiarEstado(e, true)}>Reactivar</button>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
