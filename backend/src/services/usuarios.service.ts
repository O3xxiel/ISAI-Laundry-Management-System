import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

const SELECCION_PUBLICA = { id: true, nombre: true, usuario: true, rol: true, activo: true } as const;

export function listarUsuarios() {
  return prisma.usuario.findMany({ select: SELECCION_PUBLICA, orderBy: { nombre: 'asc' } });
}

export async function crearUsuario(data: { nombre: string; usuario: string; contrasena: string; rol: string }) {
  const contrasenaHash = await bcrypt.hash(data.contrasena, 10);
  return prisma.usuario.create({
    data: { nombre: data.nombre, usuario: data.usuario, contrasenaHash, rol: data.rol },
    select: SELECCION_PUBLICA,
  });
}

export async function actualizarUsuario(
  id: number,
  data: { nombre?: string; rol?: string; contrasena?: string },
) {
  const cambios: { nombre?: string; rol?: string; contrasenaHash?: string } = {
    nombre: data.nombre,
    rol: data.rol,
  };
  if (data.contrasena) {
    cambios.contrasenaHash = await bcrypt.hash(data.contrasena, 10);
  }
  return prisma.usuario.update({ where: { id }, data: cambios, select: SELECCION_PUBLICA });
}

export function cambiarEstadoUsuario(id: number, activo: boolean) {
  return prisma.usuario.update({ where: { id }, data: { activo }, select: SELECCION_PUBLICA });
}
