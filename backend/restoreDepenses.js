import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreSoftDeletedDepenses() {
  console.log("⏳ Début de la recherche des dépenses annulées...");

  try {
    // 1. Trouver toutes les dépenses qui sont actuellement annulées
    const depensesAnnulees = await prisma.depense.findMany({
      where: { isAnnule: true }
    });

    if (depensesAnnulees.length === 0) {
      console.log("✅ Aucune dépense annulée n'a été trouvée dans la base de données.");
      return;
    }

    console.log(`⚠️ ${depensesAnnulees.length} dépense(s) trouvée(s). Début de la restauration...`);

    // 2. Utiliser une transaction pour garantir que tout se passe bien financièrement
    await prisma.$transaction(async (tx) => {
      for (const depense of depensesAnnulees) {
        
        // A. On re-déduit le montant du solde du compte (puisqu'on l'avait remboursé lors de l'annulation)
        await tx.compte.update({
          where: { id_cpt: depense.cpt_id },
          data: {
            solde_actuel: {
              decrement: depense.mnt_dep
            }
          }
        });

        // B. On réactive la dépense (isAnnule = false)
        await tx.depense.update({
          where: { id_op_dep: depense.id_op_dep },
          data: { isAnnule: false }
        });

        console.log(`✔️ Dépense ID ${depense.id_op_dep} (Montant: ${depense.mnt_dep}) restaurée avec succès.`);
      }
    });

    console.log("🎉 Restauration terminée à 100%. Les soldes de vos comptes ont été mis à jour.");

  } catch (error) {
    console.error("❌ Erreur critique lors de la restauration :", error);
  } finally {
    // Fermer la connexion Prisma proprement
    await prisma.$disconnect();
  }
}

// Lancer la fonction
restoreSoftDeletedDepenses();