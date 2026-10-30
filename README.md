# AFK Creation — Website Builder Starter

Starter full-stack pour AFK Creation : site vitrine premium, inscription/connexion, tableau de bord, création de sites simples, publication et routage par sous-domaine.

## Ce que cette version fait déjà

- Page d'accueil responsive au style premium.
- Inscription et connexion avec mots de passe hachés (bcrypt).
- Sessions stockées dans PostgreSQL.
- Création de sites avec choix d'un sous-domaine.
- Vérification des sous-domaines réservés et déjà utilisés.
- Publication/dépublication.
- Routage `nom.afkcreation.site` vers le site publié correspondant.
- HTML de publication échappé côté serveur.

## Ce qui n'est pas encore inclus

Ce premier MVP n'est pas encore un constructeur visuel complet en glisser-déposer. Il crée une page vitrine simple à partir de champs. Il faudra ajouter ensuite l'éditeur visuel, les images, les pages multiples, les rôles administrateur, les limites d'usage, la modération, les sauvegardes et la protection anti-abus avant une ouverture publique à grande échelle.

## Déploiement GitHub + Render

1. Décompresse le ZIP.
2. Crée un dépôt GitHub privé nommé `afk-creation` et envoie tous les fichiers.
3. Dans Render, crée un Blueprint à partir du dépôt (le fichier `render.yaml` configure un Web Service et une base PostgreSQL).
4. Vérifie les variables d'environnement : `ROOT_DOMAIN=afkcreation.site`, `COOKIE_SECURE=true`, `TRUST_PROXY=true`. Render génère `SESSION_SECRET`.
5. Déploie et vérifie `https://TON-SERVICE.onrender.com/health`.

> Important : le plan gratuit Render peut mettre le service en veille et la base gratuite peut avoir des limites de disponibilité/rétention. Vérifie les conditions actuelles de Render avant de lancer un service public.

## Configuration DNS chez Spaceship / Render

Dans Render, ajoute le domaine racine `afkcreation.site` et le wildcard `*.afkcreation.site` au même Web Service si ton plan Render et l'écran de configuration l'autorisent. Render affichera les valeurs DNS exactes à utiliser.

Chez Spaceship, configure les enregistrements DNS exactement selon les valeurs affichées par Render. Selon le type de validation Render, le wildcard peut nécessiter un enregistrement TXT de vérification ainsi qu'un CNAME wildcard. Ne devine pas les valeurs : copie celles fournies dans le dashboard Render.

Active ensuite le certificat TLS wildcard dans Render et attends que le statut des domaines soit validé. Ne retire pas les enregistrements MX ou autres enregistrements existants.

## Sécurité et production

- Ne mets jamais de mots de passe, clés API ou secrets dans le frontend ou GitHub.
- Utilise un `SESSION_SECRET` fort, généré par Render.
- Active HTTPS et conserve `COOKIE_SECURE=true` en production.
- Avant une vraie commercialisation, ajoute une protection CSRF, rate limiting, vérification e-mail, récupération de compte, limites de publication et journalisation.
- Mets en place des sauvegardes de la base et un plan de restauration.
- Configure une politique de confidentialité et des conditions d'utilisation.
- N'autorise jamais l'exécution de HTML/JS arbitraire fourni par les clients sur le domaine principal.

## Développement local

```bash
npm install
cp .env.example .env
# Renseigne DATABASE_URL et SESSION_SECRET dans .env
npm start
```

Pour tester les sous-domaines localement, utilise un outil DNS local ou modifie temporairement ton fichier hosts. En local, le routage par sous-domaine n'est pas automatique avec `localhost`.

## Routes principales

- `GET /health`
- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `GET /api/sites`
- `POST /api/sites`
- `PUT /api/sites/:id`
- `POST /api/sites/:id/publish`
- `POST /api/sites/:id/unpublish`
- `GET /api/check-subdomain/:name`
