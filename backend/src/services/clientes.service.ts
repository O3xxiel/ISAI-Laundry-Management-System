import { prisma } from '../lib/prisma';

export function listarClientes() {
  return prisma.cliente.findMany({ orderBy: { nombre: 'asc' } });
}

export function crearCliente(data: { nombre: string; telefono: string; correo?: string }) {
  return prisma.cliente.create({ data });
}

export function buscarClientes(q: string) {
  return prisma.cliente.findMany({
    where: {
      OR: [{ nombre: { contains: q, mode: 'insensitive' } }, { telefono: { contains: q } }],
    },
    orderBy: { nombre: 'asc' },
    take: 10,
  });
}
