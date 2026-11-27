// Réparation du drift MySQL/Prisma constaté en phase 2 (27/11/2026).
//
// La base PTech_Boutique (restaurée depuis un dump) porte des index FK
// implicites que `prisma db push` veut normaliser ; MySQL refuse de dropper
// un index tant que la contrainte FK qui l'utilise existe
// (« Cannot drop index 'x_fkey': needed in a foreign key constraint »).
//
// Ce script DROP TOUTES les contraintes FOREIGN KEY existantes (DDL manuel,
// autorisé par les règles du projet — jamais de `prisma migrate`). Les
// contraintes sont ensuite recréées par `npx prisma db push`, conformément
// au schéma Prisma. Les données ne sont pas touchées : comptages de contrôle
// avant et après. Usage : node scripts/reparer-fk-drift.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const comptages = async () => {
  const lignes = await prisma.$queryRawUnsafe(`
    SELECT table_name, table_rows FROM information_schema.tables
    WHERE table_schema = DATABASE() ORDER BY table_name
  `);
  return lignes
    .map((l) => `${l.table_name}: ${Number(l.table_rows)}`)
    .join(", ");
};

const principal = async () => {
  const avant = await comptages();
  console.log("Comptages avant (approx. InnoDB) :", avant);

  const fks = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT TABLE_NAME, CONSTRAINT_NAME
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME, CONSTRAINT_NAME
  `);
  console.log(`FK à déposer : ${fks.length}`);
  for (const fk of fks) {
    const table = String(fk.TABLE_NAME);
    const contrainte = String(fk.CONSTRAINT_NAME);
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${contrainte}\``,
    );
    console.log(`  FK déposée : ${table}.${contrainte}`);
  }
  console.log("Comptages après :", await comptages());
  console.log("Terminé — lancer maintenant : npx prisma db push");
  await prisma.$disconnect();
};

principal().catch((erreur) => {
  console.error("ÉCHEC :", erreur.message);
  process.exit(1);
});
