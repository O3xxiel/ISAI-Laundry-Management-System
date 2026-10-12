import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, saldoPendiente } from '../api';
import type { Pedido } from '../api';

export default function Ticket() {
  const { id } = useParams();
  const [pedido, setPedido] = useState<Pedido | null>(null);

  useEffect(() => {
    if (id) api.pedidos.obtener(Number(id)).then(setPedido);
  }, [id]);

  if (!pedido) return <div className="ticket-page">Cargando...</div>;

  const saldo = saldoPendiente(pedido);
  const folio = `#${String(pedido.id).padStart(6, '0')}`;

  return (
    <div className="ticket-page">
      <div className="ticket">
        <h1>ISAI</h1>
        <p className="ticket-sub">Sistema de Gestión para Lavandería</p>
        <p className="ticket-folio">Folio {folio}</p>

        <div className="ticket-rule" />

        <p><strong>Cliente:</strong> {pedido.cliente.nombre}</p>
        <p><strong>Teléfono:</strong> {pedido.cliente.telefono}</p>
        <p><strong>Recibido:</strong> {new Date(pedido.creadoEn).toLocaleString()}</p>
        {pedido.fechaPromesa && (
          <p><strong>Entrega prometida:</strong> {new Date(pedido.fechaPromesa).toLocaleString()}</p>
        )}

        <div className="ticket-rule" />

        <table className="ticket-items">
          <tbody>
            {pedido.items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.servicio.nombre}
                  {item.servicio.unidadCobro !== 'fijo' && (
                    <span className="ticket-muted"> ({item.cantidad}{item.servicio.unidadCobro === 'peso' ? ' lb' : ' pza'})</span>
                  )}
                </td>
                <td className="ticket-amount">Q{item.subtotal}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ticket-rule" />

        <p className="ticket-total"><span>Total</span><span>Q{pedido.total}</span></p>
        {pedido.pagos.map((pago) => (
          <p key={pago.id} className="ticket-line"><span>Pagado ({pago.metodo})</span><span>Q{pago.monto}</span></p>
        ))}
        <p className="ticket-line ticket-saldo"><span>Saldo pendiente</span><span>Q{saldo.toFixed(2)}</span></p>

        {pedido.notas && (
          <>
            <div className="ticket-rule" />
            <p className="ticket-muted"><strong>Notas:</strong> {pedido.notas}</p>
          </>
        )}

        <div className="ticket-rule" />
        <p className="ticket-footer">Conserve este ticket para reclamar su ropa.</p>
      </div>

      <button className="ticket-print-btn" onClick={() => window.print()}>Imprimir / Guardar como PDF</button>
    </div>
  );
}
