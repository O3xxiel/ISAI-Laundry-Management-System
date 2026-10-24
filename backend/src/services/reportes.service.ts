import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';
import { fechaISO, fechaLocal, listarCortesEntre } from './caja.service';

const COLOR_ENCABEZADO = 'FF1F5F99';
const FORMATO_MONEDA = '"Q"#,##0.00';
const FORMATO_FECHA_HORA = 'dd/mm/yyyy hh:mm';
const FORMATO_FECHA = 'dd/mm/yyyy';

type Tipo = 'texto' | 'moneda' | 'fecha' | 'fechaHora' | 'numero';
interface Columna {
  titulo: string;
  ancho: number;
  tipo?: Tipo;
}

const folio = (id: number) => `#${String(id).padStart(6, '0')}`;
const pagado = (pagos: { monto: unknown }[]) => pagos.reduce((acc, p) => acc + Number(p.monto), 0);

// ExcelJS escribe las fechas con sus componentes UTC; se desplaza para que la celda muestre
// la hora local (Guatemala) y no la de UTC.
function paraExcel(fecha: Date) {
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000);
}

function agregarHoja(libro: ExcelJS.Workbook, nombre: string, columnas: Columna[], filas: unknown[][]) {
  const hoja = libro.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1 }] });
  hoja.columns = columnas.map((c) => ({ header: c.titulo, width: c.ancho }));

  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ENCABEZADO } };
  encabezado.alignment = { vertical: 'middle' };
  encabezado.height = 20;

  for (const fila of filas) {
    hoja.addRow(fila.map((v) => (v instanceof Date ? paraExcel(v) : v)));
  }

  columnas.forEach((c, i) => {
    const columna = hoja.getColumn(i + 1);
    if (c.tipo === 'moneda') columna.numFmt = FORMATO_MONEDA;
    if (c.tipo === 'fecha') columna.numFmt = FORMATO_FECHA;
    if (c.tipo === 'fechaHora') columna.numFmt = FORMATO_FECHA_HORA;
  });

  if (filas.length > 0) {
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
  } else {
    hoja.addRow(['Sin registros en este periodo']).font = { italic: true, color: { argb: 'FF888888' } };
  }
  return hoja;
}

export async function generarReporte(desde?: string, hasta?: string) {
  const hoy = fechaISO(new Date());
  const d = desde || hasta || hoy;
  const h = hasta || desde || hoy;
  const inicio = fechaLocal(d);
  const fin = fechaLocal(h);
  fin.setDate(fin.getDate() + 1);
  const rango = { gte: inicio, lt: fin };

  const [pedidos, facturas, pagosPeriodo, cortes] = await Promise.all([
    prisma.pedido.findMany({
      where: { creadoEn: rango },
      include: { cliente: true, items: { include: { servicio: true } }, pagos: true, usuario: { select: { nombre: true } } },
      orderBy: { creadoEn: 'asc' },
    }),
    prisma.factura.findMany({
      where: { fechaEmision: rango },
      include: { pedido: { include: { cliente: true, pagos: true } } },
      orderBy: { fechaEmision: 'asc' },
    }),
    prisma.pago.findMany({ where: { fecha: rango } }),
    listarCortesEntre(d, h),
  ]);

  const libro = new ExcelJS.Workbook();
  libro.creator = 'ISAI Lavandería';
  libro.created = new Date();

  // ---- Resumen ----
  const activos = pedidos.filter((p) => p.estado !== 'cancelado');
  const cobradoPor = (metodo: string) =>
    pagosPeriodo.filter((p) => p.metodo === metodo).reduce((acc, p) => acc + Number(p.monto), 0);
  const resumen: [string, string | number, Tipo?][] = [
    ['Periodo', d === h ? d : `${d} al ${h}`],
    ['Pedidos registrados', activos.length, 'numero'],
    ['Pedidos cancelados', pedidos.length - activos.length, 'numero'],
    ['Ventas (sin cancelados)', activos.reduce((acc, p) => acc + Number(p.total), 0), 'moneda'],
    ['Saldo pendiente de esos pedidos', activos.reduce((acc, p) => acc + Number(p.total) - pagado(p.pagos), 0), 'moneda'],
    ['Cobrado en efectivo', cobradoPor('efectivo'), 'moneda'],
    ['Cobrado con tarjeta', cobradoPor('tarjeta'), 'moneda'],
    ['Cobrado por transferencia', cobradoPor('transferencia'), 'moneda'],
    ['Total cobrado', pagosPeriodo.reduce((acc, p) => acc + Number(p.monto), 0), 'moneda'],
    ['Retiros y gastos de caja', cortes.reduce((acc, c) => acc + c.totalRetiros, 0), 'moneda'],
    ['Facturas emitidas', facturas.length, 'numero'],
  ];
  const hojaResumen = libro.addWorksheet('Resumen');
  hojaResumen.columns = [{ width: 34 }, { width: 22 }];
  hojaResumen.addRow(['Reporte ISAI Lavandería']).font = { bold: true, size: 14 };
  hojaResumen.addRow([]);
  for (const [concepto, valor, tipo] of resumen) {
    const fila = hojaResumen.addRow([concepto, valor]);
    fila.getCell(1).font = { bold: true };
    if (tipo === 'moneda') fila.getCell(2).numFmt = FORMATO_MONEDA;
    fila.getCell(2).alignment = { horizontal: 'right' };
  }
  hojaResumen.addRow([]);
  hojaResumen.addRow(['El cobrado incluye anticipos y pagos de pedidos de otros días que se cobraron en este periodo.']).font = {
    italic: true,
    color: { argb: 'FF666666' },
  };

  // ---- Pedidos ----
  agregarHoja(
    libro,
    'Pedidos',
    [
      { titulo: 'Folio', ancho: 11 },
      { titulo: 'Fecha', ancho: 17, tipo: 'fechaHora' },
      { titulo: 'Cliente', ancho: 24 },
      { titulo: 'Teléfono', ancho: 13 },
      { titulo: 'Servicios', ancho: 42 },
      { titulo: 'Total', ancho: 12, tipo: 'moneda' },
      { titulo: 'Pagado', ancho: 12, tipo: 'moneda' },
      { titulo: 'Saldo', ancho: 12, tipo: 'moneda' },
      { titulo: 'Estado', ancho: 12 },
      { titulo: 'Entrega prometida', ancho: 17, tipo: 'fechaHora' },
      { titulo: 'Atendió', ancho: 18 },
      { titulo: 'Notas', ancho: 30 },
    ],
    pedidos.map((p) => {
      const cobrado = pagado(p.pagos);
      return [
        folio(p.id),
        p.creadoEn,
        p.cliente.nombre,
        p.cliente.telefono,
        p.items.map((i) => `${i.servicio.nombre} (${Number(i.cantidad)})`).join(', '),
        Number(p.total),
        cobrado,
        p.estado === 'cancelado' ? 0 : Number(p.total) - cobrado,
        p.estado,
        p.fechaPromesa,
        p.usuario?.nombre ?? '',
        p.notas ?? '',
      ];
    }),
  );

  // ---- Facturación ----
  agregarHoja(
    libro,
    'Facturación',
    [
      { titulo: 'No. factura', ancho: 13 },
      { titulo: 'Fecha de emisión', ancho: 17, tipo: 'fechaHora' },
      { titulo: 'Pedido', ancho: 11 },
      { titulo: 'Cliente', ancho: 24 },
      { titulo: 'Total', ancho: 12, tipo: 'moneda' },
      { titulo: 'Pagado', ancho: 12, tipo: 'moneda' },
      { titulo: 'Saldo', ancho: 12, tipo: 'moneda' },
      { titulo: 'Estado', ancho: 12 },
    ],
    facturas.map((f) => {
      const cobrado = pagado(f.pedido.pagos);
      const anulada = f.pedido.estado === 'cancelado';
      const saldo = anulada ? 0 : Number(f.total) - cobrado;
      return [
        f.numeroFactura,
        f.fechaEmision,
        folio(f.pedidoId),
        f.pedido.cliente.nombre,
        Number(f.total),
        cobrado,
        saldo,
        anulada ? 'Anulada' : saldo > 0.001 ? 'Pendiente' : 'Pagada',
      ];
    }),
  );

  // ---- Caja (un renglón por día) ----
  const monto = (c: (typeof cortes)[number], metodo: string) =>
    c.desglosePorMetodo.find((m) => m.metodo === metodo)?.monto ?? 0;
  agregarHoja(
    libro,
    'Caja',
    [
      { titulo: 'Fecha', ancho: 12, tipo: 'fecha' },
      { titulo: 'Responsable', ancho: 18 },
      { titulo: 'Estado', ancho: 10 },
      { titulo: 'Fondo inicial', ancho: 13, tipo: 'moneda' },
      { titulo: 'Efectivo', ancho: 12, tipo: 'moneda' },
      { titulo: 'Tarjeta', ancho: 12, tipo: 'moneda' },
      { titulo: 'Transferencia', ancho: 13, tipo: 'moneda' },
      { titulo: 'Total cobrado', ancho: 13, tipo: 'moneda' },
      { titulo: 'Retiros y gastos', ancho: 15, tipo: 'moneda' },
      { titulo: 'Efectivo esperado', ancho: 16, tipo: 'moneda' },
      { titulo: 'Conteo real', ancho: 12, tipo: 'moneda' },
      { titulo: 'Diferencia', ancho: 12, tipo: 'moneda' },
    ],
    cortes.map((c) => [
      fechaLocal(c.fecha),
      c.responsable,
      c.cerradoEn ? 'Cerrada' : 'Abierta',
      c.fondoInicial,
      monto(c, 'efectivo'),
      monto(c, 'tarjeta'),
      monto(c, 'transferencia'),
      c.totalCobrado,
      c.totalRetiros,
      c.efectivoEsperado,
      c.conteoReal,
      c.diferencia,
    ]),
  );

  // ---- Movimientos de caja (cobros, retiros y gastos) ----
  agregarHoja(
    libro,
    'Movimientos de caja',
    [
      { titulo: 'Fecha y hora', ancho: 17, tipo: 'fechaHora' },
      { titulo: 'Caja del día', ancho: 12, tipo: 'fecha' },
      { titulo: 'Tipo', ancho: 10 },
      { titulo: 'Concepto', ancho: 34 },
      { titulo: 'Monto', ancho: 12, tipo: 'moneda' },
      { titulo: 'Responsable', ancho: 18 },
    ],
    cortes.flatMap((c) =>
      c.movimientos.map((m) => [
        m.fecha,
        fechaLocal(c.fecha),
        m.tipo,
        m.concepto,
        m.monto,
        'responsable' in m ? (m.responsable ?? '') : '',
      ]),
    ),
  );

  const buffer = await libro.xlsx.writeBuffer();
  const nombreArchivo = d === h ? `ISAI-reporte-${d}.xlsx` : `ISAI-reporte-${d}_a_${h}.xlsx`;
  return { buffer, nombreArchivo };
}
