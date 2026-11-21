import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import multer from "multer";
import {
  isCloudinaryConfigured,
  uploadImageBuffer,
  deleteCloudinaryImage,
} from "../config/cloudinary.js";
import {
  getMaxValue,
  genererSlug,
  getPrixEffectifProduit,
} from "../config/utils.js";

const STATUTS_PUBLICATION = ["BROUILLON", "PUBLIE", "ARCHIVE"];

const appliquerNouveauPrixVente = async (tx, produit, nouveauPrixVente) => {
  const ancienPrix =
    produit.prix_vente === null || produit.prix_vente === undefined
      ? null
      : parseFloat(produit.prix_vente);

  if (ancienPrix === null || nouveauPrixVente === null) return;
  if (ancienPrix === nouveauPrixVente) return;

  await tx.historique_prix_vente.updateMany({
    where: { prd_id: produit.id_prd, date_fin: null },
    data: { date_fin: new Date() },
  });

  const idHistorique = await getMaxValue(
    "historique_prix_vente",
    "id_historique",
    null,
  );

  await tx.historique_prix_vente.create({
    data: {
      id_historique: idHistorique,
      ancien_prix: ancienPrix,
      nouveau_prix: nouveauPrixVente,
      prd_id: produit.id_prd,
    },
  });
};

export const getProduitEcommerce = async (req, res) => {
  const idProduit = parseInt(req.params.id, 10);
  if (isNaN(idProduit)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const produit = await prisma.produit.findUnique({
      where: { id_prd: idProduit },
      include: {
        famille: {
          select: { id_famille: true, nom_famille: true, slug_famille: true },
        },
        images: { orderBy: [{ ordre_image: "asc" }, { id_img: "asc" }] },
        paliers: { orderBy: { quantite_min: "asc" } },
        historiques_prix_vente: {
          orderBy: { date_debut: "desc" },
          take: 20,
        },
      },
    });

    if (!produit) {
      return res.status(404).json({ message: "Produit introuvable." });
    }

    const maintenant = new Date();
    const promoActive =
      produit.prix_promo !== null &&
      produit.prix_promo !== undefined &&
      produit.debut_promo &&
      produit.fin_promo &&
      new Date(produit.debut_promo) <= maintenant &&
      maintenant <= new Date(produit.fin_promo);

    res.status(200).json({
      ...produit,
      prix_effectif: getPrixEffectifProduit(produit, produit.paliers, 1),
      promo_active: promoActive,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const updateProduitEcommerce = [
  body("designation_prd")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("La désignation du produit est obligatoire"),
  body("description")
    .optional({ nullable: true })
    .isString()
    .withMessage("La description doit être une chaîne de caractères"),
  body("description_ar")
    .optional({ nullable: true })
    .isString()
    .withMessage("La description arabe doit être une chaîne de caractères"),
  body("qte_dispo")
    .optional()
    .isInt({ min: 0 })
    .withMessage("La quantité disponible doit être un entier positif ou nul"),
  body("poids_grammes")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Le poids doit être un entier supérieur à 0"),
  body("slug_prd")
    .optional({ nullable: true })
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le slug du produit est obligatoire"),
  body("statut_publication")
    .optional()
    .isIn(STATUTS_PUBLICATION)
    .withMessage(
      `Le statut de publication doit être ${STATUTS_PUBLICATION.join(", ")}`,
    ),
  body("est_mis_en_avant")
    .optional()
    .isBoolean()
    .withMessage("La mise en avant doit être un booléen"),
  body("famille_id")
    .optional({ nullable: true })
    .isInt()
    .withMessage("La famille doit être un identifiant valide"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idProduit = parseInt(req.params.id, 10);
    if (isNaN(idProduit)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const {
      designation_prd,
      description,
      description_ar,
      qte_dispo,
      poids_grammes,
      slug_prd,
      statut_publication,
      est_mis_en_avant,
      famille_id,
    } = req.body;

    try {
      const produit = await prisma.produit.findUnique({
        where: { id_prd: idProduit },
      });
      if (!produit) {
        return res.status(404).json({ message: "Produit introuvable." });
      }

      const dataToUpdate = {};
      if (designation_prd !== undefined) {
        dataToUpdate.designation_prd = designation_prd.trim();
      }
      if (description !== undefined) {
        dataToUpdate.description = description || null;
      }
      if (description_ar !== undefined) {
        dataToUpdate.description_ar = description_ar || null;
      }
      if (qte_dispo !== undefined) {
        dataToUpdate.qte_dispo = parseInt(qte_dispo, 10);
      }
      if (poids_grammes !== undefined) {
        dataToUpdate.poids_grammes =
          poids_grammes === null ? null : parseInt(poids_grammes, 10);
      }
      if (slug_prd !== undefined) {
        if (slug_prd === null) {
          dataToUpdate.slug_prd = null;
        } else {
          const slugNormalise = genererSlug(slug_prd);
          const conflit = await prisma.produit.findFirst({
            where: {
              slug_prd: slugNormalise,
              id_prd: { not: idProduit },
            },
          });
          if (conflit) {
            return res
              .status(409)
              .json({ message: "Ce slug est déjà utilisé par un produit." });
          }
          dataToUpdate.slug_prd = slugNormalise;
        }
      }
      if (statut_publication !== undefined) {
        dataToUpdate.statut_publication = statut_publication;
      }
      if (est_mis_en_avant !== undefined) {
        dataToUpdate.est_mis_en_avant = est_mis_en_avant;
      }
      if (famille_id !== undefined) {
        if (famille_id === null) {
          dataToUpdate.famille_id = null;
        } else {
          const famille = await prisma.famille_produit.findUnique({
            where: { id_famille: parseInt(famille_id, 10) },
          });
          if (!famille) {
            return res.status(404).json({ message: "Famille introuvable." });
          }
          dataToUpdate.famille_id = parseInt(famille_id, 10);
        }
      }

      if (Object.keys(dataToUpdate).length === 0) {
        return res
          .status(400)
          .json({ message: "Aucune donnée à mettre à jour fournie." });
      }

      const produitModifie = await prisma.produit.update({
        where: { id_prd: idProduit },
        data: dataToUpdate,
      });

      res.status(200).json(produitModifie);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const updatePrixProduit = [
  body("prix_vente")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Le prix de vente doit être un nombre positif ou nul"),
  body("prix_promo")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Le prix promo doit être un nombre positif ou nul"),
  body("debut_promo")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("La date de début de promo doit être une date valide"),
  body("fin_promo")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("La date de fin de promo doit être une date valide"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idProduit = parseInt(req.params.id, 10);
    if (isNaN(idProduit)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const { prix_vente, prix_promo, debut_promo, fin_promo } = req.body;

    try {
      const produit = await prisma.produit.findUnique({
        where: { id_prd: idProduit },
      });
      if (!produit) {
        return res.status(404).json({ message: "Produit introuvable." });
      }

      const debutEffectif =
        debut_promo !== undefined
          ? debut_promo
          : produit.debut_promo;
      const finEffective =
        fin_promo !== undefined ? fin_promo : produit.fin_promo;
      if (
        debutEffectif &&
        finEffective &&
        new Date(finEffective) < new Date(debutEffectif)
      ) {
        return res.status(400).json({
          message:
            "La date de fin de promo doit être après la date de début.",
        });
      }

      const produitModifie = await prisma.$transaction(async (tx) => {
        if (prix_vente !== undefined) {
          const nouveauPrix =
            prix_vente === null ? null : parseFloat(prix_vente);
          await appliquerNouveauPrixVente(tx, produit, nouveauPrix);
        }

        const dataToUpdate = {};
        if (prix_vente !== undefined) {
          dataToUpdate.prix_vente =
            prix_vente === null ? null : parseFloat(prix_vente);
        }
        if (prix_promo !== undefined) {
          dataToUpdate.prix_promo =
            prix_promo === null ? null : parseFloat(prix_promo);
        }
        if (debut_promo !== undefined) {
          dataToUpdate.debut_promo =
            debut_promo === null ? null : new Date(debut_promo);
        }
        if (fin_promo !== undefined) {
          dataToUpdate.fin_promo =
            fin_promo === null ? null : new Date(fin_promo);
        }

        if (Object.keys(dataToUpdate).length === 0) {
          return produit;
        }

        return tx.produit.update({
          where: { id_prd: idProduit },
          data: dataToUpdate,
        });
      });

      res.status(200).json(produitModifie);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const getHistoriquePrixProduit = async (req, res) => {
  const idProduit = parseInt(req.params.id, 10);
  if (isNaN(idProduit)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const produit = await prisma.produit.findUnique({
      where: { id_prd: idProduit },
      select: { id_prd: true },
    });
    if (!produit) {
      return res.status(404).json({ message: "Produit introuvable." });
    }

    const historique = await prisma.historique_prix_vente.findMany({
      where: { prd_id: idProduit },
      orderBy: { date_debut: "desc" },
    });

    res.status(200).json(historique);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const addImageProduit = [
  body("url_image")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("L'URL de l'image est obligatoire"),
  body("est_principale")
    .optional()
    .isBoolean()
    .withMessage("L'image principale doit être un booléen"),
  body("ordre_image")
    .optional()
    .isInt({ min: 0 })
    .withMessage("L'ordre de l'image doit être un entier positif ou nul"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idProduit = parseInt(req.params.id, 10);
    if (isNaN(idProduit)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const { url_image, est_principale, ordre_image } = req.body;

    try {
      const produit = await prisma.produit.findUnique({
        where: { id_prd: idProduit },
        select: { id_prd: true },
      });
      if (!produit) {
        return res.status(404).json({ message: "Produit introuvable." });
      }

      const nouvelleImage = await prisma.$transaction(async (tx) => {
        const nbImages = await tx.image_produit.count({
          where: { prd_id: idProduit },
        });
        const principale =
          est_principale === true || nbImages === 0 ? true : false;

        if (principale) {
          await tx.image_produit.updateMany({
            where: { prd_id: idProduit },
            data: { est_principale: false },
          });
        }

        const idImage = await getMaxValue("image_produit", "id_img", null);

        return tx.image_produit.create({
          data: {
            id_img: idImage,
            url_image: url_image.trim(),
            est_principale: principale,
            ordre_image:
              ordre_image !== undefined ? parseInt(ordre_image, 10) : 0,
            prd_id: idProduit,
          },
        });
      });

      res.status(201).json(nouvelleImage);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

const TYPES_IMAGE_ACCEPTES = ["image/jpeg", "image/png", "image/webp"];
const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;

const televersementImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAILLE_MAX_IMAGE },
  fileFilter: (req, fichier, cb) => {
    if (TYPES_IMAGE_ACCEPTES.includes(fichier.mimetype)) cb(null, true);
    else cb(new Error("TYPE_IMAGE_NON_SUPPORTE"));
  },
});

export const uploadImageProduit = async (req, res) => {
  const idProduit = parseInt(req.params.id, 10);
  if (isNaN(idProduit)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  if (!isCloudinaryConfigured) {
    return res.status(503).json({
      message:
        "Cloudinary n'est pas configuré. Ajoutez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET dans le fichier .env du backend.",
    });
  }

  const produit = await prisma.produit.findUnique({
    where: { id_prd: idProduit },
    select: { id_prd: true },
  });
  if (!produit) {
    return res.status(404).json({ message: "Produit introuvable." });
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

    const estPrincipale = req.body.est_principale === "true";
    const ordreImage = req.body.ordre_image
      ? parseInt(req.body.ordre_image, 10)
      : 0;

    let resultat;
    try {
      resultat = await uploadImageBuffer(req.file.buffer);
    } catch (erreur) {
      return res.status(500).json({
        message: `Échec de l'envoi vers Cloudinary : ${erreur.message}`,
      });
    }

    try {
      const nouvelleImage = await prisma.$transaction(async (tx) => {
        const nbImages = await tx.image_produit.count({
          where: { prd_id: idProduit },
        });
        const principale = estPrincipale || nbImages === 0;

        if (principale) {
          await tx.image_produit.updateMany({
            where: { prd_id: idProduit },
            data: { est_principale: false },
          });
        }

        const idImage = await getMaxValue("image_produit", "id_img", null);

        return tx.image_produit.create({
          data: {
            id_img: idImage,
            url_image: resultat.secure_url,
            public_id: resultat.public_id,
            est_principale: principale,
            ordre_image: isNaN(ordreImage) ? 0 : ordreImage,
            prd_id: idProduit,
          },
        });
      });

      res.status(201).json(nouvelleImage);
    } catch (erreur) {
      try {
        await deleteCloudinaryImage(resultat.public_id);
      } catch (e) {
        // La ligne n'a pas été créée, l'image reste sur Cloudinary.
      }
      res
        .status(500)
        .json({ error: { code: erreur.code, message: erreur.message } });
    }
  });
};

export const deleteImageProduit = async (req, res) => {
  const idProduit = parseInt(req.params.id, 10);
  const idImage = parseInt(req.params.idImage, 10);
  if (isNaN(idProduit) || isNaN(idImage)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const image = await prisma.image_produit.findFirst({
      where: { id_img: idImage, prd_id: idProduit },
    });
    if (!image) {
      return res.status(404).json({ message: "Image introuvable." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.image_produit.delete({ where: { id_img: idImage } });

      if (image.est_principale) {
        const suivante = await tx.image_produit.findFirst({
          where: { prd_id: idProduit },
          orderBy: [{ ordre_image: "asc" }, { id_img: "asc" }],
        });
        if (suivante) {
          await tx.image_produit.update({
            where: { id_img: suivante.id_img },
            data: { est_principale: true },
          });
        }
      }
    });

    if (image.public_id) {
      try {
        await deleteCloudinaryImage(image.public_id);
      } catch (e) {
        // La ligne est supprimée, l'image reste sur Cloudinary.
      }
    }

    res.status(200).json({ message: "Image supprimée avec succès." });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const setImagePrincipale = async (req, res) => {
  const idProduit = parseInt(req.params.id, 10);
  const idImage = parseInt(req.params.idImage, 10);
  if (isNaN(idProduit) || isNaN(idImage)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const image = await prisma.image_produit.findFirst({
      where: { id_img: idImage, prd_id: idProduit },
    });
    if (!image) {
      return res.status(404).json({ message: "Image introuvable." });
    }

    const imagePrincipale = await prisma.$transaction(async (tx) => {
      await tx.image_produit.updateMany({
        where: { prd_id: idProduit },
        data: { est_principale: false },
      });
      return tx.image_produit.update({
        where: { id_img: idImage },
        data: { est_principale: true },
      });
    });

    res.status(200).json(imagePrincipale);
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};

export const addPalier = [
  body("quantite_min")
    .isInt({ min: 1 })
    .withMessage("La quantité minimum doit être un entier supérieur à 0"),
  body("prix_unitaire")
    .isFloat({ gt: 0 })
    .withMessage("Le prix unitaire doit être supérieur à 0"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idProduit = parseInt(req.params.id, 10);
    if (isNaN(idProduit)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const { quantite_min, prix_unitaire } = req.body;

    try {
      const produit = await prisma.produit.findUnique({
        where: { id_prd: idProduit },
        select: { id_prd: true },
      });
      if (!produit) {
        return res.status(404).json({ message: "Produit introuvable." });
      }

      const existant = await prisma.palier_prix.findFirst({
        where: {
          prd_id: idProduit,
          quantite_min: parseInt(quantite_min, 10),
        },
      });
      if (existant) {
        return res.status(409).json({
          message: "Un palier existe déjà pour cette quantité minimum.",
        });
      }

      const idPalier = await getMaxValue("palier_prix", "id_palier", null);

      const nouveauPalier = await prisma.palier_prix.create({
        data: {
          id_palier: idPalier,
          quantite_min: parseInt(quantite_min, 10),
          prix_unitaire: parseFloat(prix_unitaire),
          prd_id: idProduit,
        },
      });

      res.status(201).json(nouveauPalier);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const updatePalier = [
  body("quantite_min")
    .optional()
    .isInt({ min: 1 })
    .withMessage("La quantité minimum doit être un entier supérieur à 0"),
  body("prix_unitaire")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Le prix unitaire doit être supérieur à 0"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idProduit = parseInt(req.params.id, 10);
    const idPalier = parseInt(req.params.idPalier, 10);
    if (isNaN(idProduit) || isNaN(idPalier)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const { quantite_min, prix_unitaire } = req.body;

    try {
      const palier = await prisma.palier_prix.findFirst({
        where: { id_palier: idPalier, prd_id: idProduit },
      });
      if (!palier) {
        return res.status(404).json({ message: "Palier introuvable." });
      }

      const dataToUpdate = {};
      if (quantite_min !== undefined) {
        const conflit = await prisma.palier_prix.findFirst({
          where: {
            prd_id: idProduit,
            quantite_min: parseInt(quantite_min, 10),
            id_palier: { not: idPalier },
          },
        });
        if (conflit) {
          return res.status(409).json({
            message: "Un palier existe déjà pour cette quantité minimum.",
          });
        }
        dataToUpdate.quantite_min = parseInt(quantite_min, 10);
      }
      if (prix_unitaire !== undefined) {
        dataToUpdate.prix_unitaire = parseFloat(prix_unitaire);
      }

      if (Object.keys(dataToUpdate).length === 0) {
        return res
          .status(400)
          .json({ message: "Aucune donnée à mettre à jour fournie." });
      }

      const palierModifie = await prisma.palier_prix.update({
        where: { id_palier: idPalier },
        data: dataToUpdate,
      });

      res.status(200).json(palierModifie);
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const deletePalier = async (req, res) => {
  const idProduit = parseInt(req.params.id, 10);
  const idPalier = parseInt(req.params.idPalier, 10);
  if (isNaN(idProduit) || isNaN(idPalier)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const palier = await prisma.palier_prix.findFirst({
      where: { id_palier: idPalier, prd_id: idProduit },
    });
    if (!palier) {
      return res.status(404).json({ message: "Palier introuvable." });
    }

    await prisma.palier_prix.delete({ where: { id_palier: idPalier } });

    res.status(200).json({ message: "Palier supprimé avec succès." });
  } catch (error) {
    res
      .status(500)
      .json({ error: { code: error.code, message: error.message } });
  }
};
