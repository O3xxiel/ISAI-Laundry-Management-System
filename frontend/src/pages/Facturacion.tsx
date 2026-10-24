import { Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, saldoPendiente } from '../api';
import type { Factura, Pedido } from '../api';
import AlertCard from '../components/AlertCard';
import Pagination from '../components/Pagination';

const POR_PAGINA = 15;

export default function Facturacion() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoId, setPedidoId] = useState('');
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  function cargar() {
    api.facturacion.listar().then(setFacturas);
    api.pedidos.listar().then(setPedidos);
  }

  useEffect(cargar, []);
  useEffect(() => setPagina(1), [desde, hasta]);

  const pedidosSinFactura = pedidos.filter((p) => !facturas.some((f) => f.pedidoId === p.id));
  const facturasFiltradas = facturas.filter((f) => {
    const fecha = f.fechaEmision.slice(0, 10);
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    return true;
  });
  const totalFacturado = facturasFiltradas
    .filter((f) => f.pedido.estado !== 'cancelado')
    .reduce((acc, f) => acc + Number(f.total), 0);
  const totalPaginas = Math.max(1, Math.ceil(facturasFiltradas.length / POR_PAGINA));
  const facturasPagina = facturasFiltradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  async function generarFactura(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.facturacion.generar(Number(pedidoId));
      setPedidoId('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h1>Facturación</h1>
      <p className="section-muted">
        Cada pedido genera su factura automáticamente al crearse — esta pantalla es el historial.
        El formulario de abajo solo aparece si hay algún pedido sin factura (por ejemplo, de antes de este cambio).
      </p>

      {pedidosSinFactura.length > 0 && (
        <form onSubmit={generarFactura} className="form-row">
          <select value={pedidoId} onChange={(e) => setPedidoId(e.target.value)} required>
            <option value="">Pedido sin factura...</option>
            {pedidosSinFactura.map((p) => (
              <option key={p.id} value={p.id}>#{p.id} — {p.cliente.nombre} — Q{p.total}</option>
            ))}
          </select>
          <button type="submit">Generar factura</button>
        </form>
      )}
      {error && <AlertCard>{error}</AlertCard>}

      <div className="fecha-rango" style={{ marginBottom: '1rem' }}>
        <label>
          Desde
          <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
        </label>
        {(desde || hasta) && (
          <button type="button" className="link-btn" onClick={() => { setDesde(''); setHasta(''); }}>
            Limpiar
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table className="pos-table">
          <thead>
            <tr>
              <th>No. Factura</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th><th></th>
            </tr>
          </thead>
          <tbody>
            {facturasPagina.map((f) => {
              const saldo = saldoPendiente(f.pedido);
              return (
                <tr key={f.id}>
                  <td className="mono" data-label="No. Factura">{f.numeroFactura}</td>
                  <td data-label="Cliente">{f.pedido.cliente.nombre}</td>
                  <td data-label="Total">Q{f.total}</td>
                  <td data-label="Estado">
                    {f.pedido.estado === 'cancelado' ? (
                      <span className="badge-anulada">Anulada</span>
                    ) : saldo > 0.001 ? (
                      <span className="badge-saldo">Q{saldo.toFixed(2)} pendiente</span>
                    ) : (
                      <span className="badge-ok">Pagado</span>
                    )}
                  </td>
                  <td data-label="Fecha">{new Date(f.fechaEmision).toLocaleString()}</td>
                  <td className="acciones-cell">
                    <a className="btn-secondary btn-sm" href={`/ticket/${f.pedidoId}`} target="_blank" rel="noreferrer">
                      <Printer size={14} /> Ver ticket
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} data-label="Total">Total</td>
              <td className="servicio-precio-cell" data-label="Monto">Q{totalFacturado.toFixed(2)}</td>
              <td className="pos-table-tfoot-spacer"></td><td className="pos-table-tfoot-spacer"></td><td className="pos-table-tfoot-spacer"></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
    </div>
  );
}
