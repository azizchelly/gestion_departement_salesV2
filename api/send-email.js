// api/send-email.js
// Fonction serverless Vercel — envoie un email via Mailjet API v3.1

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
      return res.status(400).json({ error: "Champs requis manquants" });
    }

    // Debug : log les 4 premiers caractères des clés pour vérifier
    console.log('API Key prefix:', apiKey.substring(0, 4));
    console.log('Secret Key prefix:', secretKey.substring(0, 4));

    const resp = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${secretKey}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Messages: [{
          From: {
            Email: 'aziz.chelly@esprit.tn',
            Name: from_name || 'SalesFlow Pro'
          },
          To: [{ Email: to }],
          Subject: subject,
          HTMLPart: html,
        }]
      }),
    });

    const text = await resp.text();
    console.log('Mailjet response status:', resp.status);
    console.log('Mailjet response body:', text);

    let data;
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }

    if (!resp.ok) {
      return res.status(resp.status).json({ 
        error: data?.ErrorMessage || data?.Messages?.[0]?.Errors?.[0]?.ErrorMessage || text 
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Send email error:', err);
    return res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
}
