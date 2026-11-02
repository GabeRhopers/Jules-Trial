import { useCallback, useEffect, useRef, useState } from "react";
import { brands } from "../src/lib/registry";
import type { SceneConfig, SceneVisual, VideoConfig, VideoFormat } from "../src/lib/types";
import { api, type Job, type JobType, type NarrationStatus, type RenderStatus, type VideoSummary } from "./api";
import { checkVideo } from "./checks";
import { Select, Text, opt } from "./fields";
import { Preview, type PreviewHandle } from "./Preview";
import { KIND_LABELS, SceneEditor } from "./SceneEditor";

const NEW_SCENE: Record<SceneVisual["kind"], () => SceneVisual> = {
  hook: () => ({ kind: "hook", kicker: "Kicker", headline: "Headline" }),
  statement: () => ({ kind: "statement", headline: "Headline" }),
  point: () => ({ kind: "point", number: 1, headline: "Headline" }),
  broll: () => ({ kind: "broll", prompt: "Describe the shot" }),
  whiteboard: () => ({ kind: "whiteboard", title: "Title", layout: "flow", items: [{ icon: "bulb", label: "Idea" }] }),
  cta: () => ({ kind: "cta" }),
};

const JOB_LABELS: Record<JobType, string> = {
  "narrate-kokoro": "Making the voice (free Kokoro)",
  "narrate-placeholder": "Making a silent test voice",
  qc: "Running the quality check",
  render: "Rendering the final video",
};

export const App: React.FC = () => {
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [selected, setSelected] = useState<string>(() => decodeURIComponent(location.hash.slice(1)));
  const [saved, setSaved] = useState<VideoConfig | null>(null);
  const [draft, setDraft] = useState<VideoConfig | null>(null);
  const [narration, setNarration] = useState<NarrationStatus | null>(null);
  const [render, setRender] = useState<RenderStatus>(null);
  const [stale, setStale] = useState<{ staleScenes: string[]; orderChanged: boolean } | null>(null);
  const [narrationVersion, setNarrationVersion] = useState(0);
  const [kokoro, setKokoro] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string; details?: string[] } | null>(null);
  const [newKind, setNewKind] = useState<SceneVisual["kind"]>("statement");
  const preview = useRef<PreviewHandle>(null);

  const dirty = !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    api.videos().then((list) => {
      setVideos(list);
      if (!selected && list[0]) setSelected(list[0].id);
    });
    api.status().then((s) => setKokoro(s.kokoroInstalled));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async (id: string) => {
    const v = await api.video(id);
    setSaved(v.config);
    setDraft(v.config);
    setNarration(v.narration);
    setRender(v.render);
    setMessage(null);
  }, []);

  useEffect(() => {
    if (!selected) return;
    location.hash = selected;
    load(selected).catch((e) => setMessage({ kind: "error", text: (e as Error).message }));
  }, [selected, load]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!draft) return false;
    try {
      const res = await api.save(draft);
      setSaved(draft);
      setNarration(res.narration);
      setMessage({ kind: "ok", text: "Saved." });
      return true;
    } catch (e) {
      const err = e as Error & { details?: string[] };
      setMessage({ kind: "error", text: err.message, details: err.details });
      return false;
    }
  }, [draft]);

  // Ctrl/Cmd + S saves
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const runJob = async (type: JobType) => {
    if (!draft) return;
    if (dirty && !(await save())) return;
    try {
      let current = await api.startJob(draft.id, type);
      setJob(current);
      while (current.status === "running") {
        await new Promise((r) => setTimeout(r, 1000));
        current = await api.job(current.id);
        setJob(current);
      }
      const v = await api.video(draft.id);
      setNarration(v.narration);
      setRender(v.render);
      if (type.startsWith("narrate") && current.status === "done") setNarrationVersion((n) => n + 1);
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    }
  };

  if (!draft) {
    return <div className="loading">{message ? message.text : "Loading…"}</div>;
  }

  const setScene = (i: number, scene: SceneConfig) => setDraft({ ...draft, scenes: draft.scenes.map((s, k) => (k === i ? scene : s)) });
  const moveScene = (i: number, dir: -1 | 1) => {
    const scenes = [...draft.scenes];
    [scenes[i], scenes[i + dir]] = [scenes[i + dir], scenes[i]];
    setDraft({ ...draft, scenes });
  };
  const deleteScene = (i: number) => {
    if (confirm(`Delete scene ${i + 1} ("${draft.scenes[i].id}")?`)) setDraft({ ...draft, scenes: draft.scenes.filter((_, k) => k !== i) });
  };
  const addScene = () => {
    let n = draft.scenes.length + 1;
    while (draft.scenes.some((s) => s.id === `scene-${n}`)) n++;
    const scene: SceneConfig = { id: `scene-${n}`, text: "TODO: write what the voice says.", visual: NEW_SCENE[newKind]() };
    // New scenes go before the call to action, if the video ends with one
    const last = draft.scenes[draft.scenes.length - 1];
    const at = last?.visual.kind === "cta" && newKind !== "cta" ? draft.scenes.length - 1 : draft.scenes.length;
    setDraft({ ...draft, scenes: [...draft.scenes.slice(0, at), scene, ...draft.scenes.slice(at)] });
  };

  const staleIds = stale?.staleScenes ?? narration?.staleScenes ?? [];
  const orderChanged = stale?.orderChanged ?? false;
  const videoChecks = checkVideo(draft);
  const busy = job?.status === "running";

  return (
    <div className="app">
      <header className="topbar">
        <div className="brandmark">🎬 Video editor</div>
        <select className="video-pick" value={selected} onChange={(e) => (!dirty || confirm("Discard unsaved changes?")) && setSelected(e.target.value)}>
          {videos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.id} · {v.brand} · {v.format}
            </option>
          ))}
        </select>
        <div className="spacer" />
        {dirty ? <span className="badge warn">Unsaved changes</span> : <span className="badge ok">All saved</span>}
        <button type="button" disabled={!dirty} onClick={() => setDraft(saved)} className="ghost">
          Undo changes
        </button>
        <button type="button" disabled={!dirty} onClick={save} className="primary">
          Save (Ctrl+S)
        </button>
      </header>

      {message ? (
        <div className={`message ${message.kind}`}>
          {message.text}
          {message.details?.length ? (
            <ul>
              {message.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
          <button type="button" className="ghost" onClick={() => setMessage(null)}>
            ✕
          </button>
        </div>
      ) : null}

      <main className="columns">
        <div className="form">
          <section className="scene">
            <header className="scene-head">
              <strong>Video settings</strong>
            </header>
            <Text label="Title (for your list only)" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
            <div className="row">
              <Select
                label="Brand"
                value={draft.brand}
                options={Object.values(brands).map((b) => ({ value: b.id, label: b.displayName }))}
                onChange={(brand) => setDraft({ ...draft, brand })}
              />
              <Select
                label="Format"
                value={draft.format}
                options={[
                  { value: "SocialReel9x16", label: "Reel 9:16 (Instagram, TikTok, Shorts)" },
                  { value: "Explainer16x9", label: "Explainer 16:9 (website, YouTube)" },
                  { value: "PromoSquare1x1", label: "Square 1:1 (feed post)" },
                ]}
                onChange={(format) => setDraft({ ...draft, format: format as VideoFormat })}
              />
            </div>
            <div className="row">
              <Text label="Word on numbered points" placeholder="Point" value={draft.pointLabel} onChange={(p) => setDraft({ ...draft, pointLabel: opt(p) })} />
              <Text label="Audience (notes)" value={draft.audience} onChange={(a) => setDraft({ ...draft, audience: opt(a) })} />
            </div>
            {videoChecks.length ? (
              <ul className="checks">
                {videoChecks.map((c, i) => (
                  <li key={i} className={c.level}>
                    {c.level === "error" ? "⛔" : "💡"} {c.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {draft.scenes.map((scene, i) => (
            <SceneEditor
              key={i}
              scene={scene}
              index={i}
              count={draft.scenes.length}
              stale={staleIds.includes(scene.id)}
              onChange={(s) => setScene(i, s)}
              onMove={(dir) => moveScene(i, dir)}
              onDelete={() => deleteScene(i)}
              onPreview={() => preview.current?.playScene(scene.id)}
            />
          ))}

          <div className="add-scene">
            <select value={newKind} onChange={(e) => setNewKind(e.target.value as SceneVisual["kind"])}>
              {Object.entries(KIND_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <button type="button" className="ghost" onClick={addScene}>
              + Add scene
            </button>
          </div>
        </div>

        <aside className="side">
          <Preview ref={preview} draft={draft} narrationVersion={narrationVersion} onStale={setStale} />

          {staleIds.length ? (
            <div className="message warn">
              The voice is out of date for: <strong>{staleIds.join(", ")}</strong>. The preview plays the old voice (or silence, for new scenes) there.
              Make a new voice before the final render.
            </div>
          ) : orderChanged ? (
            <div className="message warn">
              Scenes were added, removed or reordered. Click <strong>Make voice</strong> once before the final render (unchanged scenes are reused, so it
              is quick).
            </div>
          ) : null}

          <div className="actions">
            <button type="button" disabled={busy || !kokoro} onClick={() => runJob("narrate-kokoro")} title={kokoro ? "" : "Kokoro is not installed (README step 2)"}>
              🎙 Make voice (free)
            </button>
            <button type="button" disabled={busy} onClick={() => runJob("narrate-placeholder")}>
              🔇 Silent test voice
            </button>
            <button type="button" disabled={busy} onClick={() => runJob("qc")}>
              ✅ Quality check
            </button>
            <button type="button" disabled={busy} className="primary" onClick={() => runJob("render")}>
              🎞 Render final video
            </button>
          </div>
          <p className="note">
            Buttons save first. Premium ElevenLabs voices cost credits, so they are not run from here: ask Claude, which shows the cost first.
            {!kokoro ? " The free Kokoro voice is not installed on this computer (README step 2)." : ""}
          </p>

          {job ? (
            <div className={`job ${job.status}`}>
              <div className="job-head">
                {job.status === "running" ? "⏳" : job.status === "done" ? "✔" : "✖"} {JOB_LABELS[job.type]}
                {job.status === "running" ? "…" : job.status === "done" ? ": done" : ": failed"}
              </div>
              <pre>{job.log.split("\n").slice(-14).join("\n")}</pre>
            </div>
          ) : null}

          {render ? (
            <div className="output">
              Last render: {render.sizeMb} MB, {new Date(render.renderedAt).toLocaleString()}{" "}
              <a href={render.url} download>
                Download MP4
              </a>
            </div>
          ) : null}
        </aside>
      </main>
    </div>
  );
};
