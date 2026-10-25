# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Bewoners van stadsdeel Leidschenveen-Ypenburg (dertien buurten in Ypenburg, Hoornwijck en Leidschenveen), vaak op hun telefoon en onderweg, ook ouderen. Zij willen weten wanneer het volgende spreekuur is, iets melden en zien wat hun raadslid in hun buurt doet.
- Journalisten die snel een bio, de portefeuille, een perscontact en een portretfoto zoeken.
- Mensen die Damiën via TikTok, X of de partij vinden en willen zien wie hij is en wat hij doet.

## Product Purpose

De persoonlijke site van Damiën Zeller, raadslid voor Hart voor Den Haag in de Haagse gemeenteraad (2026-2030) en raadslid voor stadsdeel Leidschenveen-Ypenburg. Hij is woordvoerder van een eigen portefeuille. Succes betekent drie dingen: bewoners komen naar het spreekuur, bewoners sturen meldingen die Damiën zelf leest, en bezoekers zien in een paar seconden wat hij voor hun buurt en zijn onderwerpen doet.

## Positioning

Geen partijsite en geen campagnepagina. Dit is de site van één raadslid die in het stadsdeel woont en daar spreekuur houdt. De buurten zelf (CBS-grenzen, buurtnamen, spreekuurplekken) zijn de ordening. Wat hij doet staat er controleerbaar op: schriftelijke vragen met status en verwachte antwoorddatum, en nieuws dat aan zijn dossiers gekoppeld is.

## Operating Context

- Statische site op GitHub Pages (damienzeller.nl), zonder framework: index.html, nieuws.html, privacy.html, voorwaarden.html en stijl.css.
- Spreekuur, eigen berichten, TikTok, X en vragen komen uit de Telegram-bot via een Cloudflare-doorgeefluik (`/site`). links.json is de reserve.
- nieuws.json wordt elke ochtend opnieuw gemaakt uit hartvoordenhaag.nl door tools/nieuws.py. Het bevat alleen berichten waarin Damiën voorkomt en elk bericht krijgt een label voor een van zijn dossiers.
- Meldingen gaan via het doorgeefluik naar Damiën in Telegram.

## Capabilities and Constraints

- Portefeuille (oktober 2026, volgens het portefeuillebesluit RIS326037): Wmo en mantelzorg, beschermd wonen, zorginnovatie, volksgezondheid (met huiselijk geweld en Veilig Thuis), voedselstrategie, toegankelijkheid en doelgroepenvervoer, onderwijs (met mbo, hoger onderwijs en studenten), sport, lokale media en de Joodse gemeenschap. Daarnaast het stadsdeel Leidschenveen-Ypenburg. Openbaar vervoer, jeugdhulp en winteropvang horen er niet meer bij.
- De dossierindeling van de site volgt de zeventien dossiers uit zijn dossierkast.
- Hart voor Den Haag zit in de coalitie. De site laat zien wat Damiën doet en richt zich niet tegen wethouders.
- Spreekuur: maandelijks, afwisselend in Leidschenveen en Ypenburg.
- Oude nieuwsberichten blijven allemaal staan.
- Geparkeerd: een QR-code per buurt, aanmelden voor de nieuwsbrief en bezoekerstellingen.
- Geen cookies. TikTok laadt pas als iemand op afspelen drukt.

## Brand Commitments

- Huisstijl Hart voor Den Haag: groen en geel, met het gele hart uit het logo.
- Koppen in Archivo smal, lopende tekst in Lexend (gekozen voor leesgemak).
- U-vorm, gewone taal en geen em-dash. Toon: licht formeel, actief, af en toe met humor.
- De opening blijft: de lijntekening van de dertien buurten, het gele hart achter het vrijstaande portret en de naam in Archivo smal.
- Richting voor de premium versie (gekozen door Damiën, 25 oktober 2026): de buurtman, documentair. Het stadsdeel en de kaart lopen als systeem door de hele site. Eigen foto's uit de wijk komen later.

## Evidence on Hand

- Portretten: portret-uit.webp (vrijstaand), portret.jpg, foto.jpg. Deelbeeld: deel.jpg. Logo: logo.png.
- buurten.geojson: de CBS-buurtgrenzen van 2024 met het aantal inwoners.
- Echte schriftelijke vragen met RIS-nummer en status, uit de bot.
- Nog niet aanwezig, dus niet verzinnen: eigen wijkfoto's, citaten van bewoners, cijfers over meldingen, een telefoonnummer voor de pers.

## Product Principles

1. Eerst wat een bewoner nu kan doen: het spreekuur en een melding binnen één tik, op elke pagina.
2. Alleen wat over Damiën en zijn dossiers gaat. Partijnieuws dat hem niet raakt hoort hier niet.
3. Controleerbaar boven mooi: elk item heeft een datum, een bron en waar mogelijk een RIS-nummer.
4. De plek is de ordening: buurt en dossier zijn de labels, niet "categorieën".
5. Leesbaar voor iedereen, ook voor ouderen op een telefoon in de buitenlucht.

## Accessibility & Inclusion

WCAG 2.2 AA als ondergrens: contrast van minstens 4,5:1 voor tekst, tikdoelen van minstens 44px, zichtbare focus op elke achtergrond en foutmeldingen bij het veld zelf. Lexend als leesletter, een skiplink, een donkere modus en respect voor reduced motion.
