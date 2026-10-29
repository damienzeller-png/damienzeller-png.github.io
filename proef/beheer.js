/* Beheeromgeving van de proefsite van Hart voor Den Haag.
   Inloggen, berichten plaatsen en aanpassen (ook de berichten die elke ochtend van hartvoordenhaag.nl komen),
   stadsdeel kiezen, verbergen, postvak, mensen met toegang, hulp en reservekopie.
   Gewone JavaScript zonder bouwstap: wie dit bestand aanpast, ziet het resultaat na publiceren direct. Zie LEESMIJ.md. */
"use strict";
const API = "https://hvdh-proef.damienzeller.workers.dev";
const STADSDELEN = ["Centrum", "Escamp", "Haagse Hout", "Laak", "Leidschenveen-Ypenburg", "Loosduinen", "Scheveningen", "Segbroek"];
const ONDERWERPEN = ["Veiligheid", "Wonen en bouwen", "Verkeer en parkeren", "Zorg en welzijn", "Onderwijs en jeugd", "Economie en ondernemers", "Groen en leefbaarheid", "Cultuur en sport", "Geld en bestuur", "Asiel en opvang"];
const EIGEN_SOORTEN = { nieuws: "Nieuwsbericht", agenda: "Agenda-afspraak of spreekuur", succes: "Succes", petitie: "Petitie", vacature: "Vacature" };
const SOORT_NAAM = { nieuws: "Nieuws", succes: "Succes", motie: "Motie", amendement: "Amendement", raadsvraag: "Schriftelijke vragen", spreektekst: "Spreektekst", petitie: "Petitie", agenda: "Agenda", vacature: "Vacature" };
const BRON = { nieuws: "nieuws", succes: "successen", motie: "moties", amendement: "amendementen", raadsvraag: "raadsvragen", spreektekst: "spreekteksten", petitie: "petities", agenda: "agenda" };
const SITEPAD = { nieuws: "nieuws", succes: "successen", motie: "raadswerk/motie", amendement: "raadswerk/amendement", raadsvraag: "raadswerk/vraag", spreektekst: "raadswerk/spreektekst", petitie: "petities", vacature: "vacatures", agenda: "agenda/aanmelden" };
const RAAD = ["motie", "amendement", "raadsvraag", "spreektekst"];
const STATUSSEN = ["Aangenomen", "Verworpen", "Ingetrokken", "Aangehouden", "Overgenomen"];
const ROL_NAAM = { eigenaar: "Eigenaar", beheerder: "Beheerder", redacteur: "Redacteur" };
const FORM_NAAM = { melding: "Meldingen", contact: "Contact", doemee: "Doe mee", aanmelding: "Aanmeldingen", petitie: "Handtekeningen", nieuwsbrief: "Nieuwsbrief" };
const VELD_NAAM = { email: "E-mail", telefoon: "Telefoon", stadsdeel: "Stadsdeel", rol: "Wil helpen als", takenlijst: "Wil doen", beschikbaar: "Tijd", activiteit: "Aangemeld voor", datum: "Datum", aantal: "Aantal personen", plek: "Waar", onderwerp: "Onderwerp", petitie: "Petitie", bericht: "Bericht" };

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const H1 = t => `<h1 class="beheer-kop" tabindex="-1">${t}</h1>`;
const vandaag = () => new Date().toISOString().slice(0, 10);
const datumNL = d => d ? new Date(String(d).slice(0, 10) + "T12:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "";
const tijdNL = t => new Date(t).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });
const gelijkeLijst = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort());
const app = $("#app");
let gewijzigd = false;
addEventListener("beforeunload", e => { if (gewijzigd) { e.preventDefault(); e.returnValue = ""; } });

const opslag = {
  lees(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  zet(k, v) { try { sessionStorage.setItem(k, v); } catch { /* geen opslag */ } },
};
let sessie = null;
try { sessie = JSON.parse(localStorage.getItem("hvdh-sessie") || "null"); } catch { sessie = null; }
const bewaar = s => { sessie = s; try { s ? localStorage.setItem("hvdh-sessie", JSON.stringify(s)) : localStorage.removeItem("hvdh-sessie"); } catch { /* geen opslag: alleen deze sessie */ } };
const magBeheren = () => sessie && (sessie.rol === "eigenaar" || sessie.rol === "beheerder");

async function vraag(pad, opties = {}) {
  const headers = { ...(opties.headers || {}) };
  if (sessie) headers.Authorization = "Bearer " + sessie.token;
  if (opties.body && typeof opties.body === "object" && !(opties.body instanceof Blob)) { headers["Content-Type"] = "application/json"; opties.body = JSON.stringify(opties.body); }
  let r;
  try { r = await fetch(API + pad, { ...opties, headers }); }
  catch { throw new Error("De achterkant is nu niet bereikbaar. Controleer de internetverbinding en probeer het zo opnieuw."); }
  const d = await r.json().catch(() => ({ ok: false, fout: "Onverwacht antwoord van de server." }));
  if (r.status === 401 && sessie) { bewaar(null); inloggen("U bent uitgelogd. Log opnieuw in."); throw new Error("uitgelogd"); }
  if (!r.ok || d.ok === false) throw new Error(d.fout || "Er ging iets mis.");
  return d;
}
const melding = (el, tekst, fout) => { if (!el) return; el.hidden = false; el.className = "melding" + (fout ? " fout" : ""); el.textContent = tekst; el.setAttribute("role", fout ? "alert" : "status"); };
const bezig = (knop, tekst) => { const oud = knop.textContent; knop.disabled = true; knop.textContent = tekst; return () => { knop.disabled = false; knop.textContent = oud; }; };
// tweestaps-bevestiging op dezelfde knop
function zeker(knop, vraagTekst) {
  if (knop.dataset.zeker === "1") return true;
  knop.dataset.zeker = "1"; knop.dataset.tekst = knop.textContent; knop.textContent = vraagTekst;
  setTimeout(() => { if (knop.isConnected && knop.dataset.zeker === "1") { knop.dataset.zeker = ""; knop.textContent = knop.dataset.tekst; } }, 6000);
  return false;
}

// ---------- gegevens van de site ----------
const bestanden = {};
const bestand = naam => bestanden[naam] || (bestanden[naam] = fetch(`data/${naam}.json`, { cache: "no-cache" }).then(r => r.ok ? r.json() : []).catch(() => []));
async function overgenomen() {
  const [z, ag] = await Promise.all([bestand("zoekindex"), bestand("agenda")]);
  return [
    ...z.map(x => ({ id: x.id, soort: x.s, titel: x.t, datum: x.d, stadsdelen: x.sd || [], samenvatting: x.x || "", indiener: x.i || "", status: x.st || "" })),
    ...ag.map(a => ({ id: a.id, soort: "agenda", titel: a.titel, datum: a.datum, stadsdelen: a.stadsdeel ? [a.stadsdeel] : [], samenvatting: a.samenvatting || "" })),
  ];
}
async function origineel(soort, id) {
  const lijst = await bestand(BRON[soort]);
  const x = lijst.find(y => y.id === id);
  if (!x) return null;
  return soort === "agenda" ? { ...x, stadsdelen: x.stadsdeel ? [x.stadsdeel] : [], onderwerpen: [] } : x;
}
const siteLink = r => r.bron === "eigen" ? (r.concept ? "" : `./#${SITEPAD[r.soort]}/w${r.id}`) : r.verborgen ? "" : `./#${SITEPAD[r.soort]}/${r.id}`;
const fotoUrl = id => `${API}/foto/${id}`;

// ---------- opgemaakte tekst ----------
const TAGS = { P: [], BR: [], STRONG: [], B: [], EM: [], I: [], U: [], H2: [], H3: [], UL: [], OL: [], LI: [], BLOCKQUOTE: [], A: ["href"], IMG: ["src", "alt"], FIGURE: [], FIGCAPTION: [] };
function schoneHtml(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const wortel = doc.body.firstChild;
  const loop = el => {
    for (const k of [...el.childNodes]) {
      if (k.nodeType === 3) continue;
      if (k.nodeType !== 1) { k.remove(); continue; }
      let tag = k.tagName;
      if (tag === "DIV" || tag === "SECTION") { const p = doc.createElement("p"); p.append(...k.childNodes); k.replaceWith(p); loop(p); continue; }
      if (tag === "H1" || tag === "H4" || tag === "H5" || tag === "H6") { const h = doc.createElement(tag === "H1" ? "h2" : "h3"); h.append(...k.childNodes); k.replaceWith(h); loop(h); continue; }
      if (!(tag in TAGS)) {
        if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "VIDEO", "AUDIO", "FORM", "INPUT", "BUTTON", "SELECT", "TEXTAREA", "NOSCRIPT", "TEMPLATE"].includes(tag)) k.remove();
        else { const binnen = [...k.childNodes]; k.replaceWith(...binnen); binnen.forEach(b => b.nodeType === 1 && loop({ childNodes: [b] })); }
        continue;
      }
      for (const a of [...k.attributes]) if (!TAGS[tag].includes(a.name.toLowerCase())) k.removeAttribute(a.name);
      if (tag === "A" && !/^(https:\/\/|mailto:|tel:|#)/i.test(k.getAttribute("href") || "")) k.removeAttribute("href");
      if (tag === "IMG" && !/^https:\/\//i.test(k.getAttribute("src") || "")) { k.remove(); continue; }
      loop(k);
    }
  };
  loop(wortel);
  return wortel.innerHTML.replace(/<p>(\s|&nbsp;|<br>)*<\/p>/g, "").trim();
}
const heeftEmbed = h => /<(iframe|video|audio|embed|object|script)\b/i.test(h || "");
function tekstVeld(html, id) {
  const knop = (cmd, arg, label, titel) => `<button type="button" class="knopje" data-cmd="${cmd}"${arg ? ` data-arg="${arg}"` : ""} title="${titel || label}">${label}</button>`;
  return `<div class="re">
    <div class="re-balk" role="toolbar" aria-label="Opmaak van de tekst">
      ${knop("formatBlock", "p", "Gewone tekst")}${knop("formatBlock", "h2", "Kop")}${knop("formatBlock", "h3", "Tussenkop")}
      ${knop("bold", "", "<b>Vet</b>", "Vet")}${knop("italic", "", "<i>Schuin</i>", "Schuin")}
      ${knop("insertUnorderedList", "", "Opsomming")}${knop("insertOrderedList", "", "Genummerd")}${knop("formatBlock", "blockquote", "Citaat")}
      ${knop("link", "", "Link")}${knop("unlink", "", "Link weg")}${knop("foto", "", "Foto in de tekst")}
      ${knop("undo", "", "Ongedaan maken")}</div>
    <div class="re-tekst artikel-tekst" id="${id}" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Tekst van het bericht">${html || "<p><br></p>"}</div>
    <input type="file" class="re-foto" accept="image/jpeg,image/png,image/webp" hidden></div>`;
}
function koppelTekstVeld(wrap, opVerandering) {
  const veld = $(".re-tekst", wrap), balk = $(".re-balk", wrap), fotoKiezer = $(".re-foto", wrap);
  try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch { /* oudere browser */ }
  let selectie = null;
  const bewaarSelectie = () => { const s = getSelection(); if (s.rangeCount && veld.contains(s.anchorNode)) selectie = s.getRangeAt(0).cloneRange(); };
  const herstel = () => { veld.focus(); if (selectie) { const s = getSelection(); s.removeAllRanges(); s.addRange(selectie); } };
  veld.addEventListener("keyup", bewaarSelectie); veld.addEventListener("mouseup", bewaarSelectie); veld.addEventListener("blur", bewaarSelectie);
  veld.addEventListener("input", opVerandering);
  veld.addEventListener("paste", e => {
    const html = e.clipboardData.getData("text/html"), tekst = e.clipboardData.getData("text/plain");
    e.preventDefault();
    const schoon = html ? schoneHtml(html) : tekst.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
    document.execCommand("insertHTML", false, schoon);
  });
  balk.addEventListener("mousedown", e => { if (e.target.closest("button")) e.preventDefault(); });
  balk.addEventListener("click", async e => {
    const b = e.target.closest("button"); if (!b) return;
    const cmd = b.dataset.cmd;
    herstel();
    if (cmd === "link") {
      const adres = prompt("Adres van de link. Begint met https://, mailto: of tel:", "https://");
      if (adres && /^(https:\/\/|mailto:|tel:)/i.test(adres.trim())) document.execCommand("createLink", false, adres.trim());
      else if (adres) alert("Dit adres kan niet. Een link begint met https://, mailto: of tel:.");
    } else if (cmd === "foto") { fotoKiezer.click(); return; }
    else document.execCommand(cmd, false, b.dataset.arg ? `<${b.dataset.arg}>` : null);
    opVerandering();
  });
  fotoKiezer.addEventListener("change", async () => {
    const f = fotoKiezer.files[0]; if (!f) return;
    try {
      const blob = await verklein(f, 1600, 0.82);
      const d = await vraag("/foto", { method: "POST", body: blob, headers: { "Content-Type": "image/jpeg" } });
      herstel();
      document.execCommand("insertHTML", false, `<img src="${fotoUrl(d.id)}" alt="">`);
      opVerandering();
    } catch (err) { alert(err.message); }
    fotoKiezer.value = "";
  });
  return () => schoneHtml(veld.innerHTML);
}
function verklein(bestandIn, max, kwaliteit) {
  return new Promise((ok, nee) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => b ? ok(b) : nee(new Error("Deze foto kon niet worden gelezen.")), "image/jpeg", kwaliteit);
    };
    img.onerror = () => nee(new Error("Deze foto kon niet worden gelezen. Kies een JPG, PNG of WebP."));
    img.src = URL.createObjectURL(bestandIn);
  });
}
const vinkjes = (naam, opties, gekozen) => `<div class="vinkjes">${opties.map((o, k) => `<label class="vink-klein"><input type="checkbox" name="${naam}" value="${esc(o)}"${(gekozen || []).includes(o) ? " checked" : ""}><span>${esc(o)}</span></label>`).join("")}</div>`;
const gevinkt = (form, naam) => $$(`input[name="${naam}"]:checked`, form).map(i => i.value);

// ---------- inloggen ----------
function inloggen(boodschap) {
  app.innerHTML = `<div class="inlog">
    ${H1("Inloggen redactie")}
    ${boodschap ? `<p class="melding" style="margin-top:16px">${esc(boodschap)}</p>` : ""}
    <form class="formulier" id="f-ww" style="margin-top:24px" novalidate><h2 style="font-size:1.6rem">Met naam en wachtwoord</h2>
      <div class="veld"><label for="naam">Inlognaam</label><input type="text" id="naam" autocomplete="username" autocapitalize="none"></div>
      <div class="veld"><label for="ww">Wachtwoord</label><input type="password" id="ww" autocomplete="current-password"></div>
      <button class="knop groen" type="submit">Inloggen</button><p id="m-ww" hidden></p>
      <p class="leeg" style="font-size:.92rem">Wachtwoord kwijt? Een beheerder kan u een nieuw wachtwoord geven.</p></form>
    <form class="formulier" id="f-code" novalidate><h2 style="font-size:1.6rem">Eigenaar: code via Telegram</h2>
      <p class="leeg">De eigenaar krijgt een code van zes cijfers in Telegram.</p>
      <button class="knop lijn" type="button" id="stuur">Stuur mij een code</button>
      <div class="veld" id="code-veld" hidden><label for="code">Code uit Telegram</label><input type="text" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div>
      <button class="knop groen" type="submit" id="code-knop" hidden>Inloggen met code</button><p id="m-code" hidden></p></form>
    <details class="nood"><summary>Noodtoegang</summary>
      <form class="formulier" id="f-nood" novalidate><p class="leeg">Alleen als niemand meer kan inloggen. De noodsleutel staat bij de webbouwer en in de geheimen van de site (zie LEESMIJ.md). Na gebruik krijgt de eigenaar een bericht.</p>
      <div class="veld"><label for="sleutel">Noodsleutel</label><input type="password" id="sleutel" autocomplete="off"></div>
      <button class="knop lijn" type="submit">Inloggen met de noodsleutel</button><p id="m-nood" hidden></p></form></details></div>`;
  $("#f-ww").addEventListener("submit", async e => {
    e.preventDefault();
    const klaar = bezig(e.target.querySelector("button[type=submit]"), "Bezig…");
    try { const d = await vraag("/login", { method: "POST", body: { naam: $("#naam").value, wachtwoord: $("#ww").value } }); bewaar(d); start(); }
    catch (err) { melding($("#m-ww"), err.message, true); klaar(); }
  });
  $("#stuur").addEventListener("click", async e => {
    const klaar = bezig(e.target, "Bezig…");
    try { await vraag("/login/code", { method: "POST" }); $("#code-veld").hidden = false; $("#code-knop").hidden = false; $("#code").focus(); melding($("#m-code"), "De code staat in Telegram. Hij is tien minuten geldig."); }
    catch (err) { melding($("#m-code"), err.message, true); }
    klaar();
  });
  $("#f-code").addEventListener("submit", async e => {
    e.preventDefault();
    try { const d = await vraag("/login/eigenaar", { method: "POST", body: { code: $("#code").value.trim() } }); bewaar(d); start(); }
    catch (err) { melding($("#m-code"), err.message, true); }
  });
  $("#f-nood").addEventListener("submit", async e => {
    e.preventDefault();
    try { const d = await vraag("/login/herstel", { method: "POST", body: { sleutel: $("#sleutel").value } }); bewaar(d); tab = "mensen"; start(); }
    catch (err) { melding($("#m-nood"), err.message, true); }
  });
}

// ---------- kader met tabs ----------
let tab = opslag.lees("tab") || "overzicht";
const TABS = () => [["overzicht", "Overzicht"], ["berichten", "Berichten"], ["postvak", "Postvak"], ...(magBeheren() ? [["mensen", "Mensen"]] : []), ["account", "Mijn account"], ["hulp", "Hulp"]];
function kader(inhoud) {
  return `<nav class="tabbalk" aria-label="Onderdelen">${TABS().map(([k, n]) => `<button class="knopje" type="button" data-tab="${k}" aria-pressed="${tab === k}">${n}</button>`).join("")}
    <span class="wie">Ingelogd als <b>${esc(sessie.naam)}</b> (${esc((ROL_NAAM[sessie.rol] || sessie.rol).toLowerCase())})<button class="knop lijn klein" type="button" id="uit">Uitloggen</button></span></nav>${inhoud}`;
}
function koppelKader() {
  $$("[data-tab]").forEach(b => b.addEventListener("click", () => {
    if (gewijzigd && !zeker(b, "Wijzigingen weggooien?")) return;
    gaNaar(b.dataset.tab);
  }));
  $("#uit").addEventListener("click", async () => { try { await vraag("/uitloggen", { method: "POST" }); } catch { /* toch uitloggen */ } bewaar(null); inloggen("U bent uitgelogd."); });
}
function gaNaar(t, opties = {}) {
  gewijzigd = false; tab = t; opslag.zet("tab", t);
  if (opties.filter) Object.assign(lijstFilter, opties.filter);
  start().then(() => { const h = $("#app h1"); if (h) h.focus({ preventScroll: true }); scrollTo(0, 0); });
}
async function start() {
  if (!sessie) return inloggen();
  if (!TABS().some(([k]) => k === tab)) tab = "overzicht";
  app.innerHTML = kader(`<p class="leeg">Laden…</p>`); koppelKader();
  try {
    const pagina = { overzicht, berichten, postvak, mensen, account, hulp }[tab];
    await pagina();
  } catch (e) { if (e.message !== "uitgelogd") app.insertAdjacentHTML("beforeend", `<p class="melding fout" role="alert">${esc(e.message)}</p>`); }
}

// ---------- overzicht ----------
async function overzicht() {
  const [{ berichten: post }, { logboek }, mensenLijst] = await Promise.all([
    vraag("/inbox"), vraag("/logboek").catch(() => ({ logboek: [] })),
    magBeheren() ? vraag("/gebruikers").then(d => d.gebruikers).catch(() => null) : Promise.resolve(null)]);
  const open = post.filter(b => (b.status || "nieuw") !== "afgehandeld");
  const tel = k => open.filter(b => b.soort === k).length;
  const beheerders = mensenLijst ? mensenLijst.filter(g => g.rol === "beheerder").length : null;
  app.innerHTML = kader(`${H1("Overzicht")}
    <p class="inleiding">Hier ziet u wat er binnenkwam en wat er laatst veranderde. Alles wat u op de site wilt aanpassen, staat onder Berichten.</p>
    ${beheerders === 0 ? `<div class="melding waarschuwing" role="status"><b>Er is nog geen tweede beheerder.</b> Valt de eigenaar weg, dan kan niemand anders mensen toegang geven of een reservekopie maken. <button class="knop lijn klein" type="button" data-naar="mensen">Voeg een beheerder toe</button></div>` : ""}
    <div class="tegels">
      <button class="tegel" type="button" data-naar="postvak"><b>${open.length}</b><span>open in het postvak</span><small>${tel("melding")} meldingen · ${tel("contact")} vragen · ${tel("aanmelding")} aanmeldingen</small></button>
      <button class="tegel" type="button" data-nieuw="nieuws"><b>+</b><span>Nieuw bericht</span><small>Nieuws, succes, petitie of vacature</small></button>
      <button class="tegel" type="button" data-nieuw="agenda"><b>+</b><span>Nieuwe afspraak</span><small>Spreekuur, schouw of bijeenkomst</small></button>
      <button class="tegel" type="button" data-naar="berichten"><b>✎</b><span>Bestaand bericht aanpassen</span><small>Titel, stadsdeel, tekst, foto of verbergen</small></button>
    </div>
    <h2 class="sub">Laatste wijzigingen</h2>
    ${logboek.length ? `<ol class="logboek">${logboek.slice(0, 15).map(l => `<li><time>${esc(tijdNL(l.tijd))}</time><span><b>${esc(l.wie)}</b> ${esc(l.wat.toLowerCase())}${l.titel ? `: ${esc(l.titel)}` : ""}</span></li>`).join("")}</ol>` : `<p class="leeg">Nog geen wijzigingen.</p>`}`);
  koppelKader();
  $$("[data-naar]").forEach(b => b.addEventListener("click", () => gaNaar(b.dataset.naar)));
  $$("[data-nieuw]").forEach(b => b.addEventListener("click", () => { tab = "berichten"; opslag.zet("tab", tab); eigenEditor({ soort: b.dataset.nieuw }); }));
}

// ---------- berichten: alles op één lijst ----------
const lijstFilter = { soort: "", sd: "", status: "", q: "", n: 30 };
let rijenCache = null;
async function laadRijen() {
  const [{ items }, { aanpassingen }, idx] = await Promise.all([vraag("/items"), vraag("/aanpassingen/alles").catch(() => vraag("/aanpassingen")), overgenomen()]);
  const eigenRijen = items.map(i => ({
    bron: "eigen", id: i.id, ref: "w" + i.id, soort: i.soort, titel: i.titel, datum: i.datum,
    stadsdelen: i.stadsdelen && i.stadsdelen.length ? i.stadsdelen : i.stadsdeel ? [i.stadsdeel] : [],
    concept: !i.gepubliceerd, vast: !!i.vast, door: i.bijgewerkt_door || i.door, item: i,
  }));
  const overRijen = idx.map(x => {
    const a = aanpassingen[x.id], r = { bron: "import", id: x.id, ref: x.id, soort: x.soort, titel: x.titel, datum: x.datum, stadsdelen: x.stadsdelen, orig: x, aanp: a || null };
    if (a) { if (a.titel) r.titel = a.titel; if (a.stadsdelen) r.stadsdelen = a.stadsdelen; if (a.datum) r.datum = a.datum; r.verborgen = !!a.verborgen; r.vast = !!a.vast; r.door = a.door; }
    return r;
  });
  rijenCache = { rijen: [...eigenRijen, ...overRijen].sort((a, b) => (b.datum || "").localeCompare(a.datum || "")), aanpassingen, items };
  return rijenCache;
}
function past(r) {
  const f = lijstFilter;
  if (f.soort && r.soort !== f.soort) return false;
  if (f.sd === "-" ? r.stadsdelen.length : f.sd && !r.stadsdelen.includes(f.sd)) return false;
  if (f.status === "zichtbaar" && (r.verborgen || r.concept)) return false;
  if (f.status === "verborgen" && !(r.verborgen || r.concept)) return false;
  if (f.status === "aangepast" && !(r.bron === "import" && r.aanp)) return false;
  if (f.status === "eigen" && r.bron !== "eigen") return false;
  if (f.status === "vast" && !r.vast) return false;
  if (f.q) { const q = f.q.toLowerCase(); if (!(r.titel + " " + (r.orig?.samenvatting || "") + " " + (r.orig?.indiener || "")).toLowerCase().includes(q)) return false; }
  return true;
}
function rijHtml(r) {
  const labels = [];
  labels.push(`<span>${esc(SOORT_NAAM[r.soort] || r.soort)}</span>`);
  labels.push(r.stadsdelen.length ? `<span class="plek">${esc(r.stadsdelen.join(", "))}</span>` : `<span class="zacht">Heel Den Haag</span>`);
  if (r.datum) labels.push(`<time datetime="${esc(r.datum)}">${esc(datumNL(r.datum))}</time>`);
  labels.push(`<span class="zacht">${r.bron === "eigen" ? "Hier geplaatst" : "Van hartvoordenhaag.nl"}</span>`);
  if (r.concept) labels.push(`<span class="status concept-label">Concept</span>`);
  if (r.verborgen) labels.push(`<span class="status concept-label">Verborgen</span>`);
  if (r.vast) labels.push(`<span class="status">Bovenaan</span>`);
  if (r.bron === "import" && r.aanp && !r.verborgen) labels.push(`<span class="status">Aangepast${r.door ? " door " + esc(r.door) : ""}</span>`);
  const link = siteLink(r);
  const verborgen = r.concept || r.verborgen;
  return `<li class="rij b-rij${verborgen ? " concept" : ""}"><div><h3>${esc(r.titel)}</h3><p class="bijschrift">${labels.join("")}</p></div>
    <div class="acties"><button class="knop groen klein" type="button" data-bewerk="${esc(r.ref)}">Bewerken</button>
    <button class="knop lijn klein" type="button" data-zicht="${esc(r.ref)}">${verborgen ? "Weer tonen" : "Verbergen"}</button>
    ${link ? `<a class="meer" href="${esc(link)}" target="_blank" rel="noopener">Bekijk</a>` : ""}</div></li>`;
}
async function berichten() {
  const { rijen } = rijenCache || await laadRijen();
  const opt = (waarde, tekst, huidig) => `<option value="${esc(waarde)}"${waarde === huidig ? " selected" : ""}>${esc(tekst)}</option>`;
  app.innerHTML = kader(`<div class="kop-rij"><div>${H1("Berichten")}
    <p class="inleiding">Alles wat op de site staat: wat hier is geplaatst en wat elke ochtend van hartvoordenhaag.nl komt. Uw aanpassingen blijven staan, ook na de import.</p></div>
    <div class="knoppen"><button class="knop geel" type="button" id="nieuw">Nieuw bericht</button><button class="knop lijn" type="button" id="nieuw-ag">Nieuwe afspraak</button></div></div>
    <form class="filterbalk" id="filters" role="search" onsubmit="return false">
      <div class="veld"><label for="f-q">Zoek</label><input type="search" id="f-q" value="${esc(lijstFilter.q)}" placeholder="Titel, naam of woord"></div>
      <div class="veld"><label for="f-soort">Soort</label><select id="f-soort">${opt("", "Alles", lijstFilter.soort)}${Object.entries(SOORT_NAAM).map(([k, n]) => opt(k, n, lijstFilter.soort)).join("")}</select></div>
      <div class="veld"><label for="f-sd">Stadsdeel</label><select id="f-sd">${opt("", "Alle stadsdelen", lijstFilter.sd)}${STADSDELEN.map(s => opt(s, s, lijstFilter.sd)).join("")}${opt("-", "Zonder stadsdeel", lijstFilter.sd)}</select></div>
      <div class="veld"><label for="f-status">Laat zien</label><select id="f-status">${opt("", "Alles", lijstFilter.status)}${opt("zichtbaar", "Zichtbaar op de site", lijstFilter.status)}${opt("verborgen", "Verborgen en concepten", lijstFilter.status)}${opt("aangepast", "Aangepast", lijstFilter.status)}${opt("eigen", "Hier geplaatst", lijstFilter.status)}${opt("vast", "Bovenaan gezet", lijstFilter.status)}</select></div>
    </form>
    <p class="teller" id="teller" aria-live="polite"></p><ul class="b-lijst" id="lijst"></ul>
    <button class="knop lijn" type="button" id="meer" hidden>Meer laden</button><p id="m-lijst" hidden></p>`);
  koppelKader();
  const teken = () => {
    const alles = rijen.filter(past);
    $("#lijst").innerHTML = alles.slice(0, lijstFilter.n).map(rijHtml).join("") || `<li class="leeg">Niets gevonden. Probeer een ander woord of zet een filter terug op Alles.</li>`;
    $("#teller").textContent = `${Math.min(lijstFilter.n, alles.length)} van ${alles.length} berichten`;
    $("#meer").hidden = lijstFilter.n >= alles.length;
  };
  let wacht;
  $("#f-q").addEventListener("input", e => { clearTimeout(wacht); wacht = setTimeout(() => { lijstFilter.q = e.target.value.trim(); lijstFilter.n = 30; teken(); }, 200); });
  [["#f-soort", "soort"], ["#f-sd", "sd"], ["#f-status", "status"]].forEach(([s, k]) => $(s).addEventListener("change", e => { lijstFilter[k] = e.target.value; lijstFilter.n = 30; teken(); }));
  $("#meer").addEventListener("click", () => { lijstFilter.n += 30; teken(); });
  $("#nieuw").addEventListener("click", () => eigenEditor({ soort: "nieuws" }));
  $("#nieuw-ag").addEventListener("click", () => eigenEditor({ soort: "agenda" }));
  $("#lijst").addEventListener("click", async e => {
    const b = e.target.closest("[data-bewerk],[data-zicht]"); if (!b) return;
    const r = rijen.find(x => x.ref === (b.dataset.bewerk || b.dataset.zicht)); if (!r) return;
    if (b.dataset.bewerk) return r.bron === "eigen" ? eigenEditor(r.item) : importEditor(r);
    const klaar = bezig(b, "Bezig…");
    try {
      if (r.bron === "eigen") await vraag("/items", { method: "POST", body: { ...r.item, gepubliceerd: r.concept } });
      else await bewaarAanpassing(r, { ...velden(r.aanp), verborgen: !r.verborgen });
      await laadRijen(); const y = scrollY; await berichten(); scrollTo(0, y);
      const terug = $(`[data-zicht="${CSS.escape(r.ref)}"]`); if (terug) terug.focus({ preventScroll: true });
    } catch (err) { klaar(); melding($("#m-lijst"), err.message, true); }
  });
  teken();
}
const velden = a => { if (!a) return {}; const { door, bijgewerkt, soort, ...rest } = a; return rest; };
const bewaarAanpassing = (r, v) => vraag("/aanpassingen", { method: "POST", body: { id: r.id, soort: r.soort, titel: v.titel || r.orig?.titel || r.titel, velden: v } });

// ---------- een bericht van hartvoordenhaag.nl aanpassen ----------
async function importEditor(r) {
  app.innerHTML = kader(`<p class="leeg">Bericht laden…</p>`); koppelKader();
  const o = await origineel(r.soort, r.id);
  if (!o) { app.innerHTML = kader(`${H1("Niet gevonden")}<p class="inleiding">Dit bericht staat niet meer in de import van hartvoordenhaag.nl. Alleen de nieuwste 200 per soort worden overgenomen.</p><button class="knop lijn" type="button" id="terug">Terug naar de lijst</button>`); koppelKader(); $("#terug").onclick = () => gaNaar("berichten"); return; }
  const a = velden(r.aanp);
  const nu = { ...o, ...a, stadsdelen: a.stadsdelen || o.stadsdelen || [], onderwerpen: a.onderwerpen || o.onderwerpen || [] };
  const isAgenda = r.soort === "agenda", isRaad = RAAD.includes(r.soort);
  let beeld = a.foto ? fotoUrl(a.foto) : a.beeldWeg ? "" : o.beeld || "";
  let foto = a.foto || "", beeldWeg = !!a.beeldWeg, tekstAangeraakt = false;
  app.innerHTML = kader(`<p class="kruimel"><button class="link-knop" type="button" id="terug-lijst">Berichten</button> / ${esc(SOORT_NAAM[r.soort])}</p>
  ${H1("Bericht aanpassen")}
  <p class="inleiding">Dit bericht komt van <a href="${esc(o.link || "https://www.hartvoordenhaag.nl")}" target="_blank" rel="noopener">hartvoordenhaag.nl</a>. Wat u hier verandert, staat op de nieuwe site en blijft staan na de import van elke ochtend. Op hartvoordenhaag.nl zelf verandert niets.</p>
  ${r.aanp ? `<p class="melding">Laatst aangepast${r.aanp.door ? " door " + esc(r.aanp.door) : ""}${r.aanp.bijgewerkt ? " op " + esc(tijdNL(r.aanp.bijgewerkt)) : ""}.</p>` : ""}
  <form class="formulier" id="ed" style="margin-top:20px" novalidate>
    <div class="velden">
      <div class="veld breed"><label for="titel">Titel</label><input type="text" id="titel" maxlength="200" value="${esc(nu.titel)}"></div>
      <div class="veld"><label for="datum">Datum</label><input type="date" id="datum" value="${esc(nu.datum)}"></div>
      ${isAgenda ? `<div class="veld"><label for="tijd">Tijd</label><input type="time" id="tijd" value="${esc((nu.tijd || "").replace(".", ":"))}"></div>
        <div class="veld breed"><label for="plek">Plek</label><input type="text" id="plek" value="${esc(nu.plek || "")}"></div>` : ""}
      ${isRaad ? `<div class="veld"><label for="indiener">Ingediend door</label><input type="text" id="indiener" value="${esc(nu.indiener || "")}" placeholder="Naam van het raadslid"></div>` : ""}
      ${r.soort === "motie" || r.soort === "amendement" ? `<div class="veld"><label for="status">Uitslag</label><select id="status"><option value="">Nog niet bekend of niet vermeld</option>${STATUSSEN.map(s => `<option${nu.status === s ? " selected" : ""}>${s}</option>`).join("")}</select></div>` : ""}
      <fieldset class="veld breed"><legend>Stadsdeel <small>Geen vinkje betekent heel Den Haag</small></legend>${vinkjes("sd", STADSDELEN, nu.stadsdelen)}</fieldset>
      ${isAgenda ? "" : `<fieldset class="veld breed"><legend>Onderwerpen <small>Bepalen bij welke filters het bericht verschijnt</small></legend>${vinkjes("ow", ONDERWERPEN, nu.onderwerpen)}</fieldset>`}
      <div class="veld breed"><label for="samenvatting">Korte samenvatting <small>Eén of twee zinnen voor de overzichten</small></label><textarea id="samenvatting" maxlength="600" style="min-height:90px">${esc(nu.samenvatting || "")}</textarea></div>
      ${isAgenda ? "" : `<div class="veld breed" id="tekst-wrap"><span class="label">Tekst</span>
        ${heeftEmbed(o.html) && !a.html ? `<p class="melding" style="margin:6px 0 8px">Deze tekst bevat een video of ingesloten onderdeel. Past u de tekst aan, dan verdwijnt dat onderdeel op de nieuwe site.</p>` : ""}
        ${tekstVeld(schoneHtml(nu.html || ""), "tekst")}</div>`}
      ${isAgenda ? "" : `<div class="veld breed"><span class="label">Foto</span><div id="beeld-blok"></div>
        <div class="knoppen"><label class="knop lijn klein" for="foto">Andere foto kiezen</label><input type="file" id="foto" accept="image/jpeg,image/png,image/webp" class="verborgen-input"><button class="knop lijn klein" type="button" id="foto-weg">Geen foto</button></div></div>`}
      <fieldset class="veld breed"><legend>Op de site</legend>
        ${r.soort === "nieuws" || r.soort === "succes" ? `<label class="vink"><input type="checkbox" id="vast"${nu.vast ? " checked" : ""}><span>Bovenaan zetten (komt als eerste in de lijst en op de voorpagina)</span></label>` : ""}
        <label class="vink"><input type="checkbox" id="verborgen"${nu.verborgen ? " checked" : ""}><span>Verbergen op de site</span></label></fieldset>
    </div>
    <div class="knoppen"><button class="knop groen" type="submit">Opslaan</button><button class="knop lijn" type="button" id="annuleer">Annuleren</button>
      ${r.aanp ? `<button class="knop lijn" type="button" id="herstel">Terug naar het origineel</button>` : ""}
      ${siteLink(r) ? `<a class="meer" href="${esc(siteLink(r))}" target="_blank" rel="noopener">Bekijk op de site</a>` : ""}</div>
    <p id="m-ed" hidden></p></form>`);
  koppelKader();
  const form = $("#ed"), m = $("#m-ed");
  form.addEventListener("input", () => { gewijzigd = true; });
  form.addEventListener("change", () => { gewijzigd = true; });
  const leesTekst = isAgenda ? null : koppelTekstVeld($("#tekst-wrap"), () => { tekstAangeraakt = true; gewijzigd = true; });
  const toonBeeld = () => { const bb = $("#beeld-blok"); if (bb) bb.innerHTML = beeld ? `<img class="foto-voorbeeld" src="${esc(beeld)}" alt="Huidige foto">` : `<p class="leeg">Geen foto.</p>`; };
  toonBeeld();
  if (!isAgenda) {
    $("#foto").addEventListener("change", async e => {
      const f = e.target.files[0]; if (!f) return;
      try { melding(m, "Foto verkleinen en uploaden…"); const blob = await verklein(f, 1600, 0.82); const d = await vraag("/foto", { method: "POST", body: blob, headers: { "Content-Type": "image/jpeg" } }); foto = d.id; beeldWeg = false; beeld = URL.createObjectURL(blob); toonBeeld(); gewijzigd = true; melding(m, "Foto staat klaar. Vergeet niet op te slaan."); }
      catch (err) { melding(m, err.message, true); }
    });
    $("#foto-weg").addEventListener("click", () => { foto = ""; beeldWeg = true; beeld = ""; toonBeeld(); gewijzigd = true; });
  }
  const terug = () => { gewijzigd = false; gaNaar("berichten"); };
  $("#terug-lijst").addEventListener("click", e => { if (gewijzigd && !zeker(e.target, "Wijzigingen weggooien?")) return; terug(); });
  $("#annuleer").addEventListener("click", e => { if (gewijzigd && !zeker(e.target, "Wijzigingen weggooien?")) return; terug(); });
  const herstelKnop = $("#herstel");
  if (herstelKnop) herstelKnop.addEventListener("click", async e => {
    if (!zeker(e.target, "Zeker? Alle aanpassingen gaan weg")) return;
    const klaar = bezig(e.target, "Bezig…");
    try { await vraag(`/aanpassingen/${r.id}?titel=${encodeURIComponent(o.titel)}`, { method: "DELETE" }); rijenCache = null; terug(); }
    catch (err) { klaar(); melding(m, err.message, true); }
  });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const v = {};
    const titel = $("#titel").value.trim();
    if (titel.length < 4) { melding(m, "Geef het bericht een titel van minstens 4 tekens.", true); $("#titel").focus(); return; }
    if (titel !== o.titel) v.titel = titel;
    const datum = $("#datum").value; if (datum && datum !== o.datum) v.datum = datum;
    const sd = gevinkt(form, "sd"); if (!gelijkeLijst(sd, o.stadsdelen)) v.stadsdelen = sd;
    if (!isAgenda) { const ow = gevinkt(form, "ow"); if (!gelijkeLijst(ow, o.onderwerpen)) v.onderwerpen = ow; }
    const sam = $("#samenvatting").value.trim(); if (sam !== (o.samenvatting || "").trim()) v.samenvatting = sam;
    if (isAgenda) {
      const tijd = $("#tijd").value.replace(":", "."); if (tijd !== (o.tijd || "")) v.tijd = tijd;
      const plek = $("#plek").value.trim(); if (plek !== (o.plek || "")) v.plek = plek;
    }
    if (isRaad) { const ind = $("#indiener").value.trim(); if (ind !== (o.indiener || "")) v.indiener = ind; }
    const st = $("#status"); if (st && st.value !== (o.status || "")) v.status = st.value;
    if (!isAgenda) {
      if (tekstAangeraakt) v.html = leesTekst(); else if (a.html != null) v.html = a.html;
      if (foto) v.foto = foto; else if (beeldWeg && o.beeld) v.beeldWeg = true;
    }
    const vastVeld = $("#vast"); if (vastVeld && vastVeld.checked) v.vast = true;
    if ($("#verborgen").checked) v.verborgen = true;
    const klaar = bezig(e.submitter || form.querySelector("button[type=submit]"), "Opslaan…");
    try {
      await bewaarAanpassing(r, v);
      gewijzigd = false; rijenCache = null;
      await laadRijen(); await berichten();
      melding($("#m-lijst"), Object.keys(v).length ? `Opgeslagen: "${titel}". Het staat binnen een minuut zo op de site.` : `Er was niets veranderd ten opzichte van het origineel.`);
    } catch (err) { klaar(); melding(m, err.message, true); }
  });
}

// ---------- een eigen bericht plaatsen of bewerken ----------
function eigenEditor(i) {
  const v = (k, d = "") => esc(i[k] ?? d);
  const soortNu = i.soort || "nieuws";
  const html = i.html || (i.tekst ? i.tekst.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("") : "");
  const sd = i.stadsdelen && i.stadsdelen.length ? i.stadsdelen : i.stadsdeel ? [i.stadsdeel] : [];
  app.innerHTML = kader(`<p class="kruimel"><button class="link-knop" type="button" id="terug-lijst">Berichten</button> / ${i.id ? "Bewerken" : "Nieuw"}</p>
  ${H1(i.id ? "Bericht bewerken" : soortNu === "agenda" ? "Nieuwe afspraak" : "Nieuw bericht")}
  <form class="formulier" id="ed" style="margin-top:20px" novalidate>
    <div class="velden">
      <div class="veld"><label for="soort">Soort</label><select id="soort">${Object.entries(EIGEN_SOORTEN).map(([k, n]) => `<option value="${k}"${soortNu === k ? " selected" : ""}>${n}</option>`).join("")}</select></div>
      <div class="veld"><label for="datum">Datum</label><input type="date" id="datum" value="${v("datum", vandaag())}"><small data-agenda>De dag van de afspraak.</small></div>
      <div class="veld breed"><label for="titel">Titel</label><input type="text" id="titel" maxlength="160" value="${v("titel")}"></div>
      <div class="veld" data-agenda><label for="tijd">Tijd</label><input type="time" id="tijd" value="${esc((i.tijd || "").replace(".", ":"))}"></div>
      <div class="veld" data-agenda><label for="plek">Plek</label><input type="text" id="plek" placeholder="Wijkcentrum, straat" value="${v("plek")}"></div>
      <fieldset class="veld breed"><legend>Stadsdeel <small>Geen vinkje betekent heel Den Haag</small></legend>${vinkjes("sd", STADSDELEN, sd)}</fieldset>
      <fieldset class="veld breed" data-geen-agenda><legend>Onderwerpen <small>Niet verplicht</small></legend>${vinkjes("ow", ONDERWERPEN, i.onderwerpen || [])}</fieldset>
      <div class="veld breed"><label for="samenvatting">Korte samenvatting <small>Eén of twee zinnen voor de overzichten</small></label><textarea id="samenvatting" maxlength="400" style="min-height:80px">${v("samenvatting")}</textarea></div>
      <div class="veld breed" id="tekst-wrap"><span class="label">Tekst</span>${tekstVeld(schoneHtml(html), "tekst")}</div>
      <div class="veld breed"><label for="link">Link <small>Niet verplicht, begint met https://</small></label><input type="url" id="link" value="${v("link")}"></div>
      <div class="veld breed"><span class="label">Foto <small>JPG, PNG of WebP. Wordt automatisch verkleind.</small></span><div id="voorbeeld">${i.foto ? `<img class="foto-voorbeeld" src="${fotoUrl(i.foto)}" alt="Huidige foto">` : ""}</div>
        <div class="knoppen"><label class="knop lijn klein" for="foto">Foto kiezen</label><input type="file" id="foto" accept="image/jpeg,image/png,image/webp" class="verborgen-input">${i.foto ? `<button class="knop lijn klein" type="button" id="foto-weg">Geen foto</button>` : ""}</div></div>
      <fieldset class="veld breed" data-vast><legend>Op de site</legend><label class="vink"><input type="checkbox" id="vast"${i.vast ? " checked" : ""}><span>Bovenaan zetten (komt als eerste in de lijst en op de voorpagina)</span></label></fieldset>
    </div>
    <div class="knoppen"><button class="knop groen" type="submit" data-publiceer="1">${i.id && i.gepubliceerd ? "Opslaan" : "Publiceren"}</button><button class="knop lijn" type="submit" data-publiceer="0">${i.id && i.gepubliceerd ? "Terugzetten naar concept" : "Opslaan als concept"}</button><button class="knop lijn" type="button" id="annuleer">Annuleren</button>
      ${i.id ? `<button class="knop lijn" type="button" id="weg">Verwijderen</button>` : ""}
      ${i.id && i.gepubliceerd ? `<a class="meer" href="./#${SITEPAD[i.soort]}/w${i.id}" target="_blank" rel="noopener">Bekijk op de site</a>` : ""}</div>
    <p id="m-ed" hidden></p></form>`);
  koppelKader();
  const form = $("#ed"), m = $("#m-ed");
  let fotoId = i.foto || "";
  const leesTekst = koppelTekstVeld($("#tekst-wrap"), () => { gewijzigd = true; });
  const toonVelden = () => {
    const s = $("#soort").value;
    $$("[data-agenda]").forEach(el => el.hidden = s !== "agenda");
    $$("[data-geen-agenda]").forEach(el => el.hidden = s === "agenda");
    $$("[data-vast]").forEach(el => el.hidden = !(s === "nieuws" || s === "succes"));
  };
  $("#soort").addEventListener("change", toonVelden); toonVelden();
  form.addEventListener("input", () => { gewijzigd = true; });
  const terug = () => { gewijzigd = false; gaNaar("berichten"); };
  $("#terug-lijst").addEventListener("click", e => { if (gewijzigd && !zeker(e.target, "Wijzigingen weggooien?")) return; terug(); });
  $("#annuleer").addEventListener("click", e => { if (gewijzigd && !zeker(e.target, "Wijzigingen weggooien?")) return; terug(); });
  $("#foto").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try { melding(m, "Foto verkleinen en uploaden…"); const blob = await verklein(f, 1600, 0.82); const d = await vraag("/foto", { method: "POST", body: blob, headers: { "Content-Type": "image/jpeg" } }); fotoId = d.id; $("#voorbeeld").innerHTML = `<img class="foto-voorbeeld" src="${URL.createObjectURL(blob)}" alt="Gekozen foto">`; gewijzigd = true; melding(m, "Foto staat klaar. Vergeet niet op te slaan."); }
    catch (err) { melding(m, err.message, true); }
  });
  const fw = $("#foto-weg"); if (fw) fw.addEventListener("click", () => { fotoId = ""; $("#voorbeeld").innerHTML = ""; gewijzigd = true; });
  const wk = $("#weg");
  if (wk) wk.addEventListener("click", async e => {
    if (!zeker(e.target, "Echt verwijderen? Dit kan niet terug")) return;
    const klaar = bezig(e.target, "Bezig…");
    try { await vraag("/items/" + i.id, { method: "DELETE" }); rijenCache = null; terug(); }
    catch (err) { klaar(); melding(m, err.message, true); }
  });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const knop = e.submitter || form.querySelector("button[type=submit]");
    const s = $("#soort").value;
    const b = { id: i.id, soort: s, stadsdelen: gevinkt(form, "sd"), onderwerpen: s === "agenda" ? [] : gevinkt(form, "ow"), titel: $("#titel").value, datum: $("#datum").value,
      tijd: s === "agenda" ? $("#tijd").value : "", plek: s === "agenda" ? $("#plek").value : "", samenvatting: $("#samenvatting").value, html: leesTekst(),
      link: $("#link").value.trim(), foto: fotoId, vast: (s === "nieuws" || s === "succes") && $("#vast").checked, gepubliceerd: knop.dataset.publiceer === "1" };
    if (b.titel.trim().length < 4) { melding(m, "Geef het bericht een titel van minstens 4 tekens.", true); $("#titel").focus(); return; }
    if (b.link && !/^https:\/\//.test(b.link)) { melding(m, "Een link begint met https://.", true); $("#link").focus(); return; }
    const knoppen = $$("#ed button[type=submit]"); knoppen.forEach(k => k.disabled = true);
    const oud = knop.textContent; knop.textContent = "Opslaan…";
    try {
      await vraag("/items", { method: "POST", body: b });
      gewijzigd = false; rijenCache = null; tab = "berichten"; opslag.zet("tab", tab);
      await laadRijen(); await berichten();
      melding($("#m-lijst"), b.gepubliceerd ? `Gepubliceerd: "${b.titel.trim()}". Het staat binnen een minuut op de site.` : `Opgeslagen als concept: "${b.titel.trim()}".`);
    } catch (err) { melding(m, err.message, true); knoppen.forEach(k => k.disabled = false); knop.textContent = oud; }
  });
}

// ---------- postvak ----------
const herlaad = async () => { const y = scrollY; await start(); scrollTo(0, y); };
let ongedaan = null; // {id, naam, tot}: na "Afgehandeld" kan het nog even terug
let postFilter = "";
async function postvak() {
  const { berichten: post } = await vraag("/inbox");
  const toonArchief = postFilter === "archief";
  const soorten = Object.keys(FORM_NAAM);
  const open = post.filter(b => (b.status || "nieuw") !== "afgehandeld");
  const tel = k => open.filter(b => b.soort === k).length;
  const zicht = post.filter(b => toonArchief ? b.status === "afgehandeld" : (b.status || "nieuw") !== "afgehandeld" && (!postFilter || b.soort === postFilter));
  const veld = (k, v) => k === "email" ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : k === "telefoon" ? `<a href="tel:${esc(v.replace(/[^\d+]/g, ""))}">${esc(v)}</a>` : esc(v);
  app.innerHTML = kader(`${H1("Postvak")}
    <p class="inleiding">Berichten via de formulieren op de site. Afgehandelde berichten gaan naar het archief en zijn terug te zetten.</p>
    ${ongedaan && ongedaan.tot > Date.now() ? `<p class="melding toast" role="status">Bericht van ${esc(ongedaan.naam)} staat in het archief. <button class="knop lijn klein" type="button" id="ongedaan">Ongedaan maken</button></p>` : ""}
    <div class="filters" style="margin-top:18px">
      <button class="knopje" type="button" data-filter="" aria-pressed="${!postFilter}">Alles open (${open.length})</button>
      ${soorten.map(k => `<button class="knopje" type="button" data-filter="${k}" aria-pressed="${postFilter === k}">${FORM_NAAM[k]} (${tel(k)})</button>`).join("")}
      <button class="knopje" type="button" data-filter="archief" aria-pressed="${toonArchief}">Archief</button></div>
    <div class="postvak">${zicht.length ? zicht.map(b => `<div class="rij"><div><p class="bijschrift"><span>${esc(FORM_NAAM[b.soort] || b.soort)}</span>${b.stadsdeel ? `<span class="plek">${esc(b.stadsdeel)}</span>` : ""}<time>${esc(tijdNL(b.tijd))}</time></p>
      <h3 style="margin-top:6px">${esc(b.naam || b.email)}</h3>
      <dl>${Object.keys(VELD_NAAM).filter(k => b[k] && k !== "stadsdeel").map(k => `<dt>${VELD_NAAM[k]}</dt><dd>${veld(k, b[k])}</dd>`).join("")}${b.status === "afgehandeld" ? `<dt>Afgehandeld</dt><dd>door ${esc(b.door || "onbekend")}</dd>` : ""}</dl></div>
      <div class="acties">${b.status === "afgehandeld" ? `<button class="knop lijn klein" type="button" data-status="nieuw" data-id="${b.id}">Terugzetten</button><button class="knop lijn klein" type="button" data-weg="${b.id}">Verwijderen</button>` : `<button class="knop groen klein" type="button" data-status="afgehandeld" data-id="${b.id}">Afgehandeld</button>`}</div></div>`).join("") : `<p class="leeg" style="margin-top:16px">Niets in deze lijst.</p>`}</div>`);
  koppelKader();
  $$("[data-filter]").forEach(k => k.addEventListener("click", () => { postFilter = k.dataset.filter; start(); }));
  $$("[data-status]").forEach(k => k.addEventListener("click", async () => {
    k.disabled = true;
    try {
      await vraag(`/inbox/${k.dataset.id}/status`, { method: "POST", body: { status: k.dataset.status } });
      const b = post.find(x => x.id === k.dataset.id);
      ongedaan = k.dataset.status === "afgehandeld" ? { id: k.dataset.id, naam: (b && (b.naam || b.email)) || "onbekend", tot: Date.now() + 10000 } : null;
      if (ongedaan) setTimeout(() => { const og = $("#ongedaan"); if (og && ongedaan && ongedaan.tot <= Date.now()) { og.closest(".melding").remove(); ongedaan = null; } }, 10100);
      await herlaad();
      const og2 = $("#ongedaan"); if (og2) og2.focus({ preventScroll: true });
    } catch (err) { k.disabled = false; k.textContent = "Lukte niet, probeer opnieuw"; }
  }));
  const og = $("#ongedaan");
  if (og) og.addEventListener("click", async () => {
    og.disabled = true;
    try { const id = ongedaan.id; await vraag(`/inbox/${id}/status`, { method: "POST", body: { status: "nieuw" } }); ongedaan = null; await herlaad(); const t = $(`[data-status="afgehandeld"][data-id="${id}"]`); if (t) t.focus({ preventScroll: true }); }
    catch (err) { og.disabled = false; og.textContent = "Lukte niet, probeer opnieuw"; }
  });
  $$("[data-weg]").forEach(k => k.addEventListener("click", async () => {
    if (!zeker(k, "Echt verwijderen? Dit kan niet terug.")) return;
    try { await vraag("/inbox/" + k.dataset.weg, { method: "DELETE" }); start(); }
    catch (err) { k.textContent = "Lukte niet"; }
  }));
}

// ---------- mensen met toegang ----------
async function mensen() {
  const { gebruikers } = await vraag("/gebruikers");
  const beheerders = gebruikers.filter(g => g.rol === "beheerder").length;
  app.innerHTML = kader(`${H1("Mensen")}
    <p class="inleiding">Wie mag inloggen en wat ze mogen. Geef iemand een inlognaam en een wachtwoord van minstens tien tekens. Stuur het wachtwoord apart, bijvoorbeeld via Signal.</p>
    <dl class="rollen"><dt>Redacteur</dt><dd>Berichten plaatsen en aanpassen, het postvak afhandelen.</dd><dt>Beheerder</dt><dd>Alles wat een redacteur mag, plus mensen toegang geven of intrekken en een reservekopie maken. Zorg dat er altijd minstens twee zijn.</dd></dl>
    ${beheerders === 0 ? `<p class="melding waarschuwing" role="status"><b>Er is nog geen beheerder naast de eigenaar.</b> Voeg er minstens één toe, bijvoorbeeld de fractievoorzitter of de secretaris.</p>` : ""}
    <ul class="b-lijst" style="margin-top:20px">${gebruikers.length ? gebruikers.map(g => `<li class="rij b-rij"><div><h3>${esc(g.weergave)}</h3><p class="bijschrift"><span>inlognaam ${esc(g.naam)}</span><span class="status">${esc(ROL_NAAM[g.rol] || g.rol)}</span>${g.gemaakt ? `<span class="zacht">sinds ${esc(datumNL(g.gemaakt))}</span>` : ""}</p></div>
      <div class="acties"><button class="knop lijn klein" type="button" data-wijzig="${esc(g.naam)}">Rol of wachtwoord</button><button class="knop lijn klein" type="button" data-weg="${esc(g.naam)}">Toegang intrekken</button></div></li>`).join("") : `<li class="leeg">Nog niemand anders.</li>`}</ul>
    <form class="formulier" id="nieuw" style="margin-top:28px;max-width:680px" novalidate><h2 style="font-size:1.6rem" id="nieuw-kop">Iemand toegang geven</h2>
      <div class="velden"><div class="veld"><label for="g-weergave">Naam</label><input type="text" id="g-weergave" placeholder="Voor- en achternaam"></div>
      <div class="veld"><label for="g-naam">Inlognaam</label><input type="text" id="g-naam" autocapitalize="none" placeholder="bijvoorbeeld voornaam"></div>
      <div class="veld"><label for="g-rol">Rol</label><select id="g-rol"><option value="redacteur">Redacteur</option><option value="beheerder">Beheerder</option></select></div>
      <div class="veld"><label for="g-ww">Wachtwoord</label><input type="text" id="g-ww" autocomplete="new-password"><small id="ww-uitleg">Bij een bestaande inlognaam: leeg laten houdt het oude wachtwoord.</small><small><button class="knop lijn klein" type="button" id="bedenk" style="margin-top:6px">Bedenk een sterk wachtwoord</button></small></div></div>
      <button class="knop groen" type="submit">Opslaan</button><p id="m-g" hidden></p></form>`);
  koppelKader();
  $("#bedenk").addEventListener("click", () => {
    const w = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    $("#g-ww").value = [...crypto.getRandomValues(new Uint32Array(16))].map(n => w[n % w.length]).join("");
  });
  $$("[data-wijzig]").forEach(b => b.addEventListener("click", () => {
    const g = gebruikers.find(x => x.naam === b.dataset.wijzig);
    $("#g-weergave").value = g.weergave; $("#g-naam").value = g.naam; $("#g-rol").value = g.rol === "beheerder" ? "beheerder" : "redacteur"; $("#g-ww").value = "";
    $("#nieuw-kop").textContent = `${g.weergave}: rol of wachtwoord wijzigen`; $("#nieuw").scrollIntoView({ block: "start" }); $("#g-rol").focus({ preventScroll: true });
  }));
  $$("[data-weg]").forEach(b => b.addEventListener("click", async () => {
    if (!zeker(b, "Zeker weten?")) return;
    try { await vraag("/gebruikers/" + encodeURIComponent(b.dataset.weg), { method: "DELETE" }); start(); }
    catch (err) { b.textContent = err.message.length < 40 ? err.message : "Lukte niet"; melding($("#m-g"), err.message, true); }
  }));
  $("#nieuw").addEventListener("submit", async e => {
    e.preventDefault();
    const klaar = bezig(e.target.querySelector("button[type=submit]"), "Opslaan…");
    try { await vraag("/gebruikers", { method: "POST", body: { weergave: $("#g-weergave").value, naam: $("#g-naam").value, rol: $("#g-rol").value, wachtwoord: $("#g-ww").value } }); start(); }
    catch (err) { klaar(); melding($("#m-g"), err.message, true); }
  });
}

// ---------- mijn account ----------
async function account() {
  app.innerHTML = kader(`${H1("Mijn account")}
    <p class="inleiding">U bent ingelogd als <b>${esc(sessie.naam)}</b>, ${esc((ROL_NAAM[sessie.rol] || sessie.rol).toLowerCase())}.</p>
    ${sessie.login ? `<form class="formulier" id="f-ww" style="margin-top:20px;max-width:520px" novalidate><h2 style="font-size:1.6rem">Wachtwoord wijzigen</h2>
      <div class="veld"><label for="oud">Huidig wachtwoord</label><input type="password" id="oud" autocomplete="current-password"></div>
      <div class="veld"><label for="nieuw-ww">Nieuw wachtwoord <small>Minstens tien tekens</small></label><input type="password" id="nieuw-ww" autocomplete="new-password"></div>
      <button class="knop groen" type="submit">Wachtwoord wijzigen</button><p id="m-ww" hidden></p></form>`
      : `<p class="leeg" style="margin-top:16px">U logt in met een code via Telegram of met de noodsleutel, dus u heeft hier geen wachtwoord.</p>`}`);
  koppelKader();
  const f = $("#f-ww");
  if (f) f.addEventListener("submit", async e => {
    e.preventDefault();
    const klaar = bezig(f.querySelector("button[type=submit]"), "Bezig…");
    try { await vraag("/wachtwoord", { method: "POST", body: { oud: $("#oud").value, nieuw: $("#nieuw-ww").value } }); f.reset(); melding($("#m-ww"), "Uw wachtwoord is gewijzigd."); }
    catch (err) { melding($("#m-ww"), err.message, true); }
    klaar();
  });
}

// ---------- hulp en reservekopie ----------
async function hulp() {
  app.innerHTML = kader(`${H1("Hulp")}
    <div class="hulp artikel-tekst">
      <h2>Wat kan ik hier?</h2>
      <p>U regelt hier wat er op de site staat. De berichten van hartvoordenhaag.nl komen elke ochtend vanzelf binnen. U kunt ze aanpassen, een stadsdeel geven of verbergen. Eigen berichten, afspraken en petities plaatst u hier zelf.</p>
      <h2>Een nieuw bericht of een afspraak plaatsen</h2>
      <ol><li>Kies <b>Berichten</b> en dan <b>Nieuw bericht</b> of <b>Nieuwe afspraak</b>.</li><li>Vul een titel, datum en korte samenvatting in. Vink het stadsdeel aan waar het over gaat.</li><li>Schrijf de tekst. Met de knoppen boven het tekstvak maakt u een kop, een opsomming of een link.</li><li>Kies <b>Publiceren</b>. Binnen een minuut staat het op de site. Nog niet klaar? Kies <b>Opslaan als concept</b>.</li></ol>
      <h2>Een bestaand bericht aanpassen</h2>
      <p>Zoek het bericht onder <b>Berichten</b>, bijvoorbeeld op een woord uit de titel. Kies <b>Bewerken</b>. Verander wat nodig is en kies <b>Opslaan</b>. Het origineel op hartvoordenhaag.nl blijft gewoon staan. Spijt? Kies <b>Terug naar het origineel</b>.</p>
      <h2>Stadsdeel kiezen</h2>
      <p>Vink een of meer stadsdelen aan. Het bericht verschijnt dan bij dat stadsdeel op de kaart en in het filter. Geen vinkje betekent: heel Den Haag.</p>
      <h2>Verbergen en bovenaan zetten</h2>
      <p>Met <b>Verbergen</b> haalt u een bericht van de site zonder het te wissen. Met <b>Weer tonen</b> komt het terug. Bij nieuws en successen kunt u een bericht <b>bovenaan zetten</b>. Het staat dan als eerste in de lijst en op de voorpagina. Haal het vinkje weer weg als het niet meer actueel is.</p>
      <h2>Het postvak</h2>
      <p>Meldingen, vragen, aanmeldingen en handtekeningen van de site komen in het postvak. Heeft u iets afgehandeld, kies dan <b>Afgehandeld</b>. Het gaat naar het archief en kan terug. In het postvak staan persoonsgegevens. Deel ze niet verder dan nodig.</p>
      <h2>Wie mag wat?</h2>
      <p>Een <b>redacteur</b> plaatst en past berichten aan en handelt het postvak af. Een <b>beheerder</b> mag daarnaast mensen toegang geven en een reservekopie maken. Zorg dat er altijd minstens twee beheerders zijn, zodat het werk doorgaat als iemand wegvalt.</p>
      <h2>Als er iets misgaat</h2>
      <p>Lukt opslaan niet? Wacht even en probeer het opnieuw. Werkt de site helemaal niet meer, dan kan een webbouwer verder met de uitleg in <a href="https://github.com/damienzeller-png/damienzeller-png.github.io/blob/main/proef/LEESMIJ.md" target="_blank" rel="noopener">LEESMIJ.md</a>. Daar staat ook hoe de noodtoegang werkt als niemand meer kan inloggen.</p>
    </div>
    ${magBeheren() ? `<section class="formulier" style="margin-top:28px;max-width:680px"><h2 style="font-size:1.6rem">Reservekopie</h2>
      <p class="leeg">Download alles uit de beheeromgeving in één bestand: eigen berichten, aanpassingen, het postvak en wie er toegang heeft (zonder wachtwoorden). Bewaar het op een veilige plek, want het postvak bevat persoonsgegevens.</p>
      <button class="knop groen" type="button" id="export">Download reservekopie</button><p id="m-export" hidden></p></section>` : ""}`);
  koppelKader();
  const ex = $("#export");
  if (ex) ex.addEventListener("click", async () => {
    const klaar = bezig(ex, "Bezig…");
    try {
      const d = await vraag("/export");
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `reservekopie-proefsite-${vandaag()}.json`; document.body.appendChild(a); a.click(); a.remove();
      melding($("#m-export"), "De reservekopie is gedownload.");
    } catch (err) { melding($("#m-export"), err.message, true); }
    klaar();
  });
}

start();
