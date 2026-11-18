import type { SpringConfig } from "remotion";

type Motion = {
  /** Headline word reveal */
  title: { spring: Partial<SpringConfig>; stagger: number; rise: number };
  /** Badges, buttons and other elements that "pop" in */
  pop: { spring: Partial<SpringConfig>; rotate: number };
  /** Caption words appearing as they are spoken */
  caption: { spring: Partial<SpringConfig>; scaleFrom: number };
  /** General entrances (stats, labels, sublines) */
  enter: { spring: Partial<SpringConfig>; distance: number };
};

/** Motion presets, picked by brand.style.motion. */
export const MOTION: Record<"bold" | "calm", Motion> = {
  bold: {
    title: { spring: { damping: 200, mass: 0.6 }, stagger: 3, rise: 0.45 },
    pop: { spring: { damping: 10, stiffness: 160, mass: 0.6 }, rotate: -25 },
    caption: { spring: { damping: 14, stiffness: 220, mass: 0.5 }, scaleFrom: 0.7 },
    enter: { spring: { damping: 18, mass: 0.6 }, distance: 40 },
  },
  calm: {
    title: { spring: { damping: 200, mass: 1 }, stagger: 4, rise: 0.18 },
    pop: { spring: { damping: 200, mass: 0.8 }, rotate: 0 },
    caption: { spring: { damping: 200, mass: 0.5 }, scaleFrom: 0.96 },
    enter: { spring: { damping: 200, mass: 0.9 }, distance: 24 },
  },
};
