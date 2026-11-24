import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || new PrismaClient();
// { log: ["query"] }

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Vérification au démarrage : le client Prisma généré doit connaître les
// colonnes du schéma actuel (ex. dimensions du colis). Sinon, les
// sauvegardes échouent avec « Invalid `prisma.produit.update()` » : il faut
// alors lancer « npx prisma generate » dans backend puis redémarrer.
// Cette vérification ne doit jamais empêcher le démarrage.
try {
  const champsProduit =
    Prisma.dmmf.datamodel.models
      .find(modele => modele.name === "produit")
      ?.fields.map(champ => champ.name) || [];
  const attendus = ["longueur_cm", "largeur_cm", "hauteur_cm"];
  const manquants = attendus.filter(champ => !champsProduit.includes(champ));
  if (manquants.length > 0) {
    console.error(
      `[Prisma] Client obsolète : colonnes manquantes (${manquants.join(", ")}). ` +
        "Lancez « npx prisma generate » dans backend puis redémarrez le serveur."
    );
  }
} catch {
  // DMMF indisponible : la vérification est ignorée.
}

export default prisma;
