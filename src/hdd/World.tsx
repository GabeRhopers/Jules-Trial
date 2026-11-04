// The HDD site (one fixed world model for every urban shot). Everything is driven by `state`, so every
// frame is deterministic. Section views always look from +z: entry (rig) on the left, exit (pipe staging)
// on the right.
import type { Assets } from "./assets";
import { Buildings, Pedestrians, Signals, StreetFurniture, Streets, Traffic } from "./city";
import { BoreGroove, Ghost, GroundCover, LocateMarks, PitFluid, PlannedRoute, Pothole, SectionFace, Soil, Utilities, type Hole } from "./ground";
import { setCut } from "./materials";
import { Person } from "./people";
import { Box, DrillRig, EntryPitDetail, FluidSystem, OPERATOR_SEAT, RIG_SIDE, SupportVehicles } from "./rig";
import { mat } from "./materials";
import { BOUNDS, boreAt, EXIT_LOT, RACK_LENGTH, RIG_LOT } from "./site";
import { DrillHead, DrillString, ProductPipe, PullAssembly, Reamer, Rollers, TrailingRods } from "./tools";

export type WorldState = {
  frame: number;
  /** section plane z (BOUNDS.z = closed, 0 = along the alignment) */
  cut: number;
  /** 0..1 ground see-through (plan views) */
  xray: number;
  /** 0..1 planned alignment drawn on the surface / in section */
  planSurface: number;
  planProfile: number;
  /** 0..1 utility locate marks on the surface */
  marks: number;
  /** test hole open (utility verification) */
  pothole: boolean;
  /** drill head position (0 entry .. 1 exit), reamer and pulling positions, or null */
  pilot: number | null;
  ream: number | null;
  pull: number | null;
  /** installation complete: pipe in place, equipment gone, pits restored */
  complete: boolean;
  sondeReveal: number;
  signal: number;
  /** 0..1 ghost buildings in front of the section */
  ghostFront: number;
  /** product pipe staged on the rollers (before pullback) */
  pipeStaged: boolean;
  /** crew poses */
  locatorPose: "locate" | "locateRadio";
  operatorTalking: boolean;
  /** tool change at the exit (crew at the pit) */
  exitWork: boolean;
  planReview: boolean;
  /** drill bit and sonde still on the string (removed at the exit before reaming) */
  bitAttached: boolean;
  /** bit face orientation (steering), radians */
  roll: number;
  /** enlarged from this bore fraction to the exit (null = pilot size only) */
  enlargedFrom: number | null;
};

const ROD = 3 / 80; // one drill rod (about 3 m) as a bore fraction

export const World: React.FC<{ a: Assets; s: WorldState }> = ({ a, s }) => {
  setCut(s.cut);
  const t = s.frame / 30;
  const sectioned = s.cut < BOUNDS.z - 0.01;
  const pilotOnly = s.pilot !== null && s.ream === null && s.pull === null && !s.complete;
  const front = s.pull ?? s.ream ?? s.pilot;
  // carriage travels down the frame as a rod is pushed (pilot), up as it pulls back (ream / pull)
  const phase = front === null ? 0 : (front / ROD) % 1;
  const carriage = front === null || s.complete ? RACK_LENGTH - 1.2 : pilotOnly ? 1.2 + (RACK_LENGTH - 2.6) * (1 - phase) : 1.2 + (RACK_LENGTH - 2.6) * phase;
  const spin = t * 4; // drill string rotation while drilling / reaming
  const drilled = s.pilot === null ? 0 : pilotOnly ? s.pilot : 1;
  const enlargedFrom = s.complete ? 0 : s.enlargedFrom;
  const hole: Hole | null = s.pilot === null && !s.complete ? null : { to: s.complete ? 1 : drilled, enlargedFrom };
  const locU = Math.min(0.985, (front ?? 0) + 0.003);
  const loc = boreAt(locU).p;
  const fluid = !s.complete && s.pilot !== null;
  const equipment = !s.complete;
  const exitCrewX = 42.2;
  return (
    <group>
      <Soil a={a} xray={s.xray} pothole={s.pothole ? 1 : 0} />
      <PitFluid entry={fluid ? 0.55 : 0} exit={fluid && (s.pilot ?? 0) > 0.97 ? 0.45 : 0} />
      <SectionFace a={a} cut={s.cut} hole={s.cut <= 0.01 ? hole : null} />
      {hole && s.cut <= 0.01 ? <BoreGroove hole={hole} /> : null}
      <Ghost cut={s.cut} strength={sectioned ? 1 : 0} />
      <Utilities showSections={s.cut <= 0.01} />
      <GroundCover a={a} restored={s.complete} />
      <Streets a={a} pothole={s.pothole} />
      <Pothole a={a} o={s.pothole ? 1 : 0} />
      <LocateMarks o={s.marks} />
      <PlannedRoute surface={s.planSurface} profile={s.planProfile} />
      <Buildings a={a} ghostFront={s.ghostFront} />
      <StreetFurniture a={a} cutFront={sectioned} />
      <Signals t={t} />
      <Traffic frame={s.frame} />
      <Pedestrians t={t} />
      {/* work area perimeter: temporary fence panels with bases, gate opening toward the access drive */}
      {equipment ? <WorkAreaFence /> : null}
      {equipment ? (
        <>
          <DrillRig carriage={carriage} spin={front !== null ? spin : 0} decal={a.dtiDecal} />
          <EntryPitDetail a={a} />
          <FluidSystem a={a} t={t} flowing={fluid} />
          <SupportVehicles />
          <Rollers />
          {front !== null ? <DrillString carriage={carriage} to={front} /> : null}
          {pilotOnly && s.bitAttached ? <DrillHead u={s.pilot!} reveal={s.sondeReveal} roll={s.roll} /> : null}
          {s.ream !== null ? (
            <>
              <Reamer u={s.ream} spin={spin} />
              <TrailingRods from={s.ream} />
            </>
          ) : null}
          {s.pull !== null ? <PullAssembly u={s.pull} spin={spin} /> : null}
          {s.signal > 0 && pilotOnly ? <SignalRings u={s.pilot!} t={t} strength={s.signal} /> : null}
          {/* crew: each person has a role and a fixed station, clear of rotating rods and tooling */}
          <Person p={[OPERATOR_SEAT[0] + 0.1, 1.24, OPERATOR_SEAT[2]]} r={Math.PI / 2} pose={s.operatorTalking ? "radio" : "operate"} />
          <Person p={[-46.6, 0.03, -2.6]} r={0} pose="monitor" skin="#8a5a3e" />
          <Person p={[RIG_SIDE.recycler[0] + 2.0, 0.03, RIG_SIDE.recycler[2] + 1.9]} r={Math.PI} pose="monitor" skin="#e0b89b" />
          {s.planReview ? <Person p={[-61.5, 0.03, 2.2]} r={Math.PI / 2} pose="tablet" skin="#a87656" /> : null}
          {s.pilot !== null ? (
            <Person p={[loc.x + 0.4, 0.2, -1.5]} r={-Math.PI / 2} pose={s.locatorPose} moving={pilotOnly && (s.pilot ?? 0) > 0.03} t={t} skin="#6f4a33" />
          ) : null}
          <Person p={[exitCrewX + (s.exitWork ? 0 : 2.5), 0.03, -2.4]} r={-Math.PI / 2 - 0.3} pose={s.exitWork ? "monitor" : "radio"} skin="#c79a7c" />
          <Person p={[exitCrewX + 4, 0.03, 2.6]} r={-Math.PI / 2 + 0.4} pose="tablet" skin="#a87656" />
        </>
      ) : null}
      {(s.pipeStaged || s.pull !== null) && !s.complete ? <ProductPipe from={s.pull ?? 1} /> : null}
      {s.complete ? <ProductPipe from={0} installed /> : null}
    </group>
  );
};

/** Temporary fence (panels on bases) around the rig lot and the exit area; open at the access points */
const WorkAreaFence: React.FC = () => {
  const panel = mat({ color: "#c8cccf", rough: 0.4, metal: 0.6, clip: "none", opacity: 0.3 });
  const base = mat({ color: "#d36a2a", rough: 0.7, clip: "none" });
  const runs: [number, number, number, number][] = [
    [RIG_LOT.x0 + 1, RIG_LOT.z0, RIG_LOT.x1, RIG_LOT.z0],
    [RIG_LOT.x0 + 1, RIG_LOT.z1, RIG_LOT.x1 - 9, RIG_LOT.z1],
    [RIG_LOT.x1, RIG_LOT.z0, RIG_LOT.x1, -2.2],
    [RIG_LOT.x1, 2.2, RIG_LOT.x1, RIG_LOT.z1],
    [EXIT_LOT.x0, EXIT_LOT.z0, EXIT_LOT.x1, EXIT_LOT.z0],
    [EXIT_LOT.x0, EXIT_LOT.z1, EXIT_LOT.x1, EXIT_LOT.z1],
    [EXIT_LOT.x0, EXIT_LOT.z0, EXIT_LOT.x0, -2.2],
    [EXIT_LOT.x0, 2.2, EXIT_LOT.x0, EXIT_LOT.z1],
  ];
  const out: React.ReactNode[] = [];
  runs.forEach(([x0, z0, x1, z1], i) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 3.4));
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const x = x0 + (x1 - x0) * f;
      const z = z0 + (z1 - z0) * f;
      const ang = Math.atan2(z1 - z0, x1 - x0);
      out.push(
        <group key={`${i}${k}`} position={[x, 0, z]} rotation={[0, -ang, 0]}>
          <Box p={[0, 1.0, 0]} s={[len / n - 0.08, 1.8, 0.02]} m={panel} shadow={false} />
          {[-1, 1].map((e) => (
            <Box key={e} p={[(e * (len / n)) / 2, 0.08, 0]} s={[0.55, 0.14, 0.22]} m={base} />
          ))}
        </group>,
      );
    }
  });
  return <group>{out}</group>;
};

/** Signal from the sonde, drawn on the section plane: soft arcs rising toward the receiver */
const SignalRings: React.FC<{ u: number; t: number; strength: number }> = ({ u, t, strength }) => {
  const p = boreAt(Math.max(0, u - 0.006)).p;
  return (
    <group position={[p.x, p.y, 0.2]}>
      {[0, 1, 2].map((k) => {
        const ph = (t * 0.5 + k / 3) % 1;
        const r = 0.3 + ph * Math.abs(p.y) * 0.95;
        return (
          <mesh key={k}>
            <ringGeometry args={[r, r + 0.035, 64, 1, Math.PI * 0.18, Math.PI * 0.64]} />
            <meshBasicMaterial color="#0E4D97" transparent opacity={strength * 0.5 * (1 - ph)} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};
