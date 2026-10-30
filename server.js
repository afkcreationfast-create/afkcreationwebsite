require("dotenv").config();

const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DOMAIN = (process.env.ROOT_DOMAIN || "afkcreation.site").toLowerCase();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost")
    ? false : { rejectUnauthorized: false }
});

if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      frameAncestors: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

const RESERVED = new Set([
  "www", "app", "api", "admin", "mail", "ftp", "smtp", "support",
  "status", "docs", "help", "blog", "static", "assets"
]);

function getSubdomain(hostHeader) {
  const host = String(hostHeader || "").split(":")[0].toLowerCase();
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}` || host === "localhost" || host.endsWith(".onrender.com")) return null;
  const suffix = `.${ROOT_DOMAIN}`;
  if (!host.endsWith(suffix)) return null;
  const prefix = host.slice(0, -suffix.length);
  // Only one-level customer subdomains are supported in this starter.
  if (!prefix || prefix.includes(".")) return null;
  return prefix;
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Connecte-toi pour continuer." });
  next();
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sites (
      id BIGSERIAL PRIMARY KEY,
      owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subdomain TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      theme TEXT NOT NULL DEFAULT 'midnight',
      content JSONB NOT NULL DEFAULT '{}'::jsonb,
      published BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS sites_owner_id_idx ON sites(owner_id);
  `);
}

app.get("/health", (_req, res) => res.json({ ok: true, app: "AFK Creation" }));

// Customer subdomain routing: published sites are served from the same Render service.
app.get("*", async (req, res, next) => {
  const subdomain = getSubdomain(req.hostname);
  if (!subdomain) return next();
  try {
    const result = await pool.query(
      "SELECT title, description, theme, content FROM sites WHERE subdomain = $1 AND published = TRUE",
      [subdomain]
    );
    if (!result.rowCount) return res.status(404).sendFile(path.join(__dirname, "public", "not-found.html"));
    return res.send(renderPublishedSite(result.rows[0]));
  } catch (err) {
    console.error("Subdomain lookup failed:", err);
    return res.status(500).send("Une erreur est survenue.");
  }
});

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function renderPublishedSite(site) {
  const c = site.content || {};
  const title = escapeHtml(site.title);
  const description = escapeHtml(site.description);
  const hero = escapeHtml(c.hero || site.title);
  const intro = escapeHtml(c.intro || site.description || "Bienvenue sur notre site.");
  const button = escapeHtml(c.button || "Nous contacter");
  const contact = escapeHtml(c.contact || "");
  const theme = site.theme === "light" ? "light" : "dark";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${description}"><title>${title}</title><style>
  *{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,Arial,sans-serif;background:${theme === "dark" ? "#090d18" : "#f5f7fb"};color:${theme === "dark" ? "#f4f6ff" : "#151b2c"}}
  .wrap{max-width:1080px;margin:auto;padding:28px}.nav{display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:1px solid ${theme === "dark" ? "#252c40" : "#dfe4ee"}}
  .brand{font-weight:800;letter-spacing:-.04em}.pill{border:1px solid #64748b;border-radius:999px;padding:9px 14px;color:inherit;text-decoration:none;font-size:13px}
  .hero{min-height:68vh;display:flex;flex-direction:column;justify-content:center;max-width:780px}.eyebrow{color:#8b9cff;text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:800}
  h1{font-size:clamp(42px,8vw,82px);line-height:.98;letter-spacing:-.065em;margin:22px 0}.intro{font-size:clamp(17px,2vw,21px);line-height:1.7;opacity:.76;max-width:650px}
  .cta{display:inline-block;margin-top:24px;background:#7867ff;color:white;text-decoration:none;padding:14px 20px;border-radius:12px;font-weight:700}
  footer{padding:30px 0;border-top:1px solid ${theme === "dark" ? "#252c40" : "#dfe4ee"};opacity:.65;font-size:13px}
  </style></head><body><div class="wrap"><nav class="nav"><div class="brand">${title}</div><a class="pill" href="#contact">Contact</a></nav><main class="hero"><div class="eyebrow">Bienvenue</div><h1>${hero}</h1><p class="intro">${intro}</p>${contact ? `<a class="cta" href="mailto:${encodeURIComponent(contact)}">${button}</a>` : ""}</main><footer id="contact">Créé avec AFK Creation · ${title}</footer></div></body></html>`;
}

// Main app assets are only served on the root domain / Render hostname.
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/me", async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const result = await pool.query("SELECT id, email FROM users WHERE id = $1", [req.session.userId]);
  res.json({ user: result.rows[0] || null });
});

app.post("/api/register", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Adresse e-mail invalide." });
  if (password.length < 10) return res.status(400).json({ error: "Choisis un mot de passe d'au moins 10 caractères." });
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query("INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id,email", [email, hash]);
    req.session.userId = result.rows[0].id;
    res.json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Cette adresse e-mail possède déjà un compte." });
    console.error(err); res.status(500).json({ error: "Impossible de créer le compte." });
  }
});

app.post("/api/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const result = await pool.query("SELECT id,email,password_hash FROM users WHERE email=$1", [email]);
  if (!result.rowCount || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
    return res.status(401).json({ error: "Identifiants incorrects." });
  }
  req.session.userId = result.rows[0].id;
  res.json({ user: { id: result.rows[0].id, email: result.rows[0].email } });
});

app.post("/api/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get("/api/sites", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT id,subdomain,title,description,theme,content,published,updated_at FROM sites WHERE owner_id=$1 ORDER BY updated_at DESC",
    [req.session.userId]
  );
  res.json({ sites: result.rows });
});

app.post("/api/sites", requireAuth, async (req, res) => {
  const subdomain = String(req.body.subdomain || "").trim().toLowerCase();
  const title = String(req.body.title || "").trim().slice(0, 70);
  const description = String(req.body.description || "").trim().slice(0, 240);
  const theme = req.body.theme === "light" ? "light" : "midnight";
  const content = {
    hero: String(req.body.hero || title).slice(0, 120),
    intro: String(req.body.intro || description).slice(0, 500),
    button: String(req.body.button || "Nous contacter").slice(0, 40),
    contact: String(req.body.contact || "").slice(0, 160)
  };
  if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(subdomain) || RESERVED.has(subdomain)) {
    return res.status(400).json({ error: "Sous-domaine invalide ou réservé (3 à 30 caractères, lettres, chiffres et tirets)." });
  }
  if (!title) return res.status(400).json({ error: "Le nom du site est obligatoire." });
  try {
    const result = await pool.query(
      `INSERT INTO sites(owner_id,subdomain,title,description,theme,content,published)
       VALUES($1,$2,$3,$4,$5,$6::jsonb,FALSE)
       RETURNING id,subdomain,title,description,theme,content,published`,
      [req.session.userId, subdomain, title, description, theme, JSON.stringify(content)]
    );
    res.status(201).json({ site: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Ce sous-domaine est déjà utilisé." });
    console.error(err); res.status(500).json({ error: "Impossible de créer le site." });
  }
});

app.put("/api/sites/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const title = String(req.body.title || "").trim().slice(0, 70);
  const description = String(req.body.description || "").trim().slice(0, 240);
  const theme = req.body.theme === "light" ? "light" : "midnight";
  const content = {
    hero: String(req.body.hero || title).slice(0, 120),
    intro: String(req.body.intro || description).slice(0, 500),
    button: String(req.body.button || "Nous contacter").slice(0, 40),
    contact: String(req.body.contact || "").slice(0, 160)
  };
  const result = await pool.query(
    `UPDATE sites SET title=$1,description=$2,theme=$3,content=$4::jsonb,updated_at=NOW()
     WHERE id=$5 AND owner_id=$6 RETURNING id,subdomain,title,description,theme,content,published`,
    [title, description, theme, JSON.stringify(content), id, req.session.userId]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Site introuvable." });
  res.json({ site: result.rows[0] });
});

app.post("/api/sites/:id/publish", requireAuth, async (req, res) => {
  const result = await pool.query(
    "UPDATE sites SET published=TRUE,updated_at=NOW() WHERE id=$1 AND owner_id=$2 RETURNING subdomain",
    [Number(req.params.id), req.session.userId]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Site introuvable." });
  res.json({ url: `https://${result.rows[0].subdomain}.${ROOT_DOMAIN}` });
});

app.post("/api/sites/:id/unpublish", requireAuth, async (req, res) => {
  const result = await pool.query(
    "UPDATE sites SET published=FALSE,updated_at=NOW() WHERE id=$1 AND owner_id=$2 RETURNING id",
    [Number(req.params.id), req.session.userId]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Site introuvable." });
  res.json({ ok: true });
});

app.get("/api/check-subdomain/:name", async (req, res) => {
  const name = String(req.params.name || "").toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(name) || RESERVED.has(name)) return res.json({ available: false });
  const result = await pool.query("SELECT 1 FROM sites WHERE subdomain=$1", [name]);
  res.json({ available: result.rowCount === 0 });
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

function escapeForClient(value) { return JSON.stringify(value).replace(/</g, "\\u003c"); }

ensureSchema().then(() => {
  app.listen(PORT, () => console.log(`AFK Creation listening on ${PORT}`));
}).catch(err => {
  console.error("Database initialization failed:", err);
  process.exit(1);
});
