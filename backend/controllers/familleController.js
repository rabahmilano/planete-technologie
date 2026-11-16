import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import { getMaxValue, genererSlug } from "../config/utils.js";

const genererSlugFamilleUnique = async (nomFamille, idFamilleExclu = null) => {
  const base = genererSlug(nomFamille);
  let slug = base;
  let suffixe = 2;

  while (true) {
    const existant = await prisma.famille_produit.findUnique({
      where: { slug_famille: slug },
    });
    if (
      !existant ||
      (idFamilleExclu !== null && existant.id_famille === idFamilleExclu)
    ) {
      return slug;
    }
    slug = `${base}-${suffixe}`;
    suffixe += 1;
  }
};

const verifierCycleHierarchie = async (idFamille, idParentPropose) => {
  let courant = idParentPropose;
  while (courant !== null) {
    if (courant === idFamille) return false;
    const parent = await prisma.famille_produit.findUnique({
      where: { id_famille: courant },
      select: { famille_parente_id: true },
    });
    if (!parent) return true;
    courant = parent.famille_parente_id;
  }
  return true;
};

export const addFamille = [
  body("nom_famille")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le nom de la famille est obligatoire"),
  body("famille_parente_id")
    .optional({ nullable: true })
    .isInt()
    .withMessage("La famille parente doit être un identifiant valide"),
  body("image_famille")
    .optional()
    .isString()
    .trim()
    .withMessage("L'image de la famille doit être une URL valide"),
  body("ordre_famille")
    .optional()
    .isInt({ min: 0 })
    .withMessage("L'ordre d'affichage doit être un entier positif ou nul"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nom_famille, famille_parente_id, image_famille, ordre_famille } =
      req.body;

    try {
      let parentId = null;
      if (famille_parente_id !== undefined && famille_parente_id !== null) {
        parentId = parseInt(famille_parente_id, 10);
        const parent = await prisma.famille_produit.findUnique({
          where: { id_famille: parentId },
        });
        if (!parent) {
          return res
            .status(404)
            .json({ message: "Famille parente introuvable." });
        }
      }

      const slug_famille = await genererSlugFamilleUnique(nom_famille);
      const id_famille = await getMaxValue("famille_produit", "id_famille", null);

      const nouvelleFamille = await prisma.famille_produit.create({
        data: {
          id_famille,
          nom_famille: nom_famille.trim(),
          slug_famille,
          image_famille: image_famille || null,
          ordre_famille:
            ordre_famille !== undefined ? parseInt(ordre_famille, 10) : 0,
          famille_parente_id: parentId,
        },
      });

      res.status(201).json(nouvelleFamille);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const getAllFamilles = async (req, res) => {
  try {
    const familles = await prisma.famille_produit.findMany({
      where: { famille_parente_id: null },
      include: {
        _count: { select: { produits: true } },
        sous_familles: {
          include: {
            _count: { select: { produits: true } },
            sous_familles: {
              include: {
                _count: { select: { produits: true } },
              },
              orderBy: [{ ordre_famille: "asc" }, { nom_famille: "asc" }],
            },
          },
          orderBy: [{ ordre_famille: "asc" }, { nom_famille: "asc" }],
        },
      },
      orderBy: [{ ordre_famille: "asc" }, { nom_famille: "asc" }],
    });

    res.status(200).json(familles);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const getFamilleById = async (req, res) => {
  const idFamille = parseInt(req.params.id, 10);
  if (isNaN(idFamille)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const famille = await prisma.famille_produit.findUnique({
      where: { id_famille: idFamille },
      include: {
        famille_parente: {
          select: { id_famille: true, nom_famille: true, slug_famille: true },
        },
        sous_familles: {
          include: { _count: { select: { produits: true } } },
          orderBy: [{ ordre_famille: "asc" }, { nom_famille: "asc" }],
        },
        produits: {
          select: {
            id_prd: true,
            designation_prd: true,
            statut_publication: true,
            prix_vente: true,
            qte_dispo: true,
          },
          orderBy: { designation_prd: "asc" },
        },
      },
    });

    if (!famille) {
      return res.status(404).json({ message: "Famille introuvable." });
    }

    res.status(200).json(famille);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const updateFamille = [
  body("nom_famille")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le nom de la famille est obligatoire"),
  body("famille_parente_id")
    .optional({ nullable: true })
    .isInt()
    .withMessage("La famille parente doit être un identifiant valide"),
  body("image_famille")
    .optional({ nullable: true })
    .isString()
    .trim()
    .withMessage("L'image de la famille doit être une URL valide"),
  body("ordre_famille")
    .optional()
    .isInt({ min: 0 })
    .withMessage("L'ordre d'affichage doit être un entier positif ou nul"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idFamille = parseInt(req.params.id, 10);
    if (isNaN(idFamille)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const { nom_famille, famille_parente_id, image_famille, ordre_famille } =
      req.body;

    try {
      const famille = await prisma.famille_produit.findUnique({
        where: { id_famille: idFamille },
      });
      if (!famille) {
        return res.status(404).json({ message: "Famille introuvable." });
      }

      const dataToUpdate = {};
      if (nom_famille !== undefined) {
        dataToUpdate.nom_famille = nom_famille.trim();
        dataToUpdate.slug_famille = await genererSlugFamilleUnique(
          nom_famille,
          idFamille,
        );
      }
      if (image_famille !== undefined) {
        dataToUpdate.image_famille = image_famille || null;
      }
      if (ordre_famille !== undefined) {
        dataToUpdate.ordre_famille = parseInt(ordre_famille, 10);
      }
      if (famille_parente_id !== undefined) {
        if (famille_parente_id === null) {
          dataToUpdate.famille_parente_id = null;
        } else {
          const parentId = parseInt(famille_parente_id, 10);
          if (parentId === idFamille) {
            return res.status(400).json({
              message: "Une famille ne peut pas être sa propre parente.",
            });
          }
          const parent = await prisma.famille_produit.findUnique({
            where: { id_famille: parentId },
          });
          if (!parent) {
            return res
              .status(404)
              .json({ message: "Famille parente introuvable." });
          }
          const sansCycle = await verifierCycleHierarchie(
            idFamille,
            parentId,
          );
          if (!sansCycle) {
            return res.status(400).json({
              message:
                "Hiérarchie invalide : la famille parente choisie est une descendante de cette famille.",
            });
          }
          dataToUpdate.famille_parente_id = parentId;
        }
      }

      if (Object.keys(dataToUpdate).length === 0) {
        return res
          .status(400)
          .json({ message: "Aucune donnée à mettre à jour fournie." });
      }

      const familleModifiee = await prisma.famille_produit.update({
        where: { id_famille: idFamille },
        data: dataToUpdate,
      });

      res.status(200).json(familleModifiee);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const deleteFamille = async (req, res) => {
  const idFamille = parseInt(req.params.id, 10);
  if (isNaN(idFamille)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const famille = await prisma.famille_produit.findUnique({
      where: { id_famille: idFamille },
    });
    if (!famille) {
      return res.status(404).json({ message: "Famille introuvable." });
    }

    const nbSousFamilles = await prisma.famille_produit.count({
      where: { famille_parente_id: idFamille },
    });
    if (nbSousFamilles > 0) {
      return res.status(403).json({
        message:
          "Impossible de supprimer une famille qui possède des sous-familles.",
      });
    }

    const nbProduits = await prisma.produit.count({
      where: { famille_id: idFamille },
    });
    if (nbProduits > 0) {
      return res.status(403).json({
        message:
          "Impossible de supprimer une famille à laquelle des produits sont rattachés.",
      });
    }

    await prisma.famille_produit.delete({ where: { id_famille: idFamille } });

    res.status(200).json({ message: "Famille supprimée avec succès." });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};
