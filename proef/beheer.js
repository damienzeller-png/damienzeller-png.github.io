/* Beheeromgeving van de proefsite: inloggen, berichten plaatsen en bewerken, postvak, redacteuren. */
"use strict";
const API = "https://hvdh-proef.damienzeller.workers.dev";
const STADSDELEN = ["Centrum", "Escamp", "Haagse Hout", "Laak", "Leidschenveen-Ypenburg", "Loosduinen", "Scheveningen", "Segbroek"];
const SOORTEN = { nieuws: "Nieuwsbericht", agenda: "Agenda-afspraak", succes: "Succes", petitie: "Petitie", vacature: "Vacature" };
const FORM_NAAM = { melding: "Meldingen", contact: "Contact", doemee: "Doe mee", aanmelding: "Aanmeldingen", petitie: "Handtekeningen", nieuwsbrief: "Nieuwsbrief" };
const VELD_NAAM = { email: "E-mail", telefoon: "Telefoon", stadsdeel: "Stadsdeel", rol: "Wil helpen als", takenlijst: "Wil doen", beschikbaar: "Tijd", activiteit: "Aangemeld voor", datum: "Datum", aantal: "Aantal personen", plek: "Waar", onderwerp: "Onderwerp", petitie: "Petitie", bericht: "Bericht" };
const H1 = t => `<h1 class="beheer-kop">${t}</h1>`;
let gewijzigd = false;
addEventListener("beforeunload", e => { if (gewijzigd) { e.preventDefault(); e.returnValue = ""; } });
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const app = $("#app");

let sessie = null;
try { sessie = JSON.parse(localStorage.getItem("hvdh-sessie") || "null"); } catch { sessie = null; }
const bewaar = s => { sessie = s; try { s ? localStorage.setItem("hvdh-sessie", JSON.stringify(s)) : localStorage.removeItem("hvdh-sessie"); } catch { /* geen opslag: alleen deze sessie */ } };

async function vraag(pad, opties = {}) {
  const headers = { ...(opties.headers || {}) };
  if (sessie) headers.Authorization = "Bearer " + sessie.token;
  if (opties.body && typeof opties.body === "object" && !(opties.body instanceof Blob)) { headers["Content-Type"] = "application/json"; opties.body = JSON.stringify(opties.body); }
  const r = await fetch(API + pad, { ...opties, headers });
  const d = await r.json().catch(() => ({ ok: false, fout: "Onverwacht antwoord van de server." }));
  if (r.status === 401 && sessie) { bewaar(null); inloggen("U bent uitgelogd. Log opnieuw in."); throw new Error("uitgelogd"); }
  if (!r.ok || d.ok === false) throw new Error(d.fout || "Er ging iets mis.");
  return d;
}
const melding = (el, tekst, fout) => { el.hidden = false; el.className = "melding" + (fout ? " fout" : ""); el.textContent = tekst; el.setAttribute("role", fout ? "alert" : "status"); };

// ---------- inloggen ----------
function inloggen(boodschap) {
  app.innerHTML = `<div class="inlog">
    ${H1("Inloggen redactie")}
    ${boodschap ? `<p class="melding" style="margin-top:16px">${esc(boodschap)}</p>` : ""}
    <form class="formulier" id="f-ww" style="margin-top:24px" novalidate><h2 style="font-size:1.6rem">Met naam en wachtwoord</h2>
      <div class="veld"><label for="naam">Inlognaam</label><input type="text" id="naam" autocomplete="username" autocapitalize="none"></div>
      <div class="veld"><label for="ww">Wachtwoord</label><input type="password" id="ww" autocomplete="current-password"></div>
      <button class="knop groen" type="submit">Inloggen</button><p id="m-ww" hidden></p>
      <p class="leeg" style="font-size:.92rem">Wachtwoord kwijt? Vraag de beheerder om een nieuw wachtwoord.</p></form>
    <form class="formulier" id="f-code" novalidate><h2 style="font-size:1.6rem">Beheerder: code via Telegram</h2>
      <p class="leeg">De beheerder krijgt een code van zes cijfers in Telegram.</p>
      <button class="knop lijn" type="button" id="stuur">Stuur mij een code</button>
      <div class="veld" id="code-veld" hidden><label for="code">Code uit Telegram</label><input type="text" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div>
      <button class="knop groen" type="submit" id="code-knop" hidden>Inloggen met code</button><p id="m-code" hidden></p></form></div>`;
  $("#f-ww").addEventListener("submit", async e => {
    e.preventDefault();
    const k = e.target.querySelector("button[type=submit]"); k.disabled = true; k.textContent = "Bezig…";
    try { const d = await vraag("/login", { method: "POST", body: { naam: $("#naam").value, wachtwoord: $("#ww").value } }); bewaar(d); start(); }
    catch (err) { melding($("#m-ww"), err.message, true); }
    finally { k.disabled = false; k.textContent = "Inloggen"; }
  });
  $("#stuur").addEventListener("click", async () => {
    try { await vraag("/login/code", { method: "POST" }); $("#code-veld").hidden = false; $("#code-knop").hidden = false; $("#code").focus(); melding($("#m-code"), "De code staat in Telegram. Hij is tien minuten geldig."); }
    catch (err) { melding($("#m-code"), err.message, true); }
  });
  $("#f-code").addEventListener("submit", async e => {
    e.preventDefault();
    try { const d = await vraag("/login/eigenaar", { method: "POST", body: { code: $("#code").value.trim() } }); bewaar(d); start(); }
    catch (err) { melding($("#m-code"), err.message, true); }
  });
}

// ---------- hoofdscherm ----------
let tab = "berichten", filter = "";
function kader(inhoud) {
  return `<div class="tabbalk">
    <button class="knopje" type="button" data-tab="berichten" aria-pressed="${tab === "berichten"}">Berichten</button>
    <button class="knopje" type="button" data-tab="postvak" aria-pressed="${tab === "postvak"}">Postvak</button>
    ${sessie.rol === "eigenaar" ? `<button class="knopje" type="button" data-tab="redacteuren" aria-pressed="${tab === "redacteuren"}">Redacteuren</button>` : ""}
    <span class="wie">Ingelogd als <b>${esc(sessie.naam)}</b><button class="knop lijn klein" type="button" id="uit">Uitloggen</button></span></div>${inhoud}`;
}
function koppelKader() {
  app.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => {
    if (gewijzigd && b.dataset.zeker !== "1") { b.dataset.zeker = "1"; b.textContent = "Wijzigingen weggooien?"; return; }
    gewijzigd = false; tab = b.dataset.tab; filter = ""; start();
  }));
  $("#uit").addEventListener("click", async () => { try { await vraag("/uitloggen", { method: "POST" }); } catch { } bewaar(null); inloggen("U bent uitgelogd."); });
}

async function start() {
  if (!sessie) return inloggen();
  app.innerHTML = kader(`<p class="leeg">Laden…</p>`); koppelKader();
  try {
    if (tab === "berichten") await berichten();
    else if (tab === "postvak") await postvak();
    else await redacteuren();
  } catch (e) { if (e.message !== "uitgelogd") app.insertAdjacentHTML("beforeend", `<p class="melding fout">${esc(e.message)}</p>`); }
}

async function berichten() {
  const { items } = await vraag("/items");
  app.innerHTML = kader(`<div class="kop-rij"><div>${H1("Berichten")}
    <p class="inleiding">Wat u hier plaatst, verschijnt bovenaan de proefsite. Het overige nieuws komt van hartvoordenhaag.nl.</p></div>
    <button class="knop geel" type="button" id="nieuw">Nieuw bericht</button></div>
    ${items.length ? items.map(i => `<div class="rij${i.gepubliceerd ? "" : " concept"}">${i.foto ? `<img src="${API}/foto/${i.foto}" alt="">` : `<span class="geen">geen foto</span>`}
      <div><h3>${esc(i.titel)}</h3>
      <p class="bijschrift">${i.stadsdeel ? `<span class="plek">${esc(i.stadsdeel)}</span>` : ""}<span>${esc(SOORTEN[i.soort] || i.soort)}</span>${i.gepubliceerd ? "" : '<span class="status">Concept</span>'}<time datetime="${esc(i.datum)}">${esc(new Date(i.datum + "T12:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }))}</time><span>door ${esc(i.door)}</span></p></div>
      <div class="acties"><button class="knop lijn klein" type="button" data-bewerk="${i.id}">Bewerken</button><button class="knop lijn klein" type="button" data-weg="${i.id}">Verwijderen</button></div></div>`).join("") : `<p class="leeg">Nog niets geplaatst. Begin met een nieuw bericht.</p>`}`);
  koppelKader();
  $("#nieuw").addEventListener("click", () => editor({}));
  app.querySelectorAll("[data-bewerk]").forEach(b => b.addEventListener("click", () => editor(items.find(i => i.id === b.dataset.bewerk))));
  app.querySelectorAll("[data-weg]").forEach(b => b.addEventListener("click", async () => {
    if (b.dataset.zeker !== "1") { b.dataset.zeker = "1"; b.textContent = "Echt verwijderen?"; return; }
    try { await vraag("/items/" + b.dataset.weg, { method: "DELETE" }); start(); }
    catch (err) { b.textContent = "Lukte niet"; }
  }));
}

function editor(i) {
  const v = (k, d = "") => esc(i[k] ?? d);
  app.innerHTML = kader(`${H1(i.id ? "Bericht bewerken" : "Nieuw bericht")}
  <form class="formulier" id="ed" style="margin-top:24px" novalidate>
    <div class="velden">
      <div class="veld"><label for="soort">Soort</label><select id="soort">${Object.entries(SOORTEN).map(([k, n]) => `<option value="${k}"${(i.soort || "nieuws") === k ? " selected" : ""}>${n}</option>`).join("")}</select></div>
      <div class="veld"><label for="stadsdeel">Stadsdeel</label><select id="stadsdeel"><option value="">Heel Den Haag</option>${STADSDELEN.map(s => `<option${i.stadsdeel === s ? " selected" : ""}>${s}</option>`).join("")}</select></div>
      <div class="veld breed"><label for="titel">Titel</label><input type="text" id="titel" maxlength="160" value="${v("titel")}"></div>
      <div class="veld"><label for="datum">Datum</label><input type="date" id="datum" value="${v("datum", new Date().toISOString().slice(0, 10))}"><small id="datum-uitleg">Bij agenda: de dag van de afspraak.</small></div>
      <div class="veld" data-agenda><label for="tijd">Tijd <small>(alleen agenda)</small></label><input type="time" id="tijd" value="${esc((i.tijd || "").replace(".", ":"))}"></div>
      <div class="veld breed" data-agenda><label for="plek">Plek <small>(alleen agenda)</small></label><input type="text" id="plek" placeholder="Wijkcentrum, straat" value="${v("plek")}"></div>
      <div class="veld breed"><label for="samenvatting">Korte samenvatting <small>Eén of twee zinnen voor de overzichten</small></label><textarea id="samenvatting" maxlength="400" style="min-height:80px">${v("samenvatting")}</textarea></div>
      <div class="veld breed"><label for="tekst">Tekst <small>Laat een witregel tussen alinea's</small></label><textarea id="tekst" maxlength="12000" style="min-height:260px">${v("tekst")}</textarea></div>
      <div class="veld breed"><label for="link">Link <small>(niet verplicht, begint met https://)</small></label><input type="text" id="link" value="${v("link")}"></div>
      <div class="veld breed"><label for="foto">Foto <small>JPG, PNG of WebP. Wordt automatisch verkleind.</small></label><input type="file" id="foto" accept="image/jpeg,image/png,image/webp">
        <div id="voorbeeld">${i.foto ? `<img class="foto-voorbeeld" src="${API}/foto/${i.foto}" alt="Huidige foto">` : ""}</div></div>
    </div>
    <div class="knoppen"><button class="knop groen" type="submit" data-publiceer="1">${i.gepubliceerd ? "Opslaan" : "Publiceren"}</button><button class="knop lijn" type="submit" data-publiceer="0">${i.gepubliceerd ? "Terugzetten naar concept" : "Opslaan als concept"}</button><button class="knop lijn" type="button" id="terug">Annuleren</button>
      ${i.id && i.gepubliceerd ? `<a class="meer" href="./#${i.soort === "succes" ? "successen" : i.soort === "agenda" ? "agenda" : i.soort === "petitie" ? "petities" : i.soort === "vacature" ? "vacatures" : "nieuws"}/w${i.id}" target="_blank" rel="noopener">Bekijk op de site</a>` : ""}</div>
    <p id="m-ed" hidden></p></form>`);
  koppelKader();
  let fotoId = i.foto || "";
  const toonAgenda = () => app.querySelectorAll("[data-agenda]").forEach(el => el.hidden = $("#soort").value !== "agenda");
  $("#soort").addEventListener("change", toonAgenda); toonAgenda();
  $("#ed").addEventListener("input", () => { gewijzigd = true; });
  $("#terug").addEventListener("click", e => {
    if (gewijzigd && e.target.dataset.zeker !== "1") { e.target.dataset.zeker = "1"; e.target.textContent = "Wijzigingen weggooien?"; return; }
    gewijzigd = false; start();
  });
  $("#foto").addEventListener("change", async e => {
    const bestand = e.target.files[0]; if (!bestand) return;
    const m = $("#m-ed");
    try {
      melding(m, "Foto verkleinen en uploaden…");
      const blob = await verklein(bestand, 1600, 0.82);
      const d = await vraag("/foto", { method: "POST", body: blob, headers: { "Content-Type": "image/jpeg" } });
      fotoId = d.id;
      $("#voorbeeld").innerHTML = `<img class="foto-voorbeeld" src="${URL.createObjectURL(blob)}" alt="Gekozen foto">`;
      melding(m, "Foto staat klaar. Vergeet niet op te slaan.");
    } catch (err) { melding(m, err.message, true); }
  });
  $("#ed").addEventListener("submit", async e => {
    e.preventDefault();
    const knop = e.submitter || $("#ed button[type=submit]");
    const knoppen = $$("#ed button[type=submit]"); knoppen.forEach(k => k.disabled = true);
    const oud = knop.textContent; knop.textContent = "Opslaan…";
    const b = { id: i.id, soort: $("#soort").value, stadsdeel: $("#stadsdeel").value, titel: $("#titel").value, datum: $("#datum").value,
      tijd: $("#tijd").value, plek: $("#plek").value, samenvatting: $("#samenvatting").value, tekst: $("#tekst").value,
      link: $("#link").value.trim(), foto: fotoId, gepubliceerd: knop.dataset.publiceer === "1" };
    try { await vraag("/items", { method: "POST", body: b }); gewijzigd = false; tab = "berichten"; start(); }
    catch (err) { melding($("#m-ed"), err.message, true); knoppen.forEach(k => k.disabled = false); knop.textContent = oud; }
  });
}

function verklein(bestand, max, kwaliteit) {
  return new Promise((ok, nee) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => b ? ok(b) : nee(new Error("Deze foto kon niet worden gelezen.")), "image/jpeg", kwaliteit);
    };
    img.onerror = () => nee(new Error("Deze foto kon niet worden gelezen."));
    img.src = URL.createObjectURL(bestand);
  });
}

async function postvak() {
  const { berichten } = await vraag("/inbox");
  const toonArchief = filter === "archief";
  const soorten = Object.keys(FORM_NAAM);
  const open = berichten.filter(b => (b.status || "nieuw") !== "afgehandeld");
  const tel = k => open.filter(b => b.soort === k).length;
  const zicht = berichten.filter(b => toonArchief ? b.status === "afgehandeld" : (b.status || "nieuw") !== "afgehandeld" && (!filter || b.soort === filter));
  const veld = (k, v) => k === "email" ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : k === "telefoon" ? `<a href="tel:${esc(v.replace(/[^\d+]/g, ""))}">${esc(v)}</a>` : esc(v);
  app.innerHTML = kader(`${H1("Postvak")}
    <p class="inleiding">Berichten via de formulieren op de site. Afgehandelde berichten gaan naar het archief en zijn terug te zetten.</p>
    <div class="filters" style="margin-top:18px">
      <button class="knopje" type="button" data-filter="" aria-pressed="${!filter}">Alles open (${open.length})</button>
      ${soorten.map(k => `<button class="knopje" type="button" data-filter="${k}" aria-pressed="${filter === k}">${FORM_NAAM[k]} (${tel(k)})</button>`).join("")}
      <button class="knopje" type="button" data-filter="archief" aria-pressed="${toonArchief}">Archief</button></div>
    <div class="postvak">${zicht.length ? zicht.map(b => `<div class="rij"><div><p class="bijschrift"><span>${esc(FORM_NAAM[b.soort] || b.soort)}</span>${b.stadsdeel ? `<span class="plek">${esc(b.stadsdeel)}</span>` : ""}<time>${esc(new Date(b.tijd).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" }))}</time></p>
      <h3 style="margin-top:6px">${esc(b.naam || b.email)}</h3>
      <dl>${Object.keys(VELD_NAAM).filter(k => b[k] && k !== "stadsdeel").map(k => `<dt>${VELD_NAAM[k]}</dt><dd>${veld(k, b[k])}</dd>`).join("")}${b.status === "afgehandeld" ? `<dt>Afgehandeld</dt><dd>door ${esc(b.door || "onbekend")}</dd>` : ""}</dl></div>
      <div class="acties">${b.status === "afgehandeld" ? `<button class="knop lijn klein" type="button" data-status="nieuw" data-id="${b.id}">Terugzetten</button><button class="knop lijn klein" type="button" data-weg="${b.id}">Verwijderen</button>` : `<button class="knop groen klein" type="button" data-status="afgehandeld" data-id="${b.id}">Afgehandeld</button>`}</div></div>`).join("") : `<p class="leeg" style="margin-top:16px">Niets in deze lijst.</p>`}</div>`);
  koppelKader();
  $$("[data-filter]").forEach(k => k.addEventListener("click", () => { filter = k.dataset.filter; start(); }));
  $$("[data-status]").forEach(k => k.addEventListener("click", async () => {
    k.disabled = true;
    try { await vraag(`/inbox/${k.dataset.id}/status`, { method: "POST", body: { status: k.dataset.status } }); start(); }
    catch (err) { k.disabled = false; k.textContent = "Lukte niet, probeer opnieuw"; }
  }));
  $$("[data-weg]").forEach(k => k.addEventListener("click", async () => {
    if (k.dataset.zeker !== "1") { k.dataset.zeker = "1"; k.textContent = "Echt verwijderen? Dit kan niet terug."; return; }
    try { await vraag("/inbox/" + k.dataset.weg, { method: "DELETE" }); start(); }
    catch (err) { k.textContent = "Lukte niet"; }
  }));
}

async function redacteuren() {
  const { gebruikers } = await vraag("/gebruikers");
  app.innerHTML = kader(`${H1("Redacteuren")}
    <p class="inleiding">Geef iemand een inlognaam en een wachtwoord van minstens tien tekens. Stuur het wachtwoord apart, bijvoorbeeld via Signal.</p>
    <div style="margin-top:20px">${gebruikers.length ? gebruikers.map(g => `<div class="rij" style="grid-template-columns:minmax(0,1fr) auto"><div><h3>${esc(g.weergave)}</h3><p class="bijschrift"><span>inlognaam ${esc(g.naam)}</span><span>${esc(g.rol)}</span></p></div>
      <div class="acties"><button class="knop lijn klein" type="button" data-weg="${esc(g.naam)}">Toegang intrekken</button></div></div>`).join("") : `<p class="leeg">Nog geen redacteuren.</p>`}</div>
    <form class="formulier" id="nieuw" style="margin-top:28px;max-width:640px" novalidate><h2 style="font-size:1.6rem">Redacteur toevoegen</h2>
      <div class="velden"><div class="veld"><label for="g-weergave">Naam</label><input type="text" id="g-weergave" placeholder="Karolina Polak"></div>
      <div class="veld"><label for="g-naam">Inlognaam</label><input type="text" id="g-naam" autocapitalize="none" placeholder="karolina"></div>
      <div class="veld breed"><label for="g-ww">Wachtwoord</label><input type="text" id="g-ww" autocomplete="new-password"><small><button class="knop lijn klein" type="button" id="bedenk" style="margin-top:6px">Bedenk een sterk wachtwoord</button></small></div></div>
      <button class="knop groen" type="submit">Toevoegen</button><p id="m-g" hidden></p></form>`);
  koppelKader();
  $("#bedenk").addEventListener("click", () => {
    const w = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    $("#g-ww").value = [...crypto.getRandomValues(new Uint32Array(16))].map(n => w[n % w.length]).join("");
  });
  app.querySelectorAll("[data-weg]").forEach(b => b.addEventListener("click", async () => {
    if (b.dataset.zeker !== "1") { b.dataset.zeker = "1"; b.textContent = "Zeker weten?"; return; }
    try { await vraag("/gebruikers/" + encodeURIComponent(b.dataset.weg), { method: "DELETE" }); start(); }
    catch (err) { b.textContent = "Lukte niet"; }
  }));
  $("#nieuw").addEventListener("submit", async e => {
    e.preventDefault();
    try { await vraag("/gebruikers", { method: "POST", body: { weergave: $("#g-weergave").value, naam: $("#g-naam").value, wachtwoord: $("#g-ww").value } }); start(); }
    catch (err) { melding($("#m-g"), err.message, true); }
  });
}

start();
