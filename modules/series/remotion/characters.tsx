// Vector characters for COLD FEET. Each one is drawn by code from the series bible, so it looks
// exactly the same in every shot and every episode (the "locked look": frank-v1, nefi-v1, tech-v1).
// Local coordinates: origin at the feet, y goes up as negative numbers.
import type { Expr, Pose } from "./types";

const LINE = "#1B1A22";
const MOUTH = "#3A1E24";

export type CharProps = {
  pose: Pose;
  expr: Expr;
  /** 0..1 mouth opening from the voice loudness (0 = closed, show the expression instead) */
  mouth: number;
  blink: boolean;
  /** seconds, for idle motion */
  t: number;
  outfit?: string;
  singed?: boolean;
  shiver?: boolean;
  accent?: string;
  primary?: string;
};

/** Thick cartoon limb: dark outline stroke, then the fill stroke on top. */
const Limb: React.FC<{ d: string; color: string; width: number }> = ({ d, color, width }) => (
  <>
    <path d={d} stroke={LINE} strokeWidth={width + 12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d={d} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </>
);

const arm = (s: [number, number], e: [number, number], h: [number, number]) => `M ${s[0]} ${s[1]} Q ${e[0]} ${e[1]} ${h[0]} ${h[1]}`;

/** Mouth: talking shape when the voice is loud enough, otherwise the expression. */
const Mouth: React.FC<{ x: number; y: number; w: number; mouth: number; expr: Expr }> = ({ x, y, w, mouth, expr }) => {
  if (mouth > 0.12) {
    const h = 6 + 26 * mouth;
    return (
      <g>
        <ellipse cx={x} cy={y + h / 3} rx={w * (0.75 + 0.15 * mouth)} ry={h} fill={MOUTH} stroke={LINE} strokeWidth={4} />
        <ellipse cx={x} cy={y + h * 0.9} rx={w * 0.45} ry={h * 0.35} fill="#C2556A" />
      </g>
    );
  }
  switch (expr) {
    case "happy":
      return <path d={`M ${x - w} ${y - 4} Q ${x} ${y + w * 0.9} ${x + w} ${y - 4}`} stroke={LINE} strokeWidth={6} fill="none" strokeLinecap="round" />;
    case "sheepish":
      return <path d={`M ${x - w * 0.8} ${y + 4} Q ${x} ${y + w * 0.5} ${x + w * 0.9} ${y - 8}`} stroke={LINE} strokeWidth={6} fill="none" strokeLinecap="round" />;
    case "worried":
      return <path d={`M ${x - w * 0.8} ${y + 6} q ${w * 0.4} -10 ${w * 0.8} 0 t ${w * 0.8} 0`} stroke={LINE} strokeWidth={6} fill="none" strokeLinecap="round" />;
    case "scared":
      return <ellipse cx={x} cy={y + 6} rx={w * 0.45} ry={w * 0.55} fill={MOUTH} stroke={LINE} strokeWidth={4} />;
    case "annoyed":
      return <path d={`M ${x - w * 0.7} ${y + 6} L ${x + w * 0.7} ${y + 2}`} stroke={LINE} strokeWidth={6} strokeLinecap="round" />;
    default:
      return <path d={`M ${x - w * 0.7} ${y + 2} Q ${x} ${y + 10} ${x + w * 0.7} ${y + 2}`} stroke={LINE} strokeWidth={6} fill="none" strokeLinecap="round" />;
  }
};

/** Pair of eyes + brows. `tilt` > 0 lifts the inner brow ends (worried), < 0 lowers them (annoyed). */
const Eyes: React.FC<{ cx: number; y: number; gap: number; r: number; blink: boolean; expr: Expr; iris?: string; brow?: string; browW?: number }> = ({
  cx, y, gap, r, blink, expr, iris = LINE, brow = LINE, browW = 14,
}) => {
  const scared = expr === "scared";
  const ry = blink ? 2 : scared ? r * 1.35 : r;
  const tilt = expr === "worried" || expr === "scared" || expr === "sheepish" ? 14 : expr === "annoyed" ? -12 : 0;
  const lift = scared ? 14 : 0;
  return (
    <g>
      {[-1, 1].map((side) => {
        const ex = cx + side * gap;
        return (
          <g key={side}>
            <ellipse cx={ex} cy={y} rx={r * 1.2} ry={ry} fill="#FFFFFF" stroke={LINE} strokeWidth={4} />
            {!blink && <circle cx={ex + side * -2} cy={y + 2} r={r * 0.55} fill={iris} />}
            {!blink && <circle cx={ex + side * -2 - 3} cy={y - 2} r={r * 0.18} fill="#FFFFFF" />}
            <path
              d={`M ${ex - side * r * 1.3} ${y - r * 1.6 - lift - tilt} L ${ex + side * r * 1.4} ${y - r * 1.6 - lift + tilt * 0.3}`}
              stroke={brow}
              strokeWidth={browW}
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </g>
  );
};

// ---------------- Frank ----------------

const F = { skin: "#9CC59A", skinD: "#7FA67E", hair: "#1E1B24", cardigan: "#8B5E3C", cardiganD: "#6E4A2F", shirt: "#8E98A3", pants: "#3A3E48", boot: "#17161C" };

const frankArms = (pose: Pose, t: number): { l: [[number, number], [number, number]]; r: [[number, number], [number, number]] } => {
  const sway = Math.sin(t * 2) * 6;
  switch (pose) {
    case "shrug":
      return { l: [[-260, -610], [-300, -720]], r: [[260, -610], [300, -720]] };
    case "arms-up":
      return { l: [[-270, -830], [-250, -990 + sway]], r: [[270, -830], [250, -990 - sway]] };
    case "cables":
      return { l: [[-230, -560], [-110, -620]], r: [[240, -580], [150, -680 + sway]] };
    case "carry":
      return { l: [[-210, -600], [-90, -640]], r: [[220, -600], [170, -650]] };
    default:
      return { l: [[-200, -560], [-190, -420 + sway * 0.3]], r: [[200, -560], [190, -420 - sway * 0.3]] };
  }
};

export const Frank: React.FC<CharProps> = ({ pose, expr, mouth, blink, t, singed }) => {
  const arms = frankArms(pose, t);
  const breathe = Math.sin(t * 2.2) * 4;
  return (
    <g>
      {/* legs + boots */}
      <rect x={-108} y={-415} width={98} height={375} rx={22} fill={F.pants} stroke={LINE} strokeWidth={6} />
      <rect x={10} y={-415} width={98} height={375} rx={22} fill={F.pants} stroke={LINE} strokeWidth={6} />
      <rect x={-125} y={-60} width={120} height={60} rx={20} fill={F.boot} stroke={LINE} strokeWidth={6} />
      <rect x={5} y={-60} width={120} height={60} rx={20} fill={F.boot} stroke={LINE} strokeWidth={6} />
      <g transform={`translate(0 ${breathe * 0.3})`}>
        {/* torso: open cardigan over gray shirt */}
        <path d="M -178 -745 Q -195 -560 -152 -385 L 152 -385 Q 195 -560 178 -745 Q 0 -800 -178 -745 Z" fill={F.cardigan} stroke={LINE} strokeWidth={6} />
        <path d="M -70 -770 L 0 -520 L 70 -770 Q 0 -790 -70 -770 Z" fill={F.shirt} stroke={LINE} strokeWidth={5} />
        <path d="M 0 -520 L 0 -385" stroke={F.cardiganD} strokeWidth={6} />
        {[-490, -445, -400].map((y) => <circle key={y} cx={-16} cy={y} r={9} fill="#D9C3A0" stroke={LINE} strokeWidth={3} />)}
        {[-120, -80, 80, 120].map((x) => <path key={x} d={`M ${x} -700 L ${x * 0.95} -410`} stroke={F.cardiganD} strokeWidth={4} strokeDasharray="10 12" />)}
        {/* arms */}
        <Limb d={arm([-165, -715], arms.l[0], arms.l[1])} color={F.cardigan} width={70} />
        <Limb d={arm([165, -715], arms.r[0], arms.r[1])} color={F.cardigan} width={70} />
        {[arms.l[1], arms.r[1]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={42} fill={F.skin} stroke={LINE} strokeWidth={6} />)}
        {pose === "cables" && (
          <g>
            <path d={`M ${arms.l[1][0]} ${arms.l[1][1] + 30} q -20 160 40 320`} stroke="#C0392B" strokeWidth={14} fill="none" />
            <path d={`M ${arms.r[1][0]} ${arms.r[1][1] + 30} q 30 180 -10 360`} stroke="#222" strokeWidth={14} fill="none" />
            <path d={`M ${arms.l[1][0] - 20} ${arms.l[1][1] - 40} l 18 -50 l 18 50 Z`} fill="#C0392B" stroke={LINE} strokeWidth={4} />
            <path d={`M ${arms.r[1][0] - 20} ${arms.r[1][1] - 40} l 18 -50 l 18 50 Z`} fill="#333" stroke={LINE} strokeWidth={4} />
          </g>
        )}
        {/* neck + head */}
        <rect x={-55} y={-815} width={110} height={70} fill={F.skinD} stroke={LINE} strokeWidth={6} />
        <g transform={`rotate(${Math.sin(t * 1.3) * 1.5} 0 -800)`}>
          <ellipse cx={-130} cy={-935} rx={22} ry={36} fill={F.skin} stroke={LINE} strokeWidth={6} />
          <ellipse cx={130} cy={-935} rx={22} ry={36} fill={F.skin} stroke={LINE} strokeWidth={6} />
          <path d="M -120 -1060 Q -125 -1098 -80 -1100 L 80 -1100 Q 125 -1098 120 -1060 L 136 -860 Q 136 -795 70 -792 L -70 -792 Q -136 -795 -136 -860 Z" fill={F.skin} stroke={LINE} strokeWidth={6} />
          {/* hair */}
          <path d="M -132 -1030 L -128 -1108 Q 0 -1155 128 -1108 L 134 -1030 L 106 -1062 L 86 -1024 L 56 -1066 L 26 -1030 L -4 -1070 L -34 -1028 L -64 -1064 L -96 -1024 Z" fill={F.hair} stroke={LINE} strokeWidth={5} />
          {singed && (
            <g>
              <path d="M -60 -1135 l -20 -50 l 25 20 l 5 -45 l 18 40 l 20 -38 l 4 52" fill={F.hair} stroke={LINE} strokeWidth={4} />
              {[0, 1, 2].map((i) => {
                const k = (t * 0.6 + i / 3) % 1;
                return <circle key={i} cx={-30 + i * 30 + Math.sin(t * 3 + i) * 10} cy={-1160 - k * 160} r={14 + k * 18} fill="#8A8A8A" opacity={0.5 * (1 - k)} />;
              })}
              <ellipse cx={70} cy={-890} rx={22} ry={12} fill="#55604F" opacity={0.6} />
            </g>
          )}
          {/* stitches + temple scar */}
          <path d="M -78 -1012 L 46 -1020" stroke={LINE} strokeWidth={4} />
          {[-66, -42, -18, 6, 30].map((x) => <path key={x} d={`M ${x} -1026 L ${x + 4} -1004`} stroke={LINE} strokeWidth={4} />)}
          <path d="M -102 -905 L -66 -862" stroke={LINE} strokeWidth={4} />
          {[0, 1, 2].map((i) => <path key={i} d={`M ${-104 + i * 13} ${-886 + i * 14} l 16 -6`} stroke={LINE} strokeWidth={4} />)}
          <circle cx={108} cy={-985} r={11} fill={F.skinD} stroke={LINE} strokeWidth={4} />
          <Eyes cx={0} y={-948} gap={58} r={17} blink={blink} expr={expr} browW={18} />
          <path d="M -6 -930 Q -18 -900 0 -895 Q 12 -895 10 -905" stroke={LINE} strokeWidth={5} fill="none" strokeLinecap="round" />
          {expr === "sheepish" && (
            <>
              <ellipse cx={-85} cy={-885} rx={24} ry={12} fill="#E58A8A" opacity={0.55} />
              <ellipse cx={85} cy={-885} rx={24} ry={12} fill="#E58A8A" opacity={0.55} />
            </>
          )}
          <Mouth x={0} y={-852} w={36} mouth={mouth} expr={expr} />
        </g>
      </g>
    </g>
  );
};

// ---------------- Nefi ----------------

const N = { wrap: "#E9DFC7", wrapD: "#C4B694", gold: "#E2B33C", lapis: "#2B59C3", blanket: "#6B4C9A", blanketD: "#4E3576", slit: "#4A3F35", iris: "#F2A93B" };

const nefiArms = (pose: Pose, t: number): { l: [[number, number], [number, number]]; r: [[number, number], [number, number]] } => {
  const sway = Math.sin(t * 2.4) * 5;
  switch (pose) {
    case "hug":
    case "carried":
      return { l: [[-165, -500], [55, -555]], r: [[165, -470], [-55, -505]] };
    case "point":
      return { l: [[-140, -430], [-120, -330]], r: [[170, -640], [250, -760 + sway]] };
    default:
      return { l: [[-140, -470], [-125, -340 + sway * 0.3]], r: [[140, -470], [125, -340 - sway * 0.3]] };
  }
};

const WrapLines: React.FC<{ x1: number; x2: number; y1: number; y2: number; step: number; slope?: number }> = ({ x1, x2, y1, y2, step, slope = 10 }) => (
  <>
    {Array.from({ length: Math.floor((y2 - y1) / step) }, (_, i) => y1 + step * (i + 0.6)).map((y, i) => (
      <path key={y} d={`M ${x1} ${y + (i % 2 ? slope : -slope)} L ${x2} ${y + (i % 2 ? -slope : slope)}`} stroke={N.wrapD} strokeWidth={4} />
    ))}
  </>
);

export const Nefi: React.FC<CharProps> = ({ pose, expr, mouth, blink, t, outfit, shiver }) => {
  const arms = nefiArms(pose, t);
  const blanket = outfit === "blanket";
  const jitter = shiver ? Math.sin(t * 70) * 3.5 : 0;
  const armsEl = (
    <>
      <Limb d={arm([-95, -610], arms.l[0], arms.l[1])} color={N.wrap} width={44} />
      <Limb d={arm([95, -610], arms.r[0], arms.r[1])} color={N.wrap} width={44} />
      {[arms.l[1], arms.r[1]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={26} fill={N.wrap} stroke={LINE} strokeWidth={5} />)}
    </>
  );
  return (
    <g transform={`translate(${jitter} 0)`}>
      {/* legs */}
      <path d="M -80 -380 L -70 -30 Q -70 0 -30 0 L -10 0 L -10 -380 Z" fill={N.wrap} stroke={LINE} strokeWidth={6} />
      <path d="M 10 -380 L 10 0 L 30 0 Q 70 0 70 -30 L 80 -380 Z" fill={N.wrap} stroke={LINE} strokeWidth={6} />
      <WrapLines x1={-72} x2={-12} y1={-370} y2={-20} step={34} slope={6} />
      <WrapLines x1={12} x2={72} y1={-370} y2={-20} step={34} slope={6} />
      {/* torso */}
      <path d="M -100 -640 Q -125 -520 -82 -470 Q -110 -410 -90 -360 L 90 -360 Q 110 -410 82 -470 Q 125 -520 100 -640 Q 0 -670 -100 -640 Z" fill={N.wrap} stroke={LINE} strokeWidth={6} />
      <WrapLines x1={-100} x2={100} y1={-630} y2={-365} step={30} />
      
      {blanket && (
        <g>
          <path d="M -128 -655 Q 0 -715 128 -655 L 168 -330 Q 0 -295 -168 -330 Z" fill={N.blanket} stroke={LINE} strokeWidth={6} />
          <path d="M -30 -690 L -60 -320" stroke={N.blanketD} strokeWidth={5} />
          <path d="M 40 -690 L 70 -315" stroke={N.blanketD} strokeWidth={5} />
          {Array.from({ length: 15 }, (_, i) => -160 + i * 23).map((x) => (
            <path key={x} d={`M ${x} ${-322 + Math.abs(x) * 0.05} l ${Math.sin(t * 3 + x) * 3} 24`} stroke={N.blanketD} strokeWidth={5} strokeLinecap="round" />
          ))}
        </g>
      )}
      {armsEl}
      {/* loose bandage tail */}
      {!blanket && <path d={`M 110 -520 q 40 30 ${30 + Math.sin(t * 2) * 12} 90`} stroke={N.wrap} strokeWidth={14} fill="none" strokeLinecap="round" />}
      {/* collar */}
      <path d="M -82 -650 Q 0 -560 82 -650 Q 0 -620 -82 -650 Z" fill={N.gold} stroke={LINE} strokeWidth={5} />
      <path d="M -60 -640 Q 0 -585 60 -640" stroke={N.lapis} strokeWidth={9} fill="none" />
      {/* head */}
      <g transform={`rotate(${Math.sin(t * 1.1) * 2} 0 -660)`}>
        <rect x={-30} y={-690} width={60} height={50} fill={N.wrapD} stroke={LINE} strokeWidth={5} />
        <ellipse cx={0} cy={-760} rx={80} ry={96} fill={N.wrap} stroke={LINE} strokeWidth={6} />
        <WrapLines x1={-74} x2={74} y1={-845} y2={-675} step={26} slope={5} />
        <rect x={-82} y={-818} width={164} height={20} rx={8} fill={N.gold} stroke={LINE} strokeWidth={4} />
        <circle cx={0} cy={-808} r={12} fill={N.lapis} stroke={LINE} strokeWidth={3} />
        <rect x={-66} y={-782} width={132} height={44} rx={20} fill={N.slit} />
        <Eyes cx={0} y={-760} gap={30} r={12} blink={blink} expr={expr} iris={N.iris} brow={N.wrapD} browW={9} />
        {!blink && [-1, 1].map((s) => <path key={s} d={`M ${s * 44} ${-762} l ${s * 18} -10`} stroke={LINE} strokeWidth={4} />)}
        <Mouth x={0} y={-708} w={20} mouth={mouth} expr={expr} />
      </g>
      {shiver && (
        <g opacity={0.6}>
          {[0, 1].map((i) => {
            const k = (t * 0.8 + i * 0.5) % 1;
            return <ellipse key={i} cx={40 + k * 90} cy={-705 - k * 30} rx={18 + k * 30} ry={10 + k * 16} fill="#FFFFFF" opacity={0.7 * (1 - k)} />;
          })}
        </g>
      )}
    </g>
  );
};

// ---------------- Dee, the HVAC tech ----------------

const D = { skin: "#8D5A3B", beard: "#2B1D16", uniform: "#1F3A5F", uniformD: "#152a45", pants: "#22324A", boot: "#4A2F1E" };

export const Tech: React.FC<CharProps> = ({ pose, expr, mouth, blink, t, primary = "#E8541A", accent = "#FFC93C" }) => {
  const wave = Math.sin(t * 9) * 18;
  const r: [[number, number], [number, number]] =
    pose === "wave" ? [[230, -700], [240 + wave, -880]] : pose === "meter" || pose === "rod" ? [[220, -560], [150, -640]] : [[170, -540], [160, -420]];
  const l: [[number, number], [number, number]] = [[-170, -540], [-160, -420]];
  return (
    <g>
      <rect x={-95} y={-410} width={86} height={370} rx={18} fill={D.pants} stroke={LINE} strokeWidth={6} />
      <rect x={9} y={-410} width={86} height={370} rx={18} fill={D.pants} stroke={LINE} strokeWidth={6} />
      <rect x={-112} y={-55} width={106} height={55} rx={18} fill={D.boot} stroke={LINE} strokeWidth={6} />
      <rect x={6} y={-55} width={106} height={55} rx={18} fill={D.boot} stroke={LINE} strokeWidth={6} />
      <path d="M -150 -710 Q -165 -540 -125 -395 L 125 -395 Q 165 -540 150 -710 Q 0 -760 -150 -710 Z" fill={D.uniform} stroke={LINE} strokeWidth={6} />
      <rect x={-130} y={-430} width={260} height={34} fill="#3B2A1E" stroke={LINE} strokeWidth={4} />
      <rect x={60} y={-438} width={30} height={60} rx={6} fill={accent} stroke={LINE} strokeWidth={4} />
      <rect x={-95} y={-440} width={22} height={70} rx={4} fill="#9AA3AD" stroke={LINE} strokeWidth={4} />
      <circle cx={-70} cy={-620} r={30} fill={primary} stroke={LINE} strokeWidth={4} />
      <path d="M -82 -620 l 10 12 l 20 -26" stroke="#FFF" strokeWidth={7} fill="none" strokeLinecap="round" />
      <Limb d={arm([-135, -690], l[0], l[1])} color={D.uniform} width={56} />
      <Limb d={arm([135, -690], r[0], r[1])} color={D.uniform} width={56} />
      {[l[1], r[1]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={32} fill={D.skin} stroke={LINE} strokeWidth={5} />)}
      {pose === "meter" && (
        <g transform={`translate(${r[1][0] - 10} ${r[1][1] - 120})`}>
          <rect x={-45} y={-60} width={90} height={150} rx={14} fill={accent} stroke={LINE} strokeWidth={5} />
          <rect x={-32} y={-45} width={64} height={50} rx={6} fill="#0E2A1A" />
          <text x={0} y={-12} textAnchor="middle" fontSize={26} fontWeight={800} fill="#4BE38A" fontFamily="monospace">0</text>
          <text x={0} y={30} textAnchor="middle" fontSize={20} fontWeight={800} fill={LINE} fontFamily="monospace">CO ppm</text>
        </g>
      )}
      {pose === "rod" && (
        <g transform={`translate(${r[1][0]} ${r[1][1] - 20}) rotate(-35)`}>
          <rect x={-10} y={-40} width={28} height={50} rx={6} fill="#F4F1EA" stroke={LINE} strokeWidth={4} />
          <rect x={0} y={-210} width={8} height={175} fill="#B9C2CC" stroke={LINE} strokeWidth={2} />
          {[0, 1, 2].map((i) => {
            const k = (t * 1.5 + i / 3) % 1;
            return <path key={i} d={`M ${4 + (i - 1) * 26} ${-150 - i * 30} l 0 ${-16 * (1 - k)} M ${4 + (i - 1) * 26 - 8 * (1 - k)} ${-158 - i * 30} l ${16 * (1 - k)} 0`} stroke="#FFF7C2" strokeWidth={5} opacity={1 - k} />;
          })}
        </g>
      )}
      <rect x={-34} y={-760} width={68} height={60} fill={D.skin} stroke={LINE} strokeWidth={5} />
      <g transform={`rotate(${Math.sin(t * 1.4) * 1.8} 0 -740)`}>
        <ellipse cx={0} cy={-830} rx={82} ry={96} fill={D.skin} stroke={LINE} strokeWidth={6} />
        <path d="M -78 -820 Q -80 -720 0 -728 Q 80 -720 78 -820 Q 60 -770 0 -772 Q -60 -770 -78 -820 Z" fill={D.beard} />
        <path d="M -88 -880 Q -90 -960 0 -962 Q 90 -960 88 -880 Z" fill={primary} stroke={LINE} strokeWidth={5} />
        <path d="M -88 -882 Q 0 -900 120 -870 Q 110 -852 80 -858 Q 0 -872 -88 -866 Z" fill={primary} stroke={LINE} strokeWidth={5} />
        <circle cx={0} cy={-920} r={16} fill={accent} stroke={LINE} strokeWidth={3} />
        <Eyes cx={0} y={-835} gap={32} r={11} blink={blink} expr={expr} brow={D.beard} browW={10} />
        <path d="M -4 -820 Q -12 -800 2 -796" stroke={LINE} strokeWidth={4} fill="none" />
        <g>
          <Mouth x={0} y={-778} w={24} mouth={mouth} expr={expr} />
        </g>
      </g>
    </g>
  );
};
