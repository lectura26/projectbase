# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Kunder hos JYSK, der har købt (eller overvejer) et møbel og skal samle det. De åbner guiden som en pop-up fra produktsidens link til samlevejledningen. Primært på mobil, ofte med telefonen i den ene hånd og møbeldelene foran sig på gulvet; også på pc/tablet.

## Product Purpose
Gør papirmanualen til en interaktiv 3D-gennemgang i rigtige mål: brugeren ser hvert trin animeret, hvilke dele der indgår, og kan dreje/zoome for at forstå retning og placering. Succes = brugeren samler møblet korrekt uden at tolke stregtegninger.

## Positioning
Trinene er bygget direkte fra producentens manual og målsat i mm, med ærlig markering af usikre/estimerede mål og tolkninger, i stedet for en generisk video eller pdf.

## Operating Context
- Vises som pop-up/modal over en produktside (JYSK-produktside), lukkes igen tilbage til produktsiden.
- Brugeren er midt i en fysisk opgave: korte blikke, store berøringsflader, læsbar tekst på afstand.
- Kilde: producentens samlevejledning (pdf) + produktbilleder. Første produkt: SERUP bakkebord (3630146).

## Capabilities and Constraints
- Statisk HTML + three.js, ingen konto, ingen backend. Data pr. manual i `data/manual.json`.
- 3D-scenen (herskabsrum med sildebensgulv, vindue, plante) er bevaret og er hovedpersonen; UI'et må ikke dække møblet.
- Navigation: trin frem/tilbage, afspil/pause, tidslinje, partsliste pr. trin, mål-visning, kontrol af model.
- Dansk sprog.
- Åbent: hvordan pop-up'en indlejres teknisk i produktsiden (iframe vs. komponent) er ikke besluttet.

## Brand Commitments
Skal føles JYSK-specifik (brugerens ønske). Der er ikke leveret officielle JYSK-brandassets (logo, font, farvekoder); de må ikke opfindes eller kopieres, og placeholder-brug markeres.

## Evidence on Hand
- Manual: JYSK SERUP, 21.07.2025 Rev.1, 11 sider (dele, mål, trin, advarsler).
- To produktbilleder (studie + stemningsbillede ved vindue).
- Ingen anmeldelser, kundeudtalelser eller statistik; må ikke fabrikeres.

## Product Principles
1. Scenen først: møblet skal altid være synligt; UI'et er en ramme om det.
2. Ét trin ad gangen, læsbart i et kort blik.
3. Ærlighed om usikkerhed: tolkninger og estimater vises, ikke skjules.
4. Tommelfinger-venligt: alle kernehandlinger kan nås med én hånd på mobil.

## Accessibility & Inclusion
Ingen produktspecifik standard fastlagt. Mindstekrav: tastaturbetjening (pile/mellemrum), synligt fokus, kontrast, respekt for reduceret bevægelse.
