# Design

Het ontwerp van damienzeller.nl, opgeschreven van de gebouwde site (oktober 2026). De tokens staan in stijl.css onder `:root`.

## Wereld

Buurtman, documentair. Het stadsdeel is de ordening: de lijntekening van de dertien CBS-buurten in de opening, de buurtkaart, en op elk item een bijschrift met plek, datum en dossier. Geen kaartjesraster en geen social-embeds, maar lijsten met regels ertussen.

## Kleur

| Token | Waarde | Rol |
|---|---|---|
| `--hart` | #1E945A | Merkgroen voor vlakken zonder tekst, kaartvulling, lijnwerk en het ruitje in het bijschrift |
| `--veld` | #137345 | Groen dat tekst draagt: kop, opening, groene knoppen (wit erop 5,9:1) |
| `--woud` | #0B3B25 | Donkere vlakken: Volg, spreekuurregel in de opening, binnenrand van de focus |
| `--nacht` | #072A1A | Voet |
| `--zon` | #FFD237 | Signaal: hart, spreekuurdatum, Meld iets, focusring, selectie |
| `--link` | #116B42 (donker: #7BD3A2) | Links en dossierlabels op licht |
| `--bg` / `--vlak` / `--munt` | #F3F7F2 / #FFFFFF / #E3F1E7 | Grond, vlak en zacht groen vlak (melden) |
| `--ink` / `--zacht` / `--lijn` | #10251A / #4F6A5B / #D6E3D9 | Tekst, tweede tekst (5,5:1), lijnen |
| `--fout` | #B42318 (donker: #FF8A80) | Foutmeldingen bij velden |

Regel: geel staat nooit als kleine tekst op groen. De rolregel in de opening gebruikt `--zon-licht` (#FFE27A, 4,6:1).

## Letters

- Koppen en plaatsnamen: Archivo, smal (font-stretch 66 tot 88 procent), gewicht 800 tot 900.
- Tekst: Lexend 400, 600 en 700, 17px met regelhoogte 1,62.
- Cijfers in datums en RIS-nummers: tabular-nums.

## Onderdelen

- **Bijschrift** (`.bijschrift`): plek in Archivo met een groen ruitje, datum, dossier in linkkleur, gescheiden door een punt. Hetzelfde op Actueel, vragen, de buurtkaart en de nieuwspagina.
- **Logboek** (`.log`): regels met bijschrift, kop, samenvatting en een beeld rechts. Het eerste item is groter.
- **Onderbalk** (`.onderbalk`, onder 860px): Spreekuur, Uw buurt, Nieuws en Meld iets (geel). Tikdoelen van minimaal 54px.
- **Knoppen** (`.knop`): minimaal 48px hoog, radius 14px. Geel voor de hoofdactie, groen (`--veld`) en een lijnvariant.
- **Velden**: minimaal 48px, fout bij het veld met `aria-invalid` en een eigen pictogram.
- **Focus**: geel 3px buiten, donkergroen 2px binnen, zichtbaar op licht en op groen.
- **Plaatsbepaling**: menu en onderbalk krijgen `aria-current` voor de sectie in beeld.

## Ruimte en vorm

Secties 88px (64px op mobiel). Radius 14 (knoppen), 16 (beelden), 20 tot 30 (vlakken). Eén schaduw: `--schaduw`, alleen op het spreekuurkaartje, de kaart en het formulier.

## Beweging

Eén moment: de buurtlijnen tekenen zich in de opening. Knoppen schuiven 2px op bij hover. Bij reduced motion staat alles stil.

## Dossiers

dossiers.json is de enige bron voor de zeventien dossiers, de thema's en de herkenningspatronen. tools/nieuws.py (Python) en dossiers.js (browser) rekenen op dezelfde manier.

## Herkomst van beelden

- deel/*.jpg (deelbeeld per onderwerppagina): gerenderd met Chromium uit portret-uit.webp, het gele hart en de buurtlijnen van de opening, met Archivo; geen gegenereerde beelden.
- portret-uit.webp, portret.jpg, foto.jpg, deel.jpg en logo.png: aangeleverd door Damiën.
- fotos/*.jpg (Rietbuurt, team in het stadsdeel, flyer Ypenburg, politieke avond): aangeleverd door Damiën op 25 okt 2026. Verkleind naar 1400 en 720 px, zonder metadata. Gebruik: Rietbuurt bij Uw buurt, politieke avond bij Over, team en flyer bovenaan de stadsdeelpagina. Twee andere foto's (sportveld met jongeren, keukentafel) staan bewust niet op de site tot er toestemming is van de mensen die erop staan.
- **Doc-foto** (`.doc-foto`): eigen foto, 4:3, radius 18, met het gewone bijschrift (plek · wat). Nooit stockfoto's of gegenereerde beelden.
