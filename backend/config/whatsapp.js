const GRAPH_URL = "https://graph.facebook.com/v19.0";

export const estConfigure = () =>
  Boolean(
    process.env.WHATSAPP_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.ADMIN_WHATSAPP_NUMBERS,
  );

export const numerosAdmin = () =>
  (process.env.ADMIN_WHATSAPP_NUMBERS || "")
    .split(",")
    .map((numero) => numero.trim().replace(/^\+/, ""))
    .filter((numero) => /^\d{9,15}$/.test(numero));

export const lienWaMe = (telephone, message) => {
  const numero = String(telephone || "").replace(/\D/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
};

export const envoyerNotificationCommande = async (commande) => {
  if (!estConfigure()) {
    console.log(
      "WhatsApp non configuré : notification de commande ignorée.",
    );
    return { envoye: false, raison: "non_configure" };
  }
  const numeros = numerosAdmin();
  if (numeros.length === 0) {
    console.log("WhatsApp : aucun numéro administrateur configuré.");
    return { envoye: false, raison: "aucun_numero" };
  }
  const controleur = new AbortController();
  const delai = setTimeout(() => controleur.abort(), 10000);
  const nbArticles = (commande.lignes || []).reduce(
    (total, ligne) => total + ligne.quantite,
    0,
  );
  const resultats = [];
  for (const numero of numeros) {
    try {
      const reponse = await fetch(
        `${GRAPH_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          signal: controleur.signal,
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: numero,
            type: "template",
            template: {
              name:
                process.env.WHATSAPP_TEMPLATE_NAME || "nouvelle_commande",
              language: { code: "fr" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: String(commande.id_cmd_web) },
                    { type: "text", text: commande.nom_client },
                    { type: "text", text: commande.telephone },
                    {
                      type: "text",
                      text: `${commande.wilaya} / ${commande.commune}`,
                    },
                    { type: "text", text: String(nbArticles) },
                    {
                      type: "text",
                      text: String(commande.montant_total_final),
                    },
                  ],
                },
              ],
            },
          }),
        },
      );
      if (!reponse.ok) {
        const corps = await reponse.text().catch(() => "");
        throw new Error(`WhatsApp a répondu ${reponse.status} : ${corps}`);
      }
      resultats.push({ numero, envoye: true });
    } catch (erreur) {
      console.error(
        `Échec de la notification WhatsApp vers ${numero} :`,
        erreur.message,
      );
      resultats.push({ numero, envoye: false, erreur: erreur.message });
    }
  }
  clearTimeout(delai);
  return {
    envoye: resultats.some((r) => r.envoye),
    resultats,
  };
};
