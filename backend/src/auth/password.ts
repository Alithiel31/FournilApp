import argon2 from 'argon2';

/** Hash argon2id (paramètres par défaut de la lib, déjà raisonnables en 2026). */
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
