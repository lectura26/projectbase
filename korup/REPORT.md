# KORUP – 3D-samlevejledning (motor v2)

Produkt: JYSK KORUP kommode med 3 skuffer (art.nr. 3670645), manual "03.03.2026 – Rev.1", 23 sider.

## Hvad der er bygget

En ny, generel motor, der bruges til KORUP. SERUP (v1) ligger uændret i roden af repoet.

| Fil | Indhold |
|---|---|
| `engine/hardware.js` | 3D-modeller af alle beslag og alt værktøj. Hvert beslag har sit eget design. |
| `engine/player.js` | Tidslinje, animation, værktøjsbevægelser, huller i pladerne og automatisk kamera. Alt beregnes fra (trin, fremdrift), så man kan spole frit. |
| `korup/data/manual.json` | Dele, beslag og antal, værktøj, sikkerhedsnoter og alle 21 trin på dansk. Mål har kilde eller er markeret som estimeret. |
| `korup/model.js` | Geometrien og trinene for KORUP, bygget ud fra regler: plade mod plade, bolt i hul og møblet på gliderne. |
| `korup/index.html` | Viseren. |
| `room.js` | Herskabsrummet, nu med tæppestørrelse og plantens placering som indstillinger. |

### Hvert beslag har sit eget design

| Kode | Beslag | Detaljer i modellen |
|---|---|---|
| A | Excenterbolt | Højregevind, krave, hals, kuglehoved med krydskærv |
| B | Excenterlås | Åbning i siden, kombineret kryds- og ligekærv, pil der viser åbningen |
| C | Træpløk | Rillet bøg med affasede ender |
| D | Glider | Plastikhoved med søm |
| E | Vægbeslag | Bøjet stål med langhul og hul i fligen |
| F | Skrue | Linsehoved |
| G | Euroskrue | Messingfarvet, grovt gevind, uden spids |
| J | Skrue | Undersænket, 35 mm med spids |
| L | Grebsskrue | Maskinskrue med fint gevind |
| M | Skrue | Lille undersænket skrue |
| H | Bagpladeholder | Hvid trekantkile med hul |
| K | Greb | Hvidt greb |
| N | Klods | Sort klods med to undersænkede huller |
| CL/CR | Skinner i korpus | Hjul fortil |
| DL/DR | Skinner på skuffer | Hjul bagtil |
| – | Rawplug og vægskrue | Medfølger ikke |

### Værktøj
- Stjerneskruetrækker med blåt greb og "+" på enden.
- Ligekærvet skruetrækker med rødt greb og "−" på enden.
- Hammer, målebånd med båndet trukket ud, blyant og boremaskine med roterende bor.

### Animationer
- **Skruer og bolte:** De drejer med uret set fra hovedet (højregang) og går ind med deres egen stigning. Skruetrækkeren drejer med, og en blå pil plus mærket "Drej med uret" viser retningen.
- **Excenterlåse:** De sættes i med åbningen mod bolten og drejes med uret med den ligekærvede skruetrækker.
- **Pløkke og glidere:** Hammeren slår tre slag, og pløkken eller glideren går et stykke ind ved hvert slag.
- **Målebånd:** Viser 20 mm i trin 3 og diagonalerne XX = YY = 888 mm i trin 11.
- **Vægbeslag (trin 12):** Blyanten afmærker, boremaskinen borer, hammeren slår rawplug i, vægskruen skrues i, og skruerne F spændes fra 80 % til 100 %. Korpus bliver gennemsigtigt, så man kan se arbejdet bag det.
- **Plader:** De løftes og bæres i en bue hen til stedet. Korpus rejses op uden at slippe gulvet, og skufferne vendes og skubbes ind.

### Kamera
Kameraet følger selv med. Ved små beslag zoomer det ind på beslaget og værktøjet, og ved store bevægelser zoomer det ud.

Når man selv drejer kameraet, slår den automatiske styring fra. Knappen med sigtekornet slår den til igen.

### Brugerflade
- **Trin 0 "Dele og værktøj":** Viser alle plader på tæppet med numre. Panelet "Dele og beslag" viser 3D-miniaturer af værktøj, beslag og plader med antal og mål, som manualens s. 9 og 11.
- **"Du skal bruge" i hvert trin:** Under titlen står beslagene med antal og værktøjet til trinnet, som i manualens kasse øverst på hver side.
- **Mærkater i scenen:** Pladenumre og beslagsbogstaver er sat direkte på delene.
- **Navigation:** Afspil, pause og spoling. Næste trin startes manuelt, og en lille trinvælger viser alle 21 trin med overskrift.
- **Kontrolpanel:** Viser reglerne målt i modellen.

## Kontrol

Kontrolscriptet gennemløber alle trin og tager skærmbilleder i `korup/screenshots/`. Det tjekker:
- **Dimensioner:** bredde 600 og højde 698 (≈ 700 med glidere).
- **Skuffekassen:** 551 + 2 × 12,5 mm skinner = 576 indvendig bredde.
- **Skuffefronterne:** De når ikke over toppen.
- **Midterliste 4:** Den rammer ikke skuffekasserne.
- **Overlap:** Ingen plader overlapper, undtagen hvor en plade sidder i en rille. Skufferne rammer ikke korpus i det færdige møbel.
- **Gulvet:** Ingen plade er under gulvet i noget trin.
- **Antal beslag:** Antallet af hver type stemmer med manualen. Den eneste afvigelse er G (se nedenfor).

## Uoverensstemmelse i manualen

- **G (euroskrue):** Delelisten på s. 9 siger 8 stk., men trin 2 på s. 12 bruger 12 (2 pr. skinne × 6 skinner). Guiden følger trin 2 og viser forskellen med gult i deleoversigten og i kontrolpanelet.

## Estimeret eller tolket

Alle punkter står også i `manual.json` og `model.js`.

**Listernes placering:**
- **Bundliste 5 og 12:** Liggende i bunden, med underkant 15 mm over gulvet. Det er højden på klods N, som står på gulvet midt under listen. Den sorte klods ses i bunden på produktbillede 1.
- **Midterliste 4:** Liggende fortil mellem den midterste og den øverste skuffekasse (462–474 mm). Placeringen er aflæst af trin 8 og 10.

**Skufferne:**
- **Højden på fronterne:** 11, 240 og 469 mm (226 mm fronter med 3 mm mellemrum). Det er udledt af 695/700, ikke aflæst direkte.
- **Skuffekassens placering:** Kassen sidder 45 mm over frontens underkant, aflæst af tegningen på s. 22.
- **Skinnerne:** Der er regnet med 12,5 mm pr. side, hvilket passer præcist med bagstykket på 527 mm.

**Bagpladen og beslagene:**
- **Bagplade 6:** Sidder i riller 8 mm fra bagkanten og går 3 mm op i toppens rille. Linjen på midten er tolket som en foldning.
- **Holderne H:** Placeringen er en tolkning. 2 sidder i toppen, 2 på hver side og 2 i bunden, hvor skruen går gennem bagpladen ind i bundlisten 12.
- **Vægbeslaget E:** Sidder under toppen, bagtil på midten. Fligen går ned bag bagpladen, og pladen går gennem hakket i bagpladen.
- **Huller i pladerne:** De er placeret ud fra, hvor beslagene sidder (regel), ikke aflæst af hulmønsteret på tegningerne.

**Bevægelser, som manualen ikke tegner:**
- At korpus rejses op mellem trin 7 og 8.
- At skuffen vendes i trin 18. Tegningen viser skruerne blive skruet ind oppefra.
- At kommoden trækkes ud fra væggen, mens der bores.

**Kommoden ved væggen:**
- Den står mod rummets højre væg, 33 mm fra væggen, så den går fri af fodpanelet. Vægskruen er derfor sat til 75 mm.
- Vælg selv skrue og rawplug efter væggen. De medfølger ikke.

## Kendte begrænsninger
- **Tidsplan:** Beslag af samme slags sættes i et ad gangen med værktøj. Skufferne laves samtidigt i tre spor, så alle tre animeres, men værktøjet vises kun på skuffe 1.
- **Rawplug og vægskrue:** De er generiske modeller, fordi de ikke medfølger.
- **Overlapskontrol:** Den bruger kasser omkring pladerne og er ikke en fuld kollisionstest. Huller i pladerne vises som mørke cirkler, ikke som rigtige boringer.

## Sådan starter du den

```bash
cd serup-guide
python3 -m http.server 8000
# åbn http://localhost:8000/korup/
```
