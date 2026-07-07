// api/create-user.js
// Fonction serverless Vercel — crée un vrai utilisateur Supabase Auth
// (Admin crée un compte Commercial ou Admin depuis l'interface).
//
// Pourquoi une fonction serveur est obligatoire ici :
// Créer un utilisateur Supabase Auth par API nécessite la "service_role key",
// une clé toute-puissante qui contourne toutes les règles de sécurité (RLS).
// Cette clé ne doit JAMAIS être envoyée au navigateur — elle doit rester
// uniquement dans une variable d'environnement côté serveur.
//
// Variables d'environnement requises sur Vercel :
//   SUPABASE_URL             = https://gmyrrcctklpflyfmgixv.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY = eyJ... (Project Settings > API > service_role, PAS anon)
//
// IMPORTANT : Cette route doit seulement être appelable par un Admin déjà connecté.
// Le frontend doit envoyer le token de session de l'Admin (Authorization: Bearer <token>)
// et cette fonction vérifie que ce token correspond bien à un compte role=admin
// avant d'autoriser la création.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: "Variables d'environnement Supabase manquantes côté serveur" });
  }

  try {
    // 1. Vérifier que l'appelant est bien un Admin authentifié
    const authHeader = req.headers.authorization || '';
    const callerToken = authHeader.replace('Bearer ', '');
    if (!callerToken) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const meRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + callerToken },
    });
    const me = await meRes.json();
    if (!meRes.ok || !me?.user_metadata || me.user_metadata.role !== 'admin') {
      return res.status(403).json({ error: "Seul un Admin peut créer un compte" });
    }

    // 2. Créer le nouvel utilisateur avec la service_role key (admin API)
    const { email, password, full_name, role } = req.body || {};
    if (!email || !password || !role) {
      return res.status(400).json({ error: "email, password et role sont requis" });
    }
    if (!['admin', 'commercial'].includes(role)) {
      return res.status(400).json({ error: "role doit être 'admin' ou 'commercial'" });
    }

    const createRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users', {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { role, full_name: full_name || email.split('@')[0] },
      }),
    });

    const created = await createRes.json();
    if (!createRes.ok) {
      return res.status(createRes.status).json({ error: created.msg || created.error_description || 'Erreur création utilisateur' });
    }

    return res.status(200).json({ user: created });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
}
