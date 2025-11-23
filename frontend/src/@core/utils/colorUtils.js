/**
 * Génère une couleur HSL constante et unique à partir d'une chaîne de caractères.
 * C'est idéal pour assigner des couleurs cohérentes à des catégories dans les graphiques,
 * en s'assurant que la même catégorie a toujours la même couleur.
 * @param {string} str La chaîne de caractères à convertir en couleur (ex: "LIVRAISON").
 * @returns {string} Une couleur au format HSL (ex: "hsl(123, 75%, 60%)").
 */
export const stringToColor = str => {
  if (!str) return 'hsl(0, 0%, 80%)' // Retourne une couleur grise par défaut si la chaîne est vide

  let hash = 0
  // Boucle sur chaque caractère de la chaîne pour créer un hash numérique unique.
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  // Convertit le hash en une teinte HSL (valeur entre 0 et 360)
  const hue = hash % 360

  // Retourne une couleur HSL avec une saturation et une luminosité fixes pour une bonne visibilité.
  return `hsl(${hue}, 75%, 60%)`
}
