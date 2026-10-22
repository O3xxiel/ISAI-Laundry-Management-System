const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export type UnidadCobro = 'peso' | 'pieza' | 'fijo';
export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  correo: string | null;
}

export interface Servicio {
  id: number;
  nombre: string;
  unidadCobro: UnidadCobro;
  precio: string;
  activo: boolean;
}

export interface PedidoItem {
  id: number;
  servicioId: number;
  cantidad: string;
  subtotal: string;
  servicio: Servicio;
}

export interface Pago {
  id: number;
  monto: string;
  metodo: MetodoPago;
  fecha: string;
}

export interface Pedido {
  id: number;
  clienteId: number;
  total: string;
  estado: string;
  fechaPromesa: string | null;
  notas: string | null;
  creadoEn: string;
  cliente: Cliente;
  items: PedidoItem[];
  pagos: Pago[];
}

export type MotivoMovimiento = 'Compra' | 'Ajuste por conteo' | 'Devolución' | 'Consumo' | 'Merma o desperdicio';

export interface Insumo {
  id: number;
  nombre: string;
  cantidadActual: string;
  unidad: string;
  stockMinimo: string;
  diasRestantes: number | null;
}

export interface MovimientoHistorial {
  id: number;
  tipo: 'entrada' | 'salida';
  motivo: string;
  nota: string | null;
  cantidad: string;
  fecha: string;
  saldoResultante: number;
  usuario: { id: number; nombre: string } | null;
}

export interface Factura {
  id: number;
  pedidoId: number;
  numeroFactura: string;
  total: string;
  fechaEmision: string;
  pedido: Pedido;
}

export interface Usuario {
  id: number;
  usuario: string;
  rol: string;
}

export interface Empleado {
  id: number;
  nombre: string;
  usuario: string;
  rol: string;
  activo: boolean;
}

export interface Kpis {
  ventasHoy: number;
  cobradoHoy: number;
  cobradoPorMetodo: { metodo: MetodoPago; monto: number }[];
  pedidosRecibidosHoy: number;
  pedidosPorEntregarHoy: number;
  saldoPendienteTotal: number;
  periodo: { desde: string; hasta: string };
  insumosBajos: number;
  detalleInsumosBajos: Insumo[];
  ordenesPorEstado: { estado: string; cantidad: number }[];
  tendenciaVentas: { fecha: string; ventas: number }[];
  ventasPorServicio: { servicio: string; monto: number }[];
  ventasPorHora: { hora: number; monto: number }[];
  consumoInsumos: { insumo: string; cantidad: number }[];
  alertas: {
    atrasados: { id: number; cliente: string; telefono: string; fechaPromesa: string; estado: string }[];
    listosSinRecoger: { id: number; cliente: string; telefono: string; diasEsperando: number }[];
    clientesConSaldo: { cliente: string; telefono: string; saldo: number; diasAntiguedad: number }[];
  };
}

export interface MovimientoCorteCaja {
  tipo: 'cobro' | 'retiro' | 'gasto';
  concepto: string;
  monto: number;
  fecha: string;
  responsable?: string;
}

export interface CorteCaja {
  id: number;
  fecha: string;
  fondoInicial: number;
  responsable: string;
  abiertoEn: string;
  cerradoEn: string | null;
  conteoReal: number | null;
  diferencia: number | null;
  pedidosCreados: number;
  totalCobrado: number;
  cobradoEfectivo: number;
  totalRetiros: number;
  efectivoEsperado: number;
  desglosePorMetodo: { metodo: MetodoPago; monto: number }[];
  movimientos: MovimientoCorteCaja[];
}

export interface CorteCajaResumen {
  id: number;
  fecha: string;
  responsable: string;
  totalCobrado: number;
  diferencia: number | null;
}

export function saldoPendiente(pedido: Pedido): number {
  const pagado = pedido.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
  return Number(pedido.total) - pagado;
}

export const api = {
  auth: {
    login: (data: { usuario: string; contrasena: string }) =>
      request<Usuario>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
    me: () => request<Usuario>('/api/auth/me'),
  },
  clientes: {
    listar: () => request<Cliente[]>('/api/clientes'),
    buscar: (q: string) => request<Cliente[]>(`/api/clientes/buscar?q=${encodeURIComponent(q)}`),
    crear: (data: { nombre: string; telefono: string; correo?: string }) =>
      request<Cliente>('/api/clientes', { method: 'POST', body: JSON.stringify(data) }),
  },
  servicios: {
    listar: (incluirInactivos = false) =>
      request<Servicio[]>(`/api/servicios${incluirInactivos ? '?incluirInactivos=1' : ''}`),
    crear: (data: { nombre: string; unidadCobro: UnidadCobro; precio: number }) =>
      request<Servicio>('/api/servicios', { method: 'POST', body: JSON.stringify(data) }),
    actualizar: (id: number, data: { nombre?: string; unidadCobro?: UnidadCobro; precio?: number }) =>
      request<Servicio>(`/api/servicios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    cambiarEstado: (id: number, activo: boolean) =>
      request<Servicio>(`/api/servicios/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) }),
  },
  pedidos: {
    listar: () => request<Pedido[]>('/api/pedidos'),
    buscar: (q: string) => request<Pedido[]>(`/api/pedidos/buscar?q=${encodeURIComponent(q)}`),
    obtener: (id: number) => request<Pedido>(`/api/pedidos/${id}`),
    crear: (data: {
      clienteId: number;
      items: { servicioId: number; cantidad: number }[];
      fechaPromesa?: string;
      notas?: string;
      pagoInicial?: { monto: number; metodo: MetodoPago };
    }) => request<Pedido>('/api/pedidos', { method: 'POST', body: JSON.stringify(data) }),
    actualizarEstado: (id: number, estado: string) =>
      request<Pedido>(`/api/pedidos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }),
    pagar: (id: number, data: { monto: number; metodo: MetodoPago }) =>
      request<Pedido>(`/api/pedidos/${id}/pagos`, { method: 'POST', body: JSON.stringify(data) }),
  },
  inventario: {
    listar: () => request<Insumo[]>('/api/inventario'),
    crear: (data: { nombre: string; unidad: string; cantidadActual: number; stockMinimo: number }) =>
      request<Insumo>('/api/inventario', { method: 'POST', body: JSON.stringify(data) }),
    registrarMovimiento: (data: {
      insumoId: number;
      tipo: 'entrada' | 'salida';
      cantidad: number;
      motivo: MotivoMovimiento;
      nota?: string;
    }) => request<void>('/api/inventario/movimientos', { method: 'POST', body: JSON.stringify(data) }),
    historial: (insumoId: number) => request<MovimientoHistorial[]>(`/api/inventario/${insumoId}/historial`),
    conteo: (conteos: { insumoId: number; cantidadReal: number; nota?: string }[]) =>
      request<Insumo[]>('/api/inventario/conteo', { method: 'POST', body: JSON.stringify({ conteos }) }),
  },
  facturacion: {
    listar: () => request<Factura[]>('/api/facturacion'),
    generar: (pedidoId: number) =>
      request<Factura>('/api/facturacion', { method: 'POST', body: JSON.stringify({ pedidoId }) }),
  },
  dashboard: {
    obtener: (desde?: string, hasta?: string) => {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const qs = params.toString();
      return request<Kpis>(`/api/dashboard${qs ? `?${qs}` : ''}`);
    },
  },
  caja: {
    corte: (fecha?: string) => request<CorteCaja | null>(`/api/caja/corte${fecha ? `?fecha=${fecha}` : ''}`),
    abrir: (fondoInicial: number) =>
      request<CorteCaja>('/api/caja/abrir', { method: 'POST', body: JSON.stringify({ fondoInicial }) }),
    registrarMovimiento: (corteId: number, data: { tipo: 'retiro' | 'gasto'; concepto: string; monto: number }) =>
      request<CorteCaja>(`/api/caja/${corteId}/movimientos`, { method: 'POST', body: JSON.stringify(data) }),
    cerrar: (corteId: number, conteoReal: number) =>
      request<CorteCaja>(`/api/caja/${corteId}/cerrar`, { method: 'POST', body: JSON.stringify({ conteoReal }) }),
    historial: () => request<CorteCajaResumen[]>('/api/caja/historial'),
  },
  usuarios: {
    listar: () => request<Empleado[]>('/api/usuarios'),
    crear: (data: { nombre: string; usuario: string; contrasena: string; rol: string }) =>
      request<Empleado>('/api/usuarios', { method: 'POST', body: JSON.stringify(data) }),
    actualizar: (id: number, data: { nombre?: string; rol?: string; contrasena?: string }) =>
      request<Empleado>(`/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    cambiarEstado: (id: number, activo: boolean) =>
      request<Empleado>(`/api/usuarios/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) }),
  },
};
