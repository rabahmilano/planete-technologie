import prisma from "../config/dbConfig.js";
import { body, validationResult } from "express-validator";
import { televersementImage } from "../config/multerImage.js";
import {
  isCloudinaryConfigured,
  uploadImageBuffer,
  deleteCloudinaryImage,
} from "../config/cloudinary.js";
import {
  getMaxValue,
  genererSlug,
  getPrixEffectifProduit,
  POIDS_DEFAUT_GRAMMES,
  poidsAStockerGrammes,
  messageErreurTechnique,
} from "../config/utils.js";
import {
  chargerContextePromotions,
  promoGagnante as calculerPromoGagnante,
} from "../config/promotions.js";
import {
  calculerAideDecisionProduit,
  formaterAideDecision,
} from "../config/aideDecision.js";

const STATUTS_PUBLICATION = ["BROUILLON", "PUBLIE", "ARCHIVE"];

const REGEX_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MESSAGE_FORMAT_SLUG =
  "Le slug doit être en minuscules, sans accents ni espaces : lettres a-z, chiffres 0-9 et tirets uniquement (ex. : chargeur-ugreen-30w).";

const NB_IMAGES_MAX = 7;

const verifierPublication = async (produit) => {
  const manquants = [];
  if (!produit.intitule_publication?.trim())
    manquants.push("un intitulé de publication");
  if (!produit.description) manquants.push("une description");
  if (!produit.famille_id) manquants.push("une famille");
  if (!produit.slug_prd) manquants.push("un slug");
  if (produit.prix_vente === null || produit.prix_vente === undefined)
    manquants.push("un prix de vente");
  if (
    produit.poids_grammes !== null &&
    produit.poids_grammes !== undefined &&
    produit.poids_grammes > 5000 &&
    (produit.longueur_cm === null ||
      produit.longueur_cm === undefined ||
      produit.largeur_cm === null ||
      produit.largeur_cm === undefined ||
      produit.hauteur_cm === null ||
      produit.hauteur_cm === undefined)
  )
    manquants.push("les dimensions du colis (poids > 5 kg)");
  const nbImages = await prisma.image_produit.count({
    where: { prd_id: produit.id_prd },
  });
  if (nbImages < 2) manquants.push("au moins 2 images");
  return manquants;
};

// Un produit PUBLIE doit toujours remplir les conditions de publication.
// Après toute modification (champ, prix ou image), on revérifie : s'il
// manque quelque chose, le produit repasse BROUILLON et la raison est
// renvoyée pour informer l'admin. Rien ne change pour un produit déjà
// BROUILLON ou ARCHIVE.
const depublierSiIncomplet = async (produit) => {
  if (produit.statut_publication !== "PUBLIE") return null;
  const manquants = await verifierPublication(produit);
  if (manquants.length === 0) return null;
  await prisma.produit.update({
    where: { id_prd: produit.id_prd },
    data: { statut_publication: "BROUILLON" },
  });
  return manquants;
};

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

    const contextePromotions = await chargerContextePromotions();
    const gagnante = calculerPromoGagnante(produit, contextePromotions);

    const reponse = {
      ...produit,
      prix_effectif: getPrixEffectifProduit(produit, produit.paliers, 1, gagnante),
      promo_active: gagnante !== null,
      promotion_active: gagnante
        ? {
            id_promotion: gagnante.promotion.id_promotion,
            type_reduction: gagnante.promotion.type_reduction,
            valeur_reduction: parseFloat(gagnante.promotion.valeur_reduction),
            date_fin: gagnante.promotion.date_fin,
          }
        : null,
    };

    // Aide à la décision (KPI achat/vente) : uniquement sur demande
    // explicite (?aide_decision=1) — la liste des produits appelle cet
    // endpoint pour chaque ligne et n'en a pas besoin. Cas vide : null.
    if (req.query.aide_decision === "1") {
      reponse.aide_decision = formaterAideDecision(
        await calculerAideDecisionProduit(idProduit),
      );
    }

    res.status(200).json(reponse);
  } catch (error) {
    console.error("getProduitEcommerce:", error);
    res.status(500).json({ message: messageErreurTechnique(error, "Le chargement du produit") });
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
  body("longueur_cm")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("La longueur doit être un entier supérieur à 0"),
  body("largeur_cm")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("La largeur doit être un entier supérieur à 0"),
  body("hauteur_cm")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("La hauteur doit être un entier supérieur à 0"),
  body("slug_prd")
    .optional({ nullable: true })
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Le slug du produit est obligatoire")
    .matches(REGEX_SLUG)
    .withMessage(MESSAGE_FORMAT_SLUG)
    .isLength({ max: 200 })
    .withMessage("Le slug ne peut pas dépasser 200 caractères"),
  body("intitule_publication")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 150 })
    .withMessage("L'intitulé de publication ne peut pas dépasser 150 caractères"),
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
      longueur_cm,
      largeur_cm,
      hauteur_cm,
      slug_prd,
      intitule_publication,
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
        // Poids vide → défaut (200 g) STOCKÉ sur le produit.
        dataToUpdate.poids_grammes = poidsAStockerGrammes(poids_grammes);
      }
      if (longueur_cm !== undefined) {
        dataToUpdate.longueur_cm =
          longueur_cm === null ? null : parseInt(longueur_cm, 10);
      }
      if (largeur_cm !== undefined) {
        dataToUpdate.largeur_cm =
          largeur_cm === null ? null : parseInt(largeur_cm, 10);
      }
      if (hauteur_cm !== undefined) {
        dataToUpdate.hauteur_cm =
          hauteur_cm === null ? null : parseInt(hauteur_cm, 10);
      }
      if (slug_prd !== undefined) {
        if (slug_prd === null) {
          dataToUpdate.slug_prd = null;
        } else {
          const slugSaisi = slug_prd.trim();
          const conflit = await prisma.produit.findFirst({
            where: {
              slug_prd: slugSaisi,
              id_prd: { not: idProduit },
            },
          });
          if (conflit) {
            return res
              .status(409)
              .json({ message: "Ce slug est déjà utilisé par un produit." });
          }
          dataToUpdate.slug_prd = slugSaisi;
        }
      }
      if (intitule_publication !== undefined) {
        dataToUpdate.intitule_publication = intitule_publication || null;
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

      if (
        statut_publication === "PUBLIE" &&
        produit.statut_publication !== "PUBLIE"
      ) {
        const produitFutur = { ...produit, ...dataToUpdate };
        // Poids : à la publication, un poids vide est rempli avec le défaut
        // (200 g) et STOCKÉ sur le produit, puis la publication continue.
        if (
          produitFutur.poids_grammes === null ||
          produitFutur.poids_grammes === undefined
        ) {
          dataToUpdate.poids_grammes = POIDS_DEFAUT_GRAMMES;
          produitFutur.poids_grammes = POIDS_DEFAUT_GRAMMES;
        }
        const manquants = await verifierPublication(produitFutur);
        if (manquants.length > 0) {
          return res.status(400).json({
            message:
              "Publication impossible. Il manque : " +
              manquants.join(", ") +
              ".",
          });
        }
      }

      const produitModifie = await prisma.produit.update({
        where: { id_prd: idProduit },
        data: dataToUpdate,
      });

      const manquants = await depublierSiIncomplet(produitModifie);
      if (manquants) {
        return res.status(200).json({
          ...produitModifie,
          statut_publication: "BROUILLON",
          depublication_auto: { manquants },
        });
      }

      res.status(200).json(produitModifie);
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ message: "Ce slug est déjà utilisé par un produit." });
      }
      console.error("updateProduitEcommerce:", error);
      return res.status(500).json({ message: messageErreurTechnique(error) });
    }
  },
];

export const updatePrixProduit = [
  body("prix_vente")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Le prix de vente doit être un nombre positif ou nul"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idProduit = parseInt(req.params.id, 10);
    if (isNaN(idProduit)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const { prix_vente } = req.body;

    try {
      const produit = await prisma.produit.findUnique({
        where: { id_prd: idProduit },
      });
      if (!produit) {
        return res.status(404).json({ message: "Produit introuvable." });
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

        if (Object.keys(dataToUpdate).length === 0) {
          return produit;
        }

        return tx.produit.update({
          where: { id_prd: idProduit },
          data: dataToUpdate,
        });
      });

      let manquants = null;
      if (prix_vente !== undefined) {
        manquants = await depublierSiIncomplet(produitModifie);
      }
      if (manquants) {
        return res.status(200).json({
          ...produitModifie,
          statut_publication: "BROUILLON",
          depublication_auto: { manquants },
        });
      }

      res.status(200).json(produitModifie);
    } catch (error) {
      console.error("updatePrixProduit:", error);
      res.status(500).json({ message: messageErreurTechnique(error) });
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

      const nbImagesExistantes = await prisma.image_produit.count({
        where: { prd_id: idProduit },
      });
      if (nbImagesExistantes >= NB_IMAGES_MAX) {
        return res.status(400).json({
          message: `Nombre maximum d'images atteint (${NB_IMAGES_MAX} par produit).`,
        });
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

  const nbImagesAvant = await prisma.image_produit.count({
    where: { prd_id: idProduit },
  });
  if (nbImagesAvant >= NB_IMAGES_MAX) {
    return res.status(400).json({
      message: `Nombre maximum d'images atteint (${NB_IMAGES_MAX} par produit).`,
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

    const estPrincipale = req.body.est_principale === "true";
    const ordreImage = req.body.ordre_image
      ? parseInt(req.body.ordre_image, 10)
      : 0;
    const nomImage = req.body.nom_image
      ? genererSlug(String(req.body.nom_image))
      : null;

    let resultat;
    try {
      resultat = await uploadImageBuffer(req.file.buffer, {
        publicId: nomImage ? `${nomImage}-${Date.now()}` : undefined,
      });
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

    const produit = await prisma.produit.findUnique({
      where: { id_prd: idProduit },
    });
    const manquants = produit ? await depublierSiIncomplet(produit) : null;

    res.status(200).json({
      message: "Image supprimée avec succès.",
      ...(manquants ? { depublication_auto: { manquants } } : {}),
    });
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

export const ordreImagesProduit = [
  body("ordre")
    .isArray({ min: 1 })
    .withMessage("Le nouvel ordre doit être une liste d'images"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const idProduit = parseInt(req.params.id, 10);
    if (isNaN(idProduit)) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const { ordre } = req.body;

    try {
      const ids = ordre.map((o) => parseInt(o.id_img, 10));
      if (ids.some((id) => isNaN(id))) {
        return res.status(400).json({ message: "Identifiant d'image invalide." });
      }
      if (new Set(ids).size !== ids.length) {
        return res.status(400).json({
          message: "Chaque image ne peut apparaître qu'une fois dans l'ordre.",
        });
      }
      const imagesProduit = await prisma.image_produit.findMany({
        where: { prd_id: idProduit },
        select: { id_img: true },
      });
      const idsExistants = imagesProduit.map((img) => img.id_img);
      const listeComplete =
        idsExistants.length === ids.length &&
        ids.every((id) => idsExistants.includes(id));
      if (!listeComplete) {
        return res.status(400).json({
          message:
            "L'ordre envoyé doit contenir exactement toutes les images du produit.",
        });
      }

      await prisma.$transaction(
        ids.map((id_img, position) =>
          prisma.image_produit.update({
            where: { id_img },
            data: { ordre_image: position },
          }),
        ),
      );

      res.status(200).json({ message: "Ordre des images mis à jour." });
    } catch (error) {
      res
        .status(500)
        .json({ error: { code: error.code, message: error.message } });
    }
  },
];

export const rotationImageProduit = async (req, res) => {
  const idProduit = parseInt(req.params.id, 10);
  const idImage = parseInt(req.params.idImage, 10);
  if (isNaN(idProduit) || isNaN(idImage)) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  if (!isCloudinaryConfigured) {
    return res.status(503).json({
      message:
        "Cloudinary n'est pas configuré. Ajoutez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET dans le fichier .env du backend.",
    });
  }

  try {
    const image = await prisma.image_produit.findFirst({
      where: { id_img: idImage, prd_id: idProduit },
    });
    if (!image) {
      return res.status(404).json({ message: "Image introuvable." });
    }
    if (!image.public_id) {
      return res.status(400).json({
        message:
          "Cette image n'a pas de fichier Cloudinary associé et ne peut pas être pivotée.",
      });
    }

    const reponse = await fetch(image.url_image);
    if (!reponse.ok) {
      return res.status(500).json({
        message: `Téléchargement de l'image impossible (statut ${reponse.status}).`,
      });
    }
    const tampon = Buffer.from(await reponse.arrayBuffer());
    const resultat = await uploadImageBuffer(tampon, {
      publicId: `rotation-${Date.now()}`,
      transformation: [{ angle: 90 }],
    });

    const imagePivotee = await prisma.image_produit.update({
      where: { id_img: idImage },
      data: {
        url_image: resultat.eager?.[0]?.secure_url || resultat.secure_url,
        public_id: resultat.public_id,
      },
    });

    try {
      await deleteCloudinaryImage(image.public_id);
    } catch (e) {
      // L'ancien fichier reste sur Cloudinary si sa suppression échoue.
    }

    res.status(200).json(imagePivotee);
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
