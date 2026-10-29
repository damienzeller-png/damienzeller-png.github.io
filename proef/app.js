/* Proefsite Hart voor Den Haag. Elke pagina heeft een gewoon adres (/proef/nieuws/, /proef/motie/<naam>/), zodat Google
   de stukken vindt en een gedeelde link een titel en foto laat zien. Kop en voet komen uit kader.js.
   Inhoud: data/*.json (elke ochtend overgenomen van hartvoordenhaag.nl) plus wat redacteuren plaatsen via de achterkant. */
"use strict";
const BASE = (window.HVDH && HVDH.BASE) || "/proef/";
const U = (r = "") => BASE + r;
const API = "https://hvdh-proef.damienzeller.workers.dev";
const VIDEO = "https://www.hartvoordenhaag.nl/wp-content/uploads/2026/01/Hart-voor-Den-Haag.mp4";
const TEL = "06 234 621 39", TEL_LINK = "tel:+31623462139", MAIL = "hartvoordenhaag@denhaag.nl", MAIL_BESTUUR = "secretaris@hartvoordenhaag.nl";
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
// soort stuk: naam, de lijst waar het onder valt en het databestand
const SOORT = {
  nieuws: { naam: "Nieuws", lijst: "nieuws/", lijstNaam: "Nieuws", bron: "nieuws" },
  succes: { naam: "Succes", lijst: "successen/", lijstNaam: "Successen", bron: "successen" },
  motie: { naam: "Motie", lijst: "raadswerk/", lijstNaam: "Moties", bron: "moties" },
  amendement: { naam: "Amendement", lijst: "raadswerk/amendementen/", lijstNaam: "Amendementen", bron: "amendementen" },
  raadsvraag: { naam: "Schriftelijke vragen", lijst: "raadswerk/vragen/", lijstNaam: "Schriftelijke vragen", bron: "raadsvragen" },
  spreektekst: { naam: "Spreektekst", lijst: "raadswerk/spreekteksten/", lijstNaam: "Spreekteksten", bron: "spreekteksten" },
  petitie: { naam: "Petitie", lijst: "petities/", lijstNaam: "Petities", bron: "petities" },
  vacature: { naam: "Vacature", lijst: "vacatures/", lijstNaam: "Vacatures" },
  agenda: { naam: "Agenda", lijst: "agenda/", lijstNaam: "Agenda" },
};
const PROGRAMMA = "https://www.hartvoordenhaag.nl/wp-content/uploads/2026/01/EnNuAanDeSlag_Hart_voor_Den_Haag_V1.pdf";
const WA_KANAAL = "https://whatsapp.com/channel/0029VaD3yaZGE56qCyallu3r";
const PIJL = '<svg class="pijl" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
const UIT = '<svg class="pijl" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3 4 12"/></svg>';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const dt = iso => { const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number); return { d, m: m - 1, y, wd: new Date(y, m - 1, d).getDay() }; };
const datum = iso => { const x = dt(iso); return `${x.d} ${MAAND[x.m]}${x.y !== new Date().getFullYear() ? " " + x.y : ""}`; };
const datumVol = iso => { const x = dt(iso); return `${x.d} ${MAAND[x.m]} ${x.y}`; };
const vandaag = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const initialen = n => n.split(" ").filter(w => /^[A-ZÀ-Ý]/.test(w)).map(w => w[0]).slice(0, 2).join("");
const fmt = new Intl.NumberFormat("nl-NL");
const fmtEuro = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const euro = n => Number(n) % 1 ? fmtEuro.format(Number(n)) : fmt.format(Number(n));
const opslag = {
  lees(k) { try { return localStorage.getItem(k); } catch { return null; } },
  zet(k, v) { try { localStorage.setItem(k, v); } catch { /* geen opslag */ } },
  weg(k) { try { localStorage.removeItem(k); } catch { /* geen opslag */ } },
  sLees(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  sZet(k, v) { try { sessionStorage.setItem(k, v); } catch { /* geen opslag */ } },
  sWeg(k) { try { sessionStorage.removeItem(k); } catch { /* geen opslag */ } },
};
const stil = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const smal = () => matchMedia("(max-width: 760px)").matches;
const sdVanSlug = s => STADSDELEN.find(n => slug(n) === slug(s || "")) || "";
const kaleTitel = p => String(p.titel || "").replace(/^petitie:\s*/i, "").replace(/^./, c => c.toUpperCase());

// ---------- gegevens ----------
const cache = {};
// Aanpassingen uit de beheeromgeving op overgenomen berichten: andere titel, stadsdeel, tekst, foto, of verborgen.
// De dagelijkse import van hartvoordenhaag.nl overschrijft ze niet, want ze liggen apart bij de achterkant.
const MET_AANPASSING = new Set(["nieuws", "successen", "moties", "amendementen", "raadsvragen", "spreekteksten", "petities", "agenda", "zoekindex"]);
const VELDEN = ["titel", "samenvatting", "html", "onderwerpen", "datum", "indiener", "status", "tijd", "plek", "einddatum", "doel", "afloop", "alt"];
let aanpBelofte = null;
function aanpassingen() {
  if (!aanpBelofte) {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 3500);
    aanpBelofte = fetch(API + "/aanpassingen", { signal: ctrl.signal }).then(r => r.ok ? r.json() : {}).then(d => d.aanpassingen || {}).catch(() => ({}));
  }
  return aanpBelofte;
}
const isVast = x => !!x.vast && (!x.bovenaanTot || x.bovenaanTot >= vandaag());
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
      for (const k of VELDEN) if (p[k] != null) y[k] = p[k];
      if (p.stadsdelen) { if (naam === "agenda") y.stadsdeel = p.stadsdelen[0] || ""; else y.stadsdelen = p.stadsdelen; }
      if (p.foto) { y.beeld = `${API}/foto/${p.foto}`; delete y.beeld_klein; } else if (p.beeldWeg) { y.beeld = ""; delete y.beeld_klein; }
      if (p.vast) { y.vast = true; if (p.bovenaanTot) y.bovenaanTot = p.bovenaanTot; }
      if (y.stadsdelen && p.stadsdelen) y.geraden = false;
    }
    uit.push(y);
  }
  return uit;
}
function laad(naam) {
  if (!cache[naam]) {
    const bestand = fetch(U(`data/${naam}.json`)).then(r => r.ok ? r.json() : []).catch(() => []);
    cache[naam] = MET_AANPASSING.has(naam) || naam.startsWith("lijst/") ? Promise.all([bestand, aanpassingen()]).then(([d, a]) => pasAan(naam, d, a)) : bestand;
  }
  return cache[naam];
}
// één stuk met de volledige tekst (data/stuk/<id>.json), pas geladen als iemand het opent
function stuk(id) {
  const k = "stuk/" + id;
  if (!cache[k]) cache[k] = Promise.all([fetch(U(`data/stuk/${encodeURIComponent(id)}.json`)).then(r => r.ok ? r.json() : null).catch(() => null), aanpassingen()])
    .then(([d, a]) => d ? (pasAan("stuk", [d], a)[0] || null) : null);
  return cache[k];
}
// het hele archief van één soort: eerst het recente werk, ouder werk jaar voor jaar zodra iemand verder wil
function stroom(s) {
  const st = { items: [], ids: new Set(), klaar: true, totaal: 0, opgehaald: "" };
  let jaren = [];
  st.start = async () => {
    const [r, info] = await Promise.all([soort(s), laad("archief")]);
    r.forEach(i => { st.ids.add(i.id); st.items.push(i); });
    const inf = info && info.soorten && info.soorten[s];
    jaren = inf ? Object.keys(inf.jaren).sort().reverse() : [];
    st.totaal = inf ? inf.totaal + r.filter(i => i.eigen).length : r.length;
    st.klaar = !inf || inf.recent >= inf.totaal;
    st.opgehaald = (info && info.opgehaald) || "";
    return st;
  };
  st.ouder = async () => {
    if (st.klaar) return false;
    const extra = await laad(`lijst/${SOORT[s].bron}-${jaren.shift()}`);
    for (const i of extra) if (!st.ids.has(i.id)) { st.ids.add(i.id); st.items.push(i); }
    st.items.sort(opVolgorde);
    if (!jaren.length) st.klaar = true;
    return true;
  };
  return st;
}
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
        html, beeld: i.foto ? `${API}/foto/${i.foto}` : "", link: i.link, alt: i.alt || "",
        stadsdelen: i.stadsdelen && i.stadsdelen.length ? i.stadsdelen : i.stadsdeel ? [i.stadsdeel] : [],
        tijd: i.tijd, plek: i.plek, eigen: true, onderwerpen: i.onderwerpen || [], vast: !!i.vast, bovenaanTot: i.bovenaanTot || "",
        einddatum: i.einddatum || "", doel: i.doel || 0, afloop: i.afloop || "",
      };
    })).catch(() => []);
  }
  return apiItems;
}
// berichten die de redactie bovenaan zette eerst, daarna op datum
const opVolgorde = (a, b) => (isVast(b) ? 1 : 0) - (isVast(a) ? 1 : 0) || b.datum.localeCompare(a.datum);
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
const PLAT = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
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
// een petitie loopt tot de einddatum die de redactie zette; zonder einddatum een jaar na plaatsen. Met een afloop is hij klaar.
const isOpen = p => { if (p.afloop) return false; if (p.einddatum) return p.einddatum >= vandaag(); return !!p.eigen || (Date.now() - new Date(p.datum)) / 864e5 < 365; };
function bijschrift(i, opties = {}) {
  const delen = [];
  if (i.stadsdelen && i.stadsdelen.length) delen.push(`<span class="plek">${silhouet(i.stadsdelen[0])}${esc(i.stadsdelen.join(" en "))}</span>`);
  if (opties.soort) delen.push(`<span>${esc(SOORT[i.soort]?.naam || i.soort)}</span>`);
  if (opties.open) delen.push(isOpen(i) ? `<span class="status">Loopt${i.einddatum ? " tot " + datum(i.einddatum) : " nog"}</span>` : `<span>Gesloten</span>`);
  if (i.indiener) delen.push(`<span>${esc(i.indiener)}</span>`);
  if (i.status) delen.push(`<span class="status">${esc(i.status)}</span>`);
  if (i.handtekeningen && !opties.zonderTelling) delen.push(`<span>${fmt.format(i.handtekeningen)} handtekeningen</span>`);
  delen.push(i.datum_geschat ? `<span title="De oude site gaf hier geen datum">datum onbekend, rond ${dt(i.datum).y}</span>` : `<time datetime="${esc(i.datum)}">${datum(i.datum)}</time>`);
  if (i.ris && opties.ris !== false) delen.push(`<span>${esc(i.ris)}</span>`);
  if (i.eigen && (Date.now() - new Date(i.datum)) / 864e5 < 14) delen.push(`<span class="nieuw">Nieuw</span>`);
  return `<p class="bijschrift">${delen.join("")}</p>`;
}
// het adres van een stuk: hetzelfde als op hartvoordenhaag.nl, of s/<id>/ voor wat de redactie hier zelf plaatst
const stukPad = i => i.p || `s/${encodeURIComponent(i.id)}/`;
const stukLink = (i, inhoud, extra = "") => `<a href="${U(stukPad(i))}" data-stuk="${esc(i.id)}"${extra}>${inhoud}</a>`;
const lijstBeeld = i => i.beeld_klein || i.beeld;
function logItem(i, eerste, opties = {}) {
  return `<li class="log-item${eerste ? " eerste" : ""}${i.beeld ? "" : " zonder-beeld"}">
    <div class="log-tekst"><h3>${stukLink(i, esc(i.titel))}</h3>${bijschrift(i, opties)}${i.samenvatting ? `<p class="sam">${esc(i.samenvatting)}</p>` : ""}<span class="lees-meer" aria-hidden="true">Lees meer ${PIJL}</span></div>
    ${i.beeld ? `<img class="log-beeld" src="${esc(eerste && !smal() ? i.beeld : lijstBeeld(i))}" alt="" loading="${eerste ? "eager" : "lazy"}" decoding="async">` : ""}</li>`;
}
function stukItem(i, opties = {}) {
  const raad = ["motie", "amendement", "raadsvraag", "spreektekst"].includes(i.soort);
  const tekst = `<h3>${stukLink(i, esc(opties.kaal ? kaleTitel(i) : i.titel))}</h3>${bijschrift(i, opties)}${i.samenvatting ? `<p class="sam">${esc(i.samenvatting)}</p>` : ""}`;
  if (!raad || opties.kaal) return `<li>${tekst}</li>`;
  const w = wieVan(i), plek = i.stadsdelen && i.stadsdelen[0];
  return `<li class="met-wie"><span class="r-wie${w.length > 1 ? " twee" : ""}" aria-hidden="true">${w.length ? gezichtjes(w) : `<span class="r-plek">${plek ? silhouet(plek) : STAD}</span>`}</span><div>${tekst}</div></li>`;
}
const aanmeldLink = a => `<a class="aanmeld" href="${U("agenda/aanmelden/?id=" + encodeURIComponent(a.id))}">Aanmelden<span class="verborgen"> voor ${esc(a.titel)}</span></a>`;
function agendaItem(a) {
  const x = dt(a.datum);
  return `<li><div class="dd" aria-hidden="true"><b>${x.d}</b><span>${MND[x.m]}</span></div>
    <div><h3>${esc(a.titel)}</h3><p>${DAG[x.wd]} ${x.d} ${MAAND[x.m]}${a.tijd ? ", " + esc(a.tijd) + " uur" : ""} · ${esc(a.plek || "")}${a.stadsdeel ? " · " + esc(a.stadsdeel) : ""}</p>${a.samenvatting ? `<p>${esc(a.samenvatting)}</p>` : ""}
    ${aanmeldLink(a)}</div></li>`;
}
function portret(f, opties = {}) {
  const naam = esc(f.naam);
  const onder = opties.rol ? esc(f.rol) : (f.stadsdelen && f.stadsdelen.length ? esc(f.stadsdelen.join(" en ")) : "");
  const pf = opties.portefeuilles && f.portefeuilles && f.portefeuilles.length ? `<small>${esc(f.portefeuilles.slice(0, 3).join(", "))}${f.portefeuilles.length > 3 ? " en meer" : ""}</small>` : "";
  return `<figure>${f.beeld ? `<img src="${esc(f.beeld)}" alt="Portret van ${naam}" loading="lazy" decoding="async">` : `<div class="leeg-foto" aria-hidden="true">${initialen(f.naam)}</div>`}
    <figcaption>${opties.link === false ? `<b>${naam}</b>` : `<a href="${U("fractie/" + slug(f.naam) + "/")}"><b>${naam}</b></a>`}${onder ? `<span>${onder}</span>` : ""}${pf}</figcaption></figure>`;
}
const kruimels = (...stappen) => [`<a href="${U()}">Home</a>`, ...stappen.map(([pad, naam]) => pad ? `<a href="${U(pad)}">${esc(naam)}</a>` : esc(naam))].join(" / ");
const paginaKop = (titel, tekst, kruimel = "", extra = "", plek = "") => `<div class="pagina-kop${plek ? " met-plek" : ""}"><svg class="kop-lijnen" aria-hidden="true"${plek ? ` data-plek="${esc(plek)}"` : ""}></svg><div class="wrap">${kruimel ? `<p class="kruimel">${kruimel}</p>` : ""}<h1 tabindex="-1">${titel}</h1>${tekst ? `<p>${tekst}</p>` : ""}${extra}</div></div>`;
const stadsdeelOpties = (gekozen = "") => `<option value="">Kies uw stadsdeel</option>` + STADSDELEN.map(s => `<option${s === gekozen ? " selected" : ""}>${s}</option>`).join("");
const leestijd = h => Math.max(1, Math.round((h || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length / 200));
const HART = '<svg class="sil" viewBox="0 0 100 92" aria-hidden="true"><path d="M50 90C22 68 2 50 2 27 2 12 13 2 27 2c10 0 18 6 23 14C55 8 63 2 73 2c14 0 25 10 25 25 0 23-20 41-48 63z"/></svg>';
// omtrek van de hele stad, voor stukken die over heel Den Haag gaan
const STAD = '<svg class="sil" viewBox="0 0 1000 801" aria-hidden="true"><use href="#sd-stad"/></svg>';
const skelet = (n = 4) => `<section class="wit"><div class="wrap"><ul class="skelet" aria-hidden="true">${"<li><span></span><span></span><span></span></li>".repeat(n)}</ul><p class="verborgen">Even laden…</p></div></section>`;

// ---------- formulieren ----------
const AKKOORD = {
  contact: "Hart voor Den Haag mag mijn gegevens gebruiken om op mijn bericht te reageren.",
  melding: "Hart voor Den Haag mag mijn gegevens gebruiken om mijn melding op te volgen en mij te laten weten hoe het afloopt.",
  petitie: "Hart voor Den Haag mag mijn naam en e-mailadres gebruiken voor deze petitie en mij laten weten wat ermee gebeurt.",
  doemee: "Hart voor Den Haag mag contact met mij opnemen over meedoen in mijn buurt.",
  aanmelding: "Hart voor Den Haag mag mijn gegevens gebruiken voor deze bijeenkomst.",
};
const akkoordVeld = (soortForm = "contact", id = "akkoord") => `<label class="vink"><input type="checkbox" name="akkoord" id="${id}" value="1"><span>${AKKOORD[soortForm] || AKKOORD.contact} <a href="${U("privacy/")}">Hoe we met gegevens omgaan</a>.</span></label>
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
    const el = veld instanceof RadioNodeList ? veld[0] : veld;
    const fout = test(el.type === "checkbox" ? el.checked : (veld.value || "").trim(), form);
    zetFout(el, fout || "");
    if (fout && !eerste) eerste = el;
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
// Robotcontrole (Cloudflare Turnstile, zonder puzzel en zonder cookies). Staat uit tot er een sitesleutel in kader.js staat
// (HVDH.TURNSTILE) en het geheim TURNSTILE_GEHEIM in de achterkant.
let tsBelofte = null;
function robotToken() {
  const sleutel = window.HVDH && HVDH.TURNSTILE;
  if (!sleutel) return Promise.resolve("");
  if (!tsBelofte) tsBelofte = new Promise((ok, nee) => { const sc = document.createElement("script"); sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; sc.onload = ok; sc.onerror = nee; document.head.appendChild(sc); });
  return tsBelofte.then(() => new Promise(ok => {
    const plek = document.createElement("div"); plek.className = "verborgen"; document.body.appendChild(plek);
    window.turnstile.render(plek, { sitekey: sleutel, size: "invisible", callback: t => { ok(t); setTimeout(() => plek.remove(), 1000); }, "error-callback": () => ok("") });
  })).catch(() => "");
}
// Wat iemand typt, blijft bewaard in deze browsersessie: per ongeluk weg en terug, dan staat het er nog.
const CONCEPT_VELDEN = "input[type=text], input[type=email], input[type=tel], textarea, select";
function bewaarConcept(form, sleutel) {
  const k = "concept:" + sleutel;
  try {
    const oud = JSON.parse(opslag.sLees(k) || "{}");
    for (const [n, v] of Object.entries(oud)) { const veld = form.elements[n]; if (veld && !(veld instanceof RadioNodeList) && !veld.value && v) veld.value = v; }
  } catch { /* geen concept */ }
  form.addEventListener("input", () => {
    const d = {}; $$(CONCEPT_VELDEN, form).forEach(v => { if (v.name && v.name !== "website" && v.value && v.type !== "hidden") d[v.name] = v.value; });
    opslag.sZet(k, JSON.stringify(d)); form.dataset.vuil = Object.keys(d).length ? "1" : "";
  });
  return () => { opslag.sWeg(k); form.dataset.vuil = ""; };
}
addEventListener("beforeunload", e => { if ($("form[data-vuil='1']")) { e.preventDefault(); e.returnValue = ""; } });
function koppelFormulier(form, opties) {
  const wis = opties.concept ? bewaarConcept(form, opties.concept) : () => {};
  form.addEventListener("input", e => { if (e.target.getAttribute("aria-invalid")) zetFout(e.target, ""); });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const uit = form.querySelector(".uitslag");
    const knop = form.querySelector("button[type=submit]");
    const data = Object.fromEntries(new FormData(form).entries());
    for (const [k, v] of Object.entries(data)) if (v instanceof File) delete data[k];
    data.akkoord = !!data.akkoord;
    if (!controleer(form, opties.eisen(data))) {
      if ($$("[aria-invalid='true']", form).length > 1) toon(uit, "Er ontbreekt nog iets. Kijk bij de rood omlijnde velden.", true); else uit.hidden = true;
      return;
    }
    data.soort = typeof opties.soort === "function" ? opties.soort(data) : opties.soort;
    if (opties.voor) Object.assign(data, await opties.voor(data));
    knop.disabled = true; const label = knop.textContent; knop.textContent = "Bezig met versturen…";
    try {
      const robot = await robotToken(); if (robot) data["cf-turnstile-response"] = robot;
      const r = await fetch(API + "/formulier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await r.json().catch(() => ({ ok: false }));
      if (!d.ok) { const fout = new Error(""); fout.nl = d.fout && !/token|fetch|json|error/i.test(d.fout) ? d.fout : ""; throw fout; }
      wis(); form.reset(); form.dispatchEvent(new Event("change")); form.dispatchEvent(new Event("input")); wis();
      toon(uit, opties.bedankt(data, d));
      if (opties.na) opties.na(data, uit, d);
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
        <div class="knoppen"><a class="knop geel" href="${U("lid/")}">Word lid vanaf € 12,50 per jaar</a><a class="knop lijn" href="${U("contact/melding/")}">Meld een probleem</a></div>
      </div>
    </div>
    <figure class="held-beeld">
      ${HART.replace('class="sil"', 'class="hart"')}
      <div class="film"><video id="held-video" muted loop playsinline preload="none" poster="${U(smal() ? "beeld/groep-film-800.webp" : "beeld/groep-film.webp")}" aria-label="Campagnefilm van Hart voor Den Haag, zonder geluid"><source src="${VIDEO}" type="video/mp4"></video>
      <button class="speel" type="button" id="speel"><svg viewBox="0 0 16 16" aria-hidden="true"></svg><span>Speel film af</span></button></div>
      <figcaption><span>De fractie van Hart voor Den Haag. De film speelt zonder geluid.</span><a class="raadslid-link" href="${U("fractie/")}">Wie is uw raadslid?</a></figcaption>
    </figure>
  </div></section>

  ${ag.length ? `<section class="binnenkort" aria-labelledby="h-binnenkort"><div class="wrap">
    <div class="sectie-kop"><h2 id="h-binnenkort">Binnenkort</h2><a class="meer" href="${U("agenda/")}">Hele agenda ${PIJL}</a></div>
    <div class="ag-rij">${ag.slice(0, 3).map((a, k) => agKolom(a, k === 0)).join("")}</div>
  </div></section>` : ""}

  <section aria-labelledby="h-weken"><div class="wrap">
    <div class="sectie-kop"><h2 id="h-weken">De afgelopen weken</h2><a class="meer" href="${U("nieuws/")}">Al het nieuws ${PIJL}</a></div>
    <div class="krant">
      <div>
        ${lead ? `<article class="lead">${lead.beeld ? `<span class="poster-lijst"><img class="lead-beeld" src="${esc(lijstBeeld(lead))}" alt="${esc(lead.alt || "")}" decoding="async" fetchpriority="high"></span>` : ""}
          <h3>${stukLink(lead, esc(lead.titel))}</h3>${bijschrift(lead)}${lead.samenvatting ? `<p class="sam">${esc(lead.samenvatting)}</p>` : ""}<span class="lees-meer" aria-hidden="true">Lees meer ${PIJL}</span></article>` : ""}
        <ul class="kolom-lijst">${rest.map(n => `<li><div><h3>${stukLink(n, esc(n.titel))}</h3>${bijschrift(n)}<span class="lees-meer" aria-hidden="true">Lees meer ${PIJL}</span></div>${n.beeld ? `<img class="k-beeld" src="${esc(lijstBeeld(n))}" alt="" loading="lazy" decoding="async">` : "<span></span>"}</li>`).join("")}</ul>
      </div>
      <div class="krant-zij">
        <h3 class="kolomkop" id="h-raad">Uit de raad</h3>
        <ul class="raad-lijst" aria-labelledby="h-raad">${raad.map(i => { const w = wieVan(i); const plek = i.stadsdelen && i.stadsdelen[0];
          return `<li><span class="r-wie${w.length > 1 ? " twee" : ""}" aria-hidden="true">${w.length ? gezichtjes(w) : `<span class="r-plek">${plek ? silhouet(plek) : STAD}</span>`}</span>
          <div><h4>${stukLink(i, esc(i.titel))}</h4>${bijschrift(i, { soort: true, ris: false })}</div></li>`; }).join("")}</ul>
        <p><a class="meer" href="${U("raadswerk/vragen/")}">Al het raadswerk ${PIJL}</a></p>
        ${open.length ? `<div class="teken"><h3 class="kolomkop">Teken mee</h3>${open.slice(0, 2).map(p => `<div class="teken-item">${stukLink(p, esc(kaleTitel(p)))}${balk(handtekeningen(p, tel), p)}</div>`).join("")}</div>` : ""}
      </div>
    </div>
  </div></section>

  <section class="band" aria-labelledby="h-stadsdeel"><div class="wrap">
    <div class="sectie-kop"><h2 id="h-stadsdeel">Uw stadsdeel, uw raadsleden</h2><p class="inleiding">Vul uw postcode in of kies uw stadsdeel. U ziet wie er bij u spreekuur houdt en wat er bij u in de buurt speelt.</p></div>
    ${kaartBlok(kaart)}
  </div></section>

  <section class="donker" aria-labelledby="h-succes"><div class="wrap">
    <div class="succes-kop"><span class="groot-getal" data-tel="${ditJaar}" data-van="${Math.max(0, ditJaar - 1)}" aria-label="${ditJaar} successen"><span class="getal">${ditJaar}</span></span><div><h2 id="h-succes">successen in ${new Date().getFullYear()}</h2><p>Van een besluit van de raad tot een opgeknapte speeltuin: dit leverde ombudspolitiek dit jaar op.</p></div></div>
    <ul class="drie">${succes.slice(0, 3).map(x => `<li>${x.beeld ? `<span class="poster-lijst"><img src="${esc(lijstBeeld(x))}" alt="" loading="lazy" decoding="async"></span>` : ""}<h3>${stukLink(x, esc(x.titel))}</h3>${bijschrift(x)}</li>`).join("")}</ul>
    <p style="margin-top:22px"><a class="meer" href="${U("successen/")}">Alle successen ${PIJL}</a></p>
  </div></section>

  <section aria-labelledby="h-beloofd" class="beloofd-home"><div class="wrap">
    <div class="sectie-kop"><h2 id="h-beloofd">Beloofd en gedaan</h2><a class="meer" href="${U("standpunten/")}">Alle standpunten ${PIJL}</a><p class="inleiding">Wat in ons programma staat, en wat we er het afgelopen jaar in de raad voor deden.</p></div>
    ${bewijsLijst(bewijs, PUNTEN.slice(0, 4))}
  </div></section>

  <section class="band podcast" aria-labelledby="h-podcast"><div class="wrap podcast-blok">
    <a class="podcast-hoes" href="https://open.spotify.com/show/0GI8mwNvxU1g3YUPhiJCeV" target="_blank" rel="noopener"><img src="${U("beeld/den-haag-inside.webp")}" alt="Hoes van de podcast Den Haag Inside" width="640" height="640" loading="lazy" decoding="async"></a>
    <div><p class="bovenregel">Podcast</p><h2 id="h-podcast">Den Haag Inside</h2>
      <p class="inleiding">Elke twee weken gaat Richard de Mos achter de schermen van Den Haag, met openhartige gesprekken en scherpe vragen aan bekende Hagenaars, raadsleden en politici.</p>
      <p class="knoppen"><a class="knop groen" href="https://open.spotify.com/show/0GI8mwNvxU1g3YUPhiJCeV" target="_blank" rel="noopener">Luister op Spotify</a><a class="knop lijn" href="https://www.youtube.com/@hartvoordenhaag" target="_blank" rel="noopener">Kijk op YouTube</a></p></div>
  </div></section>`;
};
pagina.home.na = async () => {
  const v = $("#held-video"), k = $("#speel");
  // Op de telefoon (of met databesparing of "minder beweging") laadt de film pas na een tik: hij is 3 MB.
  const zelf = stil() || smal() || (navigator.connection && navigator.connection.saveData);
  const zet = speelt => { k.querySelector("span").textContent = speelt ? "Pauzeer film" : "Speel film af"; k.querySelector("svg").innerHTML = speelt ? '<rect x="3" y="2" width="3.5" height="12"/><rect x="9.5" y="2" width="3.5" height="12"/>' : '<path d="M4 2l10 6-10 6z"/>'; };
  zet(false);
  if (!zelf) { v.preload = "metadata"; v.play().then(() => zet(true)).catch(() => zet(false)); }
  k.addEventListener("click", () => { if (v.paused) { v.play().then(() => zet(true)).catch(() => zet(false)); } else { v.pause(); zet(false); } });
  activeerKaart(await laad("kaart"), opslag.lees("stadsdeel"));
};

// een afspraak als krantenkolom, met aanmelden
function agKolom(a, eerst) {
  const x = dt(a.datum);
  return `<article class="ag${eerst ? " eerst" : ""}"><div class="ag-dd" aria-hidden="true"><b>${x.d}</b><span>${MND[x.m]}</span></div>
    <div><h3>${esc(a.titel)}</h3><p>${DAG[x.wd]} ${x.d} ${MAAND[x.m]}${a.tijd ? ", " + esc(a.tijd) + " uur" : ""} · ${esc(a.plek || "")}${a.stadsdeel ? " · " + esc(a.stadsdeel) : ""}</p>
    ${aanmeldLink(a)}</div></article>`;
}

// petities: handtekeningen van hartvoordenhaag.nl plus die via deze site; een doel alleen als de redactie er een zette
let tellerBelofte = null;
function tellers() {
  if (!tellerBelofte) {
    const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 4000);
    tellerBelofte = fetch(API + "/tellers", { signal: ctrl.signal }).then(r => r.json()).then(d => d.petities || {}).catch(() => ({}));
  }
  return tellerBelofte;
}
const handtekeningen = (p, tel) => (p.handtekeningen || 0) + (tel[p.titel] || 0) + (p.titelOrigineel ? tel[p.titelOrigineel] || 0 : 0);
function balk(n, p = {}) {
  const doel = Number(p.doel) || 0;
  if (!doel) return `<div class="voortgang"><p><b>${fmt.format(n)}</b> ${n === 1 ? "handtekening" : "handtekeningen"}</p></div>`;
  const pct = Math.max(2, Math.min(100, Math.round(n / doel * 100)));
  return `<div class="voortgang"><div class="voortgang-balk" role="progressbar" aria-valuemin="0" aria-valuemax="${doel}" aria-valuenow="${n}" aria-label="Handtekeningen"><span style="width:${pct}%"></span></div>
    <p><b>${fmt.format(n)}</b> handtekeningen · doel ${fmt.format(doel)}</p></div>`;
}

// Standpunten met wat we er het afgelopen jaar in de raad voor deden. Dat zijn ingediende stukken, geen uitkomsten:
// zo staat het er ook. Successen zijn uitkomsten.
function bewijsLijst(bewijs, punten, metProgramma = false) {
  const telling = b => {
    const delen = [];
    if (b.successen != null) delen.push(`<b>${b.successen}</b> ${b.successen === 1 ? "succes" : "successen"}`);
    if (b.vragen) delen.push(`<b>${b.vragen}</b> keer schriftelijke vragen`);
    if (b.moties) delen.push(`<b>${b.moties}</b> ${b.moties === 1 ? "motie" : "moties"}`);
    if (b.amendementen) delen.push(`<b>${b.amendementen}</b> ${b.amendementen === 1 ? "amendement" : "amendementen"}`);
    const zin = delen.length > 1 ? delen.slice(0, -1).join(", ") + " en " + delen.slice(-1) : delen.join("");
    return b.successen != null ? `${zin} dit jaar` : `In de raad ingediend: ${zin}`;
  };
  return `<div class="bewijs">${punten.map(([kop, tekst]) => {
    const b = bewijs && bewijs[kop];
    let rechts;
    if (kop === "Samenwerking voor de stad") rechts = `<p class="telling"><b>5</b> wethouders van Hart voor Den Haag in het college</p><p class="laatste"><a href="${U("wethouders/")}">Wie het zijn en waar ze over gaan</a></p>`;
    else if (b) rechts = `<p class="telling">${telling(b)}</p>
      ${b.succes ? `<p class="laatste">Laatste succes: ${stukLink({ id: b.succes.id, p: b.succes.p }, esc(b.succes.t))} <time datetime="${esc(b.succes.d)}">(${datum(b.succes.d)})</time></p>` : ""}
      ${b.onderwerp ? `<p class="laatste"><a href="${U("onderwerpen/" + slug(b.onderwerp) + "/")}">Dossier ${esc(b.onderwerp.toLowerCase())}</a></p>` : ""}`;
    else rechts = "";
    return `<article><h3>${esc(kop)}</h3><div>${metProgramma ? `<p class="standpunt">${esc(tekst)}</p>` : ""}${rechts}</div></article>`;
  }).join("")}</div>`;
}
const lidRegel = () => `<section class="lid-regel-sectie"><div class="wrap"><div class="lid-regel">
  <p><b>Eens?</b> Word lid vanaf € 12,50 per jaar en praat mee over de koers, het bestuur en de kandidaten.</p>
  <a class="knop geel" href="${U("lid/")}">Word lid</a>
  <p class="anders">Of <a href="${U("doneren/")}">doneer</a>, <a href="${U("doe-mee/")}">help mee in uw stadsdeel</a> of volg ons <a href="${WA_KANAAL}" target="_blank" rel="noopener">WhatsApp-kanaal</a>.</p>
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
  const metWethouder = wethouders.filter(w => w.stadsdeel).length;
  function kies(n, doorGebruiker) {
    namen.forEach(m => { const aan = m === n; vlak[m].setAttribute("aria-pressed", aan); lbl[m].classList.toggle("aan", aan); });
    STADSDELEN.forEach(m => knop[m].setAttribute("aria-pressed", m === n));
    if (!n) {
      paneel.innerHTML = `<div class="kies-hint"><h3>Kies uw stadsdeel</h3><p>Den Haag heeft acht stadsdelen, elk met eigen raadsleden van Hart voor Den Haag.${metWethouder ? ` In ${metWethouder === 4 ? "vier" : metWethouder} stadsdelen is een wethouder van onze partij stadsdeelwethouder.` : ""} Vul uw postcode in of kies een stadsdeel.</p></div>`;
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
      <div><p class="tussenkop">Uw raadsleden</p>${mensen.length ? `<ul class="mensen">${mensen.map(f => `<li>${f.beeld ? `<img src="${esc(f.beeld)}" alt="">` : `<span class="leeg-foto" aria-hidden="true">${initialen(f.naam)}</span>`}<div><a href="${U("fractie/" + slug(f.naam) + "/")}"><b>${esc(f.naam)}</b></a><span>${esc(f.portefeuilles.slice(0, 3).join(", "))}</span></div></li>`).join("")}</ul>` : `<p class="leeg">Nog geen raadslid gekoppeld.</p>`}
        ${weth ? `<p class="wijken" style="margin-top:12px">Stadsdeelwethouder: <a href="${U("wethouders/")}">${esc(weth.naam)}</a></p>` : ""}</div>
      <div><p class="tussenkop">Wat we hier doen</p>${items.length ? `<ul class="berichten">${items.map(x => `<li>${x.soort === "agenda" ? `<a href="${U("agenda/?stadsdeel=" + encodeURIComponent(n))}">${esc(x.titel)}</a>` : stukLink(x, esc(x.titel))}<small>${esc(SOORT[x.soort].naam)}, ${datum(x.datum)}</small></li>`).join("")}</ul>` : `<p class="leeg">Nog geen berichten uit ${esc(n)}.</p>`}</div>
      <p class="wijken"><b>Wijken:</b> ${s.wijken.map(esc).join(", ")}</p>
      <div class="knoppen"><a class="knop groen" href="${U("contact/melding/?stadsdeel=" + encodeURIComponent(n))}">Meld een probleem in ${esc(n)}</a><a class="knop lijn" href="${U("nieuws/?stadsdeel=" + encodeURIComponent(n))}">Nieuws uit ${esc(n)}</a></div>
      <p class="doe-mee-regel"><a href="${U("doe-mee/")}">Doe mee en maak uw buurt beter</a> in ${esc(n)}.</p>`;
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

pagina.stadsdelen = async ([naam]) => {
  const sd = sdVanSlug(naam);
  return paginaKop(sd ? `Hart voor Den Haag in ${esc(sd)}` : "Uw stadsdeel", sd ? `Raadsleden, spreekuren en wat we doen in ${esc(sd)}.` : "Acht stadsdelen, elk met eigen raadsleden. Vul uw postcode in of kies uw stadsdeel.", sd ? kruimels(["stadsdelen/", "Uw stadsdeel"], ["", sd]) : "", "", sd) +
    `<section><div class="wrap"><h2 class="verborgen">Kies uw stadsdeel</h2>${kaartBlok(await laad("kaart"))}</div></section>`;
};
pagina.stadsdelen.na = async ([naam]) => activeerKaart(await laad("kaart"), sdVanSlug(naam) || opslag.lees("stadsdeel"));
pagina.stadsdelen.titel = ([naam]) => sdVanSlug(naam) ? `Hart voor Den Haag in ${sdVanSlug(naam)}` : "Uw stadsdeel";

// lijsten uit het hele archief: "Meer laden" haalt zo nodig een ouder jaar op; bij Terug blijft het aantal staan
const lijstSleutel = () => "n:" + location.pathname + location.search;
async function meerLadenStroom(lijst, st, past, maak, stap, filterActief, leeg) {
  const sleutel = lijstSleutel();
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
    if (teller) teller.textContent = st.klaar ? `${fmt.format(getoond)} van ${fmt.format(zicht.length)}` : filterActief ? `${fmt.format(getoond)} getoond, met Meer laden zoekt u verder terug` : `${fmt.format(getoond)} van ${fmt.format(st.totaal)}`;
    if (knop) knop.hidden = st.klaar && n >= zicht.length;
  };
  await teken();
  if (knop) knop.onclick = async () => { n += stap; opslag.sZet(sleutel, n); await teken(); };
  return teken;
}
const bijgewerkt = st => st.opgehaald ? `Overgenomen van hartvoordenhaag.nl, bijgewerkt op ${datumVol(st.opgehaald)}.` : "";

// nieuws en successen
function lijstPagina(s, titel, tekst, pad) {
  const f = async (args, q) => {
    const sd = q.get("stadsdeel") || "";
    const knoppen = ["", ...STADSDELEN].map(x => `<a class="knopje" href="${U(pad + (x ? "?stadsdeel=" + encodeURIComponent(x) : ""))}"${x === sd ? ' aria-current="page"' : ""}>${x || "Hele stad"}</a>`).join("");
    return paginaKop(titel, tekst) + `<section class="${s === "succes" ? "" : "wit"}"><div class="wrap">
      <nav class="filters" aria-label="Kies een stadsdeel">${knoppen}</nav>
      <p class="teller" id="teller" aria-live="polite"></p><h2 class="verborgen">Berichten</h2><ol class="log" id="lijst">${"<li class=\"skelet-rij\" aria-hidden=\"true\"><span></span><span></span><span></span></li>".repeat(5)}</ol>
      <button class="knop lijn meer-laden" type="button" id="meer" hidden>Meer laden</button>
      <p class="leeg" id="bron" style="margin-top:22px"></p></div></section>`;
  };
  f.na = async (args, q) => {
    const sd = q.get("stadsdeel") || "";
    const st = await stroom(s).start();
    $("#bron").textContent = `Alles sinds ${s === "succes" ? "2014" : "2013"} staat hier; met Meer laden gaat u verder terug. ${bijgewerkt(st)}`;
    await meerLadenStroom({ doel: "#lijst", teller: "#teller", knop: "#meer" }, st, i => !sd || i.stadsdelen.includes(sd),
      rij => rij.map((n, i) => logItem(n, i === 0 && !sd)).join(""), 20, !!sd, `<li class="leeg">Nog geen berichten uit ${esc(sd)}.</li>`);
  };
  return f;
}
pagina.nieuws = lijstPagina("nieuws", "Nieuws", "Wat Hart voor Den Haag doet in de raad en in de wijk.", "nieuws/");
pagina.successen = lijstPagina("succes", "Successen", "Wat ombudspolitiek opleverde: besluiten, oplossingen en opgeknapte plekken.", "successen/");

// één stuk: nieuws, succes, motie, vragen, amendement, spreektekst, petitie of vacature
async function detail(id) {
  const eigenStuk = /^w/.test(id);
  const i = eigenStuk ? (await eigen()).find(x => String(x.id) === id) : await stuk(id);
  if (!i || !SOORT[i.soort]) return null;
  const s = i.soort, S = SOORT[s];
  const [alles, tel] = await Promise.all([s === "vacature" || s === "agenda" ? [] : soort(s), s === "petitie" ? tellers() : {}]);
  document.title = i.titel + " | Hart voor Den Haag (proef)";
  const meer = alles.filter(x => x.id !== i.id && x.stadsdelen.some(sd => (i.stadsdelen || []).includes(sd))).slice(0, 4);
  const isPetitie = s === "petitie";
  const open = isPetitie && isOpen(i);
  const wie = wieVan(i);
  const n = isPetitie ? handtekeningen(i, tel) : 0;
  const dictum = i.dictum ? (() => {
    const delen = i.dictum.tekst.split(/\s*;\s*(?=\S)/).map(d => d.replace(/^(en|of)\s+/i, "").trim()).filter(d => d.length > 3);
    return `<div class="dictum"><h2>${s === "amendement" ? "Wat we willen veranderen" : "Wat we het college vragen"}</h2>
      <p class="dictum-kop">${esc(i.dictum.kop)}:</p>
      ${delen.length > 1 ? `<ol>${delen.map(d => `<li>${esc(d)}</li>`).join("")}</ol>` : `<p>${esc(i.dictum.tekst)}</p>`}
      <div class="dictum-voet">${wie.length ? `<span class="m-wie${wie.length > 1 ? " twee" : ""}" aria-hidden="true">${gezichtjes(wie)}</span>` : ""}<p>${i.indiener ? `Ingediend door ${wie.length ? wie.map(f => lidVan(f.naam) ? `<a href="${U("fractie/" + slug(f.naam) + "/")}">${esc(f.naam)}</a>` : esc(f.naam)).join(" en ") : esc(i.indiener)}` : "Ingediend door Hart voor Den Haag"}, raad van ${datum(i.datum)}.${i.status ? ` <b>Uitslag: ${esc(i.status.toLowerCase())}.</b>` : ""}</p></div></div>`;
  })() : "";
  const lees = leestijd(i.html);
  const titel = isPetitie ? kaleTitel(i) : i.titel;
  return paginaKop(esc(titel), "", kruimels([S.lijst, S.lijstNaam]),
    bijschrift({ ...i, handtekeningen: isPetitie ? 0 : i.handtekeningen }, { soort: !["nieuws", "succes", "petitie"].includes(s) }).replace("</p>", `<span>${lees} min lezen</span></p>`), i.stadsdelen && i.stadsdelen.length === 1 ? i.stadsdelen[0] : "") + `
  <section class="wit"><div class="wrap"><article class="artikel${isPetitie && open && i.beeld ? " petitie-open" : ""}">
    ${i.beeld ? `<span class="poster-lijst artikel-beeld"><img src="${esc(i.beeld)}" alt="${esc(i.alt || "")}" decoding="async"></span>` : ""}
    ${isPetitie ? `<div class="teken-teller" id="teller-blok" data-n="${n}">${balk(n, i)}${i.handtekeningen ? `<p class="leeg">Inclusief de handtekeningen op hartvoordenhaag.nl.</p>` : ""}${open ? `<button class="knop groen teken-snel" type="button" id="naar-teken">Teken deze petitie</button>` : ""}</div>` : ""}
    ${dictum}
    ${isPetitie && !open ? `<div class="melding afloop" style="margin-top:22px"><p><b>Deze petitie is gesloten.</b>${i.afloop ? " " + esc(i.afloop) : ""}</p><p>Bekijk <a href="${U("petities/")}">de petities die nu lopen</a>.</p></div>` : ""}
    ${open ? `<form class="formulier" id="teken" style="margin-top:22px" novalidate><h2 style="font-size:2rem">Teken deze petitie</h2>
      <input type="hidden" name="petitie" value="${esc(i.titel)}">
      <div class="velden"><div class="veld"><label for="p-naam">Naam</label><input type="text" id="p-naam" name="naam" autocomplete="name"></div>
      <div class="veld"><label for="p-email">E-mailadres</label><input type="email" id="p-email" name="email" autocomplete="email"></div>
      <div class="veld breed"><label for="p-sd">Stadsdeel <small>(niet verplicht)</small></label><select id="p-sd" name="stadsdeel">${stadsdeelOpties((i.stadsdelen || [])[0])}</select></div></div>
      ${akkoordVeld("petitie")}<button class="knop groen" type="submit">Teken de petitie</button><p class="uitslag" hidden></p></form>` : ""}
    ${dictum || open ? `<h2 class="volledig">${open ? "Waarom deze petitie" : "Volledige tekst"}</h2>` : ""}
    <div class="artikel-tekst" style="margin-top:18px">${i.html || `<p>${esc(i.samenvatting)}</p>`}</div>
    <div class="na-artikel">
      <div class="deelrij"><button class="knop lijn klein" type="button" id="deel">Deel dit stuk</button><a class="knop lijn klein" href="https://wa.me/?text=${encodeURIComponent(titel + " " + location.origin + U(stukPad(i)))}" target="_blank" rel="noopener">Deel via WhatsApp</a>${i.link ? `<a class="meer" href="${esc(i.link)}" target="_blank" rel="noopener">Op hartvoordenhaag.nl ${UIT}</a>` : ""}</div>
      ${meer.length ? `<div><h2 style="font-size:1.8rem">Meer uit ${esc(i.stadsdelen.join(" en "))}</h2><ul class="stukken" style="margin-top:10px">${meer.map(x => stukItem({ ...x, samenvatting: "" }, { ris: false, soort: true })).join("")}</ul></div>` : ""}
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
    soort: "petitie", concept: "petitie", voor: () => ({ pagina: location.origin + location.pathname }),
    eisen: () => ({ naam: verplicht("Vul uw naam in."), email: v => !v ? "Vul uw e-mailadres in." : EMAIL.test(v) ? "" : "Dit e-mailadres klopt niet.", akkoord: v => v ? "" : "Vink dit aan om te kunnen tekenen." }),
    bedankt: (d, a) => a.dubbel ? "U had deze petitie al getekend. Dank u wel! Helpt u mee door hem te delen?" : "Dank u wel! Uw handtekening is binnen. Helpt u mee? Hoe meer mensen tekenen, hoe sterker we in de raad staan.",
    na: (d, uit, a) => {
      $$(".velden, .vink, button[type=submit], h2", $("#teken")).forEach(x => x.hidden = true);
      const tb = $("#teller-blok");
      if (tb && !a.dubbel) { const n = Number(tb.dataset.n) + 1; tb.dataset.n = n; tb.querySelector(".voortgang").outerHTML = balk(n, { doel: Number(($(".voortgang-balk", tb) || {}).getAttribute?.("aria-valuemax")) || 0 }); }
      const tekst = `Ik heb de petitie "${d.petitie.replace(/^petitie:\s*/i, "")}" getekend. Teken jij ook? ${location.href}`;
      uit.insertAdjacentHTML("afterend", `<div class="deel-na"><a class="knop groen" href="https://wa.me/?text=${encodeURIComponent(tekst)}" target="_blank" rel="noopener">Deel via WhatsApp</a><button class="knop lijn" type="button" id="kopieer">Kopieer de link</button></div>`);
      $(".deel-na").scrollIntoView({ block: "center", behavior: stil() ? "auto" : "smooth" });
      $("#kopieer").addEventListener("click", async e => { try { await navigator.clipboard.writeText(location.href); e.target.textContent = "Link gekopieerd"; } catch { e.target.textContent = "Kopieer de link uit de adresbalk"; } });
    },
  });
};

// raadswerk
const TABS = {
  moties: { s: "motie", pad: "raadswerk/", titel: "Moties", vraag: "Hoe werkt een motie?", uitleg: `<ol class="uitleg"><li><b>Debat in de raad</b><span>Tijdens een debat ziet de fractie iets dat beter moet in de stad.</span></li><li><b>Wij dienen een motie in</b><span>Daarin staat wat we zien, wat we vinden en wat we het college vragen.</span></li><li><b>De raad stemt</b><span>Neemt de raad de motie aan, dan moet het college ermee aan de slag.</span></li></ol>` },
  amendementen: { s: "amendement", pad: "raadswerk/amendementen/", titel: "Amendementen", vraag: "Wat is een amendement?", uitleg: `<p>Met een amendement verandert de raad een voorstel van het college voordat erover wordt gestemd. Zo passen we plannen aan, in plaats van ze alleen af te keuren.</p>` },
  vragen: { s: "raadsvraag", pad: "raadswerk/vragen/", titel: "Schriftelijke vragen", vraag: "Wat zijn schriftelijke vragen?", uitleg: `<p>Met schriftelijke vragen zetten we een probleem uit de wijk op de agenda. Het college moet binnen een paar weken antwoorden.</p>` },
  spreekteksten: { s: "spreektekst", pad: "raadswerk/spreekteksten/", titel: "Spreekteksten", vraag: "Wat is een spreektekst?", uitleg: `<p>Wat onze raadsleden zeggen in de raad en in commissies, zoals bij de begroting.</p>` },
};
const rwHref = (tab, o, q) => { const p = new URLSearchParams(); if (o) p.set("onderwerp", o); if (q) p.set("zoek", q); const s = p.toString(); return U(TABS[tab].pad + (s ? "?" + s : "")); };
pagina.raadswerk = async ([tab = "moties"], q) => {
  const tabNaam = TABS[tab] ? tab : "moties", t = TABS[tabNaam];
  const onderwerp = q.get("onderwerp") || "", zoek = q.get("zoek") || "";
  const knoppen = ["", ...ONDERWERPEN].map(o => `<a class="knopje" href="${rwHref(tabNaam, o, zoek)}"${o === onderwerp ? ' aria-current="page"' : ""}>${o || "Alle onderwerpen"}</a>`).join("");
  return paginaKop("Raadswerk", "Wat Hart voor Den Haag in de gemeenteraad doet: moties, amendementen, vragen aan het college en wat we zeggen in de raad.") + `
    <section class="wit"><div class="wrap">
      <nav class="tabs" aria-label="Soort stuk">${Object.entries(TABS).map(([k, v]) => `<a href="${U(v.pad)}"${k === tabNaam ? ' aria-current="page"' : ""}>${v.titel}</a>`).join("")}</nav>
      <details class="hoe"><summary>${t.vraag}</summary>${t.uitleg}</details>
      <nav class="filters breed-alleen" aria-label="Onderwerp">${knoppen}</nav>
      <div class="filterrij">
        <div class="veld smal-alleen"><label for="rw-onderwerp">Onderwerp</label><select id="rw-onderwerp"><option value="">Alle onderwerpen</option>${ONDERWERPEN.map(o => `<option${o === onderwerp ? " selected" : ""}>${o}</option>`).join("")}</select></div>
        <div class="veld"><label for="binnen">Zoek in deze lijst</label><input type="search" id="binnen" value="${esc(zoek)}" placeholder="Bijvoorbeeld parkeren of Moerwijk"></div>
        <p class="teller" id="teller" aria-live="polite"></p></div>
      <div id="lijst"><ul class="skelet" aria-hidden="true">${"<li><span></span><span></span><span></span></li>".repeat(6)}</ul></div>
      <button class="knop lijn meer-laden" type="button" id="meer" hidden>Meer laden</button>
      <p class="leeg" id="bron" style="margin-top:22px"></p>
    </div></section>`;
};
pagina.raadswerk.titel = ([tab]) => TABS[tab] ? TABS[tab].titel : "Raadswerk";
pagina.raadswerk.na = async ([tab = "moties"], q) => {
  const tabNaam = TABS[tab] ? tab : "moties", t = TABS[tabNaam];
  const onderwerp = q.get("onderwerp") || "";
  const st = await stroom(t.s).start();
  const nieuwste = st.items.find(i => !i.eigen) || st.items[0];
  $("#bron").textContent = `Alles wat de fractie sinds 2012 op hartvoordenhaag.nl plaatste${nieuwste ? `; het nieuwste stuk in deze lijst is van ${datumVol(nieuwste.datum)}` : ""}. ${bijgewerkt(st)} Onderwerpen zijn automatisch toegekend op basis van de tekst.`;
  const opOnderwerp = i => !onderwerp || (i.onderwerpen || []).includes(onderwerp);
  const perMaand = rij => {
    let html = "", huidig = "";
    for (const i of rij) {
      const x = dt(i.datum), m = `${MAAND[x.m]} ${x.y}`;
      if (m !== huidig) { if (huidig) html += "</ul>"; html += `<h2 class="maand-kop">${m[0].toUpperCase() + m.slice(1)}</h2><ul class="stukken raad">`; huidig = m; }
      html += stukItem(i);
    }
    return html + (huidig ? "</ul>" : "");
  };
  const leeg = `<p class="leeg" style="padding-top:18px">Niets gevonden. Probeer een ander woord of onderwerp, of <a href="${U("zoeken/?q=" + encodeURIComponent(($("#binnen") || {}).value || ""))}">zoek op de hele site</a>. <a class="meer" href="${U(t.pad)}">Wis zoekterm en onderwerp</a></p>`;
  const toonLijst = () => {
    const zoek = PLAT($("#binnen").value.trim().toLowerCase());
    const past = i => opOnderwerp(i) && (!zoek || PLAT((i.titel + " " + (i.samenvatting || "") + " " + (i.indiener || "")).toLowerCase()).includes(zoek));
    return meerLadenStroom({ doel: "#lijst", teller: "#teller", knop: "#meer" }, st, past, perMaand, 25, !!(zoek || onderwerp), leeg);
  };
  let wacht; $("#binnen").addEventListener("input", () => {
    clearTimeout(wacht);
    wacht = setTimeout(() => { history.replaceState(history.state, "", rwHref(tabNaam, onderwerp, $("#binnen").value.trim())); toonLijst(); }, 250);
  });
  $("#rw-onderwerp").addEventListener("change", e => gaNaar(rwHref(tabNaam, e.target.value, $("#binnen").value.trim())));
  toonLijst();
};

pagina.petities = async () => {
  const [alles, tel] = await Promise.all([soort("petitie"), tellers()]);
  const open = alles.filter(isOpen), dicht = alles.filter(p => !isOpen(p));
  return paginaKop("Petities", "Hagenaars die samen iets willen veranderen. Teken mee, dan nemen wij het mee naar de raad.") +
    `<section class="wit"><div class="wrap">
      ${open.length ? `<h2 class="maand-kop">Loopt nu</h2><ul class="stukken">${open.map(p => `<li><h3>${stukLink(p, esc(kaleTitel(p)))}</h3>${bijschrift(p, { open: true, zonderTelling: true })}${balk(handtekeningen(p, tel), p)}</li>`).join("")}</ul>` : `<p class="leeg">Er loopt nu geen petitie.</p>`}
      ${dicht.length ? `<h2 class="maand-kop">Eerder</h2><ul class="stukken">${dicht.map(p => `<li><h3>${stukLink(p, esc(kaleTitel(p)))}</h3>${bijschrift(p, { open: true })}${p.afloop ? `<p class="sam"><b>Afloop:</b> ${esc(p.afloop)}</p>` : ""}</li>`).join("")}</ul>` : ""}
    </div></section>`;
};

pagina.standpunten = async () => paginaKop("Standpunten", "Geen links of rechts, maar oplossingen. Per standpunt ziet u wat erin ons programma staat en wat we er het afgelopen jaar in de raad voor deden.") + `
  <section class="wit"><div class="wrap">
    <h2 class="verborgen">Onze standpunten</h2>${bewijsLijst(await laad("bewijs"), PUNTEN, true)}
    <p class="leeg" style="margin-top:22px">Geteld zijn de stukken van de afgelopen twaalf maanden op hartvoordenhaag.nl, op onderwerp ingedeeld aan de hand van de tekst. Een motie of vraag is een inzet, nog geen resultaat; successen zijn wat het opleverde.</p>
    <p style="margin-top:18px"><a class="meer" href="${U("onderwerpen/")}">Alle dossiers op een rij ${PIJL}</a></p>
  </div></section>
  <section><div class="wrap formulier-raster links">
    <div><h2>En nu aan de slag!</h2><p class="inleiding">De tijd van praten is voorbij. Na jaren van stilstand en instabiele colleges is het tijd voor een stadsbestuur dat levert. Als grootste partij nemen wij onze verantwoordelijkheid, met de focus op wat u dagelijks merkt in uw buurt.</p></div>
    <div><a class="knop groen" href="${PROGRAMMA}" target="_blank" rel="noopener">Lees het verkiezingsprogramma (pdf)</a></div>
  </div></section>
  ${lidRegel()}`;

// dossiers: alles over één onderwerp bij elkaar (standpunt, laatste nieuws, raadswerk, wie erover gaat)
const DOSSIER_PUNT = { "Wonen en bouwen": 0, "Veiligheid": 1, "Verkeer en parkeren": 2, "Groen en leefbaarheid": 2, "Zorg en welzijn": 2, "Asiel en opvang": 4 };
const DOSSIER_PF = { "Veiligheid": /veilig|politie|handhav|brandweer/i, "Wonen en bouwen": /wonen|bouw|ruimtelijk|erfpacht|huur/i, "Verkeer en parkeren": /verkeer|parkeer|mobiliteit|openbaar vervoer|ov\b/i, "Zorg en welzijn": /zorg|wmo|welzijn|ouderen|volksgezondheid|armoede/i, "Onderwijs en jeugd": /onderwijs|jeugd|jongeren|school/i, "Economie en ondernemers": /economie|ondernem|haven|markten|toerisme|werk/i, "Groen en leefbaarheid": /groen|afval|duurzaam|klimaat|dieren|openbare ruimte|leefbaar/i, "Cultuur en sport": /cultuur|sport|media|erfgoed|evenement/i, "Geld en bestuur": /financi|begroting|bestuur|belasting/i, "Asiel en opvang": /asiel|opvang|integratie|statushouder/i };
pagina.onderwerpen = async ([o]) => {
  const naam = ONDERWERPEN.find(x => slug(x) === o);
  if (!naam) return paginaKop("Dossiers", "Alles wat Hart voor Den Haag doet op één onderwerp: wat we vinden, wat we in de raad deden en wie erover gaat.") + `
    <section class="wit"><div class="wrap"><ul class="dossiers">${ONDERWERPEN.map(x => `<li><a href="${U("onderwerpen/" + slug(x) + "/")}"><b>${esc(x)}</b>${PIJL}</a></li>`).join("")}</ul></div></section>`;
  const [idx, fractie] = await Promise.all([laad("zoekindex"), laad("fractie")]);
  const hier = idx.filter(i => (i.o || []).includes(naam));
  const jaar = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const tel = s => hier.filter(i => i.s === s && i.d >= jaar).length;
  const wie = fractie.filter(f => DOSSIER_PF[naam] && f.portefeuilles.some(p => DOSSIER_PF[naam].test(p)));
  const punt = DOSSIER_PUNT[naam] != null ? PUNTEN[DOSSIER_PUNT[naam]] : null;
  const rij = (s, kop, n = 5) => { const l = hier.filter(i => i.s === s).slice(0, n); return l.length ? `<div><h2 class="maand-kop">${kop}</h2><ul class="stukken">${l.map(i => `<li><h3><a href="${U("s/" + encodeURIComponent(i.id) + "/")}" data-stuk="${esc(i.id)}">${esc(i.t)}</a></h3><p class="bijschrift">${i.sd && i.sd.length ? `<span class="plek">${esc(i.sd.join(" en "))}</span>` : ""}${i.st ? `<span class="status">${esc(i.st)}</span>` : ""}<time datetime="${esc(i.d)}">${datum(i.d)}</time></p></li>`).join("")}</ul></div>` : ""; };
  const tabVoor = { motie: "moties", raadsvraag: "vragen", amendement: "amendementen" };
  return paginaKop(`Dossier ${esc(naam.toLowerCase())}`, punt ? esc(punt[1]) : "Wat we vinden, wat we in de raad deden en wie erover gaat.", kruimels(["onderwerpen/", "Dossiers"], ["", naam])) + `
    <section class="wit"><div class="wrap">
      <p class="telling-dossier">Het afgelopen jaar: <b>${tel("succes")}</b> successen, <b>${tel("raadsvraag")}</b> keer schriftelijke vragen, <b>${tel("motie")}</b> moties en <b>${tel("amendement")}</b> amendementen.</p>
      ${wie.length ? `<div class="dossier-wie"><h2 class="maand-kop">Wie gaat erover</h2><ul class="mensen">${wie.map(f => `<li>${f.beeld ? `<img src="${esc(f.beeld)}" alt="" loading="lazy">` : `<span class="leeg-foto" aria-hidden="true">${initialen(f.naam)}</span>`}<div><a href="${U("fractie/" + slug(f.naam) + "/")}"><b>${esc(f.naam)}</b></a><span>${esc(f.portefeuilles.filter(p => DOSSIER_PF[naam].test(p)).join(", "))}</span></div></li>`).join("")}</ul></div>` : ""}
      <div class="dossier-raster">${rij("succes", "Successen")}${rij("nieuws", "Laatste nieuws")}${rij("motie", "Moties")}${rij("raadsvraag", "Schriftelijke vragen")}</div>
      <p class="knoppen" style="margin-top:24px">${Object.entries(tabVoor).map(([s, tab]) => `<a class="knop lijn klein" href="${rwHref(tab, naam, "")}">Alle ${TABS[tab].titel.toLowerCase()} over dit onderwerp</a>`).join("")}</p>
      <p class="leeg" style="margin-top:18px">Onderwerpen zijn automatisch toegekend op basis van de tekst van elk stuk.</p>
    </div></section>`;
};
pagina.onderwerpen.titel = ([o]) => { const n = ONDERWERPEN.find(x => slug(x) === o); return n ? "Dossier " + n.toLowerCase() : "Dossiers"; };

pagina.fractie = async ([wie]) => {
  const fractie = await laad("fractie");
  if (wie) {
    const f = fractie.find(x => slug(x.naam) === wie);
    if (!f) return null;
    document.title = f.naam + " | Hart voor Den Haag (proef)";
    const [a, ag] = await Promise.all([aanpassingen(), agenda()]);
    const werk = (f.werk || []).filter(i => !(a[i.id] && a[i.id].verborgen)).map(i => a[i.id] ? { ...i, t: a[i.id].titel || i.t, sd: a[i.id].stadsdelen || i.sd, st: a[i.id].status ?? i.st } : i);
    const spreekuur = ag.find(x => f.stadsdelen.includes(x.stadsdeel));
    const voornaam = f.naam.split(" ")[0];
    return paginaKop(esc(f.naam), esc(f.functie || "Raadslid") + (f.stadsdelen.length ? ` voor ${esc(f.stadsdelen.join(" en "))}` : ""), kruimels(["fractie/", "Onze mensen"], ["", f.naam])) + `
      <section class="wit"><div class="wrap raadslid">
        <div class="raadslid-foto">${f.beeld ? `<img src="${esc(f.beeld)}" alt="Portret van ${esc(f.naam)}" decoding="async">` : `<div class="leeg-foto" aria-hidden="true">${initialen(f.naam)}</div>`}</div>
        <div>
          <div class="contactblok"><h2>Contact met ${esc(voornaam)}</h2>
            <p><a class="knop groen" href="${U("contact/?aan=" + slug(f.naam))}">Stuur ${esc(voornaam)} een bericht</a></p>
            <p>Of bel de fractie: <a href="${TEL_LINK}">${TEL}</a>.${spreekuur ? ` Eerstvolgende spreekuur in ${esc(spreekuur.stadsdeel)}: <a href="${U("agenda/aanmelden/?id=" + encodeURIComponent(spreekuur.id))}">${datum(spreekuur.datum)}${spreekuur.tijd ? ", " + esc(spreekuur.tijd) + " uur" : ""}</a>.` : ""}</p></div>
          ${f.portefeuilles.length ? `<h2 style="font-size:1.9rem;margin-top:26px">Portefeuilles</h2><ul class="voordelen">${f.portefeuilles.map(p => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
          ${f.commissie ? `<p class="leeg" style="margin-top:16px">Commissie: ${esc(f.commissie)}</p>` : ""}
          <div class="artikel-tekst" style="margin-top:28px">${f.bio || `<p>${esc(f.naam)} is raadslid voor Hart voor Den Haag.</p>`}</div>
        </div></div></section>
      ${werk.length ? `<section><div class="wrap"><div class="kop"><h2>Recent werk</h2></div><ul class="stukken">${werk.map(i => `<li><h3>${stukLink({ id: i.id, p: i.p }, esc(i.t))}</h3><p class="bijschrift">${i.sd && i.sd.length ? `<span class="plek">${silhouet(i.sd[0])}${esc(i.sd.join(" en "))}</span>` : ""}<span>${esc(SOORT[i.s].naam)}</span>${i.st ? `<span class="status">${esc(i.st)}</span>` : ""}<time datetime="${esc(i.d)}">${datum(i.d)}</time></p></li>`).join("")}</ul></div></section>` : ""}`;
  }
  const alle = [...new Set(fractie.flatMap(f => f.portefeuilles))].sort((a, b) => a.localeCompare(b, "nl"));
  return paginaKop("Onze mensen", "Zestien raadsleden van Hart voor Den Haag. Zoek op onderwerp wie erover gaat, of kies een stadsdeel.") + `
    <section class="wit"><div class="wrap">
      <div class="filterrij"><div class="veld"><label for="wie">Wie gaat over…</label><input type="search" id="wie" list="pf-lijst" placeholder="Bijvoorbeeld parkeren, onderwijs of strand"><datalist id="pf-lijst">${alle.map(p => `<option value="${esc(p)}">`).join("")}</datalist></div>
        <div class="veld"><label for="wie-sd">Stadsdeel</label><select id="wie-sd"><option value="">Alle stadsdelen</option>${STADSDELEN.map(x => `<option>${x}</option>`).join("")}<option>Hele stad</option></select></div>
        <p class="teller" id="teller" aria-live="polite"></p></div>
      <div id="groepen"></div>
    </div></section>`;
};
pagina.fractie.titel = ([wie]) => wie ? "" : "Onze mensen";
pagina.fractie.na = async ([wie]) => {
  if (wie) return;
  const fractie = await laad("fractie");
  const recent = f => {
    const n = s_ => (f.telling && f.telling[s_]) || 0;
    const delen = [[n("raadsvraag"), "keer vragen", "keer vragen"], [n("motie"), "motie", "moties"], [n("amendement"), "amendement", "amendementen"]].filter(d => d[0]).map(d => `${d[0]} ${d[0] === 1 ? d[1] : d[2]}`);
    return delen.length ? `Het afgelopen jaar: ${delen.join(", ")}` : "";
  };
  const rij = f => `<li class="lid-rij">${f.beeld ? `<img src="${esc(f.beeld)}" alt="" loading="lazy" decoding="async">` : `<span class="leeg-foto" aria-hidden="true">${initialen(f.naam)}</span>`}
    <div><h3><a href="${U("fractie/" + slug(f.naam) + "/")}">${esc(f.naam)}</a></h3>${f.functie && !/^raadslid$/i.test(f.functie) ? `<p class="functie">${esc(f.functie)}</p>` : ""}
    ${f.portefeuilles.length ? `<p class="pf">${esc(f.portefeuilles.join(", "))}</p>` : ""}${recent(f) ? `<p class="recent">${recent(f)}</p>` : ""}</div></li>`;
  // het stadsdeel dat de bezoeker eerder koos, komt bovenaan; we filteren er niet stil op
  const bewaard = opslag.lees("stadsdeel");
  const volgorde = bewaard && STADSDELEN.includes(bewaard) ? [bewaard, ...STADSDELEN.filter(s => s !== bewaard)] : STADSDELEN;
  const groepen = [...volgorde.map(sd => [sd, fractie.filter(f => f.stadsdelen.includes(sd))]), ["Hele stad", fractie.filter(f => !f.stadsdelen.length)]];
  const filter = () => {
    const q = PLAT($("#wie").value.trim().toLowerCase()), sdKeuze = $("#wie-sd").value;
    const past = f => (!q || PLAT((f.portefeuilles.join(" ") + " " + f.naam).toLowerCase()).includes(q)) && (!sdKeuze || (sdKeuze === "Hele stad" ? !f.stadsdelen.length : f.stadsdelen.includes(sdKeuze)));
    if (q) {
      const treffers = fractie.filter(past), elders = sdKeuze ? fractie.filter(f => !past(f) && PLAT((f.portefeuilles.join(" ") + " " + f.naam).toLowerCase()).includes(q)) : [];
      $("#groepen").innerHTML = (treffers.length ? `<ul class="leden">${treffers.map(rij).join("")}</ul>` : `<p class="leeg">Niemand gevonden${sdKeuze ? ` in ${esc(sdKeuze)}` : ""}.</p>`) +
        (elders.length ? `<h2 class="groep-kop">In andere stadsdelen</h2><ul class="leden">${elders.map(rij).join("")}</ul>` : "");
      $("#teller").textContent = `${treffers.length} ${treffers.length === 1 ? "raadslid" : "raadsleden"}${sdKeuze ? ` in ${sdKeuze}` : ""}${elders.length ? `, ${elders.length} elders` : ""}`;
      return;
    }
    $("#teller").textContent = sdKeuze ? `${(groepen.find(g => g[0] === sdKeuze) || [0, []])[1].length} raadsleden in ${sdKeuze}` : `${fractie.length} raadsleden`;
    $("#groepen").innerHTML = groepen.filter(g => g[1].length && (!sdKeuze || g[0] === sdKeuze)).map(([sd, mensen]) => `<section class="groep" aria-labelledby="g-${slug(sd)}">
      <h2 class="groep-kop" id="g-${slug(sd)}">${sd === "Hele stad" ? HART : silhouet(sd)}${esc(sd)}${sd === bewaard && !sdKeuze ? ` <small class="uw">uw stadsdeel</small>` : ""}</h2><ul class="leden">${mensen.map(rij).join("")}</ul></section>`).join("");
  };
  $("#wie").addEventListener("input", filter); $("#wie-sd").addEventListener("change", filter);
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
      <p style="margin-top:28px">U bereikt het bestuur via <a href="mailto:${esc(b.mail)}">${esc(b.mail)}</a>. Daar kunt u ook de statuten en het huishoudelijk reglement opvragen.</p></div></section>
    <section><div class="wrap"><div class="kop"><h2>Jaarverslagen en jaarcijfers</h2><p class="inleiding">Open over geld en keuzes: alle verslagen en jaarcijfers op een rij.</p></div>
      <ul class="documenten">${b.stukken.map(s => `<li><a href="${esc(s.link)}" target="_blank" rel="noopener"><span>${esc(s.titel)}</span>${UIT}</a></li>`).join("")}</ul></div></section>`;
};

pagina.agenda = async ([stap], q) => {
  const ag = await agenda();
  if (stap === "aanmelden") {
    const id = q.get("id") || "";
    const a = ag.find(x => String(x.id) === id);
    if (!a) return paginaKop("Aanmelden", "Deze afspraak staat niet (meer) op de agenda.") + `<section><div class="wrap"><a class="knop groen" href="${U("agenda/")}">Naar de agenda</a></div></section>`;
    const x = dt(a.datum);
    return paginaKop("Aanmelden", esc(a.titel), kruimels(["agenda/", "Agenda"], ["", "Aanmelden"])) + `
    <section><div class="wrap formulier-raster">
      <form class="formulier" id="form" novalidate>
        <input type="hidden" name="activiteit" value="${esc(a.titel)}"><input type="hidden" name="datum" value="${esc(a.datum)}">
        <div class="velden">
          <div class="veld"><label for="a-naam">Naam</label><input type="text" id="a-naam" name="naam" autocomplete="name"></div>
          <div class="veld"><label for="a-email">E-mailadres</label><input type="email" id="a-email" name="email" autocomplete="email"></div>
          <div class="veld"><label for="a-tel">Telefoonnummer <small>(niet verplicht)</small></label><input type="tel" id="a-tel" name="telefoon" autocomplete="tel"></div>
          <div class="veld"><label for="a-aantal">Met hoeveel personen?</label><select id="a-aantal" name="aantal">${[1, 2, 3, 4, 5, 6].map(n => `<option>${n}</option>`).join("")}</select></div>
          <div class="veld breed"><label for="a-ber">Vraag of onderwerp dat u wilt bespreken <small>(niet verplicht)</small></label><textarea id="a-ber" name="bericht" maxlength="1500"></textarea></div></div>
        ${akkoordVeld("aanmelding")}<button class="knop groen" type="submit">Meld mij aan</button><p class="uitslag" hidden></p></form>
      <div><h2>${DAG[x.wd][0].toUpperCase() + DAG[x.wd].slice(1)} ${x.d} ${MAAND[x.m]}</h2>
        <ul class="voordelen"><li>${a.tijd ? esc(a.tijd) + " uur" : "Tijd volgt"}</li><li>${esc(a.plek || "")}${a.stadsdeel ? ", " + esc(a.stadsdeel) : ""}</li>${a.samenvatting ? `<li>${esc(a.samenvatting)}</li>` : ""}</ul>
        <p class="melding" style="margin-top:22px">Aanmelden helpt ons met koffie en stoelen. Zonder aanmelden bent u ook welkom.</p>
        <p style="margin-top:14px"><button class="knop lijn klein" type="button" id="ics">Zet in mijn agenda</button></p></div>
    </div></section>`;
  }
  const sd = q.get("stadsdeel") || "";
  const lijst = ag.filter(a => !sd || a.stadsdeel === sd);
  return paginaKop("Agenda en spreekuren", "Spreekuren, wijkschouwen en bijeenkomsten. Loop gerust binnen, of meld u aan.") + `
    <section><div class="wrap">
      <div class="filterrij"><div class="veld"><label for="ag-sd">Stadsdeel</label><select id="ag-sd"><option value="">Alle stadsdelen</option>${STADSDELEN.map(x => `<option${x === sd ? " selected" : ""}>${x}</option>`).join("")}</select></div>
        <p class="teller">${lijst.length} ${lijst.length === 1 ? "afspraak" : "afspraken"}</p></div>
      <h2 class="verborgen">Afspraken</h2>${lijst.length ? `<ol class="agenda-lijst">${lijst.map(agendaItem).join("")}</ol>` : `<p class="leeg">Er staat nu niets op de agenda${sd ? " in " + esc(sd) : ""}.</p>`}
      <p class="melding" style="margin-top:28px">Staat er niets bij u in de buurt? <a href="${U("contact/?onderwerp=spreekuur")}">Vraag een spreekuur aan in uw stadsdeel</a>.</p></div></section>`;
};
pagina.agenda.titel = ([stap]) => stap === "aanmelden" ? "Aanmelden" : "Agenda en spreekuren";
pagina.agenda.na = async ([stap], q) => {
  const ag = await agenda();
  if (stap !== "aanmelden") {
    $("#ag-sd").addEventListener("change", e => gaNaar(U("agenda/" + (e.target.value ? "?stadsdeel=" + encodeURIComponent(e.target.value) : ""))));
    return;
  }
  const a = ag.find(x => String(x.id) === (q.get("id") || ""));
  if (!a) return;
  $("#ics").addEventListener("click", () => icsDownload(a));
  koppelFormulier($("#form"), {
    soort: "aanmelding", concept: "aanmelding",
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

pagina.vacatures = async () => {
  const v = await soort("vacature");
  return paginaKop("Vacatures", "Werken of vrijwilligen voor de grootste lokale partij van Den Haag.") + `
    <section class="wit"><div class="wrap"><h2 class="verborgen">Open vacatures</h2>${v.length ? `<ul class="stukken">${v.map(x => stukItem(x)).join("")}</ul>` : `<p class="leeg">Er staan nu geen vacatures open. Wilt u toch helpen? Meld u aan als vrijwilliger of wijkvertegenwoordiger.</p><p style="margin-top:18px"><a class="knop groen" href="${U("doe-mee/")}">Ik doe mee</a></p>`}</div></section>`;
};

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
        <div class="veld"><label for="f-sd">Ik woon in stadsdeel</label><select id="f-sd" name="stadsdeel">${stadsdeelOpties(opslag.lees("stadsdeel") || "")}</select></div>
        <div class="veld breed"><label for="f-ber">Iets wat we moeten weten? <small>(niet verplicht)</small></label><textarea id="f-ber" name="bericht" maxlength="1500"></textarea></div></div>
      ${akkoordVeld("doemee")}<button class="knop groen" type="submit">Ik doe mee</button><p class="uitslag" hidden></p></form>
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
    soort: "doemee", concept: "doemee",
    eisen: () => ({ takenlijst: v => v ? "" : "Kies minstens één ding dat u wilt doen.", naam: verplicht("Vul uw naam in."), email: mailOfTel, stadsdeel: verplicht("Kies uw stadsdeel, dan zoeken we iemand bij u in de buurt."), akkoord: v => v ? "" : "Vink dit aan, zodat we contact mogen opnemen." }),
    voor: () => ({ rol: "Vrijwilliger" }),
    bedankt: (d, a) => `Dank u wel! Iemand uit ${d.stadsdeel || "uw stadsdeel"} neemt binnenkort contact met u op.${a.kenmerk ? ` Uw kenmerk is ${a.kenmerk}.` : ""}`,
  });
};

// contact en melden. Een melding mag een foto en de plek op de kaart meekrijgen.
const CONTACT_KEUZES = [["melding", "Iets in mijn buurt"], ["contact", "Een vraag aan de fractie"], ["spreekuur", "Spreekuur aanvragen"], ["lidmaatschap", "Lidmaatschap"], ["pers", "Pers en media"], ["anders", "Iets anders"]];
pagina.contact = async ([sub], q) => {
  const onderwerp = sub === "melding" ? "melding" : q.get("onderwerp") || "contact";
  const gekozen = CONTACT_KEUZES.some(k => k[0] === onderwerp) ? onderwerp : "contact";
  const melding = gekozen === "melding";
  const aan = q.get("aan") ? (await laad("fractie")).find(f => slug(f.naam) === q.get("aan")) : null;
  const sd = q.get("stadsdeel") || (melding ? opslag.lees("stadsdeel") || "" : "");
  const hulp = `<div class="keuzehulp" role="note"><p class="tussenkop">Waar kunt u het beste terecht?</p><ul>
      <li><b>Spoed of gevaar?</b> Bel <a href="tel:112">112</a>.</li>
      <li><b>Losse tegel, afval, kapotte lantaarnpaal?</b> Meld het bij de gemeente via <a href="tel:14070">14 070</a> of <a href="https://www.denhaag.nl/nl/melding-openbare-ruimte" target="_blank" rel="noopener">denhaag.nl</a>. Dan komt het direct bij de juiste dienst.</li>
      <li><b>Gebeurt er niets, of gaat het om iets groters?</b> Dan helpen wij. Vul het formulier in.</li></ul></div>`;
  return paginaKop(melding ? "Meld een probleem" : aan ? `Bericht aan ${esc(aan.naam)}` : "Contact", melding ? "Loszittende stoeptegels, overlast, een gevaarlijke oversteek: vertel het ons. Het ombudsteam pakt het op." : "Wij staan open voor uw ideeën en opmerkingen. Vertel ons uw verhaal, dan nemen we zo snel mogelijk contact op.") + `
  <section><div class="wrap formulier-raster">
    <div class="formulier-kolom">${melding ? hulp : ""}
    <form class="formulier" id="form" novalidate>
      <fieldset><legend>Waar gaat uw bericht over?</legend><div class="keuzes">${CONTACT_KEUZES.map((k, i) => `<div class="keuze"><input type="radio" name="onderwerp" id="o${i}" value="${k[0]}"${k[0] === gekozen ? " checked" : ""}><label for="o${i}"><b>${k[1]}</b></label></div>`).join("")}</div></fieldset>
      ${aan ? `<input type="hidden" name="aan" value="${esc(aan.naam)}">` : ""}
      <div class="velden">
        <div class="veld"><label for="c-naam">Naam</label><input type="text" id="c-naam" name="naam" autocomplete="name"></div>
        <div class="veld"><label for="c-tel">Telefoonnummer</label><input type="tel" id="c-tel" name="telefoon" autocomplete="tel"></div>
        <div class="veld"><label for="c-email">E-mailadres</label><input type="email" id="c-email" name="email" autocomplete="email"></div>
        <div class="veld"><label for="c-sd">Stadsdeel</label><select id="c-sd" name="stadsdeel">${stadsdeelOpties(sd)}</select></div>
        <div class="veld breed" id="plek-veld"><label for="c-plek">Waar is het? <small>Straat en huisnummer of een herkenningspunt</small></label>
          <div class="plek-rij"><input type="text" id="c-plek" name="plek" autocomplete="street-address"><button class="knop lijn klein" type="button" id="mijn-plek">Gebruik mijn locatie</button></div>
          <input type="hidden" name="lat" id="c-lat"><input type="hidden" name="lon" id="c-lon"><p class="plek-uitslag" id="plek-uitslag" aria-live="polite"></p></div>
        <div class="veld breed" id="foto-veld"><label for="c-foto">Foto <small>(niet verplicht)</small></label><input type="file" id="c-foto" accept="image/*"><div id="foto-voorbeeld" class="foto-voorbeeld-rij"></div></div>
        <div class="veld breed"><label for="c-ber">Uw bericht</label><textarea id="c-ber" name="bericht" maxlength="1500">${aan ? `Voor ${esc(aan.naam)}: ` : ""}</textarea><small id="teller-tekst">0 van 1500 tekens</small></div></div>
      ${akkoordVeld(melding ? "melding" : "contact")}<button class="knop groen" type="submit">Verstuur bericht</button><p class="uitslag" hidden></p></form></div>
    <div><h2>Bel of mail</h2><ul class="stukken" style="margin-top:20px">
      <li><h3><a href="${TEL_LINK}">${TEL}</a></h3><p class="sam">Voor een snelle vraag</p></li>
      <li><h3><a href="mailto:${MAIL}">${MAIL}</a></h3><p class="sam">Wij lezen elk bericht</p></li>
      <li><h3>Spui 70, Den Haag</h3><p class="sam">Fractiekamer in het stadhuis</p></li></ul>
      ${melding ? "" : `<p class="melding" style="margin-top:22px"><b>Gevaarlijke situatie?</b> Bel 112. Een melding voor de gemeente zelf kan via 14 070 of denhaag.nl.</p>`}
      ${gekozen === "pers" ? `<p class="melding" style="margin-top:22px">Journalist? Op de <a href="${U("pers/")}">perspagina</a> staan persberichten, logo's en foto's.</p>` : ""}</div>
  </div></section>`;
};
pagina.contact.titel = ([sub]) => sub === "melding" ? "Meld een probleem" : "Contact";
// foto verkleinen in de browser (max 1600 pixels, jpeg), zodat een melding snel verstuurt en de achterkant klein blijft
function verklein(bestand, max = 1600, kwaliteit = .82) {
  return new Promise((ok, fout) => {
    const img = new Image(), url = URL.createObjectURL(bestand);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg", kwaliteit));
    };
    img.onerror = () => { URL.revokeObjectURL(url); fout(new Error("geen foto")); };
    img.src = url;
  });
}
pagina.contact.na = () => {
  const form = $("#form");
  let foto = "";
  const zet = () => {
    const m = form.onderwerp.value === "melding";
    $("#plek-veld").hidden = !m; $("#foto-veld").hidden = !m;
    $("#teller-tekst").textContent = `${$("#c-ber").value.length} van 1500 tekens`;
  };
  form.addEventListener("change", zet); form.addEventListener("input", zet); zet();
  $("#c-foto").addEventListener("change", async e => {
    const b = e.target.files && e.target.files[0]; const v = $("#foto-voorbeeld");
    if (!b) { foto = ""; v.innerHTML = ""; return; }
    try {
      foto = await verklein(b);
      v.innerHTML = `<img src="${foto}" alt="Uw foto"><button class="knop lijn klein" type="button" id="foto-weg">Foto weghalen</button>`;
      $("#foto-weg").addEventListener("click", () => { foto = ""; v.innerHTML = ""; $("#c-foto").value = ""; $("#c-foto").focus(); });
    } catch { foto = ""; zetFout($("#c-foto"), "Deze foto kunnen we niet lezen. Probeer een andere."); }
  });
  $("#mijn-plek").addEventListener("click", () => {
    const uit = $("#plek-uitslag");
    if (!navigator.geolocation) { uit.textContent = "Uw browser kan uw locatie niet doorgeven. Typ de straat in."; return; }
    uit.textContent = "Locatie zoeken…";
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      $("#c-lat").value = lat.toFixed(6); $("#c-lon").value = lon.toFixed(6);
      try {
        const r = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse?lat=${lat}&lon=${lon}&rows=1&type=adres&fl=weergavenaam,wijknaam,gemeentenaam`);
        const doc = (await r.json()).response.docs[0];
        if (doc && /gravenhage/i.test(doc.gemeentenaam || "")) {
          $("#c-plek").value = doc.weergavenaam.replace(/,\s*\d{4}\s?[A-Z]{2}\s*'s-Gravenhage$/, "");
          const wijk = String(doc.wijknaam || "").replace(/^Wijk \d+\s*/, "");
          const k = await laad("kaart"), sdNaam = Object.keys(k.sd).find(n => (k.sd[n].wijken || []).includes(wijk));
          if (sdNaam) $("#c-sd").value = sdNaam;
          uit.textContent = `Gevonden: ${doc.weergavenaam}. Klopt het niet precies? Pas de straat aan.`;
          form.dispatchEvent(new Event("input"));
        } else uit.textContent = "Deze plek ligt niet in Den Haag, of we vonden geen adres. Typ de straat in.";
      } catch { uit.textContent = "Het adres zoeken lukte niet. Typ de straat in."; }
    }, () => { uit.textContent = "We kregen uw locatie niet. Typ de straat in."; }, { enableHighAccuracy: true, timeout: 10000 });
  });
  koppelFormulier(form, {
    soort: d => d.onderwerp === "melding" ? "melding" : "contact", concept: "contact",
    eisen: d => ({
      naam: verplicht("Vul uw naam in."), email: mailOfTel,
      plek: v => d.onderwerp === "melding" && !v ? "Waar is het? Een straat of herkenningspunt is genoeg." : "",
      stadsdeel: v => d.onderwerp === "melding" && !v ? "Kies het stadsdeel, dan komt het bij de juiste raadsleden." : "",
      bericht: v => v.replace(/^Voor [^:]+:\s*/, "").length < 10 ? "Vertel in een paar woorden waar het over gaat." : "",
      akkoord: v => v ? "" : "Vink dit aan, zodat we mogen reageren.",
    }),
    voor: d => d.onderwerp === "melding" ? { foto: foto || undefined, lat: d.lat || undefined, lon: d.lon || undefined } : { lat: undefined, lon: undefined },
    bedankt: (d, a) => d.onderwerp === "melding" ? `Dank u wel! Uw melding over ${d.stadsdeel} is binnen.${a.kenmerk ? ` Uw kenmerk is ${a.kenmerk}; noem het als u ons belt of mailt.` : ""} Het ombudsteam kijkt ernaar en laat van zich horen.` : `Dank u wel! Uw bericht is binnen.${a.kenmerk ? ` Uw kenmerk is ${a.kenmerk}.` : ""} We reageren zo snel mogelijk.`,
    na: () => { foto = ""; $("#foto-voorbeeld").innerHTML = ""; $("#plek-uitslag").textContent = ""; },
  });
};

// lid worden in drie stappen; elke stap is een eigen adres (?stap=2), zodat Terug in de browser werkt
const LID = {
  silver: { naam: "Silvermember", bedrag: 12.5, uitleg: "€ 12,50 per jaar. Het gewone lidmaatschap, met het speldje als welkomstcadeau." },
  gold: { naam: "Goldmember", bedrag: 25, uitleg: "€ 25 per jaar. Dezelfde rechten als Silver: u steunt de partij met een hogere bijdrage." },
  ouder: { naam: "Ouderenlid, vanaf 65 jaar", bedrag: 6.7, vervolg: 12.5, uitleg: "€ 6,70 het eerste jaar, daarna € 12,50 per jaar." },
  jong: { naam: "Jongeren voor Den Haag", bedrag: 12.5, uitleg: "Lid van de jongerenbeweging. U kiest zelf: € 12,50 of € 25 per jaar." },
};
const lidBedrag = f => f.soort.value === "jong" && f.jongbedrag && f.jongbedrag.value === "25" ? { ...LID.jong, bedrag: 25 } : LID[f.soort.value];
pagina.lid = async () => paginaKop("Word lid", "Met meer leden zijn we sterker. Als lid praat u mee en kiest u mee over bestuur en kandidaat-raadsleden.") + `
  <section><div class="wrap formulier-raster">
    <form class="formulier stappen" id="form" novalidate>
      <ol class="stappenbalk" aria-label="Voortgang"><li aria-current="step">Keuze</li><li>Gegevens</li><li>Betalen</li></ol>
      <fieldset class="stap" data-stap="1"><legend>Kies uw lidmaatschap</legend><div class="keuzes">
        ${Object.entries(LID).map(([k, v], i) => `<div class="keuze"><input type="radio" name="soort" id="s${i}" value="${k}"${i === 0 ? " checked" : ""}><label for="s${i}"><b>${v.naam}</b><span>${v.uitleg}</span></label></div>`).join("")}</div>
        <div class="veld" id="jong-veld" hidden><fieldset><legend class="label">Bijdrage voor Jongeren voor Den Haag</legend><div class="keuzes kort">
          <div class="keuze"><input type="radio" name="jongbedrag" id="jb1" value="12.5" checked><label for="jb1"><b>€ 12,50 per jaar</b></label></div>
          <div class="keuze"><input type="radio" name="jongbedrag" id="jb2" value="25"><label for="jb2"><b>€ 25 per jaar</b></label></div></div></fieldset></div>
        <label class="vink" id="ouder-veld" hidden><input type="checkbox" name="vijfenzestig" id="l-65" value="1"><span>Ik ben 65 jaar of ouder.</span></label>
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
        <div class="keuze"><input type="radio" name="betaal" id="b2" value="ideal"><label for="b2"><b>Elk jaar zelf</b><span>U krijgt elk jaar een betaalverzoek</span></label></div></div>
        <div class="overzicht" id="overzicht" aria-live="polite"></div>
        <div class="knoppen"><button class="knop lijn" type="button" data-naar="2">Terug</button><button class="knop geel" type="submit" id="lid-knop">Betaal met iDEAL</button></div>
        <p class="uitslag" hidden></p></fieldset>
    </form>
    <div><h2>Wat u krijgt</h2><ul class="voordelen">
      <li>Een stem op de Algemene Ledenvergadering.</li>
      <li>Mee beslissen over het bestuur en de kandidaat-raadsleden.</li>
      <li>Een uitnodiging voor al onze (leden)evenementen.</li>
      <li>Het speldje met de groen-gele hartjes, als welkomstcadeau.</li></ul>
      <details class="hoe klein" style="margin-top:20px"><summary>Vragen over lidmaatschap</summary>
        <p><b>Opzeggen?</b> Dat kan altijd met een mail aan <a href="mailto:${MAIL_BESTUUR}">${MAIL_BESTUUR}</a>. U krijgt geen geld terug en blijft lid tot het einde van de betaalde periode.</p>
        <p><b>Statuten en huishoudelijk reglement?</b> Vraag ze op bij het bestuur via hetzelfde adres.</p>
        <p><b>Wat gebeurt er met mijn gegevens?</b> Uw aanmelding en betaling lopen via onze betaalpartner Mollie. De ledenadministratie van de vereniging neemt uw gegevens daaruit over. De website bewaart zelf geen ledengegevens. Lidmaatschap van een partij zegt iets over uw politieke voorkeur; we geven het aan niemand door.</p>
        <p>Andere vraag? <a href="${U("contact/?onderwerp=lidmaatschap")}">Stel hem hier</a>.</p></details></div>
  </div></section>`;
pagina.lid.na = (args, q) => {
  const f = $("#form");
  const toonStap = n => {
    $$(".stap", f).forEach(x => x.hidden = x.dataset.stap !== String(n));
    $$(".stappenbalk li", f).forEach((li, i) => { if (i + 1 === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current"); li.classList.toggle("klaar", i + 1 < n); });
    if (n === 3) {
      const l = lidBedrag(f), auto = f.betaal.value === "incasso";
      const vervolg = l.vervolg ? `daarna € ${euro(l.vervolg)} per jaar` : `daarna elk jaar € ${euro(l.bedrag)}`;
      $("#overzicht").innerHTML = `<p><b>${esc(l.naam)}</b></p><p>Nu: € ${euro(l.bedrag)} met iDEAL.</p><p>${auto ? `Daarna schrijven we automatisch af: ${vervolg.replace(/^daarna /, "")}.` : `Volgend jaar krijgt u een betaalverzoek van € ${euro(l.vervolg || l.bedrag)}.`}</p>`;
      $("#lid-knop").textContent = `Betaal € ${euro(l.bedrag)} met iDEAL`;
    }
  };
  const zetKeuze = () => { $("#jong-veld").hidden = f.soort.value !== "jong"; $("#ouder-veld").hidden = f.soort.value !== "ouder"; };
  const eisen1 = { vijfenzestig: v => f.soort.value === "ouder" && !v ? "Het ouderenlidmaatschap is voor wie 65 jaar of ouder is. Vink dit aan, of kies Silver of Gold." : "" };
  const eisen2 = { naam: verplicht("Vul uw naam in."), email: v => EMAIL.test(v) ? "" : "Vul een geldig e-mailadres in.", postcode: v => /^\d{4}\s?[a-z]{2}$/i.test(v) ? "" : "Vul uw postcode in, bijvoorbeeld 2511 BT.", huisnummer: verplicht("Vul uw huisnummer in.") };
  const naar = (n, push = true) => {
    if (n >= 2 && !controleer(f, eisen1)) n = 1;
    else if (n === 3 && !controleer(f, eisen2)) n = 2;
    toonStap(n);
    const url = U("lid/" + (n > 1 ? "?stap=" + n : ""));
    if (push && location.pathname + location.search !== url) history.pushState({ lidStap: n }, "", url);
    const leg = $(`.stap[data-stap="${n}"] legend`, f); if (leg) { leg.tabIndex = -1; leg.focus(); }
  };
  f.lidNaar = n => toonStap(n);
  f.addEventListener("input", e => { if (e.target.getAttribute("aria-invalid")) zetFout(e.target, ""); });
  f.addEventListener("change", () => { zetKeuze(); if (!$(".stap[data-stap='3']", f).hidden) toonStap(3); });
  $$("[data-naar]", f).forEach(b => b.addEventListener("click", () => naar(Number(b.dataset.naar))));
  // postcode vult het stadsdeel vanzelf in
  $("#l-pc").addEventListener("change", async e => {
    const pc = e.target.value.replace(/\s+/g, "").toUpperCase(); if (!/^\d{4}[A-Z]{2}$/.test(pc)) return;
    const sd = await stadsdeelVanPostcode(pc); if (sd && !$("#l-sd").value) { $("#l-sd").value = sd; $("#l-sd-hint").textContent = "Ingevuld op basis van uw postcode."; }
  });
  bewaarConcept(f, "lid");
  f.addEventListener("submit", e => {
    e.preventDefault();
    const stap = Number($(".stap:not([hidden])", f).dataset.stap);
    if (stap < 3) return naar(stap + 1);
    if (!controleer(f, eisen1)) return naar(1);
    if (!controleer(f, eisen2)) return naar(2);
    betaal(f, "lid", { lid: f.soort.value === "jong" && f.jongbedrag.value === "25" ? "jonggold" : f.soort.value, betaal: f.betaal.value });
  });
  zetKeuze();
  const start = Number(q.get("stap")) || 1;
  if (start > 1) naar(start, false); else toonStap(1);
};

// doneren: het bedrag mag met een komma (12,50) of een punt; boven € 250 vragen we om een bevestiging
const leesBedrag = v => { const t = String(v || "").trim().replace(/[€\s]/g, ""); if (!/^\d{1,5}([.,]\d{1,2})?$/.test(t)) return NaN; return Math.round(Number(t.replace(",", ".")) * 100) / 100; };
pagina.doneren = async () => paginaKop("Doneren", "Geen lid, wel steunen? Elke bijdrage gaat naar acties in de wijk, het ombudsteam en campagnemateriaal.") + `
  <section><div class="wrap formulier-raster">
    <form class="formulier" id="form" novalidate>
      <fieldset><legend>Hoe vaak?</legend><div class="keuzes kort">
        <div class="keuze"><input type="radio" name="vaak" id="v1" value="eenmalig" checked><label for="v1"><b>Eenmalig</b></label></div>
        <div class="keuze"><input type="radio" name="vaak" id="v2" value="maandelijks"><label for="v2"><b>Maandelijks</b></label></div></div></fieldset>
      <fieldset><legend>Bedrag</legend><div class="keuzes drie">
        ${[10, 25, 50, 100, 250].map((b, i) => `<div class="keuze"><input type="radio" name="bedrag" id="d${i}" value="${b}"${b === 25 ? " checked" : ""}><label for="d${i}"><b>€ ${b}</b></label></div>`).join("")}
        <div class="keuze"><input type="radio" name="bedrag" id="d9" value="eigen"><label for="d9"><b>Ander bedrag</b></label></div></div>
        <div class="veld" id="eigen-veld" hidden><label for="d-eigen">Uw bedrag in euro <small>(bijvoorbeeld 12,50)</small></label><div class="bedrag-rij"><span aria-hidden="true">€</span><input type="text" id="d-eigen" name="eigen" inputmode="decimal" autocomplete="off" maxlength="9"></div><small id="d-lees" aria-live="polite"></small></div></fieldset>
      <div class="velden">
        <div class="veld"><label for="d-naam">Naam</label><input type="text" id="d-naam" name="naam" autocomplete="name"></div>
        <div class="veld"><label for="d-plaats">Woonplaats</label><input type="text" id="d-plaats" name="plaats" autocomplete="address-level2"></div>
        <div class="veld breed"><label for="d-email">E-mailadres</label><input type="email" id="d-email" name="email" autocomplete="email"></div></div>
      <label class="vink" id="groot-veld" hidden><input type="checkbox" name="grootbevestigd" id="d-groot" value="1"><span id="groot-tekst"></span></label>
      <button class="knop geel" type="submit" id="doneer-knop">Doneer € 25 met iDEAL</button><p class="uitslag" hidden></p></form>
    <div><h2>Waar uw geld heen gaat</h2><ul class="voordelen">
      <li>Schouwen, bewonersavonden en spreekuren in alle acht stadsdelen.</li>
      <li>Het ombudsteam, zodat meldingen van bewoners snel worden opgepakt.</li>
      <li>Posters, flyers en filmpjes voor de campagne.</li></ul>
      <p class="melding" style="margin-top:22px">Maandelijks geven gaat zo: de eerste keer betaalt u met iDEAL, daarna schrijven we het bedrag elke maand af. Stoppen kan altijd met één mail aan <a href="mailto:${MAIL_BESTUUR}">${MAIL_BESTUUR}</a>.</p>
      <p class="leeg" style="margin-top:14px">Giften aan politieke partijen vallen onder regels voor openheid. Daarom vragen we altijd uw naam en woonplaats. Anonieme giften nemen we niet aan. Wilt u meer dan € 1.000 geven? Neem dan eerst contact op met de penningmeester via <a href="mailto:${MAIL_BESTUUR}">${MAIL_BESTUUR}</a>.</p></div>
  </div></section>`;
pagina.doneren.na = () => {
  const f = $("#form");
  const bedrag = () => f.bedrag.value === "eigen" ? leesBedrag($("#d-eigen").value) : Number(f.bedrag.value);
  const zet = () => {
    $("#eigen-veld").hidden = f.bedrag.value !== "eigen";
    const b = bedrag(), maand = f.vaak.value === "maandelijks";
    const geldig = b >= 1 && b <= 1000;
    $("#d-lees").textContent = f.bedrag.value === "eigen" && $("#d-eigen").value ? (isNaN(b) ? "Typ alleen een bedrag, bijvoorbeeld 12,50." : `U geeft € ${euro(b)}${maand ? " per maand" : ""}.`) : "";
    $("#doneer-knop").textContent = geldig ? `Doneer € ${euro(b)}${maand ? " per maand" : ""} met iDEAL` : "Kies een bedrag";
    const groot = geldig && (maand ? b > 50 : b > 250);
    $("#groot-veld").hidden = !groot;
    if (groot) $("#groot-tekst").textContent = `Ja, ik wil € ${euro(b)}${maand ? " per maand (€ " + euro(b * 12) + " per jaar)" : ""} geven.`;
  };
  f.addEventListener("input", zet); f.addEventListener("change", zet); zet();
  bewaarConcept(f, "doneren");
  f.addEventListener("submit", e => {
    e.preventDefault();
    const b = bedrag();
    if (!controleer(f, {
      eigen: () => f.bedrag.value !== "eigen" ? "" : isNaN(b) || b < 1 ? "Vul een bedrag in van minstens € 1, bijvoorbeeld 12,50." : b > 1000 ? "Voor een gift boven € 1.000 neemt u eerst contact op met de penningmeester." : "",
      naam: verplicht("Vul uw naam in. Anonieme giften nemen we niet aan."), plaats: verplicht("Vul uw woonplaats in."), email: v => EMAIL.test(v) ? "" : "Vul een geldig e-mailadres in.",
      grootbevestigd: v => !$("#groot-veld").hidden && !v ? "Bevestig het bedrag, zodat u zeker weet dat het klopt." : "",
    })) return;
    betaal(f, "doneren", { bedrag: b, maandelijks: f.vaak.value === "maandelijks" });
  });
};

// Betalen via de achterkant. Staat de Mollie-sleutel er nog niet, dan zegt de achterkant "demo" en tonen we dat eerlijk.
async function betaal(f, soortBetaling, extra) {
  const uit = $(".uitslag", f), knop = $("button[type=submit]", f), label = knop.textContent;
  const data = Object.fromEntries(new FormData(f).entries());
  knop.disabled = true; knop.textContent = "Even geduld…";
  try {
    const robot = await robotToken();
    const r = await fetch(API + "/betaling", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ soort: soortBetaling, naam: data.naam, email: data.email, plaats: data.plaats || "", ...extra, ...(robot ? { "cf-turnstile-response": robot } : {}) }) });
    const d = await r.json().catch(() => ({}));
    if (d.ok && d.checkout) { opslag.sWeg("concept:" + (soortBetaling === "lid" ? "lid" : "doneren")); f.dataset.vuil = ""; location.href = d.checkout; return; }
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

// zoeken: in alles sinds 2012, met filters op soort, sorteren, en een suggestie bij een tikfout
const ZOEK_SOORTEN = [["", "Alles"], ["nieuws", "Nieuws"], ["succes", "Successen"], ["motie", "Moties"], ["raadsvraag", "Vragen"], ["amendement", "Amendementen"], ["spreektekst", "Spreekteksten"], ["petitie", "Petities"]];
const afstand = (a, b) => { if (Math.abs(a.length - b.length) > 2) return 9; const r = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let vorige = r[0]; r[0] = i; for (let j = 1; j <= b.length; j++) { const t = r[j]; r[j] = Math.min(r[j] + 1, r[j - 1] + 1, vorige + (a[i - 1] === b[j - 1] ? 0 : 1)); vorige = t; } } return r[b.length]; };
pagina.zoeken = async (args, q) => {
  const term = (q.get("q") || "").trim(), welk = q.get("soort") || "", sorteer = q.get("sorteer") || "";
  const [idx, nieuw] = await Promise.all([laad("zoekindex"), eigen()]);
  const woorden = PLAT(term.toLowerCase()).split(/\s+/).filter(w => w.length > 1);
  const alles = [...nieuw.filter(i => SOORT[i.soort] && i.soort !== "agenda").map(i => ({ id: i.id, s: i.soort, t: i.titel, d: i.datum, x: i.samenvatting, sd: i.stadsdelen })), ...idx];
  let treffers = woorden.length ? alles.map(i => {
    const t = PLAT(i.t.toLowerCase()), x = PLAT((i.x || "").toLowerCase() + " " + (i.sd || []).join(" ").toLowerCase() + " " + (i.i || "").toLowerCase());
    if (!woorden.every(w => t.includes(w) || x.includes(w))) return null;
    return { ...i, score: woorden.reduce((s, w) => s + (t.includes(w) ? 5 : 1), 0) };
  }).filter(Boolean) : [];
  const perSoort = {}; treffers.forEach(i => { perSoort[i.s] = (perSoort[i.s] || 0) + 1; });
  if (welk) treffers = treffers.filter(i => i.s === welk);
  treffers.sort(sorteer === "datum" ? (a, b) => b.d.localeCompare(a.d) : (a, b) => b.score - a.score || b.d.localeCompare(a.d));
  // bedoelde u: het dichtstbijzijnde woord uit de titels, alleen als er niets gevonden is
  let suggestie = "";
  if (woorden.length && !treffers.length && !welk) {
    const tel = {}; for (const i of idx) for (const w of PLAT(i.t.toLowerCase()).split(/[^a-z0-9-]+/)) if (w.length > 3) tel[w] = (tel[w] || 0) + 1;
    suggestie = woorden.map(w => { if (tel[w]) return w; let best = w, score = 3; for (const [k, n] of Object.entries(tel)) { const a = afstand(w, k); if (a < score || (a === score && n > (tel[best] || 0))) { best = k; score = a; } } return best; }).join(" ");
    if (suggestie === woorden.join(" ")) suggestie = "";
  }
  const licht = s => {
    if (!woorden.length) return esc(s);
    const re = new RegExp("(" + woorden.map(escRe).join("|") + ")", "gi");
    const p = PLAT(String(s)); let uit = "", pos = 0, m;
    while ((m = re.exec(p))) { uit += esc(String(s).slice(pos, m.index)) + `<mark>${esc(String(s).slice(m.index, m.index + m[0].length))}</mark>`; pos = m.index + m[0].length; }
    return uit + esc(String(s).slice(pos));
  };
  const knipsel = x => { const l = PLAT((x || "").toLowerCase()); const p = Math.max(0, l.indexOf(woorden[0] || "") - 60); const k = x.slice(p, p + 220); return (p ? "…" : "") + k.slice(0, k.lastIndexOf(" ") > 150 ? k.lastIndexOf(" ") : k.length) + "…"; };
  const href = (extra) => { const p = new URLSearchParams({ q: term, ...(welk ? { soort: welk } : {}), ...(sorteer ? { sorteer } : {}), ...extra }); for (const [k, v] of [...p]) if (!v) p.delete(k); return U("zoeken/?" + p); };
  const totaal = Object.values(perSoort).reduce((a, b) => a + b, 0);
  pagina.zoeken.lijst = treffers.map(i => `<li><h3><a href="${U(i.p || "s/" + encodeURIComponent(i.id) + "/")}" data-stuk="${esc(i.id)}">${licht(i.t)}</a></h3><p class="bijschrift">${i.sd && i.sd.length ? `<span class="plek">${esc(i.sd.join(" en "))}</span>` : ""}<span>${esc(SOORT[i.s].naam)}</span>${i.st ? `<span class="status">${esc(i.st)}</span>` : ""}<time datetime="${esc(i.d)}">${datum(i.d)}</time></p><p class="sam">${licht(knipsel(i.x || ""))}</p></li>`);
  return paginaKop("Zoeken", term ? `${fmt.format(totaal)} ${totaal === 1 ? "resultaat" : "resultaten"} voor "${esc(term)}"` : "Zoek in al het nieuws, de successen, het raadswerk en de petities sinds 2012.") + `
    <section class="wit"><div class="wrap">
      <form id="zoek2" role="search" class="zoek2" action="${U("zoeken/")}"><label class="verborgen" for="zoek2-veld">Zoekterm</label><input type="search" id="zoek2-veld" name="q" value="${esc(term)}" placeholder="Bijvoorbeeld Moerwijk, parkeren of Kwartellaan"><button class="knop groen klein" type="submit">Zoeken</button></form>
      ${term ? `<nav class="filters" aria-label="Soort">${ZOEK_SOORTEN.filter(([s]) => !s || perSoort[s]).map(([s, n]) => `<a class="knopje" href="${href({ soort: s })}"${s === welk ? ' aria-current="page"' : ""}>${n}${s ? ` <small>${fmt.format(perSoort[s])}</small>` : ""}</a>`).join("")}</nav>
      <p class="sorteer">Sorteer op: ${sorteer === "datum" ? `<a href="${href({ sorteer: "" })}">beste treffer</a> · <b>nieuwste eerst</b>` : `<b>beste treffer</b> · <a href="${href({ sorteer: "datum" })}">nieuwste eerst</a>`}</p>` : ""}
      ${term && !treffers.length ? `<p class="leeg">Niets gevonden${welk ? " in deze soort" : ""}.${suggestie ? ` Bedoelde u <a href="${U("zoeken/?q=" + encodeURIComponent(suggestie))}"><b>${esc(suggestie)}</b></a>?` : " Probeer een ander woord, of zoek op een straat of wijk."}</p>` : ""}
      <h2 class="verborgen">Resultaten</h2><ul class="stukken zoek-treffer" id="zoek-lijst"></ul>
      <button class="knop lijn meer-laden" type="button" id="zoek-meer" hidden>Meer resultaten</button>
      <p class="teller" id="zoek-teller" aria-live="polite"></p>
    </div></section>`;
};
pagina.zoeken.titel = (args, q) => q.get("q") ? `Zoeken: ${q.get("q")}` : "Zoeken";
pagina.zoeken.na = () => {
  const lijst = pagina.zoeken.lijst || [], stap = 30, sleutel = lijstSleutel();
  let n = Math.max(stap, Number(opslag.sLees(sleutel)) || stap);
  const teken = () => { $("#zoek-lijst").innerHTML = lijst.slice(0, n).join(""); $("#zoek-meer").hidden = n >= lijst.length; $("#zoek-teller").textContent = lijst.length ? `${fmt.format(Math.min(n, lijst.length))} van ${fmt.format(lijst.length)}` : ""; };
  teken();
  $("#zoek-meer").addEventListener("click", () => { n += stap; opslag.sZet(sleutel, n); teken(); });
  $("#zoek2").addEventListener("submit", e => { e.preventDefault(); const t = $("#zoek2-veld").value.trim(); if (t) gaNaar(U("zoeken/?q=" + encodeURIComponent(t))); });
};

pagina.bedankt = async ([soortBetaling]) => paginaKop("Dank u wel!", soortBetaling === "lid" ? "Welkom bij Hart voor Den Haag. U krijgt een bevestiging per mail zodra de betaling rond is." : "Uw steun komt goed terecht. U krijgt een bevestiging per mail zodra de betaling rond is.") + `
  <section><div class="wrap"><p class="melding">Ging er iets mis bij het betalen? Dan is er niets afgeschreven. Probeer het opnieuw of bel <a href="${TEL_LINK}">${TEL}</a>.</p>
  <div class="knoppen" style="margin-top:22px"><a class="knop groen" href="${U()}">Naar de voorpagina</a><a class="knop lijn" href="${WA_KANAAL}" target="_blank" rel="noopener">Volg ons WhatsApp-kanaal</a></div></div></section>`;
pagina.bedankt.titel = () => "Dank u wel";

pagina.privacy = async () => paginaKop("Privacy", "Hoe Hart voor Den Haag met uw gegevens omgaat op deze site.") + `
  <section class="wit"><div class="wrap artikel"><div class="artikel-tekst">
    <h2>Wie is verantwoordelijk</h2>
    <p>Deze site is van Hart voor Den Haag. De vereniging achter de partij, Vereniging Groep de Mos, is verantwoordelijk voor wat er met uw gegevens gebeurt. U bereikt ons via <a href="mailto:${MAIL}">${MAIL}</a> of <a href="${TEL_LINK}">${TEL}</a>, en het bestuur via <a href="mailto:${MAIL_BESTUUR}">${MAIL_BESTUUR}</a>.</p>
    <h2>Geen cookies, geen volgen</h2>
    <p>Deze site plaatst geen cookies en volgt u niet. We tellen wel hoe vaak een pagina wordt bekeken: per dag een getal per pagina, zonder IP-adres of iets anders dat naar u leidt. Uw keuze voor een stadsdeel en wat u in een formulier typt, onthoudt alleen uw eigen browser.</p>
    <h2>Wat u invult</h2>
    <p>Wat u invult in een formulier (contact, melding, doe mee, aanmelding, petitie, nieuwsbrief) komt in een afgeschermd postvak dat alleen de redactie van Hart voor Den Haag kan inzien. We gebruiken het alleen voor het doel van dat formulier en geven het niet aan anderen. Een foto bij een melding is alleen voor de redactie zichtbaar.</p>
    <p>Een handtekening onder een petitie en een lidmaatschap zeggen iets over uw politieke voorkeur. Daar gaan we extra zorgvuldig mee om. De website bewaart zelf geen ledengegevens: een aanmelding als lid loopt via onze betaalpartner Mollie en de ledenadministratie van de vereniging.</p>
    <h2>Hoe lang we het bewaren</h2>
    <p>Berichten, meldingen, aanmeldingen en handtekeningen wissen we na een jaar automatisch. Een aanmelding voor de nieuwsbrief bewaren we tot u zich afmeldt.</p>
    <h2>Wie ons helpt</h2>
    <ul>
      <li><b>Cloudflare</b> bewaart de formulieren en de berichten van de redactie.</li>
      <li><b>GitHub</b> host de pagina's van deze site.</li>
      <li><b>Mollie</b> verwerkt betalingen voor lidmaatschap en giften.</li>
      <li><b>PDOK</b> (de overheid) zoekt bij een postcode of locatie de wijk op. Alleen als u daar zelf om vraagt.</li>
      <li><b>Google Vertalen</b> opent de site in een andere taal, alleen als u een taal kiest onderaan de pagina.</li>
    </ul>
    <p>Lettertypen en scripts komen van deze site zelf, niet van Google of andere partijen. Foto's en pdf's komen nog van hartvoordenhaag.nl.</p>
    <h2>Uw rechten</h2>
    <p>U mag weten welke gegevens we van u hebben, ze laten verbeteren of laten wissen. Mail <a href="mailto:${MAIL}">${MAIL}</a>. Bent u niet tevreden over hoe we ermee omgaan, dan kunt u een klacht indienen bij de <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener">Autoriteit Persoonsgegevens</a>.</p>
    <p class="leeg">Laatst bijgewerkt: 29 oktober 2026.</p>
  </div></div></section>`;

pagina.toegankelijkheid = async () => paginaKop("Toegankelijkheid", "Deze site moet voor iedereen werken, ook op een oudere telefoon of met een schermlezer.") + `
  <section class="wit"><div class="wrap artikel"><div class="artikel-tekst">
    <p>We bouwen volgens de richtlijnen voor toegankelijkheid (WCAG 2.2, niveau AA): tekst met voldoende contrast, alles te bedienen met het toetsenbord, knoppen van minstens 44 pixels groot en zichtbare focus.</p>
    <h2>Hoe we het controleren</h2>
    <p>Op 29 oktober 2026 hebben we alle pagina's op een telefoon en een computer automatisch getest (axe-core en Lighthouse) en met de hand nagelopen met het toetsenbord. Er kwamen geen ernstige fouten uit; kleine punten zijn opgelost.</p>
    <h2>Wat nog niet goed is</h2>
    <ul><li>Foto's die van hartvoordenhaag.nl komen, hebben meestal geen beschrijving. Nieuwe foto's krijgen er een.</li>
      <li>Oudere pdf's (jaarverslagen, verkiezingsprogramma) zijn niet altijd goed leesbaar met een schermlezer.</li></ul>
    <p>De film bovenaan speelt zonder geluid. Op een telefoon, of als u "minder beweging" hebt ingesteld, start hij pas als u op Speel film af tikt.</p>
    <p>Loopt u ergens tegenaan? Laat het ons weten via <a href="${U("contact/")}">het contactformulier</a> of bel <a href="${TEL_LINK}">${TEL}</a>.</p>
  </div></div></section>`;

pagina.pers = async () => {
  const nieuws = (await soort("nieuws")).slice(0, 6);
  return paginaKop("Pers", "Voor journalisten: persberichten, contact en beeld.") + `
  <section class="wit"><div class="wrap formulier-raster links">
    <div><h2>Contact voor de pers</h2>
      <p class="inleiding">Bel of mail de fractie, dan brengen we u snel in contact met het raadslid over uw onderwerp.</p>
      <ul class="stukken" style="margin-top:12px"><li><h3><a href="${TEL_LINK}">${TEL}</a></h3><p class="sam">Fractie Hart voor Den Haag, stadhuis Spui 70</p></li><li><h3><a href="mailto:${MAIL}">${MAIL}</a></h3><p class="sam">Vermeld uw medium en deadline</p></li></ul>
      <p style="margin-top:14px"><a class="meer" href="${U("fractie/")}">Wie gaat waarover ${PIJL}</a></p></div>
    <div><h2>Logo en foto's</h2>
      <ul class="documenten"><li><a href="${U("beeld/logo.svg")}" download><span>Logo Hart voor Den Haag (svg)</span>${UIT}</a></li>
        <li><a href="${U("beeld/logo-wit.svg")}" download><span>Logo in wit, voor een donkere achtergrond (svg)</span>${UIT}</a></li>
        <li><a href="${U("beeld/groep.jpg")}" download><span>Groepsfoto van de fractie (jpg)</span>${UIT}</a></li></ul>
      <p class="leeg" style="margin-top:12px">Portretten van de raadsleden staan op hun eigen pagina bij <a href="${U("fractie/")}">Onze mensen</a>. Gebruik met vermelding van Hart voor Den Haag.</p></div>
  </div></section>
  <section><div class="wrap"><div class="sectie-kop"><h2>Laatste persberichten</h2><a class="meer" href="${U("nieuws/")}">Al het nieuws ${PIJL}</a></div>
    <ul class="stukken">${nieuws.map(i => stukItem({ ...i, samenvatting: "" })).join("")}</ul>
    <p style="margin-top:18px"><a class="meer" href="${U("feed.xml")}">Volg ons nieuws met RSS ${UIT}</a> · <a class="meer" href="${U("raadswerk/")}">Moties en vragen</a></p></div></section>`;
};

pagina.english = async () => `<div lang="en">${paginaKop("Hart voor Den Haag in English", "The largest local party in The Hague. Close to residents in every district.", kruimels(["", "In English"]))}
  <section class="wit"><div class="wrap artikel"><div class="artikel-tekst">
    <p>Hart voor Den Haag (Heart for The Hague) is a local political party. We only do The Hague: no national party tells us what to do. Our sixteen council members visit neighbourhoods, hold office hours in every district and take residents' problems to the city council. We call that <i>ombudspolitiek</i>: politics that solves problems.</p>
    <h2>What we stand for</h2>
    <ul><li>Affordable homes, with priority for people who live or work in The Hague.</li><li>Safe streets: more enforcement officers and a tough approach to explosions and street violence.</li><li>A clean city with affordable parking and good care for older residents.</li><li>Residents get a real say in big projects in their neighbourhood.</li></ul>
    <h2>Can I vote or join if I am not Dutch?</h2>
    <p>EU citizens living in The Hague can vote in municipal elections. Other non-Dutch residents can vote after living in the Netherlands legally for five years. Anyone can become a member or volunteer.</p>
    <h2>Contact</h2>
    <p>Call <a href="${TEL_LINK}">${TEL}</a> or email <a href="mailto:${MAIL}">${MAIL}</a>. You may write in English. To read the rest of this site in English, choose English at the bottom of the page.</p>
    <p class="knoppen"><a class="knop geel" href="${U("lid/")}">Become a member</a><a class="knop lijn" href="${U("contact/melding/")}">Report a problem</a></p>
  </div></div></section></div>`;
pagina.english.titel = () => "In English";

pagina.nietgevonden = async () => paginaKop("Deze pagina bestaat niet (meer)", "Misschien is het adres veranderd, of zit er een tikfout in.") + `
  <section class="wit"><div class="wrap">
    <form class="zoek2" role="search" id="zoek404" action="${U("zoeken/")}"><label for="zoek404-veld">Zoek op de site</label><input type="search" id="zoek404-veld" name="q" placeholder="Bijvoorbeeld parkeren of Moerwijk"><button class="knop groen klein" type="submit">Zoeken</button></form>
    <ul class="dossiers" style="margin-top:26px"><li><a href="${U("nieuws/")}"><b>Nieuws</b>${PIJL}</a></li><li><a href="${U("raadswerk/")}"><b>Raadswerk</b>${PIJL}</a></li><li><a href="${U("stadsdelen/")}"><b>Uw stadsdeel</b>${PIJL}</a></li><li><a href="${U("contact/")}"><b>Contact</b>${PIJL}</a></li></ul>
  </div></section>`;
pagina.nietgevonden.na = () => $("#zoek404").addEventListener("submit", e => { e.preventDefault(); const t = $("#zoek404-veld").value.trim(); if (t) gaNaar(U("zoeken/?q=" + encodeURIComponent(t))); });
pagina.nietgevonden.titel = () => "Niet gevonden";

// ---------- adressen en router ----------
// Elke pagina heeft een gewoon adres onder BASE. Filters staan in de zoekregel (?stadsdeel=Laak), zodat elk adres
// een bestaande pagina is. Een stuk staat op hetzelfde adres als op hartvoordenhaag.nl (motie/<naam>/) of op s/<id>/.
const TITELS = { nieuws: "Nieuws", successen: "Successen", petities: "Petities", standpunten: "Standpunten", wethouders: "Wethouders", bestuur: "Bestuur", vacatures: "Vacatures", "doe-mee": "Doe mee", lid: "Word lid", doneren: "Doneren", privacy: "Privacy", toegankelijkheid: "Toegankelijkheid", pers: "Pers" };
const SECTIE_VAN_SOORT = { nieuws: "nieuws", succes: "successen", motie: "raadswerk", amendement: "raadswerk", raadsvraag: "raadswerk", spreektekst: "raadswerk", petitie: "petities", vacature: "vacatures", agenda: "agenda" };
// adressen uit de tijd van het hekje (#nieuws/n114543) en oude losse routes werken nog
function oudAdres(h) {
  const d = h.replace(/^\/+|\/+$/g, "").split("/").map(x => { try { return decodeURIComponent(x); } catch { return x; } });
  const q = new URLSearchParams();
  const [a, b, c, e, f, g] = d;
  if (["nieuws", "successen", "petities", "vacatures"].includes(a) && b && b !== "stadsdeel") return U(`s/${encodeURIComponent(b)}/`);
  if (["nieuws", "successen"].includes(a) && b === "stadsdeel") return U(`${a}/?stadsdeel=${encodeURIComponent(c || "")}`);
  if (a === "raadswerk" && ["motie", "vraag", "amendement", "spreektekst"].includes(b) && c) return U(`s/${encodeURIComponent(c)}/`);
  if (a === "raadswerk") {
    const tab = TABS[b] ? b : "moties";
    for (let k = 2; k + 1 < d.length; k += 2) if (d[k] === "onderwerp" || d[k] === "zoek") q.set(d[k], d[k + 1]);
    return TABS[tab].pad && U(TABS[tab].pad + (q.toString() ? "?" + q : ""));
  }
  if (a === "zoeken") return U("zoeken/" + (b ? "?q=" + encodeURIComponent(b) : ""));
  if (a === "agenda" && b === "stadsdeel") return U("agenda/?stadsdeel=" + encodeURIComponent(c || ""));
  if (a === "agenda" && b === "aanmelden") return U("agenda/aanmelden/?id=" + encodeURIComponent(c || ""));
  if (a === "contact" && b === "melding") return U("contact/melding/" + (c ? "?stadsdeel=" + encodeURIComponent(c) : ""));
  if (a === "contact" && b) return U("contact/?onderwerp=" + encodeURIComponent(b));
  if (a === "stadsdelen" && b) return U(`stadsdelen/${slug(b)}/`);
  return U(d.filter(Boolean).join("/") + (d.filter(Boolean).length ? "/" : ""));
}
function routeNu() {
  let p = location.pathname;
  try { p = decodeURIComponent(p); } catch { /* laat staan */ }
  p = p.startsWith(BASE) ? p.slice(BASE.length) : p.replace(/^\/+/, "");
  p = p.replace(/(^|\/)index\.html$/, "").replace(/^\/+|\/+$/g, "");
  return { delen: p ? p.split("/") : [], q: new URLSearchParams(location.search) };
}
let viaLink = false, routeNr = 0, eersteKeer = true;
history.scrollRestoration = "manual";
function gaNaar(url, stukId = null) {
  const u = new URL(url, location.href);
  history.replaceState({ ...(history.state || {}), scroll: scrollY }, "");
  history.pushState({ stuk: stukId }, "", u.pathname + u.search + u.hash);
  viaLink = true; route();
}
// gewone links binnen de site: geen nieuwe pagina laden, alleen de inhoud wisselen
document.addEventListener("click", e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest("a[href]"); if (!a) return;
  const ruw = a.getAttribute("href");
  if (ruw.startsWith("#")) { if (ruw === "#inhoud") { e.preventDefault(); const m = $("#inhoud"); m.focus(); m.scrollIntoView(); } return; }
  if (a.target || a.hasAttribute("download")) return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || !u.pathname.startsWith(BASE) || /\.(html|pdf|xml|json|svg|jpg|png|webp|ics|txt)$/i.test(u.pathname)) return;
  e.preventDefault();
  if (u.pathname + u.search === location.pathname + location.search) { window.scrollTo({ top: 0, behavior: "instant" }); const h1 = $("#app h1"); if (h1) h1.focus(); sluitAlles(); return; }
  gaNaar(u.href, a.dataset.stuk || null);
});
addEventListener("popstate", e => {
  const f = $("#form.stappen");
  if (f && f.lidNaar && e.state && e.state.lidStap && routeNu().delen[0] === "lid") { f.lidNaar(e.state.lidStap); return; }
  if (f && f.lidNaar && routeNu().delen[0] === "lid" && !location.search) { f.lidNaar(1); return; }
  route();
});
// stuk dat bij dit adres hoort: de pagina zegt het zelf (data-stuk), of het staat in de geschiedenis, of in het adres (s/<id>)
function stukVoorAdres(delen) {
  const app = $("#app");
  if (eersteKeer && app.dataset.stuk) return app.dataset.stuk;
  if (history.state && history.state.stuk) return history.state.stuk;
  if (delen[0] === "s" && delen[1]) return delen[1];
  return null;
}
async function basis() { if (!KAART) { [KAART, FRACTIE] = await Promise.all([laad("kaart"), laad("fractie")]); zetSprite(KAART); } }
function telBezoek(pad) {
  if (navigator.webdriver) return;
  try { const d = JSON.stringify({ pad: pad || "/" }); if (navigator.sendBeacon) navigator.sendBeacon(API + "/bezoek", d); } catch { /* geen teller, geen probleem */ }
}
async function route() {
  const nr = ++routeNr;
  const { delen, q } = routeNu();
  const naam = delen[0] || "home", args = delen.slice(1);
  const stukId = stukVoorAdres(delen);
  const app = $("#app"), voorgebouwd = eersteKeer && !!app.dataset.stuk;
  sluitAlles();
  const p = stukId ? null : pagina[naam];
  const titel = p ? (p.titel ? p.titel(args, q) : TITELS[naam] || ({ raadswerk: "Raadswerk", stadsdelen: "Uw stadsdeel", fractie: "Onze mensen", agenda: "Agenda en spreekuren", contact: "Contact", zoeken: "Zoeken", onderwerpen: "Dossiers" })[naam] || "") : "";
  app.setAttribute("aria-busy", "true"); document.documentElement.classList.add("laadt");
  // duurt het langer dan een tel, dan meteen de kop van de nieuwe pagina met een laadregel
  const wacht = voorgebouwd || eersteKeer ? null : setTimeout(() => { if (nr === routeNr) { app.innerHTML = paginaKop(esc(titel || "Even laden"), "") + skelet(); window.scrollTo({ top: 0, behavior: "instant" }); } }, 150);
  let html = null, sectie = naam, wat = stukId ? "stuk" : p ? "pagina" : "niet", menuPad = location.pathname;
  try {
    await basis();
    if (stukId) {
      html = await detail(stukId);
      const i = stukId.startsWith("w") ? (await eigen()).find(x => x.id === stukId) : await stuk(stukId);
      if (i && SOORT[i.soort]) {
        sectie = SECTIE_VAN_SOORT[i.soort] || naam; menuPad = U(SOORT[i.soort].lijst);
        const doel = U(stukPad(i)); if (location.pathname !== doel && !voorgebouwd) history.replaceState({ ...(history.state || {}), stuk: stukId }, "", doel + location.hash);
      }
    } else if (p) html = await p(args, q);
    if (html == null) { html = await pagina.nietgevonden(); wat = "niet"; sectie = ""; document.title = "Niet gevonden | Hart voor Den Haag (proef)"; }
    else if (wat === "pagina" && titel) document.title = titel + " | Hart voor Den Haag (proef)";
    else if (wat === "pagina" && naam === "home") document.title = "Hart voor Den Haag (proef)";
    if (nr !== routeNr) return;
    clearTimeout(wacht);
    app.innerHTML = html; delete app.dataset.stuk;
    if (wat === "stuk") await detail.na(); else if (wat === "pagina" && p.na) await p.na(args, q); else if (wat === "niet") pagina.nietgevonden.na();
  } catch (e) {
    console.error(e);
    clearTimeout(wacht);
    if (nr === routeNr) app.innerHTML = paginaKop("Er ging iets mis", "Laad de pagina opnieuw. Lukt het niet? Bel " + TEL + ".");
  }
  if (nr !== routeNr) return;
  app.removeAttribute("aria-busy"); document.documentElement.classList.remove("laadt");
  telOp(); const zw = $("#zweef"); if (zw && zw.volg) zw.volg();
  tekenKopLijnen();
  markeerMenu(sectie, naam === "contact" && args[0] === "melding", menuPad);
  telBezoek(location.pathname.slice(BASE.length - 1));
  const terug = !viaLink && history.state && history.state.scroll;
  if (terug) window.scrollTo({ top: Number(terug), behavior: "instant" });
  else if (location.hash.length > 1 && document.getElementById(location.hash.slice(1))) document.getElementById(location.hash.slice(1)).scrollIntoView();
  else if (!eersteKeer) {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (viaLink) { const h = $("#app h1"); if (h) h.focus({ preventScroll: true }); }
  }
  viaLink = false; eersteKeer = false;
}
function tekenKopLijnen() {
  laad("kaart").then(k => $$(".kop-lijnen").forEach(svg => { const plek = svg.dataset.plek, bb = plek && k.sd[plek] && k.sd[plek].bb;
    // gaat het stuk over één stadsdeel, dan zoomt de kaart in op dat stadsdeel en kleurt het in
    if (bb) { const m = Math.max(bb[2], bb[3] * 1.25) * 1.9, cx = bb[0] + bb[2] / 2, cy = bb[1] + bb[3] / 2; svg.setAttribute("viewBox", `${(cx - m / 2).toFixed(1)} ${(cy - m * .4).toFixed(1)} ${m.toFixed(1)} ${(m * .8).toFixed(1)}`); }
    else svg.setAttribute("viewBox", `0 0 ${k.w} ${k.h}`); svg.innerHTML = Object.entries(k.sd).sort(([n]) => n === plek ? 1 : -1).map(([n, x]) => `<path d="${x.d}"${n === plek ? ' class="aan"' : ""}/>`).join(""); }));
}
// het menu laat zien waar u bent
function markeerMenu(sectie, isMelding, nu = location.pathname) {
  $$(".menu a[data-sectie], .onderbalk [data-sectie], .balk-meld").forEach(a => (isMelding ? a.dataset.sectie === "melding" : a.dataset.sectie && a.dataset.sectie.split(" ").includes(sectie)) ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  $$(".menu button[data-sectie]").forEach(b => b.classList.toggle("actief", b.dataset.sectie.split(" ").includes(sectie)));
  const links = $$("#lade .lade-links a, #lade a.hoofd, .uitklap-paneel a").filter(a => a.origin === location.origin);
  const passend = links.filter(a => nu === a.pathname || (a.pathname !== BASE && nu.startsWith(a.pathname)));
  const langst = Math.max(0, ...passend.map(a => a.pathname.length));
  links.forEach(a => passend.includes(a) && a.pathname.length === langst ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
}

// ---------- kop, menu en lade ----------
function sluitAlles() {
  $$(".uitklap button[aria-expanded='true']").forEach(b => { b.setAttribute("aria-expanded", "false"); $("#" + b.getAttribute("aria-controls")).hidden = true; });
  if ($("#lade") && !$("#lade").hidden) sluitLade(false);
}
function koppelKop() {
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
  $("#zoek-form").addEventListener("submit", e => { e.preventDefault(); const t = $("#zoek-veld").value.trim(); if (t) { $("#zoekbalk").hidden = true; $("#zoek-knop").setAttribute("aria-expanded", "false"); gaNaar(U("zoeken/?q=" + encodeURIComponent(t))); } });
  $("#menu-knop").addEventListener("click", openLade);
  $("#lade-dicht").addEventListener("click", () => sluitLade());
  $("#lade").addEventListener("click", e => { if (e.target.id === "lade") return sluitLade(); if (e.target.closest("a")) sluitLade(false); });
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
}
function openLade() { $("#lade").hidden = false; $("#menu-knop").setAttribute("aria-expanded", "true"); $("#lade-dicht").focus(); document.body.style.overflow = "hidden"; }
function sluitLade(focus = true) { $("#lade").hidden = true; $("#menu-knop").setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; if (focus) $("#menu-knop").focus(); }

// het aantal successen: het getal van vorig jaar staat er even, dan tikt het nieuwe succes erbij (niet bij "minder beweging")
function telOp() {
  if (stil() || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    const el = e.target, doel = Number(el.dataset.tel), van = Number(el.dataset.van);
    if (!(doel > van)) return;
    const g = el.querySelector(".getal"); g.textContent = fmt.format(van);
    setTimeout(() => {
      g.textContent = fmt.format(doel); el.classList.remove("tik"); void el.offsetWidth; el.classList.add("tik");
      const plus = document.createElement("span"); plus.className = "plus-een"; plus.setAttribute("aria-hidden", "true"); plus.textContent = "+" + (doel - van);
      el.append(plus); setTimeout(() => plus.remove(), 1800);
    }, 700);
  }), { threshold: .6 });
  $$("[data-tel][data-van]").forEach(el => io.observe(el));
}
// zwevende WhatsApp-knop, zoals op de huidige site. Hij beweegt niet uit zichzelf, komt pas na wat scrollen,
// en gaat opzij bij formulieren, de voet en het toetsenbord. Het ballonnetje verschijnt één keer en blijft weg als u het sluit.
function koppelZweef() {
  const z = $("#zweef"); if (!z) return; const rij = z.querySelector(".ballon-rij");
  const gezien = opslag.lees("zweef-gezien");
  z.querySelector(".sluit").addEventListener("click", () => { rij.hidden = true; opslag.zet("zweef-gezien", "1"); z.querySelector(".rond").focus(); });
  const raakt = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  let wacht = false;
  const kijk = () => {
    wacht = false;
    const r = z.getBoundingClientRect();
    const typen = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    const bijFormulier = $$(".formulier, .voet, #speel, .postcode, .deel-na").some(el => raakt(r, el.getBoundingClientRect()));
    z.classList.toggle("opzij", typen || bijFormulier || (smal() && scrollY < 500));
  };
  z.volg = () => { if (!wacht) { wacht = true; requestAnimationFrame(kijk); } };
  addEventListener("scroll", z.volg, { passive: true }); addEventListener("resize", z.volg); document.addEventListener("focusin", z.volg); document.addEventListener("focusout", z.volg);
  z.volg();
  setTimeout(() => {
    z.classList.remove("weg");
    if (!gezien && !smal()) { rij.hidden = false; opslag.zet("zweef-gezien", "1"); setTimeout(() => { rij.hidden = true; }, 9000); }
  }, 1500);
}
// vertalen: de pagina opent via Google Vertalen in de gekozen taal (alleen als de bezoeker erop klikt)
function koppelVoet() {
  const k = $("#taal");
  if (k) k.addEventListener("change", () => {
    const t = k.value; if (!t) return;
    const extra = location.search ? "&" + location.search.slice(1) : "";
    open(`https://damienzeller-nl.translate.goog${location.pathname}?_x_tr_sl=nl&_x_tr_tl=${t}&_x_tr_hl=${t}${extra}`, "_blank", "noopener");
    k.value = "";
  });
  // voet: op de telefoon de linkgroepen dicht, op een groter scherm altijd open
  const m = matchMedia("(max-width: 760px)");
  const zet = () => $$(".voet-groep").forEach(d => { d.open = !m.matches; });
  zet(); m.addEventListener("change", zet);
  // datumregel en strook: de datum van vandaag en de eerstvolgende afspraak
  const d = new Date(), t = $("#vandaag"); if (t) { t.dateTime = vandaag(); t.textContent = `${DAG[d.getDay()]} ${d.getDate()} ${MAAND[d.getMonth()]} ${d.getFullYear()}`; }
  agenda().then(ag => { if (ag[0] && $("#strook-spreekuur")) { const x = dt(ag[0].datum); $("#strook-spreekuur").textContent = `Agenda: ${x.d} ${MND[x.m]}, ${(ag[0].plek || "").split(",")[0]}`; } });
  // nieuwsbrief in de voet
  koppelFormulier($("#nieuwsbrief"), {
    soort: "nieuwsbrief",
    eisen: () => ({ email: v => EMAIL.test(v) ? "" : "Vul een geldig e-mailadres in." }),
    bedankt: () => "Dank u wel! U bent aangemeld voor de nieuwsbrief.",
  });
}

// ---------- start ----------
(() => {
  if (!location.pathname.startsWith(BASE)) return; // de foutpagina van de rest van damienzeller.nl
  // oude adressen met een hekje (#nieuws/n114543) omzetten naar het nieuwe adres
  const h = location.hash.slice(1);
  if (h && h !== "inhoud" && /^[a-z]/.test(h) && !document.getElementById(h)) history.replaceState(null, "", oudAdres(h));
  else if (!$("#app").dataset.stuk) {
    // oude losse routes (nieuws/n114543, raadswerk/motie/m1) die via de foutpagina binnenkomen
    const { delen } = routeNu();
    if ((["nieuws", "successen", "petities", "vacatures"].includes(delen[0]) && /^([a-z]{1,2}\d+|w\d+)$/.test(delen[1] || "")) || (delen[0] === "raadswerk" && ["motie", "vraag", "amendement", "spreektekst"].includes(delen[1]))) history.replaceState(null, "", oudAdres(delen.join("/")));
    if (delen[0] === "stadsdelen" && delen[1] && !sdVanSlug(delen[1]) && STADSDELEN.includes(delen[1])) history.replaceState(null, "", U(`stadsdelen/${slug(delen[1])}/`));
  }
  koppelKop(); koppelVoet(); koppelZweef();
  route();
})();
