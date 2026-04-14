# Design System Strategy: The Nordic Architect

## 1. Overview & Creative North Star
**Creative North Star: "The Silent Authority"**

This design system is built on the principles of Danish Functionalism: clarity, restraint, and intentionality. It moves beyond the cluttered "SaaS-template" look to emulate the atmosphere of a premium Nordic financial institution. We treat project management not as a chaotic task list, but as a disciplined architectural endeavor.

To achieve this, the system rejects traditional UI "crutches" like heavy drop shadows and high-contrast dividers. Instead, we utilize **Tonal Architecture**—defining space through subtle shifts in surface values and expansive, rhythmic white space. The goal is a layout that feels curated and editorial, where the interface recedes to let the user’s work take center stage.

---

## 2. Colors & Surface Logic
Our palette is rooted in deep naval tones and glacial neutrals, providing a high-contrast environment that feels both stable and breathable.

### The Palette (Material Design Convention)
*   **Primary (`#1a3167`):** The foundation. Used for core navigation and primary actions to signify authority.
*   **Secondary/Accent (`#cce8f4`):** The "Light Sky." Use this for highlighting active states or secondary data points.
*   **Surface / Background (`#f8f9fa`):** The canvas. A cool, off-white that reduces eye strain compared to pure `#ffffff`.
*   **On-Surface (`#0f1923`):** High-ink black for maximum legibility in typography.

### The "No-Line" Rule
Traditional "boxes-inside-boxes" create visual noise. This design system prohibits 1px solid borders for sectioning large areas of the layout. 
*   **Implementation:** Define logical zones by shifting from `surface` to `surface-container-low`. 
*   **Boundary via Contrast:** Use a change in background color to signify a new functional area (e.g., a sidebar in `surface-container-high` against a main stage in `surface`).

### Surface Hierarchy & Nesting
Treat the UI as physical layers of high-grade paper.
1.  **Level 0 (Base):** `surface` (#f8f9fa) — The main application background.
2.  **Level 1 (Sections):** `surface-container-low` (#f3f4f5) — Inset areas or grouping containers.
3.  **Level 2 (Active Elements):** `surface-container-lowest` (#ffffff) — Cards and interactive modules.

---

## 3. Typography
We utilize **Inter** to lean into a precision-engineered aesthetic. The hierarchy is designed to feel like a financial report: clear, mathematical, and authoritative.

*   **Display (Editorial Moments):** Use `display-md` (2.75rem) with tight letter-spacing (-0.02em) for dashboard welcomes or empty-state headers.
*   **Headlines (Structural Markers):** `headline-sm` (1.5rem) should be used for main module titles. 
*   **Body (The Workhorse):** `body-md` (0.875rem) is the default for all project data. It provides a high information density without sacrificing readability.
*   **Labels (The Metadata):** `label-md` (0.75rem) in `text-secondary` (#6b7280) should be all-caps with +0.05em tracking when used for table headers or category tags.

---

## 4. Elevation & Depth
In a "flat" Nordic system, depth is a whisper, not a shout.

*   **The Layering Principle:** Avoid shadows for static elements. Place a `surface-container-lowest` (#ffffff) card on a `surface` background to create a "Natural Lift."
*   **Ambient Shadows (Floating Only):** Shadows are reserved for temporary overlays (modals, dropdowns). Use a 12% opacity of the `on-surface` color with a 24px blur and 8px Y-offset. This mimics soft, overhead gallery lighting.
*   **The Glass Fallback:** For floating navigation or top bars, use `surface` with 80% opacity and a `backdrop-blur: 12px`. This prevents the UI from feeling "pasted on" and maintains the sense of a cohesive environment.
*   **The Ghost Border:** For accessibility in forms, use `outline-variant` (#c5c6d1) at 20% opacity. It defines the hit area without cluttering the visual field.

---

## 5. Components

### Buttons
*   **Primary:** Solid `primary` (#1a3167) with `on-primary` (#ffffff) text. 12px radius. No gradient. No shadow.
*   **Secondary (Ghost):** No background. `primary` text. Use a 1px `outline-variant` (#c5c6d1) at 30% opacity that transitions to 100% on hover.
*   **Tertiary:** `secondary-container` (#cbe7f3) background with `on-secondary-container` (#4e6873) text for low-priority actions.

### Cards & Lists
*   **The Divider-Free Rule:** Prohibit horizontal lines between list items. Use 16px of vertical whitespace or a 4px `surface-container` hover state to separate rows.
*   **Construction:** White background, 1px `#e8e8e8` border, 12px radius. 

### Input Fields
*   **State Logic:** Inputs should be `surface-container-lowest` (#ffffff) with an `outline` that is invisible until interaction. On focus, use a 2px solid `primary` (#1a3167) border. This "active-only" border strategy reduces visual clutter in complex forms.

### Custom Component: The Progress Micro-Bar
*   For project tracking, use a 4px tall track in `accent` (#cce8f4) with the progress fill in `primary` (#1a3167). The extreme thinness adds to the "Financial precision" look.

---

## 6. Do's and Don'ts

### Do
*   **Use Asymmetric Padding:** Allow for larger margins on the left (e.g., 64px) than the right (48px) to create an editorial, "un-templated" feel.
*   **Embrace the Grid:** Align every element to an 8px baseline. Precision is the soul of Nordic design.
*   **Color as Meaning:** Use the Sky Blue accent (#cce8f4) sparingly—only for things that are "New" or "Active."

### Don't
*   **Don't use Rounded Buttons:** Keep radius between 8px-12px. Never use "pill" shapes; they feel too "consumer-tech" and lack the architectural rigor of this system.
*   **Don't use Pure Grey Shadows:** Always tint your shadows with the Primary Navy to keep the "temperature" of the design consistent.
*   **Don't use Icons for Everything:** Favor clear, text-based labels in `label-md` for navigation. Icons should be reserved for high-frequency actions only (Edit, Delete, Add).