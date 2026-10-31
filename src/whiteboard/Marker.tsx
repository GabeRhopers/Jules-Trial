import { Img } from "remotion";
import { getBrandAsset } from "../lib/registry";
import type { Point } from "./geometry";

type Props = {
  tip: Point;
  /** Frame height, to scale the marker */
  frameHeight: number;
  ink: string;
  brandId: string;
  hand: { file: string; tipX: number; tipY: number; height: number } | null;
};

/**
 * The pen that follows the drawing. Default: a built-in marker (our own vector drawing, no third-party
 * artwork). With brand.whiteboard.hand set, a PNG of your own hand is used instead, placed so the
 * given tip position (in % of the image) sits on the line being drawn.
 */
export const Marker: React.FC<Props> = ({ tip, frameHeight, ink, brandId, hand }) => {
  const scale = frameHeight / 1080;
  if (hand) {
    return (
      <Img
        src={getBrandAsset(brandId, hand.file)}
        style={{
          position: "absolute",
          left: tip.x,
          top: tip.y,
          height: hand.height * scale,
          transform: `translate(${-hand.tipX}%, ${-hand.tipY}%)`,
          filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.25))",
          pointerEvents: "none",
        }}
      />
    );
  }
  // Drawn pointing along +x from the tip at (0,0), then rotated so the body goes down and to the right
  const len = 330 * scale;
  const w = 46 * scale;
  return (
    <svg
      style={{ position: "absolute", left: tip.x, top: tip.y, overflow: "visible", pointerEvents: "none", filter: "drop-shadow(0 14px 16px rgba(0,0,0,0.28))" }}
      width={1}
      height={1}
    >
      <g transform="rotate(38)">
        {/* felt tip */}
        <path d={`M0 0 L${w * 0.5} ${-w * 0.16} L${w * 0.5} ${w * 0.16} Z`} fill={ink} />
        {/* cone */}
        <path d={`M${w * 0.45} ${-w * 0.2} L${w * 1.25} ${-w * 0.42} L${w * 1.25} ${w * 0.42} L${w * 0.45} ${w * 0.2} Z`} fill="#D9DCE1" />
        {/* barrel */}
        <rect x={w * 1.2} y={-w / 2} width={len - w * 2.4} height={w} rx={w * 0.18} fill="#F4F5F7" stroke="#C5CAD1" strokeWidth={1.5 * scale} />
        {/* grip band in ink color, so the marker matches the line it draws */}
        <rect x={w * 1.6} y={-w / 2} width={w * 1.3} height={w} fill={ink} opacity={0.9} />
        {/* cap end */}
        <rect x={len - w * 1.3} y={-w * 0.56} width={w * 1.3} height={w * 1.12} rx={w * 0.3} fill={ink} />
        {/* highlight */}
        <rect x={w * 3.1} y={-w * 0.32} width={len - w * 4.6} height={w * 0.12} rx={w * 0.06} fill="#FFFFFF" opacity={0.8} />
      </g>
    </svg>
  );
};
