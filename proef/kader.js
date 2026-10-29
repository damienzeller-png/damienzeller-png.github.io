/* Kop, menu en voet van de site. Ze staan hier één keer, zodat elke pagina dezelfde kop en voet krijgt:
   de voorpagina, de lijsten en de duizenden losse stukken (die de import als eigen pagina op het oude adres neerzet).
   Dit script laadt in de <head>, vóór de inhoud, zodat de kop er meteen staat en niets verspringt.
   BASE is de map van de site: nu /proef/, na de overstap naar hartvoordenhaag.nl wordt het "/". */
"use strict";
window.HVDH = window.HVDH || {};
HVDH.BASE = "/proef/";
// Sitesleutel van Cloudflare Turnstile (robotcontrole op formulieren). Leeg = uit. Zie LEESMIJ.md.
HVDH.TURNSTILE = "";
(() => {
  const B = HVDH.BASE;
  const WA = "https://whatsapp.com/channel/0029VaD3yaZGE56qCyallu3r";
  const WEBSHOP = "https://webshop.hartvoordenhaag.nl/";
  const PROGRAMMA = "https://www.hartvoordenhaag.nl/wp-content/uploads/2026/01/EnNuAanDeSlag_Hart_voor_Den_Haag_V1.pdf";
  const WA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2s.2-1.1.2-1.2-.2-.2-.4-.3z"/></svg>';
  const SOCIAAL = [
    ["Facebook", "https://www.facebook.com/HartvoorDenHaag", '<path d="M14 8h3V4h-3c-2.8 0-4 1.7-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6z"/>'],
    ["Instagram", "https://www.instagram.com/hartvoordenhaag/", '<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.2"/>'],
    ["TikTok", "https://www.tiktok.com/@hartvoordenhaag", '<path d="M16.6 3c.4 2.4 1.9 3.9 4.4 4.1v3.3c-1.6.1-3-.4-4.4-1.2v6.2c0 3.7-2.7 6.6-6.4 6.6S3.8 19.1 3.8 15.6c0-3.9 3.4-6.8 7.5-6.2v3.4c-1.9-.4-3.9.8-3.9 2.8 0 1.6 1.3 2.8 2.8 2.8 1.7 0 2.9-1.2 2.9-3.3V3z"/>'],
    ["YouTube", "https://www.youtube.com/@hartvoordenhaag", '<path d="M22.5 7.2a2.8 2.8 0 0 0-2-2C18.8 4.7 12 4.7 12 4.7s-6.8 0-8.5.5a2.8 2.8 0 0 0-2 2C1 8.9 1 12 1 12s0 3.1.5 4.8a2.8 2.8 0 0 0 2 2c1.7.5 8.5.5 8.5.5s6.8 0 8.5-.5a2.8 2.8 0 0 0 2-2c.5-1.7.5-4.8.5-4.8s0-3.1-.5-4.8zM9.8 15.1V8.9l5.7 3.1z"/>'],
    ["Podcast Den Haag Inside op Spotify", "https://open.spotify.com/show/0GI8mwNvxU1g3YUPhiJCeV", '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.4a.6.6 0 0 1-.9.2c-2.4-1.5-5.4-1.8-9-1a.6.6 0 1 1-.3-1.2c3.9-.9 7.2-.5 9.9 1.1.3.2.4.6.3.9zm1.2-2.7a.8.8 0 0 1-1.1.3c-2.7-1.7-6.9-2.2-10.1-1.2a.8.8 0 1 1-.5-1.5c3.7-1.1 8.3-.6 11.4 1.3.4.2.5.7.3 1.1zm.1-2.8C14.7 9 9.4 8.8 6.3 9.7a.9.9 0 1 1-.5-1.8c3.5-1.1 9.4-.9 13.1 1.3a.9.9 0 0 1-1 1.7z"/>'],
    ["LinkedIn", "https://www.linkedin.com/company/hartvoordenhaag/", '<path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM3 9h4v12H3zm7 0h3.8v1.7h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.6c0-1.3 0-3-1.9-3s-2.2 1.5-2.2 2.9V21h-4z"/>'],
    ["X", "https://x.com/Hartv00rDenHaag", '<path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z"/>'],
    ["WhatsApp", WA, WA_SVG.replace(/^<svg[^>]*>|<\/svg>$/g, "")],
  ];
  const TALEN = [["en", "English"], ["tr", "Türkçe"], ["ar", "العربية"], ["pl", "Polski"], ["bg", "Български"], ["es", "Español"], ["uk", "Українська"]];
  const a = (pad, tekst, extra = "") => `<a href="${B}${pad}"${extra}>${tekst}</a>`;

  const KOP = `<header class="balk">
  <a class="naar-inhoud" href="#inhoud">Naar de inhoud</a>
  <div class="wrap">
    <a class="merk" href="${B}" aria-label="Hart voor Den Haag, naar de voorpagina"><img class="logo-licht" src="${B}beeld/logo.svg" alt="Hart voor Den Haag" width="155" height="36"></a>
    <nav class="menu" aria-label="Hoofdmenu">
      <ul>
        <li>${a("nieuws/", "Nieuws", ' data-sectie="nieuws"')}</li>
        <li>${a("stadsdelen/", "Uw stadsdeel", ' data-sectie="stadsdelen"')}</li>
        <li class="uitklap"><button type="button" aria-expanded="false" aria-controls="m-raad" data-sectie="raadswerk successen petities onderwerpen">Raadswerk</button>
          <div class="uitklap-paneel" id="m-raad"><div>
            ${a("raadswerk/", "<b>Moties</b>")}${a("raadswerk/amendementen/", "<b>Amendementen</b>")}${a("raadswerk/vragen/", "<b>Schriftelijke vragen</b>")}${a("raadswerk/spreekteksten/", "<b>Spreekteksten</b>")}
          </div><div>
            ${a("successen/", "<b>Successen</b>")}${a("petities/", "<b>Petities</b>")}${a("onderwerpen/", "<b>Dossiers</b>")}
          </div></div></li>
        <li class="uitklap"><button type="button" aria-expanded="false" aria-controls="m-wie" data-sectie="standpunten fractie wethouders bestuur pers english">Wie we zijn</button>
          <div class="uitklap-paneel" id="m-wie"><div>
            ${a("standpunten/", "<b>Standpunten</b>")}${a("fractie/", "<b>Onze mensen</b>")}${a("wethouders/", "<b>Wethouders</b>")}${a("bestuur/", "<b>Bestuur</b>")}${a("pers/", "<b>Pers</b>")}${a("english/", "<b>In English</b>", ' lang="en"')}
          </div></div></li>
        <li class="uitklap"><button type="button" aria-expanded="false" aria-controls="m-mee" data-sectie="lid doneren doe-mee vacatures agenda">Doe mee</button>
          <div class="uitklap-paneel" id="m-mee"><div>
            ${a("lid/", "<b>Word lid</b>")}${a("doneren/", "<b>Doneren</b>")}${a("doe-mee/", "<b>Doe mee in uw buurt</b>")}${a("agenda/", "<b>Agenda en spreekuren</b>")}${a("vacatures/", "<b>Vacatures</b>")}<a href="${WEBSHOP}" target="_blank" rel="noopener"><b>Webshop</b></a>
          </div></div></li>
        <li>${a("contact/", "Contact", ' data-sectie="contact"')}</li>
      </ul>
    </nav>
    <div class="balk-rechts">
      <button class="ikoon-knop" type="button" id="zoek-knop" aria-label="Zoeken" aria-expanded="false" aria-controls="zoekbalk"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg></button>
      <a class="knop lijn klein balk-meld" href="${B}contact/melding/" data-sectie="melding">Meld een probleem</a>
      <a class="knop geel klein balk-lid" href="${B}lid/">Word lid</a>
    </div>
  </div>
  <div class="zoekbalk" id="zoekbalk" hidden>
    <div class="wrap">
      <form id="zoek-form" role="search" action="${B}zoeken/">
        <label class="verborgen" for="zoek-veld">Zoeken op de site</label>
        <input type="search" id="zoek-veld" name="q" placeholder="Zoek op onderwerp, straat of naam" autocomplete="off">
        <button class="knop geel klein" type="submit">Zoeken</button>
      </form>
    </div>
  </div>
</header>
<aside class="datumregel" aria-label="Over deze site"><div class="wrap">
  <p><b>Proef</b><span class="dr-datum"> · nieuwe website van Hart voor Den Haag · <time id="vandaag"></time></span></p>
  <p class="dr-rechts"><a class="dr-meld" href="${B}contact/melding/">Meld een probleem</a><a href="${B}agenda/" id="strook-spreekuur">Agenda</a><a href="tel:+31623462139">06 234 621 39</a><a class="wa" href="${WA}" target="_blank" rel="noopener" aria-label="WhatsApp-kanaal van Hart voor Den Haag">${WA_SVG}<span class="wa-tekst">WhatsApp-kanaal</span></a></p>
</div></aside>
<div class="lade" id="lade" hidden>
  <nav class="lade-paneel" aria-label="Menu" role="dialog" aria-modal="true">
    <div class="lade-kop"><img class="logo-licht" src="${B}beeld/logo.svg" alt="" height="30"><button class="ikoon-knop" type="button" id="lade-dicht" aria-label="Menu sluiten"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    ${a("nieuws/", "Nieuws", ' class="hoofd"')}${a("stadsdelen/", "Uw stadsdeel", ' class="hoofd"')}${a("agenda/", "Agenda en spreekuren", ' class="hoofd"')}${a("contact/melding/", "Meld een probleem", ' class="hoofd"')}${a("contact/", "Contact", ' class="hoofd"')}<a class="hoofd" href="${WA}" target="_blank" rel="noopener">WhatsApp-kanaal</a>
    <p class="lade-groep">Raadswerk</p>
    <div class="lade-links">${a("raadswerk/", "Moties")}${a("raadswerk/amendementen/", "Amendementen")}${a("raadswerk/vragen/", "Schriftelijke vragen")}${a("raadswerk/spreekteksten/", "Spreekteksten")}${a("successen/", "Successen")}${a("petities/", "Petities")}${a("onderwerpen/", "Dossiers")}</div>
    <p class="lade-groep">Wie we zijn</p>
    <div class="lade-links">${a("standpunten/", "Standpunten")}${a("fractie/", "Onze mensen")}${a("wethouders/", "Wethouders")}${a("bestuur/", "Bestuur")}${a("pers/", "Pers")}${a("english/", "In English", ' lang="en"')}</div>
    <p class="lade-groep">Doe mee</p>
    <div class="lade-links">${a("doneren/", "Doneren")}${a("doe-mee/", "Doe mee in uw buurt")}${a("vacatures/", "Vacatures")}<a href="${WEBSHOP}" target="_blank" rel="noopener">Webshop</a></div>
    ${a("lid/", "Word lid", ' class="knop geel"')}
  </nav>
</div>`;

  const groep = (naam, links) => `<details class="voet-groep" open><summary>${naam}</summary><div>${links}</div></details>`;
  const VOET = `<footer class="voet">
  <div class="wrap">
    <div class="voet-boven">
      <div><img class="logo-licht" src="${B}beeld/logo.svg" alt="Hart voor Den Haag" width="172" height="40" loading="lazy"><p class="zin">De grootste lokale partij van Den Haag. Zichtbaar in de wijken, dicht bij de Hagenaar.</p></div>
      <form class="nieuwsbrief" id="nieuwsbrief" novalidate>
        <label for="nb-email">Nieuwsbrief: elke maand wat we deden</label>
        <div class="nb-rij"><input type="email" id="nb-email" name="email" autocomplete="email" placeholder="uw@email.nl"><button class="knop geel klein" type="submit">Aanmelden</button></div>
        <p class="uitslag" hidden></p>
        <a class="nb-wa" href="${WA}" target="_blank" rel="noopener">${WA_SVG}Of volg ons WhatsApp-kanaal</a>
      </form>
    </div>
    <div class="voet-kolommen">
      <div class="voet-contact"><b>Hart voor Den Haag</b><span>Spui 70, 2511 BT Den Haag</span><a href="tel:+31623462139">Bel 06 234 621 39</a><a href="mailto:hartvoordenhaag@denhaag.nl">hartvoordenhaag@denhaag.nl</a></div>
      ${groep("Raadswerk", a("raadswerk/", "Moties") + a("raadswerk/amendementen/", "Amendementen") + a("raadswerk/vragen/", "Schriftelijke vragen") + a("raadswerk/spreekteksten/", "Spreekteksten") + a("successen/", "Successen") + a("petities/", "Petities") + a("onderwerpen/", "Dossiers"))}
      ${groep("Partij", a("standpunten/", "Standpunten") + `<a href="${PROGRAMMA}" target="_blank" rel="noopener">Verkiezingsprogramma (pdf)</a>` + a("fractie/", "Onze mensen") + a("wethouders/", "Wethouders") + a("bestuur/", "Bestuur") + a("pers/", "Pers") + a("english/", "In English", ' lang="en"'))}
      ${groep("Meedoen", a("lid/", "Word lid") + a("doneren/", "Doneren") + a("doe-mee/", "Doe mee in uw buurt") + a("agenda/", "Agenda en spreekuren") + a("vacatures/", "Vacatures") + `<a href="${WEBSHOP}" target="_blank" rel="noopener">Webshop</a>`)}
    </div>
    <div class="voet-rij">
      <div class="sociaal" role="group" aria-label="Volg Hart voor Den Haag">${SOCIAAL.map(([n, u, p]) => `<a href="${u}" target="_blank" rel="noopener" aria-label="${n}" title="${n}"><svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg></a>`).join("")}</div>
      <div class="vertaal" id="vertaal"><label for="taal">Lees deze site in</label><select id="taal"><option value="">Nederlands</option>${TALEN.map(([c, n]) => `<option value="${c}" lang="${c}">${n}</option>`).join("")}</select></div>
    </div>
    <p class="voet-onder">${a("privacy/", "Privacy")}${a("toegankelijkheid/", "Toegankelijkheid")}<a href="${B}feed.xml">Nieuws als RSS-feed</a><a href="${B}beheer.html">Inloggen redactie</a><span>Proefontwerp, niet de officiële site</span></p>
  </div>
</footer>
<div class="zweef weg" id="zweef"><div class="ballon-rij" hidden><a class="ballon" href="${B}doe-mee/">Doe mee en volg ons!</a><button class="sluit" type="button" aria-label="Melding sluiten">×</button></div><a class="rond" href="${WA}" target="_blank" rel="noopener" aria-label="Volg ons WhatsApp-kanaal">${WA_SVG}</a></div>
<nav class="onderbalk" aria-label="Snel naar">
  <a href="${B}nieuws/" data-sectie="nieuws"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11l3 3v13H5z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>Nieuws</a>
  <a href="${B}stadsdelen/" data-sectie="stadsdelen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>Uw stadsdeel</a>
  <a class="meld" href="${B}contact/melding/" data-sectie="melding"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>Meld een probleem</a>
  <button type="button" id="menu-knop" aria-expanded="false" aria-controls="lade"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>Menu</button>
</nav>`;

  // Custom elements: de browser vult ze in zodra de parser ze tegenkomt, dus vóór de eerste weergave.
  class Kop extends HTMLElement { connectedCallback() { if (!this.dataset.klaar) { this.dataset.klaar = "1"; this.innerHTML = KOP; } } }
  class Voet extends HTMLElement { connectedCallback() { if (!this.dataset.klaar) { this.dataset.klaar = "1"; this.innerHTML = VOET; } } }
  if (window.customElements && !customElements.get("hvdh-kop")) { customElements.define("hvdh-kop", Kop); customElements.define("hvdh-voet", Voet); }
})();
