import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Inbox,
  Package,
  Plus,
  Receipt,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import AlertCard from '../components/AlertCard';
import type { Kpis } from '../api';
import { folio, waLink } from '../utils';

const ETIQUETA_METODO: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

const ETIQUETA_ESTADO: Record<string, string> = {
  recibido: 'Recibido',
  'en proceso': 'En proceso',
  listo: 'Listo',
};

const COLORES_METODO = ['var(--primary)', 'var(--aqua)', 'var(--warning)'];
const COLORES_ESTADO = ['var(--aqua)', 'var(--primary)', 'var(--primary)'];

// ---------- Gráficas (SVG hecho a mano, sin librería) ----------

function VentasChart({ data }: { data: { fecha: string; ventas: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.ventas));
  const promedio = data.reduce((acc, d) => acc + d.ventas, 0) / data.length;
  const w = 640;
  const h = 200;
  const padBottom = 28;
  const padTop = 26;
  // Con un rango de fechas amplio hay muchas barras; menos separación y sin texto fijo
  // (que se amontonaría), el detalle de cada barra sigue disponible al pasar el mouse.
  const denso = data.length > 14;
  const gap = data.length > 40 ? 1 : denso ? 3 : 14;
  const barWidth = (w - gap * (data.length - 1)) / data.length;
  const scale = (v: number) => ((h - padBottom - padTop) * v) / max;
  const avgY = h - padBottom - scale(promedio);

  return (
    <div className="chart-tooltip-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Ventas de los últimos 7 días" className="chart-svg">
        <line x1={0} y1={avgY} x2={w} y2={avgY} className="chart-avg-line" />
        {data.map((d, i) => {
          const barH = Math.max(scale(d.ventas), d.ventas > 0 ? 3 : 0);
          const x = i * (barWidth + gap);
          const y = h - padBottom - barH;
          const esHoy = i === data.length - 1;
          const dia = new Date(`${d.fecha}T00:00:00`).toLocaleDateString('es-GT', { weekday: 'short' });
          return (
            <g
              key={d.fecha}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect x={x} y={y - 12} width={barWidth} height={barH + 12} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={4}
                className="chart-bar"
                opacity={esHoy ? 1 : 0.55}
              />
              {!denso && (
                <>
                  <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="chart-value-label">
                    {d.ventas > 0 ? Math.round(d.ventas) : ''}
                  </text>
                  <text x={x + barWidth / 2} y={h - 10} textAnchor="middle" className="chart-axis-label">
                    {dia}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div
          className="chart-tooltip"
          style={{
            left: `${((hover * (barWidth + gap) + barWidth / 2) / w) * 100}%`,
            top: `${((h - padBottom - Math.max(scale(data[hover].ventas), 3)) / h) * 100}%`,
          }}
        >
          {new Date(`${data[hover].fecha}T00:00:00`).toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'short' })}
          {' — Q'}{data[hover].ventas.toFixed(2)}
        </div>
      )}
    </div>
  );
}

function EstadoChart({ data }: { data: { estado: string; cantidad: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.cantidad));

  return (
    <div className="barra-h-list chart-tooltip-wrap">
      {data.map((d, i) => (
        <div
          key={d.estado}
          className="barra-h-row"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          <span className="barra-h-label">{ETIQUETA_ESTADO[d.estado] ?? d.estado}</span>
          <div className="barra-h-track">
            <div
              className="barra-h-fill"
              style={{ width: `${(d.cantidad / max) * 100}%`, background: COLORES_ESTADO[i % COLORES_ESTADO.length] }}
            />
          </div>
          <span className="barra-h-value">{d.cantidad}</span>
        </div>
      ))}
      {hover != null && (
        <div className="chart-tooltip" style={{ left: '50%', top: `${(hover / data.length) * 100}%` }}>
          {ETIQUETA_ESTADO[data[hover].estado] ?? data[hover].estado} — {data[hover].cantidad} orden{data[hover].cantidad === 1 ? '' : 'es'}
        </div>
      )}
    </div>
  );
}

function HorasChart({ data }: { data: { hora: number; monto: number }[] }) {
  const activas = data.filter((d) => d.hora >= 6 && d.hora <= 21);
  const max = Math.max(1, ...activas.map((d) => d.monto));
  const w = 640;
  const h = 160;
  const padBottom = 22;
  const padTop = 10;
  const gap = 4;
  const barWidth = (w - gap * (activas.length - 1)) / activas.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Ventas por hora del día, últimos 7 días" className="chart-svg">
      {activas.map((d, i) => {
        const barH = Math.max(((h - padBottom - padTop) * d.monto) / max, d.monto > 0 ? 2 : 0);
        const x = i * (barWidth + gap);
        const y = h - padBottom - barH;
        return (
          <g key={d.hora}>
            <rect x={x} y={y} width={barWidth} height={barH} rx={2} className="chart-bar">
              <title>{`${d.hora}:00 — Q${d.monto.toFixed(2)}`}</title>
            </rect>
            {d.hora % 3 === 0 && (
              <text x={x + barWidth / 2} y={h - 8} textAnchor="middle" className="chart-axis-label">
                {d.hora}h
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function BarraHorizontal({ label, valor, max, formato }: { label: string; valor: number; max: number; formato: (v: number) => string }) {
  return (
    <div className="barra-h-row">
      <span className="barra-h-label">{label}</span>
      <div className="barra-h-track">
        <div className="barra-h-fill" style={{ width: `${max > 0 ? (valor / max) * 100 : 0}%` }} />
      </div>
      <span className="barra-h-value">{formato(valor)}</span>
    </div>
  );
}

function Donut({ data }: { data: { metodo: string; monto: number }[] }) {
  const total = data.reduce((acc, d) => acc + d.monto, 0);
  const r = 52;
  const cx = 64;
  const cy = 64;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  if (total <= 0) {
    return <p className="section-muted">Todavía no se ha cobrado nada en este periodo.</p>;
  }

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 128 128" role="img" aria-label="Ventas por método de pago" width={128} height={128}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={20} />
        {data.map((d, i) => {
          const frac = d.monto / total;
          const dash = frac * circumference;
          const circle = (
            <circle
              key={d.metodo}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={COLORES_METODO[i % COLORES_METODO.length]}
              strokeWidth={20}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            >
              <title>{`${ETIQUETA_METODO[d.metodo] ?? d.metodo}: Q${d.monto.toFixed(2)}`}</title>
            </circle>
          );
          offset += dash;
          return circle;
        })}
      </svg>
      <ul className="donut-legend">
        {data.map((d, i) => (
          <li key={d.metodo}>
            <span className="donut-swatch" style={{ background: COLORES_METODO[i % COLORES_METODO.length] }} />
            {ETIQUETA_METODO[d.metodo] ?? d.metodo} — Q{d.monto.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ texto }: { texto: string }) {
  return (
    <p className="empty-state">
      <CheckCircle2 size={18} strokeWidth={1.75} /> {texto}
    </p>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="dashboard-header">
        <h1>Dashboard</h1>
      </div>
      <div className="kpi-row">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-kpi" />
        ))}
      </div>
      <div className="alertas-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}

function formatoFechaCorta(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' });
}

export default function Dashboard() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState('');

  async function exportarExcel() {
    setExportando(true);
    setErrorExport('');
    try {
      await api.reportes.descargarExcel(desde || undefined, hasta || undefined);
    } catch (err) {
      setErrorExport((err as Error).message);
    } finally {
      setExportando(false);
    }
  }

  useEffect(() => {
    api.dashboard.obtener(desde || undefined, hasta || undefined).then(setKpis);
  }, [desde, hasta]);

  if (!kpis) return <DashboardSkeleton />;

  const filtroActivo = Boolean(desde || hasta);
  const maxServicio = Math.max(1, ...kpis.ventasPorServicio.map((s) => s.monto));
  const maxConsumo = Math.max(1, ...kpis.consumoInsumos.map((s) => s.cantidad));

  return (
    <div>
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="dashboard-header-actions">
          <div className="fecha-rango">
            <label>
              Desde
              <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
            </label>
            {filtroActivo && (
              <button type="button" className="link-btn" onClick={() => { setDesde(''); setHasta(''); }}>
                Limpiar
              </button>
            )}
          </div>
          <button type="button" className="btn-secondary" onClick={exportarExcel} disabled={exportando}>
            <FileSpreadsheet size={16} strokeWidth={2} /> {exportando ? 'Generando…' : 'Exportar Excel'}
          </button>
          <a className="btn-primary" href="/pos">
            <Plus size={16} strokeWidth={2} /> Nueva orden
          </a>
        </div>
      </div>

      {errorExport && <AlertCard>{errorExport}</AlertCard>}

      <p className="section-muted">
        {filtroActivo
          ? `Mostrando del ${formatoFechaCorta(kpis.periodo.desde)} al ${formatoFechaCorta(kpis.periodo.hasta)}`
          : 'Mostrando hoy'}
      </p>

      {/* Cómo voy hoy */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon"><Wallet size={22} strokeWidth={1.6} /></span>
          </div>
          <span className="kpi-label">Cobrado</span>
          <span className="kpi-value">Q{kpis.cobradoHoy.toFixed(2)}</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon"><Inbox size={22} strokeWidth={1.6} /></span>
          </div>
          <span className="kpi-label">Órdenes recibidas</span>
          <span className="kpi-value">{kpis.pedidosRecibidosHoy}</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon"><Package size={22} strokeWidth={1.6} /></span>
          </div>
          <span className="kpi-label">Por entregar hoy</span>
          <span className="kpi-value">{kpis.pedidosPorEntregarHoy}</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon"><Receipt size={22} strokeWidth={1.6} /></span>
          </div>
          <span className="kpi-label">Saldo pendiente</span>
          <span className="kpi-value">Q{kpis.saldoPendienteTotal.toFixed(2)}</span>
          <span className="kpi-sub">de {kpis.alertas.clientesConSaldo.length} cliente{kpis.alertas.clientesConSaldo.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Qué tengo pendiente / qué me está costando */}
      <h2>Alertas</h2>
      <div className="alertas-grid">
        <div className="alert-card alert-card--danger">
          <div className="alert-card-head">
            <span className="alert-icon"><Clock size={16} strokeWidth={1.9} /></span>
            <h3>Órdenes atrasadas</h3>
            <span className="alert-count">{kpis.alertas.atrasados.length}</span>
          </div>
          {kpis.alertas.atrasados.length === 0 ? (
            <EmptyState texto="Todo al día" />
          ) : (
            <ul className="alert-list">
              {kpis.alertas.atrasados.map((a) => (
                <li key={a.id}>
                  <div className="alert-item-main">
                    <div className="alert-item-title"><strong>{folio(a.id)}</strong> — {a.cliente}</div>
                    <a className="alert-item-action" href={`/ticket/${a.id}`} target="_blank" rel="noreferrer">Ver orden</a>
                  </div>
                  <div className="alert-meta">{a.telefono} · prometida {new Date(a.fechaPromesa).toLocaleDateString()} · {a.estado}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="alert-card alert-card--warning">
          <div className="alert-card-head">
            <span className="alert-icon"><Package size={16} strokeWidth={1.9} /></span>
            <h3>Listas sin recoger</h3>
            <span className="alert-count">{kpis.alertas.listosSinRecoger.length}</span>
          </div>
          {kpis.alertas.listosSinRecoger.length === 0 ? (
            <EmptyState texto="Todo al día" />
          ) : (
            <ul className="alert-list">
              {kpis.alertas.listosSinRecoger.map((a) => (
                <li key={a.id}>
                  <div className="alert-item-main">
                    <div className="alert-item-title"><strong>{folio(a.id)}</strong> — {a.cliente}</div>
                    <a
                      className="alert-item-action"
                      href={waLink(a.telefono, `Hola ${a.cliente}, tu ropa ya está lista para recoger en ISAI. Folio ${folio(a.id)}.`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Avisar por WhatsApp
                    </a>
                  </div>
                  <div className="alert-meta">{a.telefono} · esperando {a.diasEsperando} día{a.diasEsperando === 1 ? '' : 's'}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="alert-card alert-card--primary">
          <div className="alert-card-head">
            <span className="alert-icon"><Wallet size={16} strokeWidth={1.9} /></span>
            <h3>Clientes con saldo pendiente</h3>
            <span className="alert-count">{kpis.alertas.clientesConSaldo.length}</span>
          </div>
          {kpis.alertas.clientesConSaldo.length === 0 ? (
            <EmptyState texto="Todo al día" />
          ) : (
            <ul className="alert-list">
              {kpis.alertas.clientesConSaldo.map((c) => (
                <li key={c.cliente}>
                  <div className="alert-item-main">
                    <div className="alert-item-title"><strong>Q{c.saldo.toFixed(2)}</strong> — {c.cliente}</div>
                    <a className="alert-item-action" href="/pedidos">Cobrar</a>
                  </div>
                  <div className="alert-meta">
                    {c.telefono} · desde hace{' '}
                    <span className={c.diasAntiguedad >= 3 ? 'text-warning' : ''}>
                      {c.diasAntiguedad} día{c.diasAntiguedad === 1 ? '' : 's'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="alert-card alert-card--danger">
          <div className="alert-card-head">
            <span className="alert-icon"><AlertTriangle size={16} strokeWidth={1.9} /></span>
            <h3>Insumos bajo mínimo</h3>
            <span className="alert-count">{kpis.detalleInsumosBajos.length}</span>
          </div>
          {kpis.detalleInsumosBajos.length === 0 ? (
            <EmptyState texto="Todo al día" />
          ) : (
            <ul className="alert-list">
              {kpis.detalleInsumosBajos.map((i) => {
                const pct = Math.min(100, (Number(i.cantidadActual) / Number(i.stockMinimo)) * 100);
                return (
                  <li key={i.id}>
                    <div className="alert-item-main">
                      <div className="alert-item-title"><strong>{i.nombre}</strong></div>
                    </div>
                    <div className="alert-meta">{i.cantidadActual} {i.unidad} disponibles · mínimo {i.stockMinimo} {i.unidad}</div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Tendencia, para revisar cada semana */}
      <h2>Tendencia</h2>
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Ventas</h3>
          <VentasChart data={kpis.tendenciaVentas} />
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Órdenes por estado (backlog actual)</h3>
          <EstadoChart data={kpis.ordenesPorEstado} />
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Ventas por servicio</h3>
          <div className="barra-h-list">
            {kpis.ventasPorServicio.slice(0, 6).map((s) => (
              <BarraHorizontal key={s.servicio} label={s.servicio} valor={s.monto} max={maxServicio} formato={(v) => `Q${v.toFixed(0)}`} />
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Ventas por hora</h3>
          <HorasChart data={kpis.ventasPorHora} />
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Cobrado por método de pago</h3>
          <Donut data={kpis.cobradoPorMetodo} />
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Consumo de insumos</h3>
          {kpis.consumoInsumos.length === 0 ? (
            <p className="section-muted">Sin salidas de inventario en este periodo.</p>
          ) : (
            <div className="barra-h-list">
              {kpis.consumoInsumos.map((c) => (
                <BarraHorizontal key={c.insumo} label={c.insumo} valor={c.cantidad} max={maxConsumo} formato={(v) => v.toFixed(1)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
