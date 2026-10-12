import { Request, Response } from 'express';
import { COOKIE_NAME, COOKIE_OPTIONS, firmarToken } from '../lib/auth';
import * as authService from '../services/auth.service';

export async function login(req: Request, res: Response) {
  const { usuario, contrasena } = req.body;
  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'usuario y contrasena son requeridos' });
  }

  const user = await authService.validarCredenciales(usuario, contrasena);
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const token = firmarToken({ id: user.id, usuario: user.usuario, rol: user.rol });
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  res.json({ id: user.id, nombre: user.nombre, usuario: user.usuario, rol: user.rol });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  res.json(req.usuario);
}
