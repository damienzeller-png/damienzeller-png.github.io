/* Dossiers: dezelfde indeling als tools/nieuws.py, uit dossiers.json. Gebruikt door index.html en nieuws.html. */
window.Dossiers = (() => {
  let lijst = [], partij = null, laden = null;
  const STADSDEEL = "Leidschenveen-Ypenburg";
  const tel = (re, t) => (String(t || "").match(re) || []).length;
  return {
    laad() {
      if (!laden) laden = fetch("dossiers.json", { cache: "no-cache" }).then(r => r.json()).then(d => {
        partij = d.partijnieuws ? new RegExp(d.partijnieuws, "i") : null;
        lijst = (d.dossiers || []).map(x => Object.assign({}, x, { re: new RegExp(x.patroon, "gi"), gewicht: x.algemeen ? 1 : 2 }));
        this.themas = d.themas || [];
        return lijst;
      }).catch(() => (lijst = []));
      return laden;
    },
    /* het dossier met de meeste treffers; een treffer in de titel telt drie keer, een specifiek dossier dubbel */
    label(titel, tekst) {
      if (!lijst.length) return "";
      if (partij && partij.test(titel + " " + tekst)) return "";
      let beste = "", score = 0;
      for (const d of lijst) {
        if (d.naam === STADSDEEL && score) break;
        const s = d.gewicht * (3 * tel(d.re, titel) + tel(d.re, tekst));
        if (s > score) { beste = d.naam; score = s; }
      }
      return beste;
    },
    /* het bijschrift, overal hetzelfde: plek · dossier · datum. Het dossier is een link naar de nieuwspagina. */
    bijschrift(x, o) {
      o = o || {};
      const maak = (t, cls, txt) => { const e = document.createElement(t); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
      const p = maak("p", "bijschrift");
      if (x.buurt && !o.zonderPlek) p.append(maak("span", "plek", x.buurt));
      if (x.dossier && !(x.dossier === STADSDEEL && x.buurt)) p.append(this.dosLink(x.dossier));
      const d = new Date(x.datum);
      if (x.datum && !isNaN(d)) {
        const M = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
        const t = maak("time", null, `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`); t.dateTime = x.datum; p.append(t);
      }
      return p;
    },
    dosLink(naam) {
      const a = document.createElement("a"); a.className = "dos"; a.textContent = this.kort(naam);
      a.href = "nieuws.html?dossier=" + encodeURIComponent(naam);
      a.setAttribute("aria-label", "Alle berichten over " + naam);
      return a;
    },
    /* kaartje van het stadsdeel als beeld bij een bericht zonder foto: alle buurten als lijn, de buurt van het bericht in groen */
    laadKaart() {
      if (!this._kaart) this._kaart = fetch("buurten.geojson").then(r => r.json()).then(g => (this._geo = g)).catch(() => null);
      return this._kaart;
    },
    kaartje(buurt) {
      const g = this._geo, ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg"); svg.setAttribute("class", "kaartje-svg"); svg.setAttribute("aria-hidden", "true");
      if (!g) return svg;
      const WIJK = { Ypenburg: ["Bosweide", "De Bras", "De Venen", "Morgenweide", "Singels", "Tedingerbroek", "Waterbuurt"],
                     Hoornwijck: ["De Rivieren", "Vlietzoom-Oost"], Leidschenveen: ["De Lanen", "De Velden", "De Vissen", "Rietbuurt"] };
      const doel = WIJK[buurt] || (buurt ? [buurt] : []);
      const ringen = f => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).map(p => p[0]);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      const kx = Math.cos(52.06 * Math.PI / 180);
      for (const f of g.features) for (const r of ringen(f)) for (const [x, y] of r) { x0 = Math.min(x0, x * kx); x1 = Math.max(x1, x * kx); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const W = 300, H = 200, pad = 14, s = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0));
      const ox = (W - (x1 - x0) * s) / 2, oy = (H - (y1 - y0) * s) / 2;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      for (const f of g.features) {
        const d = ringen(f).map(r => "M" + r.map(([x, y]) => `${((x * kx - x0) * s + ox).toFixed(1)} ${((y1 - y) * s + oy).toFixed(1)}`).join("L") + "Z").join("");
        const p = document.createElementNS(ns, "path"); p.setAttribute("d", d);
        if (doel.includes(f.properties.buurt)) p.setAttribute("class", "aan");
        svg.append(p);
      }
      return svg;
    },
    kort(naam) { const d = lijst.find(x => x.naam === naam); return d ? d.kort : naam; },
    thema(naam) { const d = lijst.find(x => x.naam === naam); return d ? d.thema : ""; },
    alle() { return lijst.slice(); },
    themas: []
  };
})();
