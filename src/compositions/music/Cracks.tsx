// Procedural cracks and glass shards, drawn in code so they can grow on the beat and reverse exactly.
import { useMemo } from "react";

type Seg = { x1: number; y1: number; x2: number; y2: number; from: number; to: number; w: number };

const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * A crack network around (ox, oy): radial rays that wander and branch, plus web rings between rays.
 * Each segment knows its distance from the impact (from/to, 0 to 1), so a level of 0.4 draws what lies
 * within 40 % of the reach. Same seed, same cracks: the network is identical on every frame.
 */
export const buildCracks = (seed: number, ox: number, oy: number, reach: number, rays = 14): Seg[] => {
  const r = rng(seed);
  const segs: Seg[] = [];
  const rayPoints: { x: number; y: number; d: number }[][] = [];
  const walk = (x: number, y: number, angle: number, dist: number, width: number, depth: number, points?: { x: number; y: number; d: number }[]) => {
    let a = angle;
    let d = dist;
    while (d < reach) {
      const len = reach * (0.025 + r() * 0.05);
      a += (r() - 0.5) * 0.55;
      const nx = x + Math.cos(a) * len;
      const ny = y + Math.sin(a) * len;
      segs.push({ x1: x, y1: y, x2: nx, y2: ny, from: d / reach, to: (d + len) / reach, w: width });
      points?.push({ x: nx, y: ny, d: (d + len) / reach });
      x = nx;
      y = ny;
      d += len;
      width *= 0.97;
      if (depth < 2 && r() < 0.13) walk(x, y, a + (r() < 0.5 ? -1 : 1) * (0.4 + r() * 0.6), d, width * 0.6, depth + 1);
    }
  };
  for (let i = 0; i < rays; i++) {
    const pts: { x: number; y: number; d: number }[] = [];
    walk(ox, oy, (i / rays) * Math.PI * 2 + (r() - 0.5) * 0.5, 0, 2.6, 0, pts);
    rayPoints.push(pts);
  }
  // Web rings: short links between neighboring rays at a few distances, like an impact on glass
  for (const ring of [0.08, 0.18, 0.32, 0.5]) {
    for (let i = 0; i < rays; i++) {
      if (r() < 0.35) continue;
      const pa = rayPoints[i].find((p) => p.d >= ring);
      const pb = rayPoints[(i + 1) % rays].find((p) => p.d >= ring + (r() - 0.5) * 0.05);
      if (pa && pb) segs.push({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, from: Math.max(pa.d, pb.d), to: Math.max(pa.d, pb.d) + 0.03, w: 1.1 });
    }
  }
  return segs;
};

/** Draws the part of a crack network within `level` (0 to 1). Glass = bright lines; wall = dark lines with a lit edge. */
export const CrackLayer: React.FC<{ seed: number; ox: number; oy: number; level: number; style: "glass" | "wall"; reach?: number; glow?: number }> = ({
  seed,
  ox,
  oy,
  level,
  style,
  reach = 2400,
  glow = 0,
}) => {
  const segs = useMemo(() => buildCracks(seed, ox, oy, reach), [seed, ox, oy, reach]);
  if (level <= 0) return null;
  const visible = segs.filter((s) => s.from < level).map((s) => {
    const f = Math.min(1, (level - s.from) / (s.to - s.from));
    return { ...s, x2: s.x1 + (s.x2 - s.x1) * f, y2: s.y1 + (s.y2 - s.y1) * f };
  });
  const path = (min: number) =>
    visible
      .filter((s) => s.w >= min)
      .map((s) => `M${s.x1.toFixed(1)} ${s.y1.toFixed(1)}L${s.x2.toFixed(1)} ${s.y2.toFixed(1)}`)
      .join("");
  const all = path(0);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }} viewBox="0 0 1920 1080">
      {style === "glass" ? (
        <>
          <path d={all} stroke={`rgba(255,120,200,${0.25 + glow * 0.5})`} strokeWidth={7} fill="none" strokeLinecap="round" />
          <path d={all} stroke="rgba(255,255,255,0.55)" strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d={all} stroke="#ffffff" strokeWidth={1.2} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d={all} stroke={`rgba(255,110,190,${0.06 + glow * 0.3})`} strokeWidth={7} fill="none" strokeLinecap="round" />
          <path d={all} stroke="rgba(6,4,10,0.95)" strokeWidth={4} fill="none" strokeLinecap="round" />
          <path d={path(1.5)} stroke="rgba(255,255,255,0.35)" strokeWidth={0.8} fill="none" transform="translate(1.5,1.5)" />
        </>
      )}
    </svg>
  );
};

type Shard = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; pts: string; t0: number };

/**
 * Glass shards thrown from (ox, oy) on each burst time. `direction` -1 plays them backward (they fly home and vanish),
 * `freezeAt` stops time for them (they hang in the air).
 */
export const Shards: React.FC<{ t: number; bursts: number[]; ox: number; oy: number; seed: number; direction?: 1 | -1; freezeAt?: number; count?: number }> = ({
  t,
  bursts,
  ox,
  oy,
  seed,
  direction = 1,
  freezeAt,
  count = 9,
}) => {
  const shards = useMemo(() => {
    const r = rng(seed);
    const out: Shard[] = [];
    for (const t0 of bursts) {
      for (let i = 0; i < count; i++) {
        const a = r() * Math.PI * 2;
        const speed = 260 + r() * 900;
        const size = 10 + r() * 46;
        const n = 3 + Math.floor(r() * 2);
        const pts = Array.from({ length: n }, (_, k) => {
          const ang = (k / n) * Math.PI * 2 + r() * 0.8;
          const rad = size * (0.5 + r() * 0.6);
          return `${(Math.cos(ang) * rad).toFixed(1)},${(Math.sin(ang) * rad).toFixed(1)}`;
        }).join(" ");
        out.push({ x: ox + (r() - 0.5) * 120, y: oy + (r() - 0.5) * 120, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 200, rot: r() * 360, vr: (r() - 0.5) * 540, size, pts, t0 });
      }
    }
    return out;
  }, [bursts, ox, oy, seed, count]);
  const life = 1.6;
  const now = freezeAt !== undefined ? Math.min(t, freezeAt) : t;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }} viewBox="0 0 1920 1080">
      {shards.map((s, i) => {
        // Backward: a shard thrown at t0 is shown flying home, arriving at t0 + life
        const age = direction === 1 ? now - s.t0 : s.t0 + life - now;
        if (age < 0 || age > life) return null;
        const drift = freezeAt !== undefined && t > freezeAt ? (t - freezeAt) * 0.04 : 0;
        const k = age + drift;
        const x = s.x + s.vx * k;
        const y = s.y + s.vy * k + 520 * k * k;
        const fade = direction === 1 ? 1 - age / life : Math.min(1, age * 3);
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(s.rot + s.vr * k).toFixed(1)})`} opacity={fade}>
            <polygon points={s.pts} fill="rgba(210,225,255,0.18)" stroke="rgba(255,255,255,0.85)" strokeWidth={1.4} />
          </g>
        );
      })}
    </svg>
  );
};
