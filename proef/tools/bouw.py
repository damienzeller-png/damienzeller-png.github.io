#!/usr/bin/env python3
"""Maakt van de inhoud in proef/data echte pagina's, zodat elk stuk een eigen adres heeft.

Gebruik: python proef/tools/bouw.py   (vanuit de map van de website-repo, na importeer.py)

- Elk stuk krijgt een pagina op hetzelfde adres als op hartvoordenhaag.nl (bijvoorbeeld proef/motie/<naam>/index.html),
  met titel, omschrijving en foto voor zoekmachines en voor het voorbeeld als iemand de link deelt in WhatsApp of op Facebook.
  De tekst staat er al in; app.js maakt er daarna de volledige pagina van.
- De vaste pagina's (nieuws/, raadswerk/vragen/, fractie/<naam>/ ...) krijgen een eigen index.html.
- Oude adressen van hartvoordenhaag.nl die anders heten (fractieleden/, kandidaat/, stadsdeel/, expats/ ...) sturen door.
- sitemap.xml, feed.xml (RSS) en 404.html (voor adressen die niet bestaan) komen erbij.
Schrijft alleen bestanden die echt veranderen, en ruimt pagina's op van stukken die er niet meer zijn.

Na de overstap naar hartvoordenhaag.nl: zet BASE op "/", SITE op "https://www.hartvoordenhaag.nl" en PROEF op False,
en zet in kader.js HVDH.BASE op "/".
"""
import datetime
import html
import json
import os
import re
import sys
import unicodedata

BASE = "/proef/"
SITE = "https://damienzeller.nl"
PROEF = True
NAAM = "Hart voor Den Haag"
STANDAARD_BEELD = SITE + BASE + "beeld/groep.jpg"

MAP = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))  # proef/
REPO = os.path.dirname(MAP)
DATA = os.path.join(MAP, "data")
LIJST = os.path.join(MAP, "tools", "gegenereerd.txt")  # welke pagina's dit script maakte, om op te ruimen

STADSDELEN = ["Centrum", "Escamp", "Haagse Hout", "Laak", "Leidschenveen-Ypenburg", "Loosduinen", "Scheveningen", "Segbroek"]
ONDERWERPEN = ["Veiligheid", "Wonen en bouwen", "Verkeer en parkeren", "Zorg en welzijn", "Onderwijs en jeugd", "Economie en ondernemers",
               "Groen en leefbaarheid", "Cultuur en sport", "Geld en bestuur", "Asiel en opvang"]
SOORT = {
    "nieuws": ("Nieuws", "nieuws/", "Nieuws"), "succes": ("Succes", "successen/", "Successen"),
    "motie": ("Motie", "raadswerk/", "Moties"), "amendement": ("Amendement", "raadswerk/amendementen/", "Amendementen"),
    "raadsvraag": ("Schriftelijke vragen", "raadswerk/vragen/", "Schriftelijke vragen"),
    "spreektekst": ("Spreektekst", "raadswerk/spreekteksten/", "Spreekteksten"), "petitie": ("Petitie", "petities/", "Petities"),
}
MAAND = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"]

# vaste pagina's: adres, titel, omschrijving
VAST = [
    ("", NAAM, "De grootste lokale partij van Den Haag. Ombudspolitiek in alle acht stadsdelen."),
    ("nieuws/", "Nieuws", "Wat Hart voor Den Haag doet in de raad en in de wijk."),
    ("successen/", "Successen", "Wat ombudspolitiek opleverde: besluiten, oplossingen en opgeknapte plekken."),
    ("raadswerk/", "Moties", "Alle moties van Hart voor Den Haag in de Haagse gemeenteraad sinds 2012."),
    ("raadswerk/amendementen/", "Amendementen", "Alle amendementen van Hart voor Den Haag in de Haagse gemeenteraad."),
    ("raadswerk/vragen/", "Schriftelijke vragen", "Alle schriftelijke vragen van Hart voor Den Haag aan het college sinds 2012."),
    ("raadswerk/spreekteksten/", "Spreekteksten", "Wat raadsleden van Hart voor Den Haag zeggen in de raad en in commissies."),
    ("petities/", "Petities", "Petities van Hagenaars. Teken mee."),
    ("stadsdelen/", "Uw stadsdeel", "Uw raadsleden, spreekuren en wat we doen in uw stadsdeel."),
    ("fractie/", "Onze mensen", "De zestien raadsleden van Hart voor Den Haag en waar ze over gaan."),
    ("wethouders/", "Wethouders", "De wethouders van Hart voor Den Haag in het Haagse college."),
    ("bestuur/", "Bestuur", "Het bestuur van Vereniging Groep de Mos, met jaarverslagen en jaarcijfers."),
    ("standpunten/", "Standpunten", "Waar Hart voor Den Haag voor staat, en wat we ervoor doen in de raad."),
    ("onderwerpen/", "Dossiers", "Alles wat Hart voor Den Haag doet per onderwerp."),
    ("agenda/", "Agenda en spreekuren", "Spreekuren, wijkschouwen en bijeenkomsten van Hart voor Den Haag."),
    ("agenda/aanmelden/", "Aanmelden", "Meld u aan voor een spreekuur of bijeenkomst."),
    ("doe-mee/", "Doe mee", "Help mee in uw eigen buurt. Een uur per maand helpt al."),
    ("vacatures/", "Vacatures", "Werken of vrijwilligen voor Hart voor Den Haag."),
    ("contact/", "Contact", "Bel, mail of stuur een bericht aan de fractie van Hart voor Den Haag."),
    ("contact/melding/", "Meld een probleem", "Iets mis in uw buurt? Meld het bij het ombudsteam van Hart voor Den Haag."),
    ("lid/", "Word lid", "Word lid van Hart voor Den Haag, vanaf € 12,50 per jaar."),
    ("doneren/", "Doneren", "Steun Hart voor Den Haag met een gift."),
    ("zoeken/", "Zoeken", "Zoek in al het nieuws en raadswerk van Hart voor Den Haag sinds 2012."),
    ("pers/", "Pers", "Persberichten, contact en beeld voor journalisten."),
    ("english/", "Hart voor Den Haag in English", "The largest local party in The Hague."),
    ("privacy/", "Privacy", "Hoe Hart voor Den Haag met uw gegevens omgaat."),
    ("toegankelijkheid/", "Toegankelijkheid", "Hoe we deze site voor iedereen bruikbaar maken."),
    ("bedankt/lid/", "Dank u wel", "Welkom bij Hart voor Den Haag."),
    ("bedankt/doneren/", "Dank u wel", "Dank voor uw gift."),
]
# oude pagina's van hartvoordenhaag.nl met een ander adres op de nieuwe site
DOOR = {
    "onze-wethouders/": "wethouders/", "onze-fractie/": "fractie/", "ik-word-lid/": "lid/", "kandidaten/": "fractie/",
    "expats/": "english/", "poster-bestellen/": "doe-mee/", "hartelijk-dank-voor-uw-donatie/": "bedankt/doneren/", "feed/": "feed.xml",
}

e = lambda s: html.escape(str(s or ""), quote=True)


def slug(s):
    s = "".join(c for c in unicodedata.normalize("NFD", str(s).lower()) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def datum_nl(iso):
    j, m, d = iso[:10].split("-")
    return f"{int(d)} {MAAND[int(m) - 1]} {j}"


def lees(naam, standaard=None):
    pad = os.path.join(DATA, naam)
    if not os.path.exists(pad):
        return standaard
    with open(pad, encoding="utf-8") as f:
        return json.load(f)


def kort(t, n=158):
    t = re.sub(r"\s+", " ", str(t or "")).strip()
    return t if len(t) <= n else t[:n].rsplit(" ", 1)[0].rstrip(",;:") + "…"


def pagina(pad, titel, beschrijving, inhoud="", beeld="", stuk_id="", ld=None, soort_og="website", extra=""):
    url = SITE + BASE + pad
    volle_titel = f"{titel} | {NAAM}" if titel != NAAM else NAAM
    if PROEF:
        volle_titel += " (proef)"
    kop = [
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
        '<meta name="robots" content="noindex, nofollow">' if PROEF else "",
        f"<title>{e(volle_titel)}</title>",
        f'<meta name="description" content="{e(beschrijving)}">',
        f'<link rel="canonical" href="{e(url)}">',
        f'<meta property="og:site_name" content="{NAAM}">',
        f'<meta property="og:type" content="{soort_og}">',
        f'<meta property="og:title" content="{e(titel)}">',
        f'<meta property="og:description" content="{e(beschrijving)}">',
        f'<meta property="og:url" content="{e(url)}">',
        f'<meta property="og:image" content="{e(beeld or STANDAARD_BEELD)}">',
        '<meta property="og:locale" content="nl_NL">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="theme-color" content="#FFFFFF">',
        '<meta name="color-scheme" content="light only">',
        f'<link rel="icon" href="{BASE}beeld/favicon.png">',
        f'<link rel="alternate" type="application/rss+xml" title="Nieuws van {NAAM}" href="{BASE}feed.xml">',
        f'<link rel="preload" href="{BASE}lettertype/raleway-latin.woff2" as="font" type="font/woff2" crossorigin>',
        f'<link rel="stylesheet" href="{BASE}app.css">',
        f'<script src="{BASE}kader.js"></script>',
        extra,
    ]
    if ld:
        kop.append('<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False).replace("</", "<\\/") + "</script>")
    data = f' data-stuk="{e(stuk_id)}"' if stuk_id else ""
    return ("<!doctype html>\n<html lang=\"nl\">\n<head>\n" + "\n".join(k for k in kop if k) + "\n</head>\n<body>\n<hvdh-kop></hvdh-kop>\n"
            f'<main id="inhoud" tabindex="-1"><div id="app"{data}>{inhoud or LADEN}</div></main>\n'
            f'<hvdh-voet></hvdh-voet>\n<script src="{BASE}app.js" defer></script>\n</body>\n</html>\n')


LADEN = '<p class="wrap laden-tekst">Even laden…</p>'


def kop_html(titel, kruimel="", onder=""):
    return (f'<div class="pagina-kop"><svg class="kop-lijnen" aria-hidden="true"></svg><div class="wrap">'
            f'{f"<p class=\"kruimel\">{kruimel}</p>" if kruimel else ""}<h1 tabindex="-1">{titel}</h1>{onder}</div></div>')


def stuk_html(d):
    naam, lijst, lijst_naam = SOORT[d["soort"]]
    kruimel = f'<a href="{BASE}">Home</a> / <a href="{BASE}{lijst}">{e(lijst_naam)}</a>'
    delen = []
    if d.get("stadsdelen"):
        delen.append(f'<span class="plek">{e(" en ".join(d["stadsdelen"]))}</span>')
    if d["soort"] not in ("nieuws", "succes", "petitie"):
        delen.append(f"<span>{e(naam)}</span>")
    if d.get("indiener"):
        delen.append(f"<span>{e(d['indiener'])}</span>")
    if d.get("status"):
        delen.append(f'<span class="status">{e(d["status"])}</span>')
    delen.append(f'<time datetime="{e(d["datum"])}">{datum_nl(d["datum"])}</time>')
    titel = re.sub(r"(?i)^petitie:\s*", "", d["titel"]) if d["soort"] == "petitie" else d["titel"]
    beeld = f'<span class="poster-lijst artikel-beeld"><img src="{e(d["beeld"])}" alt="" decoding="async"></span>' if d.get("beeld") else ""
    tekst = d.get("html") or f"<p>{e(d.get('samenvatting'))}</p>"
    return (kop_html(e(titel), kruimel, f'<p class="bijschrift">{"".join(delen)}</p>') +
            f'<section class="wit"><div class="wrap"><article class="artikel">{beeld}<div class="artikel-tekst" style="margin-top:18px">{tekst}</div></article></div></section>')


def schrijf(pad_rel, inhoud, gemaakt):
    """pad_rel is relatief aan proef/ (bijvoorbeeld 'motie/x/index.html'). Schrijft alleen als het anders is."""
    pad = os.path.join(MAP, pad_rel)
    gemaakt.add(pad_rel)
    if os.path.exists(pad):
        with open(pad, encoding="utf-8") as f:
            if f.read() == inhoud:
                return 0
    os.makedirs(os.path.dirname(pad), exist_ok=True)
    with open(pad, "w", encoding="utf-8") as f:
        f.write(inhoud)
    return 1


def doorsturen(naar, titel="Deze pagina is verhuisd"):
    doel = BASE + naar
    return ("<!doctype html>\n<html lang=\"nl\">\n<head>\n<meta charset=\"utf-8\">\n" + ('<meta name="robots" content="noindex">\n' if PROEF else "") +
            f'<title>{e(titel)}</title>\n<link rel="canonical" href="{e(SITE + doel)}">\n<meta http-equiv="refresh" content="0; url={e(doel)}">\n'
            f'<script>location.replace({json.dumps(doel)} + location.search + location.hash)</script>\n</head>\n<body>\n'
            f'<p>Deze pagina staat nu op <a href="{e(doel)}">{e(SITE + doel)}</a>.</p>\n</body>\n</html>\n')


def main():
    index = lees("zoekindex.json", [])
    levend = {i["id"] for i in index}
    fractie = lees("fractie.json", [])
    kandidaten = lees("archief/kandidaten.json", [])
    gemaakt, nieuw = set(), 0

    # vaste pagina's
    # voorpagina: de foto onder de film is het grootste beeld, dus die laden we meteen
    film = (f'<link rel="preload" as="image" href="{BASE}beeld/groep-film-800.webp" media="(max-width: 760px)">\n'
            f'<link rel="preload" as="image" href="{BASE}beeld/groep-film.webp" media="(min-width: 761px)">')
    for pad, titel, beschrijving in VAST:
        nieuw += schrijf(pad + "index.html", pagina(pad, titel, beschrijving, extra=film if pad == "" else ""), gemaakt)
    for sd in STADSDELEN:
        pad = f"stadsdelen/{slug(sd)}/"
        nieuw += schrijf(pad + "index.html", pagina(pad, f"Hart voor Den Haag in {sd}", f"Raadsleden, spreekuren en wat Hart voor Den Haag doet in {sd}."), gemaakt)
        nieuw += schrijf(f"stadsdeel/{slug(sd)}/index.html", doorsturen(pad), gemaakt)
    for o in ONDERWERPEN:
        pad = f"onderwerpen/{slug(o)}/"
        nieuw += schrijf(pad + "index.html", pagina(pad, f"Dossier {o.lower()}", f"Wat Hart voor Den Haag vindt en doet op het gebied van {o.lower()}."), gemaakt)
    for f in fractie:
        pad = f"fractie/{slug(f['naam'])}/"
        pf = ", ".join(f.get("portefeuilles", [])[:4])
        nieuw += schrijf(pad + "index.html", pagina(pad, f["naam"], kort(f"{f.get('functie') or 'Raadslid'} voor Hart voor Den Haag." + (f" Portefeuilles: {pf}." if pf else "")), beeld=f.get("beeld", ""), soort_og="profile"), gemaakt)
        oud = re.sub(r"^https?://[^/]+/", "", f.get("link", ""))
        if oud.startswith("fractieleden/"):
            nieuw += schrijf(oud.rstrip("/") + "/index.html", doorsturen(pad), gemaakt)
    leden = {slug(f["naam"]) for f in fractie}
    for k in kandidaten:
        oud = re.sub(r"^https?://[^/]+/", "", k.get("link", ""))
        if oud.startswith("kandidaat/"):
            s = slug(k.get("naam", ""))
            nieuw += schrijf(oud.rstrip("/") + "/index.html", doorsturen(f"fractie/{s}/" if s in leden else "fractie/"), gemaakt)
    for oud, naar in DOOR.items():
        nieuw += schrijf(oud + "index.html", doorsturen(naar), gemaakt)

    # één pagina per stuk, op het oude adres
    stukken = []
    stukmap = os.path.join(DATA, "stuk")
    for naam in sorted(os.listdir(stukmap)):
        if not naam.endswith(".json"):
            continue
        with open(os.path.join(stukmap, naam), encoding="utf-8") as f:
            d = json.load(f)
        if d["id"] not in levend or not d.get("p") or d["soort"] not in SOORT:
            continue
        stukken.append(d)
        titel = re.sub(r"(?i)^petitie:\s*", "", d["titel"]) if d["soort"] == "petitie" else d["titel"]
        ld = {"@context": "https://schema.org", "@type": "NewsArticle", "headline": kort(titel, 110), "datePublished": d["datum"],
              "inLanguage": "nl", "mainEntityOfPage": SITE + BASE + d["p"], "publisher": {"@type": "Organization", "name": NAAM, "logo": {"@type": "ImageObject", "url": SITE + BASE + "beeld/logo.svg"}}}
        if d.get("beeld"):
            ld["image"] = [d["beeld"]]
        if d.get("indiener"):
            ld["author"] = [{"@type": "Person", "name": n.strip()} for n in d["indiener"].split(" en ")]
        nieuw += schrijf(d["p"] + "index.html", pagina(d["p"], titel, kort(d.get("samenvatting")), stuk_html(d), d.get("beeld_klein") or d.get("beeld", ""), d["id"], ld, "article"), gemaakt)

    # opruimen: pagina's die dit script eerder maakte maar die er niet meer horen
    weg = 0
    if os.path.exists(LIJST):
        with open(LIJST, encoding="utf-8") as f:
            for regel in f.read().split("\n"):
                regel = regel.strip()
                if regel and regel not in gemaakt and regel.endswith("index.html") and ".." not in regel:
                    pad = os.path.join(MAP, regel)
                    if os.path.exists(pad):
                        os.remove(pad)
                        weg += 1
                        try:
                            os.removedirs(os.path.dirname(pad))
                        except OSError:
                            pass
    with open(LIJST, "w", encoding="utf-8") as f:
        f.write("\n".join(sorted(gemaakt)) + "\n")

    # sitemap en RSS
    vandaag = datetime.date.today().isoformat()
    urls = [(BASE + p, vandaag) for p, _, _ in VAST if not p.startswith("bedankt")] + [(BASE + f"fractie/{slug(f['naam'])}/", vandaag) for f in fractie]
    urls += [(BASE + d["p"], d["datum"]) for d in stukken]
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
        f"<url><loc>{e(SITE + u)}</loc><lastmod>{l}</lastmod></url>\n" for u, l in urls) + "</urlset>\n"
    nieuw += schrijf("sitemap.xml", sitemap, set())
    rss_items = sorted((d for d in stukken if d["soort"] in ("nieuws", "succes", "motie", "raadsvraag", "amendement")), key=lambda d: (d["datum"], d.get("geplaatst", "")), reverse=True)[:50]

    def rss_datum(iso):
        dt = datetime.datetime.strptime(iso[:10], "%Y-%m-%d")
        return dt.strftime("%a, %d %b %Y 08:00:00 +0100")
    feed = ('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>\n'
            f"<title>{NAAM}</title><link>{SITE + BASE}</link><description>Nieuws en raadswerk van {NAAM}</description><language>nl</language>\n"
            f'<atom:link href="{SITE + BASE}feed.xml" rel="self" type="application/rss+xml"/>\n' +
            "".join(f"<item><title>{e(d['titel'])}</title><link>{e(SITE + BASE + d['p'])}</link><guid>{e(SITE + BASE + d['p'])}</guid>"
                    f"<pubDate>{rss_datum(d['datum'])}</pubDate><category>{e(SOORT[d['soort']][0])}</category><description>{e(d.get('samenvatting'))}</description></item>\n" for d in rss_items) +
            "</channel></rss>\n")
    nieuw += schrijf("feed.xml", feed, set())

    # 404 voor de hele website (GitHub Pages gebruikt de 404.html in de hoofdmap). Onder BASE wordt het de app,
    # die het adres zelf leest (zo werken ook s/<id>/ en oude adressen); daarbuiten een eenvoudige melding.
    vier = pagina("", "Niet gevonden", "Deze pagina bestaat niet (meer).").replace("<title>", '<script>if (!location.pathname.startsWith("' + BASE + '")) document.documentElement.dataset.buiten = "1";</script>\n<title>', 1)
    vier = vier.replace(f'<link rel="canonical" href="{e(SITE + BASE)}">\n', "")
    vier = vier.replace("<hvdh-kop></hvdh-kop>", '<div id="buiten" hidden><p style="font:600 1.2rem/1.5 system-ui;padding:40px 20px">Deze pagina bestaat niet. <a href="/">Naar de voorpagina</a></p></div>\n<script>if (document.documentElement.dataset.buiten) { document.getElementById("buiten").hidden = false; document.write("<style>hvdh-kop,main,hvdh-voet{display:none}</style>"); }</script>\n<hvdh-kop></hvdh-kop>')
    pad404 = os.path.join(REPO, "404.html")
    oud404 = open(pad404, encoding="utf-8").read() if os.path.exists(pad404) else ""
    if oud404 != vier:
        with open(pad404, "w", encoding="utf-8") as f:
            f.write(vier)
        nieuw += 1
    print(f"Pagina's: {len(gemaakt)} ({len(stukken)} stukken), {nieuw} nieuw of gewijzigd, {weg} opgeruimd")


if __name__ == "__main__":
    sys.exit(main())
