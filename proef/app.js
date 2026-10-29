/* Proefsite Hart voor Den Haag: één pagina met routes achter het hekje (#nieuws, #raadswerk/vragen, ...).
   Inhoud: data/*.json (elke ochtend overgenomen van hartvoordenhaag.nl) plus wat redacteuren plaatsen via de achterkant. */
"use strict";
const API = "https://hvdh-proef.damienzeller.workers.dev";
const VIDEO = "https://www.hartvoordenhaag.nl/wp-content/uploads/2026/01/Hart-voor-Den-Haag.mp4";
const TEL = "06 234 621 39", TEL_LINK = "tel:+31623462139", MAIL = "hartvoordenhaag@denhaag.nl";
const STADSDELEN = ["Centrum", "Escamp", "Haagse Hout", "Laak", "Leidschenveen-Ypenburg", "Loosduinen", "Scheveningen", "Segbroek"];
const ONDERWERPEN = ["Veiligheid", "Wonen en bouwen", "Verkeer en parkeren", "Zorg en welzijn", "Onderwijs en jeugd", "Economie en ondernemers", "Groen en leefbaarheid", "Cultuur en sport", "Geld en bestuur", "Asiel en opvang"];
const MND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const MAAND = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const DAG = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const PUNTEN = [
  ["Bouwen voor Hagenaars", "Meer betaalbare koopwoningen en middeldure huur. Wie een economische of maatschappelijke band met Den Haag heeft, krijgt voorrang. Sneller bouwen, minder regeltjes."],
  ["Investeren in veiligheid", "200 extra handhavers, zero tolerance tegen straatgeweld en een harde aanpak van explosies. Iedereen moet zich dag en nacht veilig voelen op straat."],
  ["Een leefbare en bereikbare stad", "Een schone stad zonder afvalcrisis, betaalbaar parkeren en goede ouderenzorg. Bewoners krijgen weer echte inspraak bij grote projecten in de wijk."],
  ["Echte ombudspolitiek", "Politici die de straat op gaan, bureaucratie bestrijden en problemen direct oplossen. Een afspraak is een afspraak: de gemeente moet er weer voor ú zijn."],
  ["Geen asielopvang in Den Haag", "Den Haag is de dichtstbevolkte stad van Nederland. Wij kiezen voor onze eigen inwoners: geen nieuwe opvanglocaties in de stad."],
  ["Samenwerking voor de stad", "Een stabiel bestuur zonder politieke spelletjes, samen met bewoners en ondernemers. Niemand wordt uitgesloten."],
];
const SOORT = {
  nieuws: { naam: "Nieuws", pad: "nieuws", bron: "nieuws" },
  succes: { naam: "Succes", pad: "successen", bron: "successen" },
  motie: { naam: "Motie", pad: "raadswerk/motie", bron: "moties" },
  amendement: { naam: "Amendement", pad: "raadswerk/amendement", bron: "amendementen" },
  raadsvraag: { naam: "Schriftelijke vragen", pad: "raadswerk/vraag", bron: "raadsvragen" },
  spreektekst: { naam: "Spreektekst", pad: "raadswerk/spreektekst", bron: "spreekteksten" },
  petitie: { naam: "Petitie", pad: "petities", bron: "petities" },
  vacature: { naam: "Vacature", pad: "vacatures" },
  agenda: { naam: "Agenda", pad: "agenda" },
};
const PROGRAMMA = "https://www.hartvoordenhaag.nl/wp-content/uploads/2026/01/EnNuAanDeSlag_Hart_voor_Den_Haag_V1.pdf";
const PIJL = '<svg class="pijl" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
const UIT = '<svg class="pijl" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3 4 12"/></svg>';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const dt = iso => { const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number); return { d, m: m - 1, y, wd: new Date(y, m - 1, d).getDay() }; };
const datum = iso => { const x = dt(iso); return `${x.d} ${MAAND[x.m]}${x.y !== new Date().getFullYear() ? " " + x.y : ""}`; };
const vandaag = () => new Date().toISOString().slice(0, 10);
const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const initialen = n => n.split(" ").filter(w => /^[A-ZÀ-Ý]/.test(w)).map(w => w[0]).slice(0, 2).join("");
const fmt = new Intl.NumberFormat("nl-NL");
const opslag = {
  lees(k) { try { return localStorage.getItem(k); } catch { return null; } },
  zet(k, v) { try { localStorage.setItem(k, v); } catch { /* geen opslag */ } },
  sLees(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  sZet(k, v) { try { sessionStorage.setItem(k, v); } catch { /* geen opslag */ } },
};
const isTouch = matchMedia("(hover: none)").matches;

// ---------- gegevens ----------
const cache = {};
function laad(naam) {
  if (!cache[naam]) cache[naam] = fetch(`data/${naam}.json?v=4`).then(r => r.ok ? r.json() : []).catch(() => []);
  return cache[naam];
}
let apiItems = null;
function eigen() {
  if (!apiItems) {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 4000);
    apiItems = fetch(API + "/inhoud", { signal: ctrl.signal }).then(r => r.json()).then(d => (d.items || []).map(i => ({
      id: "w" + i.id, soort: i.soort, titel: i.titel, datum: i.datum, samenvatting: i.samenvatting || i.tekst.slice(0, 240),
      html: i.tekst.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join(""),
      beeld: i.foto ? `${API}/foto/${i.foto}` : "", stadsdelen: i.stadsdeel ? [i.stadsdeel] : [], link: i.link,
      tijd: i.tijd, plek: i.plek, eigen: true, onderwerpen: [],
    }))).catch(() => []);
  }
  return apiItems;
}
async function soort(s) {
  const bron = SOORT[s] && SOORT[s].bron;
  const [vast, nieuw] = await Promise.all([bron ? laad(bron) : [], eigen()]);
  return [...nieuw.filter(i => i.soort === s), ...vast].sort((a, b) => b.datum.localeCompare(a.datum));
}
async function agenda() {
  const [vast, nieuw] = await Promise.all([laad("agenda"), eigen()]);
  const w = nieuw.filter(i => i.soort === "agenda").map(i => ({ ...i, stadsdeel: i.stadsdelen[0] || "" }));
  return [...vast, ...w].filter(a => a.datum >= vandaag()).sort((a, b) => (a.datum + (a.tijd || "")).localeCompare(b.datum + (b.tijd || "")));
}

// ---------- bouwstenen ----------
// kaart en fractie laden we één keer vóór de eerste pagina: het silhouet van het stadsdeel en de gezichten van de indieners
let KAART = null, FRACTIE = [];
function zetSprite(k) {
  if (document.getElementById("sd-sprite")) return;
  const d = document.createElement("div");
  d.id = "sd-sprite"; d.setAttribute("aria-hidden", "true");
  d.innerHTML = `<svg width="0" height="0" style="position:absolute"><defs>${Object.entries(k.sd).map(([n, v]) => `<path id="sd-${slug(n)}" d="${v.d}"/>`).join("")}</defs></svg>`;
  document.body.prepend(d);
}
const silhouet = n => KAART && KAART.sd[n] && KAART.sd[n].bb ? `<svg class="sil" viewBox="${KAART.sd[n].bb.join(" ")}" aria-hidden="true"><use href="#sd-${slug(n)}"/></svg>` : "";
const lidVan = naam => FRACTIE.find(f => slug(f.naam) === slug(naam));
const escRe = t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function wieVan(i) {
  if (i.indiener) return i.indiener.split(" en ").map(lidVan).filter(Boolean);
  if (i.soort !== "nieuws" && i.soort !== "succes") return [];
  const t = i.titel + " " + (i.samenvatting || "").slice(0, 160);
  return FRACTIE.filter(f => {
    const achter = f.naam.split(" ").slice(1).join(" ");
    return new RegExp(`(^|[^\\p{L}])(${escRe(achter)}|${escRe(achter[0].toUpperCase() + achter.slice(1))})(?![\\p{L}])`, "u").test(t);
  });
}
const gezichtjes = (mensen, max = 2) => mensen.slice(0, max).map(f => f.beeld ? `<img src="${esc(f.beeld)}" alt="" loading="lazy" decoding="async">` : `<span class="leeg-foto">${initialen(f.naam)}</span>`).join("");
const isOpen = p => !!p.eigen || (Date.now() - new Date(p.datum)) / 864e5 < 365;
function bijschrift(i, opties = {}) {
  const delen = [];
  if (i.stadsdelen && i.stadsdelen.length) delen.push(`<span class="plek">${silhouet(i.stadsdelen[0])}${esc(i.stadsdelen.join(" en "))}</span>`);
  if (opties.soort) delen.push(`<span>${esc(SOORT[i.soort]?.naam || i.soort)}</span>`);
  if (opties.open) delen.push(isOpen(i) ? `<span class="status">Loopt nog</span>` : `<span>Gesloten</span>`);
  if (i.indiener) delen.push(`<span>${esc(i.indiener)}</span>`);
  if (i.status) delen.push(`<span class="status">${esc(i.status)}</span>`);
  if (i.handtekeningen) delen.push(`<span>${fmt.format(i.handtekeningen)} handtekeningen</span>`);
  delen.push(`<time datetime="${esc(i.datum)}">${datum(i.datum)}</time>`);
  if (i.ris && opties.ris !== false) delen.push(`<span>${esc(i.ris)}</span>`);
  if (i.eigen) delen.push(`<span class="nieuw">Net geplaatst</span>`);
  return `<p class="bijschrift">${delen.join("")}</p>`;
}
const href = i => `#${SOORT[i.soort].pad}/${encodeURIComponent(i.id)}`;
function logItem(i, eerste, opties = {}) {
  return `<li class="log-item${eerste ? " eerste" : ""}${i.beeld ? "" : " zonder-beeld"}">
    <div class="log-tekst"><h3><a href="${href(i)}">${esc(i.titel)}</a></h3>${bijschrift(i, opties)}${i.samenvatting ? `<p class="sam">${esc(i.samenvatting)}</p>` : ""}</div>
    ${i.beeld ? `<img class="log-beeld" src="${esc(i.beeld)}" alt="" loading="${eerste ? "eager" : "lazy"}" decoding="async">` : ""}</li>`;
}
const stukItem = (i, opties = {}) => `<li><h3><a href="${href(i)}">${esc(i.titel)}</a></h3>${bijschrift(i, opties)}${i.samenvatting ? `<p class="sam">${esc(i.samenvatting)}</p>` : ""}</li>`;
function agendaItem(a) {
  const x = dt(a.datum);
  return `<li><div class="dd" aria-hidden="true"><b>${x.d}</b><span>${MND[x.m]}</span></div>
    <div><h3>${esc(a.titel)}</h3><p>${DAG[x.wd]} ${x.d} ${MAAND[x.m]}${a.tijd ? ", " + esc(a.tijd) + " uur" : ""} · ${esc(a.plek || "")}${a.stadsdeel ? " · " + esc(a.stadsdeel) : ""}</p>${a.samenvatting ? `<p>${esc(a.samenvatting)}</p>` : ""}</div></li>`;
}
function portret(f, opties = {}) {
  const naam = esc(f.naam);
  const onder = opties.rol ? esc(f.rol) : (f.stadsdelen && f.stadsdelen.length ? esc(f.stadsdelen.join(" en ")) : "");
  const pf = opties.portefeuilles && f.portefeuilles && f.portefeuilles.length ? `<small>${esc(f.portefeuilles.slice(0, 3).join(", "))}${f.portefeuilles.length > 3 ? " en meer" : ""}</small>` : "";
  return `<figure>${f.beeld ? `<img src="${esc(f.beeld)}" alt="Portret van ${naam}" loading="lazy" decoding="async">` : `<div class="leeg-foto" aria-hidden="true">${initialen(f.naam)}</div>`}
    <figcaption>${opties.link === false ? `<b>${naam}</b>` : `<a href="#fractie/${slug(f.naam)}"><b>${naam}</b></a>`}${onder ? `<span>${onder}</span>` : ""}${pf}</figcaption></figure>`;
}
const paginaKop = (titel, tekst, kruimel = "", extra = "") => `<div class="pagina-kop"><svg class="kop-lijnen" aria-hidden="true"></svg><div class="wrap">${kruimel ? `<p class="kruimel">${kruimel}</p>` : ""}<h1 tabindex="-1">${titel}</h1>${tekst ? `<p>${tekst}</p>` : ""}${extra}</div></div>`;
const stadsdeelOpties = (gekozen = "") => `<option value="">Kies uw stadsdeel</option>` + STADSDELEN.map(s => `<option${s === gekozen ? " selected" : ""}>${s}</option>`).join("");
const leestijd = h => Math.max(1, Math.round((h || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length / 200));

// ---------- formulieren ----------
const akkoordVeld = (id = "akkoord") => `<label class="vink"><input type="checkbox" name="akkoord" id="${id}" value="1"><span>Hart voor Den Haag mag mijn gegevens gebruiken om op dit bericht te reageren.</span></label>
  <div class="valkuil" aria-hidden="true"><label for="${id}-w">Laat leeg</label><input type="text" id="${id}-w" name="website" tabindex="-1" autocomplete="off"></div>`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
function zetFout(veld, tekst) {
  const na = veld.closest(".vink, .nb-rij");
  const w = na || veld.closest(".veld") || veld.parentElement;
  const fid = (veld.id || "v") + "-fout";
  let f = document.getElementById(fid);
  if (!tekst) { veld.removeAttribute("aria-invalid"); if (f) f.remove(); return; }
  veld.setAttribute("aria-invalid", "true");
  if (!f) { f = document.createElement("p"); f.className = "fout-tekst"; f.id = fid; if (na) na.insertAdjacentElement("afterend", f); else w.appendChild(f); }
  f.textContent = tekst; veld.setAttribute("aria-describedby", f.id);
}
function controleer(form, eisen) {
  let eerste = null;
  for (const [naam, test] of Object.entries(eisen)) {
    const veld = form.elements[naam]; if (!veld) continue;
    const fout = test(veld.type === "checkbox" ? veld.checked : (veld.value || "").trim(), form);
    zetFout(veld, fout || "");
    if (fout && !eerste) eerste = veld;
  }
  if (eerste) eerste.focus();
  return !eerste;
}
const verplicht = tekst => v => v ? "" : tekst;
const mailOfTel = (v, form) => {
  const tel = (form.elements.telefoon?.value || "").trim();
  if (!v && !tel) return "Vul een e-mailadres of telefoonnummer in, zodat we kunnen reageren.";
  if (v && !EMAIL.test(v)) return "Dit e-mailadres klopt niet. Controleer het nog even.";
  return "";
};
function koppelFormulier(form, opties) {
  form.addEventListener("input", e => { if (e.target.getAttribute("aria-invalid")) zetFout(e.target, ""); });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const uit = form.querySelector(".uitslag");
    const knop = form.querySelector("button[type=submit]");
    const data = Object.fromEntries(new FormData(form).entries());
    data.akkoord = !!data.akkoord;
    if (!controleer(form, opties.eisen(data))) {
      if ($$("[aria-invalid='true']", form).length > 1) toon(uit, "Er ontbreekt nog iets. Kijk bij de rood omlijnde velden.", true); else uit.hidden = true;
      return;
    }
    data.soort = typeof opties.soort === "function" ? opties.soort(data) : opties.soort;
    knop.disabled = true; const label = knop.textContent; knop.textContent = "Bezig met versturen…";
    try {
      const r = await fetch(API + "/formulier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await r.json().catch(() => ({ ok: false }));
      if (!d.ok) { const fout = new Error(""); fout.nl = d.fout && !/token|fetch|json|error/i.test(d.fout) ? d.fout : ""; throw fout; }
      form.reset(); form.dispatchEvent(new Event("change")); form.dispatchEvent(new Event("input"));
      toon(uit, opties.bedankt(data));
    } catch (err) {
      toon(uit, (err.nl ? err.nl + " " : "Versturen lukte niet. ") + `Probeer het zo nog eens, of bel ${TEL}.`, true);
    }
    knop.disabled = false; knop.textContent = label;
  });
}
function toon(el, tekst, isFout) {
  el.hidden = false; el.className = "uitslag melding" + (isFout ? " fout" : ""); el.textContent = tekst; el.setAttribute("role", isFout ? "alert" : "status");
  if (!isFout) { el.tabIndex = -1; el.focus({ preventScroll: false }); }
}

// ---------- pagina's ----------
const pagina = {};

pagina.home = async () => {
  const [kaart, nieuws, succes, vragen, moties, amend, ag, petities, bewijs] = await Promise.all([laad("kaart"), soort("nieuws"), soort("succes"), soort("raadsvraag"), soort("motie"), soort("amendement"), agenda(), soort("petitie"), laad("bewijs")]);
  const eerst = ag[0], x = eerst ? dt(eerst.datum) : null;
  const ditJaar = succes.filter(s => s.datum.startsWith(String(new Date().getFullYear()))).length;
  const open = petities.filter(isOpen);
  return `
  <section class="held" aria-labelledby="titel">
    <svg class="held-lijnen" viewBox="0 0 ${kaart.w} ${kaart.h}" aria-hidden="true">${Object.values(kaart.sd).map(s => `<path d="${s.d}"/>`).join("")}</svg>
    <div class="wrap">
      <div>
        <h1 id="titel" tabindex="-1">Hart voor <span>Den Haag</span></h1>
        <p class="held-rol">De grootste lokale partij van Den Haag</p>
        <p class="intro">Met ombudspolitiek zijn we zichtbaar in de wijken, dicht bij de Hagenaar, Hagenees, Scheveninger en Loosduiner. Zestien raadsleden zetten zich elke dag in voor een veilige, schone en leefbare stad.</p>
        <div class="knoppen"><a class="knop geel" href="#lid">Word lid vanaf € 12,50 per jaar</a><a class="knop rand" href="#contact/melding">Meld een probleem</a></div>
      </div>
      <figure class="held-beeld">
        <svg class="hart" viewBox="0 0 100 92" aria-hidden="true"><path d="M50 90C22 68 2 50 2 27 2 12 13 2 27 2c10 0 18 6 23 14C55 8 63 2 73 2c14 0 25 10 25 25 0 23-20 41-48 63z"/></svg>
        <video id="held-video" muted loop playsinline preload="metadata" poster="beeld/groep.jpg" aria-label="Campagnefilm van Hart voor Den Haag, zonder geluid"><source src="${VIDEO}" type="video/mp4"></video>
        <button class="speel" type="button" id="speel"><svg viewBox="0 0 16 16" aria-hidden="true"></svg><span>Pauzeer film</span></button>
      </figure>
    </div>
  </section>
  ${eerst ? `<div class="wrap kaartje-plek"><div class="kaartje">
    <div class="datum" aria-hidden="true"><span class="dag">${x.d}</span><span class="maand">${MAAND[x.m]}</span><span class="wd">${DAG[x.wd]}${eerst.tijd ? ", " + esc(eerst.tijd) : ""}</span></div>
    <div class="kaartje-tekst"><h2>${esc(eerst.titel)}</h2><p><b>${DAG[x.wd]} ${x.d} ${MAAND[x.m]}, ${esc(eerst.plek)}${eerst.stadsdeel ? ", " + esc(eerst.stadsdeel) : ""}.</b> ${esc(eerst.samenvatting || "")}</p></div>
    <a class="knop groen" href="#agenda">Hele agenda</a></div></div>` : ""}

  <section class="wit">
    <div class="wrap">
      <h2 class="log-titel">De afgelopen weken in de raad en de stad</h2>
      ${maandLog(nieuws, [...vragen, ...moties, ...amend])}
      ${open.length ? `<div class="teken-regel"><p><b>Teken mee</b></p><ul>${open.slice(0, 2).map(p => `<li><a href="${href(p)}">${esc(p.titel.replace(/^petitie:\s*/i, "").replace(/^./, c => c.toUpperCase()))}</a>${p.handtekeningen ? ` <span>${fmt.format(p.handtekeningen)} handtekeningen</span>` : ""}</li>`).join("")}</ul></div>` : ""}
      <p class="log-voet">Ouder werk staat bij <a href="#nieuws">Nieuws</a> en <a href="#raadswerk/vragen">Raadswerk</a>.</p>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="kop"><h2>Uw stadsdeel, uw raadsleden</h2><p class="inleiding">${isTouch ? "Tik" : "Klik"} op uw stadsdeel. U ziet wie er bij u spreekuur houdt en wat er bij u in de buurt speelt.</p></div>
      ${kaartBlok(kaart)}
    </div>
  </section>

  <section class="donker">
    <div class="wrap">
      <div class="succes-kop"><span class="groot-getal">${ditJaar}</span><div><h2>successen in ${new Date().getFullYear()}</h2><p>Van een besluit van de raad tot een opgeknapte speeltuin: dit leverde ombudspolitiek dit jaar op.</p></div></div>
      <ol class="log">${succes.slice(0, 5).map((s, i) => logItem(s, i === 0)).join("")}</ol>
      <p style="margin-top:18px"><a class="meer" href="#successen">Alle successen ${PIJL}</a></p>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="kop"><h2>Beloofd en gedaan</h2><p class="inleiding">Wat in ons programma staat, en wat we er het afgelopen jaar in de raad voor deden.</p></div>
      ${bewijsLijst(bewijs, PUNTEN.slice(0, 4))}
      <p style="margin-top:18px"><a class="meer" href="#standpunten">Alle standpunten ${PIJL}</a></p>
    </div>
  </section>
  ${lidRegel()}`;
};
pagina.home.na = async () => {
  const v = $("#held-video"), k = $("#speel");
  const stil = matchMedia("(prefers-reduced-motion: reduce)").matches || (navigator.connection && navigator.connection.saveData);
  const zet = speelt => { k.querySelector("span").textContent = speelt ? "Pauzeer film" : "Speel film af"; k.querySelector("svg").innerHTML = speelt ? '<rect x="3" y="2" width="3.5" height="12"/><rect x="9.5" y="2" width="3.5" height="12"/>' : '<path d="M4 2l10 6-10 6z"/>'; };
  zet(false);
  if (!stil) v.play().then(() => zet(true)).catch(() => zet(false));
  k.addEventListener("click", () => { if (v.paused) { v.play(); zet(true); } else { v.pause(); zet(false); } });
  activeerKaart(await laad("kaart"), opslag.lees("stadsdeel"));
};

// Eén doorlopend logboek: nieuws en raadswerk door elkaar, met wie het deed en waar.
function maandLog(nieuws, raad) {
  const grens = new Date(Date.now() - 42 * 864e5).toISOString().slice(0, 10);
  const opDatum = (a, b) => b.datum.localeCompare(a.datum);
  let nw = nieuws.filter(i => i.datum >= grens), rw = raad.filter(i => i.datum >= grens).sort(opDatum);
  if (nw.length + rw.length < 6) { nw = nieuws.slice(0, 5); rw = raad.sort(opDatum).slice(0, 5); }
  const rij = [...nw.slice(0, 6), ...rw.slice(0, 7)].sort(opDatum).slice(0, 12);
  let html = "", maand = "";
  for (const i of rij) {
    const x = dt(i.datum), m = MAAND[x.m] + (x.y !== new Date().getFullYear() ? " " + x.y : "");
    if (m !== maand) { if (maand) html += "</ol>"; html += `<h3 class="maand-kop">${m[0].toUpperCase() + m.slice(1)}</h3><ol class="mlog">`; maand = m; }
    const wie = wieVan(i);
    const plek = i.stadsdelen && i.stadsdelen[0];
    html += `<li class="m-item${i.beeld ? "" : " zonder-beeld"}">
      <div class="m-wie${wie.length > 1 ? " twee" : ""}">${wie.length ? gezichtjes(wie) : `<span class="m-plek">${plek ? silhouet(plek) : HART}</span>`}</div>
      <div class="m-tekst"><h4><a href="${href(i)}">${esc(i.titel)}</a></h4>${bijschrift(i, { soort: true, ris: false })}</div>
      ${i.beeld ? `<img class="m-beeld" src="${esc(i.beeld)}" alt="" loading="lazy" decoding="async">` : ""}</li>`;
  }
  return html + (maand ? "</ol>" : "");
}
const HART = '<svg class="sil" viewBox="0 0 100 92" aria-hidden="true"><path d="M50 90C22 68 2 50 2 27 2 12 13 2 27 2c10 0 18 6 23 14C55 8 63 2 73 2c14 0 25 10 25 25 0 23-20 41-48 63z"/></svg>';

// Standpunten met bewijs: wat we het afgelopen jaar in de raad deden op dat onderwerp.
function bewijsLijst(bewijs, punten, metProgramma = false) {
  const telling = b => {
    const delen = [];
    if (b.successen != null) delen.push(`<b>${b.successen}</b> successen`);
    if (b.vragen) delen.push(`<b>${b.vragen}</b> keer schriftelijke vragen`);
    if (b.moties) delen.push(`<b>${b.moties}</b> ${b.moties === 1 ? "motie" : "moties"}`);
    if (b.amendementen) delen.push(`<b>${b.amendementen}</b> ${b.amendementen === 1 ? "amendement" : "amendementen"}`);
    return delen.length > 1 ? delen.slice(0, -1).join(", ") + " en " + delen.slice(-1) : delen.join("");
  };
  return `<div class="bewijs">${punten.map(([kop, tekst]) => {
    const b = bewijs && bewijs[kop];
    let rechts;
    if (kop === "Samenwerking voor de stad") rechts = `<p class="telling"><b>5</b> wethouders van Hart voor Den Haag in het college</p><p class="bijschrift"><a href="#wethouders">Wie het zijn en waar ze over gaan</a></p>`;
    else if (b) rechts = `<p class="telling">${telling(b)}</p>
      ${b.succes ? `<p class="bijschrift"><span>Laatste succes: <a href="#successen/${esc(b.succes.id)}">${esc(b.succes.t)}</a></span><time datetime="${esc(b.succes.d)}">${datum(b.succes.d)}</time></p>` : ""}
      ${b.onderwerp ? `<p class="bijschrift"><a href="#raadswerk/vragen/onderwerp/${encodeURIComponent(b.onderwerp)}">Bekijk het raadswerk over ${esc(b.onderwerp.toLowerCase())}</a></p>` : ""}`;
    else rechts = `<p class="telling">${esc(tekst)}</p>`;
    return `<article><h3>${esc(kop)}</h3><div>${rechts}${metProgramma ? `<details class="hoe klein"><summary>Wat er in het programma staat</summary><p>${esc(tekst)}</p></details>` : ""}</div></article>`;
  }).join("")}</div>`;
}
const lidRegel = () => `<section class="lid-regel-sectie"><div class="wrap lid-regel">
  <p><b>Eens?</b> Word lid vanaf € 12,50 per jaar en praat mee over de koers, het bestuur en de kandidaten.</p>
  <a class="knop geel" href="#lid">Word lid</a>
  <p class="anders">Of <a href="#doneren">doneer</a>, of <a href="#doe-mee">help mee in uw stadsdeel</a>.</p>
</div></section>`;

// stadsdelenkaart
function kaartBlok(kaart) {
  return `<div class="stad-raster"><div><svg class="kaart" id="kaart" viewBox="0 0 ${kaart.w} ${kaart.h}" aria-hidden="true"></svg>
    <div class="sd-rijen" id="kaart-knoppen" role="group" aria-label="Kies een stadsdeel"></div></div><div class="paneel" id="paneel" aria-live="polite" tabindex="-1"></div></div>`;
}
async function activeerKaart(kaart, start) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = $("#kaart"), knoppen = $("#kaart-knoppen");
  const namen = Object.keys(kaart.sd);
  const zee = document.createElementNS(NS, "text");
  zee.setAttribute("class", "zee"); zee.setAttribute("x", "70"); zee.setAttribute("y", "360"); zee.setAttribute("transform", "rotate(-36 70 360)"); zee.textContent = "Noordzee";
  svg.appendChild(zee);
  const vlak = {}, lbl = {}, knop = {};
  namen.forEach(n => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", kaart.sd[n].d); p.setAttribute("class", "sd"); p.setAttribute("aria-pressed", "false");
    p.addEventListener("click", () => kies(n, true));
    svg.appendChild(p); vlak[n] = p;
  });
  namen.forEach(n => {
    const s = kaart.sd[n], t = document.createElementNS(NS, "text");
    t.setAttribute("class", "lbl"); t.setAttribute("x", s.x); t.setAttribute("y", s.y + 7);
    if (n === "Leidschenveen-Ypenburg") t.innerHTML = `<tspan x="${s.x}" dy="-6">Leidschenveen-</tspan><tspan x="${s.x}" dy="22">Ypenburg</tspan>`; else t.textContent = n;
    svg.appendChild(t); lbl[n] = t;
  });
  STADSDELEN.forEach(n => {
    const b = document.createElement("button"); b.type = "button"; b.className = "sd-rij"; b.setAttribute("aria-pressed", "false");
    const mensen = FRACTIE.filter(f => f.stadsdelen.includes(n));
    b.innerHTML = `${silhouet(n)}<span class="sd-naam">${esc(n)}</span><span class="sd-gezichten" aria-hidden="true">${gezichtjes(mensen, 3)}${mensen.length > 3 ? `<span class="meer-mensen">+${mensen.length - 3}</span>` : ""}</span>`;
    b.setAttribute("aria-label", `${n}${mensen.length ? ", raadsleden " + mensen.map(f => f.naam).join(", ") : ""}`);
    b.addEventListener("click", () => kies(n, true)); knoppen.appendChild(b); knop[n] = b;
  });
  const [fractie, wethouders, nieuws, succes, vragen, ag] = await Promise.all([laad("fractie"), laad("wethouders"), soort("nieuws"), soort("succes"), soort("raadsvraag"), agenda()]);
  const paneel = $("#paneel");
  function kies(n, doorGebruiker) {
    namen.forEach(m => { const aan = m === n; vlak[m].setAttribute("aria-pressed", aan); lbl[m].classList.toggle("aan", aan); });
    STADSDELEN.forEach(m => knop[m].setAttribute("aria-pressed", m === n));
    if (!n) {
      paneel.innerHTML = `<div class="kies-hint"><h3>Kies uw stadsdeel</h3><p>Den Haag heeft acht stadsdelen, elk met eigen raadsleden en een eigen wethouder. ${isTouch ? "Tik" : "Klik"} op de kaart of op een naam.</p></div>`;
      return;
    }
    opslag.zet("stadsdeel", n);
    const s = kaart.sd[n];
    const mensen = fractie.filter(f => f.stadsdelen.includes(n));
    const weth = wethouders.find(w => w.stadsdeel === n);
    const items = [
      ...ag.filter(a => a.stadsdeel === n).map(a => ({ ...a, soort: "agenda" })),
      ...succes.filter(x => x.stadsdelen.includes(n)).slice(0, 2),
      ...nieuws.filter(x => x.stadsdelen.includes(n)).slice(0, 2),
      ...vragen.filter(x => x.stadsdelen.includes(n)).slice(0, 1),
    ].slice(0, 6);
    paneel.innerHTML = `
      <div><h3>${esc(n)}</h3><p class="feit"><b>${fmt.format(s.inw)}</b> inwoners in ${s.wijken.length} wijken (CBS, 2023)</p></div>
      <div><p class="tussenkop">Uw raadsleden</p>${mensen.length ? `<ul class="mensen">${mensen.map(f => `<li>${f.beeld ? `<img src="${esc(f.beeld)}" alt="">` : `<span class="leeg-foto" aria-hidden="true">${initialen(f.naam)}</span>`}<div><a href="#fractie/${slug(f.naam)}"><b>${esc(f.naam)}</b></a><span>${esc(f.portefeuilles.slice(0, 3).join(", "))}</span></div></li>`).join("")}</ul>` : `<p class="leeg">Nog geen raadslid gekoppeld.</p>`}
        ${weth ? `<p class="wijken" style="margin-top:12px">Wethouder voor ${esc(n)}: <a href="#wethouders">${esc(weth.naam)}</a></p>` : ""}</div>
      <div><p class="tussenkop">Wat we hier doen</p>${items.length ? `<ul class="berichten">${items.map(x => `<li>${x.soort === "agenda" ? `<a href="#agenda">${esc(x.titel)}</a>` : `<a href="${href(x)}">${esc(x.titel)}</a>`}<small>${esc(SOORT[x.soort].naam)}, ${datum(x.datum)}</small></li>`).join("")}</ul>` : `<p class="leeg">Nog geen berichten uit ${esc(n)}.</p>`}</div>
      <p class="wijken"><b>Wijken:</b> ${s.wijken.map(esc).join(", ")}</p>
      <div class="knoppen"><a class="knop groen" href="#contact/melding/${encodeURIComponent(n)}">Meld een probleem in ${esc(n)}</a><a class="knop lijn" href="#nieuws/stadsdeel/${encodeURIComponent(n)}">Nieuws uit ${esc(n)}</a></div>`;
    if (doorGebruiker && paneel.getBoundingClientRect().top > innerHeight * .6) paneel.scrollIntoView({ block: "start" });
  }
  kies(start && kaart.sd[start] ? start : "", false);
}

pagina.stadsdelen = async () => paginaKop("Uw stadsdeel", "Acht stadsdelen, elk met eigen raadsleden. Kies uw stadsdeel op de kaart of met de knoppen.") +
  `<section><div class="wrap">${kaartBlok(await laad("kaart"))}</div></section>`;
pagina.stadsdelen.na = async ([naam]) => activeerKaart(await laad("kaart"), naam ? decodeURIComponent(naam) : opslag.lees("stadsdeel"));

// lijsten met "Meer laden" die bij Terug het aantal onthouden
function meerLaden(lijst, alles, maak, stap) {
  const sleutel = "n:" + location.hash;
  let n = Math.max(stap, Number(opslag.sLees(sleutel)) || stap);
  const teken = () => {
    $(lijst.doel).innerHTML = maak(alles.slice(0, n));
    const t = $(lijst.teller); if (t) t.textContent = `${Math.min(n, alles.length)} van ${alles.length}`;
    const k = $(lijst.knop); if (k) k.hidden = n >= alles.length;
  };
  teken();
  const k = $(lijst.knop);
  if (k) k.onclick = () => { n += stap; opslag.sZet(sleutel, n); teken(); };
}

// nieuws en successen
function lijstPagina(s, titel, tekst, pad) {
  const f = async (args) => {
    if (args[0] && args[0] !== "stadsdeel") return detail(s, decodeURIComponent(args[0]), titel, pad);
    const sd = args[0] === "stadsdeel" ? decodeURIComponent(args[1] || "") : "";
    const knoppen = ["", ...STADSDELEN].map(x => `<a class="knopje" href="#${pad}${x ? "/stadsdeel/" + encodeURIComponent(x) : ""}"${x === sd ? ' aria-current="page"' : ""}>${x || "Hele stad"}</a>`).join("");
    return paginaKop(titel, tekst) + `<section class="${s === "succes" ? "" : "wit"}"><div class="wrap">
      <nav class="filters" aria-label="Kies een stadsdeel">${knoppen}</nav>
      <p class="teller" id="teller" aria-live="polite"></p><ol class="log" id="lijst"></ol>
      <button class="knop lijn meer-laden" type="button" id="meer">Meer laden</button>
      <p class="leeg" style="margin-top:22px">Ouder werk staat op <a href="https://www.hartvoordenhaag.nl/${s === "succes" ? "successen" : "nieuws"}/" target="_blank" rel="noopener">hartvoordenhaag.nl</a>.</p></div></section>`;
  };
  f.na = async (args) => {
    if (args[0] && args[0] !== "stadsdeel") return detail.na(args);
    const sd = args[0] === "stadsdeel" ? decodeURIComponent(args[1] || "") : "";
    const alles = (await soort(s)).filter(i => !sd || i.stadsdelen.includes(sd));
    if (!alles.length) { $("#lijst").outerHTML = `<p class="leeg">Nog geen berichten uit ${esc(sd)}.</p>`; $("#meer").hidden = true; return; }
    meerLaden({ doel: "#lijst", teller: "#teller", knop: "#meer" }, alles, rij => rij.map((n, i) => logItem(n, i === 0 && !sd)).join(""), 20);
  };
  return f;
}
pagina.nieuws = lijstPagina("nieuws", "Nieuws", "Wat Hart voor Den Haag doet in de raad en in de wijk.", "nieuws");
pagina.successen = lijstPagina("succes", "Successen", "Wat ombudspolitiek opleverde: besluiten, oplossingen en opgeknapte plekken.", "successen");

async function detail(s, id, terugNaam, terugPad) {
  const alles = await soort(s);
  const i = alles.find(x => String(x.id) === id);
  if (!i) return paginaKop("Niet gevonden", "Dit stuk bestaat niet (meer).") + `<section><div class="wrap"><a class="knop groen" href="#${terugPad}">Terug naar ${esc(terugNaam.toLowerCase())}</a></div></section>`;
  document.title = i.titel + " | Hart voor Den Haag (proef)";
  const zelfde = alles.filter(x => x.id !== i.id && x.stadsdelen.some(sd => i.stadsdelen.includes(sd))).slice(0, 4);
  const meer = zelfde;
  const isPetitie = s === "petitie";
  const open = isPetitie && isOpen(i);
  const wie = wieVan(i);
  const dictum = i.dictum ? (() => {
    const delen = i.dictum.tekst.split(/\s*;\s*(?=\S)/).map(d => d.replace(/^(en|of)\s+/i, "").trim()).filter(d => d.length > 3);
    return `<div class="dictum"><h2>${s === "amendement" ? "Wat we willen veranderen" : "Wat we het college vragen"}</h2>
      <p class="dictum-kop">${esc(i.dictum.kop)}:</p>
      ${delen.length > 1 ? `<ol>${delen.map(d => `<li>${esc(d)}</li>`).join("")}</ol>` : `<p>${esc(i.dictum.tekst)}</p>`}
      <div class="dictum-voet">${wie.length ? `<span class="m-wie${wie.length > 1 ? " twee" : ""}" aria-hidden="true">${gezichtjes(wie)}</span>` : ""}<p>${i.indiener ? `Ingediend door ${wie.length ? wie.map(f => `<a href="#fractie/${slug(f.naam)}">${esc(f.naam)}</a>`).join(" en ") : esc(i.indiener)}` : "Ingediend door Hart voor Den Haag"}, raad van ${datum(i.datum)}.${i.status ? ` <b>${esc(i.status)}.</b>` : ""}</p></div></div>`;
  })() : "";
  const lees = leestijd(i.html);
  return paginaKop(esc(i.titel), "", `<a href="#">Home</a> / <a href="#${terugPad}">${esc(terugNaam)}</a>`,
    bijschrift({ ...i }, { soort: !["nieuws", "succes", "petitie"].includes(s) }).replace("</p>", `<span>${lees} min lezen</span></p>`)) + `
  <section class="wit"><div class="wrap"><article class="artikel">
    ${i.beeld ? `<img class="artikel-beeld" src="${esc(i.beeld)}" alt="">` : ""}
    ${isPetitie ? `<div class="teken-teller">${i.handtekeningen ? `<b>${fmt.format(i.handtekeningen)}</b><span>handtekeningen op hartvoordenhaag.nl</span>` : ""}</div>` : ""}
    ${dictum}
    ${dictum ? `<h2 class="volledig">Volledige tekst</h2>` : ""}
    <div class="artikel-tekst" style="margin-top:18px">${i.html || `<p>${esc(i.samenvatting)}</p>`}</div>
    ${isPetitie && !open ? `<p class="melding" style="margin-top:32px">Deze petitie is gesloten. Bekijk <a href="#petities">de petities die nu lopen</a>.</p>` : ""}
    ${open ? `<form class="formulier" id="teken" style="margin-top:36px" novalidate><h2 style="font-size:2rem">Teken deze petitie</h2>
      <input type="hidden" name="petitie" value="${esc(i.titel)}">
      <div class="velden"><div class="veld"><label for="p-naam">Naam</label><input type="text" id="p-naam" name="naam" autocomplete="name"></div>
      <div class="veld"><label for="p-email">E-mailadres</label><input type="email" id="p-email" name="email" autocomplete="email"></div>
      <div class="veld breed"><label for="p-sd">Stadsdeel <small>(niet verplicht)</small></label><select id="p-sd" name="stadsdeel">${stadsdeelOpties(i.stadsdelen[0])}</select></div></div>
      ${akkoordVeld()}<button class="knop groen" type="submit">Teken de petitie</button><p class="uitslag" hidden></p></form>` : ""}
    <div class="na-artikel">
      <div class="deelrij"><button class="knop lijn klein" type="button" id="deel">Deel dit stuk</button>${i.link ? `<a class="meer" href="${esc(i.link)}" target="_blank" rel="noopener">Op hartvoordenhaag.nl ${UIT}</a>` : ""}</div>
      ${meer.length ? `<div><h2 style="font-size:1.8rem">Meer uit ${esc(i.stadsdelen.join(" en "))}</h2><ul class="stukken" style="margin-top:10px">${meer.map(x => stukItem({ ...x, samenvatting: "" }, { ris: false })).join("")}</ul></div>` : ""}
    </div>
  </article></div></section>`;
}
detail.na = () => {
  const d = $("#deel");
  if (d) d.addEventListener("click", async () => {
    const url = location.href;
    try { if (navigator.share) await navigator.share({ url, title: document.title }); else { await navigator.clipboard.writeText(url); d.textContent = "Link gekopieerd"; } }
    catch { d.textContent = "Kopieer de link uit de adresbalk"; }
  });
  const t = $("#teken");
  if (t) koppelFormulier(t, {
    soort: "petitie",
    eisen: () => ({ naam: verplicht("Vul uw naam in."), email: v => !v ? "Vul uw e-mailadres in." : EMAIL.test(v) ? "" : "Dit e-mailadres klopt niet.", akkoord: v => v ? "" : "Vink dit aan om te kunnen tekenen." }),
    bedankt: () => "Dank u wel! Uw handtekening is binnen.",
  });
};

// raadswerk
const TABS = {
  moties: { s: "motie", titel: "Moties", vraag: "Hoe werkt een motie?", uitleg: `<ol class="uitleg"><li><b>Debat in de raad</b><span>Tijdens een debat ziet de fractie iets dat beter moet in de stad.</span></li><li><b>Wij dienen een motie in</b><span>Daarin staat wat we zien, wat we vinden en wat we het college vragen.</span></li><li><b>De raad stemt</b><span>Neemt de raad de motie aan, dan moet het college ermee aan de slag.</span></li></ol>` },
  amendementen: { s: "amendement", titel: "Amendementen", vraag: "Wat is een amendement?", uitleg: `<p>Met een amendement verandert de raad een voorstel van het college voordat erover wordt gestemd. Zo passen we plannen aan, in plaats van ze alleen af te keuren.</p>` },
  vragen: { s: "raadsvraag", titel: "Schriftelijke vragen", vraag: "Wat zijn schriftelijke vragen?", uitleg: `<p>Met schriftelijke vragen zetten we een probleem uit de wijk op de agenda. Het college moet binnen een paar weken antwoorden.</p>` },
  spreekteksten: { s: "spreektekst", titel: "Spreekteksten", vraag: "Wat is een spreektekst?", uitleg: `<p>Wat onze raadsleden zeggen in de raad en in commissies, zoals bij de begroting.</p>` },
};
const DETAILTAB = { motie: "moties", amendement: "amendementen", vraag: "vragen", spreektekst: "spreekteksten" };
// #raadswerk/<tab>/onderwerp/<o>/zoek/<q>
const rwOpties = rest => { const o = {}; for (let k = 0; k + 1 < rest.length; k += 2) o[rest[k]] = decodeURIComponent(rest[k + 1]); return o; };
const rwHref = (tab, o, q) => `#raadswerk/${tab}${o ? "/onderwerp/" + encodeURIComponent(o) : ""}${q ? "/zoek/" + encodeURIComponent(q) : ""}`;
pagina.raadswerk = async ([tab = "moties", ...rest]) => {
  if (DETAILTAB[tab] && rest[0]) { const t = TABS[DETAILTAB[tab]]; return detail(t.s, decodeURIComponent(rest[0]), t.titel, "raadswerk/" + DETAILTAB[tab]); }
  const t = TABS[tab] || TABS.moties; const tabNaam = TABS[tab] ? tab : "moties";
  const { onderwerp = "", zoek = "" } = rwOpties(rest);
  const knoppen = ["", ...ONDERWERPEN].map(o => `<a class="knopje" href="${rwHref(tabNaam, o, zoek)}"${o === onderwerp ? ' aria-current="page"' : ""}>${o || "Alle onderwerpen"}</a>`).join("");
  return paginaKop("Raadswerk", "Wat Hart voor Den Haag in de gemeenteraad doet: moties, amendementen, vragen aan het college en wat we zeggen in de raad.") + `
    <section class="wit"><div class="wrap">
      <nav class="tabs" aria-label="Soort stuk">${Object.entries(TABS).map(([k, v]) => `<a href="#raadswerk/${k}"${k === tabNaam ? ' aria-current="page"' : ""}>${v.titel}</a>`).join("")}</nav>
      <details class="hoe"><summary>${t.vraag}</summary>${t.uitleg}</details>
      <nav class="filters breed-alleen" aria-label="Onderwerp">${knoppen}</nav>
      <div class="filterrij">
        <div class="veld smal-alleen"><label for="rw-onderwerp">Onderwerp</label><select id="rw-onderwerp"><option value="">Alle onderwerpen</option>${ONDERWERPEN.map(o => `<option${o === onderwerp ? " selected" : ""}>${o}</option>`).join("")}</select></div>
        <div class="veld"><label for="binnen">Zoek in deze lijst</label><input type="search" id="binnen" value="${esc(zoek)}" placeholder="Bijvoorbeeld parkeren of Moerwijk"></div>
        <p class="teller" id="teller" aria-live="polite"></p></div>
      <div id="lijst"></div>
      <button class="knop lijn meer-laden" type="button" id="meer">Meer laden</button>
      <p class="leeg" style="margin-top:22px">Onderwerpen zijn automatisch toegekend op basis van de tekst. Ouder werk staat op <a href="https://www.hartvoordenhaag.nl/" target="_blank" rel="noopener">hartvoordenhaag.nl</a>.</p>
    </div></section>`;
};
pagina.raadswerk.na = async ([tab = "moties", ...rest]) => {
  if (DETAILTAB[tab] && rest[0]) return detail.na();
  const t = TABS[tab] || TABS.moties; const tabNaam = TABS[tab] ? tab : "moties";
  const { onderwerp = "" } = rwOpties(rest);
  const basis = (await soort(t.s)).filter(i => !onderwerp || (i.onderwerpen || []).includes(onderwerp));
  const perMaand = rij => {
    let html = "", huidig = "";
    for (const i of rij) {
      const x = dt(i.datum), m = `${MAAND[x.m]} ${x.y}`;
      if (m !== huidig) { if (huidig) html += "</ul>"; html += `<h2 class="maand-kop">${m[0].toUpperCase() + m.slice(1)}</h2><ul class="stukken">`; huidig = m; }
      html += stukItem(i);
    }
    return html + (huidig ? "</ul>" : `<p class="leeg" style="padding-top:18px">Niets gevonden. Probeer een ander woord of onderwerp.</p>`);
  };
  const toonLijst = () => {
    const q = $("#binnen").value.trim().toLowerCase();
    const alles = q ? basis.filter(i => (i.titel + " " + i.samenvatting + " " + (i.indiener || "")).toLowerCase().includes(q)) : basis;
    meerLaden({ doel: "#lijst", teller: "#teller", knop: "#meer" }, alles, perMaand, 25);
  };
  let wacht; $("#binnen").addEventListener("input", () => {
    clearTimeout(wacht);
    wacht = setTimeout(() => { history.replaceState(null, "", rwHref(tabNaam, onderwerp, $("#binnen").value.trim())); vorige = location.hash; toonLijst(); }, 250);
  });
  $("#rw-onderwerp").addEventListener("change", e => gaNaar(rwHref(tabNaam, e.target.value, $("#binnen").value.trim()).slice(1)));
  toonLijst();
};

pagina.petities = async ([id]) => {
  if (id) return detail("petitie", decodeURIComponent(id), "Petities", "petities");
  const alles = await soort("petitie");
  const open = alles.filter(isOpen), dicht = alles.filter(p => !isOpen(p));
  return paginaKop("Petities", "Hagenaars die samen iets willen veranderen. Teken mee, dan nemen wij het mee naar de raad.") +
    `<section class="wit"><div class="wrap">
      ${open.length ? `<h2 class="maand-kop">Loopt nu</h2><ul class="stukken">${open.map(p => stukItem(p, { open: true })).join("")}</ul>` : `<p class="leeg">Er loopt nu geen petitie.</p>`}
      ${dicht.length ? `<h2 class="maand-kop">Eerder</h2><ul class="stukken">${dicht.map(p => stukItem({ ...p, samenvatting: "" }, { open: true })).join("")}</ul>` : ""}
    </div></section>`;
};
pagina.petities.na = ([id]) => id && detail.na();

pagina.standpunten = async () => paginaKop("Standpunten", "Geen links of rechts, maar oplossingen. Per standpunt ziet u wat we er het afgelopen jaar in de raad voor deden.") + `
  <section class="wit"><div class="wrap">
    ${bewijsLijst(await laad("bewijs"), PUNTEN, true)}
    <p class="leeg" style="margin-top:22px">Geteld zijn de stukken van de afgelopen twaalf maanden op hartvoordenhaag.nl, op onderwerp ingedeeld aan de hand van de tekst.</p>
  </div></section>
  <section><div class="wrap formulier-raster links">
    <div><h2>En nu aan de slag!</h2><p class="inleiding">De tijd van praten is voorbij. Na jaren van stilstand en instabiele colleges is het tijd voor een stadsbestuur dat levert. Als grootste partij nemen wij onze verantwoordelijkheid, met de focus op wat u dagelijks merkt in uw buurt.</p></div>
    <div><a class="knop groen" href="${PROGRAMMA}" target="_blank" rel="noopener">Lees het verkiezingsprogramma (pdf)</a></div>
  </div></section>
  ${lidRegel()}`;

pagina.fractie = async ([wie]) => {
  const fractie = await laad("fractie");
  if (wie) {
    const f = fractie.find(x => slug(x.naam) === wie);
    if (!f) return paginaKop("Niet gevonden", "");
    document.title = f.naam + " | Hart voor Den Haag (proef)";
    const idx = await laad("zoekindex");
    const voornaam = f.naam.split(" ")[0], achternaam = f.naam.split(" ").slice(-1)[0];
    const zelf = slug(f.naam);
    const werk = idx.filter(i => (i.i && slug(i.i).includes(zelf)) || (!i.i && (i.t + " " + i.x).includes(achternaam) && (i.t + " " + i.x).includes(voornaam))).sort((a, b) => b.d.localeCompare(a.d)).slice(0, 10);
    return paginaKop(esc(f.naam), esc(f.functie || "Raadslid") + (f.stadsdelen.length ? ` voor ${esc(f.stadsdelen.join(" en "))}` : ""), `<a href="#">Home</a> / <a href="#fractie">Fractie</a>`) + `
      <section class="wit"><div class="wrap formulier-raster links">
        <div class="gezichten" style="grid-template-columns:minmax(0,320px)">${portret(f, { link: false })}</div>
        <div>
          ${f.portefeuilles.length ? `<h2 style="font-size:1.9rem">Portefeuilles</h2><ul class="voordelen">${f.portefeuilles.map(p => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
          ${f.commissie ? `<p class="leeg" style="margin-top:16px">Commissie: ${esc(f.commissie)}</p>` : ""}
          <div class="artikel-tekst" style="margin-top:28px">${f.bio || `<p>${esc(f.naam)} is raadslid voor Hart voor Den Haag.</p>`}</div>
        </div></div></section>
      ${werk.length ? `<section><div class="wrap"><div class="kop"><h2>Recent werk</h2></div><ul class="stukken">${werk.map(i => `<li><h3><a href="#${SOORT[i.s].pad}/${i.id}">${esc(i.t)}</a></h3><p class="bijschrift">${i.sd && i.sd.length ? `<span class="plek">${silhouet(i.sd[0])}${esc(i.sd.join(" en "))}</span>` : ""}<span>${esc(SOORT[i.s].naam)}</span>${i.st ? `<span class="status">${esc(i.st)}</span>` : ""}<time>${datum(i.d)}</time></p></li>`).join("")}</ul></div></section>` : ""}`;
  }
  const alle = [...new Set(fractie.flatMap(f => f.portefeuilles))].sort((a, b) => a.localeCompare(b, "nl"));
  return paginaKop("De fractie", "Zestien raadsleden van Hart voor Den Haag, ingedeeld naar het stadsdeel waar ze spreekuur houden. Zoek op onderwerp wie erover gaat.") + `
    <section class="wit"><div class="wrap">
      <div class="filterrij"><div class="veld"><label for="wie">Wie gaat over…</label><input type="search" id="wie" list="pf-lijst" placeholder="Bijvoorbeeld parkeren, onderwijs of strand"><datalist id="pf-lijst">${alle.map(p => `<option value="${esc(p)}">`).join("")}</datalist></div>
        <p class="teller" id="teller" aria-live="polite"></p></div>
      <div id="groepen"></div>
    </div></section>`;
};
pagina.fractie.na = async ([wie]) => {
  if (wie) return;
  const [fractie, idx] = await Promise.all([laad("fractie"), laad("zoekindex")]);
  const jaar = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const recent = f => {
    const zelf = slug(f.naam), mijn = idx.filter(i => i.i && i.d >= jaar && slug(i.i).includes(zelf));
    const n = s_ => mijn.filter(i => i.s === s_).length;
    const delen = [[n("raadsvraag"), "keer vragen", "keer vragen"], [n("motie"), "motie", "moties"], [n("amendement"), "amendement", "amendementen"]].filter(d => d[0]).map(d => `${d[0]} ${d[0] === 1 ? d[1] : d[2]}`);
    return delen.length ? `Het afgelopen jaar: ${delen.join(", ")}` : "";
  };
  const rij = f => `<li class="lid-rij">${f.beeld ? `<img src="${esc(f.beeld)}" alt="" loading="lazy" decoding="async">` : `<span class="leeg-foto" aria-hidden="true">${initialen(f.naam)}</span>`}
    <div><h3><a href="#fractie/${slug(f.naam)}">${esc(f.naam)}</a></h3>${f.functie && !/^raadslid$/i.test(f.functie) ? `<p class="functie">${esc(f.functie)}</p>` : ""}
    ${f.portefeuilles.length ? `<p class="pf">${esc(f.portefeuilles.join(", "))}</p>` : ""}${recent(f) ? `<p class="recent">${recent(f)}</p>` : ""}</div></li>`;
  const groepen = [...STADSDELEN.map(sd => [sd, fractie.filter(f => f.stadsdelen.includes(sd))]), ["Hele stad", fractie.filter(f => !f.stadsdelen.length)]];
  const filter = () => {
    const q = $("#wie").value.trim().toLowerCase();
    const past = f => !q || (f.portefeuilles.join(" ") + " " + f.naam).toLowerCase().includes(q);
    if (q) {
      const treffers = fractie.filter(past);
      $("#groepen").innerHTML = treffers.length ? `<ul class="leden">${treffers.map(rij).join("")}</ul>` : `<p class="leeg">Niemand gevonden. Probeer een ander woord.</p>`;
      $("#teller").textContent = `${treffers.length} van ${fractie.length} raadsleden`;
      return;
    }
    $("#teller").textContent = "";
    $("#groepen").innerHTML = groepen.filter(g => g[1].length).map(([sd, mensen]) => `<section class="groep" aria-labelledby="g-${slug(sd)}">
      <h2 class="groep-kop" id="g-${slug(sd)}">${sd === "Hele stad" ? HART : silhouet(sd)}${esc(sd)}</h2><ul class="leden">${mensen.map(rij).join("")}</ul></section>`).join("");
  };
  $("#wie").addEventListener("input", filter); filter();
};

pagina.wethouders = async () => {
  const w = await laad("wethouders");
  return paginaKop("Wethouders", "Vijf wethouders van Hart voor Den Haag zitten in het college van burgemeester en wethouders.") + `
    <section class="wit"><div class="wrap">${w.map(x => `<article class="poster"><img src="${esc(x.beeld)}" alt="Poster van ${esc(x.naam)}" loading="lazy">
      <div><h2>${esc(x.naam)}</h2><p class="inleiding">${esc(x.rol)}</p><ul>${x.portefeuilles.map(p => `<li>${esc(p)}</li>`).join("")}</ul></div></article>`).join("")}</div></section>`;
};

pagina.bestuur = async () => {
  const b = await laad("bestuur");
  return paginaKop("Bestuur", "Het bestuur van Vereniging Groep de Mos, de vereniging achter Hart voor Den Haag.") + `
    <section class="wit"><div class="wrap"><div class="gezichten">${b.mensen.map(m => portret(m, { link: false, rol: true })).join("")}</div>
      <p style="margin-top:28px">U bereikt het bestuur via <a href="mailto:${esc(b.mail)}">${esc(b.mail)}</a>.</p></div></section>
    <section><div class="wrap"><div class="kop"><h2>Jaarverslagen en jaarcijfers</h2><p class="inleiding">Open over geld en keuzes: alle verslagen en jaarcijfers op een rij.</p></div>
      <ul class="documenten">${b.stukken.map(s => `<li><a href="${esc(s.link)}" target="_blank" rel="noopener"><span>${esc(s.titel)}</span>${UIT}</a></li>`).join("")}</ul></div></section>`;
};

pagina.agenda = async () => {
  const ag = await agenda();
  return paginaKop("Agenda", "Spreekuren, wijkschouwen en bijeenkomsten. Loop gerust binnen.") + `
    <section class="wit"><div class="wrap">${ag.length ? `<ol class="agenda-lijst">${ag.map(agendaItem).join("")}</ol>` : `<p class="leeg">Er staat nu niets op de agenda.</p>`}
    <p class="melding" style="margin-top:28px">Staat er niets bij u in de buurt? <a href="#contact/spreekuur">Vraag een spreekuur aan in uw stadsdeel</a>.</p></div></section>`;
};

pagina.vacatures = async ([id]) => {
  if (id) return detail("vacature", decodeURIComponent(id), "Vacatures", "vacatures");
  const v = await soort("vacature");
  return paginaKop("Vacatures", "Werken of vrijwilligen voor de grootste lokale partij van Den Haag.") + `
    <section class="wit"><div class="wrap">${v.length ? `<ul class="stukken">${v.map(x => stukItem(x)).join("")}</ul>` : `<p class="leeg">Er staan nu geen vacatures open. Wilt u toch helpen? Meld u aan als vrijwilliger of wijkvertegenwoordiger.</p><p style="margin-top:18px"><a class="knop groen" href="#doe-mee">Ik doe mee</a></p>`}</div></section>`;
};
pagina.vacatures.na = ([id]) => id && detail.na();

pagina["doe-mee"] = async () => paginaKop("Doe mee", "Den Haag wordt beter als u meedoet. Word wijkvertegenwoordiger of vrijwilliger in uw eigen stadsdeel.") + `
  <section><div class="wrap formulier-raster">
    <form class="formulier" id="form" novalidate>
      <fieldset><legend>Ik wil helpen als</legend><div class="keuzes">
        <div class="keuze"><input type="radio" name="rol" id="r1" value="Wijkvertegenwoordiger" checked><label for="r1"><b>Wijkvertegenwoordiger</b><span>Ogen en oren in uw buurt</span></label></div>
        <div class="keuze"><input type="radio" name="rol" id="r2" value="Vrijwilliger"><label for="r2"><b>Vrijwilliger</b><span>Flyeren, acties, campagne</span></label></div></div></fieldset>
      <div class="velden">
        <div class="veld"><label for="f-naam">Naam</label><input type="text" id="f-naam" name="naam" autocomplete="name"></div>
        <div class="veld"><label for="f-tel">Telefoonnummer</label><input type="tel" id="f-tel" name="telefoon" autocomplete="tel"></div>
        <div class="veld"><label for="f-email">E-mailadres</label><input type="email" id="f-email" name="email" autocomplete="email"></div>
        <div class="veld"><label for="f-sd">Ik woon in stadsdeel</label><select id="f-sd" name="stadsdeel">${stadsdeelOpties()}</select></div>
        <div class="veld breed"><label for="f-ber">Iets wat we moeten weten? <small>(niet verplicht)</small></label><textarea id="f-ber" name="bericht" maxlength="1500"></textarea></div></div>
      ${akkoordVeld()}<button class="knop groen" type="submit">Ik doe mee</button><p class="uitslag" hidden></p></form>
    <div><h2>Zo werkt het</h2><ol class="uitleg" style="grid-template-columns:1fr;margin-top:22px">
      <li><b>Meld u aan</b><span>Vul het formulier in. Dat duurt een minuut.</span></li>
      <li><b>Kennismaken</b><span>Iemand uit uw stadsdeel belt of mailt u voor een eerste gesprek.</span></li>
      <li><b>Aan de slag</b><span>U helpt in uw eigen buurt, op momenten die u uitkomen.</span></li></ol>
      <p class="melding" style="margin-top:8px">Liever eerst bellen? <a href="${TEL_LINK}">${TEL}</a>. Wilt u een poster voor uw raam? Zet het in uw bericht.</p></div>
  </div></section>`;
pagina["doe-mee"].na = () => koppelFormulier($("#form"), {
  soort: "doemee",
  eisen: () => ({ naam: verplicht("Vul uw naam in."), email: mailOfTel, stadsdeel: verplicht("Kies uw stadsdeel, dan zoeken we iemand bij u in de buurt."), akkoord: v => v ? "" : "Vink dit aan, zodat we contact mogen opnemen." }),
  bedankt: d => `Dank u wel! Iemand uit ${d.stadsdeel || "uw stadsdeel"} neemt binnenkort contact met u op.`,
});

pagina.contact = async ([onderwerp, sd]) => {
  const keuzes = [["melding", "Iets in mijn buurt"], ["contact", "Een vraag aan de fractie"], ["spreekuur", "Spreekuur aanvragen"], ["lidmaatschap", "Lidmaatschap"], ["pers", "Pers en media"], ["anders", "Iets anders"]];
  const gekozen = keuzes.some(k => k[0] === onderwerp) ? onderwerp : "contact";
  const melding = gekozen === "melding";
  return paginaKop(melding ? "Meld een probleem" : "Contact", melding ? "Loszittende stoeptegels, overlast, een gevaarlijke oversteek: vertel het ons. Het ombudsteam pakt het op." : "Wij staan open voor uw ideeën en opmerkingen. Vertel ons uw verhaal, dan nemen we zo snel mogelijk contact op.") + `
  <section><div class="wrap formulier-raster">
    <form class="formulier" id="form" novalidate>
      <fieldset><legend>Waar gaat uw bericht over?</legend><div class="keuzes">${keuzes.map((k, i) => `<div class="keuze"><input type="radio" name="onderwerp" id="o${i}" value="${k[0]}"${k[0] === gekozen ? " checked" : ""}><label for="o${i}"><b>${k[1]}</b></label></div>`).join("")}</div></fieldset>
      <div class="velden">
        <div class="veld"><label for="c-naam">Naam</label><input type="text" id="c-naam" name="naam" autocomplete="name"></div>
        <div class="veld"><label for="c-tel">Telefoonnummer</label><input type="tel" id="c-tel" name="telefoon" autocomplete="tel"></div>
        <div class="veld"><label for="c-email">E-mailadres</label><input type="email" id="c-email" name="email" autocomplete="email"></div>
        <div class="veld"><label for="c-sd">Stadsdeel</label><select id="c-sd" name="stadsdeel">${stadsdeelOpties(sd ? decodeURIComponent(sd) : "")}</select></div>
        <div class="veld breed" id="plek-veld"><label for="c-plek">Waar is het? <small>Straat en huisnummer of een herkenningspunt</small></label><input type="text" id="c-plek" name="plek"></div>
        <div class="veld breed"><label for="c-ber">Uw bericht</label><textarea id="c-ber" name="bericht" maxlength="1500"></textarea><small id="teller-tekst">0 van 1500 tekens</small></div></div>
      ${akkoordVeld()}<button class="knop groen" type="submit">Verstuur bericht</button><p class="uitslag" hidden></p></form>
    <div><h2>Bel of mail</h2><ul class="stukken" style="margin-top:20px">
      <li><h3><a href="${TEL_LINK}">${TEL}</a></h3><p class="sam">Voor een snelle vraag</p></li>
      <li><h3><a href="mailto:${MAIL}">${MAIL}</a></h3><p class="sam">Wij lezen elk bericht</p></li>
      <li><h3>Spui 70, Den Haag</h3><p class="sam">Fractiekamer in het stadhuis</p></li></ul>
      <p class="melding" style="margin-top:22px"><b>Gevaarlijke situatie?</b> Bel 112. Een melding voor de gemeente zelf kan via 14 070 of denhaag.nl.</p></div>
  </div></section>`;
};
pagina.contact.na = () => {
  const form = $("#form");
  const zet = () => {
    const m = form.onderwerp.value === "melding";
    $("#plek-veld").hidden = !m;
    $("#teller-tekst").textContent = `${$("#c-ber").value.length} van 1500 tekens`;
  };
  form.addEventListener("change", zet); form.addEventListener("input", zet); zet();
  koppelFormulier(form, {
    soort: d => d.onderwerp === "melding" ? "melding" : "contact",
    eisen: d => ({
      naam: verplicht("Vul uw naam in."), email: mailOfTel,
      plek: v => d.onderwerp === "melding" && !v ? "Waar is het? Een straat of herkenningspunt is genoeg." : "",
      stadsdeel: v => d.onderwerp === "melding" && !v ? "Kies het stadsdeel, dan komt het bij de juiste raadsleden." : "",
      bericht: v => v.length < 10 ? "Vertel in een paar woorden waar het over gaat." : "",
      akkoord: v => v ? "" : "Vink dit aan, zodat we mogen reageren.",
    }),
    bedankt: d => d.onderwerp === "melding" ? `Dank u wel! Uw melding over ${d.stadsdeel} is binnen. Het ombudsteam kijkt ernaar en laat van zich horen.` : "Dank u wel! Uw bericht is binnen. We reageren zo snel mogelijk.",
  });
};

pagina.lid = async () => paginaKop("Word lid", "Met meer leden zijn we sterker. Als lid praat u mee en kiest u mee over bestuur en kandidaat-raadsleden.") + `
  <section><div class="wrap formulier-raster">
    <form class="formulier" id="form" novalidate>
      <fieldset><legend>Kies uw lidmaatschap</legend><div class="keuzes">
        <div class="keuze"><input type="radio" name="soort" id="s1" value="silver" checked><label for="s1"><b>Silvermember</b><span>€ 12,50 per jaar</span></label></div>
        <div class="keuze"><input type="radio" name="soort" id="s2" value="gold"><label for="s2"><b>Goldmember</b><span>€ 25 per jaar</span></label></div>
        <div class="keuze"><input type="radio" name="soort" id="s3" value="ouder"><label for="s3"><b>Ouderenlid, vanaf 65</b><span>€ 6,70 het eerste jaar, daarna € 12,50</span></label></div>
        <div class="keuze"><input type="radio" name="soort" id="s4" value="jong"><label for="s4"><b>Jongeren voor Den Haag</b><span>€ 12,50 of € 25 per jaar</span></label></div></div></fieldset>
      <fieldset><legend>Hoe wilt u betalen?</legend><div class="keuzes">
        <div class="keuze"><input type="radio" name="betaal" id="b1" value="incasso" checked><label for="b1"><b>Automatische incasso</b><span>Eerste keer met iDEAL, daarna vanzelf</span></label></div>
        <div class="keuze"><input type="radio" name="betaal" id="b2" value="ideal"><label for="b2"><b>Elk jaar zelf</b><span>U krijgt een betaalverzoek</span></label></div></div></fieldset>
      <div class="velden">
        <div class="veld"><label for="l-naam">Naam</label><input type="text" id="l-naam" name="naam" autocomplete="name"></div>
        <div class="veld"><label for="l-email">E-mailadres</label><input type="email" id="l-email" name="email" autocomplete="email"></div>
        <div class="veld"><label for="l-pc">Postcode</label><input type="text" id="l-pc" name="postcode" autocomplete="postal-code"></div>
        <div class="veld"><label for="l-nr">Huisnummer</label><input type="text" id="l-nr" name="huisnummer"></div></div>
      <button class="knop groen" type="submit">Verder naar betalen</button><p class="uitslag" hidden></p></form>
    <div><h2>Wat u krijgt</h2><ul class="voordelen">
      <li>Een stem op de Algemene Ledenvergadering.</li>
      <li>Mee beslissen over het bestuur en de kandidaat-raadsleden.</li>
      <li>Een uitnodiging voor al onze (leden)evenementen.</li>
      <li>Het speldje met de groen-gele hartjes, als welkomstcadeau.</li></ul>
      <p class="leeg" style="margin-top:20px">Bij opzeggen krijgt u geen geld terug; u blijft lid tot het einde van de betaalde periode. Vragen over uw lidmaatschap? <a href="#contact/lidmaatschap">Stel ze hier</a>.</p></div>
  </div></section>`;
pagina.lid.na = () => {
  const f = $("#form");
  f.addEventListener("input", e => { if (e.target.getAttribute("aria-invalid")) zetFout(e.target, ""); });
  f.addEventListener("submit", e => {
    e.preventDefault();
    if (!controleer(f, { naam: verplicht("Vul uw naam in."), email: v => EMAIL.test(v) ? "" : "Vul een geldig e-mailadres in.", postcode: v => /^\d{4}\s?[a-z]{2}$/i.test(v) ? "" : "Vul uw postcode in, bijvoorbeeld 2511 BT.", huisnummer: verplicht("Vul uw huisnummer in.") })) return;
    toon($(".uitslag", f), "Dit is een proef: er is niets verstuurd of betaald. Straks gaat u hier naar iDEAL en komt uw aanmelding direct in de ledenadministratie.");
  });
};

pagina.doneren = async () => paginaKop("Doneren", "Geen lid, wel steunen? Elke bijdrage gaat naar acties in de wijk, het ombudsteam en campagnemateriaal.") + `
  <section><div class="wrap formulier-raster">
    <form class="formulier" id="form" novalidate>
      <fieldset><legend>Hoe vaak?</legend><div class="keuzes kort">
        <div class="keuze"><input type="radio" name="vaak" id="v1" value="eenmalig" checked><label for="v1"><b>Eenmalig</b></label></div>
        <div class="keuze"><input type="radio" name="vaak" id="v2" value="maandelijks"><label for="v2"><b>Maandelijks</b></label></div></div></fieldset>
      <fieldset><legend>Bedrag</legend><div class="keuzes drie">
        ${[10, 25, 50, 100, 250].map((b, i) => `<div class="keuze"><input type="radio" name="bedrag" id="d${i}" value="${b}"${b === 25 ? " checked" : ""}><label for="d${i}"><b>€ ${b}</b></label></div>`).join("")}
        <div class="keuze"><input type="radio" name="bedrag" id="d9" value="eigen"><label for="d9"><b>Ander bedrag</b></label></div></div>
        <div class="veld" id="eigen-veld" hidden><label for="d-eigen">Uw bedrag in euro</label><input type="number" id="d-eigen" name="eigen" min="1" step="1" inputmode="numeric"></div></fieldset>
      <div class="velden">
        <div class="veld"><label for="d-naam">Naam</label><input type="text" id="d-naam" name="naam" autocomplete="name"></div>
        <div class="veld"><label for="d-plaats">Woonplaats</label><input type="text" id="d-plaats" name="plaats" autocomplete="address-level2"></div>
        <div class="veld breed"><label for="d-email">E-mailadres</label><input type="email" id="d-email" name="email" autocomplete="email"></div></div>
      <button class="knop groen" type="submit" id="doneer-knop">Doneer € 25 met iDEAL</button><p class="uitslag" hidden></p></form>
    <div><h2>Waar uw geld heen gaat</h2><ul class="voordelen">
      <li>Schouwen, bewonersavonden en spreekuren in alle acht stadsdelen.</li>
      <li>Het ombudsteam, zodat meldingen van bewoners snel worden opgepakt.</li>
      <li>Posters, flyers en filmpjes voor de campagne.</li></ul>
      <p class="melding" style="margin-top:22px">Giften aan politieke partijen vallen onder regels voor openheid. Daarom vragen we altijd uw naam en woonplaats. Anonieme giften nemen we niet aan.</p></div>
  </div></section>`;
pagina.doneren.na = () => {
  const f = $("#form");
  const bedrag = () => f.bedrag.value === "eigen" ? Number($("#d-eigen").value) : Number(f.bedrag.value);
  const zet = () => {
    $("#eigen-veld").hidden = f.bedrag.value !== "eigen";
    const b = bedrag();
    $("#doneer-knop").textContent = b >= 1 ? `Doneer € ${fmt.format(b)}${f.vaak.value === "maandelijks" ? " per maand" : ""} met iDEAL` : "Kies een bedrag";
  };
  f.addEventListener("input", zet); f.addEventListener("change", zet); zet();
  f.addEventListener("submit", e => {
    e.preventDefault();
    if (!controleer(f, { eigen: v => f.bedrag.value === "eigen" && !(Number(v) >= 1) ? "Vul een bedrag in van minstens € 1." : "", naam: verplicht("Vul uw naam in. Anonieme giften nemen we niet aan."), plaats: verplicht("Vul uw woonplaats in."), email: v => EMAIL.test(v) ? "" : "Vul een geldig e-mailadres in." })) return;
    toon($(".uitslag", f), "Dit is een proef: er is niets betaald. Straks opent hier iDEAL via Mollie.");
  });
};

pagina.zoeken = async ([term = ""]) => {
  term = decodeURIComponent(term);
  const [idx, nieuw] = await Promise.all([laad("zoekindex"), eigen()]);
  const woorden = term.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const alles = [...nieuw.map(i => ({ id: i.id, s: i.soort, t: i.titel, d: i.datum, x: i.samenvatting, sd: i.stadsdelen })), ...idx];
  const treffers = woorden.length ? alles.map(i => {
    const t = i.t.toLowerCase(), x = (i.x || "").toLowerCase() + " " + (i.sd || []).join(" ").toLowerCase();
    if (!woorden.every(w => t.includes(w) || x.includes(w))) return null;
    return { ...i, score: woorden.reduce((s, w) => s + (t.includes(w) ? 5 : 1), 0) };
  }).filter(Boolean).sort((a, b) => b.score - a.score || b.d.localeCompare(a.d)).slice(0, 40) : [];
  // markeren op platte tekst, daarna pas escapen
  const licht = s => {
    const re = new RegExp("(" + woorden.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
    return woorden.length ? String(s).split(re).map((deel, i) => i % 2 ? `<mark>${esc(deel)}</mark>` : esc(deel)).join("") : esc(s);
  };
  const knipsel = x => { const l = (x || "").toLowerCase(); const p = Math.max(0, l.indexOf(woorden[0] || "") - 60); const k = x.slice(p, p + 220); return (p ? "…" : "") + k.slice(0, k.lastIndexOf(" ") > 150 ? k.lastIndexOf(" ") : k.length) + "…"; };
  return paginaKop("Zoeken", term ? `${treffers.length >= 40 ? "Meer dan 40" : treffers.length} resultaten voor "${esc(term)}"` : "Zoek in nieuws, successen, raadswerk en petities.") + `
    <section class="wit"><div class="wrap">
      <form id="zoek2" role="search" style="display:flex;gap:10px;max-width:720px;margin-bottom:28px"><label class="verborgen" for="zoek2-veld">Zoekterm</label><input type="search" id="zoek2-veld" value="${esc(term)}" placeholder="Bijvoorbeeld Moerwijk, parkeren of Kwartellaan"><button class="knop groen klein" type="submit">Zoeken</button></form>
      ${term && !treffers.length ? `<p class="leeg">Niets gevonden. Probeer een ander woord, of zoek op een straat of wijk.</p>` : ""}
      <ul class="stukken zoek-treffer">${treffers.map(i => `<li><h3><a href="#${SOORT[i.s].pad}/${encodeURIComponent(i.id)}">${licht(i.t)}</a></h3><p class="bijschrift">${i.sd && i.sd.length ? `<span class="plek">${esc(i.sd.join(" en "))}</span>` : ""}<span>${esc(SOORT[i.s].naam)}</span><time>${datum(i.d)}</time></p><p class="sam">${licht(knipsel(i.x || ""))}</p></li>`).join("")}</ul>
    </div></section>`;
};
pagina.zoeken.na = () => $("#zoek2").addEventListener("submit", e => { e.preventDefault(); const t = $("#zoek2-veld").value.trim(); if (t) gaNaar("zoeken/" + encodeURIComponent(t)); });

pagina.privacy = async () => paginaKop("Privacy", "Hoe we met uw gegevens omgaan op deze proefsite.") + `
  <section class="wit"><div class="wrap artikel"><div class="artikel-tekst">
    <p>Deze site plaatst geen volg- of advertentiecookies en houdt geen bezoekersstatistieken bij. Uw keuze voor een stadsdeel onthoudt uw eigen browser, zodat de kaart de volgende keer meteen uw buurt laat zien.</p>
    <p>Wat u invult in een formulier (contact, melding, doe mee, petitie, nieuwsbrief) komt in een afgeschermd postvak dat alleen de redactie van Hart voor Den Haag kan inzien. We gebruiken het alleen om op uw bericht te reageren en geven het niet aan anderen.</p>
    <p>Lidmaatschap van een politieke partij zegt iets over uw politieke voorkeur. Daarom komt een aanmelding als lid straks rechtstreeks in de ledenadministratie en bewaart de website zelf geen ledengegevens.</p>
    <p>Wilt u weten welke gegevens we van u hebben, of wilt u dat we ze wissen? Mail <a href="mailto:${MAIL}">${MAIL}</a>.</p>
  </div></div></section>`;

pagina.toegankelijkheid = async () => paginaKop("Toegankelijkheid", "Deze site moet voor iedereen werken, ook op een oudere telefoon of met een schermlezer.") + `
  <section class="wit"><div class="wrap artikel"><div class="artikel-tekst">
    <p>We bouwen volgens de richtlijnen voor toegankelijkheid (WCAG 2.2, niveau AA): tekst met voldoende contrast, alles te bedienen met het toetsenbord, knoppen van minstens 44 pixels en een donkere weergave als uw telefoon die gebruikt.</p>
    <p>De film bovenaan speelt zonder geluid en staat stil als u op uw apparaat "minder beweging" hebt ingesteld. U kunt hem altijd pauzeren.</p>
    <p>Loopt u ergens tegenaan? Laat het ons weten via <a href="#contact">het contactformulier</a> of bel <a href="${TEL_LINK}">${TEL}</a>.</p>
  </div></div></section>`;

// ---------- router ----------
const TITELS = { nieuws: "Nieuws", successen: "Successen", raadswerk: "Raadswerk", petities: "Petities", standpunten: "Standpunten", fractie: "Fractie", wethouders: "Wethouders", bestuur: "Bestuur", agenda: "Agenda", vacatures: "Vacatures", "doe-mee": "Doe mee", contact: "Contact", lid: "Word lid", doneren: "Doneren", zoeken: "Zoeken", stadsdelen: "Uw stadsdeel", privacy: "Privacy", toegankelijkheid: "Toegankelijkheid" };
let vorige = location.hash, viaLink = false;
function gaNaar(h) { viaLink = true; location.hash = h; }
document.addEventListener("click", e => {
  const a = e.target.closest("a[href^='#']");
  if (a && a.getAttribute("href") !== "#inhoud") viaLink = true;
});
async function route() {
  opslag.sZet("scroll:" + vorige, String(scrollY));
  vorige = location.hash;
  const delen = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  let naam = delen.shift() || "home";
  if (naam === "inhoud") return;
  if (!pagina[naam]) naam = "home";
  sluitAlles();
  const app = $("#app");
  try {
    if (!KAART) { [KAART, FRACTIE] = await Promise.all([laad("kaart"), laad("fractie")]); zetSprite(KAART); }
    document.title = (TITELS[naam] ? TITELS[naam] + " | " : "") + "Hart voor Den Haag (proef)";
    app.innerHTML = await pagina[naam](delen);
    if (pagina[naam].na) await pagina[naam].na(delen);
  } catch (e) {
    console.error(e);
    app.innerHTML = paginaKop("Er ging iets mis", "Laad de pagina opnieuw. Lukt het niet? Bel " + TEL + ".");
  }
  laad("kaart").then(k => $$(".kop-lijnen").forEach(svg => { svg.setAttribute("viewBox", `0 0 ${k.w} ${k.h}`); svg.innerHTML = Object.values(k.sd).map(x => `<path d="${x.d}"/>`).join(""); }));
  const sectie = naam;
  $$(".menu a[data-sectie], .onderbalk [data-sectie]").forEach(a => a.dataset.sectie.split(" ").includes(sectie) ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  $$(".menu button[data-sectie]").forEach(b => b.classList.toggle("actief", b.dataset.sectie.split(" ").includes(sectie)));
  // lade en uitklapmenu's: de langste link die bij het huidige adres past, is de huidige pagina
  const h = location.hash || "#";
  const passend = $$("#lade .lade-links a[href^='#'], .uitklap-paneel a[href^='#']").filter(a => { const r = a.getAttribute("href"); return h === r || h.startsWith(r + "/"); });
  const langst = Math.max(0, ...passend.map(a => a.getAttribute("href").length));
  $$("#lade .lade-links a, .uitklap-paneel a").forEach(a => passend.includes(a) && a.getAttribute("href").length === langst ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  const terug = !viaLink && opslag.sLees("scroll:" + location.hash);
  if (terug) window.scrollTo({ top: Number(terug), behavior: "instant" });
  else {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (viaLink) { const h = $("#app h1"); if (h) h.focus({ preventScroll: true }); }
  }
  viaLink = false;
}
addEventListener("hashchange", route);
route();

// ---------- kop, menu en lade ----------
function sluitAlles() {
  $$(".uitklap button[aria-expanded='true']").forEach(b => { b.setAttribute("aria-expanded", "false"); $("#" + b.getAttribute("aria-controls")).hidden = true; });
  if (!$("#lade").hidden) sluitLade(false);
}
$$(".uitklap-paneel").forEach(p => p.hidden = true);
$$(".uitklap button").forEach(b => b.addEventListener("click", e => {
  e.stopPropagation();
  const open = b.getAttribute("aria-expanded") === "true";
  sluitAlles();
  if (!open) { b.setAttribute("aria-expanded", "true"); $("#" + b.getAttribute("aria-controls")).hidden = false; }
}));
document.addEventListener("click", e => { if (!e.target.closest(".uitklap")) $$(".uitklap button[aria-expanded='true']").forEach(b => { b.setAttribute("aria-expanded", "false"); $("#" + b.getAttribute("aria-controls")).hidden = true; }); });
// met Tab uit een uitklapmenu: het menu gaat dicht
$$(".uitklap").forEach(li => li.addEventListener("focusout", e => {
  if (!e.relatedTarget || li.contains(e.relatedTarget)) return;
  const b = $("button", li); b.setAttribute("aria-expanded", "false"); $("#" + b.getAttribute("aria-controls")).hidden = true;
}));
$("#zoek-knop").addEventListener("click", () => {
  const z = $("#zoekbalk"); z.hidden = !z.hidden; $("#zoek-knop").setAttribute("aria-expanded", String(!z.hidden));
  if (!z.hidden) $("#zoek-veld").focus();
});
$("#zoek-form").addEventListener("submit", e => { e.preventDefault(); const t = $("#zoek-veld").value.trim(); if (t) { $("#zoekbalk").hidden = true; $("#zoek-knop").setAttribute("aria-expanded", "false"); gaNaar("zoeken/" + encodeURIComponent(t)); } });
function openLade() { $("#lade").hidden = false; $("#menu-knop").setAttribute("aria-expanded", "true"); $("#lade-dicht").focus(); document.body.style.overflow = "hidden"; }
function sluitLade(focus = true) { $("#lade").hidden = true; $("#menu-knop").setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; if (focus) $("#menu-knop").focus(); }
$("#menu-knop").addEventListener("click", openLade);
$("#lade-dicht").addEventListener("click", () => sluitLade());
$("#lade").addEventListener("click", e => {
  if (e.target.id === "lade") return sluitLade();
  const a = e.target.closest("a"); if (!a) return;
  sluitLade(false);
  // tik op de pagina waar u al bent: geen hashchange, dus zelf naar boven en de focus op de kop
  if (a.getAttribute("href") === location.hash) { e.preventDefault(); viaLink = false; window.scrollTo({ top: 0, behavior: "instant" }); const h1 = $("#app h1"); if (h1) h1.focus(); }
});
$("#lade").addEventListener("keydown", e => {
  if (e.key !== "Tab") return;
  const f = $$("a, button", $("#lade")), eerste = f[0], laatste = f[f.length - 1];
  if (e.shiftKey && document.activeElement === eerste) { e.preventDefault(); laatste.focus(); }
  else if (!e.shiftKey && document.activeElement === laatste) { e.preventDefault(); eerste.focus(); }
});
addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!$("#lade").hidden) sluitLade();
  const open = $(".uitklap button[aria-expanded='true']"); if (open) { sluitAlles(); open.focus(); }
  if (!$("#zoekbalk").hidden) { $("#zoekbalk").hidden = true; $("#zoek-knop").setAttribute("aria-expanded", "false"); $("#zoek-knop").focus(); }
});

// strook: eerstvolgende afspraak
agenda().then(ag => { if (ag[0]) { const x = dt(ag[0].datum); $("#strook-spreekuur").textContent = `Agenda: ${x.d} ${MND[x.m]}, ${ag[0].plek.split(",")[0]}`; } });

// nieuwsbrief in de voet
koppelFormulier($("#nieuwsbrief"), {
  soort: "nieuwsbrief",
  eisen: () => ({ email: v => EMAIL.test(v) ? "" : "Vul een geldig e-mailadres in." }),
  bedankt: () => "Dank u wel! U bent aangemeld voor de nieuwsbrief.",
});
