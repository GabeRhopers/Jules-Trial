import type { VideoConfig } from "../src/lib/types";

export type VideoSummary = { id: string; title: string; brand: string; format: string };
export type NarrationStatus = { exists: boolean; source: string | null; generatedAt: string | null; staleScenes: string[] };
export type RenderStatus = { url: string; sizeMb: number; renderedAt: string } | null;
export type JobType = "narrate-kokoro" | "narrate-placeholder" | "qc" | "render";
export type Job = { id: number; type: JobType; videoId: string; status: "running" | "done" | "failed"; log: string };

const call = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const body = await res.json();
  if (!res.ok) throw Object.assign(new Error(body.error ?? `Request failed (${res.status})`), { details: body.details as string[] | undefined });
  return body as T;
};

export const api = {
  status: () => call<{ kokoroInstalled: boolean; busy: boolean }>("/api/status"),
  videos: () => call<VideoSummary[]>("/api/videos"),
  video: (id: string) => call<{ config: VideoConfig; narration: NarrationStatus; render: RenderStatus }>(`/api/videos/${id}`),
  save: (config: VideoConfig) => call<{ ok: true; narration: NarrationStatus }>(`/api/videos/${config.id}`, { method: "PUT", body: JSON.stringify(config) }),
  startJob: (id: string, type: JobType) => call<Job>(`/api/videos/${id}/jobs`, { method: "POST", body: JSON.stringify({ type }) }),
  job: (jobId: number) => call<Job>(`/api/jobs/${jobId}`),
};
