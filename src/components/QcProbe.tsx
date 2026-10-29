import { useEffect, useState } from "react";
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import type { Rect } from "../lib/safe-zones";

type Props = {
  /** Area every [data-qc] element must stay inside */
  safe: Rect;
  /** Optional strip that must stay clear (e.g. the Reels right-side action rail) */
  keepClear?: Rect;
  ready: boolean;
};

/**
 * Quality-check probe, only mounted when the composition gets `qc: true`.
 * After each frame lays out, it measures every element marked `data-qc` and logs one
 * `QC {...}` line to the browser console. scripts/qc.ts collects these lines.
 */
export const QcProbe: React.FC<Props> = ({ safe, keepClear, ready }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const [handle] = useState(() => ({ current: null as number | null }));

  useEffect(() => {
    if (!ready) return;
    const h = delayRender(`QC measure frame ${frame}`);
    handle.current = h;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const issues: string[] = [];
        document.querySelectorAll<HTMLElement>("[data-qc]").forEach((el) => {
          const name = el.dataset.qc!;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          const opacity = Number(getComputedStyle(el).opacity);
          if (opacity < 0.05) return;
          const out =
            r.left < safe.x - 1 ||
            r.top < safe.y - 1 ||
            r.right > safe.x + safe.width + 1 ||
            r.bottom > safe.y + safe.height + 1;
          if (out) issues.push(`${name} outside safe zone [${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)}]`);
          if (keepClear && r.right > keepClear.x && r.bottom > keepClear.y && r.left < keepClear.x + keepClear.width && r.top < keepClear.y + keepClear.height) {
            issues.push(`${name} overlaps keep-clear strip`);
          }
          if (r.right > width || r.bottom > height || r.left < 0 || r.top < 0) issues.push(`${name} outside frame`);
          if (el.scrollWidth > el.clientWidth + 1) issues.push(`${name} text overflows its box`);
        });
        const captions = document.querySelector<HTMLElement>("[data-qc=captions]");
        const active = document.querySelector<HTMLElement>("[data-qc-active]");
        console.log(
          "QC " +
            JSON.stringify({
              frame,
              issues,
              page: captions?.dataset.qcPage ?? null,
              active: active?.dataset.qcActive ?? null,
              captionFontPx: captions ? parseFloat(getComputedStyle(captions).fontSize) : null,
            }),
        );
        continueRender(h);
      }),
    );
  }, [frame, ready, safe, keepClear, width, height, handle]);

  return null;
};
