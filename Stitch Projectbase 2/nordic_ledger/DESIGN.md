# Design System Strategy: The Architectural Precision Layer

## 1. Overview & Creative North Star
**Creative North Star: The Financial Architect**
This design system moves beyond "clean" into the realm of "architectural precision." Inspired by the functional minimalism of Scandinavian design and the high-density utility of professional tools like Linear, the system treats the UI as a structured workspace. We achieve a premium feel not through decoration, but through **intentional density, rhythmic spacing, and tonal depth.** 

By eschewing traditional borders in favor of surface-on-surface nesting, we create a digital environment that feels like a singular, cohesive piece of high-end stationery. The interface should feel as authoritative as a ledger and as refined as a bespoke timepiece.

---

## 2. Color & Surface Strategy
Our palette is anchored by the authoritative `primary` (#001b4f) and cushioned by a sophisticated range of cool-toned neutrals. 

*   **The "No-Line" Rule:** To achieve a modern, editorial aesthetic, we prohibit 1px solid borders for sectioning. Structural boundaries are defined by background color shifts. For example, a sidebar using `surface_container_lowest` (pure white) sits against a `surface` (#f8f9fa) background, creating a natural, soft-edge distinction.
*   **Surface Hierarchy & Nesting:** Depth is achieved through a "nested" physical logic. 
    *   **Level 0 (Base):** `surface` (#f8f9fa)
    *   **Level 1 (Sections):** `surface_container_low` (#f3f4f5)
    *   **Level 2 (Cards/Active Workspace):** `surface_container_lowest` (#ffffff)
*   **Signature Textures:** While we avoid loud gradients, we utilize "Optical Depth." CTAs use the `primary` token, but interaction states may utilize a 10% overlay of `on_primary_container` to create a sense of tactile pressing without breaking the Scandinavian flat aesthetic.
*   **Glassmorphism:** For floating elements like dropdown menus or command palettes, use `surface_container_lowest` at 85% opacity with a `20px` backdrop-blur. This ensures the underlying financial data remains visible but diffused, maintaining the user's context.

---

## 3. Typography: Editorial Authority
We utilize **Inter** for its neutral, technical clarity. The hierarchy is designed for rapid scanning of dense financial data.

*   **Display & Headlines:** Use `headline-sm` (1.5rem) for main dashboard views. Keep tracking tight (-0.01em) for an authoritative, "printed" feel.
*   **The Technical Label:** Our signature element. Labels are `label-sm` (11px), uppercase, with a 0.06em tracking. This provides an "engineering" aesthetic that balances the softer body text.
*   **Body & Metadata:** Primary data sits at `body-md` (14px). Metadata, such as timestamps or secondary notes, use `body-sm` (12px) with `on_surface_variant` (#44464f) to recede visually.
*   **Weight Constraint:** Never exceed a weight of 600. Use 500 (Medium) for emphasis within dense lists to prevent "visual noise" and maintain the Scandinavian lightness.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are largely replaced by the **Layering Principle**. 

*   **Tonal Stacking:** Instead of a shadow, place a `surface_container_lowest` card on a `surface_container_high` background. The 2% difference in luminosity creates a crisp, sophisticated edge that feels modern and intentional.
*   **Ambient Shadows:** Where floating is required (e.g., a dragged card), use a highly diffused shadow: `0 8px 24px rgba(15, 25, 35, 0.06)`. The shadow color is derived from `on_surface` to look like natural ambient light, never pure black.
*   **The Ghost Border:** If a divider is mandatory for accessibility in high-density tables, use a "Ghost Border": the `outline_variant` token at 15% opacity. It should be felt, not seen.

---

## 5. Components: Precision Built

*   **Buttons:** 6px radius (`md`). Primary buttons use `primary` with `on_primary` text. No pill shapes. Padding is tight (8px 16px) to maintain density.
*   **Input Fields:** 6px radius. Backgrounds should be `surface_container_lowest` with a 1px `outline_variant` border that transitions to `primary` (2px) on focus.
*   **Badges (Status & Priority):**
    *   **Status:** Use a subtle background fill. `COMPLETED` uses `16a34a` text on a `dcfce7` base. The badge should have no border and a 4px radius.
    *   **Priority:** Indicated by a 4px solid dot next to the label (Grey, Amber, Red) rather than a full background fill to reduce visual clutter.
*   **Cards:** 8px radius (`lg`). Forbid internal divider lines. Use `16px` of vertical whitespace to separate header from content.
*   **Data Grids:** Forgo horizontal rules. Use alternating row fills of `surface` and `surface_container_low` (zebra striping) only if the data exceeds 15 columns.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Density:** Financial professionals value seeing more data at once. Use `compact` spacing tokens (4px/8px increments).
*   **Align to the Grid:** Ensure every element, from icons to text baselines, aligns to a 4px hard grid.
*   **Use Subtle Transitions:** Hover states should be a gentle shift in background color (e.g., `surface` to `surface_container_high`).

### Don’t:
*   **No Pill Shapes:** All rounded elements must adhere to the 6px/8px rule. Rounded ends feel too "consumer" for this professional context.
*   **No Opaque Dividers:** Never use a 100% opaque #e8e8e8 line to separate content. Use whitespace or tonal shifts.
*   **No Pure Black:** Ensure all "dark" elements use `on_surface` (#191c1d) to maintain the cool, Scandinavian tonal range.