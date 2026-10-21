---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Surface: SERUP samleguide (pop-up)

Scope: index.html, the assembly-guide pop-up opened from a JYSK product page's manual link. Mode: Operate. Mobile first, also desktop.
Audience/job: a buyer mid-assembly, phone in one hand, follows one step at a time and identifies parts.
Constraints: 3D room stays and leads; UI never covers the furniture; Danish copy unchanged in substance; no JYSK logo/font invented.
Unresolved: how the host product page embeds and closes the pop-up (postMessage contract proposed).

## Direction contract
THESIS: The parts are named where they stand. Manual-style circled numbers float in the 3D scene with a hairline to each part, so the parts list lives on the furniture instead of in a side panel. Refuses the category default of a floating card holding text, buttons and a list over the scene.
OWN-WORLD: White ground bars, deep navy (#1b3d84) for actions, current step and callout rings; ink #1a2233; cool mist #f1f3f7 second layer; amber only for "usikker" notes. Figtree, one family, 1.2 scale. Thin 1.5px line icons. Callouts: white pill, navy ring numeral, hairline leader to a dot on the part.
STORY: The visitor sees which step they are on, what to do in one sentence, and which numbered part moves; they play, scrub, rotate, then tap forward.
FIRST VIEWPORT: Top bar full width: 5-segment step rail, "Trin 1 af 5" + title, two-line instruction, close at right. Scene fills the rest. Prev/next round buttons mid-height at the left/right edges. Bottom dock centred: play/pause, scrubber, ruler (mål) and checklist (kontrol) buttons. Callouts sit in the scene on the step's parts.
FORM: "Mærker i scenen", position 6 of my ordered list, dealt index 6, chosen by the user. seed:7e702e10c3ae7ba4
Signature interaction: callouts track their parts every frame while the animation plays and the camera orbits; parts outside the step dim to a small grey numeral.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
