#!/usr/bin/env python3
"""Haalt de inhoud van hartvoordenhaag.nl op via de WordPress-API en schrijft proef/data/*.json.

Gebruik: python proef/tools/importeer.py   (vanuit de map van de website-repo)
Alleen openbare inhoud: nieuws, successen, moties, amendementen, schriftelijke vragen, spreekteksten,
petities, de fractie (met portefeuilles) en het bestuur.
Wat redacteuren in de beheeromgeving plaatsen, komt er in de browser bovenop (via de Worker).
"""
import html
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.request
import urllib.parse
import time
import bisect

API = "https://www.hartvoordenhaag.nl/wp-json/wp/v2/"
UIT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
STADSDEEL = {48: "Centrum", 52: "Escamp", 49: "Haagse Hout", 53: "Laak", 50: "Leidschenveen-Ypenburg",
             54: "Loosduinen", 51: "Scheveningen", 55: "Segbroek"}
PETITIES = 82
BEKENDE_NAMEN = ["Richard de Mos", "Jelle Meinesz", "Coen Bom", "Carlos Martinez van Andel", "Ralf Sluijs", "Arjen Dubbelaar",
                 "Mairan Sewtahal", "Abdoel Haryouli", "Gerard Kroon", "Cynthia Langbroek", "Necati Akbas", "Damiën Zeller",
                 "Amanda Lock", "Ismet Bingöl", "Martin van den Goorbergh", "Tom Beugelsdijk", "Diego Canter Visscher",
                 "Mert Karadoğan", "Angela Biseswar", "Rita Verdonk", "Rachid Guernaoui", "Henk Harms", "Mariëtte van Leeuwen", "Arjan van den Berg",
                 "Constant Martini", "Nino Davituliani", "Lex Kraft van Ermel"]
SPREEKTEKSTEN = 68
PREFIX = {"nieuws": "n", "succes": "s", "motie": "m", "amendement": "am", "raadsvraag": "r", "petitie": "p", "spreektekst": "t"}
MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"]
# Onderwerpen op trefwoord: een stuk krijgt er hooguit twee, op volgorde van het aantal treffers.
ONDERWERPEN = {
    "Veiligheid": r"veilig|handhav|politie|overlast|crimin|explosie|camera|ondermijn|vuurwerk|geweld|drugs|blokkade",
    "Wonen en bouwen": r"woning|wonen|bouw|huur|erfpacht|statushouder|woningzoek|flat|appartement|sloop",
    "Verkeer en parkeren": r"parkeer|parkeren|verkeer|fiets|tram|\bbus|openbaar vervoer|\bov\b|htm|\bret\b|doorstroming|\bauto|weg\b|kruispunt|oversteek|zebrapad|snelheid",
    "Zorg en welzijn": r"zorg|wmo|ouderen|dementie|doelgroepenvervoer|gezondheid|welzijn|mantelzorg|eenzaam|beschermd wonen|daklo|armoede|schuld",
    "Onderwijs en jeugd": r"school|onderwijs|leerling|leraar|jongeren|jeugd|kinderen|kinderopvang|student",
    "Economie en ondernemers": r"ondernemer|winkel|economie|horeca|\bmarkt|bedrijf|megastore|haven|toerisme|werkgelegenheid",
    "Groen en leefbaarheid": r"afval|container|\bgroen|bomen|boom\b|\bpark\b|speeltuin|schoon|zwerfvuil|dieren|duurzaam|klimaat|strand",
    "Cultuur en sport": r"cultuur|museum|sport|erfgoed|monument|evenement|festival|muziek|theater|bibliothe",
    "Geld en bestuur": r"begroting|belasting|budget|financ|bezuinig|subsidie|miljoen|kabinet|rijk\b",
    "Asiel en opvang": r"asiel|\bazc|noodopvang|opvanglocatie|vluchteling|\bcoa\b",
}
# Standpunten uit het programma en de onderwerpen waarop we het werk ervoor tellen ("Beloofd en gedaan").
BEWIJS = {
    "Bouwen voor Hagenaars": ["Wonen en bouwen"],
    "Investeren in veiligheid": ["Veiligheid"],
    "Een leefbare en bereikbare stad": ["Verkeer en parkeren", "Groen en leefbaarheid"],
    "Geen asielopvang in Den Haag": ["Asiel en opvang"],
}
import datetime
SINDS = (datetime.date.today() - datetime.timedelta(days=365)).isoformat()  # het afgelopen jaar; de import gaat verder terug


def haal(pad, pogingen=4):
    req = urllib.request.Request(API + pad, headers={"User-Agent": "proefsite-hvdh/1.0"})
    for poging in range(pogingen):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 400 and "page" in pad:
                return []  # voorbij de laatste pagina
            if poging == pogingen - 1:
                raise
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if poging == pogingen - 1:
                raise
        time.sleep(3 * (poging + 1))


def tekst(s):
    s = re.sub(r"(?s)<(script|style)[^>]*>.*?</\1>", "", s or "")
    s = html.unescape(re.sub(r"<[^>]+>", " ", s))
    return re.sub(r"\s+", " ", s).strip()


def schoon_html(s):
    s = s or ""
    # resten van de petitie-plugin (dk-speakout): formulier, teller, links en de lijst met ondertekenaars weg
    s = re.sub(r"(?s)<div id=\"dk-speakout-windowshade\">.*?dk-speakout-signature-count\">.*?</div>\s*</div>\s*</div>", "", s)
    s = re.sub(r"(?s)<div[^>]*dk-speakout.*?</div>", "", s)
    s = re.sub(r"(?i)(&#8211;|–|-)\s*(handtekeningen lijst |petitie )weergeven\s*(<br\s*/?>)?\s*\d*", "", s)
    s = re.sub(r"(?i)[\d.,]*\s*(&#8211;|–|-)\s*aantal handtekeningen weergeven\s*(<br\s*/?>)?", "", s)
    s = re.sub(r"(?is)<table.*?</table>", "", s)
    s = re.sub(r"(?is)<a[^>]*>\s*(petitie weergeven|aantal handtekeningen weergeven|&lt;&lt;|&lt;|&gt;|&gt;&gt;)\s*</a>", "", s)
    s = re.sub(r"(?s)<(script|style|noscript|form|iframe)[^>]*>.*?</\1>", "", s)
    s = re.sub(r"(?s)<!--.*?-->", "", s)
    s = re.sub(r'\s(on\w+|style|class|id|srcset|sizes|data-[\w-]+)="[^"]*"', "", s)
    s = re.sub(r"<(/?)(div|span|section|figure|figcaption)[^>]*>", lambda m: "" if m.group(2) in ("div", "span", "section") else f"<{m.group(1)}{m.group(2)}>", s)
    s = re.sub(r'href="https://www\.hartvoordenhaag\.nl/', 'target="_blank" rel="noopener" href="https://www.hartvoordenhaag.nl/', s)
    # bolletjes uit de petitieteksten, losse tellers aan het eind en de privacyzin van de plugin
    s = re.sub(r"[•∙]\u2060?(\s|&nbsp;|\u2060)*", "", s)
    s = re.sub(r"(?s)(<br\s*/?>|\s)*\d{2,6}\s*</p>\s*$", "</p>", s)
    s = re.sub(r"(?i)\s*Je gegevens worden niet doorgespeeld[^<]*", "", s)
    s = re.sub(r"(?s)<p>\s*<strong>\s*</strong>\s*</p>", "", s)
    s = re.sub(r"(?s)<p>(?:(?!</p>).)*(NAW gegevens|Let op, het is voor een burgerinitiatief verplicht)(?:(?!</p>).)*</p>", "", s)
    s = re.sub(r"<p\s*/>", "", s)
    s = re.sub(r"<p>\s*(&nbsp;|<br\s*/?>)?\s*</p>", "", s)
    return s.strip()


def _media(x):
    try:
        m = x["_embedded"]["wp:featuredmedia"][0]
    except (KeyError, IndexError, TypeError):
        return None
    return m if isinstance(m, dict) and m.get("source_url") else None


def beeld(x):
    """De foto bij een stuk: het origineel, behalve als dat erg groot is; dan de grootste kleinere versie van WordPress."""
    m = _media(x)
    if not m:
        return ""
    det = m.get("media_details", {}) or {}
    maten = det.get("sizes", {}) or {}
    if (det.get("width") or 0) > 1400:
        kandidaten = [v for k, v in maten.items() if k not in ("thumbnail", "logo", "medium") and 500 <= (v.get("width") or 0) <= 1400]
        if kandidaten:
            return max(kandidaten, key=lambda v: v["width"])["source_url"]
    return m["source_url"]


def beeld_klein(x):
    """Een kleinere versie voor lijsten (ongeveer 600 pixels breed), zodat een telefoon geen originelen hoeft te laden."""
    m = _media(x)
    if not m:
        return ""
    maten = (m.get("media_details", {}) or {}).get("sizes", {}) or {}
    for k in ("wide", "rectangle", "full-wide", "medium_large"):
        if k in maten and maten[k].get("source_url"):
            return maten[k]["source_url"]
    kandidaten = [v for k, v in maten.items() if k not in ("thumbnail", "logo") and 300 <= (v.get("width") or 0) <= 900]
    return max(kandidaten, key=lambda v: v["width"])["source_url"] if kandidaten else ""


def pad_van(link):
    """Het adres van het stuk op hartvoordenhaag.nl zonder domein, bijvoorbeeld "motie/naam-van-de-motie/".
    De nieuwe site maakt op precies dat adres een pagina, zodat oude links blijven werken."""
    p = urllib.parse.urlparse(link or "").path.strip("/")
    # botst het adres met een pagina of map van de nieuwe site, dan krijgt het stuk een eigen adres (s/<id>/)
    if not p or p.split("/")[0].lower() in GERESERVEERD or not re.fullmatch(r"[A-Za-z0-9._~%/-]+", p):
        return ""
    return p + "/"


# eerste deel van een adres dat de nieuwe site zelf gebruikt
GERESERVEERD = {"nieuws", "successen", "raadswerk", "petities", "stadsdelen", "fractie", "wethouders", "bestuur", "agenda", "doe-mee",
                "contact", "lid", "doneren", "vacatures", "standpunten", "privacy", "toegankelijkheid", "zoeken", "bedankt", "pers",
                "english", "onderwerpen", "s", "data", "beeld", "lettertype", "tools", "index.html", "beheer.html", "feed.xml",
                "sitemap.xml", "404.html", "app.js", "app.css", "kader.js", "beheer.js"}


def kandidaat_foto(naam):
    """Echte portretfoto van de kandidatenpagina, voor een raadslid van wie op hartvoordenhaag.nl alleen een AI-bewerkte foto staat."""
    try:
        for x in haal(f"kandidaat?search={urllib.parse.quote(naam)}&_embed=wp:featuredmedia"):
            if plat(re.sub(r"^\d+\.\s*", "", tekst(x["title"]["rendered"]))) != plat(naam):
                continue
            m = _media(x)
            if not m:
                continue
            maten = (m.get("media_details", {}) or {}).get("sizes", {}) or {}
            for k in ("large", "medium_large", "1536x1536"):
                if k in maten and maten[k].get("source_url"):
                    return echt_beeld(maten[k]["source_url"])
            return echt_beeld(beeld(x))
    except Exception as fout:
        print("  kandidaatfoto niet gevonden voor", naam, fout)
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


# Plekken in titel of tekst die bij een stadsdeel horen, voor stukken die op de partijsite niet getagd zijn.
PLEKKEN = {
    "Escamp": r"escamp|moerwijk|morgenstond|zuiderpark|bouwlust|vrederust|leyenburg|wateringse veld|rustenburg|oostbroek|leyweg|melis stokelaan|loevesteinlaan|zuidwest",
    "Centrum": r"schilderswijk|transvaal|stationsbuurt|zeeheldenkwartier|willemspark|archipel|haagse markt|hobbemaplein|hollands spoor|binnenstad|centrum den haag|grote markt|het plein\b|bierkade|groente- en fruitmarkt",
    "Laak": r"\blaak\b|laakkwartier|spoorwijk|binckhorst|laakhaven|\bcid\b",
    "Haagse Hout": r"haagse hout|bezuidenhout|benoordenhout|mariahoeve|marlot|haagse bos",
    "Leidschenveen-Ypenburg": r"ypenburg|leidschenveen|forepark|hoornwijck|piet vink|park bloom",
    "Loosduinen": r"loosduin|kijkduin|ockenburgh|waldeck|bohemen|kraayenstein|vroondaal|houtwijk",
    "Scheveningen": r"scheveningen|duindorp|statenkwartier|geuzenkwartier|belgisch park|duinoord|westbroekpark|zorgvliet|boulevard|haven scheveningen|kranenburgweg|houtrust",
    "Segbroek": r"segbroek|vogelwijk|bomenbuurt|bloemenbuurt|vruchtenbuurt|regentesse|valkenbos|kwartellaan|heesterbuurt|fahrenheitstraat|goudenregen|duivelandsestraat|nieboerweg",
}


def plekken(t):
    t = t.lower()
    tel = sorted(((len(re.findall(rx, t)), n) for n, rx in PLEKKEN.items()), reverse=True)
    return [n for k, n in tel[:2] if k >= 1 and k >= tel[0][0] / 2]


def afkappen(t, n=240):
    if len(t) <= n:
        return t
    kort = t[:n]
    zin = max(kort.rfind(". "), kort.rfind("? "), kort.rfind("! "))
    if zin > n * 0.6:
        return kort[:zin + 1]
    kort = kort.rsplit(" ", 1)[0].rstrip(",;:")
    return kort if kort.endswith((".", "?", "!")) else kort + "…"


def plat(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def volle_naam(deel):
    """'C.V. Martini', 'Contant Martini', 'de Mos (Hart voor Den Haag)' en 'de heer Damiën Zeller' worden de volle naam."""
    deel = re.sub(r"(?i)\(?hart voor den haag\)?|^(de heer|mevrouw|mw\.?|dhr\.?)\s+|^haag\s+", "", deel).strip(" ,.")
    deel = re.sub(r"^([A-Z]\.)+\s*", "", deel)
    woorden = deel.split()
    if len(woorden) % 2 == 0 and woorden[:len(woorden) // 2] == woorden[len(woorden) // 2:]:
        deel = " ".join(woorden[:len(woorden) // 2])
    p = plat(deel)
    for vol in BEKENDE_NAMEN:
        if plat(vol) == p or plat(vol).endswith(" " + p):
            return vol
    if woorden:
        achter = plat(deel.split()[-1])
        treffers = [v for v in BEKENDE_NAMEN if plat(v).endswith(" " + achter)]
        if len(treffers) == 1:
            return treffers[0]
    return deel


def indieners(t):
    return " en ".join(dict.fromkeys(volle_naam(d) for d in re.split(r"\s+en\s+|,\s*", t) if d.strip()))


def onderwerpen(tekst_):
    t = tekst_.lower()
    scores = sorted(((len(re.findall(rx, t)), naam) for naam, rx in ONDERWERPEN.items()), reverse=True)
    return [n for k, n in scores[:2] if k >= 2]


MAAND = r"(?:" + "|".join(MAANDEN) + r"|mai|okt|sept)"
DATUM = r"\d{1,2}\s+" + MAAND + r"(?:\s+\d{4})?"


def schone_titel(t, soort):
    """Haalt "Raad 26 februari motie:", "19 april 2018 Raad Amendement" en "Spreektekst <naam>" van de titel af.
    Geeft (titel, naam): de naam van de spreker gaat naar indiener, de datum staat er apart bij."""
    naam = ""
    t2 = t
    soort_woord = r"(aanvullende\s+|nadere\s+)?(schriftelijke\s+)?(vervolg)?(vragen|raadsvragen|motie|amendement)"
    for _ in range(4):
        voor = t2
        t2 = re.sub(r"(?i)^(raadsvergadering|raad)(?!\s+van\b)\s*:?\s*", "", t2)
        t2 = re.sub(r"(?i)^(motie|amendement)\s+(?=\d)", "", t2)
        m = re.match(r"(?i)^(" + DATUM + r"|\d{1,2}-\d{1,2}-\d{4})\s*:?\s*", t2)
        if m:
            t2 = t2[m.end():]
            t2 = re.sub(r"(?i)^(raad\s+)?" + soort_woord + r"\b\s*:?\s*(inzake\s+)?", "", t2)
            t2 = re.sub(r"(?i)^schriftelijke\s+(inzake\s+)?", "", t2)
        t2 = re.sub(r"(?i)^" + soort_woord + r"\s*(?=" + DATUM + r")", "", t2)
        t2 = re.sub(r"(?i)^(raad\s+)?" + soort_woord + r"\s*:\s*", "", t2)
        if t2 == voor:
            break
    if soort == "motie":
        t2 = re.sub(r"^Motie\s+(?!van\b|over\b|om\b|voor\b)(?=[A-Z])", "", t2)
    t2 = t2.rstrip(" .") if len(t2) > 3 else t2
    if soort == "spreektekst" and re.search(r"(?i)spreekt?tekst|inbreng", t2):
        for vol in sorted(BEKENDE_NAMEN + ["De Mos"], key=len, reverse=True):
            m = re.search(r"(?i)(partijleider\s+)?\b" + re.escape(vol) + r"\b", t2)
            if m:
                naam = volle_naam(vol)
                t2 = (t2[:m.start()] + " " + t2[m.end():])
                break
        t2 = re.sub(r"(?i)(raad\s+)?" + DATUM + r"(\s+raad)?", " ", t2)
        t2 = re.sub(r"(?i)\bspreekt?tekst\b|^\s*raad\b|\braad\s*$", " ", t2)
        t2 = re.sub(r"\s+", " ", t2).strip()
        t2 = re.sub(r"^(Begrotingsinbreng|Inbreng)\s*[–-]\s*", r"\1: ", t2)
        t2 = re.sub(r"(?i)^[\s:–-]*(bij\s+)?(debat\s+)?(over|inzake|tbv)?\s*[:–-]?\s*", "", t2).strip()
        t2 = re.sub(r"(?i)^(cie|commissie)\s+\w+\s*:?\s*(inzake\s+)?|\btbv bespreking\s+", "", t2)
        t2 = re.sub(r"(?i)\s+(in de raad van|cie|commissie \w+)\s*$", "", t2).strip(" :–-")
    t2 = t2.strip()
    return (t2[:1].upper() + t2[1:]) if t2 else "", naam


def vergaderdatum(t, gepost):
    """Leest "26 februari" uit de titel; het jaar is dat van plaatsen, of het jaar ervoor als de maand later valt."""
    m = re.search(r"(?i)(\d{1,2})\s+(" + "|".join(MAANDEN) + r")(\s+(\d{4}))?", t)
    if not m:
        return gepost
    dag, maand = int(m.group(1)), MAANDEN.index(m.group(2).lower()) + 1
    jaar = int(m.group(4)) if m.group(4) else int(gepost[:4]) - (1 if maand > int(gepost[5:7]) else 0)
    return f"{jaar:04d}-{maand:02d}-{dag:02d}"


def item(x, soort, met_html=True):
    t = tekst(x["title"]["rendered"])
    platte = tekst(schoon_html(x["content"]["rendered"]))
    samen = tekst(x.get("excerpt", {}).get("rendered", "")) or platte
    samen = re.sub(r"\s*(Lees verder|verder lezen)\s*»?$", "", samen)
    if soort == "raadsvraag":
        samen = platte  # de excerpt van WordPress is al afgekapt; eerst de aanhef weg, dan zelf afkappen
    m = re.search(r"(?i)^(?:schriftelijke vragen:.{0,200}?)?indiener\s*:\s*(.+?),\s*hart voor den haag\s*", samen)
    voorlopig = ""
    if m:
        voorlopig, samen = m.group(1), samen[m.end():]
    samen = re.sub(r"(?i)^\s*datum\s*:?\s*(" + DATUM + r"|\d{1,2}-\d{1,2}-\d{4})\s*", "", samen)
    samen = re.sub(r"(?i)^\s*aan de voorzitter van de gemeenteraad,?\s*", "", samen)
    indiener = ""
    m = re.search(r"(?i)overeenkomstig art(ikel|\.)?\s*3[02].*?stel(t|len) (het raadslid|de raadsleden|raadsleden|raadslid|de leden)\s+(.+?),?\s*((van\s+)?(de fractie\s+)?hart voor den haag,?\s*)?de volgende vragen", platte)
    if m and len(m.group(4)) < 80:
        indiener = m.group(4).strip(" ,")
    samen = re.sub(r"(?is)\s*overeenkomstig art(ikel|\.)?\s*3[02]\b.{0,300}?de volgende vragen\s*:?\s*", " ", samen).strip()
    k = samen.lower().find("overeenkomstig art")
    if k > 80:
        samen = samen[:k].strip()
    if voorlopig and not indiener:
        indiener = voorlopig
    if not indiener:
        m = re.search(r"([A-Z][\w.'’-]+(?:\s+(?:van|de|der|den|ten|te|van den|van der)?\s*[A-Z][\w.'’-]+){1,3})\s+Hart voor Den Haag\s*$", platte)
        if m and len(m.group(1)) < 40 and not re.search(r"Den Haag|Hart", m.group(1)):
            indiener = m.group(1)
    dictum = None
    if soort in ("motie", "amendement"):
        for kop in ("verzoekt het college", "draagt het college op", "roept het college op", "spreekt uit", "besluit"):
            m = re.search(r"(?is)\b(" + kop + r")\b\s*(dat)?\s*[,:]?\s*(.*?)(en gaat over tot|en gaan over tot|$)", platte)
            if m and len(m.group(3).strip()) > 20:
                samen = m.group(1)[:1].upper() + m.group(1)[1:] + ": " + m.group(3).strip(" •-;")
                dictum = (m.group(1)[:1].upper() + m.group(1)[1:], afkappen(m.group(3).strip(" •-;,"), 1400))
                break
    if soort == "petitie":
        samen = platte
    if soort == "petitie":
        samen = re.sub(r"^(\d+\s+|tekst burgerinitiatief\s+)", "", samen, flags=re.I)
    raad = soort in ("motie", "amendement", "raadsvraag", "spreektekst")
    titel, spreker = schone_titel(t, soort) if raad else (t, "")
    if raad and not titel:
        m = re.search(r"(?i)inzake\s+(.+?)\s*\(", platte)
        titel = m.group(1)[:1].upper() + m.group(1)[1:] if m else t
    if spreker and not indiener:
        indiener = spreker
    geplaatst = x["date"][:10]
    d = {"id": f"{PREFIX[soort]}{x['id']}", "soort": soort, "slug": x["slug"], "titel": titel,
         "datum": vergaderdatum(t, geplaatst) if raad else geplaatst,
         "samenvatting": afkappen(samen), "beeld": echt_beeld(beeld(x)), "link": x["link"], "p": pad_van(x["link"]),
         "stadsdelen": [STADSDEEL[s] for s in x.get("stadsdeel", []) if s in STADSDEEL]}
    if not d["stadsdelen"]:
        # alleen raden als er een plek in de titel staat: een stadsbrede begroting hoort niet onder één stadsdeel
        d["stadsdelen"] = plekken(titel)
        d["geraden"] = bool(d["stadsdelen"])
    klein = echt_beeld(beeld_klein(x))
    if klein and d["beeld"] and klein != d["beeld"]:
        d["beeld_klein"] = klein
    ris = re.findall(r"RIS\s?(\d{6})", platte)
    if ris:
        d["ris"] = "RIS" + ris[0]
    if indiener and raad:
        d["indiener"] = indieners(indiener)
    if soort in ("motie", "amendement"):
        if re.search(r"(?i)\b(is|werd|wordt)?\s*(unaniem\s+)?aangenomen\b", platte) and not re.search(r"(?i)niet aangenomen", platte):
            d["status"] = "Aangenomen"
        elif re.search(r"(?i)\bverworpen\b", platte):
            d["status"] = "Verworpen"
    hand = re.search(r"signature-count\"><span>([\d.,]+)</span>", x["content"]["rendered"])
    if soort == "petitie" and hand:
        d["handtekeningen"] = int(re.sub(r"[.,]", "", hand.group(1)))
    if dictum:
        d["dictum"] = {"kop": dictum[0], "tekst": dictum[1]}
    d["geplaatst"] = geplaatst
    if geplaatst.startswith("1970"):
        # bij de verhuizing van de oude site raakte de datum van een deel van de stukken kwijt; herstel_datums() lost dat op
        d["_kapot"] = True
        d["_titel"] = t
        d["_tekst"] = platte[:600]
    if met_html:
        d["html"] = schoon_html(x["content"]["rendered"])
    d["onderwerpen"] = onderwerpen(t + " " + t + " " + tekst(x["content"]["rendered"]))
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


SPELLING = {"Karadogan": "Karadoğan"}  # namen zoals de raadsleden ze zelf schrijven


def spelling(tekst_):
    for fout, goed in SPELLING.items():
        tekst_ = tekst_.replace(fout, goed)
    return tekst_


def schrijf(naam, data, stil=False):
    pad = os.path.join(UIT, naam)
    os.makedirs(os.path.dirname(pad), exist_ok=True)
    tekst_ = spelling(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    if os.path.exists(pad):
        with open(pad, encoding="utf-8") as f:
            if f.read() == tekst_:
                return False
    with open(pad, "w", encoding="utf-8") as f:
        f.write(tekst_)
    if not stil:
        print(f"{naam}: {len(data) if isinstance(data, list) else 'ok'} ({len(tekst_.encode()) // 1024} kB)")
    return True


# ---------- het hele archief ----------
# Elk stuk krijgt een eigen bestand data/stuk/<id>.json met de volledige tekst. De site laadt dat pas als iemand het stuk opent.
# Per soort is er een lichte lijst zonder tekst: data/<bron>.json met het recente werk en data/lijst/<bron>-<jaar>.json per jaar.
# Elke ochtend komen alleen nieuwe en gewijzigde stukken binnen; op zondag (of met --alles) haalt de import alles opnieuw op
# en verdwijnen stukken die op hartvoordenhaag.nl niet meer bestaan.
SOORTEN = [
    ("nieuws", "nieuws", f"posts?categories_exclude={PETITIES},{SPREEKTEKSTEN}"),
    ("succes", "successen", "succes_post"),
    ("motie", "moties", "motie"),
    ("raadsvraag", "raadsvragen", "raadsvraag"),
    ("amendement", "amendementen", "amendement"),
    ("spreektekst", "spreekteksten", f"posts?categories={SPREEKTEKSTEN}"),
    ("petitie", "petities", f"posts?categories={PETITIES}"),
]
STUK = os.path.join(UIT, "stuk")
RAAD = ("motie", "amendement", "raadsvraag", "spreektekst")
NIET_IN_LIJST = {"html", "dictum", "link", "slug", "geplaatst", "_kapot", "_titel", "_tekst"}
RECENT_DAGEN, RECENT_MIN = 400, 100
VOLLE_DATUM = r"(\d{1,2})\s+(" + "|".join(MAANDEN) + r")\s+(\d{4})"


def met_param(pad, param):
    return pad + ("&" if "?" in pad else "?") + param


def wpnummer(d):
    return int(re.sub(r"^\D+", "", d["id"]))


def lees_stukken():
    uit = {}
    if os.path.isdir(STUK):
        for naam in os.listdir(STUK):
            if naam.endswith(".json"):
                with open(os.path.join(STUK, naam), encoding="utf-8") as f:
                    d = json.load(f)
                uit[d["id"]] = d
    return uit


def herstel_datums(stukken):
    """Stukken met datum 1 januari 1970: eerst een volledige datum in de titel, dan in de tekst.
    Lukt dat niet, dan de datum van het stuk met het dichtstbijzijnde nummer, en heet de datum geschat."""
    goed = sorted((wpnummer(d), d["geplaatst"]) for d in stukken.values() if not d.get("_kapot"))
    nummers = [n for n, _ in goed]
    for d in stukken.values():
        if not d.get("_kapot"):
            continue
        m = re.search(r"(?i)" + VOLLE_DATUM, d.get("_titel", "")) or re.search(r"(?i)" + VOLLE_DATUM, d.get("_tekst", ""))
        if m:
            datum = f"{int(m.group(3)):04d}-{MAANDEN.index(m.group(2).lower()) + 1:02d}-{int(m.group(1)):02d}"
            d.pop("datum_geschat", None)
        else:
            k = bisect.bisect_left(nummers, wpnummer(d))
            buren = [goed[j][1] for j in (k - 1, k) if 0 <= j < len(goed)]
            datum = buren[0] if buren else "2014-01-01"
            d["datum_geschat"] = True
        d["geplaatst"] = datum
        d["datum"] = vergaderdatum(d["_titel"], datum) if d["soort"] in RAAD and not d.get("datum_geschat") else datum


def licht(d):
    return {k: v for k, v in d.items() if k not in NIET_IN_LIJST}


def fractiewerk(fractie, index, paden=None):
    """Per raadslid de tien nieuwste stukken en het aantal vragen, moties en amendementen van het afgelopen jaar."""
    jaar = (datetime.date.today() - datetime.timedelta(days=365)).isoformat()
    paden = paden or {}
    for f in fractie:
        zelf, delen = plat(f["naam"]), plat(f["naam"]).split()
        voornaam, achternaam = delen[0], delen[-1]
        def van(i):
            if i.get("i"):
                return zelf in plat(i["i"])
            t = plat(i["t"] + " " + i["x"])
            return achternaam in t and voornaam in t
        mijn = sorted((i for i in index if van(i)), key=lambda i: i["d"], reverse=True)
        f["werk"] = [{**{k: i[k] for k in ("id", "s", "t", "d", "sd", "st") if k in i}, **({"p": paden[i["id"]]} if paden.get(i["id"]) else {})} for i in mijn[:10]]
        recent = [i for i in mijn if i.get("i") and i["d"] >= jaar]
        f["telling"] = {s_: sum(1 for i in recent if i["s"] == s_) for s_ in ("raadsvraag", "motie", "amendement")}


def archief_extra():
    """Pagina's en kandidaten van de oude site: alleen bewaard voor de verhuizing, de proef toont ze (nog) niet."""
    paginas = [{"id": x["id"], "titel": tekst(x["title"]["rendered"]), "slug": x["slug"], "link": x["link"],
                "html": schoon_html(x["content"]["rendered"])} for x in lijst("pages", 10 ** 6)]
    kandidaten = [{"id": x["id"], "naam": tekst(x["title"]["rendered"]), "slug": x["slug"], "link": x["link"], "beeld": beeld(x),
                   "html": schoon_html(x["content"]["rendered"])} for x in lijst("kandidaat", 10 ** 6)]
    schrijf("archief/paginas.json", paginas)
    schrijf("archief/kandidaten.json", kandidaten)


def main():
    os.makedirs(STUK, exist_ok=True)
    info_pad = os.path.join(UIT, "archief.json")
    vorige = json.load(open(info_pad, encoding="utf-8")) if os.path.exists(info_pad) else {}
    alles = "--alles" in sys.argv or not vorige.get("opgehaald") or not os.listdir(STUK)
    begin = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    sinds = None if alles else (datetime.datetime.fromisoformat(vorige["opgehaald"]) - datetime.timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%S")
    print("Alles ophalen" if alles else f"Alleen wat sinds {sinds} veranderde")

    stukken = lees_stukken()
    gezien, opgehaald = set(), 0
    for soort, bron, pad in SOORTEN:
        ruw = lijst(met_param(pad, f"modified_after={sinds}") if sinds else pad, 10 ** 6)
        for x in ruw:
            d = item(x, soort)
            stukken[d["id"]] = d
            gezien.add(d["id"])
        opgehaald += len(ruw)
        print(f"  {bron}: {len(ruw)} opgehaald")
    if alles:
        for weg in [k for k in stukken if k not in gezien]:
            del stukken[weg]
            os.remove(os.path.join(STUK, weg + ".json"))
            print("  weg:", weg)
    herstel_datums(stukken)

    # dubbele stukken (zelfde titel en datum) één keer
    per_soort = {soort: [] for soort, _, _ in SOORTEN}
    for d in sorted(stukken.values(), key=lambda d: (d["datum"], wpnummer(d)), reverse=True):
        per_soort[d["soort"]].append(d)
    for soort in per_soort:
        per_soort[soort] = uniek(per_soort[soort])
    houden = {d["id"] for lijst_ in per_soort.values() for d in lijst_}
    veranderd = 0
    for d in stukken.values():
        if d["id"] in houden:
            veranderd += schrijf(f"stuk/{d['id']}.json", d, stil=True)
    print(f"stuk/: {len(houden)} stukken, {veranderd} nieuw of gewijzigd")

    # lichte lijsten: recent per soort en alles per jaar
    grens = (datetime.date.today() - datetime.timedelta(days=RECENT_DAGEN)).isoformat()
    info = {"opgehaald": begin, "soorten": {}}
    geldige_jaarbestanden = set()
    for soort, bron, _ in SOORTEN:
        alle = [licht(d) for d in per_soort[soort]]
        recent = [d for k, d in enumerate(alle) if d["datum"] >= grens or k < RECENT_MIN]
        schrijf(f"{bron}.json", recent)
        jaren = {}
        for d in alle:
            jaren.setdefault(d["datum"][:4], []).append(d)
        for j, rij in jaren.items():
            schrijf(f"lijst/{bron}-{j}.json", rij, stil=True)
            geldige_jaarbestanden.add(f"{bron}-{j}.json")
        info["soorten"][soort] = {"bron": bron, "totaal": len(alle), "recent": len(recent), "jaren": {j: len(r) for j, r in sorted(jaren.items(), reverse=True)}}
        print(f"  {bron}: {len(alle)} in totaal, {len(recent)} recent, jaren {min(jaren) if jaren else '-'} tot {max(jaren) if jaren else '-'}")
    lijstmap = os.path.join(UIT, "lijst")
    for naam in os.listdir(lijstmap):
        if naam not in geldige_jaarbestanden:
            os.remove(os.path.join(lijstmap, naam))

    # zoekindex over alles: titel, soort, datum en het begin van de tekst
    index = []
    for soort, _, _ in SOORTEN:
        for i in per_soort[soort]:
            index.append({"id": i["id"], "s": i["soort"], "t": i["titel"], "d": i["datum"],
                          "x": tekst(i.get("html", ""))[:200], "sd": i["stadsdelen"], "o": i.get("onderwerpen", []),
                          **({"i": i["indiener"]} if i.get("indiener") else {}), **({"st": i["status"]} if i.get("status") else {}),
                          **({"g": 1} if i.get("geraden") else {})})
    index.sort(key=lambda i: i["d"], reverse=True)
    schrijf("zoekindex.json", index)

    fractie = []
    for x in lijst("fractielid", 30):
        naam = re.sub(r"^\d+\.\s*", "", tekst(x["title"]["rendered"]))
        naam = {"Mert Karadogan": "Mert Karadoğan"}.get(naam, naam)  # spelling zoals hij zelf schrijft
        inhoud = schoon_html(x["content"]["rendered"])
        veld = lambda k: tekst((re.search(r"<strong>\s*" + k + r"\s*:?\s*</strong>\s*:?(.*?)</li>", inhoud, re.S) or [None, ""])[1]).strip(" :")
        bio = re.sub(r"(?s)<ul[^>]*>\s*<li>\s*<strong>\s*Functie.*?</ul>", "", inhoud)
        bio = re.sub(r"(?s)^\s*<p>\s*Stadsdeel:[^<]*</p>", "", bio).strip()
        fractie.append({"naam": naam, "positie": int((re.match(r"\d+", tekst(x["title"]["rendered"])) or [0])[0]),
                        "stadsdelen": [STADSDEEL[s] for s in x.get("stadsdeel", []) if s in STADSDEEL],
                        # raadsleden: de foto van hartvoordenhaag.nl, ook als die met AI is bewerkt (uitzondering, besluit Damiën 29 okt)
                        "beeld": beeld(x) or kandidaat_foto(naam), "link": x["link"], "bio": bio,
                        "functie": veld("Functie"), "commissie": veld("Commissie"),
                        "portefeuilles": [p.strip(" .") for p in re.split(r",\s*(?![^()]*\))", veld("Portefeuilles")) if p.strip(" .")]})
    fractie.sort(key=lambda f: f["positie"])
    paden = {i["id"]: i.get("p", "") for lijst_ in per_soort.values() for i in lijst_}
    fractiewerk(fractie, index, paden)
    schrijf("fractie.json", fractie)
    schrijf("bestuur.json", bestuur())
    if alles:
        archief_extra()

    # bewijs bij de standpunten: hoeveel vragen, moties en amendementen sinds SINDS, en het laatste succes
    bewijs = {}
    for punt, onderw in BEWIJS.items():
        stukken_ = [i for i in index if i["d"] >= SINDS and set(i["o"]) & set(onderw)]
        tel = lambda s_: sum(1 for i in stukken_ if i["s"] == s_)
        succes = next((i for i in sorted(stukken_, key=lambda i: i["d"], reverse=True) if i["s"] == "succes" and i["o"] and i["o"][0] in onderw), None)
        bewijs[punt] = {"onderwerp": onderw[0], "vragen": tel("raadsvraag"), "moties": tel("motie"), "amendementen": tel("amendement"),
                        "succes": {"id": succes["id"], "t": succes["t"], "d": succes["d"], "p": paden.get(succes["id"], "")} if succes else None}
    succ = sorted((i for i in index if i["s"] == "succes" and i["d"] >= SINDS), key=lambda i: i["d"], reverse=True)
    bewijs["Echte ombudspolitiek"] = {"successen": len(succ), "succes": {"id": succ[0]["id"], "t": succ[0]["t"], "d": succ[0]["d"], "p": paden.get(succ[0]["id"], "")} if succ else None}
    bewijs["sinds"] = SINDS
    schrijf("bewijs.json", bewijs)

    # pas aan het eind: zo begint een afgebroken run de volgende keer bij de vorige stand
    info["volledig"] = begin if alles else vorige.get("volledig", "")
    schrijf("archief.json", info)


if __name__ == "__main__":
    sys.exit(main())
