#!/usr/bin/env python3
"""Haalt alle berichten van hartvoordenhaag.nl op waarin Damiën Zeller voorkomt en schrijft nieuws.json voor de site.

Bron: de openbare WordPress-API van hartvoordenhaag.nl (zoekterm "Zeller"). Draait elke dag via
.github/workflows/nieuws.yml. Een bericht verbergen: zet zijn id in nieuws_verbergen in links.json.
Per bericht: datum, titel, korte samenvatting, link, afbeelding, buurt of wijk (als die genoemd wordt) en het dossier
(uit dossiers.json, dezelfde indeling als de dossierkast). `python tools/nieuws.py --opnieuw` labelt alleen de
bestaande nieuws.json opnieuw, zonder iets op te halen.
"""
import html
import json
import re
import sys
import urllib.request

API = "https://www.hartvoordenhaag.nl/wp-json/wp/v2/posts"
BUURTEN = ["Bosweide", "Tedingerbroek", "De Venen", "Morgenweide", "Singels", "Waterbuurt", "De Bras", "Vlietzoom-Oost",
           "De Rivieren", "De Lanen", "De Velden", "De Vissen", "Rietbuurt", "Hoornwijck", "Leidschenveen", "Ypenburg"]
_D = json.load(open("dossiers.json", encoding="utf-8"))
DOSSIERS = [(d["naam"], d["thema"], re.compile(d["patroon"], re.I), 1 if d.get("algemeen") else 2) for d in _D["dossiers"]]
PARTIJ = re.compile(_D["partijnieuws"], re.I)
STADSDEEL = DOSSIERS[-1][0]


def dossier_van(titel, tekst=""):
    """Het dossier met de meeste treffers (een treffer in de titel telt drie keer, een specifiek dossier dubbel), met zijn thema. Het stadsdeel
    telt alleen als geen enkel onderwerp past. Partijnieuws (wie stopt, kandidatenlijsten) krijgt geen dossier."""
    if PARTIJ.search(titel + " " + tekst):
        return "", ""
    beste, score = ("", ""), 0
    for n, t, p, w in DOSSIERS:
        s = w * (3 * len(p.findall(titel)) + len(p.findall(tekst)))
        if n == STADSDEEL and score:
            break
        if s > score:
            beste, score = (n, t), s
    return beste


def buurt_van(tekst):
    # hoofdlettergevoelig: "op de velden" (voetbal) is niet de buurt De Velden
    posities = [(m.start(), b) for b in BUURTEN for m in [re.search(r"\b" + re.escape(b) + r"\b", tekst)] if m]
    return min(posities)[1] if posities else ""


def opnieuw():
    d = json.load(open("nieuws.json", encoding="utf-8"))
    for x in d["berichten"]:
        x.pop("onderwerp", None)
        x["dossier"], x["thema"] = dossier_van(x["titel"], x.get("tekst", ""))
        x["buurt"] = buurt_van(x["titel"] + " " + x.get("tekst", ""))
    with open("nieuws.json", "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=0)
    print(sum(1 for x in d["berichten"] if x["dossier"]), "van", len(d["berichten"]), "berichten met een dossier")


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
        dossier, thema = dossier_van(titel, samenvatting)
        if (titel.lower(), p["date"][:10]) in gezien:
            continue
        gezien.add((titel.lower(), p["date"][:10]))
        uit.append({"id": f"hvdh-{p['id']}", "datum": p["date"][:10], "titel": titel, "tekst": samenvatting[:320],
                    "link": p["link"], "beeld": beeld, "buurt": buurt_van(tekst), "dossier": dossier, "thema": thema})
    uit.sort(key=lambda x: x["datum"], reverse=True)
    with open("nieuws.json", "w", encoding="utf-8") as f:
        json.dump({"bron": "hartvoordenhaag.nl", "berichten": uit}, f, ensure_ascii=False, indent=0)
    print(f"{len(uit)} berichten")


if __name__ == "__main__":
    opnieuw() if "--opnieuw" in sys.argv else main()
