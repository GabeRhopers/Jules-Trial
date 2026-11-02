import type { SceneConfig, SceneVisual, WhiteboardItem, WhiteboardNode } from "../src/lib/types";
import { parseFlowchart } from "../src/whiteboard/flowchart";
import { checkScene } from "./checks";
import { Check, Num, Select, Text, opt } from "./fields";

type Props = {
  scene: SceneConfig;
  index: number;
  count: number;
  stale: boolean;
  onChange: (scene: SceneConfig) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onPreview: () => void;
};

export const KIND_LABELS: Record<SceneVisual["kind"], string> = {
  hook: "Hook (first 3 seconds)",
  statement: "Statement (problem / solution)",
  point: "Numbered point with a stat",
  broll: "Footage (B-roll)",
  whiteboard: "Whiteboard drawing",
  cta: "Call to action (end card)",
};

export const SceneEditor: React.FC<Props> = ({ scene, index, count, stale, onChange, onMove, onDelete, onPreview }) => {
  const v = scene.visual;
  const setVisual = (patch: Partial<SceneVisual>) => onChange({ ...scene, visual: { ...v, ...patch } as SceneVisual });
  const checks = checkScene(scene);

  return (
    <section className="scene">
      <header className="scene-head">
        <div>
          <span className="scene-num">{index + 1}</span>
          <strong>{KIND_LABELS[v.kind]}</strong>
          {stale ? <span className="badge warn">voice out of date</span> : null}
        </div>
        <div className="scene-tools">
          <button type="button" className="ghost" onClick={onPreview} title="Play this scene in the preview">
            ▶ Preview
          </button>
          <button type="button" className="ghost" disabled={index === 0} onClick={() => onMove(-1)} title="Move up">
            ↑
          </button>
          <button type="button" className="ghost" disabled={index === count - 1} onClick={() => onMove(1)} title="Move down">
            ↓
          </button>
          <button type="button" className="ghost danger" disabled={count === 1} onClick={onDelete} title="Delete scene">
            ✕
          </button>
        </div>
      </header>

      <Text
        label="What the voice says"
        hint="Changing this needs a new voice (button on the right) before the final render."
        multiline
        value={scene.text}
        onChange={(text) => onChange({ ...scene, text })}
      />

      {v.kind === "hook" ? (
        <>
          <Text label="Kicker (small label above)" value={v.kicker} onChange={(kicker) => setVisual({ kicker })} />
          <Text label="Headline" value={v.headline} onChange={(headline) => setVisual({ headline })} />
          <Check label="Show the logo above the kicker" value={v.logo} onChange={(logo) => setVisual({ logo: logo || undefined })} />
        </>
      ) : null}

      {v.kind === "statement" ? (
        <>
          <Text label="Kicker (optional)" value={v.kicker} onChange={(k) => setVisual({ kicker: opt(k) })} />
          <Text label="Headline" value={v.headline} onChange={(headline) => setVisual({ headline })} />
          <Text label="Supporting line (optional)" multiline rows={2} value={v.body} onChange={(b) => setVisual({ body: opt(b) })} />
        </>
      ) : null}

      {v.kind === "point" ? (
        <>
          <div className="row">
            <Num label="Number" value={v.number} min={1} onChange={(n) => setVisual({ number: n ?? 1 })} />
            <Text label="Headline" value={v.headline} onChange={(headline) => setVisual({ headline })} />
          </div>
          <Check
            label="Show a counting stat"
            value={!!v.stat}
            onChange={(on) => setVisual({ stat: on ? { prefix: "", value: 0, suffix: "", label: "" } : undefined })}
          />
          {v.stat ? (
            <div className="row">
              <Text label="Before" value={v.stat.prefix} placeholder="$" onChange={(prefix) => setVisual({ stat: { ...v.stat!, prefix } })} />
              <Num label="Number" value={v.stat.value} onChange={(value) => setVisual({ stat: { ...v.stat!, value: value ?? 0 } })} />
              <Text label="After" value={v.stat.suffix} placeholder="%" onChange={(suffix) => setVisual({ stat: { ...v.stat!, suffix } })} />
              <Text label="Label" value={v.stat.label} onChange={(label) => setVisual({ stat: { ...v.stat!, label } })} />
            </div>
          ) : null}
          <Text label="Proof line (optional)" value={v.proof} onChange={(p) => setVisual({ proof: opt(p) })} />
        </>
      ) : null}

      {v.kind === "broll" ? (
        <>
          <Text label="Footage file in public/" hint='e.g. broll/my-video/shot-1.mp4' value={v.src} onChange={(s) => setVisual({ src: opt(s) })} />
          <Text label="Shot description (shown while the file is missing)" multiline rows={2} value={v.prompt} onChange={(p) => setVisual({ prompt: opt(p) })} />
          <Text label="Headline over the footage (optional)" value={v.headline} onChange={(h) => setVisual({ headline: opt(h) })} />
          <div className="row">
            <Text
              label="Lower third title (optional)"
              value={v.lowerThird?.title}
              onChange={(t) => setVisual({ lowerThird: opt(t) ? { ...v.lowerThird, title: t } : undefined })}
            />
            <Text
              label="Lower third subtitle"
              value={v.lowerThird?.subtitle}
              onChange={(s) => v.lowerThird && setVisual({ lowerThird: { ...v.lowerThird, subtitle: opt(s) } })}
            />
          </div>
        </>
      ) : null}

      {v.kind === "cta" ? (
        <>
          <p className="note">Leave a field empty to use the brand's default call to action.</p>
          <Text label="Headline" value={v.headline} onChange={(h) => setVisual({ headline: opt(h) })} />
          <Text label="Button" value={v.button} onChange={(b) => setVisual({ button: opt(b) })} />
          <Text label="Line under the button" hint="Phone number, area, offer" value={v.subline} onChange={(s) => setVisual({ subline: opt(s) })} />
        </>
      ) : null}

      {v.kind === "whiteboard" ? <WhiteboardFields visual={v} onChange={setVisual} /> : null}

      {checks.length ? (
        <ul className="checks">
          {checks.map((c, i) => (
            <li key={i} className={c.level}>
              {c.level === "error" ? "⛔" : "💡"} {c.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};

type WB = Extract<SceneVisual, { kind: "whiteboard" }>;

const WhiteboardFields: React.FC<{ visual: WB; onChange: (patch: Partial<WB>) => void }> = ({ visual, onChange }) => {
  const layout = visual.layout ?? "flow";
  const items = visual.items ?? [];
  const setItem = (i: number, patch: Partial<WhiteboardItem>) => onChange({ items: items.map((it, k) => (k === i ? { ...it, ...patch } : it)) });

  let nodeIds: { id: string; label: string }[] = [];
  try {
    nodeIds = parseFlowchart(visual.diagram ?? "").nodes.map((n) => ({ id: n.id, label: n.label }));
  } catch {
    // The error is shown in the checks list
  }
  const setNode = (id: string, patch: Partial<WhiteboardNode>) => {
    const next = { ...(visual.nodes ?? {}), [id]: { ...(visual.nodes?.[id] ?? {}), ...patch } };
    // Drop empty option objects so config.json stays tidy
    for (const [k, o] of Object.entries(next)) if (Object.values(o).every((x) => x === undefined || x === false)) delete next[k];
    onChange({ nodes: Object.keys(next).length ? next : undefined });
  };

  return (
    <>
      <Text label="Handwritten title (optional)" value={visual.title} onChange={(t) => onChange({ title: opt(t) })} />
      <Select
        label="Layout"
        value={layout}
        options={[
          { value: "flow", label: "Row of drawings joined by arrows (process)" },
          { value: "free", label: "Drawings placed freely" },
          { value: "diagram", label: "Flowchart with decisions (Mermaid)" },
        ]}
        onChange={(l) => {
          const next = l as WB["layout"];
          if (next === "diagram" && !visual.diagram) {
            onChange({ layout: next, diagram: "flowchart TD\n  A{Question?} -->|Yes| B[Do this]\n  A -->|No| C[Do that]" });
          } else onChange({ layout: next, items: next !== "diagram" && !visual.items?.length ? [{ icon: "bulb", label: "Idea" }] : visual.items });
        }}
      />

      {layout === "diagram" ? (
        <>
          <Text
            label="Flowchart (Mermaid)"
            hint="Boxes: A[Box] A{Decision?} A([Pill]) A((Circle)). Arrows: A -->|Yes| B. Top-down: flowchart TD; left-right: flowchart LR."
            multiline
            rows={6}
            mono
            value={visual.diagram}
            onChange={(diagram) => onChange({ diagram })}
          />
          {nodeIds.length ? (
            <table className="nodes">
              <thead>
                <tr>
                  <th>Box</th>
                  <th>Cue word</th>
                  <th>Icon</th>
                  <th>Highlight</th>
                </tr>
              </thead>
              <tbody>
                {nodeIds.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <code>{n.id}</code> {n.label}
                    </td>
                    <td>
                      <input type="text" value={visual.nodes?.[n.id]?.at ?? ""} onChange={(e) => setNode(n.id, { at: opt(e.target.value) })} />
                    </td>
                    <td>
                      <input type="text" value={visual.nodes?.[n.id]?.icon ?? ""} placeholder="optional" onChange={(e) => setNode(n.id, { icon: opt(e.target.value) })} />
                    </td>
                    <td className="center">
                      <input type="checkbox" checked={!!visual.nodes?.[n.id]?.highlight} onChange={(e) => setNode(n.id, { highlight: e.target.checked || undefined })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </>
      ) : (
        <>
          {items.map((it, i) => (
            <div className="item" key={i}>
              <div className="row">
                <Text label={`Drawing ${i + 1}: icon`} hint="Tabler icon name (tabler.io/icons)" value={it.icon} onChange={(icon) => setItem(i, { icon: opt(icon) })} />
                <Text label="Label" value={it.label} onChange={(label) => setItem(i, { label: opt(label) })} />
                <Text label="Cue word" hint="Spoken word that starts it" value={it.at} onChange={(at) => setItem(i, { at: opt(at) })} />
              </div>
              <div className="row">
                <Check label="Circle it" value={it.circle} onChange={(circle) => setItem(i, { circle: circle || undefined })} />
                {layout === "free" ? (
                  <>
                    <Num label="Left-right %" value={it.x} min={0} max={100} onChange={(x) => setItem(i, { x })} />
                    <Num label="Top-bottom %" value={it.y} min={0} max={100} onChange={(y) => setItem(i, { y })} />
                    <Num label="Size %" value={it.size} min={5} max={60} onChange={(size) => setItem(i, { size })} />
                  </>
                ) : null}
                <button type="button" className="ghost danger" onClick={() => onChange({ items: items.filter((_, k) => k !== i) })}>
                  Remove drawing
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="ghost" onClick={() => onChange({ items: [...items, { icon: "bulb", label: "" }] })}>
            + Add drawing
          </button>
        </>
      )}
    </>
  );
};
