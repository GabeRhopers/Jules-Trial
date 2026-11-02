import { Player, type PlayerRef } from "@remotion/player";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { EXPLAINER_LAYOUT, Explainer16x9 } from "../src/compositions/Explainer16x9";
import { PROMO_LAYOUT, PromoSquare1x1 } from "../src/compositions/PromoSquare1x1";
import { REEL_LAYOUT, SocialReel9x16 } from "../src/compositions/SocialReel9x16";
import { resolveVideoConfig, type ResolvedProps } from "../src/lib/load-video";
import { brands } from "../src/lib/registry";
import type { VideoConfig, VideoFormat } from "../src/lib/types";

const FORMATS: Record<VideoFormat, { component: React.FC<ResolvedProps>; layout: typeof REEL_LAYOUT }> = {
  SocialReel9x16: { component: SocialReel9x16, layout: REEL_LAYOUT },
  Explainer16x9: { component: Explainer16x9, layout: EXPLAINER_LAYOUT },
  PromoSquare1x1: { component: PromoSquare1x1, layout: PROMO_LAYOUT },
};

type Resolved = NonNullable<ResolvedProps["resolved"]>;
export type PreviewHandle = { playScene: (sceneId: string) => void };

/**
 * Live preview of the draft (unsaved) config, using the same compositions as the final render.
 * Re-resolves shortly after each edit. Scenes whose voice text changed keep their old audio until
 * the voice is regenerated; `onStale` reports which.
 */
export const Preview = forwardRef<PreviewHandle, { draft: VideoConfig; narrationVersion: number; onStale: (status: { staleScenes: string[]; orderChanged: boolean } | null) => void }>(
  ({ draft, narrationVersion, onStale }, ref) => {
    const player = useRef<PlayerRef>(null);
    const [state, setState] = useState<{ resolved?: Resolved; error?: string }>({});
    const draftKey = JSON.stringify(draft);
    const format = FORMATS[draft.format] ?? FORMATS.SocialReel9x16;

    useEffect(() => {
      const ctrl = new AbortController();
      const timer = setTimeout(async () => {
        try {
          const brand = brands[draft.brand];
          if (!brand) throw new Error(`Brand "${draft.brand}" is not loaded. New brands appear after restarting the editor.`);
          const { resolved, staleScenes, orderChanged } = await resolveVideoConfig(draft, brand, format.layout.fps, {
            abortSignal: ctrl.signal,
            allowStale: true,
            cacheBust: String(narrationVersion),
          });
          setState({ resolved });
          onStale({ staleScenes, orderChanged });
        } catch (e) {
          if (ctrl.signal.aborted) return;
          setState({ error: (e as Error).message });
          onStale(null);
        }
      }, 350);
      return () => {
        clearTimeout(timer);
        ctrl.abort();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftKey, narrationVersion]);

    useImperativeHandle(ref, () => ({
      playScene: (sceneId: string) => {
        const scene = state.resolved?.timeline.scenes.find((s) => s.id === sceneId);
        if (!scene || !player.current) return;
        player.current.seekTo(scene.startFrame + 2);
        player.current.play();
      },
    }));

    if (state.error) {
      return (
        <div className="preview-box error-box">
          <strong>The preview can't play yet</strong>
          <p>{state.error}</p>
        </div>
      );
    }
    if (!state.resolved) return <div className="preview-box">Loading preview…</div>;

    const { width, height, fps } = format.layout;
    return (
      <div className="preview-frame" style={{ aspectRatio: `${width} / ${height}` }}>
        <Player
          key={`${draft.format}-${narrationVersion}`}
          ref={player}
          component={format.component}
          inputProps={{ videoId: draft.id, brandId: draft.brand, resolved: state.resolved }}
          durationInFrames={state.resolved.timeline.durationInFrames}
          compositionWidth={width}
          compositionHeight={height}
          fps={fps}
          controls
          clickToPlay
          style={{ width: "100%", height: "100%" }}
          errorFallback={({ error }) => (
            <div className="player-error">
              <strong>This frame can't be drawn</strong>
              <p>{error.message}</p>
            </div>
          )}
        />
      </div>
    );
  },
);
Preview.displayName = "Preview";
