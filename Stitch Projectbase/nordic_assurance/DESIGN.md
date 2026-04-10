```markdown
# Design System Strategy: S&P Projekter

## 1. Overview & Creative North Star: "The Architectural Ledger"
The creative direction for the design system is defined as **The Architectural Ledger**. 

Moving away from the cluttered density of traditional project management tools, this system adopts a high-end Scandinavian editorial aesthetic. It treats digital space like a physical architectural plan: precise, structured, and expansive. We avoid the "template" look by utilizing intentional asymmetry—placing heavy, authoritative navy headings against vast, breathable sky-blue canvases. The goal is to convey "Financial Serenity"—a sense that complex Danish infrastructure projects are being handled with quiet, expert precision.

---

## 2. Colors: Tonal Depth over Structural Lines
The color palette is built on a foundation of "Atmospheric Blues" and "Industrial Navy," punctuated by a "Civic Gold" accent.

### The "No-Line" Rule
To achieve a premium, custom feel, designers are prohibited from using standard 1px solid borders for sectioning. Structural definition must be achieved through **Background Color Shifts** or **Tonal Transitions**. 

*   **Surface Hierarchy:** 
    *   **Background (`#fff8f6` / `secondary_container #cce8f4`):** The base canvas.
    *   **Surface-Container-Low:** Used for secondary grouping within a page.
    *   **Surface-Container-Lowest (`#ffffff`):** Reserved for primary interactive cards and data inputs.
*   **The Glass & Gradient Rule:** While the brand is "flat," use subtle transitions from `primary` (#1a3167) to `primary_container` within high-impact CTAs to provide a "die-cast" metal feel. For floating overlays or hover-state menus, utilize **Glassmorphism**: semi-transparent surfaces with a 12px-20px backdrop blur to allow the background sky-blue to bleed through.

---

## 3. Typography: The Authoritative Voice
Our typography pairing emphasizes the "Editorial" nature of the system. We use **Manrope** for high-impact display and **Inter** for functional data.

*   **Display & Headlines (Manrope):** Set in heavy weights (Bold/ExtraBold). These should be `on_primary_fixed` (Dark Navy). Use `display-lg` for dashboard summaries to create an "At-a-Glance" authority.
*   **Body & Labels (Inter):** Functional and legible. Body text should use `on_surface_variant` at 85% opacity to soften the digital glare, creating a sophisticated "printed ink" effect.
*   **The Hierarchy Goal:** Create high contrast between a massive headline and a tiny, precise label. This "Scale Tension" is the hallmark of premium design.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are replaced by a philosophy of **Physical Stacking**.

*   **The Layering Principle:** Depth is achieved by nesting. Place a `surface_container_lowest` (Pure White) card inside a `secondary_container` (Sky Blue) wrapper. The contrast in value provides all the "lift" required.
*   **Ambient Shadows:** If a component must float (e.g., a modal), use a shadow with a 32px blur, 4% opacity, tinted with the `primary` navy color. Avoid "dirty" grey shadows.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use the `outline_variant` token at **15% opacity**. A 100% opaque border is considered a design failure in this system; it "cages" the content.

---

## 5. Components
Each component must feel "Custom-Built," not "Library-Pulled."

*   **Primary Buttons:** Solid `primary` (Dark Navy) with `on_primary` (White) text. Use a fixed `md` (6px) corner radius. On hover, the button should not grow; it should transition to `primary_container` for a subtle "press" effect.
*   **Cards:** Pure white (`surface_container_lowest`). Radius: `lg` (8px). No borders. Content is separated by 32px/48px of white space rather than lines.
*   **Navigation Sidebar:** A monolith of `primary` navy. Active states use `tertiary_fixed_dim` (Muted Gold) as a vertical 4px "indicator stripe" on the left edge, with the icon also shifting to Gold.
*   **Inputs:** Use `surface_container_lowest` with a "Ghost Border" that transitions to a 2px `primary` bottom-only border upon focus. This mimics a signature line on a contract.
*   **Progress Indicators:** Use the "Muted Gold" (`tertiary_fixed_dim`) against a `secondary_fixed_dim` track. This highlights project momentum without visual "noise."

---

## 6. Do's and Don'ts

### Do:
*   **Do** use "Progressive Disclosure." Hide utility icons (Edit/Delete) until the user hovers over a row or card.
*   **Do** embrace white space. If a section feels empty, it is likely perfect.
*   **Do** use asymmetrical layouts. A sidebar that is slightly wider or a header that is offset creates a bespoke, non-bootstrap feel.

### Don't:
*   **Don't** use 1px solid high-contrast borders to separate list items. Use a 12px gap instead.
*   **Don't** use pure black (#000000). Use the Dark Navy (`primary`) for all "dark" elements to maintain the tonal blue harmony.
*   **Don't** use decorative icons. Every icon must serve a functional purpose; if it’s just for "flair," remove it.
*   **Don't** use generic drop shadows. If you need depth, use background color steps first.

---

## Director's Note
This design system is about the **Space between the data**. By removing the "grid lines" and focusing on tonal surfaces, we transform a project management tool into a high-end professional environment. Treat every screen like a page in a premium financial journal.```