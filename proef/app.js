/* Proefsite Hart voor Den Haag: één pagina met routes achter het hekje (#nieuws, #fractie, ...).
   Inhoud: data/*.json (overgenomen van hartvoordenhaag.nl) plus wat redacteuren plaatsen via de achterkant (API). */
"use strict";
const API = "https://hvdh-proef.damienzeller.workers.dev";
const VIDEO = "https://www.hartvoordenhaag.nl/wp-content/uploads/2026/01/Hart-voor-Den-Haag.mp4";
const STADSDELEN = ["Centrum", "Escamp", "Haagse Hout", "Laak", "Leidschenveen-Ypenburg", "Loosduinen", "Scheveningen", "Segbroek"];
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
const SOORT_NAAM = { nieuws: "Nieuws", succes: "Succes", motie: "Motie", raadsvraag: "Raadsvraag", petitie: "Petitie", agenda: "Agenda", vacature: "Vacature" };
const PAD = { nieuws: "nieuws", succes: "successen", motie: "raadswerk/motie", raadsvraag: "raadswerk/raadsvraag", petitie: "petities", vacature: "vacatures", agenda: "agenda" };

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const dt = iso => { const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number); return { d, m: m - 1, y, wd: new Date(y, m - 1, d).getDay() }; };
const datum = (iso, jaar) => { const x = dt(iso); const dit = new Date().getFullYear(); return `${x.d} ${MAAND[x.m]}${jaar || x.y !== dit ? " " + x.y : ""}`; };
const vandaag = () => new Date().toISOString().slice(0, 10);
const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const initialen = n => n.split(" ").filter(w => /^[A-ZÀ-Ý]/.test(w)).map(w => w[0]).slice(0, 2).join("");
const fmt = new Intl.NumberFormat("nl-NL");

// ---------- gegevens ----------
const cache = {};
function laad(naam) {
  if (!cache[naam]) cache[naam] = fetch(`data/${naam}.json`).then(r => r.ok ? r.json() : []).catch(() => []);
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
      tijd: i.tijd, plek: i.plek, eigen: true,
    }))).catch(() => []);
  }
  return apiItems;
}
async function soort(s) {
  const bron = { nieuws: "nieuws", succes: "successen", motie: "moties", raadsvraag: "raadsvragen", petitie: "petities" }[s];
  const [vast, nieuw] = await Promise.all([bron ? laad(bron) : [], eigen()]);
  return [...nieuw.filter(i => i.soort === s), ...vast].sort((a, b) => b.datum.localeCompare(a.datum));
}
async function agenda() {
  const [vast, nieuw] = await Promise.all([laad("agenda"), eigen()]);
  const w = nieuw.filter(i => i.soort === "agenda").map(i => ({ ...i, stadsdeel: i.stadsdelen[0] || "" }));
  return [...vast, ...w].filter(a => a.datum >= vandaag()).sort((a, b) => (a.datum + (a.tijd || "")).localeCompare(b.datum + (b.tijd || "")));
}

// ---------- bouwstenen ----------
const plekLabel = i => (i.stadsdelen && i.stadsdelen.length ? i.stadsdelen.join(" en ") : "Heel Den Haag");
const bijschrift = (i, extra = "") => `<p class="bijschrift"><span class="plek">${esc(plekLabel(i))}</span><time datetime="${esc(i.datum)}">${datum(i.datum)}</time>${extra}</p>`;
const href = i => `#${PAD[i.soort]}/${encodeURIComponent(i.id)}`;
function logItem(i, eerste) {
  return `<li class="log-item${eerste ? " eerste" : ""}${i.beeld ? "" : " zonder-beeld"}">
    <div class="log-tekst">${i.eigen ? '<span><span class="label nieuw">Net geplaatst</span></span>' : ""}<h3><a href="${href(i)}">${esc(i.titel)}</a></h3>${bijschrift(i)}<p class="sam">${esc(i.samenvatting)}</p></div>
    ${i.beeld ? `<img class="log-beeld" src="${esc(i.beeld)}" alt="" loading="${eerste ? "eager" : "lazy"}" decoding="async">` : ""}</li>`;
}
function reeksItem(i) {
  const x = dt(i.datum);
  return `<article>${i.beeld ? `<img src="${esc(i.beeld)}" alt="" loading="lazy" decoding="async">` : `<div class="zonder" aria-hidden="true">${x.d} ${MND[x.m]}</div>`}
    <h3><a href="${href(i)}">${esc(i.titel)}</a></h3>${bijschrift(i)}</article>`;
}
function stukItem(i) {
  return `<li><span><span class="label">${SOORT_NAAM[i.soort]}</span></span><h3><a href="${href(i)}">${esc(i.titel)}</a></h3>${bijschrift(i)}<p>${esc(i.samenvatting)}</p></li>`;
}
function agendaItem(a) {
  const x = dt(a.datum);
  return `<li><div class="dd"><b>${x.d}</b><span>${MND[x.m]}</span></div>
    <div><h3>${esc(a.titel)}</h3><p>${DAG[x.wd]}${a.tijd ? ", " + esc(a.tijd) + " uur" : ""} · ${esc(a.plek || "")}${a.stadsdeel ? " · " + esc(a.stadsdeel) : ""}</p>${a.samenvatting ? `<p>${esc(a.samenvatting)}</p>` : ""}</div></li>`;
}
function portret(f, link = true) {
  const naam = esc(f.naam);
  return `<figure>${f.beeld ? `<img src="${esc(f.beeld)}" alt="Portret van ${naam}" loading="lazy" decoding="async">` : `<div class="leeg-foto" aria-hidden="true">${initialen(f.naam)}</div>`}
    <figcaption>${link ? `<a href="#fractie/${slug(f.naam)}"><b>${naam}</b></a>` : `<b>${naam}</b>`}<span>${esc(f.rol || (f.stadsdelen && f.stadsdelen.length ? f.stadsdelen.join(" en ") : "Heel Den Haag"))}</span></figcaption></figure>`;
}
const paginaKop = (titel, tekst, kruimel = "") => `<div class="pagina-kop"><div class="wrap">${kruimel ? `<p class="kruimel">${kruimel}</p>` : ""}<h1>${titel}</h1>${tekst ? `<p>${tekst}</p>` : ""}</div></div>`;
const stadsdeelOpties = (gekozen = "") => `<option value="">Kies uw stadsdeel</option>` + STADSDELEN.map(s => `<option${s === gekozen ? " selected" : ""}>${s}</option>`).join("");

// ---------- formulieren naar de achterkant ----------
function koppelFormulier(form, soortNaam, bedankt) {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const uit = form.querySelector(".uitslag");
    const knop = form.querySelector("button[type=submit]");
    const data = Object.fromEntries(new FormData(form).entries());
    data.soort = typeof soortNaam === "function" ? soortNaam(data) : soortNaam; data.akkoord = !!data.akkoord;
    if (!data.naam || !(data.email || data.telefoon)) { toon(uit, "Vul uw naam en een e-mailadres of telefoonnummer in.", true); return; }
    if (!data.akkoord) { toon(uit, "Vink aan dat we uw gegevens mogen gebruiken om te reageren.", true); return; }
    knop.disabled = true;
    try {
      const r = await fetch(API + "/formulier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.fout || "Versturen lukte niet.");
      form.reset(); toon(uit, bedankt);
    } catch (err) { toon(uit, err.message || "Versturen lukte niet. Probeer het later opnieuw.", true); }
    knop.disabled = false;
  });
}
function toon(el, tekst, isFout) { el.hidden = false; el.className = "uitslag melding" + (isFout ? " fout" : ""); el.textContent = tekst; el.setAttribute("role", isFout ? "alert" : "status"); }
const akkoordVeld = `<label class="vink"><input type="checkbox" name="akkoord" id="akkoord" value="1"><span>Hart voor Den Haag mag mijn gegevens gebruiken om op dit bericht te reageren.</span></label>
  <div class="valkuil" aria-hidden="true"><label for="website">Laat leeg</label><input type="text" id="website" name="website" tabindex="-1" autocomplete="off"></div>`;

// ---------- pagina's ----------
const pagina = {};

pagina.home = async () => {
  const [kaart, nieuws, succes, fractie, ag, petities] = await Promise.all([laad("kaart"), soort("nieuws"), soort("succes"), laad("fractie"), agenda(), soort("petitie")]);
  const eerst = ag[0];
  const lijnen = Object.values(kaart.sd).map(s => `<path d="${s.d}"/>`).join("");
  const x = eerst ? dt(eerst.datum) : null;
  return `
  <section class="held" aria-labelledby="titel">
    <svg class="held-lijnen" viewBox="0 0 ${kaart.w} ${kaart.h}" aria-hidden="true">${lijnen}</svg>
    <div class="wrap">
      <div>
        <h1 id="titel">Hart voor <span>Den Haag</span></h1>
        <p class="held-rol">De grootste lokale partij van Den Haag</p>
        <p class="intro">Met ombudspolitiek zijn we zichtbaar in de wijken, dicht bij de Hagenaar, Hagenees, Scheveninger en Loosduiner. Zestien raadsleden zetten zich elke dag in voor een veilige, schone en leefbare stad.</p>
        <div class="knoppen"><a class="knop geel" href="#lid">Word lid vanaf € 12,50 per jaar</a><a class="knop rand" href="#contact/melding">Meld een probleem</a></div>
      </div>
      <figure class="held-beeld">
        <svg class="hart" viewBox="0 0 100 92" aria-hidden="true"><path d="M50 90C22 68 2 50 2 27 2 12 13 2 27 2c10 0 18 6 23 14C55 8 63 2 73 2c14 0 25 10 25 25 0 23-20 41-48 63z"/></svg>
        <video id="held-video" muted loop playsinline preload="metadata" poster="beeld/groep.jpg" aria-label="Campagnefilm van Hart voor Den Haag, zonder geluid"><source src="${VIDEO}" type="video/mp4"></video>
        <button class="speel" type="button" id="speel"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12"/><rect x="9.5" y="2" width="3.5" height="12"/></svg><span>Pauzeer film</span></button>
      </figure>
    </div>
  </section>
  ${eerst ? `<div class="wrap kaartje-plek"><div class="kaartje">
    <div class="datum" aria-hidden="true"><span class="dag">${x.d}</span><span class="maand">${MAAND[x.m]}</span><span class="wd">${DAG[x.wd]}${eerst.tijd ? ", " + esc(eerst.tijd) : ""}</span></div>
    <div class="kaartje-tekst"><h2>${esc(eerst.titel)}</h2><p><b>${esc(eerst.plek)}${eerst.stadsdeel ? ", " + esc(eerst.stadsdeel) : ""}.</b> ${esc(eerst.samenvatting || "")}</p></div>
    <a class="knop groen" href="#agenda">Hele agenda</a></div></div>` : ""}

  <section class="actueel">
    <div class="wrap">
      <div class="kop-rij"><h2>Nieuws uit de raad en de wijk</h2><a class="meer" href="#nieuws">Al het nieuws</a></div>
      <ol class="log">${nieuws.slice(0, 6).map((n, i) => logItem(n, i === 0)).join("")}</ol>
    </div>
  </section>

  <section id="kaart-sectie">
    <div class="wrap">
      <div class="kop-rij"><div><h2>Wat speelt er in uw stadsdeel?</h2><p class="inleiding">Klik op de kaart. U ziet wie uw raadsleden zijn en wat Hart voor Den Haag in uw buurt doet.</p></div></div>
      ${kaartBlok(kaart)}
    </div>
  </section>

  <section class="donker">
    <div class="wrap">
      <div class="kop-rij"><div><h2>Wat we voor elkaar kregen</h2><p class="inleiding">Van een besluit van de raad tot een opgeknapte speeltuin: dit leverde ombudspolitiek op.</p></div><a class="meer" href="#successen">Alle successen</a></div>
      <div class="reeks">${succes.slice(0, 8).map(reeksItem).join("")}</div>
    </div>
  </section>

  <section id="standpunten">
    <div class="wrap">
      <div class="kop-rij"><div><h2>Waar wij voor staan</h2><p class="inleiding">Geen links of rechts, maar oplossingen. Uit ons verkiezingsprogramma "En nu aan de slag!".</p></div><a class="meer" href="https://www.hartvoordenhaag.nl/wp-content/uploads/2026/01/EnNuAanDeSlag_Hart_voor_Den_Haag_V1.pdf" target="_blank" rel="noopener">Lees het programma</a></div>
      <div class="punten">${PUNTEN.map(p => `<article><h3>${esc(p[0])}</h3><p>${esc(p[1])}</p></article>`).join("")}</div>
    </div>
  </section>

  <section class="wit">
    <div class="wrap">
      <div class="kop-rij"><div><h2>Zestien raadsleden, acht stadsdelen</h2><p class="inleiding">Elk raadslid heeft een eigen stadsdeel. Daar houden zij spreekuur en lopen zij mee met bewoners.</p></div><a class="meer" href="#fractie">Hele fractie</a></div>
      <div class="gezichten">${fractie.filter(f => f.beeld).slice(0, 12).map(f => portret(f)).join("")}</div>
    </div>
  </section>

  ${petities.length ? `<section>
    <div class="wrap">
      <div class="kop-rij"><div><h2>Teken mee</h2><p class="inleiding">Met een petitie laten bewoners zien dat ze iets anders willen. Hart voor Den Haag brengt het naar de raad.</p></div><a class="meer" href="#petities">Alle petities</a></div>
      <ul class="stukken">${petities.slice(0, 3).map(stukItem).join("")}</ul>
    </div>
  </section>` : ""}

  <section class="lid-band">
    <div class="wrap">
      <article class="hoofd"><h3>Word lid</h3><p>Vanaf € 12,50 per jaar praat u mee op de ledenvergadering en kiest u mee over kandidaat-raadsleden.</p><a class="knop groen" href="#lid">Lid worden</a></article>
      <article><h3>Doneer</h3><p>Geen lid, wel steunen? Elke bijdrage gaat naar acties in de wijk en het ombudsteam.</p><a class="knop lijn" href="#doneren">Doneren</a></article>
      <article><h3>Doe mee</h3><p>Word wijkvertegenwoordiger of vrijwilliger in uw eigen stadsdeel.</p><a class="knop lijn" href="#doe-mee">Aanmelden</a></article>
    </div>
  </section>`;
};
pagina.home.na = async () => {
  const v = $("#held-video"), k = $("#speel");
  const stil = matchMedia("(prefers-reduced-motion: reduce)").matches || (navigator.connection && navigator.connection.saveData);
  const zet = speelt => { k.querySelector("span").textContent = speelt ? "Pauzeer film" : "Speel film af"; k.querySelector("svg").innerHTML = speelt ? '<rect x="3" y="2" width="3.5" height="12"/><rect x="9.5" y="2" width="3.5" height="12"/>' : '<path d="M4 2l10 6-10 6z"/>'; };
  if (stil) zet(false); else v.play().then(() => zet(true)).catch(() => zet(false));
  k.addEventListener("click", () => { if (v.paused) { v.play(); zet(true); } else { v.pause(); zet(false); } });
  activeerKaart(await laad("kaart"), "Escamp");
};

function kaartBlok(kaart) {
  return `<div class="stad-raster"><div><svg class="kaart" id="kaart" viewBox="0 0 ${kaart.w} ${kaart.h}" role="group" aria-label="Kaart van de acht Haagse stadsdelen"></svg>
    <div class="filters" id="kaart-knoppen" style="margin-top:18px" aria-label="Kies een stadsdeel"></div></div><div class="paneel" id="paneel" aria-live="polite"></div></div>`;
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
    p.setAttribute("d", kaart.sd[n].d); p.setAttribute("class", "sd"); p.setAttribute("tabindex", "0"); p.setAttribute("role", "button");
    p.setAttribute("aria-label", n); p.setAttribute("aria-pressed", "false");
    p.addEventListener("click", () => kies(n));
    p.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); kies(n); } });
    svg.appendChild(p); vlak[n] = p;
  });
  namen.forEach(n => {
    const s = kaart.sd[n], t = document.createElementNS(NS, "text");
    t.setAttribute("class", "lbl"); t.setAttribute("x", s.x); t.setAttribute("y", s.y + 7);
    if (n === "Leidschenveen-Ypenburg") t.innerHTML = `<tspan x="${s.x}" dy="-6">Leidschenveen-</tspan><tspan x="${s.x}" dy="22">Ypenburg</tspan>`; else t.textContent = n;
    svg.appendChild(t); lbl[n] = t;
    const b = document.createElement("button"); b.type = "button"; b.className = "knopje"; b.textContent = n; b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => kies(n)); knoppen.appendChild(b); knop[n] = b;
  });
  const [fractie, nieuws, succes, ag] = await Promise.all([laad("fractie"), soort("nieuws"), soort("succes"), agenda()]);
  function kies(n) {
    namen.forEach(m => { const aan = m === n; vlak[m].setAttribute("aria-pressed", aan); knop[m].setAttribute("aria-pressed", aan); lbl[m].classList.toggle("aan", aan); });
    const s = kaart.sd[n];
    const mensen = fractie.filter(f => f.stadsdelen.includes(n));
    const items = [
      ...ag.filter(a => a.stadsdeel === n).map(a => ({ ...a, soort: "agenda" })),
      ...succes.filter(x => x.stadsdelen.includes(n)).slice(0, 3),
      ...nieuws.filter(x => x.stadsdelen.includes(n)).slice(0, 3),
    ].slice(0, 6);
    $("#paneel").innerHTML = `
      <div><h3>${esc(n)}</h3><p class="feit"><b>${fmt.format(s.inw)}</b> inwoners in ${s.wijken.length} wijken (CBS, 2023)</p></div>
      <div><p class="tussenkop">Uw raadsleden</p>${mensen.length ? `<ul class="mensen">${mensen.map(f => `<li>${f.beeld ? `<img src="${esc(f.beeld)}" alt="">` : `<span class="leeg-foto" aria-hidden="true">${initialen(f.naam)}</span>`}<div><a href="#fractie/${slug(f.naam)}"><b>${esc(f.naam)}</b></a><span>Raadslid ${esc(f.stadsdelen.join(" en "))}</span></div></li>`).join("")}</ul>` : `<p class="leeg">Nog geen raadslid gekoppeld.</p>`}</div>
      <div><p class="tussenkop">Wat we hier doen</p>${items.length ? `<ul class="berichten">${items.map(x => `<li><span class="label${x.soort === "succes" ? " succes" : ""}">${SOORT_NAAM[x.soort]}</span>${x.soort === "agenda" ? `<a href="#agenda">${esc(x.titel)}</a>` : `<a href="${href(x)}">${esc(x.titel)}</a>`} <span class="leeg">${datum(x.datum)}</span></li>`).join("")}</ul>` : `<p class="leeg">Nog geen berichten uit ${esc(n)}.</p>`}</div>
      <p class="wijken"><b>Wijken:</b> ${s.wijken.map(esc).join(", ")}</p>
      <div class="knoppen"><a class="knop groen" href="#contact/melding/${encodeURIComponent(n)}">Meld een probleem in ${esc(n)}</a><a class="knop lijn" href="#nieuws/stadsdeel/${encodeURIComponent(n)}">Nieuws uit ${esc(n)}</a></div>`;
  }
  kies(start && kaart.sd[start] ? start : "Escamp");
}

pagina.stadsdelen = async ([naam]) => {
  return paginaKop("Uw stadsdeel", "Acht stadsdelen, elk met eigen raadsleden. Kies uw stadsdeel op de kaart.") +
    `<section><div class="wrap">${kaartBlok(await laad("kaart"))}</div></section>`;
};
pagina.stadsdelen.na = async ([naam]) => activeerKaart(await laad("kaart"), naam ? decodeURIComponent(naam) : "Escamp");

// nieuws en successen: lijst met filter per stadsdeel, en een detailpagina
function lijstPagina(soortNaam, titel, tekst, pad) {
  const f = async (args) => {
    if (args[0] && args[0] !== "stadsdeel") return detail(soortNaam, decodeURIComponent(args[0]), titel, pad);
    const sd = args[0] === "stadsdeel" ? decodeURIComponent(args[1] || "") : "";
    const alles = (await soort(soortNaam)).filter(i => !sd || i.stadsdelen.includes(sd));
    const knoppen = ["", ...STADSDELEN].map(s => `<a class="knopje" href="#${pad}${s ? "/stadsdeel/" + encodeURIComponent(s) : ""}" aria-pressed="${s === sd}">${s || "Alles"}</a>`).join("");
    const lijst = soortNaam === "succes" ? `<div class="reeks" id="lijst">${alles.slice(0, 24).map(reeksItem).join("")}</div>` : `<ol class="log" id="lijst">${alles.slice(0, 20).map((n, i) => logItem(n, i === 0 && !sd)).join("")}</ol>`;
    return paginaKop(titel, tekst) + `<section class="${soortNaam === "succes" ? "donker" : "actueel"}"><div class="wrap"><nav class="filters" aria-label="Kies een stadsdeel">${knoppen}</nav>
      ${alles.length ? lijst : `<p class="leeg">Nog geen berichten uit ${esc(sd)}.</p>`}
      ${alles.length > (soortNaam === "succes" ? 24 : 20) ? `<button class="knop ${soortNaam === "succes" ? "geel" : "lijn"} meer-laden" type="button" id="meer">Meer laden</button>` : ""}
      <p class="leeg" style="margin-top:22px">Ouder werk staat op <a href="https://www.hartvoordenhaag.nl/${soortNaam === "succes" ? "successen" : "nieuws"}/" target="_blank" rel="noopener">hartvoordenhaag.nl</a>.</p></div></section>`;
  };
  f.na = async (args) => {
    if (args[0] && args[0] !== "stadsdeel") return detail.na?.();
    const sd = args[0] === "stadsdeel" ? decodeURIComponent(args[1] || "") : "";
    const alles = (await soort(soortNaam)).filter(i => !sd || i.stadsdelen.includes(sd));
    let n = soortNaam === "succes" ? 24 : 20;
    const meer = $("#meer");
    if (meer) meer.addEventListener("click", () => {
      const stap = alles.slice(n, n + 20); n += 20;
      $("#lijst").insertAdjacentHTML("beforeend", stap.map(i => soortNaam === "succes" ? reeksItem(i) : logItem(i)).join(""));
      if (n >= alles.length) meer.remove();
    });
  };
  return f;
}
pagina.nieuws = lijstPagina("nieuws", "Nieuws", "Wat Hart voor Den Haag doet in de raad en in de wijk.", "nieuws");
pagina.successen = lijstPagina("succes", "Successen", "Wat ombudspolitiek opleverde: besluiten, oplossingen en opgeknapte plekken.", "successen");

async function detail(soortNaam, id, terugNaam, terugPad) {
  const alles = await soort(soortNaam);
  const i = alles.find(x => String(x.id) === id);
  if (!i) return paginaKop("Niet gevonden", "Dit bericht bestaat niet (meer).") + `<section><div class="wrap"><a class="knop groen" href="#${terugPad}">Terug naar ${esc(terugNaam.toLowerCase())}</a></div></section>`;
  const meer = alles.filter(x => x.id !== i.id && x.stadsdelen.some(s => i.stadsdelen.includes(s))).slice(0, 4);
  const anders = meer.length ? meer : alles.filter(x => x.id !== i.id).slice(0, 4);
  const isPetitie = soortNaam === "petitie";
  return paginaKop(esc(i.titel), "", `<a href="#">Home</a> / <a href="#${terugPad}">${esc(terugNaam)}</a>`) + `
  <section><div class="wrap artikel">
    <article>${i.beeld ? `<img class="artikel-beeld" src="${esc(i.beeld)}" alt="">` : ""}${bijschrift(i)}
      <div class="artikel-tekst" style="margin-top:22px">${i.html || `<p>${esc(i.samenvatting)}</p>`}</div>
      ${isPetitie ? `<form class="formulier" id="teken" style="margin-top:36px" novalidate><h2 style="font-size:2rem">Teken deze petitie</h2>
        <input type="hidden" name="petitie" value="${esc(i.titel)}">
        <div class="velden"><div class="veld"><label for="p-naam">Naam</label><input type="text" id="p-naam" name="naam" autocomplete="name"></div>
        <div class="veld"><label for="p-email">E-mailadres</label><input type="email" id="p-email" name="email" autocomplete="email"></div>
        <div class="veld breed"><label for="p-sd">Stadsdeel</label><select id="p-sd" name="stadsdeel">${stadsdeelOpties(i.stadsdelen[0])}</select></div></div>
        ${akkoordVeld}<button class="knop groen" type="submit">Teken de petitie</button><p class="uitslag" hidden></p></form>` : ""}
    </article>
    <aside class="zijkant">
      <div class="zijblok"><h3>Delen</h3><button class="knop lijn klein" type="button" id="deel">Kopieer de link</button>${i.link ? `<a class="meer" href="${esc(i.link)}" target="_blank" rel="noopener">Op hartvoordenhaag.nl</a>` : ""}</div>
      ${anders.length ? `<div class="zijblok"><h3>${meer.length ? "Meer uit " + esc(plekLabel(i)) : "Ook interessant"}</h3><ul class="berichten">${anders.map(x => `<li><a href="${href(x)}">${esc(x.titel)}</a> <span class="leeg">${datum(x.datum)}</span></li>`).join("")}</ul></div>` : ""}
      <div class="zijblok" style="background:var(--zon);border-color:var(--zon);color:#10251A"><h3>Steun ons werk</h3><p style="color:#2B3B30">Word lid vanaf € 12,50 per jaar.</p><a class="knop groen klein" href="#lid">Word lid</a></div>
    </aside>
  </div></section>`;
}
detail.na = () => {
  const d = $("#deel");
  if (d) d.addEventListener("click", async () => {
    const url = location.href;
    try { if (navigator.share) await navigator.share({ url, title: document.title }); else { await navigator.clipboard.writeText(url); d.textContent = "Link gekopieerd"; } }
    catch { d.textContent = "Kopieer de link uit de adresbalk"; }
  });
  const t = $("#teken");
  if (t) koppelFormulier(t, "petitie", "Dank u wel! Uw handtekening is binnen.");
};

// raadswerk: moties en raadsvragen
pagina.raadswerk = async ([tab = "moties", id]) => {
  if (tab === "motie" && id) return detail("motie", decodeURIComponent(id), "Raadswerk", "raadswerk");
  if (tab === "raadsvraag" && id) return detail("raadsvraag", decodeURIComponent(id), "Raadsvragen", "raadswerk/raadsvragen");
  const s = tab === "raadsvragen" ? "raadsvraag" : "motie";
  const alles = await soort(s);
  return paginaKop("Raadswerk", s === "motie" ? "Met een motie vraagt de raad het college iets te doen. Dit zijn de moties van Hart voor Den Haag." : "Met schriftelijke vragen houden we het college scherp. Zo komen problemen uit de wijk op tafel.") + `
    <section><div class="wrap">
      <nav class="tabs" aria-label="Soort stuk"><a class="knopje" href="#raadswerk" aria-pressed="${s === "motie"}">Moties</a><a class="knopje" href="#raadswerk/raadsvragen" aria-pressed="${s === "raadsvraag"}">Raadsvragen</a><a class="knopje" href="#petities">Petities</a></nav>
      <ul class="stukken" id="lijst">${alles.slice(0, 25).map(stukItem).join("")}</ul>
      ${alles.length > 25 ? `<button class="knop lijn meer-laden" type="button" id="meer">Meer laden</button>` : ""}
    </div></section>`;
};
pagina.raadswerk.na = async ([tab = "moties", id]) => {
  if (id) return detail.na();
  const alles = await soort(tab === "raadsvragen" ? "raadsvraag" : "motie");
  let n = 25; const meer = $("#meer");
  if (meer) meer.addEventListener("click", () => { $("#lijst").insertAdjacentHTML("beforeend", alles.slice(n, n + 25).map(stukItem).join("")); n += 25; if (n >= alles.length) meer.remove(); });
};

pagina.petities = async ([id]) => {
  if (id) return detail("petitie", decodeURIComponent(id), "Petities", "petities");
  const alles = await soort("petitie");
  return paginaKop("Petities", "Bewoners die samen iets willen veranderen. Teken mee, dan nemen wij het mee naar de raad.") +
    `<section><div class="wrap"><ul class="stukken">${alles.map(stukItem).join("")}</ul></div></section>`;
};
pagina.petities.na = detail.na;

pagina.fractie = async ([wie]) => {
  const fractie = await laad("fractie");
  if (wie) {
    const f = fractie.find(x => slug(x.naam) === wie);
    if (!f) return paginaKop("Niet gevonden", "");
    const idx = await laad("zoekindex");
    const achternaam = f.naam.split(" ").slice(-1)[0];
    const werk = idx.filter(i => (i.x + " " + i.t).includes(achternaam) && (i.x + i.t).includes(f.naam.split(" ")[0])).slice(0, 8);
    return paginaKop(esc(f.naam), f.stadsdelen.length ? `Raadslid voor ${esc(f.stadsdelen.join(" en "))}` : "Raadslid", `<a href="#">Home</a> / <a href="#fractie">Fractie</a>`) + `
      <section><div class="wrap artikel"><div><div class="artikel-tekst">${f.bio ? f.bio : `<p>${esc(f.naam)} is raadslid voor Hart voor Den Haag.</p>`}</div>
        ${werk.length ? `<h2 style="margin-top:40px;font-size:2rem">Recent werk</h2><ul class="stukken" style="margin-top:16px">${werk.map(i => `<li><span><span class="label">${SOORT_NAAM[i.s]}</span></span><h3><a href="#${PAD[i.s]}/${i.id}">${esc(i.t)}</a></h3><p class="bijschrift"><time>${datum(i.d)}</time></p></li>`).join("")}</ul>` : ""}</div>
        <aside class="zijkant"><div class="gezichten" style="grid-template-columns:1fr">${portret(f, false)}</div>
          <div class="zijblok"><h3>Contact</h3><p>Mail de fractie via hartvoordenhaag@denhaag.nl of gebruik het contactformulier.</p><a class="knop groen klein" href="#contact">Stuur een bericht</a></div></aside></div></section>`;
  }
  return paginaKop("De fractie", "Zestien raadsleden van Hart voor Den Haag. Elk met een eigen stadsdeel.") +
    `<section class="wit"><div class="wrap"><div class="gezichten">${fractie.map(f => portret(f)).join("")}</div>
     <p class="leeg" style="margin-top:28px">Bij drie raadsleden staan initialen: op de huidige site staat daar een bewerkte foto.</p></div></section>`;
};

pagina.bestuur = async () => {
  const b = await laad("bestuur");
  return paginaKop("Bestuur", "Het bestuur van Vereniging Groep de Mos, de vereniging achter Hart voor Den Haag.") + `
    <section class="wit"><div class="wrap"><div class="gezichten">${b.mensen.map(m => portret(m, false)).join("")}</div>
      <p style="margin-top:28px">U bereikt het bestuur via <b>${esc(b.mail)}</b>.</p></div></section>
    <section><div class="wrap"><div class="kop-rij"><div><h2>Jaarverslagen en jaarcijfers</h2><p class="inleiding">Open over geld en keuzes: alle verslagen en jaarcijfers op een rij.</p></div></div>
      <ul class="documenten">${b.stukken.map(s => `<li><a href="${esc(s.link)}" target="_blank" rel="noopener"><span>${esc(s.titel)}</span><span aria-hidden="true">↗</span></a></li>`).join("")}</ul></div></section>`;
};

pagina.agenda = async () => {
  const ag = await agenda();
  return paginaKop("Agenda", "Spreekuren, wijkschouwen en bijeenkomsten. Loop gerust binnen.") + `
    <section><div class="wrap">${ag.length ? `<ol class="agenda-lijst">${ag.map(agendaItem).join("")}</ol>` : `<p class="leeg">Er staat nu niets op de agenda.</p>`}
    <div class="melding" style="margin-top:28px">Staat er niets bij u in de buurt? <a href="#contact/spreekuur">Vraag een spreekuur aan in uw stadsdeel</a>.</div></div></section>`;
};

pagina.vacatures = async () => {
  const v = await soort("vacature");
  return paginaKop("Vacatures", "Werken of vrijwilligen voor de grootste lokale partij van Den Haag.") + `
    <section><div class="wrap">${v.length ? `<ul class="stukken">${v.map(stukItem).join("")}</ul>` : `<p class="leeg">Er staan nu geen vacatures open. Wilt u toch helpen? Meld u aan als vrijwilliger of wijkvertegenwoordiger.</p><p style="margin-top:18px"><a class="knop groen" href="#doe-mee">Ik doe mee</a></p>`}</div></section>`;
};
pagina.vacatures.na = () => {};

pagina["doe-mee"] = async () => paginaKop("Doe mee", "Den Haag wordt beter als u meedoet. Word wijkvertegenwoordiger of vrijwilliger in uw eigen stadsdeel.") + `
  <section><div class="wrap formulier-raster">
    <div><h2>Zo werkt het</h2><ol class="stappen">
      <li><div><b>Meld u aan</b><span>Vul het formulier in. Dat duurt een minuut.</span></div></li>
      <li><div><b>Kennismaken</b><span>Iemand uit uw stadsdeel belt of mailt u voor een eerste gesprek.</span></div></li>
      <li><div><b>Aan de slag</b><span>U helpt in uw eigen buurt, op momenten die u uitkomen.</span></div></li></ol>
      <p class="melding" style="margin-top:26px">Liever een poster voor uw raam? Zet het in het bericht, dan sturen we er een.</p></div>
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
      ${akkoordVeld}<button class="knop groen" type="submit">Ik doe mee</button><p class="uitslag" hidden></p></form>
  </div></section>`;
pagina["doe-mee"].na = () => koppelFormulier($("#form"), "doemee", "Dank u wel! Iemand uit uw stadsdeel neemt binnenkort contact met u op.");

pagina.contact = async ([onderwerp, sd]) => {
  const melding = onderwerp === "melding";
  const keuzes = [["contact", "Een vraag aan de fractie"], ["melding", "Iets in mijn buurt"], ["spreekuur", "Spreekuur aanvragen"], ["pers", "Pers en media"]];
  const gekozen = keuzes.some(k => k[0] === onderwerp) ? onderwerp : "contact";
  return paginaKop(melding ? "Meld een probleem" : "Contact", melding ? "Loszittende stoeptegels, overlast, een gevaarlijke oversteek: vertel het ons. Het ombudsteam pakt het op." : "Wij staan open voor uw ideeën en opmerkingen. Vertel ons uw verhaal, dan nemen we zo snel mogelijk contact op.") + `
  <section><div class="wrap formulier-raster">
    <div><h2>Bel of mail</h2><ul class="stukken" style="margin-top:20px">
      <li><h3>06 234 621 39</h3><p>Voor een snelle vraag</p></li>
      <li><h3>hartvoordenhaag@denhaag.nl</h3><p>Wij lezen elk bericht</p></li>
      <li><h3>Spui 70, Den Haag</h3><p>Fractiekamer in het stadhuis</p></li></ul>
      <p class="melding" style="margin-top:22px"><b>Gevaarlijke situatie?</b> Bel 112. Een melding voor de gemeente zelf kan via 14 070 of denhaag.nl.</p></div>
    <form class="formulier" id="form" novalidate>
      <fieldset><legend>Waar gaat uw bericht over?</legend><div class="keuzes">${keuzes.map((k, i) => `<div class="keuze"><input type="radio" name="onderwerp" id="o${i}" value="${k[0]}"${k[0] === gekozen ? " checked" : ""}><label for="o${i}"><b>${k[1]}</b></label></div>`).join("")}</div></fieldset>
      <div class="velden">
        <div class="veld"><label for="c-naam">Naam</label><input type="text" id="c-naam" name="naam" autocomplete="name"></div>
        <div class="veld"><label for="c-tel">Telefoonnummer</label><input type="tel" id="c-tel" name="telefoon" autocomplete="tel"></div>
        <div class="veld"><label for="c-email">E-mailadres</label><input type="email" id="c-email" name="email" autocomplete="email"></div>
        <div class="veld"><label for="c-sd">Stadsdeel</label><select id="c-sd" name="stadsdeel">${stadsdeelOpties(sd ? decodeURIComponent(sd) : "")}</select></div>
        <div class="veld breed" id="plek-veld"${gekozen === "melding" ? "" : " hidden"}><label for="c-plek">Waar is het? <small>Straat en huisnummer of een herkenningspunt</small></label><input type="text" id="c-plek" name="plek"></div>
        <div class="veld breed"><label for="c-ber">Uw bericht</label><textarea id="c-ber" name="bericht" maxlength="1500"></textarea><small id="teller">0 van 1500 tekens</small></div></div>
      ${akkoordVeld}<button class="knop groen" type="submit">Verstuur bericht</button><p class="uitslag" hidden></p></form>
  </div></section>`;
};
pagina.contact.na = () => {
  const form = $("#form");
  form.addEventListener("change", () => { $("#plek-veld").hidden = form.onderwerp.value !== "melding"; });
  $("#c-ber").addEventListener("input", e => { $("#teller").textContent = `${e.target.value.length} van 1500 tekens`; });
  koppelFormulier(form, d => d.onderwerp === "melding" ? "melding" : "contact", "Dank u wel! Uw bericht is binnen. We reageren zo snel mogelijk.");
};

pagina.lid = async () => paginaKop("Word lid", "Met meer leden zijn we sterker. Als lid praat u mee en kiest u mee over bestuur en kandidaat-raadsleden.") + `
  <section><div class="wrap formulier-raster">
    <div><h2>Lidmaatschappen</h2><ul class="soorten">
      <li><b>Silvermember</b><span class="prijs">€ 12,50</span><small>Per jaar. Inspraak, uitnodigingen voor ledenevenementen en het speldje met de groen-gele hartjes.</small></li>
      <li><b>Goldmember</b><span class="prijs">€ 25</span><small>Per jaar. Voor wie iets meer wil bijdragen.</small></li>
      <li><b>Ouderenlid, vanaf 65</b><span class="prijs">€ 6,70</span><small>Het eerste jaar, daarna € 12,50.</small></li>
      <li><b>Jongeren voor Den Haag</b><span class="prijs">€ 12,50</span><small>Per jaar, of € 25 als goldmember. Voor jongeren die Den Haag weer bruisend willen maken.</small></li></ul>
      <p class="leeg" style="margin-top:18px">Bij opzeggen krijgt u geen geld terug; u blijft lid tot het einde van de betaalde periode.</p></div>
    <form class="formulier" id="form" novalidate>
      <fieldset><legend>Kies uw lidmaatschap</legend><div class="keuzes">
        <div class="keuze"><input type="radio" name="soort" id="s1" value="silver" checked><label for="s1"><b>Silvermember</b><span>€ 12,50 per jaar</span></label></div>
        <div class="keuze"><input type="radio" name="soort" id="s2" value="gold"><label for="s2"><b>Goldmember</b><span>€ 25 per jaar</span></label></div>
        <div class="keuze"><input type="radio" name="soort" id="s3" value="ouder"><label for="s3"><b>Ouderenlid</b><span>€ 6,70 het eerste jaar</span></label></div>
        <div class="keuze"><input type="radio" name="soort" id="s4" value="jong"><label for="s4"><b>Jongerenlid</b><span>€ 12,50 per jaar</span></label></div></div></fieldset>
      <fieldset><legend>Hoe wilt u betalen?</legend><div class="keuzes">
        <div class="keuze"><input type="radio" name="betaal" id="b1" value="incasso" checked><label for="b1"><b>Automatische incasso</b><span>Eerste keer met iDEAL, daarna vanzelf</span></label></div>
        <div class="keuze"><input type="radio" name="betaal" id="b2" value="ideal"><label for="b2"><b>Elk jaar zelf</b><span>U krijgt een betaalverzoek</span></label></div></div></fieldset>
      <div class="velden">
        <div class="veld"><label for="l-naam">Naam</label><input type="text" id="l-naam" autocomplete="name"></div>
        <div class="veld"><label for="l-email">E-mailadres</label><input type="email" id="l-email" autocomplete="email"></div>
        <div class="veld"><label for="l-pc">Postcode</label><input type="text" id="l-pc" autocomplete="postal-code"></div>
        <div class="veld"><label for="l-nr">Huisnummer</label><input type="text" id="l-nr"></div></div>
      <div class="betaal">Betalen met <span>iDEAL</span><span>automatische incasso</span></div>
      <button class="knop groen" type="submit">Lid worden en betalen</button><p class="uitslag melding" hidden></p></form>
  </div></section>`;
pagina.lid.na = () => $("#form").addEventListener("submit", e => { e.preventDefault(); const u = $(".uitslag"); u.hidden = false; u.textContent = "Dit is een proef: er is niets verstuurd of betaald. Straks gaat u hier naar iDEAL en komt uw aanmelding direct in PerfectView."; });

pagina.doneren = async () => paginaKop("Doneer", "Geen lid, wel steunen? Elke bijdrage gaat naar acties in de wijk, het ombudsteam en campagnemateriaal.") + `
  <section><div class="wrap formulier-raster">
    <div><h2>Waar uw geld heen gaat</h2><ol class="stappen">
      <li><div><b>Acties in de wijk</b><span>Schouwen, bewonersavonden en spreekuren in alle acht stadsdelen.</span></div></li>
      <li><div><b>Het ombudsteam</b><span>Zodat meldingen van bewoners snel worden opgepakt.</span></div></li>
      <li><div><b>Campagne</b><span>Posters, flyers en filmpjes.</span></div></li></ol>
      <p class="melding" style="margin-top:26px">Giften aan politieke partijen vallen onder regels voor openheid. Daarom vragen we altijd uw naam en woonplaats. Anonieme giften nemen we niet aan.</p></div>
    <form class="formulier" id="form" novalidate>
      <fieldset><legend>Hoe vaak?</legend><div class="keuzes kort">
        <div class="keuze"><input type="radio" name="vaak" id="v1" value="eenmalig" checked><label for="v1"><b>Eenmalig</b></label></div>
        <div class="keuze"><input type="radio" name="vaak" id="v2" value="maandelijks"><label for="v2"><b>Maandelijks</b></label></div></div></fieldset>
      <fieldset><legend>Bedrag</legend><div class="keuzes drie">
        ${[10, 25, 50, 100, 250].map((b, i) => `<div class="keuze"><input type="radio" name="bedrag" id="d${i}" value="${b}"${b === 25 ? " checked" : ""}><label for="d${i}"><b>€ ${b}</b></label></div>`).join("")}
        <div class="keuze"><input type="radio" name="bedrag" id="d9" value="eigen"><label for="d9"><b>Eigen bedrag</b></label></div></div>
        <div class="veld" id="eigen-veld" hidden><label for="d-eigen">Uw bedrag in euro</label><input type="number" id="d-eigen" min="1" step="1" inputmode="numeric"></div></fieldset>
      <div class="velden">
        <div class="veld"><label for="d-naam">Naam</label><input type="text" id="d-naam" autocomplete="name"></div>
        <div class="veld"><label for="d-plaats">Woonplaats</label><input type="text" id="d-plaats" autocomplete="address-level2"></div>
        <div class="veld breed"><label for="d-email">E-mailadres</label><input type="email" id="d-email" autocomplete="email"></div></div>
      <button class="knop groen" type="submit" id="doneer-knop">Doneer € 25 met iDEAL</button><p class="uitslag melding" hidden></p></form>
  </div></section>`;
pagina.doneren.na = () => {
  const f = $("#form");
  const zet = () => {
    const eigen = f.bedrag.value === "eigen";
    $("#eigen-veld").hidden = !eigen;
    const b = eigen ? ($("#d-eigen").value || "…") : f.bedrag.value;
    $("#doneer-knop").textContent = `Doneer € ${b}${f.vaak.value === "maandelijks" ? " per maand" : ""} met iDEAL`;
  };
  f.addEventListener("input", zet); f.addEventListener("change", zet);
  f.addEventListener("submit", e => { e.preventDefault(); const u = $(".uitslag"); u.hidden = false; u.textContent = "Dit is een proef: er is niets betaald. Straks opent hier iDEAL via Mollie."; });
};

pagina.zoeken = async ([term = ""]) => {
  term = decodeURIComponent(term);
  const [idx, nieuw] = await Promise.all([laad("zoekindex"), eigen()]);
  const woorden = term.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const alles = [...nieuw.map(i => ({ id: i.id, s: i.soort, t: i.titel, d: i.datum, x: i.samenvatting, sd: i.stadsdelen })), ...idx];
  const treffers = woorden.length ? alles.map(i => {
    const t = i.t.toLowerCase(), x = (i.x || "").toLowerCase() + " " + (i.sd || []).join(" ").toLowerCase();
    if (!woorden.every(w => t.includes(w) || x.includes(w))) return null;
    return { ...i, score: woorden.reduce((s, w) => s + (t.includes(w) ? 5 : 1), 0) + (i.d > "2026" ? 1 : 0) };
  }).filter(Boolean).sort((a, b) => b.score - a.score || b.d.localeCompare(a.d)).slice(0, 40) : [];
  const licht = s => { let h = esc(s); woorden.forEach(w => { h = h.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"), "<mark>$1</mark>"); }); return h; };
  const knipsel = x => { const l = (x || "").toLowerCase(); const p = Math.max(0, l.indexOf(woorden[0] || "") - 60); return (p ? "…" : "") + x.slice(p, p + 220) + "…"; };
  return paginaKop("Zoeken", term ? `${treffers.length >= 40 ? "Meer dan 40" : treffers.length} resultaten voor "${esc(term)}"` : "Zoek in nieuws, successen, moties, raadsvragen en petities.") + `
    <section><div class="wrap">
      <form id="zoek2" role="search" style="display:flex;gap:10px;max-width:720px;margin-bottom:28px"><label class="valkuil" for="zoek2-veld">Zoekterm</label><input type="search" id="zoek2-veld" value="${esc(term)}" placeholder="Bijvoorbeeld Moerwijk, parkeren of Kwartellaan"><button class="knop groen klein" type="submit">Zoeken</button></form>
      ${term && !treffers.length ? `<p class="leeg">Niets gevonden. Probeer een ander woord, of zoek op een straat of wijk.</p>` : ""}
      <ul class="stukken zoek-treffer">${treffers.map(i => `<li><span><span class="label${i.s === "succes" ? " succes" : ""}">${SOORT_NAAM[i.s]}</span></span><h3><a href="#${PAD[i.s]}/${encodeURIComponent(i.id)}">${licht(i.t)}</a></h3><p class="bijschrift"><span class="plek">${esc((i.sd && i.sd.length) ? i.sd.join(" en ") : "Heel Den Haag")}</span><time>${datum(i.d)}</time></p><p>${licht(knipsel(i.x || ""))}</p></li>`).join("")}</ul>
    </div></section>`;
};
pagina.zoeken.na = () => $("#zoek2").addEventListener("submit", e => { e.preventDefault(); location.hash = "zoeken/" + encodeURIComponent($("#zoek2-veld").value.trim()); });

// ---------- router ----------
const TITELS = { home: "Hart voor Den Haag", nieuws: "Nieuws", successen: "Successen", raadswerk: "Raadswerk", petities: "Petities", fractie: "Fractie", bestuur: "Bestuur", agenda: "Agenda", vacatures: "Vacatures", "doe-mee": "Doe mee", contact: "Contact", lid: "Word lid", doneren: "Doneer", zoeken: "Zoeken", stadsdelen: "Stadsdelen" };
async function route() {
  const delen = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  let naam = delen.shift() || "home";
  if (naam === "inhoud") return;
  if (!pagina[naam]) naam = "home";
  const app = $("#app");
  try {
    app.innerHTML = await pagina[naam](delen);
    if (pagina[naam].na) await pagina[naam].na(delen);
  } catch (e) {
    console.error(e);
    app.innerHTML = paginaKop("Er ging iets mis", "Laad de pagina opnieuw.");
  }
  document.title = (naam === "home" ? "" : (TITELS[naam] || "") + " | ") + "Hart voor Den Haag (proef)";
  document.querySelectorAll(".menu a").forEach(a => { if (a.getAttribute("href") === "#" + naam) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  $("#lade").hidden = true; $("#menu-knop").setAttribute("aria-expanded", "false");
  window.scrollTo(0, 0);
}
addEventListener("hashchange", route);
route();

// kop: zoeken en menu
$("#zoek-knop").addEventListener("click", () => {
  const z = $("#zoekbalk"); z.hidden = !z.hidden; $("#zoek-knop").setAttribute("aria-expanded", String(!z.hidden));
  if (!z.hidden) $("#zoek-veld").focus();
});
$("#zoek-form").addEventListener("submit", e => { e.preventDefault(); const t = $("#zoek-veld").value.trim(); if (t) { location.hash = "zoeken/" + encodeURIComponent(t); $("#zoekbalk").hidden = true; } });
$("#menu-knop").addEventListener("click", () => { $("#lade").hidden = false; $("#menu-knop").setAttribute("aria-expanded", "true"); $("#lade-dicht").focus(); });
$("#lade-dicht").addEventListener("click", () => { $("#lade").hidden = true; $("#menu-knop").setAttribute("aria-expanded", "false"); });
$("#lade").addEventListener("click", e => { if (e.target.id === "lade") e.target.hidden = true; });
addEventListener("keydown", e => { if (e.key === "Escape") { $("#lade").hidden = true; $("#zoekbalk").hidden = true; } });
