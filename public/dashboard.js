const list = document.getElementById("siteList");
const error = document.getElementById("createError");
async function api(url, options = {}) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur serveur.");
  return data;
}
function safe(text) { return String(text || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
async function loadSites() {
  try {
    const me = await api("/api/me");
    if (!me.user) return location.replace("/");
    document.getElementById("welcome").textContent = `Connecté en tant que ${me.user.email}`;
    const data = await api("/api/sites");
    if (!data.sites.length) { list.className = "empty"; list.textContent = "Tu n'as pas encore créé de site. Ton premier projet peut commencer maintenant."; return; }
    list.className = "";
    list.innerHTML = data.sites.map(site => `<article class="site-item"><div><b>${safe(site.title)}</b><small>${safe(site.subdomain)}.afkcreation.site · <span class="${site.published ? "status" : ""}">${site.published ? "Publié" : "Brouillon"}</span></small></div><div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end"><button class="btn btn-outline" data-publish="${site.id}" ${site.published ? "disabled" : ""}>${site.published ? "En ligne" : "Publier"}</button>${site.published ? `<a class="btn btn-primary" target="_blank" rel="noopener" href="https://${encodeURIComponent(site.subdomain)}.afkcreation.site">Voir ↗</a>` : ""}</div></article>`).join("");
    list.querySelectorAll("[data-publish]").forEach(button => button.addEventListener("click", async () => {
      button.disabled = true;
      try { const result = await api(`/api/sites/${button.dataset.publish}/publish`, { method: "POST" }); await loadSites(); }
      catch (e) { alert(e.message); button.disabled = false; }
    }));
  } catch (e) { list.textContent = e.message; }
}
document.getElementById("createForm").addEventListener("submit", async e => {
  e.preventDefault(); error.textContent = "";
  const button = e.submitter; button.disabled = true; button.textContent = "Création…";
  const payload = {
    title: document.getElementById("siteTitle").value,
    subdomain: document.getElementById("subdomain").value,
    description: document.getElementById("description").value,
    hero: document.getElementById("hero").value,
    intro: document.getElementById("intro").value,
    contact: document.getElementById("contact").value,
    theme: document.getElementById("theme").value
  };
  try { await api("/api/sites", { method: "POST", body: JSON.stringify(payload) }); e.target.reset(); await loadSites(); }
  catch (err) { error.textContent = err.message; }
  finally { button.disabled = false; button.textContent = "Créer mon site ↗"; }
});
document.getElementById("logout").addEventListener("click", async () => { await api("/api/logout", { method: "POST" }); location.href = "/"; });
loadSites();
