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
// Aanpassingen uit de beheeromgeving op overgenomen berichten: andere titel, stadsdeel, tekst, foto, of verborgen.
// De dagelijkse import van hartvoordenhaag.nl overschrijft ze niet, want ze liggen apart bij de achterkant.
const MET_AANPASSING = new Set(["nieuws", "successen", "moties", "amendementen", "raadsvragen", "spreekteksten", "petities", "agenda", "zoekindex"]);
let aanpBelofte = null;
function aanpassingen() {
  if (!aanpBelofte) {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 3500);
    aanpBelofte = fetch(API + "/aanpassingen", { signal: ctrl.signal }).then(r => r.ok ? r.json() : {}).then(d => d.aanpassingen || {}).catch(() => ({}));
  }
  return aanpBelofte;
}
function pasAan(naam, lijst, a) {
  if (!Array.isArray(lijst) || !a || !Object.keys(a).length) return lijst;
  const uit = [];
  for (const x of lijst) {
    const p = a[x.id];
    if (!p) { uit.push(x); continue; }
    if (p.verborgen) continue;
    const y = { ...x };
    if (naam === "zoekindex") {
      if (p.titel != null) y.t = p.titel;
      if (p.samenvatting != null) y.x = p.samenvatting;
      if (p.stadsdelen) y.sd = p.stadsdelen;
      if (p.onderwerpen) y.o = p.onderwerpen;
      if (p.datum) y.d = p.datum;
      if (p.indiener != null) y.i = p.indiener;
      if (p.status != null) y.st = p.status;
    } else {
      if (p.titel != null && p.titel !== x.titel) y.titelOrigineel = x.titel;
      for (const k of ["titel", "samenvatting", "html", "onderwerpen", "datum", "indiener", "status", "tijd", "plek"]) if (p[k] != null) y[k] = p[k];
      if (p.stadsdelen) { if (naam === "agenda") y.stadsdeel = p.stadsdelen[0] || ""; else y.stadsdelen = p.stadsdelen; }
      if (p.foto) y.beeld = `${API}/foto/${p.foto}`; else if (p.beeldWeg) y.beeld = "";
      if (p.vast) y.vast = true;
    }
    uit.push(y);
  }
  return uit;
}
function laad(naam) {
  if (!cache[naam]) {
    const bestand = fetch(`data/${naam}.json?v=5`).then(r => r.ok ? r.json() : []).catch(() => []);
    cache[naam] = MET_AANPASSING.has(naam) || naam.startsWith("lijst/") ? Promise.all([bestand, aanpassingen()]).then(([d, a]) => pasAan(naam, d, a)) : bestand;
  }
  return cache[naam];
}
// één stuk met de volledige tekst (data/stuk/<id>.json), pas geladen als iemand het opent
function stuk(id) {
  const k = "stuk/" + id;
  if (!cache[k]) cache[k] = Promise.all([fetch(`data/stuk/${encodeURIComponent(id)}.json?v=5`).then(r => r.ok ? r.json() : null).catch(() => null), aanpassingen()])
    .then(([d, a]) => d ? (pasAan("stuk", [d], a)[0] || null) : null);
  return cache[k];
}
// het hele archief van één soort: eerst het recente werk, ouder werk jaar voor jaar zodra iemand verder wil
function stroom(s) {
  const st = { items: [], ids: new Set(), klaar: true, totaal: 0 };
  let jaren = [];
  st.start = async () => {
    const [r, info] = await Promise.all([soort(s), laad("archief")]);
    r.forEach(i => { st.ids.add(i.id); st.items.push(i); });
    const inf = info && info.soorten && info.soorten[s];
    jaren = inf ? Object.keys(inf.jaren).sort().reverse() : [];
    st.totaal = inf ? inf.totaal + r.filter(i => i.eigen).length : r.length;
    st.klaar = !inf || inf.recent >= inf.totaal;
    return st;
  };
  st.ouder = async () => {
    if (st.klaar) return false;
    const extra = await laad(`lijst/${inf_bron(s)}-${jaren.shift()}`);
    for (const i of extra) if (!st.ids.has(i.id)) { st.ids.add(i.id); st.items.push(i); }
    st.items.sort(opVolgorde);
    if (!jaren.length) st.klaar = true;
    return true;
  };
  return st;
}
const inf_bron = s => SOORT[s].bron;
const platAlinea = t => String(t || "").split(/\n{2,}/).filter(p => p.trim()).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
const zonderTags = h => String(h || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let apiItems = null;
function eigen() {
  if (!apiItems) {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 4000);
    apiItems = fetch(API + "/inhoud", { signal: ctrl.signal }).then(r => r.json()).then(d => (d.items || []).map(i => {
      const html = i.html || platAlinea(i.tekst);
      return {
        id: "w" + i.id, soort: i.soort, titel: i.titel, datum: i.datum, samenvatting: i.samenvatting || zonderTags(html).slice(0, 240),
        html, beeld: i.foto ? `${API}/foto/${i.foto}` : "", link: i.link,
        stadsdelen: i.stadsdelen && i.stadsdelen.length ? i.stadsdelen : i.stadsdeel ? [i.stadsdeel] : [],
        tijd: i.tijd, plek: i.plek, eigen: true, onderwerpen: i.onderwerpen || [], vast: !!i.vast,
      };
    })).catch(() => []);
  }
  return apiItems;
}
// berichten die de redactie bovenaan zette eerst, daarna op datum
const opVolgorde = (a, b) => (b.vast ? 1 : 0) - (a.vast ? 1 : 0) || b.datum.localeCompare(a.datum);
async function soort(s) {
  const bron = SOORT[s] && SOORT[s].bron;
  const [overgenomen, nieuw] = await Promise.all([bron ? laad(bron) : [], eigen()]);
  return [...nieuw.filter(i => i.soort === s), ...overgenomen].sort(opVolgorde);
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
  d.innerHTML = `<svg width="0" height="0" style="position:absolute"><defs>${Object.entries(k.sd).map(([n, v]) => `<path id="sd-${slug(n)}" d="${v.d}"/>`).join("")}<path id="sd-stad" d="${Object.values(k.sd).map(v => v.d).join(" ")}"/></defs></svg>`;
  document.body.prepend(d);
}
const silhouet = n => KAART && KAART.sd[n] && KAART.sd[n].bb ? `<svg class="sil" viewBox="${KAART.sd[n].bb.join(" ")}" aria-hidden="true"><use href="#sd-${slug(n)}"/></svg>` : "";
const lidVan = naam => FRACTIE.find(f => slug(f.naam) === slug(naam));
const escRe = t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PLAT = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function wieVan(i) {
  if (i.indiener) return i.indiener.split(" en ").map(n => lidVan(n) || { naam: n.trim(), beeld: "" }).filter(f => f.naam);
  if (i.soort !== "nieuws" && i.soort !== "succes") return [];
  const t = PLAT(i.titel + " " + (i.samenvatting || "").slice(0, 160));
  return FRACTIE.filter(f => {
    const achter = PLAT(f.naam.split(" ").slice(1).join(" "));
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
  delen.push(i.datum_geschat ? `<span title="De oude site gaf hier geen datum">datum onbekend, rond ${dt(i.datum).y}</span>` : `<time datetime="${esc(i.datum)}">${datum(i.datum)}</time>`);
  if (i.ris && opties.ris !== false) delen.push(`<span>${esc(i.ris)}</span>`);
  if (i.eigen) delen.push(`<span class="nieuw">Net geplaatst</span>`);
  return `<p class="bijschrift">${delen.join("")}</p>`;
}
const href = i => `#${SOORT[i.soort].pad}/${encodeURIComponent(i.id)}`;
function logItem(i, eerste, opties = {}) {
  return `<li class="log-item${eerste ? " eerste" : ""}${i.beeld ? "" : " zonder-beeld"}">
    <div class="log-tekst"><h3><a href="${href(i)}">${esc(i.titel)}</a></h3>${bijschrift(i, opties)}${i.samenvatting ? `<p class="sam">${esc(i.samenvatting)}</p>` : ""}<span class="lees-meer" aria-hidden="true">Lees meer ${PIJL}</span></div>
    ${i.beeld ? `<img class="log-beeld" src="${esc(i.beeld)}" alt="" loading="${eerste ? "eager" : "lazy"}" decoding="async">` : ""}</li>`;
}
function stukItem(i, opties = {}) {
  const raad = ["motie", "amendement", "raadsvraag", "spreektekst"].includes(i.soort);
  const tekst = `<h3><a href="${href(i)}">${esc(i.titel)}</a></h3>${bijschrift(i, opties)}${i.samenvatting ? `<p class="sam">${esc(i.samenvatting)}</p>` : ""}`;
  if (!raad || opties.kaal) return `<li>${tekst}</li>`;
  const w = wieVan(i), plek = i.stadsdelen && i.stadsdelen[0];
  return `<li class="met-wie"><span class="r-wie${w.length > 1 ? " twee" : ""}" aria-hidden="true">${w.length ? gezichtjes(w) : `<span class="r-plek">${plek ? silhouet(plek) : STAD}</span>`}</span><div>${tekst}</div></li>`;
}
function agendaItem(a) {
  const x = dt(a.datum);
  return `<li><div class="dd" aria-hidden="true"><b>${x.d}</b><span>${MND[x.m]}</span></div>
    <div><h3>${esc(a.titel)}</h3><p>${DAG[x.wd]} ${x.d} ${MAAND[x.m]}${a.tijd ? ", " + esc(a.tijd) + " uur" : ""} · ${esc(a.plek || "")}${a.stadsdeel ? " · " + esc(a.stadsdeel) : ""}</p>${a.samenvatting ? `<p>${esc(a.samenvatting)}</p>` : ""}
    <a class="aanmeld" href="#agenda/aanmelden/${encodeURIComponent(a.id)}">Aanmelden<span class="verborgen"> voor ${esc(a.titel)}</span></a></div></li>`;
}
function portret(f, opties = {}) {
  const naam = esc(f.naam);
  const onder = opties.rol ? esc(f.rol) : (f.stadsdelen && f.stadsdelen.length ? esc(f.stadsdelen.join(" en ")) : "");
  const pf = opties.portefeuilles && f.portefeuilles && f.portefeuilles.length ? `<small>${esc(f.portefeuilles.slice(0, 3).join(", "))}${f.portefeuilles.length > 3 ? " en meer" : ""}</small>` : "";
  return `<figure>${f.beeld ? `<img src="${esc(f.beeld)}" alt="Portret van ${naam}" loading="lazy" decoding="async">` : `<div class="leeg-foto" aria-hidden="true">${initialen(f.naam)}</div>`}
    <figcaption>${opties.link === false ? `<b>${naam}</b>` : `<a href="#fractie/${slug(f.naam)}"><b>${naam}</b></a>`}${onder ? `<span>${onder}</span>` : ""}${pf}</figcaption></figure>`;
}
const paginaKop = (titel, tekst, kruimel = "", extra = "", plek = "") => `<div class="pagina-kop${plek ? " met-plek" : ""}"><svg class="kop-lijnen" aria-hidden="true"${plek ? ` data-plek="${esc(plek)}"` : ""}></svg><div class="wrap">${kruimel ? `<p class="kruimel">${kruimel}</p>` : ""}<h1 tabindex="-1">${titel}</h1>${tekst ? `<p>${tekst}</p>` : ""}${extra}</div></div>`;
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
  if (eerste) (eerste.type === "hidden" ? eerste.closest("fieldset")?.querySelector("input:not([type=hidden])") || eerste : eerste).focus();
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
    if (opties.voor) Object.assign(data, opties.voor(data));
    knop.disabled = true; const label = knop.textContent; knop.textContent = "Bezig met versturen…";
    try {
      const r = await fetch(API + "/formulier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await r.json().catch(() => ({ ok: false }));
      if (!d.ok) { const fout = new Error(""); fout.nl = d.fout && !/token|fetch|json|error/i.test(d.fout) ? d.fout : ""; throw fout; }
      form.reset(); form.dispatchEvent(new Event("change")); form.dispatchEvent(new Event("input"));
      toon(uit, opties.bedankt(data));
      if (opties.na) opties.na(data, uit);
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
  const [kaart, nieuws, succes, vragen, moties, amend, ag, petities, bewijs, tel] = await Promise.all([laad("kaart"), soort("nieuws"), soort("succes"), soort("raadsvraag"), soort("motie"), soort("amendement"), agenda(), soort("petitie"), laad("bewijs"), tellers()]);
  const ditJaar = succes.filter(s => s.datum.startsWith(String(new Date().getFullYear()))).length;
  const open = petities.filter(isOpen);
  const opDatum = (a, b) => b.datum.localeCompare(a.datum);
  const grens = new Date(Date.now() - 42 * 864e5).toISOString().slice(0, 10);
  let raad = [...vragen, ...moties, ...amend].sort(opDatum);
  raad = (raad.filter(i => i.datum >= grens).length >= 4 ? raad.filter(i => i.datum >= grens) : raad).slice(0, 6);
  const lead = nieuws.find(n => n.beeld) || nieuws[0];
  const rest = nieuws.filter(n => n !== lead).slice(0, 4);
  return `
  <section class="held" aria-labelledby="titel"><div class="wrap">
    <div class="held-kop">
      <h1 id="titel" tabindex="-1">Hart voor <span>Den Haag</span></h1>
      <div>
        <p class="held-rol">De grootste lokale partij van Den Haag</p>
        <p class="intro">Met ombudspolitiek zijn we zichtbaar in de wijken, dicht bij de Hagenaar, Hagenees, Scheveninger en Loosduiner. Zestien raadsleden zetten zich elke dag in voor een veilige, schone en leefbare stad.</p>
        <div class="knoppen"><a class="knop geel" href="#lid">Word lid vanaf € 12,50 per jaar</a><a class="knop lijn" href="#contact/melding">Meld een probleem</a></div>
      </div>
    </div>
    <figure class="held-beeld">
      ${HART.replace('class="sil"', 'class="hart"')}
      <div class="film"><video id="held-video" muted loop playsinline preload="metadata" poster="beeld/groep.jpg" aria-label="Campagnefilm van Hart voor Den Haag, zonder geluid"><source src="${VIDEO}" type="video/mp4"></video>
      <button class="speel" type="button" id="speel"><svg viewBox="0 0 16 16" aria-hidden="true"></svg><span>Pauzeer film</span></button></div>
      <figcaption><span>De fractie van Hart voor Den Haag. De film speelt zonder geluid.</span><a href="#fractie">Wie is uw raadslid?</a></figcaption>
    </figure>
  </div></section>

  ${ag.length ? `<section class="binnenkort" aria-labelledby="h-binnenkort"><div class="wrap">
    <div class="sectie-kop"><h2 id="h-binnenkort">Binnenkort</h2><a class="meer" href="#agenda">Hele agenda ${PIJL}</a></div>
    <div class="ag-rij">${ag.slice(0, 3).map((a, k) => agKolom(a, k === 0)).join("")}</div>
  </div></section>` : ""}

  <section aria-labelledby="h-weken"><div class="wrap">
    <div class="sectie-kop"><h2 id="h-weken">De afgelopen weken</h2><a class="meer" href="#nieuws">Al het nieuws ${PIJL}</a></div>
    <div class="krant">
      <div>
        ${lead ? `<article class="lead">${lead.beeld ? `<span class="poster-lijst"><img class="lead-beeld" src="${esc(lead.beeld)}" alt="" decoding="async"></span>` : ""}
          <h3><a href="${href(lead)}">${esc(lead.titel)}</a></h3>${bijschrift(lead)}${lead.samenvatting ? `<p class="sam">${esc(lead.samenvatting)}</p>` : ""}<span class="lees-meer" aria-hidden="true">Lees meer ${PIJL}</span></article>` : ""}
        <ul class="kolom-lijst">${rest.map(n => `<li><div><h3><a href="${href(n)}">${esc(n.titel)}</a></h3>${bijschrift(n)}<span class="lees-meer" aria-hidden="true">Lees meer ${PIJL}</span></div>${n.beeld ? `<img class="k-beeld" src="${esc(n.beeld)}" alt="" loading="lazy" decoding="async">` : "<span></span>"}</li>`).join("")}</ul>
      </div>
      <aside class="krant-zij" aria-labelledby="h-raad">
        <h3 class="kolomkop" id="h-raad">Uit de raad</h3>
        <ul class="raad-lijst">${raad.map(i => { const w = wieVan(i); const plek = i.stadsdelen && i.stadsdelen[0];
          return `<li><span class="r-wie${w.length > 1 ? " twee" : ""}" aria-hidden="true">${w.length ? gezichtjes(w) : `<span class="r-plek">${plek ? silhouet(plek) : STAD}</span>`}</span>
          <div><h4><a href="${href(i)}">${esc(i.titel)}</a></h4>${bijschrift(i, { soort: true, ris: false })}</div></li>`; }).join("")}</ul>
        <p><a class="meer" href="#raadswerk/vragen">Al het raadswerk ${PIJL}</a></p>
        ${open.length ? `<div class="teken"><h3 class="kolomkop">Teken mee</h3>${open.slice(0, 2).map(p => `<div class="teken-item"><a href="${href(p)}">${esc(p.titel.replace(/^petitie:\s*/i, "").replace(/^./, c => c.toUpperCase()))}</a>${balk(handtekeningen(p, tel))}</div>`).join("")}</div>` : ""}
      </aside>
    </div>
  </div></section>

  <section class="band" aria-labelledby="h-stadsdeel"><div class="wrap">
    <div class="sectie-kop"><h2 id="h-stadsdeel">Uw stadsdeel, uw raadsleden</h2><p class="inleiding">Vul uw postcode in of kies uw stadsdeel. U ziet wie er bij u spreekuur houdt en wat er bij u in de buurt speelt.</p></div>
    ${kaartBlok(kaart)}
  </div></section>

  <section class="donker" aria-labelledby="h-succes"><div class="wrap">
    <div class="succes-kop"><span class="groot-getal" data-tel="${ditJaar}" data-van="${Math.max(0, ditJaar - 1)}" aria-label="${ditJaar} successen"><span class="getal">${Math.max(0, ditJaar - 1)}</span></span><div><h2 id="h-succes">successen in ${new Date().getFullYear()}</h2><p>Van een besluit van de raad tot een opgeknapte speeltuin: dit leverde ombudspolitiek dit jaar op.</p></div></div>
    <ul class="drie">${succes.slice(0, 3).map(x => `<li>${x.beeld ? `<span class="poster-lijst"><img src="${esc(x.beeld)}" alt="" loading="lazy" decoding="async"></span>` : ""}<h3><a href="${href(x)}">${esc(x.titel)}</a></h3>${bijschrift(x)}</li>`).join("")}</ul>
    <p style="margin-top:22px"><a class="meer" href="#successen">Alle successen ${PIJL}</a></p>
  </div></section>

  <section aria-labelledby="h-beloofd"><div class="wrap">
    <div class="sectie-kop"><h2 id="h-beloofd">Beloofd en gedaan</h2><a class="meer" href="#standpunten">Alle standpunten ${PIJL}</a><p class="inleiding">Wat in ons programma staat, en wat we er het afgelopen jaar in de raad voor deden.</p></div>
    ${bewijsLijst(bewijs, PUNTEN.slice(0, 4))}
  </div></section>

  <section class="band podcast" aria-labelledby="h-podcast"><div class="wrap podcast-blok">
    <a class="podcast-hoes" href="https://open.spotify.com/show/0GI8mwNvxU1g3YUPhiJCeV" target="_blank" rel="noopener"><img src="beeld/den-haag-inside.webp" alt="Hoes van de podcast Den Haag Inside" width="640" height="640" loading="lazy" decoding="async"></a>
    <div><p class="bovenregel">Podcast</p><h2 id="h-podcast">Den Haag Inside</h2>
      <p class="inleiding">Elke twee weken gaat Richard de Mos achter de schermen van Den Haag, met openhartige gesprekken en scherpe vragen aan bekende Hagenaars, raadsleden en politici.</p>
      <p class="knoppen"><a class="knop groen" href="https://open.spotify.com/show/0GI8mwNvxU1g3YUPhiJCeV" target="_blank" rel="noopener">Luister op Spotify</a><a class="knop lijn" href="https://www.youtube.com/@hartvoordenhaag" target="_blank" rel="noopener">Kijk op YouTube</a></p></div>
  </div></section>
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

// een afspraak als krantenkolom, met aanmelden
function agKolom(a, eerst) {
  const x = dt(a.datum);
  return `<article class="ag${eerst ? " eerst" : ""}"><div class="ag-dd" aria-hidden="true"><b>${x.d}</b><span>${MND[x.m]}</span></div>
    <div><h3>${esc(a.titel)}</h3><p>${DAG[x.wd]} ${x.d} ${MAAND[x.m]}${a.tijd ? ", " + esc(a.tijd) + " uur" : ""} · ${esc(a.plek || "")}${a.stadsdeel ? " · " + esc(a.stadsdeel) : ""}</p>
    <a class="aanmeld" href="#agenda/aanmelden/${encodeURIComponent(a.id)}">Aanmelden<span class="verborgen"> voor ${esc(a.titel)}</span></a></div></article>`;
}

// petities: handtekeningen van hartvoordenhaag.nl plus die via deze site, met een doel
let tellerBelofte = null;
function tellers() {
  if (!tellerBelofte) {
    const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 4000);
    tellerBelofte = fetch(API + "/tellers", { signal: ctrl.signal }).then(r => r.json()).then(d => d.petities || {}).catch(() => ({}));
  }
  return tellerBelofte;
}
const handtekeningen = (p, tel) => (p.handtekeningen || 0) + (tel[p.titel] || 0) + (p.titelOrigineel ? tel[p.titelOrigineel] || 0 : 0);
const doelVan = n => [250, 500, 1000, 2500, 5000, 10000, 25000, 50000].find(d => d > n) || Math.ceil((n + 1) / 50000) * 50000;
function balk(n) {
  const doel = doelVan(n), pct = Math.max(2, Math.min(100, Math.round(n / doel * 100)));
  return `<div class="voortgang"><div class="voortgang-balk" role="progressbar" aria-valuemin="0" aria-valuemax="${doel}" aria-valuenow="${n}" aria-label="Handtekeningen"><span style="width:${pct}%"></span></div>
    <p><b>${fmt.format(n)}</b> handtekeningen · doel ${fmt.format(doel)}</p></div>`;
}
const HART = '<svg class="sil" viewBox="0 0 100 92" aria-hidden="true"><path d="M50 90C22 68 2 50 2 27 2 12 13 2 27 2c10 0 18 6 23 14C55 8 63 2 73 2c14 0 25 10 25 25 0 23-20 41-48 63z"/></svg>';
// omtrek van de hele stad, voor stukken die over heel Den Haag gaan
const STAD = '<svg class="sil" viewBox="0 0 1000 801" aria-hidden="true"><use href="#sd-stad"/></svg>';

// Standpunten met bewijs: wat we het afgelopen jaar in de raad deden op dat onderwerp.
function bewijsLijst(bewijs, punten, metProgramma = false) {
  const telling = b => {
    const delen = [];
    if (b.successen != null) delen.push(`<b data-tel="${b.successen}">${b.successen}</b> successen`);
    if (b.vragen) delen.push(`<b data-tel="${b.vragen}">${b.vragen}</b> keer schriftelijke vragen`);
    if (b.moties) delen.push(`<b data-tel="${b.moties}">${b.moties}</b> ${b.moties === 1 ? "motie" : "moties"}`);
    if (b.amendementen) delen.push(`<b data-tel="${b.amendementen}">${b.amendementen}</b> ${b.amendementen === 1 ? "amendement" : "amendementen"}`);
    return delen.length > 1 ? delen.slice(0, -1).join(", ") + " en " + delen.slice(-1) : delen.join("");
  };
  return `<div class="bewijs">${punten.map(([kop, tekst]) => {
    const b = bewijs && bewijs[kop];
    let rechts;
    if (kop === "Samenwerking voor de stad") rechts = `<p class="telling"><b>5</b> wethouders van Hart voor Den Haag in het college</p><p class="laatste"><a href="#wethouders">Wie het zijn en waar ze over gaan</a></p>`;
    else if (b) rechts = `<p class="telling">${telling(b)}</p>
      ${b.succes ? `<p class="laatste">Laatste succes: <a href="#successen/${esc(b.succes.id)}">${esc(b.succes.t)}</a> <time datetime="${esc(b.succes.d)}">(${datum(b.succes.d)})</time></p>` : ""}
      ${b.onderwerp ? `<p class="laatste"><a href="#raadswerk/vragen/onderwerp/${encodeURIComponent(b.onderwerp)}">Bekijk het raadswerk over ${esc(b.onderwerp.toLowerCase())}</a></p>` : ""}`;
    else rechts = `<p class="telling">${esc(tekst)}</p>`;
    return `<article><h3>${esc(kop)}</h3><div>${rechts}${metProgramma ? `<details class="hoe klein"><summary>Wat er in het programma staat</summary><p>${esc(tekst)}</p></details>` : ""}</div></article>`;
  }).join("")}</div>`;
}
const WA_KANAAL = "https://whatsapp.com/channel/0029VaD3yaZGE56qCyallu3r";
const lidRegel = () => `<section class="lid-regel-sectie"><div class="wrap"><div class="lid-regel">
  <p><b>Eens?</b> Word lid vanaf € 12,50 per jaar en praat mee over de koers, het bestuur en de kandidaten.</p>
  <a class="knop geel" href="#lid">Word lid</a>
  <p class="anders">Of <a href="#doneren">doneer</a>, <a href="#doe-mee">help mee in uw stadsdeel</a> of volg ons <a href="${WA_KANAAL}" target="_blank" rel="noopener">WhatsApp-kanaal</a>.</p>
</div></div></section>`;

// stadsdelenkaart
function kaartBlok(kaart) {
  return `<form class="postcode" id="postcode" novalidate role="search"><div class="veld"><label for="pc">Uw postcode</label>
      <div class="pc-rij"><input type="text" id="pc" name="pc" inputmode="text" autocomplete="postal-code" placeholder="Bijvoorbeeld 2491 AA" maxlength="7"><button class="knop groen klein" type="submit">Zoek mijn raadsleden</button></div></div>
      <p class="pc-uitslag" id="pc-uitslag" aria-live="polite"></p></form>
    <div class="stad-raster"><div><svg class="kaart" id="kaart" viewBox="0 0 ${kaart.w} ${kaart.h}" aria-hidden="true"></svg>
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
      paneel.innerHTML = `<div class="kies-hint"><h3>Kies uw stadsdeel</h3><p>Den Haag heeft acht stadsdelen, elk met eigen raadsleden en een eigen wethouder. Vul uw postcode in of kies een stadsdeel.</p></div>`;
      paneel.classList.add("leeg-paneel");
      return;
    }
    opslag.zet("stadsdeel", n); paneel.classList.remove("leeg-paneel");
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
      <div class="knoppen"><a class="knop groen" href="#contact/melding/${encodeURIComponent(n)}">Meld een probleem in ${esc(n)}</a><a class="knop lijn" href="#nieuws/stadsdeel/${encodeURIComponent(n)}">Nieuws uit ${esc(n)}</a></div>
      <p class="doe-mee-regel"><a href="#doe-mee">Doe mee en maak uw buurt beter</a> in ${esc(n)}.</p>`;
    if (doorGebruiker && paneel.getBoundingClientRect().top > innerHeight * .6) paneel.scrollIntoView({ block: "start" });
  }
  // gezichten op de kaart, bij het label van elk stadsdeel (alleen breed; smal staan ze in de rijen)
  if (innerWidth > 900) namen.forEach((n, k) => {
    const s = kaart.sd[n], mensen = fractie.filter(f => f.stadsdelen.includes(n) && f.beeld).slice(0, 3);
    const r = 19, start = s.x - (mensen.length - 1) * r * 0.8;
    mensen.forEach((f, i) => {
      const cx = start + i * r * 1.6, cy = s.y + (n === "Leidschenveen-Ypenburg" ? 52 : 34);
      const clip = document.createElementNS(NS, "clipPath"); clip.id = `gz-${k}-${i}`;
      const c = document.createElementNS(NS, "circle"); c.setAttribute("cx", cx); c.setAttribute("cy", cy); c.setAttribute("r", r); clip.appendChild(c); svg.appendChild(clip);
      const rand = document.createElementNS(NS, "circle"); rand.setAttribute("cx", cx); rand.setAttribute("cy", cy); rand.setAttribute("r", r + 2.5); rand.setAttribute("class", "gz-rand"); svg.appendChild(rand);
      const im = document.createElementNS(NS, "image"); im.setAttribute("href", f.beeld); im.setAttribute("x", cx - r); im.setAttribute("y", cy - r * 1.15);
      im.setAttribute("width", r * 2); im.setAttribute("height", r * 2.6); im.setAttribute("preserveAspectRatio", "xMidYMin slice"); im.setAttribute("clip-path", `url(#gz-${k}-${i})`);
      im.setAttribute("class", "gz"); svg.appendChild(im);
    });
  });
  // postcode: via de openbare adresdienst van PDOK naar de wijk, en van de wijk naar het stadsdeel
  const pcForm = $("#postcode");
  if (pcForm) pcForm.addEventListener("submit", async e => {
    e.preventDefault();
    const veld = $("#pc"), uit = $("#pc-uitslag"), pc = veld.value.replace(/\s+/g, "").toUpperCase();
    if (!/^\d{4}[A-Z]{2}$/.test(pc)) { uit.textContent = ""; zetFout(veld, "Vul een postcode in zoals 2491 AA."); veld.focus(); return; }
    zetFout(veld, ""); uit.textContent = "Even zoeken…";
    try {
      const r = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=postcode:${pc}&fq=type:adres&fl=wijknaam,gemeentenaam&rows=1`);
      const doc = (await r.json()).response.docs[0];
      if (!doc) { uit.textContent = "Deze postcode kennen we niet. Kies uw stadsdeel hieronder."; return; }
      if (!/gravenhage/i.test(doc.gemeentenaam || "")) { uit.textContent = `Deze postcode ligt in ${doc.gemeentenaam}, niet in Den Haag.`; return; }
      const wijk = String(doc.wijknaam || "").replace(/^Wijk \d+\s*/, "");
      const sd = namen.find(n => (kaart.sd[n].wijken || []).includes(wijk));
      if (!sd) { uit.textContent = `${wijk || "Deze wijk"} konden we niet aan een stadsdeel koppelen. Kies hieronder.`; return; }
      uit.textContent = `${pc.slice(0, 4)} ${pc.slice(4)} ligt in ${wijk}, stadsdeel ${sd}.`;
      kies(sd, true);
    } catch { uit.textContent = "Zoeken lukte nu niet. Kies uw stadsdeel hieronder."; }
  });
  kies(start && kaart.sd[start] ? start : "", false);
}

pagina.stadsdelen = async () => paginaKop("Uw stadsdeel", "Acht stadsdelen, elk met eigen raadsleden. Vul uw postcode in of kies uw stadsdeel.") +
  `<section><div class="wrap">${kaartBlok(await laad("kaart"))}</div></section>`;
pagina.stadsdelen.na = async ([naam]) => activeerKaart(await laad("kaart"), naam ? decodeURIComponent(naam) : opslag.lees("stadsdeel"));

// lijsten uit het hele archief: "Meer laden" haalt zo nodig een ouder jaar op; bij Terug blijft het aantal staan
async function meerLadenStroom(lijst, st, past, maak, stap, filterActief, leeg) {
  const sleutel = "n:" + location.hash;
  let n = Math.max(stap, Number(opslag.sLees(sleutel)) || stap);
  const knop = $(lijst.knop), teller = $(lijst.teller);
  const beurt = String((Number(($(lijst.doel) || {}).dataset?.beurt) || 0) + 1);
  if ($(lijst.doel)) $(lijst.doel).dataset.beurt = beurt;
  const teken = async () => {
    let zicht = st.items.filter(past);
    while (zicht.length < n && !st.klaar) {
      if (knop) { knop.hidden = false; knop.disabled = true; knop.textContent = "Ouder werk laden…"; }
      await st.ouder(); zicht = st.items.filter(past);
    }
    const doel = $(lijst.doel); if (!doel || doel.dataset.beurt !== beurt) return;
    if (knop) { knop.disabled = false; knop.textContent = "Meer laden"; }
    if (!zicht.length && st.klaar) { doel.innerHTML = leeg; if (teller) teller.textContent = ""; if (knop) knop.hidden = true; return; }
    doel.innerHTML = maak(zicht.slice(0, n));
    const getoond = Math.min(n, zicht.length);
    if (teller) teller.textContent = st.klaar ? `${getoond} van ${zicht.length}` : filterActief ? `${getoond} getoond, ouder werk komt erbij met Meer laden` : `${getoond} van ${st.totaal}`;
    if (knop) knop.hidden = st.klaar && n >= zicht.length;
  };
  await teken();
  if (knop) knop.onclick = async () => { n += stap; opslag.sZet(sleutel, n); await teken(); };
  return teken;
}
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
      <p class="leeg" style="margin-top:22px">Alles sinds ${s === "succes" ? "2014" : "2013"} staat hier. Met Meer laden gaat u verder terug in de tijd.</p></div></section>`;
  };
  f.na = async (args) => {
    if (args[0] && args[0] !== "stadsdeel") return detail.na(args);
    const sd = args[0] === "stadsdeel" ? decodeURIComponent(args[1] || "") : "";
    const st = await stroom(s).start();
    await meerLadenStroom({ doel: "#lijst", teller: "#teller", knop: "#meer" }, st, i => !sd || i.stadsdelen.includes(sd),
      rij => rij.map((n, i) => logItem(n, i === 0 && !sd)).join(""), 20, !!sd, `<li class="leeg">Nog geen berichten uit ${esc(sd)}.</li>`);
  };
  return f;
}
pagina.nieuws = lijstPagina("nieuws", "Nieuws", "Wat Hart voor Den Haag doet in de raad en in de wijk.", "nieuws");
pagina.successen = lijstPagina("succes", "Successen", "Wat ombudspolitiek opleverde: besluiten, oplossingen en opgeknapte plekken.", "successen");

async function detail(s, id, terugNaam, terugPad) {
  const eigenStuk = /^w/.test(id);
  const [alles, tel, vol] = await Promise.all([soort(s), s === "petitie" ? tellers() : {}, eigenStuk ? null : stuk(id)]);
  const i = eigenStuk ? alles.find(x => String(x.id) === id) : vol;
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
      <div class="dictum-voet">${wie.length ? `<span class="m-wie${wie.length > 1 ? " twee" : ""}" aria-hidden="true">${gezichtjes(wie)}</span>` : ""}<p>${i.indiener ? `Ingediend door ${wie.length ? wie.map(f => lidVan(f.naam) ? `<a href="#fractie/${slug(f.naam)}">${esc(f.naam)}</a>` : esc(f.naam)).join(" en ") : esc(i.indiener)}` : "Ingediend door Hart voor Den Haag"}, raad van ${datum(i.datum)}.${i.status ? ` <b>${esc(i.status)}.</b>` : ""}</p></div></div>`;
  })() : "";
  const lees = leestijd(i.html);
  return paginaKop(esc(i.titel), "", `<a href="#">Home</a> / <a href="#${terugPad}">${esc(terugNaam)}</a>`,
    bijschrift({ ...i, handtekeningen: isPetitie ? 0 : i.handtekeningen }, { soort: !["nieuws", "succes", "petitie"].includes(s) }).replace("</p>", `<span>${lees} min lezen</span></p>`), i.stadsdelen && i.stadsdelen.length === 1 ? i.stadsdelen[0] : "") + `
  <section class="wit"><div class="wrap"><article class="artikel${isPetitie && open && i.beeld ? " petitie-open" : ""}">
    ${i.beeld ? `<span class="poster-lijst artikel-beeld"><img src="${esc(i.beeld)}" alt=""></span>` : ""}
    ${isPetitie ? `<div class="teken-teller" id="teller-blok" data-n="${handtekeningen(i, tel)}">${balk(handtekeningen(i, tel))}<p class="leeg">Inclusief de handtekeningen op hartvoordenhaag.nl.</p>${open ? `<button class="knop groen teken-snel" type="button" id="naar-teken">Teken deze petitie</button>` : ""}</div>` : ""}
    ${dictum}
    ${isPetitie && !open ? `<p class="melding" style="margin-top:22px">Deze petitie is gesloten. Bekijk <a href="#petities">de petities die nu lopen</a>.</p>` : ""}
    ${open ? `<form class="formulier" id="teken" style="margin-top:22px" novalidate><h2 style="font-size:2rem">Teken deze petitie</h2>
      <input type="hidden" name="petitie" value="${esc(i.titel)}">
      <div class="velden"><div class="veld"><label for="p-naam">Naam</label><input type="text" id="p-naam" name="naam" autocomplete="name"></div>
      <div class="veld"><label for="p-email">E-mailadres</label><input type="email" id="p-email" name="email" autocomplete="email"></div>
      <div class="veld breed"><label for="p-sd">Stadsdeel <small>(niet verplicht)</small></label><select id="p-sd" name="stadsdeel">${stadsdeelOpties(i.stadsdelen[0])}</select></div></div>
      ${akkoordVeld()}<button class="knop groen" type="submit">Teken de petitie</button><p class="uitslag" hidden></p></form>` : ""}
    ${dictum || open ? `<h2 class="volledig">${open ? "Waarom deze petitie" : "Volledige tekst"}</h2>` : ""}
    <div class="artikel-tekst" style="margin-top:18px">${i.html || `<p>${esc(i.samenvatting)}</p>`}</div>
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
  const snel = $("#naar-teken");
  if (snel && t) snel.addEventListener("click", () => {
    t.scrollIntoView({ block: "start", behavior: stil() ? "auto" : "smooth" });
    const eerste = t.querySelector("input:not([type=hidden])"); if (eerste) eerste.focus({ preventScroll: true });
  });
  if (t) koppelFormulier(t, {
    soort: "petitie",
    eisen: () => ({ naam: verplicht("Vul uw naam in."), email: v => !v ? "Vul uw e-mailadres in." : EMAIL.test(v) ? "" : "Dit e-mailadres klopt niet.", akkoord: v => v ? "" : "Vink dit aan om te kunnen tekenen." }),
    bedankt: () => "Dank u wel! Uw handtekening is binnen. Helpt u mee? Hoe meer mensen tekenen, hoe sterker we in de raad staan.",
    na: (d, uit) => {
      $$(".velden, .vink, button[type=submit], h2", $("#teken")).forEach(x => x.hidden = true);
      const tb = $("#teller-blok"); if (tb) { const n = Number(tb.dataset.n) + 1; tb.dataset.n = n; tb.firstElementChild.outerHTML = balk(n); }
      const tekst = `Ik heb de petitie "${d.petitie}" getekend. Teken jij ook? ${location.href}`;
      uit.insertAdjacentHTML("afterend", `<div class="deel-na"><a class="knop groen" href="https://wa.me/?text=${encodeURIComponent(tekst)}" target="_blank" rel="noopener">Deel via WhatsApp</a><button class="knop lijn" type="button" id="kopieer">Kopieer de link</button></div>`);
      $(".deel-na").scrollIntoView({ block: "center", behavior: stil() ? "auto" : "smooth" });
      $("#kopieer").addEventListener("click", async e => { try { await navigator.clipboard.writeText(location.href); e.target.textContent = "Link gekopieerd"; } catch { e.target.textContent = "Kopieer de link uit de adresbalk"; } });
    },
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
      <p class="leeg" style="margin-top:22px">Onderwerpen zijn automatisch toegekend op basis van de tekst. Al het raadswerk sinds 2012 staat hier; met Meer laden gaat u verder terug.</p>
    </div></section>`;
};
pagina.raadswerk.na = async ([tab = "moties", ...rest]) => {
  if (DETAILTAB[tab] && rest[0]) return detail.na();
  const t = TABS[tab] || TABS.moties; const tabNaam = TABS[tab] ? tab : "moties";
  const { onderwerp = "" } = rwOpties(rest);
  const st = await stroom(t.s).start();
  const opOnderwerp = i => !onderwerp || (i.onderwerpen || []).includes(onderwerp);
  const perMaand = rij => {
    let html = "", huidig = "";
    for (const i of rij) {
      const x = dt(i.datum), m = `${MAAND[x.m]} ${x.y}`;
      if (m !== huidig) { if (huidig) html += "</ul>"; html += `<h2 class="maand-kop">${m[0].toUpperCase() + m.slice(1)}</h2><ul class="stukken">`; huidig = m; }
      html += stukItem(i);
    }
    return html + (huidig ? "</ul>" : "");
  };
  const leeg = `<p class="leeg" style="padding-top:18px">Niets gevonden. Probeer een ander woord of onderwerp. <a class="meer" href="#raadswerk/${tabNaam}">Wis zoekterm en onderwerp</a></p>`;
  const toonLijst = () => {
    const q = $("#binnen").value.trim().toLowerCase();
    const past = i => opOnderwerp(i) && (!q || (i.titel + " " + (i.samenvatting || "") + " " + (i.indiener || "")).toLowerCase().includes(q));
    return meerLadenStroom({ doel: "#lijst", teller: "#teller", knop: "#meer" }, st, past, perMaand, 25, !!(q || onderwerp), leeg);
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
  const [alles, tel] = await Promise.all([soort("petitie"), tellers()]);
  const open = alles.filter(isOpen), dicht = alles.filter(p => !isOpen(p));
  return paginaKop("Petities", "Hagenaars die samen iets willen veranderen. Teken mee, dan nemen wij het mee naar de raad.") +
    `<section class="wit"><div class="wrap">
      ${open.length ? `<h2 class="maand-kop">Loopt nu</h2><ul class="stukken">${open.map(p => `<li><h3><a href="${href(p)}">${esc(p.titel)}</a></h3>${bijschrift(p, { open: true })}${balk(handtekeningen(p, tel))}</li>`).join("")}</ul>` : `<p class="leeg">Er loopt nu geen petitie.</p>`}
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
    const a = await aanpassingen();
    const werk = (f.werk || []).filter(i => !(a[i.id] && a[i.id].verborgen)).map(i => a[i.id] ? { ...i, t: a[i.id].titel || i.t, sd: a[i.id].stadsdelen || i.sd, st: a[i.id].status ?? i.st } : i);
    return paginaKop(esc(f.naam), esc(f.functie || "Raadslid") + (f.stadsdelen.length ? ` voor ${esc(f.stadsdelen.join(" en "))}` : ""), `<a href="#">Home</a> / <a href="#fractie">Onze mensen</a>`) + `
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
  return paginaKop("Onze mensen", "Zestien raadsleden van Hart voor Den Haag. Kies uw stadsdeel en zie wie u kunt benaderen, of zoek op onderwerp wie erover gaat.") + `
    <section class="wit"><div class="wrap">
      <div class="filterrij"><div class="veld"><label for="wie">Wie gaat over…</label><input type="search" id="wie" list="pf-lijst" placeholder="Bijvoorbeeld parkeren, onderwijs of strand"><datalist id="pf-lijst">${alle.map(p => `<option value="${esc(p)}">`).join("")}</datalist></div>
        <div class="veld"><label for="wie-sd">Stadsdeel</label><select id="wie-sd"><option value="">Alle stadsdelen</option>${STADSDELEN.map(x => `<option>${x}</option>`).join("")}<option>Hele stad</option></select></div>
        <p class="teller" id="teller" aria-live="polite"></p></div>
      <div id="groepen"></div>
    </div></section>`;
};
pagina.fractie.na = async ([wie]) => {
  if (wie) return;
  const fractie = await laad("fractie");
  const recent = f => {
    const n = s_ => (f.telling && f.telling[s_]) || 0;
    const delen = [[n("raadsvraag"), "keer vragen", "keer vragen"], [n("motie"), "motie", "moties"], [n("amendement"), "amendement", "amendementen"]].filter(d => d[0]).map(d => `${d[0]} ${d[0] === 1 ? d[1] : d[2]}`);
    return delen.length ? `Het afgelopen jaar: ${delen.join(", ")}` : "";
  };
  const rij = f => `<li class="lid-rij">${f.beeld ? `<img src="${esc(f.beeld)}" alt="" loading="lazy" decoding="async">` : `<span class="leeg-foto" aria-hidden="true">${initialen(f.naam)}</span>`}
    <div><h3><a href="#fractie/${slug(f.naam)}">${esc(f.naam)}</a></h3>${f.functie && !/^raadslid$/i.test(f.functie) ? `<p class="functie">${esc(f.functie)}</p>` : ""}
    ${f.portefeuilles.length ? `<p class="pf">${esc(f.portefeuilles.join(", "))}</p>` : ""}${recent(f) ? `<p class="recent">${recent(f)}</p>` : ""}</div></li>`;
  const groepen = [...STADSDELEN.map(sd => [sd, fractie.filter(f => f.stadsdelen.includes(sd))]), ["Hele stad", fractie.filter(f => !f.stadsdelen.length)]];
  const filter = () => {
    const q = $("#wie").value.trim().toLowerCase(), sdKeuze = $("#wie-sd").value;
    const past = f => (!q || (f.portefeuilles.join(" ") + " " + f.naam).toLowerCase().includes(q)) && (!sdKeuze || (sdKeuze === "Hele stad" ? !f.stadsdelen.length : f.stadsdelen.includes(sdKeuze)));
    if (q) {
      const treffers = fractie.filter(past);
      $("#groepen").innerHTML = treffers.length ? `<ul class="leden">${treffers.map(rij).join("")}</ul>` : `<p class="leeg">Niemand gevonden${sdKeuze ? ` in ${esc(sdKeuze)}` : ""}. Probeer een ander woord${sdKeuze ? " of kies alle stadsdelen" : ""}.</p>`;
      $("#teller").textContent = `${treffers.length} ${treffers.length === 1 ? "raadslid" : "raadsleden"}${sdKeuze ? ` in ${sdKeuze}` : ""}`;
      return;
    }
    $("#teller").textContent = "";
    $("#teller").textContent = sdKeuze ? `${(groepen.find(g => g[0] === sdKeuze) || [0, []])[1].length} raadsleden in ${sdKeuze}` : "";
    $("#groepen").innerHTML = groepen.filter(g => g[1].length && (!sdKeuze || g[0] === sdKeuze)).map(([sd, mensen]) => `<section class="groep" aria-labelledby="g-${slug(sd)}">
      <h2 class="groep-kop" id="g-${slug(sd)}">${sd === "Hele stad" ? HART : silhouet(sd)}${esc(sd)}</h2><ul class="leden">${mensen.map(rij).join("")}</ul></section>`).join("");
  };
  $("#wie").addEventListener("input", filter); $("#wie-sd").addEventListener("change", filter);
  const bewaard = opslag.lees("stadsdeel"); if (bewaard && STADSDELEN.includes(bewaard)) $("#wie-sd").value = bewaard;
  filter();
};

pagina.wethouders = async () => {
  const w = await laad("wethouders");
  return paginaKop("Wethouders", "Vijf wethouders van Hart voor Den Haag zitten in het college van burgemeester en wethouders.") + `
    <section class="wit"><div class="wrap"><ul class="wethouders">${w.map(x => `<li class="wethouder">
      <span class="weth-foto"><img src="${esc(x.beeld)}" alt="Portret van ${esc(x.naam)}" loading="lazy" decoding="async"></span>
      <div><h2>${esc(x.naam)}</h2><p class="rol">${esc(x.rol.replace(/\.$/, ""))}</p>
      <ul class="pf-lijst">${x.portefeuilles.map(p => `<li>${esc(p)}</li>`).join("")}</ul></div></li>`).join("")}</ul></div></section>`;
};

pagina.bestuur = async () => {
  const b = await laad("bestuur");
  return paginaKop("Bestuur", "Het bestuur van Vereniging Groep de Mos, de vereniging achter Hart voor Den Haag.") + `
    <section class="wit"><div class="wrap"><div class="gezichten">${b.mensen.map(m => portret(m, { link: false, rol: true })).join("")}</div>
      <p style="margin-top:28px">U bereikt het bestuur via <a href="mailto:${esc(b.mail)}">${esc(b.mail)}</a>.</p></div></section>
    <section><div class="wrap"><div class="kop"><h2>Jaarverslagen en jaarcijfers</h2><p class="inleiding">Open over geld en keuzes: alle verslagen en jaarcijfers op een rij.</p></div>
      <ul class="documenten">${b.stukken.map(s => `<li><a href="${esc(s.link)}" target="_blank" rel="noopener"><span>${esc(s.titel)}</span>${UIT}</a></li>`).join("")}</ul></div></section>`;
};

pagina.agenda = async ([stap, id]) => {
  const ag = await agenda();
  if (stap === "aanmelden") {
    const a = ag.find(x => String(x.id) === decodeURIComponent(id || ""));
    if (!a) return paginaKop("Aanmelden", "Deze afspraak staat niet (meer) op de agenda.") + `<section><div class="wrap"><a class="knop groen" href="#agenda">Naar de agenda</a></div></section>`;
    const x = dt(a.datum);
    return paginaKop("Aanmelden", esc(a.titel), `<a href="#">Home</a> / <a href="#agenda">Agenda</a>`) + `
    <section><div class="wrap formulier-raster">
      <form class="formulier" id="form" novalidate>
        <input type="hidden" name="activiteit" value="${esc(a.titel)}"><input type="hidden" name="datum" value="${esc(a.datum)}">
        <div class="velden">
          <div class="veld"><label for="a-naam">Naam</label><input type="text" id="a-naam" name="naam" autocomplete="name"></div>
          <div class="veld"><label for="a-email">E-mailadres</label><input type="email" id="a-email" name="email" autocomplete="email"></div>
          <div class="veld"><label for="a-tel">Telefoonnummer <small>(niet verplicht)</small></label><input type="tel" id="a-tel" name="telefoon" autocomplete="tel"></div>
          <div class="veld"><label for="a-aantal">Met hoeveel personen?</label><select id="a-aantal" name="aantal">${[1, 2, 3, 4, 5, 6].map(n => `<option>${n}</option>`).join("")}</select></div>
          <div class="veld breed"><label for="a-ber">Vraag of onderwerp dat u wilt bespreken <small>(niet verplicht)</small></label><textarea id="a-ber" name="bericht" maxlength="1500"></textarea></div></div>
        ${akkoordVeld()}<button class="knop groen" type="submit">Meld mij aan</button><p class="uitslag" hidden></p></form>
      <div><h2>${DAG[x.wd][0].toUpperCase() + DAG[x.wd].slice(1)} ${x.d} ${MAAND[x.m]}</h2>
        <ul class="voordelen"><li>${a.tijd ? esc(a.tijd) + " uur" : "Tijd volgt"}</li><li>${esc(a.plek || "")}${a.stadsdeel ? ", " + esc(a.stadsdeel) : ""}</li>${a.samenvatting ? `<li>${esc(a.samenvatting)}</li>` : ""}</ul>
        <p class="melding" style="margin-top:22px">Aanmelden helpt ons met koffie en stoelen. Zonder aanmelden bent u ook welkom.</p>
        <p style="margin-top:14px"><button class="knop lijn klein" type="button" id="ics">Zet in mijn agenda</button></p></div>
    </div></section>`;
  }
  const sd = stap === "stadsdeel" ? decodeURIComponent(id || "") : "";
  const lijst = ag.filter(a => !sd || a.stadsdeel === sd);
  return paginaKop("Agenda", "Spreekuren, wijkschouwen en bijeenkomsten. Loop gerust binnen, of meld u aan.") + `
    <section><div class="wrap">
      <div class="filterrij"><div class="veld"><label for="ag-sd">Stadsdeel</label><select id="ag-sd"><option value="">Alle stadsdelen</option>${STADSDELEN.map(x => `<option${x === sd ? " selected" : ""}>${x}</option>`).join("")}</select></div>
        <p class="teller">${lijst.length} ${lijst.length === 1 ? "afspraak" : "afspraken"}</p></div>
      ${lijst.length ? `<ol class="agenda-lijst">${lijst.map(agendaItem).join("")}</ol>` : `<p class="leeg">Er staat nu niets op de agenda${sd ? " in " + esc(sd) : ""}.</p>`}
      <p class="melding" style="margin-top:28px">Staat er niets bij u in de buurt? <a href="#contact/spreekuur">Vraag een spreekuur aan in uw stadsdeel</a>.</p></div></section>`;
};
pagina.agenda.na = async ([stap, id]) => {
  const ag = await agenda();
  if (stap !== "aanmelden") {
    $("#ag-sd").addEventListener("change", e => gaNaar("agenda" + (e.target.value ? "/stadsdeel/" + encodeURIComponent(e.target.value) : "")));
    return;
  }
  const a = ag.find(x => String(x.id) === decodeURIComponent(id || ""));
  if (!a) return;
  $("#ics").addEventListener("click", () => icsDownload(a));
  koppelFormulier($("#form"), {
    soort: "aanmelding",
    eisen: () => ({ naam: verplicht("Vul uw naam in."), email: v => !v ? "Vul uw e-mailadres in, dan sturen we een bevestiging." : EMAIL.test(v) ? "" : "Dit e-mailadres klopt niet.", akkoord: v => v ? "" : "Vink dit aan, zodat we u kunnen laten weten als er iets verandert." }),
    bedankt: () => `U bent aangemeld voor ${a.titel}. Tot ${DAG[dt(a.datum).wd]}!`,
    na: (d, uit) => { uit.insertAdjacentHTML("afterend", `<div class="deel-na"><button class="knop groen" type="button" id="ics2">Zet in mijn agenda</button></div>`); $("#ics2").addEventListener("click", () => icsDownload(a)); },
  });
};
// agendabestand (.ics) voor de eigen agenda
function icsDownload(a) {
  const d = a.datum.replace(/-/g, ""), t = (a.tijd || "").replace(/[.:]/, "");
  const eind = t ? String(Math.min(2359, Number(t) + 100)).padStart(4, "0") : "";
  const regels = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Hart voor Den Haag//Agenda//NL", "BEGIN:VEVENT",
    `UID:${a.id}-${d}@hartvoordenhaag.nl`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    t ? `DTSTART:${d}T${t}00` : `DTSTART;VALUE=DATE:${d}`, t ? `DTEND:${d}T${eind}00` : "",
    `SUMMARY:${(a.titel || "").replace(/[,;]/g, "\\$&")}`, `LOCATION:${[a.plek, a.stadsdeel, "Den Haag"].filter(Boolean).join(" ").replace(/[,;]/g, "\\$&")}`,
    "END:VEVENT", "END:VCALENDAR"].filter(Boolean);
  const url = URL.createObjectURL(new Blob([regels.join("\r\n")], { type: "text/calendar" }));
  const l = document.createElement("a"); l.href = url; l.download = slug(a.titel).slice(0, 40) + ".ics"; document.body.appendChild(l); l.click(); l.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

pagina.vacatures = async ([id]) => {
  if (id) return detail("vacature", decodeURIComponent(id), "Vacatures", "vacatures");
  const v = await soort("vacature");
  return paginaKop("Vacatures", "Werken of vrijwilligen voor de grootste lokale partij van Den Haag.") + `
    <section class="wit"><div class="wrap">${v.length ? `<ul class="stukken">${v.map(x => stukItem(x)).join("")}</ul>` : `<p class="leeg">Er staan nu geen vacatures open. Wilt u toch helpen? Meld u aan als vrijwilliger of wijkvertegenwoordiger.</p><p style="margin-top:18px"><a class="knop groen" href="#doe-mee">Ik doe mee</a></p>`}</div></section>`;
};
pagina.vacatures.na = ([id]) => id && detail.na();

const TAKEN = ["Folders bezorgen in mijn buurt", "Aanbellen en gesprekken voeren", "Bellen met leden en kiezers", "Online delen en reageren", "Een raamposter ophangen", "Een tuinbord plaatsen", "Helpen bij bijeenkomsten en spreekuren", "Meldingen uit mijn buurt doorgeven"];
pagina["doe-mee"] = async () => paginaKop("Doe mee en maak uw buurt beter", "Den Haag wordt beter als u meedoet. Kies wat bij u past: een uur per maand helpt al.") + `
  <section><div class="wrap formulier-raster">
    <form class="formulier" id="form" novalidate>
      <fieldset><legend>Wat wilt u doen? <small>(kies er een of meer)</small></legend><div class="taken" id="taken">
        ${TAKEN.map((t, i) => `<label class="taak"><input type="checkbox" class="taak-vink" value="${esc(t)}" id="t${i}"><span>${esc(t)}</span></label>`).join("")}</div>
        <input type="hidden" name="takenlijst" id="takenlijst"></fieldset>
      <fieldset><legend>Hoeveel tijd heeft u?</legend><div class="keuzes kort">
        <div class="keuze"><input type="radio" name="beschikbaar" id="tijd1" value="Af en toe" checked><label for="tijd1"><b>Af en toe</b></label></div>
        <div class="keuze"><input type="radio" name="beschikbaar" id="tijd2" value="Een paar uur per maand"><label for="tijd2"><b>Een paar uur per maand</b></label></div>
        <div class="keuze"><input type="radio" name="beschikbaar" id="tijd3" value="Elke week"><label for="tijd3"><b>Elke week</b></label></div>
        <div class="keuze"><input type="radio" name="beschikbaar" id="tijd4" value="Alleen in campagnetijd"><label for="tijd4"><b>Alleen in campagnetijd</b></label></div></div></fieldset>
      <div class="velden">
        <div class="veld"><label for="f-naam">Naam</label><input type="text" id="f-naam" name="naam" autocomplete="name"></div>
        <div class="veld"><label for="f-tel">Telefoonnummer</label><input type="tel" id="f-tel" name="telefoon" autocomplete="tel"></div>
        <div class="veld"><label for="f-email">E-mailadres</label><input type="email" id="f-email" name="email" autocomplete="email"></div>
        <div class="veld"><label for="f-sd">Ik woon in stadsdeel</label><select id="f-sd" name="stadsdeel">${stadsdeelOpties()}</select></div>
        <div class="veld breed"><label for="f-ber">Iets wat we moeten weten? <small>(niet verplicht)</small></label><textarea id="f-ber" name="bericht" maxlength="1500"></textarea></div></div>
      ${akkoordVeld()}<button class="knop groen" type="submit">Ik doe mee</button><p class="uitslag" hidden></p></form>
    <div><h2>Zo werkt het</h2><ol class="uitleg" style="grid-template-columns:1fr;margin-top:22px">
      <li><b>Meld u aan</b><span>Vink aan wat u wilt doen. Dat duurt een minuut.</span></li>
      <li><b>Kennismaken</b><span>Iemand uit uw stadsdeel belt of mailt u voor een eerste gesprek.</span></li>
      <li><b>Aan de slag</b><span>U helpt in uw eigen buurt, op momenten die u uitkomen.</span></li></ol>
      <p class="melding" style="margin-top:8px">Liever eerst bellen? <a href="${TEL_LINK}">${TEL}</a>. Of volg ons <a href="${WA_KANAAL}" target="_blank" rel="noopener">WhatsApp-kanaal</a> voor acties bij u in de buurt.</p></div>
  </div></section>`;
pagina["doe-mee"].na = () => {
  const f = $("#form");
  const zetTaken = () => { $("#takenlijst").value = $$(".taak-vink:checked", f).map(x => x.value).join(", "); if ($("#takenlijst").value) zetFout($("#takenlijst"), ""); };
  f.addEventListener("change", zetTaken); f.addEventListener("submit", zetTaken, true);
  koppelFormulier(f, {
    soort: "doemee",
    eisen: () => ({ takenlijst: v => v ? "" : "Kies minstens één ding dat u wilt doen.", naam: verplicht("Vul uw naam in."), email: mailOfTel, stadsdeel: verplicht("Kies uw stadsdeel, dan zoeken we iemand bij u in de buurt."), akkoord: v => v ? "" : "Vink dit aan, zodat we contact mogen opnemen." }),
    voor: () => ({ rol: "Vrijwilliger" }),
    bedankt: d => `Dank u wel! Iemand uit ${d.stadsdeel || "uw stadsdeel"} neemt binnenkort contact met u op.`,
  });
};

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

// lid worden in drie stappen; betalen loopt straks via Mollie (eerste keer iDEAL, daarna incasso)
const euro = n => Number(n) % 1 ? Number(n).toFixed(2).replace(".", ",") : String(n);
const LID = { silver: ["Silvermember", 12.5], gold: ["Goldmember", 25], ouder: ["Ouderenlid, vanaf 65", 6.7], jong: ["Jongeren voor Den Haag", 12.5] };
pagina.lid = async () => paginaKop("Word lid", "Met meer leden zijn we sterker. Als lid praat u mee en kiest u mee over bestuur en kandidaat-raadsleden.") + `
  <section><div class="wrap formulier-raster">
    <form class="formulier stappen" id="form" novalidate>
      <ol class="stappenbalk" aria-label="Voortgang"><li aria-current="step">Keuze</li><li>Gegevens</li><li>Betalen</li></ol>
      <fieldset class="stap" data-stap="1"><legend>Kies uw lidmaatschap</legend><div class="keuzes">
        ${Object.entries(LID).map(([k, v], i) => `<div class="keuze"><input type="radio" name="soort" id="s${i}" value="${k}"${i === 0 ? " checked" : ""}><label for="s${i}"><b>${v[0]}</b><span>${k === "ouder" ? "€ 6,70 het eerste jaar, daarna € 12,50" : k === "jong" ? "€ 12,50 of € 25 per jaar" : "€ " + euro(v[1]) + " per jaar"}</span></label></div>`).join("")}</div>
        <button class="knop groen" type="button" data-naar="2">Volgende: uw gegevens</button></fieldset>
      <fieldset class="stap" data-stap="2" hidden><legend>Uw gegevens</legend>
        <div class="velden">
          <div class="veld"><label for="l-naam">Naam</label><input type="text" id="l-naam" name="naam" autocomplete="name"></div>
          <div class="veld"><label for="l-email">E-mailadres</label><input type="email" id="l-email" name="email" autocomplete="email"></div>
          <div class="veld"><label for="l-pc">Postcode</label><input type="text" id="l-pc" name="postcode" autocomplete="postal-code"></div>
          <div class="veld"><label for="l-nr">Huisnummer</label><input type="text" id="l-nr" name="huisnummer"></div>
          <div class="veld"><label for="l-sd">Stadsdeel</label><select id="l-sd" name="stadsdeel">${stadsdeelOpties()}</select><small id="l-sd-hint"></small></div>
          <div class="veld"><label for="l-tel">Telefoonnummer <small>(niet verplicht)</small></label><input type="tel" id="l-tel" name="telefoon" autocomplete="tel"></div></div>
        <fieldset><legend>Wilt u ook actief worden?</legend><div class="keuzes kort">
          <div class="keuze"><input type="radio" name="actief" id="ac1" value="ja" checked><label for="ac1"><b>Ja, graag</b></label></div>
          <div class="keuze"><input type="radio" name="actief" id="ac2" value="later"><label for="ac2"><b>Misschien later</b></label></div>
          <div class="keuze"><input type="radio" name="actief" id="ac3" value="nee"><label for="ac3"><b>Nee, alleen lid</b></label></div></div></fieldset>
        <div class="velden">
          <div class="veld"><label for="l-door">Wie bracht u aan? <small>(niet verplicht)</small></label><input type="text" id="l-door" name="aangebracht"></div>
          <div class="veld"><label for="l-waarom">Waarom wordt u lid? <small>(niet verplicht)</small></label><input type="text" id="l-waarom" name="waarom" maxlength="200"></div></div>
        <div class="knoppen"><button class="knop lijn" type="button" data-naar="1">Terug</button><button class="knop groen" type="button" data-naar="3">Volgende: betalen</button></div></fieldset>
      <fieldset class="stap" data-stap="3" hidden><legend>Hoe wilt u betalen?</legend><div class="keuzes">
        <div class="keuze"><input type="radio" name="betaal" id="b1" value="incasso" checked><label for="b1"><b>Automatisch elk jaar</b><span>Eerste keer met iDEAL, daarna incasso</span></label></div>
        <div class="keuze"><input type="radio" name="betaal" id="b2" value="ideal"><label for="b2"><b>Elk jaar zelf</b><span>U krijgt een betaalverzoek</span></label></div></div>
        <p class="overzicht" id="overzicht"></p>
        <div class="knoppen"><button class="knop lijn" type="button" data-naar="2">Terug</button><button class="knop geel" type="submit" id="lid-knop">Betaal met iDEAL</button></div>
        <p class="uitslag" hidden></p></fieldset>
    </form>
    <div><h2>Wat u krijgt</h2><ul class="voordelen">
      <li>Een stem op de Algemene Ledenvergadering.</li>
      <li>Mee beslissen over het bestuur en de kandidaat-raadsleden.</li>
      <li>Een uitnodiging voor al onze (leden)evenementen.</li>
      <li>Het speldje met de groen-gele hartjes, als welkomstcadeau.</li></ul>
      <p class="leeg" style="margin-top:20px">Uw aanmelding gaat rechtstreeks naar de ledenadministratie; de website bewaart geen ledengegevens. Bij opzeggen krijgt u geen geld terug; u blijft lid tot het einde van de betaalde periode. Vragen? <a href="#contact/lidmaatschap">Stel ze hier</a>.</p></div>
  </div></section>`;
pagina.lid.na = () => {
  const f = $("#form");
  const naar = n => {
    $$(".stap", f).forEach(x => x.hidden = x.dataset.stap !== String(n));
    $$(".stappenbalk li", f).forEach((li, i) => i + 1 === n ? li.setAttribute("aria-current", "step") : li.removeAttribute("aria-current"));
    $$(".stappenbalk li", f).forEach((li, i) => li.classList.toggle("klaar", i + 1 < n));
    const leg = $(`.stap[data-stap="${n}"] legend`, f); if (leg) { leg.tabIndex = -1; leg.focus(); }
    if (n === 3) { const [naam, bedrag] = LID[f.soort.value]; $("#overzicht").innerHTML = `<b>${naam}</b>, € ${euro(bedrag)} ${f.betaal.value === "incasso" ? "per jaar, automatisch" : "dit jaar"}.`; $("#lid-knop").textContent = `Betaal € ${euro(bedrag)} met iDEAL`; }
  };
  f.addEventListener("input", e => { if (e.target.getAttribute("aria-invalid")) zetFout(e.target, ""); });
  f.addEventListener("change", () => { if (!$(".stap[data-stap='3']", f).hidden) naar(3); });
  const eisen2 = { naam: verplicht("Vul uw naam in."), email: v => EMAIL.test(v) ? "" : "Vul een geldig e-mailadres in.", postcode: v => /^\d{4}\s?[a-z]{2}$/i.test(v) ? "" : "Vul uw postcode in, bijvoorbeeld 2511 BT.", huisnummer: verplicht("Vul uw huisnummer in.") };
  $$("[data-naar]", f).forEach(b => b.addEventListener("click", () => { const n = Number(b.dataset.naar); if (n === 3 && !controleer(f, eisen2)) return; naar(n); }));
  // postcode vult het stadsdeel vanzelf in
  $("#l-pc").addEventListener("change", async e => {
    const pc = e.target.value.replace(/\s+/g, "").toUpperCase(); if (!/^\d{4}[A-Z]{2}$/.test(pc)) return;
    const sd = await stadsdeelVanPostcode(pc); if (sd && !$("#l-sd").value) { $("#l-sd").value = sd; $("#l-sd-hint").textContent = "Ingevuld op basis van uw postcode."; }
  });
  f.addEventListener("submit", e => {
    e.preventDefault();
    const stap = Number($(".stap:not([hidden])", f).dataset.stap);
    if (stap === 1) return naar(2);
    if (stap === 2) { if (controleer(f, eisen2)) naar(3); return; }
    if (!controleer(f, eisen2)) return naar(2);
    betaal(f, "lid", { lid: f.soort.value, betaal: f.betaal.value });
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
      <button class="knop geel" type="submit" id="doneer-knop">Doneer € 25 met iDEAL</button><p class="uitslag" hidden></p></form>
    <div><h2>Waar uw geld heen gaat</h2><ul class="voordelen">
      <li>Schouwen, bewonersavonden en spreekuren in alle acht stadsdelen.</li>
      <li>Het ombudsteam, zodat meldingen van bewoners snel worden opgepakt.</li>
      <li>Posters, flyers en filmpjes voor de campagne.</li></ul>
      <p class="melding" style="margin-top:22px">Maandelijks geven gaat zo: de eerste keer betaalt u met iDEAL, daarna schrijven we het bedrag elke maand af. Stoppen kan altijd met één mail.</p>
      <p class="leeg" style="margin-top:14px">Giften aan politieke partijen vallen onder regels voor openheid. Daarom vragen we altijd uw naam en woonplaats. Anonieme giften nemen we niet aan.</p></div>
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
    betaal(f, "doneren", { bedrag: bedrag(), maandelijks: f.vaak.value === "maandelijks" });
  });
};

// Betalen via de achterkant. Staat de Mollie-sleutel er nog niet, dan zegt de achterkant "demo" en tonen we dat eerlijk.
async function betaal(f, soortBetaling, extra) {
  const uit = $(".uitslag", f), knop = $("button[type=submit]", f), label = knop.textContent;
  const data = Object.fromEntries(new FormData(f).entries());
  knop.disabled = true; knop.textContent = "Even geduld…";
  try {
    const r = await fetch(API + "/betaling", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ soort: soortBetaling, naam: data.naam, email: data.email, plaats: data.plaats || "", ...extra }) });
    const d = await r.json().catch(() => ({}));
    if (d.ok && d.checkout) { location.href = d.checkout; return; }
    if (d.ok && d.demo) toon(uit, "Dit is een proef: er is niets betaald. Zodra de partij Mollie heeft gekoppeld, gaat u hier naar iDEAL.");
    else toon(uit, (d.fout || "Betalen lukte nu niet.") + ` Probeer het zo nog eens, of bel ${TEL}.`, true);
  } catch { toon(uit, `Betalen lukte nu niet. Probeer het zo nog eens, of bel ${TEL}.`, true); }
  knop.disabled = false; knop.textContent = label;
}

// postcode naar stadsdeel (PDOK locatieserver, openbaar)
async function stadsdeelVanPostcode(pc) {
  try {
    const r = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=postcode:${pc}&fq=type:adres&fl=wijknaam,gemeentenaam&rows=1`);
    const doc = (await r.json()).response.docs[0];
    if (!doc || !/gravenhage/i.test(doc.gemeentenaam || "")) return "";
    const wijk = String(doc.wijknaam || "").replace(/^Wijk \d+\s*/, "");
    const k = await laad("kaart");
    return Object.keys(k.sd).find(n => (k.sd[n].wijken || []).includes(wijk)) || "";
  } catch { return ""; }
}

pagina.zoeken = async ([term = ""]) => {
  term = decodeURIComponent(term);
  const [idx, nieuw] = await Promise.all([laad("zoekindex"), eigen()]);
  const woorden = term.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const alles = [...nieuw.map(i => ({ id: i.id, s: i.soort, t: i.titel, d: i.datum, x: i.samenvatting, sd: i.stadsdelen })), ...idx];
  const treffers = woorden.length ? alles.map(i => {
    const t = i.t.toLowerCase(), x = (i.x || "").toLowerCase() + " " + (i.sd || []).join(" ").toLowerCase();
    if (!woorden.every(w => t.includes(w) || x.includes(w))) return null;
    return { ...i, score: woorden.reduce((s, w) => s + (t.includes(w) ? 5 : 1), 0) };
  }).filter(Boolean).sort((a, b) => b.score - a.score || b.d.localeCompare(a.d)) : [];
  const totaalTreffers = treffers.length; treffers.splice(60);
  // markeren op platte tekst, daarna pas escapen
  const licht = s => {
    const re = new RegExp("(" + woorden.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
    return woorden.length ? String(s).split(re).map((deel, i) => i % 2 ? `<mark>${esc(deel)}</mark>` : esc(deel)).join("") : esc(s);
  };
  const knipsel = x => { const l = (x || "").toLowerCase(); const p = Math.max(0, l.indexOf(woorden[0] || "") - 60); const k = x.slice(p, p + 220); return (p ? "…" : "") + k.slice(0, k.lastIndexOf(" ") > 150 ? k.lastIndexOf(" ") : k.length) + "…"; };
  return paginaKop("Zoeken", term ? `${fmt.format(totaalTreffers)} ${totaalTreffers === 1 ? "resultaat" : "resultaten"} voor "${esc(term)}"${totaalTreffers > 60 ? ", de 60 beste staan hieronder" : ""}` : "Zoek in al het nieuws, de successen, het raadswerk en de petities sinds 2012.") + `
    <section class="wit"><div class="wrap">
      <form id="zoek2" role="search" style="display:flex;gap:10px;max-width:720px;margin-bottom:28px"><label class="verborgen" for="zoek2-veld">Zoekterm</label><input type="search" id="zoek2-veld" value="${esc(term)}" placeholder="Bijvoorbeeld Moerwijk, parkeren of Kwartellaan"><button class="knop groen klein" type="submit">Zoeken</button></form>
      ${term && !treffers.length ? `<p class="leeg">Niets gevonden. Probeer een ander woord, of zoek op een straat of wijk.</p>` : ""}
      <ul class="stukken zoek-treffer">${treffers.map(i => `<li><h3><a href="#${SOORT[i.s].pad}/${encodeURIComponent(i.id)}">${licht(i.t)}</a></h3><p class="bijschrift">${i.sd && i.sd.length ? `<span class="plek">${esc(i.sd.join(" en "))}</span>` : ""}<span>${esc(SOORT[i.s].naam)}</span><time>${datum(i.d)}</time></p><p class="sam">${licht(knipsel(i.x || ""))}</p></li>`).join("")}</ul>
    </div></section>`;
};
pagina.zoeken.na = () => $("#zoek2").addEventListener("submit", e => { e.preventDefault(); const t = $("#zoek2-veld").value.trim(); if (t) gaNaar("zoeken/" + encodeURIComponent(t)); });

pagina.bedankt = async ([soortBetaling]) => paginaKop("Dank u wel!", soortBetaling === "lid" ? "Welkom bij Hart voor Den Haag. U krijgt een bevestiging per mail zodra de betaling rond is." : "Uw steun komt goed terecht. U krijgt een bevestiging per mail zodra de betaling rond is.") + `
  <section><div class="wrap"><p class="melding">Ging er iets mis bij het betalen? Dan is er niets afgeschreven. Probeer het opnieuw of bel <a href="${TEL_LINK}">${TEL}</a>.</p>
  <div class="knoppen" style="margin-top:22px"><a class="knop groen" href="#">Naar de voorpagina</a><a class="knop lijn" href="${WA_KANAAL}" target="_blank" rel="noopener">Volg ons WhatsApp-kanaal</a></div></div></section>`;
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
const TITELS = { nieuws: "Nieuws", successen: "Successen", raadswerk: "Raadswerk", petities: "Petities", standpunten: "Standpunten", fractie: "Onze mensen", wethouders: "Wethouders", bestuur: "Bestuur", agenda: "Agenda", vacatures: "Vacatures", "doe-mee": "Doe mee", contact: "Contact", lid: "Word lid", doneren: "Doneren", zoeken: "Zoeken", bedankt: "Dank u wel", stadsdelen: "Uw stadsdeel", privacy: "Privacy", toegankelijkheid: "Toegankelijkheid" };
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
    telOp(); const zw = $("#zweef"); if (zw && zw.volg) zw.volg();
  } catch (e) {
    console.error(e);
    app.innerHTML = paginaKop("Er ging iets mis", "Laad de pagina opnieuw. Lukt het niet? Bel " + TEL + ".");
  }
  laad("kaart").then(k => $$(".kop-lijnen").forEach(svg => { const plek = svg.dataset.plek, bb = plek && k.sd[plek] && k.sd[plek].bb;
    // gaat het stuk over één stadsdeel, dan zoomt de kaart in op dat stadsdeel en kleurt het in
    if (bb) { const m = Math.max(bb[2], bb[3] * 1.25) * 1.9, cx = bb[0] + bb[2] / 2, cy = bb[1] + bb[3] / 2; svg.setAttribute("viewBox", `${(cx - m / 2).toFixed(1)} ${(cy - m * .4).toFixed(1)} ${m.toFixed(1)} ${(m * .8).toFixed(1)}`); }
    else svg.setAttribute("viewBox", `0 0 ${k.w} ${k.h}`); svg.innerHTML = Object.entries(k.sd).sort(([n]) => n === plek ? 1 : -1).map(([n, x]) => `<path d="${x.d}"${n === plek ? ' class="aan"' : ""}/>`).join(""); }));
  const sectie = naam;
  $$(".menu a[data-sectie], .onderbalk [data-sectie]").forEach(a => a.dataset.sectie.split(" ").includes(sectie) ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  const meld = $(".onderbalk a.meld"); if (meld) location.hash.startsWith("#contact/melding") ? meld.setAttribute("aria-current", "page") : meld.removeAttribute("aria-current");
  const contact = $(".onderbalk [data-sectie='contact']:not(.meld)"); if (contact && location.hash.startsWith("#contact/melding")) contact.removeAttribute("aria-current");
  $$(".menu button[data-sectie]").forEach(b => b.classList.toggle("actief", b.dataset.sectie.split(" ").includes(sectie)));
  // lade en uitklapmenu's: de langste link die bij het huidige adres past, is de huidige pagina
  const h = (location.hash || "#").replace(/^#raadswerk\/(vraag|amendement|spreektekst|motie)(?=\/)/, (m, t) => "#raadswerk/" + ({ vraag: "vragen", amendement: "amendementen", spreektekst: "spreekteksten", motie: "moties" })[t]).replace(/^#raadswerk\/moties(?=\/|$)/, "#raadswerk");
  const passend = $$("#lade .lade-links a[href^='#'], #lade a.hoofd[href^='#'], .uitklap-paneel a[href^='#']").filter(a => { const r = a.getAttribute("href"); return h === r || h.startsWith(r + "/"); });
  const langst = Math.max(0, ...passend.map(a => a.getAttribute("href").length));
  $$("#lade .lade-links a, #lade a.hoofd, .uitklap-paneel a").forEach(a => passend.includes(a) && a.getAttribute("href").length === langst ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
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

// cijfers tellen op zodra ze in beeld komen (niet bij "minder beweging")
const stil = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function telOp() {
  const plat = $$("[data-tel]"), zet = (el, n) => { (el.querySelector(".getal") || el).textContent = fmt.format(n); };
  if (stil() || !("IntersectionObserver" in window)) { plat.forEach(el => zet(el, Number(el.dataset.tel))); return; }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    const el = e.target, doel = Number(el.dataset.tel);
    if (el.dataset.van != null) {
      // van 7 naar 8: het oude getal staat er even, dan tikt het succes erbij
      zet(el, Number(el.dataset.van));
      setTimeout(() => {
        zet(el, doel); el.classList.remove("tik"); void el.offsetWidth; el.classList.add("tik");
        const plus = document.createElement("span"); plus.className = "plus-een"; plus.setAttribute("aria-hidden", "true"); plus.textContent = "+" + (doel - Number(el.dataset.van));
        el.append(plus); setTimeout(() => plus.remove(), 1800);
      }, 700);
      return;
    }
    const t0 = performance.now(), duur = 1600;
    const stap = t => { const p = Math.min(1, (t - t0) / duur); zet(el, Math.round(doel * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(stap); };
    zet(el, 0); requestAnimationFrame(stap);
  }), { threshold: .6 });
  plat.forEach(el => io.observe(el));
}
// Word lid in de kop springt even, kort na het laden en daarna eens per halve minuut
(() => { const k = $(".balk-lid"); if (!k) return; const spring = () => { if (stil() || document.hidden) return; k.classList.remove("spring"); void k.offsetWidth; k.classList.add("spring"); };
  setTimeout(spring, 2500); setInterval(spring, 30000); k.addEventListener("animationend", () => k.classList.remove("spring")); })();
// zwevende knop "Doe mee en volg ons", zoals op de huidige site: komt na een tel in beeld,
// gaat even opzij als de voet of de filmknop eronder ligt, en het tekstballonnetje is weg te klikken
(() => { const z = $("#zweef"); if (!z) return; const rij = z.querySelector(".ballon-rij");
  if (opslag.sLees("zweef-dicht")) rij.hidden = true;
  z.querySelector(".sluit").addEventListener("click", () => { rij.hidden = true; opslag.sZet("zweef-dicht", "1"); z.querySelector(".rond").focus(); });
  // opzij als de knop over de filmknop of de voet zou vallen
  const raakt = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  let wacht = false;
  const kijk = () => { wacht = false; const r = z.getBoundingClientRect(); z.classList.toggle("opzij", $$(".voet, #speel").some(el => raakt(r, el.getBoundingClientRect()))); };
  z.volg = () => { if (!wacht) { wacht = true; requestAnimationFrame(kijk); } };
  addEventListener("scroll", z.volg, { passive: true }); addEventListener("resize", z.volg); z.volg();
  setTimeout(() => { z.classList.remove("weg"); if (!stil() && !rij.hidden) { rij.classList.add("hop"); rij.addEventListener("animationend", () => rij.classList.remove("hop"), { once: true }); } }, 1200);
  setTimeout(() => setInterval(() => { if (stil() || document.hidden || rij.hidden) return; rij.classList.remove("hop"); void rij.offsetWidth; rij.classList.add("hop"); }, 30000), 15000);
})();
// datumregel: de datum van vandaag, zoals bovenaan een krant
(() => { const d = new Date(), t = $("#vandaag"); if (t) { t.dateTime = d.toISOString().slice(0, 10); t.textContent = `${DAG[d.getDay()][0].toUpperCase() + DAG[d.getDay()].slice(1)} ${d.getDate()} ${MAAND[d.getMonth()]} ${d.getFullYear()}`; } })();
// vertalen: de pagina opent via Google Vertalen in de gekozen taal (alleen als de bezoeker erop klikt)
function zetVertaallinks() {
  const k = $("#taal");
  if (k && !k.dataset.klaar) {
    k.dataset.klaar = "1";
    k.addEventListener("change", () => {
      const t = k.value; if (!t) return;
      open(`https://damienzeller-nl.translate.goog/proef/?_x_tr_sl=nl&_x_tr_tl=${t}&_x_tr_hl=${t}${location.hash}`, "_blank", "noopener");
      k.value = "";
    });
  }
  // voet: op de telefoon de linkgroepen dicht, op een groter scherm altijd open
  const smal = matchMedia("(max-width: 760px)");
  const zet = () => $$(".voet-groep").forEach(d => { d.open = !smal.matches; });
  if (!document.body.dataset.voet) { document.body.dataset.voet = "1"; zet(); smal.addEventListener("change", zet); }
}
zetVertaallinks(); addEventListener("hashchange", zetVertaallinks);
// strook: eerstvolgende afspraak
agenda().then(ag => { if (ag[0]) { const x = dt(ag[0].datum); $("#strook-spreekuur").textContent = `Agenda: ${x.d} ${MND[x.m]}, ${ag[0].plek.split(",")[0]}`; } });

// nieuwsbrief in de voet
koppelFormulier($("#nieuwsbrief"), {
  soort: "nieuwsbrief",
  eisen: () => ({ email: v => EMAIL.test(v) ? "" : "Vul een geldig e-mailadres in." }),
  bedankt: () => "Dank u wel! U bent aangemeld voor de nieuwsbrief.",
});
