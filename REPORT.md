# SERUP – interaktiv 3D-samlevejledning

Produkt: JYSK SERUP bakkebord (art.nr. 3630146 / 93246001), manual "21.07.2025 – Rev.1", 11 sider.

## Hvad der er bygget

| Fil | Indhold |
|---|---|
| `index.html` | 3D-viseren (three.js r160). Al model- og animationskode ligger her. |
| `data/manual.json` | Dele, mål (med kilde eller "estimeret" + begrundelse), farver, sikkerhedsnoter og alle trin på dansk. Viseren bygger modellen ud fra tallene i denne fil. |
| `lib/` | three.js og OrbitControls, lagt lokalt, så siden virker uden internet. |
| `screenshots/` | Skærmbilleder af hvert trin fra den automatiske kontrol. |
| `verify.mjs` | Playwright-script, der gennemløber alle trin, kører målkontrollerne og tager skærmbillederne. |

**Manualen indeholder kun 2 dele og 3 trin.** Bakken (1) og stellet (2) leveres samlet. Der er ingen løse skruer eller beslag. Guiden har 5 visninger:

0. Pakkens indhold + sikkerhedsnoter (s. 3–9)
1. Trin 1: Rejs stellet, og fold det ud (s. 10)
2. Trin 2 (I): Løft bakken over stellet (s. 10)
3. Trin 2 (II): Sænk bakken ned på stellet (s. 10)
4. Trin 3: Færdig, maks. 10 kg, med mållinjer, der kan slås til (s. 11)

**Viseren har:**
- gulv, tæppe, lys og skygger
- et kamera, du kan dreje og zoome med musen
- knapperne Forrige/Næste og Afspil/Pause, en tidslinje og "Fortsæt" (afspiller automatisk næste trin)
- piletasterne og mellemrumstasten til at styre trinene
- trinnummer, henvisning til manualens side, dansk tekst og en note, når et trin er usikkert
- en liste over dele og antal i det aktuelle trin
- svagt orange fremhævning af de dele, der indgår i trinnet
- panelet "Kontrol af model (mm)" øverst til højre, der viser målkontrollerne live

**Modellen (1 enhed = 1 mm) bygges efter regler, ikke faste koordinater:**
- Benenes afrundede top rører bakkens underside (520 mm).
- Benenes laveste punkt rører gulvet, også mens stellet foldes ud.
- Drejebolten sidder i skæringspunktet mellem benene.
- Bakkens underside lægges på stellets højeste punkt og centreres over stellet.
- I sammenfoldet stand placeres delene, så deres laveste punkt ligger på gulvet.

## Kontrol (kørt automatisk, alle bestået)

Alle trin er kontrolleret ved start, midtvejs og slut: **0 fejl og 0 JavaScript-fejl**. Skærmbillederne er også gennemset visuelt og sammenlignet med manualens tegninger:
- side- og frontvisning af det færdige bord (s. 2)
- stellet sammenfoldet (s. 9) og udfoldet (s. 10)

| Kontrol | Model | Manual |
|---|---|---|
| Total højde | 580,0 | 580 |
| Bakke | 520,0 × 400,0 × 60 | 520 × 400 × 60 |
| Bakkens underside / stellets top | 520,0 / 520,0 | 520 |
| Stelbredde, træ | 486,0 | 486 |
| Afstand mellem indre ben | 404 | 404 |
| Fodspor, side | 370,6 | 375 (afviger 4,4 mm, se nedenfor) |
| Drejebolt-højde | 265,0 | ca. 266 (aflæst) |
| Fødder på gulv i alle trin | 0,0 | – |
| Luft mellem ydre og indre ben | 1,0 | tynd streg på tegningen |
| Mindste luft mellem tværstang og modsat ramme | 5,4 (sammenfoldet) | – |

Bakke og stel overlapper ikke i nogen trin, og intet svæver. I trin 2 (I) og i starten af 2 (II) svæver bakken med vilje, fordi den bæres.

## Estimerede eller usikre mål

Alle står også i `data/manual.json` med begrundelse.

- **Benenes bredde (30 mm):** Skønnet ud fra sidevisningen, hvor benene ses skråt (ca. 28–36 mm).
- **Benenes tykkelse (20 mm):** Beregnet som (486 − 404) / 2 minus 1 mm luft. Passer med opmåling af tegningen.
- **Tværstængernes diameter (20 mm):** Aflæst af tegningen (17–20 mm).
- **Hullernes placering:** Afstanden mellem hullerne (327 mm) og det nederste huls højde (25 mm) er aflæst af sidevisningen s. 2 i 250 dpi. Usikkerheden er ca. ±3 mm.
- **Benenes længde (623 mm):** Følger af reglerne ovenfor. Pakkemålet 639 mm tyder på, at de rigtige ben er ca. 10–15 mm længere. Jeg har ikke ændret det, fordi det ville bryde enten højden (520) eller fodsporet.
- **Fodspor (370,6 i stedet for 375 mm):** Skyldes de samme skøn over benbredde og længde.
- **Sammenfoldet tykkelse (61,7 i stedet for 55 mm):** Foldevinklen (3°) er valgt som den mindste vinkel, hvor tværstængerne ikke rammer den modsatte ramme. Med 30 mm brede ben kan modellen ikke blive 55 mm. Enten er benene smallere, eller beslaget er udformet anderledes, end manualen viser.
- **Bakken:**
  - Vægtykkelse 12 mm, aflæst af topvisningen med ±4 mm.
  - Bundpladens tykkelse (9 mm) er et skøn.
  - Bundpladens placering (i flugt med underkanten) er et skøn.
- **Drejebolt og strop:** Diameter, hoveder og strop er skønnet ud fra produktbillederne.
  - Stroppen er modelleret som et bånd, der hænger i en simpel bue, når stellet er foldet. Det er ikke en fysisk simulering.
- **Farver:** Aflæst af produktbillederne.
  - Lyst træ: `#dcc6a2`
  - Bakkebund: mørk mauve/brun `#5f5153`. Bunden ser forskellig ud på de to billeder, så der er valgt en mellemtone.
  - Træets åretegning er genereret og er ikke en rigtig tekstur.

## Trin, der er usikre eller ikke kunne gøres helt korrekt

1. **Trin 2, delbillede I og II:** De to delbilleder på s. 10 ser ens ud, også forstørret. Jeg har tolket dem som "placér over" og "sænk ned". De kan også betyde, at bakken kan vende begge veje (den er symmetrisk). Det fremgår af noten i viseren.
2. **Hvordan bakken holdes fast:** Manualen viser ikke bakkens underside, og der er ingen beslag. Modellen lader bakken hvile løst på benenes fire afrundede toppe. Den rigtige bakke har måske noter eller klodser, der griber om tværstængerne. Det kan ikke ses i materialet.
3. **Trin 1:** Manualen viser kun stellet før og efter. Bevægelsen, hvor stellet rejses fra liggende til stående og så foldes ud, er min fortolkning. Selve udfoldningen om drejebolten er geometrisk korrekt. Fødderne bliver på gulvet hele vejen.
4. **Kontrol for overlap:** Den automatiske kontrol for overlap er analytisk. Den måler tværstænger mod det modsatte bens centerlinje og bakke mod stel, og den er ikke en fuld mesh-kollisionstest. At tværstængerne går gennem deres egne ben, er tilsigtet, fordi de sidder i huller.

## Sådan starter du siden

Siden henter `data/manual.json`. Browsere tillader ikke det fra en `file://`-adresse, så siden skal køre på en lille lokal server:

```bash
cd serup-guide
python3 -m http.server 8000
# åbn http://localhost:8000
```

Du kan også bruge `npx http-server -p 8000`. Der er ingen konto, nøgle eller internetafhængighed, fordi three.js ligger i `lib/`.

Sådan kører du kontrollen igen. Det kræver Node og Playwright, og serveren skal køre på port 8000:

```bash
node verify.mjs screenshots http://localhost:8000/
```
