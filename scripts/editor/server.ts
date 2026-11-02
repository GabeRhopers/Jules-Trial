// Local editing screen for the video workspace: `npm run editor`, then open http://localhost:3100
//
// - Builds the editor page (editor/) with rspack, the same bundler Remotion uses.
// - Serves it, plus public/ (narration, music, footage) for the live preview and out/ for finished renders.
// - Saves videos/<id>/config.json (validated) and runs the existing scripts as jobs:
//   free Kokoro voice, silent test voice, quality check, render. One job at a time.
// - Listens on 127.0.0.1 only: it is a tool for your own computer, not a public website.
//
// Never runs ElevenLabs (paid): that stays a deliberate step (see CLAUDE.md cost rules).
import { spawn } from "node:child_process";
import { createReadStream, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { buildEditor, EDITOR_DIST } from "./build.ts";
import { safeJoin, validateConfig } from "./validate.ts";
import type { NarrationManifest, VideoConfig } from "../../src/lib/types.ts";

const ROOT = process.cwd();
const PORT = Number(process.env.EDITOR_PORT ?? 3100);
const HOST = "127.0.0.1";
const ID = /^[a-z0-9][a-z0-9-]*$/;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".srt": "text/plain; charset=utf-8",
};

// ---------- helpers ----------

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};

const readBody = (req: IncomingMessage, limit = 2_000_000) =>
  new Promise<string>((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > limit) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

/** Static files with HTTP range support (the preview's audio and video seek with range requests). */
const serveFile = (req: IncomingMessage, res: ServerResponse, file: string, noStore: boolean) => {
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end("Not found");
    return;
  }
  const size = statSync(file).size;
  const headers: Record<string, string | number> = {
    "Content-Type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": noStore ? "no-store" : "no-cache",
  };
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
      return;
    }
    res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
    if (req.method === "HEAD") return void res.end();
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, "Content-Length": size });
  if (req.method === "HEAD") return void res.end();
  createReadStream(file).pipe(res);
};

const videoDir = (id: string) => path.join(ROOT, "videos", id);
const readConfig = (id: string): VideoConfig => JSON.parse(readFileSync(path.join(videoDir(id), "config.json"), "utf8"));

const narrationStatus = (config: VideoConfig) => {
  const file = path.join(ROOT, "public", "audio", config.id, "manifest.json");
  if (!existsSync(file)) return { exists: false, source: null, generatedAt: null, staleScenes: config.scenes.map((s) => s.id) };
  const m: NarrationManifest = JSON.parse(readFileSync(file, "utf8"));
  const staleScenes = config.scenes.filter((s) => m.scenes.find((x) => x.id === s.id)?.text !== s.text).map((s) => s.id);
  return { exists: true, source: m.source, generatedAt: m.generatedAt, staleScenes };
};

const renderStatus = (config: VideoConfig) => {
  const file = path.join(ROOT, "out", config.brand, `${config.id}.mp4`);
  if (!existsSync(file)) return null;
  const st = statSync(file);
  return { url: `/out/${config.brand}/${config.id}.mp4`, sizeMb: Math.round((st.size / 1048576) * 10) / 10, renderedAt: st.mtime.toISOString() };
};

const kokoroPython = process.env.KOKORO_PYTHON ?? path.join(ROOT, ".venv", "bin", "python");

// ---------- jobs ----------

type JobType = "narrate-kokoro" | "narrate-placeholder" | "qc" | "render";
type Job = { id: number; type: JobType; videoId: string; status: "running" | "done" | "failed"; log: string; startedAt: string; endedAt?: string };
const JOB_COMMANDS: Record<JobType, (id: string) => string[]> = {
  "narrate-kokoro": (id) => ["scripts/narrate.ts", id, "--provider=kokoro"],
  "narrate-placeholder": (id) => ["scripts/placeholder-narration.ts", id],
  qc: (id) => ["scripts/qc.ts", id],
  render: (id) => ["scripts/render.ts", id],
};
const jobs: Job[] = [];
let nextJob = 1;

const startJob = (type: JobType, videoId: string): Job => {
  const job: Job = { id: nextJob++, type, videoId, status: "running", log: "", startedAt: new Date().toISOString() };
  jobs.push(job);
  if (jobs.length > 50) jobs.shift();
  // stdin closed: a script that asks a question (only ElevenLabs does) gets "no" instead of hanging
  const child = spawn(process.execPath, JOB_COMMANDS[type](videoId), { cwd: ROOT, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  const append = (chunk: Buffer) => {
    // Keep the log readable: strip terminal color codes and progress-bar carriage returns
    job.log = (job.log + chunk.toString().replace(/\x1b\[[0-9;]*m/g, "").replace(/\r(?!\n)/g, "\n")).slice(-60_000);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.on("close", (code) => {
    job.status = code === 0 ? "done" : "failed";
    job.endedAt = new Date().toISOString();
    job.log += `\n${code === 0 ? "Finished" : `Stopped with exit code ${code}`}.`;
  });
  return job;
};

// ---------- routes ----------

const handleApi = async (req: IncomingMessage, res: ServerResponse, url: URL) => {
  const parts = url.pathname.split("/").filter(Boolean).slice(1); // after "api"

  if (parts[0] === "status" && req.method === "GET") {
    return send(res, 200, { kokoroInstalled: existsSync(kokoroPython), busy: jobs.some((j) => j.status === "running") });
  }

  if (parts[0] === "videos" && parts.length === 1 && req.method === "GET") {
    const list = readdirSync(path.join(ROOT, "videos"))
      .filter((d) => ID.test(d) && existsSync(path.join(videoDir(d), "config.json")))
      .map((d) => {
        const c = readConfig(d);
        return { id: c.id, title: c.title, brand: c.brand, format: c.format };
      })
      .sort((a, b) => a.id.localeCompare(b.id));
    return send(res, 200, list);
  }

  if (parts[0] === "videos" && parts[1]) {
    const id = parts[1];
    if (!ID.test(id) || !existsSync(path.join(videoDir(id), "config.json"))) return send(res, 404, { error: `Video "${id}" not found` });

    if (parts.length === 2 && req.method === "GET") {
      const config = readConfig(id);
      return send(res, 200, { config, narration: narrationStatus(config), render: renderStatus(config) });
    }

    if (parts.length === 2 && req.method === "PUT") {
      let config: VideoConfig;
      try {
        config = JSON.parse(await readBody(req));
      } catch {
        return send(res, 400, { error: "The editor sent invalid data" });
      }
      const brandIds = readdirSync(path.join(ROOT, "brands")).filter((b) => existsSync(path.join(ROOT, "brands", b, "brand.json")));
      const errors = validateConfig(config, id, brandIds);
      if (errors.length) return send(res, 400, { error: "Not saved", details: errors });
      writeFileSync(path.join(videoDir(id), "config.json"), JSON.stringify(config, null, 2) + "\n");
      return send(res, 200, { ok: true, narration: narrationStatus(config) });
    }

    if (parts[2] === "jobs" && req.method === "POST") {
      const body = JSON.parse((await readBody(req)) || "{}") as { type?: JobType };
      if (!body.type || !(body.type in JOB_COMMANDS)) return send(res, 400, { error: "Unknown job type" });
      if (body.type === "narrate-kokoro" && !existsSync(kokoroPython)) {
        return send(res, 400, { error: "The free Kokoro voice is not installed on this computer. See README step 2, or use the silent test voice." });
      }
      if (jobs.some((j) => j.status === "running")) return send(res, 409, { error: "Another job is still running. Wait for it to finish." });
      return send(res, 200, startJob(body.type, id));
    }
  }

  if (parts[0] === "jobs" && parts[1] && req.method === "GET") {
    const job = jobs.find((j) => j.id === Number(parts[1]));
    return job ? send(res, 200, job) : send(res, 404, { error: "Job not found" });
  }

  return send(res, 404, { error: "Unknown API route" });
};

export const startServer = async () => {
  console.log("Building the editor page...");
  await buildEditor();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${HOST}`);
      if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
      if (url.pathname === "/" || url.pathname === "/index.html") return serveFile(req, res, path.join(EDITOR_DIST, "index.html"), true);
      if (url.pathname.startsWith("/editor/")) {
        const file = safeJoin(EDITOR_DIST, url.pathname.slice("/editor/".length));
        return file ? serveFile(req, res, file, false) : res.writeHead(403).end();
      }
      if (url.pathname.startsWith("/out/")) {
        const file = safeJoin(path.join(ROOT, "out"), url.pathname.slice("/out/".length));
        return file ? serveFile(req, res, file, true) : res.writeHead(403).end();
      }
      // Everything else comes from public/ (narration, music, footage), like Remotion's staticFile()
      const file = safeJoin(path.join(ROOT, "public"), url.pathname.slice(1));
      return file ? serveFile(req, res, file, url.pathname.startsWith("/audio/")) : res.writeHead(403).end();
    } catch (e) {
      send(res, 500, { error: (e as Error).message });
    }
  });
  await new Promise<void>((resolve) => server.listen(PORT, HOST, resolve));
  console.log(`\nVideo editor ready: http://localhost:${PORT}\n(Press Ctrl+C to stop.)`);
  return server;
};

if (import.meta.main) startServer();
