import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import { getMaxValue } from "../config/utils.js";

const TYPES_REDUCTION = ["POURCENTAGE", "MONTANT_FIXE"];
const PERIMETRES = ["TOUS", "FAMILLES", "PRODUITS"];

const remplacerLiaisons = async (tx, idPromotion, perimetre, familles, produits) => {
  await tx.promotion_famille.deleteMany({ where: { promotion_id: idPromotion } });
  await tx.promotion_produit.deleteMany({ where: { promotion_id: idPromotion } });

  if (perimetre === "FAMILLES") {
    const ids = familles.map((id) => parseInt(id, 10));
    const idMax = await getMaxValue(
      "promotion_famille",
      "id_liaison",
      null,
      1,
      tx,
    );
    await tx.promotion_famille.createMany({
      data: ids.map((famille_id, index) => ({
        id_liaison: idMax + index,
        promotion_id: idPromotion,
        famille_id,
      })),
    });
  }
  if (perimetre === "PRODUITS") {
    const ids = produits.map((id) => parseInt(id, 10));
    const idMax = await getMaxValue(
      "promotion_produit",
      "id_liaison",
      null,
      1,
      tx,
    );
    await tx.promotion_produit.createMany({
      data: ids.map((produit_id, index) => ({
        id_liaison: idMax + index,
        promotion_id: idPromotion,
        produit_id,
      })),
    });
  }
};

const verifierLiaisons = async (perimetre, familles, produits) => {
  if (perimetre === "FAMILLES") {
    const ids = familles.map((id) => parseInt(id, 10));
    const trouvees = await prisma.famille_produit.count({
      where: { id_famille: { in: ids } },
    });
    if (trouvees !== ids.length) return false;
  }
  if (perimetre === "PRODUITS") {
    const ids = produits.map((id) => parseInt(id, 10));
    const trouves = await prisma.produit.count({
      where: { id_prd: { in: ids } },
    });
    if (trouves !== ids.length) return false;
  }
  return true;
};

export const getPromotions = async (req, res) => {
  try {
    const promotions = await prisma.promotion.findMany({
      include: {
        familles: { include: { famille: { select: { nom_famille: true } } } },
        produits: {
          include: { produit: { select: { designation_prd: true } } },
        },
      },
      orderBy: { date_debut: "desc" },
    });
    res.status(200).json(promotions);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getPromotionById = async (req, res) => {
  const idPromotion = parseInt(req.params.id, 10);
  if (isNaN(idPromotion)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }
  try {
    const promotion = await prisma.promotion.findUnique({
      where: { id_promotion: idPromotion },
      include: {
        familles: { include: { famille: { select: { nom_famille: true } } } },
        produits: {
          include: { produit: { select: { designation_prd: true } } },
        },
      },
    });
    if (!promotion) {
      return res.status(404).json({ message: "Promotion introuvable." });
    }
    res.status(200).json(promotion);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

const validateursCommuns = [
  body("type_reduction")
    .optional()
    .isIn(TYPES_REDUCTION)
    .withMessage("Le type de réduction doit être POURCENTAGE ou MONTANT_FIXE"),
  body("valeur_reduction")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("La valeur de réduction doit être un nombre supérieur à 0"),
  body("date_debut")
    .optional()
    .isISO8601()
    .withMessage("La date de début doit être une date valide"),
  body("date_fin")
    .optional()
    .isISO8601()
    .withMessage("La date de fin doit être une date valide"),
  body("perimetre")
    .optional()
    .isIn(PERIMETRES)
    .withMessage("Le périmètre doit être TOUS, FAMILLES ou PRODUITS"),
  body("est_active")
    .optional()
    .isBoolean()
    .withMessage("L'état actif doit être un booléen"),
  body("familles")
    .optional()
    .isArray()
    .withMessage("Les familles doivent être une liste d'identifiants"),
  body("produits")
    .optional()
    .isArray()
    .withMessage("Les produits doivent être une liste d'identifiants"),
];

export const addPromotion = [
  ...validateursCommuns,
  body("type_reduction")
    .notEmpty()
    .withMessage("Le type de réduction est obligatoire"),
  body("valeur_reduction")
    .notEmpty()
    .withMessage("La valeur de réduction est obligatoire"),
  body("date_debut")
    .notEmpty()
    .withMessage("La date de début est obligatoire"),
  body("date_fin")
    .notEmpty()
    .withMessage("La date de fin est obligatoire"),
  body("perimetre")
    .notEmpty()
    .withMessage("Le périmètre est obligatoire"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      type_reduction,
      valeur_reduction,
      date_debut,
      date_fin,
      perimetre,
      est_active,
      familles = [],
      produits = [],
    } = req.body;

    try {
      if (new Date(date_fin) < new Date(date_debut)) {
        return res
          .status(400)
          .json({ message: "La date de fin doit être après la date de début." });
      }
      if (type_reduction === "POURCENTAGE" && parseFloat(valeur_reduction) > 100) {
        return res
          .status(400)
          .json({ message: "Un pourcentage de réduction ne peut pas dépasser 100." });
      }
      if (
        (perimetre === "FAMILLES" && familles.length === 0) ||
        (perimetre === "PRODUITS" && produits.length === 0)
      ) {
        return res.status(400).json({
          message:
            perimetre === "FAMILLES"
              ? "Sélectionnez au moins une famille pour ce périmètre."
              : "Sélectionnez au moins un produit pour ce périmètre.",
        });
      }
      const liaisonsValides = await verifierLiaisons(perimetre, familles, produits);
      if (!liaisonsValides) {
        return res.status(404).json({
          message: "Une des familles ou un des produits sélectionnés est introuvable.",
        });
      }

      const idPromotion = await getMaxValue("promotion", "id_promotion", null);

      const promotion = await prisma.$transaction(async (tx) => {
        const nouvelle = await tx.promotion.create({
          data: {
            id_promotion: idPromotion,
            type_reduction,
            valeur_reduction: parseFloat(valeur_reduction),
            date_debut: new Date(date_debut),
            date_fin: new Date(date_fin),
            perimetre,
            est_active: est_active === undefined ? true : Boolean(est_active),
          },
        });
        await remplacerLiaisons(tx, idPromotion, perimetre, familles, produits);
        return nouvelle;
      });

      res.status(201).json(promotion);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const updatePromotion = [
  ...validateursCommuns,
  body("est_active")
    .optional({ nullable: true })
    .isBoolean()
    .withMessage("L'état actif doit être un booléen"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idPromotion = parseInt(req.params.id, 10);
    if (isNaN(idPromotion)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const {
      type_reduction,
      valeur_reduction,
      date_debut,
      date_fin,
      perimetre,
      est_active,
      familles = [],
      produits = [],
    } = req.body;

    try {
      const existante = await prisma.promotion.findUnique({
        where: { id_promotion: idPromotion },
      });
      if (!existante) {
        return res.status(404).json({ message: "Promotion introuvable." });
      }

      const typeEffectif = type_reduction ?? existante.type_reduction;
      const valeurEffective =
        valeur_reduction !== undefined
          ? parseFloat(valeur_reduction)
          : parseFloat(existante.valeur_reduction);
      const debutEffectif = date_debut ?? existante.date_debut;
      const finEffective = date_fin ?? existante.date_fin;
      const perimetreEffectif = perimetre ?? existante.perimetre;

      if (new Date(finEffective) < new Date(debutEffectif)) {
        return res
          .status(400)
          .json({ message: "La date de fin doit être après la date de début." });
      }
      if (typeEffectif === "POURCENTAGE" && valeurEffective > 100) {
        return res
          .status(400)
          .json({ message: "Un pourcentage de réduction ne peut pas dépasser 100." });
      }
      if (
        perimetre !== undefined &&
        ((perimetreEffectif === "FAMILLES" && familles.length === 0) ||
          (perimetreEffectif === "PRODUITS" && produits.length === 0))
      ) {
        return res.status(400).json({
          message:
            perimetreEffectif === "FAMILLES"
              ? "Sélectionnez au moins une famille pour ce périmètre."
              : "Sélectionnez au moins un produit pour ce périmètre.",
        });
      }
      const liaisonsValides = await verifierLiaisons(
        perimetreEffectif,
        familles,
        produits,
      );
      if (!liaisonsValides) {
        return res.status(404).json({
          message: "Une des familles ou un des produits sélectionnés est introuvable.",
        });
      }

      const dataToUpdate = {};
      if (type_reduction !== undefined) dataToUpdate.type_reduction = type_reduction;
      if (valeur_reduction !== undefined)
        dataToUpdate.valeur_reduction = valeurEffective;
      if (date_debut !== undefined) dataToUpdate.date_debut = new Date(date_debut);
      if (date_fin !== undefined) dataToUpdate.date_fin = new Date(date_fin);
      if (perimetre !== undefined) dataToUpdate.perimetre = perimetre;
      if (est_active !== undefined) dataToUpdate.est_active = Boolean(est_active);

      const promotion = await prisma.$transaction(async (tx) => {
        const modifiee = await tx.promotion.update({
          where: { id_promotion: idPromotion },
          data: dataToUpdate,
        });
        if (perimetre !== undefined) {
          await remplacerLiaisons(
            tx,
            idPromotion,
            perimetreEffectif,
            familles,
            produits,
          );
        }
        return modifiee;
      });

      res.status(200).json(promotion);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const deletePromotion = async (req, res) => {
  const idPromotion = parseInt(req.params.id, 10);
  if (isNaN(idPromotion)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const existante = await prisma.promotion.findUnique({
      where: { id_promotion: idPromotion },
    });
    if (!existante) {
      return res.status(404).json({ message: "Promotion introuvable." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.promotion_famille.deleteMany({ where: { promotion_id: idPromotion } });
      await tx.promotion_produit.deleteMany({ where: { promotion_id: idPromotion } });
      await tx.promotion.delete({ where: { id_promotion: idPromotion } });
    });

    res.status(200).json({ message: "Promotion supprimée avec succès." });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};
