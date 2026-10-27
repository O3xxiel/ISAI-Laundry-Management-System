import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import * as usuariosService from '../services/usuarios.service';

const ROLES_VALIDOS = ['admin', 'empleado'];

export async function listar(_req: Request, res: Response) {
  res.json(await usuariosService.listarUsuarios());
}

export async function crear(req: Request, res: Response) {
  const { nombre, usuario, contrasena, rol } = req.body;
  if (!nombre || !usuario || !contrasena || !ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ error: 'nombre, usuario, contrasena y rol (admin/empleado) son requeridos' });
  }
  if (await prisma.usuario.findUnique({ where: { usuario } })) {
    return res.status(400).json({ error: `Ya existe un empleado con el usuario "${usuario}".` });
  }
  res.status(201).json(await usuariosService.crearUsuario({ nombre, usuario, contrasena, rol }));
}

export async function actualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { nombre, rol, contrasena } = req.body;
  if (rol !== undefined && !ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ error: 'rol debe ser admin o empleado' });
  }
  res.json(await usuariosService.actualizarUsuario(id, { nombre, rol, contrasena }));
}

export async function cambiarEstado(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { activo } = req.body;
  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'activo (boolean) es requerido' });
  }
  if (id === req.usuario!.id) {
    return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta.' });
  }
  res.json(await usuariosService.cambiarEstadoUsuario(id, activo));
}
