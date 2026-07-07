// api/analyze-bc.js
// Fonction serverless Vercel — analyse un bon de commande (image) avec Claude.
// La clé API reste ici, côté serveur, JAMAIS dans le code du navigateur.
//
// Variable d'environnement requise sur Vercel (Project Settings > Environment Variables) :
//   ANTHROPIC_API_KEY = sk-ant-xxxxxxxx
//
// Le frontend appelle simplement: fetch('/api/analyze-bc', { method:'POST', body: JSON.stringify({...}) })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY manquante côté serveur (variable d'environnement Vercel non configurée)" });
  }

  try {
    const {
      image_b64,
      devis_ref,
      devis_client,
      devis_lignes,
      devis_total_ht,
      devis_total_ttc,
    } = req.body || {};

    if (!image_b64) {
      return res.status(400).json({ error: "Image du bon de commande manquante" });
    }

    const prompt = `Tu es un expert en gestion commerciale. Analyse ce bon de commande (image) et compare-le au devis suivant :

DEVIS ${devis_ref || ''} — Client: ${devis_client || ''}
Lignes:
${devis_lignes || ''}
Total HT: ${devis_total_ht || 0} DT
Total TTC: ${devis_total_ttc || 0} DT

Vérifie:
1. Les services commandés correspondent-ils au devis ?
2. Les quantités sont-elles identiques ?
3. Le montant total correspond-il ?
4. Y a-t-il des anomalies ou points d'attention ?

Réponds en français, de façon concise et structurée.`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image_b64 } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      return res.status(anthropicRes.status).json({ error: data.error?.message || 'Erreur API Anthropic' });
    }

    const text = data.content?.find(b => b.type === 'text')?.text || '';
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
}
