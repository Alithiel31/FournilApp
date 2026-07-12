import type { NextFunction, Request, Response } from 'express';
import { validateSession } from '../auth/session.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: number; email: string; nom: string };
  }
}

/** Exige `Authorization: Bearer <token>` avec un token de session valide en base. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentification requise' });
    return;
  }

  const session = await validateSession(token);
  if (!session) {
    res.status(401).json({ error: 'Session invalide ou expirée' });
    return;
  }

  req.user = { id: session.user.id, email: session.user.email, nom: session.user.nom };
  next();
}
