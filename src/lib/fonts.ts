import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import { loadFont as loadLocalFont } from "@remotion/fonts";
import { FONT_LOADERS } from "./font-map";
import { getBrandAsset } from "./registry";
import type { Brand, BrandFont } from "./types";

/** Loads a brand font from its local files if it has any, otherwise from Google Fonts. */
const loadBrandFont = async (brandId: string, font: BrandFont): Promise<string> => {
  if (font.files) {
    await Promise.all(
      Object.entries(font.files).map(([weight, file]) =>
        loadLocalFont({ family: font.family, url: getBrandAsset(brandId, file), weight }),
      ),
    );
    return font.family;
  }
  return loadGoogleFont(font);
};

const loadGoogleFont = async ({ family, weights }: BrandFont): Promise<string> => {
  const loader = FONT_LOADERS[family];
  if (!loader) throw new Error(`Font "${family}" is not in src/lib/font-map.ts. Add one line for it there.`);
  const mod = await loader();
  const { fontFamily, waitUntilDone } = mod.loadFont("normal", { weights, subsets: ["latin"] });
  await waitUntilDone();
  return fontFamily;
};

export type BrandFonts = { heading: string; body: string; ready: boolean };

/** Loads the brand's heading and body fonts; rendering waits until both are ready. */
export const useBrandFonts = (brand: Brand): BrandFonts => {
  const [state, setState] = useState<BrandFonts>({
    heading: brand.fonts.heading.family,
    body: brand.fonts.body.family,
    ready: false,
  });
  const [handle] = useState(() => delayRender(`Loading fonts for ${brand.id}`));

  useEffect(() => {
    Promise.all([loadBrandFont(brand.id, brand.fonts.heading), loadBrandFont(brand.id, brand.fonts.body)])
      .then(([heading, body]) => {
        setState({ heading, body, ready: true });
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [brand, handle]);

  return state;
};
