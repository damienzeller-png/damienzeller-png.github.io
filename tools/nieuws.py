#!/usr/bin/env python3
"""Haalt alle berichten van hartvoordenhaag.nl op waarin Damiën Zeller voorkomt en schrijft nieuws.json voor de site.

Bron: de openbare WordPress-API van hartvoordenhaag.nl (zoekterm "Zeller"). Draait elke dag via
.github/workflows/nieuws.yml. Een bericht verbergen: zet zijn id in nieuws_verbergen in links.json.
Per bericht: datum, titel, korte samenvatting, link, afbeelding, buurt of wijk (als die genoemd wordt) en onderwerp.
"""
import html
import json
import re
import urllib.request

API = "https://www.hartvoordenhaag.nl/wp-json/wp/v2/posts"
BUURTEN = ["Bosweide", "Tedingerbroek", "De Venen", "Morgenweide", "Singels", "Waterbuurt", "De Bras", "Vlietzoom-Oost",
           "De Rivieren", "De Lanen", "De Velden", "De Vissen", "Rietbuurt", "Hoornwijck", "Leidschenveen", "Ypenburg"]
ONDERWERPEN = [
    ("Veiligheid en overlast", r"overlast|gebiedsverbod|handhaving|boa's?\b|onveilig|criminel|politie"),
    ("Zorg en ouderen", r"zorg|ouderen|wmo|mantelzorg|dementie|gezondheid|ggd|ggz|eenzaam"),
    ("Onderwijs en jongeren", r"school|onderwijs|leraar|leerling|student|jongeren|jeugd"),
    ("Sport", r"sport|zwembad|voetbal|vereniging"),
    ("Verkeer en parkeren", r"parkeer|parkeren|verkeer|tram|bus|htm|randstadrail|openbaar vervoer|p\+r|fiets"),
    ("Wonen en buurt", r"woning|wonen|bouw|park bloom|speeltuin|groen|winkelcentrum|overlast|spreekuur"),
]


def haal(url):
    req = urllib.request.Request(url, headers={"User-Agent": "damienzeller-site/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def schoon(t):
    t = html.unescape(re.sub(r"<[^>]+>", " ", t or ""))
    t = re.sub(r"\s+", " ", t).strip()
    return re.sub(r"\s*\[(…|&hellip;|\.\.\.)\]\s*$", "…", t)


def main():
    alles, pagina = [], 1
    while True:
        try:
            deel = haal(f"{API}?search=Zeller&per_page=100&page={pagina}&_embed=wp:featuredmedia"
                        "&_fields=id,date,link,title,excerpt,_links,_embedded")
        except Exception as e:
            if pagina == 1:
                raise
            print("Stop bij pagina", pagina, e)
            break
        if not isinstance(deel, list) or not deel:
            break
        alles += deel
        if len(deel) < 100:
            break
        pagina += 1
    try:
        verbergen = set(json.load(open("links.json", encoding="utf-8")).get("nieuws_verbergen", []))
    except Exception:
        verbergen = set()
    uit, weg, gezien = [], 0, set()
    for p in alles:
        if f"hvdh-{p['id']}" in verbergen:
            continue
        titel = schoon(p["title"]["rendered"])
        samenvatting = schoon(p["excerpt"]["rendered"])
        beeld = ""
        try:
            media = p["_embedded"]["wp:featuredmedia"][0]
            maten = media.get("media_details", {}).get("sizes", {})
            beeld = (maten.get("medium_large") or maten.get("medium") or {}).get("source_url") or media.get("source_url", "")
        except (KeyError, IndexError, TypeError):
            pass
        tekst = titel + " " + samenvatting
        posities = [(m.start(), b) for b in BUURTEN for m in [re.search(r"(?i)\b" + re.escape(b) + r"\b", tekst)] if m]
        buurt = min(posities)[1] if posities else ""
        onderwerp = next((n for n, r in ONDERWERPEN if re.search(r"(?i)" + r, tekst)), "")
        if (titel.lower(), p["date"][:10]) in gezien:
            continue
        gezien.add((titel.lower(), p["date"][:10]))
        uit.append({"id": f"hvdh-{p['id']}", "datum": p["date"][:10], "titel": titel, "tekst": samenvatting[:320],
                    "link": p["link"], "beeld": beeld, "buurt": buurt, "onderwerp": onderwerp})
    uit.sort(key=lambda x: x["datum"], reverse=True)
    with open("nieuws.json", "w", encoding="utf-8") as f:
        json.dump({"bron": "hartvoordenhaag.nl", "berichten": uit}, f, ensure_ascii=False, indent=0)
    print(f"{len(uit)} berichten")


if __name__ == "__main__":
    main()
