import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export const isCloudinaryConfigured = Boolean(
  cloudName && apiKey && apiSecret,
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

export const CLOUDINARY_DOSSIER_PRODUITS = "planete-tech/produits";

export const uploadImageBuffer = (
  buffer,
  { dossier = CLOUDINARY_DOSSIER_PRODUITS } = {},
) =>
  new Promise((resolve, reject) => {
    const flux = cloudinary.uploader.upload_stream(
      { folder: dossier, resource_type: "image" },
      (erreur, resultat) => {
        if (erreur) reject(erreur);
        else resolve(resultat);
      },
    );
    flux.end(buffer);
  });

export const deleteCloudinaryImage = async (publicId) => {
  if (!isCloudinaryConfigured || !publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
};
