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
   - `index.html`, `app.js`, `app.css`: de site. Eén pagina met routes achter het hekje (`#nieuws`, `#raadswerk/vragen`, `#petities/p114304`).
   - `beheer.html`, `beheer.js`: de beheeromgeving.
   - `beeld/`: logo's en vaste foto's. `data/`: de inhoud als JSON.
   - Kleuren, letters en maten staan als variabelen bovenaan `app.css` (`:root`). De huisstijl volgt hartvoordenhaag.nl: Raleway, het groen en geel van het logo.
2. **De inhoud van hartvoordenhaag.nl** komt elke ochtend binnen.
   - `tools/importeer.py` haalt via de openbare WordPress-API nieuws, successen, moties, amendementen, schriftelijke vragen, spreekteksten, petities, de fractie en het bestuur op. Het schrijft `data/*.json` (de nieuwste 200 per soort).
   - Dat gebeurt door de workflow `.github/workflows/proef-inhoud.yml`, elke dag om 4:37 UTC. Handmatig starten kan via het tabblad Actions op GitHub.
   - `data/agenda.json`, `kaart.json`, `wethouders.json` en `bewijs.json` worden niet geïmporteerd. Die past u met de hand aan (of de agenda via de beheeromgeving).
3. **De achterkant** is een Cloudflare Worker met de naam `hvdh-proef`, op https://hvdh-proef.damienzeller.workers.dev, met opslag in Cloudflare KV (`hvdh-proef-inhoud`). Hij bewaart wat in de beheeromgeving gebeurt en ontvangt de formulieren.

**Hoe de site alles samenvoegt.** `app.js` laadt een JSON-bestand uit `data/` en legt daar de aanpassingen uit de beheeromgeving overheen (functies `laad`, `aanpassingen` en `pasAan`). Eigen berichten komen er via `eigen()` bij. De import overschrijft aanpassingen dus nooit: die liggen apart bij de achterkant, per bericht-id (`n114543` is nieuwsbericht 114543 op hartvoordenhaag.nl).

### Adressen van de achterkant

| Adres | Wie | Wat |
| --- | --- | --- |
| `GET /inhoud` | iedereen | eigen berichten die gepubliceerd zijn |
| `GET /aanpassingen` | iedereen | aanpassingen op overgenomen berichten |
| `GET /tellers` | iedereen | handtekeningen via deze site, per petitie |
| `GET /foto/<id>` | iedereen | een geüploade foto |
| `POST /formulier` | iedereen | contact, melding, doe mee, aanmelding, petitie, nieuwsbrief |
| `POST /betaling`, `POST /mollie` | iedereen, Mollie | lid worden en doneren via Mollie |
| `POST /login`, `/login/code`, `/login/eigenaar`, `/login/herstel` | iedereen | inloggen |
| `GET/POST /items`, `DELETE /items/<id>` | ingelogd | eigen berichten |
| `GET /aanpassingen/alles`, `POST /aanpassingen`, `DELETE /aanpassingen/<id>` | ingelogd | overgenomen berichten aanpassen of terugzetten |
| `POST /foto` | ingelogd | foto uploaden (JPG, PNG, WebP, max. 3 MB) |
| `GET /inbox`, `POST /inbox/<id>/status`, `DELETE /inbox/<id>` | ingelogd | postvak |
| `GET /logboek` | ingelogd | wie wat deed |
| `POST /wachtwoord` | ingelogd | eigen wachtwoord wijzigen |
| `GET/POST /gebruikers`, `DELETE /gebruikers/<naam>` | beheerder | mensen met toegang |
| `GET /export` | beheerder | reservekopie van alles |

Opslag in KV, per sleutel: `items`, `aanpassingen`, `inbox`, `tellers`, `gebruikers` (wachtwoorden alleen als PBKDF2-hash), `logboek`, `sessie:<token>` (7 dagen), `foto:<id>`, `code` (10 minuten), `mollie-klaar`.

## Lokaal testen

```
git clone https://github.com/damienzeller-png/damienzeller-png.github.io
cd damienzeller-png.github.io
python3 -m http.server 8000
```

Open daarna http://localhost:8000/proef/ en http://localhost:8000/proef/beheer.html. De achterkant staat gewoon online en accepteert verzoeken van `localhost`, dus formulieren en inloggen werken ook lokaal. Let op: wat u lokaal opslaat, staat echt op de site.

## Een wijziging publiceren

1. Pas de bestanden aan (in een editor, of direct op github.com met het potloodje).
2. Heeft u `app.js`, `app.css` of `beheer.js` veranderd? Verhoog dan het nummer achter `?v=` in `index.html` en `beheer.html`, anders zien bezoekers nog de oude versie.
3. Commit naar de tak `main`. GitHub Pages zet het binnen een paar minuten online.

Botst een push met de importrobot, doe dan eerst `git pull --rebase`.

## De achterkant wijzigen

De code van de Worker staat nu in de privérepository `damienzeller-png/agents-damien`, in `cloudflare-hvdh/worker.js`. Een push daar zet hem via `.github/workflows/hvdh-proef.yml` automatisch online. Zonder toegang tot die repository kunt u de Worker niet wijzigen; zie hieronder hoe dat wordt opgelost.

Geheimen staan als GitHub Secrets bij die repository, nooit in de code:

| Geheim | Waarvoor |
| --- | --- |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | de Worker uitrollen |
| `TELEGRAM_TOKEN` | inlogcode en meldingen naar de eigenaar |
| `MOLLIE_KEY` | betalen echt aanzetten (zonder sleutel draait betalen als demo) |
| `HVDH_HERSTEL` | noodtoegang, zie hieronder |

## Noodtoegang

Kan niemand meer inloggen (de eigenaar is onbereikbaar en er is geen beheerder), dan is er een noodsleutel.

1. Iemand met toegang tot de GitHub-repository zet het geheim `HVDH_HERSTEL`: een lange willekeurige tekst van minstens 20 tekens.
2. De workflow `hvdh-proef.yml` opnieuw draaien (Actions, Run workflow). Die zet de sleutel in de Worker als `HERSTEL_SLEUTEL`.
3. Op de inlogpagina onder "Noodtoegang" de sleutel invullen. U bent dan beheerder en kunt bij Mensen nieuwe beheerders maken.

Elke keer dat de noodsleutel wordt gebruikt, komt er een bericht naar de eigenaar en een regel in het logboek. Zonder dat geheim staat noodtoegang uit.

## Waar het nu nog aan één persoon hangt

| Onderdeel | Nu | Wat nodig is |
| --- | --- | --- |
| Inloggen eigenaar | Telegram van Damiën | minstens twee beheerders met wachtwoord (kan nu al, tab Mensen) |
| Meldingen van nieuwe leden en giften | Telegram van Damiën | een partijadres of de ledenadministratie |
| Code van de site | GitHub-account van Damiën | overzetten naar een GitHub-organisatie van de partij met twee eigenaren |
| Code van de achterkant en de geheimen | privérepository van Damiën | meeverhuizen naar die organisatie |
| Worker en opslag | Cloudflare-account van Damiën | een Cloudflare-account van de partij met twee leden |
| Adres | damienzeller.nl/proef | het eigen domein hartvoordenhaag.nl |

Tot dat geregeld is: maak regelmatig een reservekopie (tab Hulp) en bewaar die bij het bestuur. Het postvak bevat persoonsgegevens, dus niet in een openbare map of in deze repository.

## Afspraken

- Geen wachtwoorden, sleutels of persoonsgegevens in deze repository: hij is openbaar.
- De site plaatst geen volg- of advertentiecookies.
- Teksten in gewone taal, in de u-vorm op de site. Schrijf "stadsdeel", niet "wijk", als het om de acht stadsdelen gaat.
