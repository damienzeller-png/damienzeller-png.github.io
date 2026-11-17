# Ontwerpregels

Geldt voor damienzeller.nl, de proefsite (`proef/`) en de beheeromgeving. De huisstijl zelf staat in DESIGN.md, het doel en de bezoekers in PRODUCT.md. Dezelfde lijst staat bij de agents (agents-damien, `werkmap/About Me/ontwerpregels.md`) en in de skill ontwerp-hvdh.

## Afwerking: de lijst die alles haalt

Twee bronnen, toegespitst op Damiëns sites en schermen (gewone HTML, CSS en JavaScript, Nederlands, veel oudere bewoners op een telefoon): **Impeccable** (impeccable.style) voor het oordeel en wat eruit moet, en de **Web Interface Guidelines van Vercel** voor de techniek. Wat alleen voor React of het Engels geldt (hoofdletters in koppen, het en-teken) is weggelaten.

### Toegankelijk en toetsenbord
- Een knop voor een actie, een link voor een adres. Nooit een div of span met een klik.
- Een knop met alleen een icoon heeft een aria-label. Sierpictogrammen krijgen aria-hidden.
- Focus is zichtbaar (`:focus-visible`). Nooit `outline:none` zonder vervanging. Vaste balken bedekken het veld met focus niet.
- Koppen lopen op in volgorde, er is een link "Naar de inhoud" en ankers hebben `scroll-margin-top`.
- Een melding die later verschijnt staat in een vlak met `aria-live="polite"`.

### Formulieren
- Elk veld heeft een label, een `name`, het juiste `type` en `autocomplete` (`off` bij vrije velden zoals onderwerp of zoeken).
- E-mail, codes en gebruikersnamen: `spellcheck="false"` en `autocapitalize="off"`.
- Plakken blokkeren we nooit. De fout staat bij het veld, de focus gaat naar de eerste fout en de melding zegt wat iemand moet doen.
- De verzendknop blijft bruikbaar tot het verzoek loopt en zegt daarna "Bezig…".
- Vinkje en tekst zijn samen één tikvlak.

### Tikken en telefoon
- `touch-action: manipulation` op alles waar je op tikt, en een eigen tikkleur (`-webkit-tap-highlight-color`).
- Tikdoelen minstens 44 px. Zoomen staat altijd aan.
- Een menu of laag die zelf scrolt krijgt `overscroll-behavior: contain`. Randen houden rekening met `env(safe-area-inset-*)`.

### Beweging
- Alleen `transform` en `opacity` bewegen. Nooit `transition: all`.
- `prefers-reduced-motion` volgen: dan staat alles stil, ook een film op de achtergrond.
- Wat langer dan vijf seconden vanzelf beweegt, heeft een pauzeknop.
- Eén bewegingsmoment per pagina, niet op elke sectie dezelfde binnenkomer.

### Beeld en snelheid
- Elk beeld heeft `width` en `height` of een vaste verhouding, zodat de pagina niet verspringt.
- Onder de vouw `loading="lazy"`, het eerste grote beeld `fetchpriority="high"`.
- Lettertypes voorladen, met `font-display: swap`.
- Een film (mp4, zonder geluid, `playsinline`) in plaats van een gif, altijd met een stilstaand beeld als terugval.
- Lange lijsten laden in delen.

### Staat en adres
- Filters, tabbladen en bladeren staan in het adres, zodat een link en de terugknop kloppen.
- Iets weggooien vraagt een bevestiging of kan ongedaan worden gemaakt.

### Tekst
- Het beletselteken (…) in plaats van drie punten, echte aanhalingstekens, een vaste spatie tussen getal en eenheid.
- Getallen onder elkaar: `tabular-nums`. Koppen: `text-wrap: balance`.
- Een knop zegt wat er gebeurt ("Verstuur melding", niet "Verder"). Een lege lijst krijgt een zin. Lange namen en adressen breken af.

### Wat eruit moet (Impeccable)
- Geen regeltje in kapitalen boven een kop. De kop draagt zichzelf.
- Geen gekleurde streep links of rechts op een kaart, lijstregel of melding. Gebruik een getint vlak of een woord.
- Geen tekst met een kleurverloop, geen glas of vervaging als versiering, geen harde blokschaduw.
- Geen raster van gelijke kaarten met icoon, kop en tekst. Nooit een kaart in een kaart.
- Geen groot getal met een klein labeltje als vulling. Alleen als het getal zelf het nieuws is.
- Geen sectienummers, geen emoji als icoon, geen venster dat opspringt voor iets wat ook op de pagina kan.
- De delen van de browser horen bij het ontwerp: selectie, cursor, focusring, onderstreping en schuifbalk in de huisstijl.

### Zo gebruik je het
- Oordeel en richting: Impeccable (`critique`, `distill`, `polish`), met PRODUCT.md en DESIGN.md als context. Een bestaand ontwerp verfijnen we, we vervangen het niet.
- Techniek: de volledige regels van Vercel en een snelle controle staan in de site-repo, map `tools/ontwerp/` (`python3 tools/ontwerp/controle.py`).
- Daarna kijken op 390 px en op een laptop, in licht en donker.
