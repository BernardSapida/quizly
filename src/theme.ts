// Single source of truth for brand colors — mirrors global.css @theme values.
// Edit global.css to rebrand the app; keep the gradient stops here in sync.
//
// Gradient hex is only needed for expo-linear-gradient (no CSS variable support).
// Use https://oklch.com to derive lighter/darker hex stops from your brand color.

export const BRAND = {
  gradientLight: ["#7BADFF", "#3B6FEA"] as [string, string], // lighter → darker of app-brand
  gradientDark: ["#5B8FF5", "#2A5DD8"] as [string, string],
} as const;
