#!/usr/bin/env python3
"""Haalt de inhoud van hartvoordenhaag.nl op via de WordPress-API en schrijft proef/data/*.json.

Gebruik: python proef/tools/importeer.py   (vanuit de map van de website-repo)
Alleen openbare inhoud: nieuws, successen, moties, raadsvragen, petities en de fractie.
Wat redacteuren in de beheeromgeving plaatsen, komt er in de browser bovenop (via de Worker).
"""
import html
import json
import os
import re
import sys
import urllib.request

API = "https://www.hartvoordenhaag.nl/wp-json/wp/v2/"
UIT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
STADSDEEL = {48: "Centrum", 52: "Escamp", 49: "Haagse Hout", 53: "Laak", 50: "Leidschenveen-Ypenburg",
             54: "Loosduinen", 51: "Scheveningen", 55: "Segbroek"}
PETITIES = 82


def haal(pad):
    req = urllib.request.Request(API + pad, headers={"User-Agent": "proefsite-hvdh/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def tekst(s):
    s = re.sub(r"(?s)<(script|style)[^>]*>.*?</\1>", "", s or "")
    s = html.unescape(re.sub(r"<[^>]+>", " ", s))
    return re.sub(r"\s+", " ", s).strip()


def schoon_html(s):
    s = re.sub(r"(?s)<(script|style|noscript|form|iframe)[^>]*>.*?</\1>", "", s or "")
    s = re.sub(r"(?s)<!--.*?-->", "", s)
    s = re.sub(r'\s(on\w+|style|class|id|srcset|sizes|data-[\w-]+)="[^"]*"', "", s)
    s = re.sub(r"<(/?)(div|span|section|figure|figcaption)[^>]*>", lambda m: "" if m.group(2) in ("div", "span", "section") else f"<{m.group(1)}{m.group(2)}>", s)
    s = re.sub(r'href="https://www\.hartvoordenhaag\.nl/', 'target="_blank" rel="noopener" href="https://www.hartvoordenhaag.nl/', s)
    s = re.sub(r"<p>\s*(&nbsp;)?\s*</p>", "", s)
    return s.strip()


def beeld(x):
    try:
        m = x["_embedded"]["wp:featuredmedia"][0]
        maten = m.get("media_details", {}).get("sizes", {})
        for k in ("medium_large", "large", "full"):
            if k in maten:
                return maten[k]["source_url"]
        return m.get("source_url", "")
    except (KeyError, IndexError, TypeError):
        return ""


def echt_beeld(url):
    # AI-bewerkte portretten slaan we over: op de site alleen echte foto's
    return "" if "Use-AI-Image" in (url or "") else url


def bestuur():
    req = urllib.request.Request("https://www.hartvoordenhaag.nl/bestuur/", headers={"User-Agent": "proefsite-hvdh/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        h = r.read().decode("utf-8", "ignore")
    h = re.sub(r"(?s)<(script|style|svg|noscript)[^>]*>.*?</\1>", "", h)
    h = h[h.find("Bestuur Ver. Groep de Mos</h1>"):]
    regels = []
    t = re.sub(r'<img[^>]*src="([^"]+)"[^>]*>', lambda m: "\nIMG " + m.group(1) + "\n", h)
    for r in re.split(r"<[^>]+>|\n", t):
        r = html.unescape(r).strip()
        if r:
            regels.append(r)
    mensen = []
    for i, r in enumerate(regels[:-2]):
        if r.startswith("IMG ") and re.search(r"(?i)voorzitter|secretaris|penningmeester|bestuurslid", regels[i + 2]):
            mensen.append({"naam": regels[i + 1], "rol": regels[i + 2], "beeld": r[4:]})
    stukken = [{"titel": re.sub(r"\s*PDF\s*[—-]\s*", " (PDF, ", tekst(t)) + ")" if "PDF" in tekst(t) else tekst(t), "link": l if l.startswith("http") else "https://www.hartvoordenhaag.nl" + l}
               for l, t in re.findall(r'<a[^>]+href="([^"]+\.pdf)"[^>]*>(.*?)</a>', h, re.S) if tekst(t)]
    mail = (re.search(r"[\w.]+@hartvoordenhaag\.nl", h) or [""])[0]
    return {"mensen": mensen, "stukken": stukken, "mail": mail}


def item(x, soort, met_html=True):
    t = tekst(x["title"]["rendered"])
    samen = tekst(x.get("excerpt", {}).get("rendered", "")) or tekst(x["content"]["rendered"])
    samen = re.sub(r"\s*(Lees verder|verder lezen)\s*»?$", "", samen)
    d = {"id": f"{soort[0]}{x['id']}", "soort": soort, "slug": x["slug"], "titel": t, "datum": x["date"][:10],
         "samenvatting": samen[:260] + ("…" if len(samen) > 260 else ""), "beeld": echt_beeld(beeld(x)), "link": x["link"],
         "stadsdelen": [STADSDEEL[s] for s in x.get("stadsdeel", []) if s in STADSDEEL]}
    if met_html:
        d["html"] = schoon_html(x["content"]["rendered"])
    return d


def uniek(items):
    gezien, uit = set(), []
    for i in items:
        k = (i["titel"].lower(), i["datum"])
        if k not in gezien:
            gezien.add(k)
            uit.append(i)
    return uit


def lijst(pad, aantal):
    uit, pagina = [], 1
    per = min(100, aantal)
    while len(uit) < aantal:
        sep = "&" if "?" in pad else "?"
        stuk = haal(f"{pad}{sep}per_page={per}&page={pagina}&_embed=wp:featuredmedia")
        uit += stuk
        if len(stuk) < per:
            break
        pagina += 1
    return uit[:aantal]


def schrijf(naam, data):
    with open(os.path.join(UIT, naam), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{naam}: {len(data) if isinstance(data, list) else 'ok'}")


def main():
    os.makedirs(UIT, exist_ok=True)
    nieuws = uniek([item(x, "nieuws") for x in lijst("posts?categories_exclude=82", 200)])
    schrijf("nieuws.json", nieuws)
    schrijf("successen.json", uniek([item(x, "succes") for x in lijst("succes_post", 200)]))
    schrijf("moties.json", uniek([item(x, "motie") for x in lijst("motie", 200)]))
    schrijf("raadsvragen.json", uniek([item(x, "raadsvraag") for x in lijst("raadsvraag", 200)]))
    schrijf("petities.json", uniek([item(x, "petitie") for x in lijst(f"posts?categories={PETITIES}", 30)]))
    fractie = []
    for x in lijst("fractielid", 30):
        naam = re.sub(r"^\d+\.\s*", "", tekst(x["title"]["rendered"]))
        fractie.append({"naam": naam, "positie": int((re.match(r"\d+", tekst(x["title"]["rendered"])) or [0])[0]),
                        "stadsdelen": [STADSDEEL[s] for s in x.get("stadsdeel", []) if s in STADSDEEL],
                        "beeld": echt_beeld(beeld(x)), "link": x["link"],
                        "bio": re.sub(r"^<p>\s*Stadsdeel:[^<]*</p>|^Stadsdeel:\s*[A-Za-z-]+\s*", "", schoon_html(x["content"]["rendered"]))})
    fractie.sort(key=lambda f: f["positie"])
    schrijf("fractie.json", fractie)
    schrijf("bestuur.json", bestuur())
    # zoekindex: titel, soort, datum en een stuk tekst, voor alles wat hierboven staat
    index = []
    for naam in ("nieuws", "successen", "moties", "raadsvragen", "petities"):
        for i in json.load(open(os.path.join(UIT, naam + ".json"), encoding="utf-8")):
            index.append({"id": i["id"], "s": i["soort"], "t": i["titel"], "d": i["datum"],
                          "x": tekst(i.get("html", ""))[:600], "sd": i["stadsdelen"]})
    schrijf("zoekindex.json", index)


if __name__ == "__main__":
    sys.exit(main())
