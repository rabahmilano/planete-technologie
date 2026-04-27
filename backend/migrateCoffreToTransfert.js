import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateCoffreToTransfert() {
  console.log("⏳ Début de la recherche des dépenses 'coffre'...");

  try {
    const depensesCoffre = await prisma.depense.findMany({
      where: {
        nat_dep_id: 4,
      },
      orderBy: {
        id_op_dep: "asc",
      },
    });

    if (depensesCoffre.length === 0) {
      console.log("✅ Aucune dépense n'a été trouvée dans la base de données.");
      return;
    }

    console.log(
      `⚠️ ${depensesCoffre.length} dépense(s) trouvée(s). Début de la migration et de la suppression...`,
    );

    // Récupérer le plus grand id_transfert actuel pour simuler l'auto-incrément
    const maxTransfert = await prisma.transfert.aggregate({
      _max: {
        id_transfert: true,
      },
    });

    let nextTransfertId = (maxTransfert._max.id_transfert || 0) + 1;

    await prisma.$transaction(async (tx) => {
      for (const depense of depensesCoffre) {
        // 1. Création du transfert
        await tx.transfert.create({
          data: {
            id_transfert: nextTransfertId,
            cpt_source_id: 2,
            cpt_dest_id: 5,
            montant: depense.mnt_dep,
            date_transfert: depense.date_dep,
            taux_source: 1,
            observation: null,
          },
        });

        // 2. Suppression de la dépense d'origine
        await tx.depense.delete({
          where: {
            id_op_dep: depense.id_op_dep,
          },
        });

        console.log(
          `✔️ Transfert ID ${nextTransfertId} créé ET Dépense ID ${depense.id_op_dep} supprimée (Montant: ${depense.mnt_dep}).`,
        );

        nextTransfertId++; // On incrémente pour le prochain passage dans la boucle
      }
    });

    console.log("🎉 Migration et nettoyage terminés à 100%.");
  } catch (error) {
    console.error("❌ Erreur critique lors de la migration :", error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateCoffreToTransfert();
