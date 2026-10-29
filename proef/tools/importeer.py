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
import urllib.request

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


def haal(pad):
    req = urllib.request.Request(API + pad, headers={"User-Agent": "proefsite-hvdh/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


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


MAAND = r"(?:" + "|".join(MAANDEN) + r")"
DATUM = r"\d{1,2}\s+" + MAAND + r"(?:\s+\d{4})?"


def schone_titel(t, soort):
    """Haalt "Raad 26 februari motie:", "19 april 2018 Raad Amendement" en "Spreektekst <naam>" van de titel af.
    Geeft (titel, naam): de naam van de spreker gaat naar indiener, de datum staat er apart bij."""
    naam = ""
    t2 = re.sub(r"(?i)^(raadsvergadering\s+|raad\s+)?" + DATUM + r"\s*:?\s*(raad\s+)?(motie|amendement|schriftelijke vragen|raadsvragen)\s*:?\s*", "", t)
    t2 = re.sub(r"(?i)^(motie|amendement)\s*:\s*", "", t2)
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
    d = {"id": f"{PREFIX[soort]}{x['id']}", "soort": soort, "slug": x["slug"], "titel": titel,
         "datum": vergaderdatum(t, x["date"][:10]) if raad else x["date"][:10],
         "samenvatting": afkappen(samen), "beeld": echt_beeld(beeld(x)), "link": x["link"],
         "stadsdelen": [STADSDEEL[s] for s in x.get("stadsdeel", []) if s in STADSDEEL]}
    if not d["stadsdelen"]:
        # alleen raden als er een plek in de titel staat: een stadsbrede begroting hoort niet onder één stadsdeel
        d["stadsdelen"] = plekken(titel)
        d["geraden"] = bool(d["stadsdelen"])
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


def schrijf(naam, data):
    tekst_ = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    for fout, goed in SPELLING.items():
        tekst_ = tekst_.replace(fout, goed)
    with open(os.path.join(UIT, naam), "w", encoding="utf-8") as f:
        f.write(tekst_)
    print(f"{naam}: {len(data) if isinstance(data, list) else 'ok'}")


def main():
    os.makedirs(UIT, exist_ok=True)
    nieuws = uniek([item(x, "nieuws") for x in lijst(f"posts?categories_exclude={PETITIES},{SPREEKTEKSTEN}", 200)])
    schrijf("nieuws.json", nieuws)
    schrijf("successen.json", uniek([item(x, "succes") for x in lijst("succes_post", 200)]))
    schrijf("moties.json", uniek([item(x, "motie") for x in lijst("motie", 200)]))
    schrijf("raadsvragen.json", uniek([item(x, "raadsvraag") for x in lijst("raadsvraag", 200)]))
    schrijf("amendementen.json", uniek([item(x, "amendement") for x in lijst("amendement", 100)]))
    schrijf("spreekteksten.json", uniek([item(x, "spreektekst") for x in lijst(f"posts?categories={SPREEKTEKSTEN}", 60)]))
    schrijf("petities.json", uniek([item(x, "petitie") for x in lijst(f"posts?categories={PETITIES}", 30)]))
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
                        "beeld": echt_beeld(beeld(x)), "link": x["link"], "bio": bio,
                        "functie": veld("Functie"), "commissie": veld("Commissie"),
                        "portefeuilles": [p.strip(" .") for p in re.split(r",\s*(?![^()]*\))", veld("Portefeuilles")) if p.strip(" .")]})
    fractie.sort(key=lambda f: f["positie"])
    schrijf("fractie.json", fractie)
    schrijf("bestuur.json", bestuur())
    # zoekindex: titel, soort, datum en een stuk tekst, voor alles wat hierboven staat
    index = []
    for naam in ("nieuws", "successen", "moties", "amendementen", "raadsvragen", "spreekteksten", "petities"):
        for i in json.load(open(os.path.join(UIT, naam + ".json"), encoding="utf-8")):
            index.append({"id": i["id"], "s": i["soort"], "t": i["titel"], "d": i["datum"],
                          "x": tekst(i.get("html", ""))[:600], "sd": i["stadsdelen"], "o": i.get("onderwerpen", []), **({"i": i["indiener"]} if i.get("indiener") else {}),
                          **({"st": i["status"]} if i.get("status") else {})})
    schrijf("zoekindex.json", index)
    # bewijs bij de standpunten: hoeveel vragen, moties en amendementen sinds SINDS, en het laatste succes
    bewijs = {}
    for punt, onderw in BEWIJS.items():
        stukken = [i for i in index if i["d"] >= SINDS and set(i["o"]) & set(onderw)]
        tel = lambda s_: sum(1 for i in stukken if i["s"] == s_)
        succes = next((i for i in sorted(stukken, key=lambda i: i["d"], reverse=True) if i["s"] == "succes" and i["o"] and i["o"][0] in onderw), None)
        bewijs[punt] = {"onderwerp": onderw[0], "vragen": tel("raadsvraag"), "moties": tel("motie"), "amendementen": tel("amendement"),
                        "succes": {"id": succes["id"], "t": succes["t"], "d": succes["d"]} if succes else None}
    succ = sorted((i for i in index if i["s"] == "succes" and i["d"] >= SINDS), key=lambda i: i["d"], reverse=True)
    bewijs["Echte ombudspolitiek"] = {"successen": len(succ), "succes": {"id": succ[0]["id"], "t": succ[0]["t"], "d": succ[0]["d"]} if succ else None}
    bewijs["sinds"] = SINDS
    schrijf("bewijs.json", bewijs)


if __name__ == "__main__":
    sys.exit(main())
