import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import { getMaxValue, genererSlug } from "../config/utils.js";

const trouverSlugFamilleUnique = async (base, excludeId = null) => {
  let candidat = base;
  let suffixe = 2;
  while (true) {
    const existant = await prisma.famille_produit.findFirst({
      where: {
        slug_famille: candidat,
        ...(excludeId ? { id_famille: { not: excludeId } } : {}),
      },
    });
    if (!existant) return candidat;
    candidat = `${base}-${suffixe}`;
    suffixe++;
  }
};

export const addFamille = [
  body("nomFamille")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le nom de la famille est obligatoire")
    .isLength({ max: 100 })
    .withMessage("Le nom de la famille ne peut pas dépasser 100 caractères"),
  body("familleParenteId")
    .optional({ nullable: true })
    .isInt()
    .withMessage("La famille parente est invalide"),
  body("imageFamille")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("L'URL de l'image ne peut pas dépasser 500 caractères"),
  body("ordreFamille")
    .optional({ nullable: true })
    .isInt()
    .withMessage("L'ordre doit être un entier"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nomFamille, familleParenteId, imageFamille, ordreFamille } = req.body;
    const nom = nomFamille.trim();

    try {
      if (familleParenteId !== undefined && familleParenteId !== null) {
        const parent = await prisma.famille_produit.findUnique({
          where: { id_famille: parseInt(familleParenteId, 10) },
        });
        if (!parent) {
          return res.status(404).json({ message: "Famille parente introuvable." });
        }
      }

      const baseSlug = genererSlug(nom);
      if (!baseSlug) {
        return res
          .status(400)
          .json({ message: "Le nom ne permet pas de générer un slug valide." });
      }

      const slugFamille = await trouverSlugFamilleUnique(baseSlug);
      const idFamille = await getMaxValue("famille_produit", "id_famille", null);

      const nouvelleFamille = await prisma.famille_produit.create({
        data: {
          id_famille: idFamille,
          nom_famille: nom,
          slug_famille: slugFamille,
          image_famille: imageFamille ? imageFamille : null,
          ordre_famille:
            ordreFamille !== undefined && ordreFamille !== null
              ? parseInt(ordreFamille, 10)
              : 0,
          famille_parente_id:
            familleParenteId !== undefined && familleParenteId !== null
              ? parseInt(familleParenteId, 10)
              : null,
        },
      });

      res.status(201).json(nouvelleFamille);
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ message: "Le slug de la famille existe déjà." });
      }
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const updateFamille = [
  body("nomFamille")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le nom de la famille ne peut pas être vide")
    .isLength({ max: 100 })
    .withMessage("Le nom de la famille ne peut pas dépasser 100 caractères"),
  body("familleParenteId")
    .optional({ nullable: true })
    .isInt()
    .withMessage("La famille parente est invalide"),
  body("imageFamille")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("L'URL de l'image ne peut pas dépasser 500 caractères"),
  body("ordreFamille")
    .optional({ nullable: true })
    .isInt()
    .withMessage("L'ordre doit être un entier"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idFamille = parseInt(req.params.id, 10);
    if (isNaN(idFamille)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const { nomFamille, familleParenteId, imageFamille, ordreFamille } = req.body;

    try {
      const famille = await prisma.famille_produit.findUnique({
        where: { id_famille: idFamille },
      });
      if (!famille) {
        return res.status(404).json({ message: "Famille introuvable." });
      }

      const data = {};

      if (nomFamille !== undefined) {
        const nouveauNom = nomFamille.trim();
        if (nouveauNom !== famille.nom_famille) {
          const baseSlug = genererSlug(nouveauNom);
          if (!baseSlug) {
            return res
              .status(400)
              .json({ message: "Le nom ne permet pas de générer un slug valide." });
          }
          data.nom_famille = nouveauNom;
          data.slug_famille = await trouverSlugFamilleUnique(baseSlug, idFamille);
        }
      }

      if (familleParenteId !== undefined) {
        if (familleParenteId === null) {
          data.famille_parente_id = null;
        } else {
          const parentId = parseInt(familleParenteId, 10);
          if (parentId === idFamille) {
            return res
              .status(400)
              .json({ message: "Une famille ne peut pas être sa propre parente." });
          }
          let curseurId = parentId;
          while (curseurId !== null) {
            if (curseurId === idFamille) {
              return res.status(400).json({
                message: "Cette parenté créerait une boucle dans la hiérarchie.",
              });
            }
            const curseur = await prisma.famille_produit.findUnique({
              where: { id_famille: curseurId },
            });
            if (!curseur) {
              return res
                .status(404)
                .json({ message: "Famille parente introuvable." });
            }
            curseurId = curseur.famille_parente_id;
          }
          data.famille_parente_id = parentId;
        }
      }

      if (imageFamille !== undefined) {
        data.image_famille = imageFamille === null ? null : imageFamille;
      }

      if (ordreFamille !== undefined && ordreFamille !== null) {
        data.ordre_famille = parseInt(ordreFamille, 10);
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ message: "Aucune donnée à mettre à jour." });
      }

      const familleMAJ = await prisma.famille_produit.update({
        where: { id_famille: idFamille },
        data,
      });

      res.status(200).json(familleMAJ);
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ message: "Le slug de la famille existe déjà." });
      }
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
      include: { _count: { select: { sous_familles: true, produits: true } } },
    });
    if (!famille) {
      return res.status(404).json({ message: "Famille introuvable." });
    }

    if (famille._count.sous_familles > 0) {
      return res.status(409).json({
        message:
          "Impossible de supprimer : cette famille possède des sous-familles.",
      });
    }
    if (famille._count.produits > 0) {
      return res.status(409).json({
        message:
          "Impossible de supprimer : des produits sont rattachés à cette famille.",
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

export const getAllFamilles = async (req, res) => {
  try {
    const familles = await prisma.famille_produit.findMany({
      orderBy: [{ ordre_famille: "asc" }, { nom_famille: "asc" }],
      include: { _count: { select: { produits: true } } },
    });

    const parId = new Map();
    familles.forEach((famille) =>
      parId.set(famille.id_famille, { ...famille, sous_familles: [] }),
    );

    const arbre = [];
    parId.forEach((noeud) => {
      if (noeud.famille_parente_id && parId.has(noeud.famille_parente_id)) {
        parId.get(noeud.famille_parente_id).sous_familles.push(noeud);
      } else {
        arbre.push(noeud);
      }
    });

    res.status(200).json(arbre);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const attribuerFamilleProduit = [
  body("familleId")
    .optional({ nullable: true })
    .isInt()
    .withMessage("La famille est invalide"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idPrd = parseInt(req.params.idPrd, 10);
    if (isNaN(idPrd)) {
      return res.status(400).json({ message: "Identifiant produit invalide." });
    }

    const { familleId } = req.body;

    try {
      const produit = await prisma.produit.findUnique({
        where: { id_prd: idPrd },
        select: { id_prd: true },
      });
      if (!produit) {
        return res.status(404).json({ message: "Produit introuvable." });
      }

      if (familleId !== undefined && familleId !== null) {
        const famille = await prisma.famille_produit.findUnique({
          where: { id_famille: parseInt(familleId, 10) },
          select: { id_famille: true },
        });
        if (!famille) {
          return res.status(404).json({ message: "Famille introuvable." });
        }
      }

      const produitMAJ = await prisma.produit.update({
        where: { id_prd: idPrd },
        data: {
          famille_id:
            familleId !== undefined && familleId !== null
              ? parseInt(familleId, 10)
              : null,
        },
        select: {
          id_prd: true,
          designation_prd: true,
          famille_id: true,
          famille: { select: { id_famille: true, nom_famille: true } },
        },
      });

      res.status(200).json(produitMAJ);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];
