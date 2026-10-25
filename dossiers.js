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
    kort(naam) { const d = lijst.find(x => x.naam === naam); return d ? d.kort : naam; },
    thema(naam) { const d = lijst.find(x => x.naam === naam); return d ? d.thema : ""; },
    alle() { return lijst.slice(); },
    themas: []
  };
})();
