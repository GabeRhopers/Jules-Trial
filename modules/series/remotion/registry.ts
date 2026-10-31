// Auto-discovers every modules/series/<series>/series.json and episodes/epNN.json at bundle time.
// Adding an episode needs no code change: add the JSON file and run make_audio.py for it.
import type { Episode, SeriesBible } from "./types";

type Context = { keys(): string[]; (id: string): unknown };
const seriesFiles = import.meta.webpackContext("..", { recursive: true, regExp: /series\.json$/ }) as Context;
const episodeFiles = import.meta.webpackContext("..", { recursive: true, regExp: /episodes\/ep\d+\.json$/ }) as Context;
const unwrap = <T,>(mod: unknown): T => ((mod as { default?: T }).default ?? mod) as T;

export const seriesBibles: Record<string, SeriesBible> = Object.fromEntries(
  seriesFiles.keys().map((k) => {
    const s = unwrap<SeriesBible>(seriesFiles(k));
    return [s.id, s];
  }),
);

export const episodes: Episode[] = episodeFiles
  .keys()
  .map((k) => unwrap<Episode>(episodeFiles(k)))
  .sort((a, b) => a.id.localeCompare(b.id));

export const getEpisode = (id: string): Episode => {
  const ep = episodes.find((e) => e.id === id);
  if (!ep) throw new Error(`Episode "${id}" not found`);
  return ep;
};
