/**
 * Provisionne (ou met à jour le mot de passe d') un utilisateur.
 * Usage : npm run create-user -- "email@example.com" "motdepasse" "Nom Prénom"
 */
import { hashPassword } from '../auth/password.js';
import { prisma } from '../db.js';

async function main() {
  const [, , email, password, nom] = process.argv;

  if (!email || !password || !nom) {
    console.error('Usage: npm run create-user -- "<email>" "<password>" "<nom>"');
    process.exitCode = 1;
    return;
  }
  if (password.length < 12) {
    console.error('Mot de passe trop court (12 caractères minimum).');
    process.exitCode = 1;
    return;
  }

  const hash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash, nom },
    create: { email, password: hash, nom },
  });

  console.log(`Utilisateur prêt : ${user.email} (id ${user.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
