import { Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, saldoPendiente } from '../api';
import type { Factura, Pedido } from '../api';
import AlertCard from '../components/AlertCard';

export default function Facturacion() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoId, setPedidoId] = useState('');
  const [error, setError] = useState('');

  function cargar() {
    api.facturacion.listar().then(setFacturas);
    api.pedidos.listar().then(setPedidos);
  }

  useEffect(cargar, []);

  const pedidosSinFactura = pedidos.filter((p) => !facturas.some((f) => f.pedidoId === p.id));
  const totalFacturado = facturas.reduce((acc, f) => acc + Number(f.total), 0);

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

      <div className="table-wrap">
        <table className="pos-table">
          <thead>
            <tr>
              <th>No. Factura</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th><th></th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((f) => {
              const saldo = saldoPendiente(f.pedido);
              return (
                <tr key={f.id}>
                  <td className="mono">{f.numeroFactura}</td>
                  <td>{f.pedido.cliente.nombre}</td>
                  <td>Q{f.total}</td>
                  <td>
                    {saldo > 0.001 ? <span className="badge-saldo">Q{saldo.toFixed(2)} pendiente</span> : <span className="badge-ok">Pagado</span>}
                  </td>
                  <td>{new Date(f.fechaEmision).toLocaleString()}</td>
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
              <td colSpan={2}>Total</td>
              <td className="servicio-precio-cell">Q{totalFacturado.toFixed(2)}</td>
              <td></td><td></td><td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
