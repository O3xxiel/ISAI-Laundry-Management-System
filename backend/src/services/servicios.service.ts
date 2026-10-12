import { prisma } from '../lib/prisma';

export function listarServicios() {
  return prisma.servicio.findMany({ orderBy: { nombre: 'asc' } });
}

export function crearServicio(data: { nombre: string; unidadCobro: string; precio: number }) {
  return prisma.servicio.create({ data });
}
