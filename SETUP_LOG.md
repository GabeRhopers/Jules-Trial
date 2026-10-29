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

### Decisions
- (pending user approval) Keep Node 22 vs. upgrade.

### Manual steps for the user
- (pending) Allow network domains for remotion.dev, elevenlabs.io, api.elevenlabs.io, higgsfield.ai, mcp.higgsfield.ai.
