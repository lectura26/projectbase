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
| `room.js` | Herskabsrummet. Tæppe, gulvets lyshed og plantens placering kan indstilles; KORUP kører uden tæppe og med lysere gulv for kontrast. |

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
- **Trin 0 "Dele og værktøj":** Viser alle plader på gulvet med numre. Panelet "Dele og beslag" viser 3D-miniaturer af værktøj, beslag og plader med antal og mål, som manualens s. 9 og 11.
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
- **Bundliste 5 og 12:** 12 sidder fortil og 5 bagtil, som tegnet på s. 14 (trin 6). Begge ligger i bunden, med underkant 15 mm over gulvet. Det er højden på klods N, som står på gulvet midt under listen. Den sorte klods ses i bunden på produktbillede 1.
- **Midterliste 4:** Liggende fortil mellem den midterste og den øverste skuffekasse (462–474 mm). Placeringen er aflæst af trin 8 og 10.

**Skufferne:**
- **Højden på fronterne:** 11, 240 og 469 mm (226 mm fronter med 3 mm mellemrum). Det er udledt af 695/700, ikke aflæst direkte.
- **Skuffekassens placering:** Kassen sidder 45 mm over frontens underkant, aflæst af tegningen på s. 22.
- **Skinnerne:** Der er regnet med 12,5 mm pr. side, hvilket passer præcist med bagstykket på 527 mm.

**Bagpladen og beslagene:**
- **Bagplade 6:** Sidder i riller 8 mm fra bagkanten og går 3 mm op i toppens rille. Linjen på midten er tolket som en foldning.
- **Holderne H:** Placeringen er en tolkning. 2 sidder i toppen, 2 på hver side og 2 i bunden, hvor skruen går gennem bagpladen ind i bundlisten 5 (den bageste).
- **Vægbeslaget E:** Sidder under toppen, bagtil på midten. Fligen går ned bag bagpladen, og pladen går gennem hakket i bagpladen.
- **Huller i pladerne:** De er placeret ud fra, hvor beslagene sidder (regel), ikke aflæst af hulmønsteret på tegningerne.

**Bevægelser, som manualen ikke tegner:**
- At korpus rejses op mellem trin 7 og 8.
- At skuffen vendes i trin 18. Tegningen viser skruerne blive skruet ind oppefra. Den vendte skuffe er tippet lidt bagover, så den hviler på både frontkant og kasse.
- At kommoden trækkes ud fra væggen, mens der bores.

**Kommoden ved væggen:**
- Den står mod rummets højre væg, 33 mm fra væggen, så den går fri af fodpanelet. Vægskruen er derfor sat til 75 mm.
- Vælg selv skrue og rawplug efter væggen. De medfølger ikke.

## Kendte begrænsninger
- **Tidsplan:** Beslag af samme slags sættes i et ad gangen med værktøj. Skufferne laves samtidigt i tre spor, så alle tre animeres, men værktøjet vises kun på skuffe 1.
- **Rawplug og vægskrue:** De er generiske modeller, fordi de ikke medfølger.
- **Overlapskontrol:** Den bruger kasser omkring pladerne og er ikke en fuld kollisionstest. Huller i pladerne vises som mørke cirkler, ikke som rigtige boringer.


## Verifikationsloop

Fire subagenter i `.claude/agents/` kontrollerer guiden. Hovedagenten samler deres rapporter, retter fejlene og kører alle fire igen. Der er kørt 5 runder, og det er maksimum. Ingen agent må rette i filerne; de rapporterer kun.

| Agent | Værktøj | Hvad den gør |
|---|---|---|
| `collision-checker` | `node tools/check-collisions.mjs --fps 8` | Går hvert trin igennem billede for billede, 8 pr. sekund (2854 billeder). Tester alle dele og beslag i bevægelse mod faste dele, delene imellem og gulvet med orienterede kasser (OBB-test). Tilladte kontakter står i `manual.json → allowedContacts`: plade i rille, beslag i sit hul, H/M på korpus. |
| `flicker-checker` | `node tools/check-flicker.mjs` | Finder flader i samme plan, der overlapper geometrisk. Derudover tages 86 billeder fra et fast kamera, som flyttes 0,5 mm og sammenlignes pixel for pixel. Flimmer findes som felter med mange skiftende pixels. |
| `hole-checker` | `node tools/check-holes.mjs` | Hullerne findes som data via `guide.holes()`. Antal, flade, kantafstand og c/c tjekkes pr. plade og trin mod `manual.json → holeSpec`. Den tjekker også, at intet hul svæver eller ligger uden for pladen, og at alle beslag har et hul. |
| `visual-reviewer` | `node tools/shots-review.mjs --steps a-b` | Tager skærmbilleder ved start, midt og slut af hvert trin fra en fast vinkel og sammenligner dem med manualsiden. Den kigger efter forkerte dele, forkert retning, svævende dele og forkert antal. Den køres i tre dele: 0–7, 8–14 og 15–21. |

Manualsiderne til visual-reviewer ligger i `korup/review/manual.pdf`, som ikke er i git. Læg PDF'en dér, før du kører den.

### Resultat pr. runde

| Runde | Kollisioner (+ under gulv) | Flimmer | Hulfejl | Visuelle fund rettet |
|---|---|---|---|---|
| 1 | 184 (+12) | 17/86 | 0 efter regelretning | Huller svævede. J sad på den forkerte side. Pladernes bevægelsesbaner var forkerte i trin 6, 8, 15, 16 og 20. Skinnernes hjul gik ned i gulvet. B sad på den forkerte flade. |
| 2 | 2 (+3) | 14/86 | 0 | Kantlinjer flimrede. B sad på den forkerte flade på liste 4. Skufferne var gennemsigtige i trin 20–21. Mærkater overlappede. Hammeren vendte forkert. Vægskruen ramte hakket i bagpladen. |
| 3 | 0 (+0) | 1/86 | 0 | Bagpladen flimrede mod gulvet. H-clips i bunden hang i luften. Målelinjerne forsvandt. Hammeren svingede den forkerte vej. Løse fronter i trin 7 var ikke gennemsigtige. |
| 4 | 0 (+0) | 0/86 | 0 | Liste 5 og 12 var byttet om (s. 14). Trin 10 fik kamera forfra, så låsene B kan ses. XX- og YY-mærkaterne er skilt ad. Den vendte skuffe hang i luften (trin 18). Den oprejste skuffe svævede 2 mm (trin 19). |
| 5 | **0 (+0)** | **0/86** | **0** (72 regler ok) | Ingen sikre fejl. Kun usikre fund, se nedenfor. |

## Uløst eller usikkert – tjek selv

Ingen checker fandt sikre fejl i sidste runde. Punkterne herunder er dem, jeg ikke kunne afgøre ud fra manualen, eller som checkerne ikke kan se.

**Bør tjekkes mod det fysiske møbel:**
1. **Midterliste 4's dybde (trin 1, 6):** Guiden har den fortil. Visual-reviewer mente i runde 4, at tegningen på s. 12 og 14 viser den nærmere midten af dybden. Min egen aflæsning af s. 14 peger mere mod fronten. Placeringen af bolt A til liste 4 følger med, så tjek hullerne i side 2 og 3.
2. **Bundliste 5/12:** Rettet i runde 4, så 12 sidder fortil og 5 bagtil, efter s. 14. Det strider mod den første tolkning ud fra produktbillede 1. Listerne er ens, så det handler kun om nummeret på delen.
3. **G (euroskrue):** Delelisten siger 8, men trin 2 bruger 12. Guiden viser 12.
4. **Mål manualen ikke angiver:**
   - L c/c 96 mm, ud fra et greb K på 103 mm (trin 19);
   - kantafstanden for B i skuffesider 24 mm (trin 15);
   - højden på midterliste 4 (462 mm);
   - fronternes højde;
   - holdernes H placering.
   Tjek huller og mål på de rigtige plader.

**Tolkninger af bevægelser (manualen tegner dem ikke):**
5. At korpus rejses mellem trin 7 og 8.
6. At skuffen vendes i trin 18.
7. At kommoden trækkes ud fra væggen under boringen i trin 12.
8. Rækkefølgen af skufferne i trin 20. Guiden sætter dem i oppefra, men manualen viser den øverste sat i til sidst.

**Synlighed (modellen er rigtig, men det ses dårligt):**
9. **Trin 0:** Panelet "Dele og beslag" dækker en del af oversigten, så 9, 10 og 11 er svære at tælle.
10. **Trin 3, 4 og 7:** Glidere D, pløkke C i toppen og nogle B ses dårligt fra den faste vinkel. Under afspilning zoomer kameraet ind på dem.
11. **Trin 14:** Pløkkene C i skuffesidernes forende er små ved fuld visning.
12. **Trin 18:** Fra afstand kan man ikke se, hvilken ende af DL/DR hjulet sidder i.
13. **Trin 21:** Mærket "Maks. 5 kg pr. skuffe" sidder ved skuffens højre kant, ikke inde i skuffen.
14. **Trin 18:** Mærkaterne for de bageste skuffer kan overlappe ved bundpanelet, når de er halvgennemsigtige.
15. **Statuslinjen:** På skærmbilleder taget lige ved et trinskift kan segmentet for forrige trin stadig være markeret. Det er sandsynligvis overgangen og ikke en fejl.
16. **Trin 19:** Den oprejste skuffe hviler på skinnernes hjul. Frontkanten er ca. 1,5 mm over gulvet, med vilje, så hjulene ikke går ned i gulvet, mens skuffen drejes.

**Checkernes begrænsninger:**
- **Kollisioner:**
  - Plader er kasser. Hakket i bagpladen er tre kasser, og beslag er en kasse pr. delmodel.
  - Huller er ikke rigtige boringer, så et beslag "i sit hul" er en tilladt kontakt.
  - Beslag mod beslag og mod rummets vægge testes ikke.
  - 8 billeder pr. sekund kan overse meget korte gennemskæringer.
- **Flimmer:** Testes fra to kameravinkler (forfra og bagfra) ved udvalgte tidspunkter, ikke fra alle vinkler.
- **Huller:** Reglerne i `holeSpec` er skrevet ud fra tegningerne. Hvis en regel er forkert, er testen det også.
- **Visuelt:** Agenten sammenligner skærmbilleder med stregtegninger. Den kan overse ting og tage fejl, og den angiver selv sin sikkerhed.

## Sådan starter du den

```bash
cd serup-guide
python3 -m http.server 8000
# åbn http://localhost:8000/korup/
```
