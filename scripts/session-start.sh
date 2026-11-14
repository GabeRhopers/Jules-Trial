#!/bin/bash
# Runs at the start (and resume) of every Claude Code session in this repo.
# Cloud only: does nothing on a personal computer.
# Keeps itself fast: Node packages install only when package-lock.json changed,
# and the free Kokoro voice installs in the background so the session is not blocked.

if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# Variables written here are available to every command Claude runs in this session.
persist() {
  [ -n "$CLAUDE_ENV_FILE" ] && echo "export $1=$2" >> "$CLAUDE_ENV_FILE"
}

# --- 1. Node packages (Remotion, TypeScript, ESLint) ---
stamp=node_modules/.deps.sha256
if ! sha256sum --check --status "$stamp" 2>/dev/null; then
  rm -f "$stamp"
  if npm ci --silent --no-audit --no-fund; then
    sha256sum package.json package-lock.json > "$stamp" 2>/dev/null || true
  else
    echo "session-start: npm ci failed; run it by hand to see the error"
  fi
fi

# --- 2. Headless Chrome for Remotion ---
# Remotion would download its own browser from remotion.media, which cloud networks
# often block. Reuse the Chrome Headless Shell that Playwright installed instead.
if [ -z "$REMOTION_BROWSER_EXECUTABLE" ]; then
  shell=$(ls -d "${PLAYWRIGHT_BROWSERS_PATH:-/nonexistent}" /opt/pw-browsers "$HOME/.cache/ms-playwright" 2>/dev/null \
    | while read -r d; do ls "$d"/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null; done \
    | sort -V | tail -1)
  if [ -n "$shell" ]; then
    persist REMOTION_BROWSER_EXECUTABLE "$shell"
  else
    echo "session-start: no Chrome Headless Shell found; Remotion will try to download one from remotion.media"
  fi
fi

# --- 3. Free voice: Kokoro (Python 3.10 to 3.12, about 1.5 GB with CPU-only PyTorch) ---
# Uses a prebuilt one from the environment setup script if there is one (see CLAUDE.md),
# otherwise builds .venv in the background. Progress: .venv-install.log
if [ -z "$KOKORO_PYTHON" ] && [ -x /opt/kokoro-venv/bin/python ]; then
  persist KOKORO_PYTHON /opt/kokoro-venv/bin/python
elif [ -z "$KOKORO_PYTHON" ] && [ ! -f .venv/.ready ]; then
  py=$(command -v python3.12 || command -v python3.11 || command -v python3.10)
  if pgrep -f "requirements-kokoro.txt" >/dev/null; then
    :   # an install from an earlier start is still running
  elif .venv/bin/python -c "import kokoro, soundfile" >/dev/null 2>&1; then
    touch .venv/.ready   # a working .venv made by hand
  elif [ -n "$py" ]; then
    # CPU-only PyTorch from download.pytorch.org: about 1.5 GB instead of 6 GB of unused GPU libraries.
    # If that host is blocked, the regular install from PyPI still works, just bigger.
    nohup bash -c "rm -rf .venv && '$py' -m venv .venv \
      && { .venv/bin/pip install -q torch --index-url https://download.pytorch.org/whl/cpu \
           || echo 'CPU-only torch unavailable; using the regular PyPI build'; } \
      && .venv/bin/pip install -q -r requirements-kokoro.txt && touch .venv/.ready" \
      > .venv-install.log 2>&1 &
    echo "session-start: installing the Kokoro voice in the background (a few minutes); see .venv-install.log"
  else
    echo "session-start: Kokoro needs Python 3.10, 3.11 or 3.12; none found"
  fi
fi

# --- 4. System tools the environment setup script should provide ---
for tool in ffmpeg ffprobe; do
  command -v "$tool" >/dev/null 2>&1 \
    || echo "session-start: $tool not found. Add it to the environment setup script (see CLAUDE.md)"
done

exit 0
