# Design System Specification: Architectural Serenity

## 1. Overview & Creative North Star
**The Creative North Star: "The Silent Authority"**

This design system is built upon the philosophy of *Architectural Serenity*. It rejects the loud, dopamine-driven patterns of consumer software in favor of a workspace that feels like a quiet, high-end gallery. The goal is to provide a "Neutral Canvas" where the user's data—not the interface—is the protagonist. 

We achieve this through **Intentional Asymmetry** and **Tonal Depth**. By stripping away standard UI tropes (heavy borders, vibrant icons, and floating buttons), we force the hierarchy to rely on white space and precise typographic scaling. The result is a professional environment that feels "custom-built" and high-end through its restraint.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a spectrum of greys and off-whites, punctuated only by a singular, authoritative deep blue.

### Primary Tokens
- **Background (`surface`):** `#f8f9fa` — The base layer for the entire application.
- **Sidebar (`surface_container_lowest`):** `#ffffff` — A crisp white to provide subtle contrast against the background.
- **Primary (`on_primary_fixed`):** `#1a3167` — Reserved strictly for high-priority global actions. Use sparingly to maintain its "gravitas."

### The "No-Line" Rule
Standard 1px solid borders are strictly prohibited for sectioning content. To define boundaries, designers must use **Surface Hierarchy & Nesting**:
- **Level 1 (Base):** `surface` (`#f8f9fa`)
- **Level 2 (Inlay):** `surface_container_low` (`#f1f4f6`) — Use for secondary content areas or table headers.
- **Level 3 (Interactive):** `surface_container_lowest` (`#ffffff`) — Used for cards or active list items to create a "lifted" feel without a shadow.

### Signature Textures
For high-priority containers, utilize **Glassmorphism**. Instead of a flat grey, use `surface_variant` at 80% opacity with a `20px` backdrop-blur. This creates a "frosted pane" effect that feels more premium than a static hex code.

---

## 3. Typography
The system uses **Inter** (or the native System-UI stack) to ensure a familiar, highly legible experience. Hierarchy is driven by weight and scale, not color shifts.

| Level | Size | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display-MD** | 2.75rem | 600 | -0.02em | Hero analytics or totals |
| **Headline-SM** | 1.5rem | 600 | -0.01em | Major section headers |
| **Title-SM** | 1.0rem | 500 | 0 | Sub-section headers |
| **Body-MD** | 0.875rem | 400 | 0 | Standard interface text |
| **Label-SM** | 0.6875rem | 600 | 0.05em | Uppercase; Metadata / Small labels |

**Editorial Note:** Never exceed a font weight of 600. Boldness should feel firm, not aggressive.

---

## 4. Elevation & Depth
We eschew traditional drop shadows for **Tonal Layering**.

- **The Layering Principle:** Depth is achieved by "stacking." A white card (`surface_container_lowest`) sitting on a light grey background (`surface`) provides a natural, soft lift.
- **Ambient Shadows:** Only use shadows for temporary overlays (modals/popovers). Use the `on_surface` color at 4% opacity with a `32px` blur and `8px` Y-offset. It should feel like a soft glow, not a dark edge.
- **The Ghost Border:** If a separator is required for accessibility, use `outline_variant` (`#abb3b7`) at **15% opacity**. This creates a "hint" of a line that disappears into the subconscious.

---

## 5. Components

### Buttons (The 6px Rule)
All buttons use a `0.375rem` (6px) corner radius. **Pill shapes are forbidden.**
- **Primary:** Background `#1a3167`, Text `#ffffff`. Used only for the "Final" action in a flow.
- **Secondary:** Background `surface_container_highest` (`#dbe4e7`), Text `on_surface`.
- **Tertiary:** No background. Text `on_surface_variant`. Underline on hover only.

### Status Badges (The Micro-Tag)
Badges must be small (12px height) and low-contrast to avoid cluttering the visual field.
- **Default:** `surface_container` background / `on_surface_variant` text.
- **Completed (Fuldført):** Very pale green background / Dark green text.
- **Overdue:** Very pale red background / `error` (`#9f403d`) text.
- **Labels:** *Ikke startet, I gang, Afventer, Fuldført.*

### Lists & Rows
Rows are the heartbeat of the ledger.
- **Height:** Fixed at 44px (Compact) or 48px (Standard).
- **Separation:** No divider lines. Use a 4px vertical gap between rows or a subtle hover state shift to `surface_container_low`.
- **Icons:** Use only neutral grey (`#737c7f`) document icons. No decorative or colorful category icons.

### The Minimalist Sidebar
Inspired by Linear and Notion, the sidebar is a sanctuary of focus.
- **Border:** A single `outline_variant` border on the right (`#e8e8e8`).
- **User Profile:** Placed at the extreme bottom. No "Admin" or "Settings" headers—group these under a single "Workspace" icon or hidden menu to reduce cognitive load.

---

## 6. Do’s and Don’ts

### Do
- **Use White Space as a Tool:** If a section feels crowded, increase the padding instead of adding a border.
- **Respect the 6px Radius:** Ensure consistency across all inputs, cards, and buttons.
- **Focus on the "Active" State:** Use a 2px vertical bar of `primary` color to the left of an active list item rather than highlighting the whole row in blue.

### Don’t
- **No Marketing Cards:** Never include "Upgrade Now" or "Feature Tip" cards within the functional workspace.
- **No Colorful Icons:** Icons are functional signposts, not decorations. Keep them monochromatic.
- **No Floating Action Buttons (FABs):** All actions must live within the page hierarchy or the header.
- **No High-Contrast Borders:** If you can see the border from a distance, it’s too dark. Lighten it until it barely exists.