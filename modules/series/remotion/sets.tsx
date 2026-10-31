// Backgrounds for COLD FEET, drawn on a 1080x1920 stage (with margins so camera moves never show an edge).
const LINE = "#1B1A22";
export const GROUND = 1450;
export const CO_ALARM = { x: 560, y: 330 };
export const FURNACE = { x: 540, y: 1080 };

const Stars: React.FC<{ t: number; x: number; y: number; w: number; h: number }> = ({ t, x, y, w, h }) => (
  <>
    {Array.from({ length: 14 }, (_, i) => {
      const sx = x + ((i * 97) % w);
      const sy = y + ((i * 53) % h);
      return <circle key={i} cx={sx} cy={sy} r={i % 3 === 0 ? 4 : 2.5} fill="#FFFFFF" opacity={0.5 + 0.5 * Math.sin(t * 2 + i)} />;
    })}
  </>
);

export const LivingRoom: React.FC<{ t: number; cold: boolean; warm: boolean; chirp: boolean }> = ({ t, cold, warm, chirp }) => (
  <g>
    <rect x={-500} y={-400} width={2080} height={GROUND + 400} fill="#34405E" />
    {Array.from({ length: 22 }, (_, i) => -480 + i * 100).map((x) => <rect key={x} x={x} y={-400} width={40} height={GROUND + 400} fill="#3A4766" />)}
    <rect x={-500} y={GROUND - 70} width={2080} height={2600} fill="#6B4A35" />
    {Array.from({ length: 12 }, (_, i) => GROUND + i * 70).map((y) => <path key={y} d={`M -500 ${y} L 1580 ${y}`} stroke="#5A3D2B" strokeWidth={5} />)}
    <rect x={-500} y={GROUND - 95} width={2080} height={30} fill="#E8E0D0" />
    {/* window */}
    <rect x={110} y={420} width={360} height={430} rx={8} fill="#0F1A33" stroke="#E8E0D0" strokeWidth={18} />
    <Stars t={t} x={130} y={440} w={320} h={380} />
    <circle cx={370} cy={520} r={52} fill="#F4EBC6" />
    <circle cx={392} cy={505} r={46} fill="#0F1A33" />
    <path d="M 290 430 L 290 850 M 110 635 L 470 635" stroke="#E8E0D0" strokeWidth={12} />
    {cold && (
      <g opacity={0.55}>
        <path d="M 120 850 Q 200 790 290 845 Q 380 800 465 845 L 465 845 L 120 845 Z" fill="#DDEBFF" />
        <path d="M 120 430 l 60 0 l -60 50 Z M 465 430 l -70 0 l 70 60 Z" fill="#DDEBFF" />
      </g>
    )}
    <path d="M 70 400 Q 60 650 90 900 L 150 900 Q 120 650 140 400 Z" fill="#8E3B46" stroke={LINE} strokeWidth={5} />
    <path d="M 510 400 Q 520 650 490 900 L 430 900 Q 460 650 440 400 Z" fill="#8E3B46" stroke={LINE} strokeWidth={5} />
    {/* thermostat */}
    <rect x={850} y={700} width={130} height={170} rx={20} fill="#ECEFF2" stroke={LINE} strokeWidth={5} />
    <rect x={868} y={725} width={94} height={70} rx={8} fill={warm ? "#3A1E10" : "#0F2235"} />
    <text x={915} y={775} textAnchor="middle" fontSize={40} fontWeight={800} fontFamily="monospace" fill={warm ? "#FFB35C" : "#7FD1FF"}>{warm ? "70°" : "58°"}</text>
    <circle cx={915} cy={830} r={18} fill="#C8CDD3" stroke={LINE} strokeWidth={4} />
    {/* CO alarm */}
    <circle cx={CO_ALARM.x} cy={CO_ALARM.y} r={44} fill="#F5F5F0" stroke={LINE} strokeWidth={5} />
    <text x={CO_ALARM.x} y={CO_ALARM.y + 8} textAnchor="middle" fontSize={22} fontWeight={800} fill="#55606B" fontFamily="sans-serif">CO</text>
    <circle cx={CO_ALARM.x + 24} cy={CO_ALARM.y - 22} r={8} fill={chirp ? "#FF3B30" : "#3DDC84"} />
    {chirp && <circle cx={CO_ALARM.x + 24} cy={CO_ALARM.y - 22} r={22} fill="#FF3B30" opacity={0.35} />}
    {/* lamp */}
    <rect x={960} y={1000} width={14} height={360} fill="#3B3B3B" />
    <path d="M 900 1000 L 1034 1000 L 1004 900 L 930 900 Z" fill={warm ? "#FFE3A3" : "#E9D9B0"} stroke={LINE} strokeWidth={5} />
    {/* couch behind the characters */}
    <rect x={120} y={1130} width={840} height={230} rx={50} fill="#5E3A63" stroke={LINE} strokeWidth={6} />
    <rect x={160} y={1220} width={760} height={150} rx={30} fill="#734877" stroke={LINE} strokeWidth={6} />
  </g>
);

export const Furnace: React.FC<{ t: number; on: boolean }> = ({ t, on }) => {
  const { x } = FURNACE;
  return (
    <g>
      <rect x={x - 70} y={-400} width={140} height={790} fill="#9AA3AD" stroke={LINE} strokeWidth={6} />
      <rect x={x - 200} y={760} width={400} height={640} rx={14} fill="#B7BEC6" stroke={LINE} strokeWidth={7} />
      <rect x={x - 200} y={720} width={400} height={50} fill="#A3ABB4" stroke={LINE} strokeWidth={6} />
      <path d={`M ${x - 200} 1000 L ${x + 200} 1000`} stroke={LINE} strokeWidth={5} />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={x - 140 + i * 60} y={860} width={36} height={8} rx={4} fill="#7F8892" />)}
      <rect x={x - 70} y={1130} width={140} height={90} rx={10} fill="#141018" stroke={LINE} strokeWidth={6} />
      {on && (
        <g>
          <ellipse cx={x} cy={1200} rx={64} ry={18} fill="#2E8BFF" opacity={0.85} />
          {[-40, -15, 10, 35].map((dx, i) => (
            <path
              key={dx}
              d={`M ${x + dx - 10} 1205 Q ${x + dx + Math.sin(t * 25 + i) * 8} ${1150 - Math.abs(Math.sin(t * 18 + i * 2)) * 18} ${x + dx + 10} 1205 Z`}
              fill={i % 2 ? "#FFB020" : "#3D8BFF"}
            />
          ))}
          <ellipse cx={x} cy={1175} rx={140} ry={80} fill="#FF9A3C" opacity={0.18} />
        </g>
      )}
      <rect x={x - 90} y={1270} width={180} height={50} rx={6} fill="#ECEFF2" stroke={LINE} strokeWidth={4} />
      <text x={x} y={1305} textAnchor="middle" fontSize={28} fontWeight={800} fill="#3B4450" fontFamily="sans-serif">FURNACE</text>
    </g>
  );
};

export const Basement: React.FC<{ t: number; furnaceOn: boolean; puddle: boolean }> = ({ t, furnaceOn, puddle }) => (
  <g>
    <rect x={-500} y={-400} width={2080} height={GROUND + 400} fill="#5B5F66" />
    {Array.from({ length: 24 }, (_, r) => r).map((r) =>
      Array.from({ length: 12 }, (_, c) => c).map((c) => (
        <rect key={`${r}-${c}`} x={-500 + c * 190 + (r % 2) * 95} y={-400 + r * 80} width={186} height={76} fill="none" stroke="#50545B" strokeWidth={4} />
      )),
    )}
    <rect x={-500} y={GROUND - 60} width={2080} height={2600} fill="#44474D" />
    <path d={`M -500 ${GROUND - 60} L 1580 ${GROUND - 60}`} stroke="#33363B" strokeWidth={8} />
    {/* pipes */}
    <path d="M -500 300 L 1580 300" stroke="#8A6E4B" strokeWidth={26} />
    <path d="M -500 360 L 1580 360" stroke="#7D838B" strokeWidth={18} />
    {/* stairs */}
    {Array.from({ length: 8 }, (_, i) => i).map((i) => (
      <rect key={i} x={860 + i * 60} y={GROUND - 120 - i * 110} width={600} height={30} fill="#8C6A4A" stroke={LINE} strokeWidth={4} />
    ))}
    <path d={`M 860 ${GROUND - 60} L 1340 ${GROUND - 950}`} stroke="#6E513A" strokeWidth={24} />
    {/* water heater (sets up episode 3) */}
    <rect x={-60} y={850} width={210} height={540} rx={100} fill="#C9CED6" stroke={LINE} strokeWidth={6} />
    <rect x={-20} y={1150} width={130} height={60} rx={8} fill="#ECEFF2" stroke={LINE} strokeWidth={4} />
    <text x={45} y={1190} textAnchor="middle" fontSize={22} fontWeight={800} fill="#3B4450" fontFamily="sans-serif">WATER</text>
    <Furnace t={t} on={furnaceOn} />
    {puddle && (
      <g>
        <ellipse cx={170} cy={GROUND + 10} rx={330} ry={46} fill="#5BA7E6" opacity={0.7} />
        <ellipse cx={120} cy={GROUND} rx={120} ry={14} fill="#CDE9FF" opacity={0.6} />
        {[0, 1].map((i) => {
          const k = (t * 0.9 + i * 0.5) % 1;
          return <ellipse key={i} cx={60 + i * 120} cy={GROUND + 10} rx={30 + k * 90} ry={6 + k * 14} fill="none" stroke="#E6F4FF" strokeWidth={4} opacity={1 - k} />;
        })}
      </g>
    )}
  </g>
);

export const Snow: React.FC<{ t: number }> = ({ t }) => (
  <g>
    {Array.from({ length: 70 }, (_, i) => {
      const x = ((i * 137) % 1500) - 200 + Math.sin(t * 1.2 + i) * 30;
      const y = (((i * 211) % 2200) + t * (60 + (i % 5) * 25)) % 2200 - 300;
      return <circle key={i} cx={x} cy={y} r={4 + (i % 4) * 2} fill="#FFFFFF" opacity={0.85} />;
    })}
  </g>
);

export const Van: React.FC<{ x: number; primary: string; accent: string; name: string }> = ({ x, primary, accent, name }) => (
  <g transform={`translate(${x} ${GROUND - 330})`}>
    <path d="M 0 60 L 0 280 L 520 280 L 520 150 L 440 40 L 360 30 L 0 30 Z" fill="#F7F7F5" stroke={LINE} strokeWidth={7} />
    <path d="M 365 50 L 430 50 L 495 145 L 365 145 Z" fill="#9FD3F2" stroke={LINE} strokeWidth={5} />
    <rect x={0} y={170} width={520} height={44} fill={primary} />
    <text x={180} y={140} textAnchor="middle" fontSize={44} fontWeight={800} fill={LINE} fontFamily="sans-serif">{name.toUpperCase()}</text>
    <text x={180} y={204} textAnchor="middle" fontSize={30} fontWeight={800} fill="#FFFFFF" fontFamily="sans-serif">HEATING · COOLING</text>
    <circle cx={500} cy={235} r={14} fill={accent} />
    {[110, 420].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy={285} r={58} fill="#1E1E24" stroke={LINE} strokeWidth={6} />
        <circle cx={cx} cy={285} r={24} fill="#9AA3AD" />
      </g>
    ))}
  </g>
);

export const Outside: React.FC<{ t: number; powerOn: boolean }> = ({ t, powerOn }) => (
  <g>
    <rect x={-500} y={-400} width={2080} height={GROUND + 400} fill="#13203F" />
    <Stars t={t} x={-100} y={-200} w={1300} h={600} />
    <circle cx={880} cy={260} r={80} fill="#F4EBC6" />
    {/* house */}
    <path d="M 60 700 L 540 360 L 1020 700 Z" fill="#4A2E3A" stroke={LINE} strokeWidth={7} />
    <path d="M 40 710 L 540 340 L 1040 710" stroke="#FFFFFF" strokeWidth={22} fill="none" opacity={0.85} />
    <rect x={120} y={700} width={840} height={720} fill="#6C5A7A" stroke={LINE} strokeWidth={7} />
    {[200, 700].map((wx) => (
      <rect key={wx} x={wx} y={800} width={180} height={200} rx={6} fill={powerOn ? "#FFD98A" : "#1C2238"} stroke="#E8E0D0" strokeWidth={10} />
    ))}
    <rect x={460} y={1080} width={160} height={340} rx={10} fill="#3A2530" stroke={LINE} strokeWidth={6} />
    <rect x={-500} y={GROUND - 60} width={2080} height={2600} fill="#E8F0FA" />
    <path d={`M -500 ${GROUND - 60} Q 300 ${GROUND - 100} 1580 ${GROUND - 50}`} stroke="#FFFFFF" strokeWidth={30} fill="none" />
  </g>
);
