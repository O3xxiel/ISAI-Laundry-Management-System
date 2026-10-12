import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const usuario = process.env.SEED_ADMIN_USER ?? 'admin';
  const contrasena = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';

  await prisma.usuario.upsert({
    where: { usuario },
    update: {},
    create: {
      nombre: 'Administrador',
      usuario,
      contrasenaHash: await bcrypt.hash(contrasena, 10),
      rol: 'admin',
    },
  });

  console.log(`Usuario "${usuario}" listo (contraseña: "${contrasena}" si fue creado ahora).`);
}

main().finally(() => prisma.$disconnect());
