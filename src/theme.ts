// Mirrors the @theme tokens in global.css. Needed wherever a raw hex is required
// instead of a Tailwind class: expo-linear-gradient, Reanimated interpolations,
// and SVG props none of which read CSS variables.
//
// Keep in sync with global.css. See mvps/design-system.md for the rationale.

export const COLORS = {
  brand: "#4255FF",

  /** Brand blue is too dark to sit ON a dark surface. Use this tint for text and
   *  icons inside secondary (glass) buttons; brand stays for solid fills. */
  brandTint: "#AEB8FF",

  /** A wrong answer is orange, not red. Red reads as failure; orange reads as "not yet". */
  correct: "#3BE0A0",
  incorrect: "#F97316",
  encourage: "#FF8A3D",

  roundActive: "#E8590C",
  roundIdle: "#4A5169",

  dark: {
    base: "#0A092D",
    surface: "#12102F",
    surface2: "#2E3856",
    border: "#2E3856",
    text: "#F6F7FB",
    muted: "#939BB4",
  },
  light: {
    base: "#FFFFFF",
    surface: "#F6F7FB",
    surface2: "#EDEFF4",
    border: "#D9DDE8",
    text: "#0A092D",
    muted: "#646F90",
  },
} as const;

export const BRAND = {
  gradientLight: ["#6E7CFF", "#4255FF"] as [string, string],
  gradientDark: ["#5465FF", "#3243D8"] as [string, string],
} as const;

/**
 * Glass surfaces: a translucent white wash over the navy base plus a hairline
 * light border, which is what actually reads as "glass" on a dark UI.
 *
 * Deliberately NOT expo-blur. The background behind these cards is a flat colour,
 * so a real backdrop blur would produce a pixel-identical result at the cost of a
 * native dependency and a per-frame GPU pass.
 */
export const GLASS = {
  fill: "rgba(255,255,255,0.06)",
  fillStrong: "rgba(255,255,255,0.09)",
  border: "rgba(255,255,255,0.12)",
} as const;

/**
 * One vertical rhythm for every screen. Before this, each screen picked its own
 * numbers (padding 20 here, 24 there, paddingTop 32 on one) and titles landed at
 * a different height on every tab — visible as a jump when switching tabs.
 *
 * gutter      horizontal margin, identical on the header and the body below it,
 *             so the title's left edge lines up with the content's.
 * headerTop   gap between the safe-area inset and the first header row.
 * headerGap   gap between the header block and the body content.
 */
export const SPACING = {
  gutter: 20,
  headerTop: 8,
  headerGap: 20,
} as const;

