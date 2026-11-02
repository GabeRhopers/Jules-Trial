// Generates the sound effects in public/sfx/ with ffmpeg (no samples, no downloads), so they are original
// and free to use in client videos. Run again only if you change a recipe below: npm run sfx
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT = path.join("public", "sfx");

/** name -> [ffmpeg lavfi inputs..., filter on the mix, duration note] */
const RECIPES: Record<string, { inputs: string[]; filter: string; about: string }> = {
  // Air rushing past: pink noise, band-limited, swelling in and out
  whoosh: {
    inputs: ["anoisesrc=d=0.75:c=pink:a=0.9:r=48000"],
    filter: "highpass=f=350,lowpass=f=3800,afade=t=in:d=0.28:curve=qsin,afade=t=out:st=0.28:d=0.47:curve=qsin,volume=0.9",
    about: "0.75 s swell, for text sliding in and the end-card wipe",
  },
  // Soft, round "pop" for a logo landing: low sine with a fast pitch drop and a short decay
  pop: {
    inputs: ["aevalsrc=0.9*sin(2*PI*(140+260*exp(-t*28))*t)*exp(-t*16):d=0.32:s=48000"],
    filter: "lowpass=f=2500,volume=0.9",
    about: "0.3 s soft pop",
  },
  // Thermostat: two short digital beeps
  beep: {
    inputs: ["aevalsrc='0.5*sin(2*PI*2093*t)*(between(t,0,0.07)+between(t,0.16,0.23))':d=0.32:s=48000"],
    filter: "afade=t=out:st=0.25:d=0.07,volume=0.7",
    about: "double beep (C7), 0.3 s",
  },
  // Warm two-note chime (E5 + B5) with a long decay, for the final message
  chime: {
    inputs: ["aevalsrc='(0.45*sin(2*PI*659.25*t)+0.3*sin(2*PI*987.77*t)*between(t,0.12,9)+0.12*sin(2*PI*1318.5*t))*exp(-t*2.6)':d=1.8:s=48000"],
    filter: "aecho=0.6:0.5:60:0.25,volume=0.8",
    about: "1.8 s chime",
  },
  // Cold wind outside: brown noise, low-passed, slowly rising and falling
  wind: {
    inputs: ["anoisesrc=d=12:c=brown:a=0.7:r=48000"],
    filter: "lowpass=f=520,highpass=f=60,tremolo=f=0.18:d=0.55,afade=t=in:d=1.5,afade=t=out:st=10:d=2,volume=0.8",
    about: "12 s ambience",
  },
};

mkdirSync(OUT, { recursive: true });
for (const [name, r] of Object.entries(RECIPES)) {
  const file = path.join(OUT, `${name}.mp3`);
  execFileSync(
    "ffmpeg",
    ["-y", "-v", "error", ...r.inputs.flatMap((i) => ["-f", "lavfi", "-i", i]), "-af", r.filter, "-ac", "2", "-ar", "48000", "-b:a", "160k", file],
    { stdio: "inherit" },
  );
  console.log(`${file}: ${r.about}`);
}
