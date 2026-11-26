import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import { getMaxValue } from "../config/utils.js";
import {
  isCloudinaryConfigured,
  uploadImageBuffer,
  CLOUDINARY_DOSSIER_FAMILLES,
} from "../config/cloudinary.js";
import { televersementImage } from "../config/multerImage.js";

const REGEX_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MESSAGE_FORMAT_SLUG =
  "Le slug doit être en minuscules, sans accents ni espaces : lettres a-z, chiffres 0-9 et tirets uniquement (ex. : reseau-cle-wifi).";

const slugDisponible = async (slug, idFamilleExclu = null) => {
  const existant = await prisma.famille_produit.findUnique({
    where: { slug_famille: slug },
  });
  return (
    !existant ||
    (idFamilleExclu !== null && existant.id_famille === idFamilleExclu)
  );
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
    .withMessage("Le nom de la famille est obligatoire")
    .isLength({ max: 100 })
    .withMessage("Le nom de la famille ne peut pas dépasser 100 caractères"),
  body("nom_famille_ar")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Le nom en arabe ne peut pas dépasser 100 caractères"),
  body("slug_famille")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le slug est obligatoire")
    .matches(REGEX_SLUG)
    .withMessage(MESSAGE_FORMAT_SLUG)
    .isLength({ max: 100 })
    .withMessage("Le slug ne peut pas dépasser 100 caractères"),
  body("famille_parente_id")
    .optional({ nullable: true })
    .isInt()
    .withMessage("La famille parente doit être un identifiant valide"),
  body("image_famille")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("L'image de la famille doit être une URL valide")
    .isLength({ max: 500 })
    .withMessage("L'URL de l'image ne peut pas dépasser 500 caractères"),
  body("ordre_famille")
    .optional()
    .isInt({ min: 0 })
    .withMessage("L'ordre d'affichage doit être un entier positif ou nul"),
  body("est_active_famille")
    .optional()
    .isBoolean()
    .withMessage("La visibilité doit être vrai ou faux")
    .toBoolean(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      nom_famille,
      nom_famille_ar,
      slug_famille,
      famille_parente_id,
      image_famille,
      ordre_famille,
      est_active_famille,
    } = req.body;

    try {
      if (!(await slugDisponible(slug_famille.trim()))) {
        return res.status(409).json({
          message: "Ce slug est déjà utilisé par une autre famille.",
        });
      }

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

      const id_famille = await getMaxValue("famille_produit", "id_famille", null);

      const nouvelleFamille = await prisma.famille_produit.create({
        data: {
          id_famille,
          nom_famille: nom_famille.trim(),
          nom_famille_ar:
            typeof nom_famille_ar === "string" && nom_famille_ar.trim()
              ? nom_famille_ar.trim()
              : null,
          slug_famille: slug_famille.trim(),
          image_famille: image_famille || null,
          ordre_famille:
            ordre_famille !== undefined ? parseInt(ordre_famille, 10) : 0,
          est_active_famille:
            est_active_famille !== undefined ? est_active_famille : true,
          famille_parente_id: parentId,
        },
      });

      res.status(201).json(nouvelleFamille);
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ message: "Ce slug est déjà utilisé par une autre famille." });
      }
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
    .withMessage("Le nom de la famille est obligatoire")
    .isLength({ max: 100 })
    .withMessage("Le nom de la famille ne peut pas dépasser 100 caractères"),
  body("nom_famille_ar")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Le nom en arabe ne peut pas dépasser 100 caractères"),
  body("slug_famille")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le slug ne peut pas être vide")
    .matches(REGEX_SLUG)
    .withMessage(MESSAGE_FORMAT_SLUG)
    .isLength({ max: 100 })
    .withMessage("Le slug ne peut pas dépasser 100 caractères"),
  body("famille_parente_id")
    .optional({ nullable: true })
    .isInt()
    .withMessage("La famille parente doit être un identifiant valide"),
  body("image_famille")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("L'image de la famille doit être une URL valide")
    .isLength({ max: 500 })
    .withMessage("L'URL de l'image ne peut pas dépasser 500 caractères"),
  body("ordre_famille")
    .optional()
    .isInt({ min: 0 })
    .withMessage("L'ordre d'affichage doit être un entier positif ou nul"),
  body("est_active_famille")
    .optional()
    .isBoolean()
    .withMessage("La visibilité doit être vrai ou faux")
    .toBoolean(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idFamille = parseInt(req.params.id, 10);
    if (isNaN(idFamille)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const {
      nom_famille,
      nom_famille_ar,
      slug_famille,
      famille_parente_id,
      image_famille,
      ordre_famille,
      est_active_famille,
    } = req.body;

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
      }
      if (nom_famille_ar !== undefined) {
        // Chaîne vide = pas de nom arabe → null.
        dataToUpdate.nom_famille_ar =
          typeof nom_famille_ar === "string" && nom_famille_ar.trim()
            ? nom_famille_ar.trim()
            : null;
      }
      if (slug_famille !== undefined) {
        if (!(await slugDisponible(slug_famille.trim(), idFamille))) {
          return res.status(409).json({
            message: "Ce slug est déjà utilisé par une autre famille.",
          });
        }
        dataToUpdate.slug_famille = slug_famille.trim();
      }
      if (image_famille !== undefined) {
        dataToUpdate.image_famille = image_famille || null;
      }
      if (ordre_famille !== undefined) {
        dataToUpdate.ordre_famille = parseInt(ordre_famille, 10);
      }
      if (est_active_famille !== undefined) {
        dataToUpdate.est_active_famille = est_active_famille;
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
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ message: "Ce slug est déjà utilisé par une autre famille." });
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
    });
    if (!famille) {
      return res.status(404).json({ message: "Famille introuvable." });
    }

    const nbSousFamilles = await prisma.famille_produit.count({
      where: { famille_parente_id: idFamille },
    });
    if (nbSousFamilles > 0) {
      // 409 (conflit métier), pas 403 : l'intercepteur axios traite tout 403
      // comme un token expiré et renverrait l'utilisateur vers /login.
      return res.status(409).json({
        message:
          "Impossible de supprimer une famille qui possède des sous-familles.",
      });
    }

    const nbProduits = await prisma.produit.count({
      where: { famille_id: idFamille },
    });
    if (nbProduits > 0) {
      return res.status(409).json({
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

export const uploadImageFamille = (req, res) => {
  if (!isCloudinaryConfigured) {
    return res.status(503).json({
      message:
        "Cloudinary n'est pas configuré. Ajoutez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET dans le fichier .env du backend.",
    });
  }

  televersementImage.single("image")(req, res, async (erreur) => {
    if (erreur) {
      if (erreur.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "L'image dépasse 5 Mo." });
      }
      if (erreur.message === "TYPE_IMAGE_NON_SUPPORTE") {
        return res.status(400).json({
          message: "Format accepté : JPEG, PNG ou WebP.",
        });
      }
      return res.status(400).json({ message: erreur.message });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Aucun fichier reçu (champ « image »).",
      });
    }

    try {
      const resultat = await uploadImageBuffer(req.file.buffer, {
        dossier: CLOUDINARY_DOSSIER_FAMILLES,
      });
      res.status(201).json({
        url_image: resultat.secure_url,
        public_id: resultat.public_id,
      });
    } catch (err) {
      res.status(500).json({
        message: `Échec de l'envoi vers Cloudinary : ${err.message}`,
      });
    }
  });
};
