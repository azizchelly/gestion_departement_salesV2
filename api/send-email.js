// api/send-email.js
// Fonction serverless Vercel — envoie un email via Mailjet API
// Variables d'environnement requises :
//   MAILJET_API_KEY    = bb7855dd...
//   MAILJET_SECRET_KEY = 2a0774a4...

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const apiKey    = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return res.status(500).json({ error: "Clés Mailjet manquantes côté serveur" });
  }

  try {
    const { to, subject, html, from_name } = req.body || {};
    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Champs 'to', 'subject' et 'html' requis" });
    }

    // Mailjet envoie à n'importe quelle adresse sans domaine vérifié
    const credentials = Buffer.from(apiKey + ':' + secretKey).toString('base64');

    const resp = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + credentials,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Messages: [{
          From: {
            Email: 'aziz.chelly@esprit.tn',
            Name:  from_name || 'SalesFlow Pro'
          },
          To: [{ Email: to }],
          Subject: subject,
          HTMLPart: html,
        }]
      }),
    });

    const data = await resp.json();
    if (!resp.ok || data.Messages?.[0]?.Status === 'error') {
      const errMsg = data.Messages?.[0]?.Errors?.[0]?.ErrorMessage || data.ErrorMessage || 'Erreur Mailjet';
      return res.status(400).json({ error: errMsg });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
}
