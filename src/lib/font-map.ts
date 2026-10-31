// Google Fonts available to brands. Only fonts listed here get bundled, which keeps
// bundling fast (importing the whole Google Fonts catalog adds over a minute per render).
// To use a new font in a brand: add one line here, using the font's exact Google Fonts name.
// Module names: https://www.remotion.dev/docs/google-fonts (same as the family, without spaces).
export type FontModule = {
  loadFont: (
    style: "normal",
    options: { weights: string[]; subsets: string[] },
  ) => { fontFamily: string; waitUntilDone: () => Promise<unknown> };
};

// Each font package types its own weights strictly; this map only needs the common shape.
const font = (load: () => Promise<unknown>) => load as () => Promise<FontModule>;

export const FONT_LOADERS: Record<string, () => Promise<FontModule>> = {
  Poppins: font(() => import("@remotion/google-fonts/Poppins")),
  Inter: font(() => import("@remotion/google-fonts/Inter")),
  "IBM Plex Sans": font(() => import("@remotion/google-fonts/IBMPlexSans")),
  "IBM Plex Sans Condensed": font(() => import("@remotion/google-fonts/IBMPlexSansCondensed")),
  Manrope: font(() => import("@remotion/google-fonts/Manrope")),
  Montserrat: font(() => import("@remotion/google-fonts/Montserrat")),
  "Archivo Black": font(() => import("@remotion/google-fonts/ArchivoBlack")),
  Barlow: font(() => import("@remotion/google-fonts/Barlow")),
  "Barlow Condensed": font(() => import("@remotion/google-fonts/BarlowCondensed")),
  "DM Sans": font(() => import("@remotion/google-fonts/DMSans")),
  "Space Grotesk": font(() => import("@remotion/google-fonts/SpaceGrotesk")),
  "Source Sans 3": font(() => import("@remotion/google-fonts/SourceSans3")),
};
