import { Printer, Search, Trash2, UserPlus, Wallet } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { api, saldoPendiente } from '../api';
import type { Cliente, MetodoPago, Pedido, Servicio } from '../api';
import AlertCard from '../components/AlertCard';
import SearchSelect from '../components/SearchSelect';
import Toast from '../components/Toast';
import { folio, waLink } from '../utils';

const ESTADOS = ['recibido', 'en proceso', 'listo', 'entregado'];
const METODOS: MetodoPago[] = ['efectivo', 'tarjeta', 'transferencia'];
type FiltroEstado = 'todos' | 'en proceso' | 'listo' | 'atrasado' | 'entregado';

interface ItemForm {
  servicioId: string;
  cantidad: string;
}

function subtotalItem(servicio: Servicio | undefined, cantidad: string): number {
  if (!servicio) return 0;
  if (servicio.unidadCobro === 'fijo') return Number(servicio.precio);
  return Number(servicio.precio) * (Number(cantidad) || 0);
}

function unidadEtiqueta(servicio: Servicio | undefined): string {
  if (!servicio) return '';
  if (servicio.unidadCobro === 'peso') return 'lb';
  if (servicio.unidadCobro === 'pieza') return 'pza';
  return '';
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatoLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function chipFecha(preset: 'hoy18' | 'manana10' | 'en2dias'): string {
  const d = new Date();
  if (preset === 'hoy18') {
    d.setHours(18, 0, 0, 0);
  } else if (preset === 'manana10') {
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
  } else {
    d.setDate(d.getDate() + 2);
    d.setHours(18, 0, 0, 0);
  }
  return formatoLocal(d);
}

function esAtrasado(p: Pedido): boolean {
  return p.estado !== 'listo' && p.estado !== 'entregado' && !!p.fechaPromesa && new Date(p.fechaPromesa) < new Date();
}

export default function Pos() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');

  const [items, setItems] = useState<ItemForm[]>([{ servicioId: '', cantidad: '' }]);
  const [itemNotas, setItemNotas] = useState<Record<number, string>>({});
  const [notaAbierta, setNotaAbierta] = useState<Record<number, boolean>>({});

  const [fechaPromesa, setFechaPromesa] = useState('');
  const [fechaManual, setFechaManual] = useState(false);
  const [notas, setNotas] = useState('');
  const [tipoPago, setTipoPago] = useState<'total' | 'anticipo' | 'ninguno'>('ninguno');
  const [montoAnticipo, setMontoAnticipo] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [cobrandoId, setCobrandoId] = useState<number | null>(null);
  const [montoCobro, setMontoCobro] = useState('');
  const [metodoCobro, setMetodoCobro] = useState<MetodoPago>('efectivo');

  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastPedido, setToastPedido] = useState<Pedido | null>(null);

  function cargar() {
    api.clientes.listar().then(setClientes);
    api.servicios.listar().then(setServicios);
    api.pedidos.listar().then(setPedidos);
  }

  useEffect(cargar, []);

  useEffect(() => {
    if (!toastMsg && !toastPedido) return;
    const t = setTimeout(() => {
      setToastMsg('');
      setToastPedido(null);
    }, 6000);
    return () => clearTimeout(t);
  }, [toastMsg, toastPedido]);

  const servicioPorId = useMemo(() => new Map(servicios.map((s) => [s.id, s])), [servicios]);
  const clienteSeleccionado = clientes.find((c) => String(c.id) === clienteId) ?? null;

  const totalPedido = items.reduce(
    (acc, it) => acc + subtotalItem(servicioPorId.get(Number(it.servicioId)), it.cantidad),
    0,
  );

  function ultimaVisita(cliente: Cliente): string | undefined {
    const delCliente = pedidos.filter((p) => p.clienteId === cliente.id);
    if (delCliente.length === 0) return undefined;
    const masReciente = delCliente.reduce((max, p) => (new Date(p.creadoEn) > new Date(max.creadoEn) ? p : max));
    const dias = Math.floor((Date.now() - new Date(masReciente.creadoEn).getTime()) / 86_400_000);
    return dias <= 0 ? 'Última visita: hoy' : `Última visita hace ${dias} día${dias === 1 ? '' : 's'}`;
  }

  function actualizarItem(idx: number, campo: keyof ItemForm, valor: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  }

  function agregarItem() {
    setItems((prev) => [...prev, { servicioId: '', cantidad: '' }]);
  }

  function quitarItem(idx: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
    setItemNotas((prev) => {
      const copia = { ...prev };
      delete copia[idx];
      return copia;
    });
  }

  function resetForm() {
    setNuevoCliente(false);
    setClienteId('');
    setNombreCliente('');
    setTelefonoCliente('');
    setItems([{ servicioId: '', cantidad: '' }]);
    setItemNotas({});
    setNotaAbierta({});
    setFechaPromesa('');
    setFechaManual(false);
    setNotas('');
    setTipoPago('ninguno');
    setMontoAnticipo('');
  }

  function construirNotas(): string | undefined {
    const notasLinea = items
      .map((it, idx) => {
        const nota = itemNotas[idx]?.trim();
        if (!nota) return null;
        const servicio = servicioPorId.get(Number(it.servicioId));
        return `${servicio?.nombre ?? 'Servicio'}: ${nota}`;
      })
      .filter((x): x is string => !!x);
    const partes = [notas.trim(), ...notasLinea].filter(Boolean);
    return partes.length > 0 ? partes.join(' | ') : undefined;
  }

  const clienteListo = nuevoCliente ? nombreCliente.trim() !== '' && telefonoCliente.trim() !== '' : clienteId !== '';
  const hayServicio = items.some((it) => it.servicioId !== '');
  const pedidoValido = clienteListo && hayServicio;

  const labelBoton =
    tipoPago === 'total'
      ? `Cobrar Q${totalPedido.toFixed(2)} y crear pedido`
      : tipoPago === 'anticipo'
        ? `Cobrar anticipo de Q${(Number(montoAnticipo) || 0).toFixed(2)} y crear pedido`
        : 'Crear pedido';

  async function crearPedido(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!pedidoValido) return;
    setGuardando(true);
    try {
      let idCliente = Number(clienteId);
      if (nuevoCliente) {
        const cliente = await api.clientes.crear({ nombre: nombreCliente, telefono: telefonoCliente });
        idCliente = cliente.id;
      }

      const itemsValidos = items
        .filter((it) => it.servicioId)
        .map((it) => ({ servicioId: Number(it.servicioId), cantidad: Number(it.cantidad) || 1 }));

      const pagoInicial =
        tipoPago === 'total'
          ? { monto: totalPedido, metodo: metodoPago }
          : tipoPago === 'anticipo'
            ? { monto: Number(montoAnticipo), metodo: metodoPago }
            : undefined;

      const creado = await api.pedidos.crear({
        clienteId: idCliente,
        items: itemsValidos,
        fechaPromesa: fechaPromesa || undefined,
        notas: construirNotas(),
        pagoInicial,
      });
      resetForm();
      cargar();
      setToastPedido(creado);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

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
      <h1>Punto de Venta</h1>

      <form onSubmit={crearPedido} className="pos-layout">
        <div className="pos-main">
          {/* Cliente */}
          <section className="pos-card">
            <h2 className="pos-card-title">Cliente</h2>
            {!nuevoCliente ? (
              <div className="field">
                <span className="field-label">Buscar cliente</span>
                <SearchSelect
                  items={clientes}
                  selected={clienteSeleccionado}
                  onSelect={(c) => setClienteId(String(c.id))}
                  getLabel={(c) => c.nombre}
                  getSubLabel={(c) => `${c.telefono}${ultimaVisita(c) ? ' · ' + ultimaVisita(c) : ''}`}
                  getKey={(c) => c.id}
                  placeholder="Buscar por nombre o teléfono..."
                  id="cliente-search"
                />
              </div>
            ) : (
              <div className="pos-form-row">
                <label className="field">
                  <span className="field-label">Nombre</span>
                  <input type="text" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} autoFocus />
                </label>
                <label className="field">
                  <span className="field-label">Teléfono</span>
                  <input type="tel" value={telefonoCliente} onChange={(e) => setTelefonoCliente(e.target.value)} />
                </label>
              </div>
            )}
            <button type="button" className="btn-secondary btn-sm" onClick={() => setNuevoCliente((v) => !v)}>
              <UserPlus size={15} /> {nuevoCliente ? 'Ya es cliente' : 'Cliente nuevo'}
            </button>
          </section>

          {/* Servicios */}
          <section className="pos-card">
            <h2 className="pos-card-title">Servicios</h2>
            <div className="pos-lineas">
              {items.map((item, idx) => {
                const servicio = servicioPorId.get(Number(item.servicioId));
                return (
                  <div className="pos-linea" key={idx}>
                    <div className="pos-linea-main">
                      <div className="pos-linea-servicio">
                        <span className="field-label">Servicio</span>
                        <SearchSelect
                          items={servicios}
                          selected={servicio ?? null}
                          onSelect={(s) => actualizarItem(idx, 'servicioId', String(s.id))}
                          getLabel={(s) => s.nombre}
                          getSubLabel={(s) => `Q${s.precio}${s.unidadCobro === 'peso' ? '/lb' : s.unidadCobro === 'pieza' ? '/pza' : ' fijo'}`}
                          getKey={(s) => s.id}
                          placeholder="Buscar servicio..."
                        />
                      </div>
                      {servicio && servicio.unidadCobro !== 'fijo' && (
                        <div className="pos-linea-cantidad">
                          <span className="field-label">Cantidad</span>
                          <div className="pos-qty-wrap">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.cantidad}
                              onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)}
                            />
                            <span className="pos-qty-unit">{unidadEtiqueta(servicio)}</span>
                          </div>
                        </div>
                      )}
                      <div className="pos-linea-precio">
                        <span className="field-label">Precio</span>
                        <span>{servicio ? `Q${servicio.precio}` : '—'}</span>
                      </div>
                      <div className="pos-linea-subtotal">
                        <span className="field-label">Subtotal</span>
                        <span>Q{subtotalItem(servicio, item.cantidad).toFixed(2)}</span>
                      </div>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => quitarItem(idx)}
                        disabled={items.length === 1}
                        aria-label="Eliminar línea"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {notaAbierta[idx] ? (
                      <input
                        type="text"
                        className="pos-linea-nota"
                        placeholder="Nota de esta prenda (ej. mancha en el cuello)"
                        value={itemNotas[idx] ?? ''}
                        onChange={(e) => setItemNotas((prev) => ({ ...prev, [idx]: e.target.value }))}
                        autoFocus
                      />
                    ) : (
                      <button type="button" className="link-btn pos-linea-nota-btn" onClick={() => setNotaAbierta((prev) => ({ ...prev, [idx]: true }))}>
                        + Agregar nota a esta prenda
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <button type="button" className="link-btn" onClick={agregarItem}>+ Agregar otro servicio</button>
          </section>

          {/* Entrega */}
          <section className="pos-card">
            <h2 className="pos-card-title">Entrega</h2>
            <div className="pos-chips">
              <button type="button" className={`chip ${!fechaManual && fechaPromesa === chipFecha('hoy18') ? 'chip--active' : ''}`} onClick={() => { setFechaPromesa(chipFecha('hoy18')); setFechaManual(false); }}>
                Hoy 6pm
              </button>
              <button type="button" className={`chip ${!fechaManual && fechaPromesa === chipFecha('manana10') ? 'chip--active' : ''}`} onClick={() => { setFechaPromesa(chipFecha('manana10')); setFechaManual(false); }}>
                Mañana 10am
              </button>
              <button type="button" className={`chip ${!fechaManual && fechaPromesa === chipFecha('en2dias') ? 'chip--active' : ''}`} onClick={() => { setFechaPromesa(chipFecha('en2dias')); setFechaManual(false); }}>
                En 2 días
              </button>
              <button type="button" className={`chip ${fechaManual ? 'chip--active' : ''}`} onClick={() => setFechaManual((v) => !v)}>
                Otra fecha
              </button>
            </div>
            {fechaManual && (
              <label className="field">
                <span className="field-label">Fecha y hora de entrega</span>
                <input type="datetime-local" value={fechaPromesa} onChange={(e) => setFechaPromesa(e.target.value)} />
              </label>
            )}
            <label className="field">
              <span className="field-label">Notas generales</span>
              <input type="text" placeholder="Manchas, daños, instrucciones" value={notas} onChange={(e) => setNotas(e.target.value)} />
            </label>
          </section>
        </div>

        {/* Resumen */}
        <aside className="pos-summary">
          <h2 className="pos-card-title">Resumen del pedido</h2>
          {items.some((it) => it.servicioId) ? (
            <ul className="pos-resumen-lineas">
              {items.filter((it) => it.servicioId).map((it, idx) => {
                const servicio = servicioPorId.get(Number(it.servicioId));
                return (
                  <li key={idx}>
                    <span>{servicio?.nombre}</span>
                    <span>Q{subtotalItem(servicio, it.cantidad).toFixed(2)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="section-muted">Agrega servicios para ver el resumen.</p>
          )}

          <div className="pos-resumen-total">
            <span>Total</span>
            <span>Q{totalPedido.toFixed(2)}</span>
          </div>

          <div className="pago-pills">
            <button type="button" className={`pago-pill ${tipoPago === 'total' ? 'pago-pill--active' : ''}`} onClick={() => setTipoPago('total')}>
              Pagado completo
            </button>
            <button type="button" className={`pago-pill ${tipoPago === 'anticipo' ? 'pago-pill--active' : ''}`} onClick={() => setTipoPago('anticipo')}>
              Anticipo
            </button>
            <button type="button" className={`pago-pill ${tipoPago === 'ninguno' ? 'pago-pill--active' : ''}`} onClick={() => setTipoPago('ninguno')}>
              Paga al entregar
            </button>
          </div>

          {tipoPago === 'anticipo' && (
            <>
              <label className="field">
                <span className="field-label">Monto del anticipo</span>
                <input type="number" step="0.01" min="0" value={montoAnticipo} onChange={(e) => setMontoAnticipo(e.target.value)} />
              </label>
              <p className="pos-saldo-restante">Saldo restante: <strong>Q{Math.max(0, totalPedido - (Number(montoAnticipo) || 0)).toFixed(2)}</strong></p>
            </>
          )}

          {tipoPago !== 'ninguno' && (
            <label className="field">
              <span className="field-label">Método de pago</span>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}>
                {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          )}

          <button type="submit" className="pos-confirm-btn" disabled={!pedidoValido || guardando}>
            {labelBoton}
          </button>
        </aside>
      </form>

      {error && <AlertCard>{error}</AlertCard>}
      {toastPedido && (
        <Toast>
          <div className="toast-content">
            <span>Pedido {folio(toastPedido.id)} creado.</span>
            <div className="toast-actions">
              <a href={`/ticket/${toastPedido.id}`} target="_blank" rel="noreferrer">Imprimir ticket</a>
              <a href={waLink(toastPedido.cliente.telefono, `Hola ${toastPedido.cliente.nombre}, tu pedido ${folio(toastPedido.id)} fue registrado en ISAI.`)} target="_blank" rel="noreferrer">
                Enviar por WhatsApp
              </a>
            </div>
          </div>
        </Toast>
      )}
      {toastMsg && <Toast>{toastMsg}</Toast>}

      <div className="pos-pedidos-header">
        <h2 className="pos-pedidos-title">Pedidos <span className="count-badge">{pedidosFiltrados.length}</span></h2>
      </div>

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
