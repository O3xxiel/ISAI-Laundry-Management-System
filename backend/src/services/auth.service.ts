import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

export async function validarCredenciales(usuario: string, contrasena: string) {
  const user = await prisma.usuario.findUnique({ where: { usuario } });
  if (!user || !user.activo) return null;

  const valido = await bcrypt.compare(contrasena, user.contrasenaHash);
  if (!valido) return null;

  return user;
}
