const modal = document.getElementById("authModal");
const form = document.getElementById("authForm");
const errorBox = document.getElementById("authError");
const title = document.getElementById("authTitle");
const subtitle = document.getElementById("authSubtitle");
const submit = document.getElementById("authSubmit");
const switchButton = document.getElementById("switchAuth");
let mode = "register";

document.getElementById("year").textContent = new Date().getFullYear();

function openAuth(nextMode) {
  mode = nextMode;
  title.textContent = mode === "register" ? "Crée ton compte." : "Content de te revoir.";
  subtitle.textContent = mode === "register" ? "Ton prochain site commence ici." : "Connecte-toi pour retrouver tes projets.";
  submit.textContent = mode === "register" ? "Créer mon compte ↗" : "Se connecter ↗";
  document.getElementById("password").setAttribute("autocomplete", mode === "register" ? "new-password" : "current-password");
  switchButton.textContent = mode === "register" ? "Déjà un compte ? Se connecter" : "Nouveau chez AFK ? Créer un compte";
  errorBox.textContent = "";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}
function closeAuth() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}
["signupOpen","heroStart","showcaseStart","bottomStart"].forEach(id => document.getElementById(id).addEventListener("click", () => openAuth("register")));
document.getElementById("loginOpen").addEventListener("click", () => openAuth("login"));
document.getElementById("modalClose").addEventListener("click", closeAuth);
document.getElementById("mobileMenu").addEventListener("click", () => openAuth("register"));
modal.addEventListener("click", e => { if (e.target === modal) closeAuth(); });
switchButton.addEventListener("click", () => openAuth(mode === "register" ? "login" : "register"));

form.addEventListener("submit", async e => {
  e.preventDefault();
  errorBox.textContent = "";
  submit.disabled = true;
  submit.textContent = "Patiente un instant…";
  const payload = {
    email: document.getElementById("email").value,
    password: document.getElementById("password").value
  };
  try {
    const response = await fetch(`/api/${mode}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
    window.location.href = "/dashboard.html";
  } catch (err) {
    errorBox.textContent = err.message;
  } finally {
    submit.disabled = false;
    submit.textContent = mode === "register" ? "Créer mon compte ↗" : "Se connecter ↗";
  }
});
