import { createRoot } from "react-dom/client";
import { App } from "./App";

const css = `
:root { --bg:#f5f6f8; --card:#fff; --line:#e1e4ea; --text:#1d2330; --muted:#667085; --primary:#2563eb; --warn:#b54708; --warnbg:#fff7e6; --err:#b42318; --errbg:#fef3f2; --ok:#067647; --okbg:#ecfdf3; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
.loading { padding:40px; }
.topbar { position:sticky; top:0; z-index:5; display:flex; gap:10px; align-items:center; padding:10px 16px; background:var(--card); border-bottom:1px solid var(--line); }
.brandmark { font-weight:700; }
.video-pick { min-width:280px; }
.spacer { flex:1; }
.columns { display:grid; grid-template-columns:minmax(380px,1fr) minmax(320px,520px); gap:16px; padding:16px; align-items:start; }
@media (max-width: 900px) { .columns { grid-template-columns:1fr; } .side { position:static !important; } }
.form { display:flex; flex-direction:column; gap:12px; }
.side { position:sticky; top:62px; display:flex; flex-direction:column; gap:10px; }
.scene { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:10px; }
.scene-head { display:flex; justify-content:space-between; align-items:center; gap:8px; }
.scene-num { display:inline-grid; place-items:center; width:22px; height:22px; border-radius:50%; background:var(--text); color:#fff; font-size:12px; margin-right:8px; }
.scene-tools { display:flex; gap:4px; }
.field { display:flex; flex-direction:column; gap:4px; flex:1; min-width:0; }
.field-label { font-weight:600; font-size:13px; }
.field-hint, .note { color:var(--muted); font-size:12px; margin:0; }
input[type=text], input[type=number], textarea, select { font:inherit; padding:7px 9px; border:1px solid var(--line); border-radius:7px; background:#fff; width:100%; }
textarea { resize:vertical; }
textarea.mono { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:13px; }
.row { display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; }
.check { display:flex; gap:6px; align-items:center; font-weight:500; }
button { white-space:nowrap; font:inherit; padding:7px 12px; border-radius:7px; border:1px solid var(--line); background:#fff; cursor:pointer; }
button:disabled { opacity:.45; cursor:not-allowed; }
button.primary { background:var(--primary); border-color:var(--primary); color:#fff; font-weight:600; }
button.ghost { background:transparent; }
button.danger { color:var(--err); }
.badge { white-space:nowrap; font-size:12px; padding:2px 8px; border-radius:999px; margin-left:8px; }
.badge.warn { background:var(--warnbg); color:var(--warn); }
.badge.ok { background:var(--okbg); color:var(--ok); }
.checks { margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:4px; font-size:13px; }
.checks .error { color:var(--err); }
.checks .tip { color:var(--muted); }
.item { border:1px dashed var(--line); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:8px; }
table.nodes { width:100%; border-collapse:collapse; font-size:13px; }
table.nodes th { text-align:left; color:var(--muted); font-weight:600; padding:4px; }
table.nodes td { padding:4px; vertical-align:middle; }
table.nodes .center { text-align:center; }
.add-scene { display:flex; gap:8px; }
.add-scene select { width:auto; }
.preview-frame { width:100%; max-height:66vh; margin:0 auto; background:#000; border-radius:10px; overflow:hidden; }
.preview-box { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:24px; text-align:center; color:var(--muted); }
.error-box { color:var(--err); background:var(--errbg); text-align:left; }
.player-error { position:absolute; inset:0; display:grid; place-content:center; padding:24px; background:var(--errbg); color:var(--err); font-size:28px; text-align:center; }
.actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.message { position:relative; margin:12px 16px 0; padding:10px 36px 10px 12px; border-radius:8px; background:var(--okbg); color:var(--ok); }
.side .message { margin:0; }
.message.error { background:var(--errbg); color:var(--err); }
.message.warn { background:var(--warnbg); color:var(--warn); padding-right:12px; }
.message ul { margin:6px 0 0; padding-left:18px; }
.message > button { position:absolute; right:6px; top:6px; border:0; }
.job { background:#111827; color:#e5e7eb; border-radius:10px; padding:10px; }
.job-head { font-weight:600; margin-bottom:6px; }
.job.failed .job-head { color:#fca5a5; }
.job.done .job-head { color:#86efac; }
.job pre { margin:0; max-height:200px; overflow:auto; font-size:12px; white-space:pre-wrap; }
.output { background:var(--okbg); color:var(--ok); padding:10px; border-radius:8px; }
`;

const style = document.createElement("style");
style.textContent = css;
document.head.appendChild(style);
// Preview-maximum height keeps tall reels on screen; the frame keeps the video's aspect ratio
createRoot(document.getElementById("root")!).render(<App />);
