import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function executerMigration() {
  console.log("🚀 Démarrage de la migration des colis...");

  try {
    // 1. On récupère tous les colis existants dans la table mère
    const tousLesColis = await prisma.colis.findMany();
    console.log(`📦 ${tousLesColis.length} colis trouvés dans la base de données.`);

    let compteAjouts = 0;

    // 2. On boucle sur chaque colis pour créer son extension "Classique"
    for (const colisMere of tousLesColis) {
      
      // Sécurité : On vérifie si l'extension n'a pas déjà été créée
      const extensionExiste = await prisma.colis_classique.findUnique({
        where: { id_colis_class: colisMere.id_colis }
      });

      if (!extensionExiste) {
        // 3. On crée l'enregistrement dans la table fille
        await prisma.colis_classique.create({
          data: {
            id_colis_class:  colisMere.id_colis,
            date_achat:      colisMere.date_achat,
            droits_timbre:   colisMere.droits_timbre,
            frais_bancaires: 0 // Valeur par défaut pour l'historique
          }
        });
        compteAjouts++;
      }
    }

    console.log(`✅ Migration terminée avec succès !`);
    console.log(`➡️ ${compteAjouts} nouvelles lignes créées dans 'colis_classique'.`);

  } catch (erreur) {
    console.error("❌ Une erreur critique est survenue pendant la migration :", erreur);
  } finally {
    // On ferme proprement la connexion à la BDD
    await prisma.$disconnect();
  }
}

// Lancement du script
executerMigration();