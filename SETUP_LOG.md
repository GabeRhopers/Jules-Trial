# Setup Log

Running record of every command, decision, and manual step for the video production workspace.

## Phase 1: Prerequisites check (2026-10-29)

### Environment
- Runs in a **Claude Code cloud container** (claude.ai/code), not on the user's own computer.
- OS: Ubuntu 24.04.5 LTS, x86_64. Running as root (no sudo needed in this container).

### Commands run
| Command | Result |
|---|---|
| `cat /etc/os-release`, `uname -m` | Ubuntu 24.04.5 LTS, x86_64 |
| `node --version` | v22.22.0 (LTS "Jod", Maintenance LTS, end of life 2027-04-30) |
| `npm --version` / `npx --version` | 10.9.4 |
| `bun --version` | 1.4.4 |
| `ffmpeg -version` / `ffprobe -version` | 6.1.1 (Ubuntu package) |
| `git --version` | 2.43.0 |
| `claude --version` | 2.1.312 (Claude Code) |
| `dpkg -s <libs>` | All Chrome Headless Shell runtime libs present (dev headers `libxkbcommon-dev`, `libgbm-dev` absent, but runtime `libxkbcommon0` and `libgbm1` are installed) |
| `curl registry.npmjs.org/create-video/latest` | create-video / remotion latest = 4.0.539 |

### Docs checked
- remotion.dev: **blocked** by this session's network policy. Read the same official docs from the Remotion GitHub repo instead (`remotion-dev/remotion/packages/docs`).
- elevenlabs.io, higgsfield.ai, mcp.higgsfield.ai: **blocked** by network policy.
- nodejs.org release schedule: reachable.

### Changes vs. the original instructions
- Remotion's current CLI quick start is `npx create-video@latest --yes --blank my-video` then `npx remotion skills add` (skills are now added with `npx remotion skills add`, or `npx -y skills@latest add remotion-dev/skills`).
- Node 26 became LTS on 2026-10-28; Node 24 is now Maintenance LTS; Node 22 (installed) is Maintenance LTS until 2027-04-30.

### Decisions (approved by user)
- **Where to run:** build and push everything from the cloud session; the user clones it locally for the Higgsfield sign-in, the `.env` key and final renders.
- **Node:** keep Node 22 for now. Upgrading to Node 26 LTS later is optional; `package.json` `engines` allows both.
- **Branch:** all work goes on `claude/video-workspace`. Commit and push at the end of every phase.
- **ElevenLabs / Higgsfield details:** built now, marked "NOT VERIFIED AGAINST CURRENT DOCS" until a new session with the domains allowed can check them.

### Manual steps for the user
- Allow these domains in the cloud environment's Network access settings, then start a new session to verify Phase 3:
  `remotion.dev`, `elevenlabs.io`, `api.elevenlabs.io`, `higgsfield.ai`, `mcp.higgsfield.ai`.

## Phase 2: Project scaffold (2026-10-29)

### Docs checked (from `remotion-dev/remotion` on GitHub, since remotion.dev is blocked)
- `docs/getting-started.mdx`: CLI quick start is `npx create-video@latest --yes --blank my-video`, then `npx remotion skills add`.
- `docs/ai/skills.mdx`: skills install with `npx skills add remotion-dev/skills` (or `gh skill install remotion-dev/skills`). The interactive wizard offers skills; `--yes` skips that prompt.
- `docs/ai/claude-code-plugin.mdx`: an official Claude Code plugin exists (`remotion-dev/claude-code-plugin`).
- `docs/license/faq.mdx`: license terms, summarized in `LICENSE_NOTES.md`.

### Commands run
| Command | Result |
|---|---|
| `npx -y create-video@4.0.539 --yes --blank my-video` (in scratchpad, since create-video needs an empty target folder) | Blank TypeScript project created, Remotion 4.0.539, 44 s |
| copy scaffold into repo root (without its `.git` and `node_modules`) | Files merged next to the existing `.claude/` folder |
| `npm install` | 350 packages installed |
| `npx remotion skills add` | 12 Remotion skills installed in `.agents/skills/`, symlinked into `.claude/skills/` for Claude Code. The existing `reverse-engineer-anything` skill was kept. |
| `npx remotion studio --port 3123 --no-open`, loaded it in headless Chromium, then stopped it | Studio served HTTP 200, built in 1.2 s, showed `MyComp`, no page errors. |

### Decisions
- Package renamed to `video-workspace`; `engines.node` set to `^22.13.0 || >=24` (covers Node 22, 24 and 26; drops Node 20, which is end-of-life).
- `.gitignore`: `.env` and `.env.*` ignored (except `.env.example`); `out/`, `public/audio/`, `public/broll/` and media files (`*.mp4`, `*.mov`, `*.webm`, `*.wav`, `*.mp3`) ignored. Exception: `public/music/` stays trackable for small licensed music beds.
- Skills are committed to git (3.5 MB) so a fresh clone has them right away. `.claude/skills/remotion-*` are symlinks; this works on macOS and Linux. On Windows, re-run `npx remotion skills add` after cloning.
- **Claude Code plugin: not installed.** The plugin bundles the same Agent Skills already in the project. Installing both duplicates the skills. Optional on your computer:
  `claude plugin marketplace add remotion-dev/claude-code-plugin` then `claude plugin install remotion@remotion`.

### Notes
- `npm` reported 10 high-severity audit findings in dev tooling from the official template. Not changed (no `npm audit fix --force`, which can break Remotion's pinned versions).
- Studio tried to reach `bugs.remotion.dev` (update and bug check); blocked here, harmless.

### Manual steps for the user
- None for this phase.
