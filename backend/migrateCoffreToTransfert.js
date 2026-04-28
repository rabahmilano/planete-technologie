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
      `⚠️ ${depensesCoffre.length} dépense(s) trouvée(s). Début de la migration, suppression et mise à jour des soldes...`,
    );

    const maxTransfert = await prisma.transfert.aggregate({
      _max: {
        id_transfert: true,
      },
    });

    let nextTransfertId = (maxTransfert._max.id_transfert || 0) + 1;

    await prisma.$transaction(async (tx) => {
      for (const depense of depensesCoffre) {
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

        await tx.depense.delete({
          where: {
            id_op_dep: depense.id_op_dep,
          },
        });

        await tx.compte.update({
          where: { id_cpt: 5 },
          data: {
            solde_actuel: { increment: depense.mnt_dep },
          },
        });

        console.log(
          `✔️ Transfert ID ${nextTransfertId} créé, Dépense supprimée et Coffre crédité de ${depense.mnt_dep}.`,
        );

        nextTransfertId++;
      }
    });

    console.log("🎉 Migration et mise à jour des soldes terminées à 100%.");
  } catch (error) {
    console.error("❌ Erreur critique lors de la migration :", error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateCoffreToTransfert();
