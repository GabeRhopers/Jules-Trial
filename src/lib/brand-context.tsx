import { createContext, useContext } from "react";
import { MOTION } from "./motion";
import type { Brand } from "./types";

export type BrandKit = {
  brand: Brand;
  /** Loaded CSS font-family names */
  fonts: { heading: string; body: string };
  logoSrc: string;
  motion: (typeof MOTION)["bold"];
};

const BrandContext = createContext<BrandKit | null>(null);

/** Makes the active brand available to every component below it. */
export const BrandProvider: React.FC<{
  brand: Brand;
  fonts: { heading: string; body: string };
  logoSrc: string;
  children: React.ReactNode;
}> = ({ brand, fonts, logoSrc, children }) => (
  <BrandContext.Provider value={{ brand, fonts, logoSrc, motion: MOTION[brand.style.motion] }}>{children}</BrandContext.Provider>
);

export const useBrand = (): BrandKit => {
  const kit = useContext(BrandContext);
  if (!kit) throw new Error("useBrand() must be used inside <BrandProvider>");
  return kit;
};
