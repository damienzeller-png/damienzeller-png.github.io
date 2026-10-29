# Proefsite Hart voor Den Haag: uitleg voor wie verder bouwt

Dit is de proef voor een nieuwe website van Hart voor Den Haag, nu te zien op https://damienzeller.nl/proef/ (niet vindbaar in zoekmachines). Deze uitleg is geschreven zodat een gewone webbouwer, of iemand van de partij, verder kan zonder Claude en zonder Damiën.

## Inhoud aanpassen: geen code nodig

Bijna al het dagelijkse werk gebeurt in de beheeromgeving: https://damienzeller.nl/proef/beheer.html

- **Berichten:** nieuws, successen, petities, vacatures en afspraken plaatsen. Ook de berichten die van hartvoordenhaag.nl komen aanpassen (titel, datum, stadsdeel, onderwerpen, tekst, foto, uitslag van een motie), bovenaan zetten of verbergen.
- **Postvak:** meldingen, vragen, aanmeldingen en handtekeningen van de formulieren.
- **Mensen:** wie mag inloggen. Rollen: *redacteur* (berichten en postvak) en *beheerder* (ook mensen en reservekopie). Zorg dat er altijd minstens twee beheerders zijn.
- **Hulp:** uitleg in gewone taal, en een knop voor een reservekopie.

De **eigenaar** logt in met een code die via Telegram komt. Alle anderen loggen in met naam en wachtwoord.

## Hoe het in elkaar zit

Er zijn drie delen. Geen framework, geen bouwstap, geen database-server.

1. **De voorkant** staat in deze map (`proef/`) en wordt gehost door GitHub Pages.
   - Elke pagina heeft een gewoon adres: `/proef/nieuws/`, `/proef/raadswerk/vragen/?onderwerp=Veiligheid`, `/proef/fractie/damien-zeller/`. Een stuk van hartvoordenhaag.nl staat op **hetzelfde adres als op de oude site** (`/proef/motie/<naam>/`, `/proef/<naam-van-het-bericht>/`), zodat oude links blijven werken en Google de stukken vindt. Wat de redactie hier zelf plaatst, staat op `/proef/s/w<nummer>/`.
   - `kader.js`: kop, menu en voet, één keer voor alle pagina's. Hierin staat ook `HVDH.BASE` (nu `/proef/`).
   - `app.js`, `app.css`: de site zelf. `app.js` leest het adres en bouwt de pagina; links binnen de site wisselen alleen de inhoud (geen nieuwe pagina laden).
   - `beheer.html`, `beheer.js`: de beheeromgeving.
   - `beeld/`: logo's en vaste foto's. `lettertype/`: Raleway, op de site zelf (geen verzoek naar Google). `data/`: de inhoud als JSON.
   - **Gemaakte pagina's** (niet met de hand aanpassen): de duizenden mappen met een `index.html` in `proef/` maakt `tools/bouw.py`. Elke pagina heeft al de titel, de omschrijving en de foto voor zoekmachines en voor het voorbeeld als iemand de link deelt, plus de tekst van het stuk. De lijst staat in `tools/gegenereerd.txt`; pagina's van stukken die verdwijnen, ruimt het script zelf op. Het maakt ook `sitemap.xml`, `feed.xml` (RSS) en `404.html` in de hoofdmap van de repository.
   - Oude adressen die op de nieuwe site anders heten (`fractieleden/…`, `kandidaat/…`, `stadsdeel/…`, `expats/`, `ik-word-lid/`) sturen door.
   - Kleuren, letters en maten staan als variabelen bovenaan `app.css` (`:root`). De huisstijl volgt hartvoordenhaag.nl: Raleway, het groen en geel van het logo.
2. **Het hele archief van hartvoordenhaag.nl** staat in `data/`, sinds 2012: ruim 7.800 stukken.
   - `tools/importeer.py` haalt via de openbare WordPress-API nieuws, successen, moties, amendementen, schriftelijke vragen, spreekteksten, petities, de fractie en het bestuur op.
   - Elk stuk heeft een eigen bestand `data/stuk/<id>.json` met de volledige tekst. De site laadt dat pas als iemand het stuk opent.
   - Per soort is er een lichte lijst zonder tekst: `data/<soort>.json` met het recente werk (ruim een jaar, minstens 100 stukken) en `data/lijst/<soort>-<jaar>.json` per jaar. Lijsten op de site laden ouder werk jaar voor jaar bij, met de knop Meer laden.
   - `data/zoekindex.json` (titel en begin van de tekst van alles) is voor de zoekpagina en de beheeromgeving. `data/archief.json` telt per soort en per jaar, en onthoudt wanneer de import liep.
   - `data/archief/paginas.json` en `kandidaten.json` bewaren de pagina's en kandidaten van de oude site voor de verhuizing. De proef toont ze niet.
   - Bij een dertigtal oude stukken gaf WordPress als datum 1 januari 1970. De import haalt de datum dan uit de titel of de tekst; lukt dat niet, dan schat hij hem (veld `datum_geschat`) en toont de site "datum onbekend".
   - De workflow `.github/workflows/proef-inhoud.yml` draait elke dag om 4:37 UTC, haalt alleen op wat nieuw of gewijzigd is (minder dan een minuut) en draait daarna `tools/bouw.py`. Op zondag haalt hij alles opnieuw op (ongeveer tien minuten), zodat ook verwijderde stukken verdwijnen. Handmatig kan via het tabblad Actions, met het vinkje "Alles opnieuw ophalen".
   - `data/agenda.json`, `kaart.json`, `wethouders.json` worden niet geïmporteerd. Die past u met de hand aan (of de agenda via de beheeromgeving).
3. **De achterkant** is een Cloudflare Worker met de naam `hvdh-proef`, op https://hvdh-proef.damienzeller.workers.dev, met opslag in Cloudflare KV (`hvdh-proef-inhoud`). Hij bewaart wat in de beheeromgeving gebeurt en ontvangt de formulieren.

**Bezoekers tellen.** De site plaatst geen cookies. Bij elke pagina stuurt `app.js` het adres naar de achterkant (`POST /bezoek`), die per dag per pagina een getal ophoogt, zonder IP-adres. In de beheeromgeving staat het onder Bezoek.

**Hoe de site alles samenvoegt.** `app.js` laadt een JSON-bestand uit `data/` en legt daar de aanpassingen uit de beheeromgeving overheen (functies `laad`, `stuk`, `aanpassingen` en `pasAan`). Lijsten met ouder werk lopen via `stroom()` en `meerLadenStroom()`. Eigen berichten komen er via `eigen()` bij. De import overschrijft aanpassingen dus nooit: die liggen apart bij de achterkant, per bericht-id (`n114543` is nieuwsbericht 114543 op hartvoordenhaag.nl).

### Adressen van de achterkant

| Adres | Wie | Wat |
| --- | --- | --- |
| `GET /inhoud`, `GET /aanpassingen`, `GET /tellers` | iedereen | eigen berichten, aanpassingen op overgenomen berichten, handtekeningen per petitie (30 seconden gecachet) |
| `GET /foto/<id>` | iedereen | een foto bij een bericht |
| `POST /formulier` | iedereen | contact, melding (met foto en plek), doe mee, aanmelding, petitie, nieuwsbrief; antwoord met een kenmerk (`M-26-0042`) |
| `POST /bezoek` | iedereen | bezoekersteller zonder cookies of IP-adres |
| `GET /nieuwsbrief/bevestig`, `/nieuwsbrief/af` | iedereen | nieuwsbrief bevestigen of afmelden (links uit de mail) |
| `POST /betaling`, `POST /mollie` | iedereen, Mollie | lid worden en doneren via Mollie (bedragen voor leden komen altijd van de server) |
| `POST /login`, `/login/2fa`, `/login/code`, `/login/eigenaar`, `/login/herstel` | iedereen | inloggen (met tweestapsverificatie als die aan staat) |
| `GET /sessie`, `POST /wachtwoord`, `POST /2fa/start`, `/2fa/aan`, `/2fa/uit` | ingelogd | eigen account |
| `GET/POST /items`, `DELETE /items/<id>` | ingelogd | eigen berichten |
| `GET /aanpassingen/alles`, `POST /aanpassingen`, `DELETE /aanpassingen/<id>` | ingelogd | overgenomen berichten aanpassen of terugzetten |
| `POST /foto` | ingelogd | foto uploaden (JPG, PNG, WebP, max. 3 MB) |
| `GET /inbox` (filters `soort`, `status`, `q`, `petitie`, `activiteit`, bladeren met `n` en `voor`), `GET /inbox/telling`, `GET /inbox/export` (CSV), `GET /inbox/<id>/foto`, `POST /inbox/<id>/status`, `DELETE /inbox/<id>` | ingelogd | postvak |
| `GET /logboek`, `GET /statistiek` | ingelogd | wie wat deed, bezoek en formulieren per dag |
| `GET/POST /gebruikers`, `DELETE /gebruikers/<naam>`, `GET /export` | beheerder | mensen met toegang, reservekopie |
| `GET /backup`, `POST /backup/terugzetten` | met de back-upsleutel | volledige back-up en terugzetten (zie hieronder) |

**Opslag.** In Cloudflare KV (`hvdh-proef-inhoud`): `items`, `aanpassingen`, `gebruikers` (wachtwoorden alleen als PBKDF2-hash, 100.000 rondes), `sessie:<token>` (7 dagen), `foto:<id>`, `code`. Alles wat bezoekers insturen staat in een Durable Object met SQLite (`Postvak`): inzendingen met kenmerk, handtekeningen, nieuwsbriefadressen, het logboek, de bezoekersteller en de snelheidsgrenzen. Daar loopt elke dag een bewaartermijn: inzendingen ouder dan een jaar gaan weg, nieuwsbriefaanmeldingen niet. De oude KV-sleutels `inbox` en `tellers` zijn bij de overstap overgenomen en blijven staan als kopie.

**Mails.** De teksten van de bevestigingsmails staan bovenin `worker.js` in `MAILTEKSTEN`. Ze gaan pas de deur uit als `BREVO_KEY` en `MAIL_AFZENDER` zijn gezet.

## Lokaal testen

```
git clone https://github.com/damienzeller-png/damienzeller-png.github.io
cd damienzeller-png.github.io
python3 proef/tools/bouw.py        # pagina's maken (na een wijziging in data of in bouw.py)
python3 -m http.server 8000
```

Open daarna http://localhost:8000/proef/ en http://localhost:8000/proef/beheer.html. Let op: de eenvoudige server van Python stuurt een onbekend adres (zoals `/proef/s/w12/`) niet door naar `404.html`, GitHub Pages wel. Test zulke adressen online of met een server die dat nabootst. De achterkant staat gewoon online en accepteert verzoeken van `localhost`, dus formulieren en inloggen werken ook lokaal. Let op: wat u lokaal opslaat, staat echt op de site.

## Een wijziging publiceren

1. Pas de bestanden aan (in een editor, of direct op github.com met het potloodje).
2. De pagina's laden `app.js`, `app.css` en `kader.js` zonder versienummer. GitHub Pages laat browsers ze tien minuten bewaren; daarna halen ze de nieuwe versie. Alleen in `beheer.html` staat nog een `?v=`: verhoog dat nummer als u `beheer.js` of `app.css` verandert.
3. Commit naar de tak `main`. GitHub Pages zet het binnen een paar minuten online.

Botst een push met de importrobot, doe dan eerst `git pull --rebase`.

## De achterkant wijzigen

De code van de Worker staat nu in de privérepository `damienzeller-png/agents-damien`, in `cloudflare-hvdh/worker.js`. Een push daar zet hem via `.github/workflows/hvdh-proef.yml` automatisch online. Zonder toegang tot die repository kunt u de Worker niet wijzigen; zie hieronder hoe dat wordt opgelost.

Geheimen staan als GitHub Secrets bij die repository, nooit in de code. Alles behalve de eerste drie is optioneel: zonder het geheim staat dat onderdeel uit.

| Geheim | Waarvoor |
| --- | --- |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | de Worker uitrollen |
| `TELEGRAM_TOKEN` | inlogcode en meldingen naar de eigenaar |
| `MOLLIE_KEY` | betalen echt aanzetten (zonder sleutel draait betalen als proef) |
| `HVDH_HERSTEL` | noodtoegang, zie hieronder |
| `BREVO_KEY`, `MAIL_AFZENDER`, `MAIL_ANTWOORD` | bevestigingsmails via Brevo (eerst SPF, DKIM en DMARC voor het domein regelen, en in Brevo het volgen van kliks en openen uitzetten) |
| `MAILCHIMP_KEY`, `MAILCHIMP_LIJST` | nieuwsbriefaanmeldingen ook naar Mailchimp (met dubbele bevestiging) |
| `TURNSTILE_GEHEIM` | robotcontrole op formulieren. Zet eerst de sitesleutel in `kader.js` (`HVDH.TURNSTILE`), anders weigert de achterkant alle formulieren |
| `BACKUP_SLEUTEL`, `HVDH_BACKUP_PUBKEY` | de nachtelijke versleutelde back-up (zie hieronder) |

Een geheim dat u uit GitHub haalt, blijft in de Worker staan tot u het daar ook verwijdert (Cloudflare-dashboard, Workers, hvdh-proef, Settings, Variables).

## Back-up en terugzetten

- De workflow `hvdh-backup.yml` haalt elke nacht om 3:17 UTC `GET /backup` op, versleutelt het met `age` voor de publieke sleutel in `HVDH_BACKUP_PUBKEY` en bewaart het 35 dagen als artifact van die workflow. Onversleuteld komt het nergens. Zet in de repository-instellingen de bewaartermijn van artifacts op minstens 35 dagen.
- Sleutelpaar maken (eenmalig, door het bestuur, op een eigen computer): `age-keygen -o hvdh-backup.key`. De regel die met `age1` begint is de publieke sleutel: die gaat in `HVDH_BACKUP_PUBKEY`. Het bestand `hvdh-backup.key` is de geheime sleutel: bewaar het in een wachtwoordmanager en op papier, nooit in GitHub.
- Terugzetten staat stap voor stap bovenin `hvdh-backup.yml`. De achterkant bewaart vóór het terugzetten eerst de huidige stand in KV (`backup:voor-terugzetten`).
- Een noodversie van de oude achterkant staat in agents-damien, `werkmap/Website-proef/noodversie-achterkant-worker.js`. Cloudflare laat na de overstap naar het Durable Object geen terugdraaien met één klik meer toe; zet dan die versie van `worker.js` terug en push.

## Noodtoegang

Kan niemand meer inloggen (de eigenaar is onbereikbaar en er is geen beheerder), dan is er een noodsleutel.

1. Iemand met toegang tot de GitHub-repository zet het geheim `HVDH_HERSTEL`: een lange willekeurige tekst van minstens 20 tekens.
2. De workflow `hvdh-proef.yml` opnieuw draaien (Actions, Run workflow). Die zet de sleutel in de Worker als `HERSTEL_SLEUTEL`.
3. Op de inlogpagina onder "Noodtoegang" de sleutel invullen. U bent dan beheerder en kunt bij Mensen nieuwe beheerders maken.

Elke keer dat de noodsleutel wordt gebruikt, komt er een bericht naar de eigenaar en een regel in het logboek. Zonder dat geheim staat noodtoegang uit.

## Waar het nu nog aan één persoon hangt

| Onderdeel | Nu | Wat nodig is |
| --- | --- | --- |
| Inloggen eigenaar | Telegram van Damiën | minstens twee beheerders met wachtwoord en tweestapsverificatie (kan nu al, tab Mensen en Mijn account) |
| Meldingen van nieuwe leden en giften | Telegram van Damiën | een partijadres of de ledenadministratie |
| Code van de site | GitHub-account van Damiën | overzetten naar een GitHub-organisatie van de partij met twee eigenaren |
| Code van de achterkant en de geheimen | privérepository van Damiën | meeverhuizen naar die organisatie |
| Worker en opslag | Cloudflare-account van Damiën | een Cloudflare-account van de partij met twee leden |
| Adres | damienzeller.nl/proef | het eigen domein hartvoordenhaag.nl |

Tot dat geregeld is: maak regelmatig een reservekopie (tab Hulp) en bewaar die bij het bestuur. Het postvak bevat persoonsgegevens, dus niet in een openbare map of in deze repository.

## Overstappen naar hartvoordenhaag.nl

1. In `kader.js`: `HVDH.BASE = "/"`. In `tools/bouw.py`: `BASE = "/"`, `SITE = "https://www.hartvoordenhaag.nl"`, `PROEF = False` (dan verdwijnt ook `noindex`).
2. De site en de map `data` naar de hoofdmap van de nieuwe hosting, `python3 tools/bouw.py` draaien. Oude adressen van stukken werken dan vanzelf, want de pagina's staan op dezelfde plek.
3. In de Worker (`SITE`, terugkeeradres van Mollie) het nieuwe domein zetten, en het domein toevoegen aan de toegestane herkomst (CORS).
4. In Google Search Console de nieuwe `sitemap.xml` opgeven.
5. Foto's en pdf's van wp-content eerst overzetten (stap 3), anders verdwijnen ze als WordPress uitgaat.

## Afspraken

- Geen wachtwoorden, sleutels of persoonsgegevens in deze repository: hij is openbaar.
- De site plaatst geen volg- of advertentiecookies.
- Teksten in gewone taal, in de u-vorm op de site. Schrijf "stadsdeel", niet "wijk", als het om de acht stadsdelen gaat.
