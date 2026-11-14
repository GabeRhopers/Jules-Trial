// Safe zones for vertical 1080x1920 video on Instagram Reels, TikTok and LinkedIn.
// Based on Meta's percentage guidance as converted by Hopper HQ (2026): about 270 px top,
// 670 px bottom, 65 px sides, and 770 px clear at the bottom right (like / comment / share rail).
// These are the strictest published numbers, so one file works on every platform.
// TikTok's own margins were not verified; re-check when you publish to a new platform.
export const REEL_SAFE_ZONE = {
  top: 270,
  bottom: 670,
  left: 65,
  right: 65,
  /** Right-side action rail: keep this strip clear from `rightRail.bottom` px above the bottom edge. */
  rightRail: { width: 150, bottom: 770 },
} as const;

export type Rect = { x: number; y: number; width: number; height: number };

export const reelSafeRect = (width: number, height: number): Rect => ({
  x: REEL_SAFE_ZONE.left,
  y: REEL_SAFE_ZONE.top,
  width: width - REEL_SAFE_ZONE.left - REEL_SAFE_ZONE.right,
  height: height - REEL_SAFE_ZONE.top - REEL_SAFE_ZONE.bottom,
});
