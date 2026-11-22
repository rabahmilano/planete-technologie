import multer from "multer";

const TYPES_IMAGE_ACCEPTES = ["image/jpeg", "image/png", "image/webp"];
const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;

export const televersementImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAILLE_MAX_IMAGE },
  fileFilter: (req, fichier, cb) => {
    if (TYPES_IMAGE_ACCEPTES.includes(fichier.mimetype)) cb(null, true);
    else cb(new Error("TYPE_IMAGE_NON_SUPPORTE"));
  },
});
