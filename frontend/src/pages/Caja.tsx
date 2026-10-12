import { useEffect, useState } from 'react';
import { api } from '../api';
import type { CorteCaja } from '../api';

const ETIQUETA_METODO: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

export default function Caja() {
  const [corte, setCorte] = useState<CorteCaja | null>(null);

  useEffect(() => {
    api.caja.corte().then(setCorte);
  }, []);

  if (!corte) return <div>Cargando...</div>;

  const maxMonto = Math.max(1, ...corte.desglosePorMetodo.map((m) => m.monto));

  return (
    <div>
      <h1>Corte de caja — {corte.fecha}</h1>

      <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-value">Q{corte.totalCobrado.toFixed(2)}</span>
          <span className="kpi-label">Total cobrado hoy</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{corte.pedidosCreados}</span>
          <span className="kpi-label">Pedidos recibidos hoy</span>
        </div>
      </div>

      <h2>Desglose por método de pago</h2>
      {corte.desglosePorMetodo.length === 0 ? (
        <p className="section-muted">Todavía no se ha registrado ningún cobro hoy.</p>
      ) : (
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
      )}
    </div>
  );
}
