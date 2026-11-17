#!/usr/bin/env python3
"""Snelle controle op de regels uit ONTWERPREGELS.md die je in de code kunt zien.

Gebruik (vanuit de hoofdmap):  python3 tools/ontwerp/controle.py [bestanden]
Zonder bestanden loopt hij de eigen bestanden van beide sites na.
Hij vindt geen alles: kijk daarna zelf op 390 px en op een laptop.
"""
import re, sys

STANDAARD = ["stijl.css", "index.html", "dossiers.js", "proef/app.css", "proef/app.js",
             "proef/kader.js", "proef/beheer.html", "proef/beheer.js"]
FOUT = [
    ("transition: all", r"transition\s*:\s*all\b"),
    ("zoomen uitgezet", r"user-scalable\s*=\s*no|maximum-scale\s*=\s*1\b"),
    ("drie punten in plaats van …", r"[A-Za-zÀ-ÿ]\.\.\.(?!\.)(?=[^\n]*[<\"`])"),
    ("div of span met onclick", r"<(div|span)[^>]*\sonclick="),
    ("tekst met kleurverloop", r"background-clip\s*:\s*text"),
    ("plakken geblokkeerd", r"onpaste\s*="),
    ("e-mailveld zonder spellcheck=false", r"<input(?=[^>]*type=\"email\")(?![^>]*spellcheck)[^>]*>"),
    ("bovenregel boven een kop", r"class=\"(bovenregel|eyebrow|kicker)\""),
    # de as van de tijdlijn en het citaat in een artikel zijn bewuste uitzonderingen
    ("gekleurde zijstreep op een vlak", r"^(?![^\n]*(tijdlijn|blockquote))[^\n]*border-left\s*:\s*[3-9]px\s+(solid|dashed|dotted)\s+(var\(--|#)"),
]
NAZIEN = [
    ("outline: none (heeft het een vervanging?)", r"outline\s*:\s*(none|0)\b"),
    ("autofocus (alleen in een venster)", r"\bautofocus\b"),
]

def regels(tekst, patroon):
    return [tekst.count("\n", 0, m.start()) + 1 for m in re.finditer(patroon, tekst, re.I | re.M)]

fouten = 0
for pad in sys.argv[1:] or STANDAARD:
    try:
        tekst = open(pad, encoding="utf-8", errors="replace").read()
    except OSError as e:
        print(f"{pad}: niet gelezen ({e})"); continue
    for naam, patroon in FOUT:
        r = regels(tekst, patroon)
        if r:
            fouten += len(r); print(f"{pad}: FOUT {naam}, regel {', '.join(map(str, r[:10]))}")
    for naam, patroon in NAZIEN:
        r = regels(tekst, patroon)
        if r:
            print(f"{pad}: nazien {naam}, regel {', '.join(map(str, r[:10]))}")
    if pad.endswith(".css"):
        for naam, patroon in [("touch-action: manipulation", r"touch-action\s*:\s*manipulation"), ("prefers-reduced-motion", r"prefers-reduced-motion"), (":focus-visible", r":focus-visible"), ("tikkleur", r"-webkit-tap-highlight-color")]:
            if not re.search(patroon, tekst):
                fouten += 1; print(f"{pad}: FOUT ontbreekt: {naam}")
print("Geen fouten gevonden." if not fouten else f"{fouten} fout(en).")
sys.exit(1 if fouten else 0)
