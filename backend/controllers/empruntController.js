import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import { getMaxValue, arrondir } from "../config/utils.js";

// ==========================================
// LECTURE
// ==========================================
export const getAllEmprunts = async (req, res) => {
  try {
    const emprunts = await prisma.emprunt.findMany({
      include: {
        compte: {
          select: { designation_cpt: true, dev_code: true }
        },
        remboursements: true
      },
      orderBy: { date_emprunt: 'desc' }
    });
    
    res.status(200).json(emprunts);
  } catch (error) {
    res.status(500).json({ error: { code: error.code, message: error.message } });
  }
};

// ==========================================
// CRÉATION
// ==========================================
export const addEmprunt = [
  // 1. Validation avec des variables "masquées" pour le frontend
  body("desEmprunt")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("La désignation de l'emprunt est obligatoire"),
  body("montant")
    .isDecimal()
    .notEmpty()
    .withMessage("Le montant est obligatoire"),
  body("cpt")
    .isNumeric()
    .notEmpty()
    .withMessage("Le compte est obligatoire"),
  body("dateEmprunt")
    .notEmpty()
    .withMessage("La date est obligatoire"),

  // 2. Contrôleur
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Récupération des données depuis le payload (variables frontend)
    const { desEmprunt, montant, cpt, dateEmprunt } = req.body;

    try {
      const newEmprunt = await prisma.$transaction(async (tx) => {
        // A. Vérification du compte (utilisation de la variable 'cpt')
        const infoCompte = await tx.compte.findUnique({
          where: { id_cpt: parseInt(cpt) },
          select: { taux_change_actuel: true }
        });

        if (!infoCompte) {
          throw new Error("Compte introuvable.");
        }

        // B. Génération des IDs
        const idEmprunt = await getMaxValue("emprunt", "id_emprunt", null);
        const idCrediter = await getMaxValue("crediter", "id_op_crd", null);
        
        const dateOperation = new Date(dateEmprunt);
        const montantOperation = parseFloat(montant);

        // C. Création de l'emprunt (Le Mapping : variable sécurisée -> vraie colonne)
        const empruntCree = await tx.emprunt.create({
          data: {
            id_emprunt: idEmprunt,
            designation: desEmprunt,
            montant_emprunt: montantOperation,
            date_emprunt: dateOperation,
            cpt_id: parseInt(cpt)
          }
        });

        // D. Traçabilité (Table crediter)
        await tx.crediter.create({
          data: {
            id_op_crd: idCrediter,
            cpt_id: parseInt(cpt),
            date_op: dateOperation,
            montant_op: montantOperation,
            taux_change: infoCompte.taux_change_actuel
          }
        });

        // E. Mise à jour du compte
        await tx.compte.update({
          where: { id_cpt: parseInt(cpt) },
          data: {
            solde_actuel: { increment: montantOperation }
          }
        });

        return empruntCree;
      });

      res.status(201).json(newEmprunt);
    } catch (error) {
      res.status(error.message === "Compte introuvable." ? 404 : 500)
         .json({ error: { code: error.code || "CUSTOM", message: error.message } });
    }
  }
];

// ==========================================
// REMBOURSEMENT (Sortie de trésorerie)
// ==========================================
export const addRemboursement = [
  // 1. Validation avec variables masquées
  body("idEmpruntCible")
    .isNumeric()
    .notEmpty()
    .withMessage("L'identifiant de l'emprunt est obligatoire"),
  body("mntRembourse")
    .isDecimal()
    .notEmpty()
    .withMessage("Le montant du remboursement est obligatoire"),
  body("cptCible")
    .isNumeric()
    .notEmpty()
    .withMessage("Le compte de prélèvement est obligatoire"),
  body("dateRembourse")
    .notEmpty()
    .withMessage("La date est obligatoire"),

  // 2. Contrôleur
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { idEmpruntCible, mntRembourse, cptCible, dateRembourse } = req.body;

    try {
      const result = await prisma.$transaction(async (tx) => {
        // A. Récupérer l'emprunt et l'historique de ses remboursements
        const empruntActuel = await tx.emprunt.findUnique({
          where: { id_emprunt: parseInt(idEmpruntCible) },
          include: { remboursements: true }
        });

        if (!empruntActuel) {
          throw new Error("Emprunt introuvable.");
        }

        if (empruntActuel.statut_emprunt === "SOLDE") {
          throw new Error("Cet emprunt est déjà totalement soldé.");
        }

        // B. Calcul strict du reste à payer (avec sécurisation des décimales JavaScript)
        const totalDejaRembourse = empruntActuel.remboursements.reduce(
          (sum, remb) => sum + parseFloat(remb.montant_remb), 
          0
        );
        
        const montantInitial = parseFloat(empruntActuel.montant_emprunt);
        const resteAPayer = arrondir(montantInitial - totalDejaRembourse);
        const montantSaisi = arrondir(parseFloat(mntRembourse));

        // C. RÈGLE MÉTIER 1 : Bloquer le sur-paiement
        if (montantSaisi > resteAPayer) {
          throw new Error(`Le montant saisi dépasse le reste à payer (${resteAPayer} DZD).`);
        }

        // D. RÈGLE MÉTIER 2 : Vérifier les fonds du compte de prélèvement
        const infoCompte = await tx.compte.findUnique({
          where: { id_cpt: parseInt(cptCible) },
          select: { solde_actuel: true }
        });

        if (!infoCompte) {
          throw new Error("Compte de prélèvement introuvable.");
        }

        if (parseFloat(infoCompte.solde_actuel) < montantSaisi) {
          throw new Error("Fonds insuffisants sur le compte sélectionné.");
        }

        // E. Générer l'ID pour la table remboursement
        const idRemboursement = await getMaxValue("remboursement", "id_remb", null);
        const dateOperation = new Date(dateRembourse);

        // F. Enregistrer le remboursement (La variable masquée devient la vraie colonne)
        const nouveauRemboursement = await tx.remboursement.create({
          data: {
            id_remb: idRemboursement,
            montant_remb: montantSaisi,
            date_remb: dateOperation,
            emprunt_id: parseInt(idEmpruntCible)
          }
        });

        // G. Décrémenter l'argent du compte
        await tx.compte.update({
          where: { id_cpt: parseInt(cptCible) },
          data: {
            solde_actuel: { decrement: montantSaisi }
          }
        });

        // H. Clôturer l'emprunt si le compte est bon
        if (montantSaisi === resteAPayer) {
          await tx.emprunt.update({
            where: { id_emprunt: parseInt(idEmpruntCible) },
            data: { statut_emprunt: "SOLDE" }
          });
        }

        return nouveauRemboursement;
      });

      res.status(201).json({ message: "Remboursement ajouté avec succès", data: result });

    } catch (error) {
      // Routage dynamique du code HTTP selon le type d'erreur métier
      let statusCode = 500;
      if (error.message.includes("introuvable")) statusCode = 404;
      if (error.message.includes("dépasse") || error.message.includes("insuffisants") || error.message.includes("soldé")) statusCode = 403;

      res.status(statusCode).json({ error: { code: error.code || "BUSINESS_RULE", message: error.message } });
    }
  }
];