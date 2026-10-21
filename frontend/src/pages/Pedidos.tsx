import { MessageCircle, Plus, Printer, Search, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, saldoPendiente } from '../api';
import type { MetodoPago, Pedido } from '../api';
import AlertCard from '../components/AlertCard';
import { folio, waLink } from '../utils';

const ESTADOS = ['recibido', 'en proceso', 'listo', 'entregado'];
const METODOS: MetodoPago[] = ['efectivo', 'tarjeta', 'transferencia'];
type FiltroEstado = 'todos' | 'en proceso' | 'listo' | 'atrasado' | 'entregado';

function esAtrasado(p: Pedido): boolean {
  return p.estado !== 'listo' && p.estado !== 'entregado' && !!p.fechaPromesa && new Date(p.fechaPromesa) < new Date();
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [cobrandoId, setCobrandoId] = useState<number | null>(null);
  const [montoCobro, setMontoCobro] = useState('');
  const [metodoCobro, setMetodoCobro] = useState<MetodoPago>('efectivo');
  const [error, setError] = useState('');

  function cargar() {
    api.pedidos.listar().then(setPedidos);
  }

  useEffect(cargar, []);

  async function cambiarEstado(id: number, estado: string) {
    setError('');
    try {
      await api.pedidos.actualizarEstado(id, estado);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function confirmarCobro(id: number) {
    if (!montoCobro || Number(montoCobro) <= 0) return;
    setError('');
    try {
      await api.pedidos.pagar(id, { monto: Number(montoCobro), metodo: metodoCobro });
      setCobrandoId(null);
      setMontoCobro('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const pedidosFiltrados = pedidos.filter((p) => {
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      const coincide = String(p.id).includes(q) || p.cliente.nombre.toLowerCase().includes(q) || p.cliente.telefono.includes(q);
      if (!coincide) return false;
    }
    if (filtroEstado === 'todos') return true;
    if (filtroEstado === 'atrasado') return esAtrasado(p);
    return p.estado === filtroEstado;
  });

  const conteoFiltros = {
    todos: pedidos.length,
    'en proceso': pedidos.filter((p) => p.estado === 'en proceso').length,
    listo: pedidos.filter((p) => p.estado === 'listo').length,
    atrasado: pedidos.filter(esAtrasado).length,
    entregado: pedidos.filter((p) => p.estado === 'entregado').length,
  };

  return (
    <div>
      <div className="dashboard-header">
        <h1>Pedidos <span className="count-badge">{pedidosFiltrados.length}</span></h1>
        <a className="btn-primary" href="/pos">
          <Plus size={16} strokeWidth={2} /> Nueva orden
        </a>
      </div>

      {error && <AlertCard>{error}</AlertCard>}

      <div className="pos-toolbar">
        <div className="inv-search">
          <Search size={16} strokeWidth={1.8} />
          <input type="text" placeholder="Buscar por folio, nombre o teléfono..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className="filter-pills">
          {([
            ['todos', 'Todos'],
            ['en proceso', 'En proceso'],
            ['listo', 'Listos'],
            ['atrasado', 'Atrasados'],
            ['entregado', 'Entregados'],
          ] as [FiltroEstado, string][]).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              className={`filter-pill filter-pill--${valor} ${filtroEstado === valor ? 'filter-pill--active' : ''}`}
              onClick={() => setFiltroEstado(valor)}
            >
              {etiqueta} <span className="filter-pill-count">{conteoFiltros[valor]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="pos-table">
          <thead>
            <tr>
              <th>Folio</th><th>Cliente</th><th>Servicios</th><th>Total</th><th>Saldo</th><th>Entrega</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {pedidosFiltrados.map((p) => {
              const saldo = saldoPendiente(p);
              return (
                <tr key={p.id}>
                  <td className="mono">{folio(p.id)}</td>
                  <td>{p.cliente.nombre}<br /><span className="cell-muted">{p.cliente.telefono}</span></td>
                  <td>{p.items.map((it) => it.servicio.nombre).join(', ')}</td>
                  <td>Q{p.total}</td>
                  <td>
                    {saldo > 0.001 ? <span className="badge-saldo">Q{saldo.toFixed(2)}</span> : <span className="badge-ok">al día</span>}
                  </td>
                  <td>{p.fechaPromesa ? new Date(p.fechaPromesa).toLocaleString() : '—'}</td>
                  <td>
                    <select
                      className={`estado-select estado-select--${p.estado.replace(' ', '-')}`}
                      value={p.estado}
                      disabled={p.estado === 'entregado'}
                      title={p.estado === 'entregado' ? 'Ya fue entregado, no se puede cambiar' : undefined}
                      onChange={(e) => cambiarEstado(p.id, e.target.value)}
                    >
                      {ESTADOS.map((estado) => (
                        <option
                          key={estado}
                          value={estado}
                          disabled={estado === 'entregado' && saldo > 0.001}
                          title={estado === 'entregado' && saldo > 0.001 ? 'Tiene saldo pendiente' : undefined}
                        >
                          {estado}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="acciones-cell">
                    <a className="btn-secondary btn-sm" href={`/ticket/${p.id}`} target="_blank" rel="noreferrer">
                      <Printer size={14} /> Ticket
                    </a>
                    {p.estado === 'listo' && (
                      <a
                        className="btn-secondary btn-sm"
                        href={waLink(p.cliente.telefono, `Hola ${p.cliente.nombre}, tu ropa ya está lista para recoger en ISAI. Folio ${folio(p.id)}.`)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle size={14} /> Avisar
                      </a>
                    )}
                    {saldo > 0.001 && cobrandoId !== p.id && (
                      <button type="button" className="btn-primary btn-sm" onClick={() => { setCobrandoId(p.id); setMontoCobro(saldo.toFixed(2)); }}>
                        <Wallet size={14} /> Cobrar saldo
                      </button>
                    )}
                    {cobrandoId === p.id && (
                      <span className="cobro-inline">
                        <input type="number" step="0.01" value={montoCobro} onChange={(e) => setMontoCobro(e.target.value)} />
                        <select value={metodoCobro} onChange={(e) => setMetodoCobro(e.target.value as MetodoPago)}>
                          {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <button type="button" onClick={() => confirmarCobro(p.id)}>OK</button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
