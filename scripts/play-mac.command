#!/bin/bash
#
# Our Civic Duty — open a playable build on this Mac.
#
# Copy this file anywhere (Desktop is fine) and double-click it, or run it from
# a terminal. It builds its own play copy and leaves everything you already
# have running exactly where it is.
#
# WHAT IT WILL NOT TOUCH
#
#   * Any dev server you already have running. It refuses port 5188 outright,
#     checks the port it does want is free, and stops rather than taking a port
#     from something else. It never kills a process.
#   * Your own checkout. It never checks out a branch in your working copy,
#     and never stashes, resets or cleans it. It adds a SEPARATE detached
#     worktree under PLAY_ROOT and works only there.
#   * Your saved games. Browser storage is per origin, and an origin includes
#     the port, so a game served on 5199 cannot read the saves made by a game
#     served on 5188. A later run on 5199 can load saves made on 5199. The
#     candidate-art mode also keeps its lives in its own IndexedDB database on
#     top of that.
#
# CONFIGURE (only the first one usually matters)

# Where your clone of the repository lives.
REPO="${PG_REPO:-$HOME/Documents/Political Game}"

# Which source to play. A branch name is resolved fresh from the remote every
# run, so you get that branch's current head rather than a remembered commit.
# The assembled UI is on main. Resolve it fresh on every run so the launcher
# never silently serves the retired integration branch after ownership moved.
SOURCE="${PG_SOURCE:-origin/main}"

# The port for THIS play copy. Deliberately not 5173 (the project default) and
# never 5188 (kept for the server you already run).
PORT="${PG_PORT:-5199}"

# "candidate" shows the banked candidate people. "production" shows the
# shipped art, where most household members appear as initials.
MODE="${PG_MODE:-candidate}"

# Where the play copies are kept.
PLAY_ROOT="${PG_PLAY_ROOT:-$HOME/political-game-play}"

# A failed fetch stops by default. Set this explicitly only to play a clearly
# labelled locally cached source when the remote is unavailable.
OFFLINE_CACHED="${PG_OFFLINE_CACHED:-0}"

# ---------------------------------------------------------------------------
# Nothing below here needs editing.

set -u
set -o pipefail

say() { printf '%s\n' "$*"; }
fail() {
  printf '\nSTOPPED: %s\n\n' "$*" >&2
  printf 'Nothing was started, and nothing you had running was changed.\n' >&2
  # Keep the window open when this was double-clicked from Finder.
  if [ -t 0 ]; then
    printf '\nPress return to close.\n' >&2
    read -r _ || true
  fi
  exit 1
}

say "Our Civic Duty — play copy"
say "=========================="
say ""

# --- 1. The repository path must be real, and must be this project. --------

[ -n "$REPO" ] || fail "REPO is empty. Set PG_REPO or edit REPO at the top of this file."
[ -d "$REPO" ] || fail "No folder at: $REPO
Edit REPO at the top of this file to your actual clone, or run:
  PG_REPO=/path/to/Political-Game-Git \"$0\""
command -v git >/dev/null 2>&1 || fail "git is not installed."
command -v node >/dev/null 2>&1 || fail "node is not installed. Install Node 22 or newer."
command -v npm >/dev/null 2>&1 || fail "npm is not installed."

# Git resolves both ordinary clones and linked worktrees. Do not inspect
# `.git` directly: a linked worktree has a `.git` file instead of a directory.
REPO_ROOT="$(git -C "$REPO" rev-parse --show-toplevel 2>/dev/null)" \
  || fail "$REPO is not a Git worktree. Point PG_REPO at the clone or worktree itself."
REPO="$(cd "$REPO_ROOT" 2>/dev/null && pwd -P)" \
  || fail "Could not resolve the Git worktree at: $REPO_ROOT"
[ "$(git -C "$REPO" rev-parse --is-inside-work-tree 2>/dev/null)" = "true" ] \
  || fail "$REPO is not inside a Git worktree."

# It must be THIS project, not some other checkout that happens to sit there.
if ! grep -q '"name": *"political-life-rpg"' "$REPO/package.json" 2>/dev/null; then
  fail "$REPO does not look like this game (package.json name is not political-life-rpg)."
fi

say "Repository:  $REPO"

# --- 2. Never take a port something else is using. -------------------------

case "$PORT" in
  5188) fail "Port 5188 is reserved for the server you already run. Choose another with PG_PORT." ;;
  ''|*[!0-9]*) fail "PG_PORT must be a number. Got: $PORT" ;;
esac
[ "$PORT" -ge 1024 ] && [ "$PORT" -le 65535 ] || fail "PG_PORT must be between 1024 and 65535. Got: $PORT"

if command -v lsof >/dev/null 2>&1; then
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    fail "Something is already listening on port $PORT.
This launcher will not take a port from a running program.
Run it again with a different port, for example:
  PG_PORT=5200 \"$0\""
  fi
fi

case "$MODE" in
  candidate|production) ;;
  *) fail "PG_MODE must be 'candidate' or 'production'. Got: $MODE" ;;
esac

# --- 3. Resolve the source to an exact commit, from the remote. ------------

say "Fetching the current source ..."
if git -C "$REPO" fetch --quiet origin 2>/dev/null; then
  SOURCE_MODE="fresh remote"
else
  if [ "$OFFLINE_CACHED" = "1" ]; then
    SOURCE_MODE="OFFLINE CACHED"
    say "WARNING: origin fetch failed; using explicitly requested offline cached source."
  else
    fail "Could not fetch origin. Set PG_OFFLINE_CACHED=1 only to explicitly use a clearly labelled cached source."
  fi
fi

SHA="$(git -C "$REPO" rev-parse --verify --quiet "${SOURCE}^{commit}")" \
  || fail "Cannot resolve '$SOURCE' in $REPO.
Check the branch name, or set PG_SOURCE to one that exists."

say "Source:      $SOURCE"
say "Commit:      $SHA"
say "Source mode: $SOURCE_MODE"
say "Mode:        $MODE art"
say "Port:        $PORT"
say ""

# --- 4. A NEW detached worktree, per commit. Never your own checkout. ------

mkdir -p "$PLAY_ROOT" || fail "Cannot create $PLAY_ROOT"
PLAY_DIR="$PLAY_ROOT/play-${SHA:0:12}"

REUSE_PLAY_DIR=0
if [ -e "$PLAY_DIR" ]; then
  PLAY_DIR_ROOT="$(git -C "$PLAY_DIR" rev-parse --show-toplevel 2>/dev/null || true)"
  PLAY_DIR_HEAD="$(git -C "$PLAY_DIR" rev-parse --verify HEAD 2>/dev/null || true)"
  PLAY_DIR_STATUS="$(git -C "$PLAY_DIR" status --porcelain --untracked-files=all 2>/dev/null || true)"
  EXPECTED_PLAY_DIR="$(cd "$PLAY_DIR" 2>/dev/null && pwd -P || true)"
  if [ "$PLAY_DIR_ROOT" = "$EXPECTED_PLAY_DIR" ] \
    && [ "$PLAY_DIR_HEAD" = "$SHA" ] \
    && [ -z "$PLAY_DIR_STATUS" ]; then
    REUSE_PLAY_DIR=1
  else
    say "Existing play copy is not an exact clean match; preserving it and creating a fresh copy."
  fi
fi

if [ "$REUSE_PLAY_DIR" = "0" ]; then
  if [ -e "$PLAY_DIR" ]; then
    PLAY_DIR="$PLAY_ROOT/play-${SHA:0:12}-$(date +%s)-$$"
  fi
  while [ -e "$PLAY_DIR" ]; do
    PLAY_DIR="$PLAY_ROOT/play-${SHA:0:12}-$(date +%s)-$$-$RANDOM"
  done
  say "Creating a separate play copy (your own checkout is not touched) ..."
  git -C "$REPO" worktree add --detach "$PLAY_DIR" "$SHA" \
    || fail "Could not create a worktree at $PLAY_DIR"
else
  say "Reusing the exact clean play copy already built for this commit:"
  say "  $PLAY_DIR"
fi
say ""

# From here on we work in the play copy, and we stay there.
cd "$PLAY_DIR" || fail "Cannot enter $PLAY_DIR"

VERIFIED_PLAY_DIR="$(pwd -P)"
VERIFIED_PLAY_HEAD="$(git rev-parse --verify HEAD 2>/dev/null)" \
  || fail "The play copy is not a Git worktree: $PLAY_DIR"
[ "$VERIFIED_PLAY_HEAD" = "$SHA" ] \
  || fail "The play copy resolved to $VERIFIED_PLAY_HEAD, not the advertised $SHA."
[ "$(git rev-parse --show-toplevel 2>/dev/null)" = "$VERIFIED_PLAY_DIR" ] \
  || fail "The play copy resolved to a different repository root."
say "Verified source: $VERIFIED_PLAY_HEAD"
say "Verified play:   $VERIFIED_PLAY_DIR"
say ""

# --- 5. Dependencies. If this fails, we stop. We do not launch anyway. -----

LOCK_HASH="$(node -e 'const fs=require("fs"), crypto=require("crypto"); process.stdout.write(crypto.createHash("sha256").update(fs.readFileSync("package-lock.json")).digest("hex"))' 2>/dev/null)" \
  || fail "Could not fingerprint package-lock.json."
NODE_FINGERPRINT="$(node -p 'process.version + "|" + process.platform + "|" + process.arch' 2>/dev/null)" \
  || fail "Could not identify the Node runtime."
NPM_FINGERPRINT="$(npm --version 2>/dev/null)" \
  || fail "Could not identify npm."
INSTALL_FINGERPRINT="$LOCK_HASH|$NODE_FINGERPRINT|npm-$NPM_FINGERPRINT"
INSTALL_MARKER="$PLAY_ROOT/.npm-ci-success-${SHA:0:12}"
MARKER_VALUE="$(cat "$INSTALL_MARKER" 2>/dev/null || true)"

if [ "$MARKER_VALUE" = "$INSTALL_FINGERPRINT" ] \
  && [ -x "$PLAY_DIR/node_modules/.bin/vite" ]; then
  say "Dependencies verified for this lockfile, Node runtime and platform."
else
  rm -f "$INSTALL_MARKER"
  say "Installing dependencies (a few minutes the first time for a commit) ..."
  if ! npm ci --no-audit --no-fund; then
    fail "Dependency install failed in $PLAY_DIR.
The game was NOT started. Fix the install error above and run this again.
To start over for this commit, delete that folder and re-run:
  git -C \"$REPO\" worktree remove --force \"$PLAY_DIR\""
  fi
  MARKER_TMP="$INSTALL_MARKER.tmp.$$"
  printf '%s\n' "$INSTALL_FINGERPRINT" > "$MARKER_TMP" \
    || fail "Could not write the dependency success marker."
  mv -f "$MARKER_TMP" "$INSTALL_MARKER" \
    || fail "Could not publish the dependency success marker."
  say ""
fi

# --- 6. Serve, and open the game's own address. ----------------------------

if [ "$MODE" = "candidate" ]; then
  URL="http://127.0.0.1:$PORT/?art-preview=candidate"
else
  URL="http://127.0.0.1:$PORT/"
fi

say "=============================================================="
say " Play copy:  $PLAY_DIR"
say " Source:     $SOURCE @ $SHA"
say " Verified:    $VERIFIED_PLAY_HEAD @ $VERIFIED_PLAY_DIR"
say " Address:    $URL"
say "=============================================================="
say ""
say "Leave this window open while you play. Close it, or press Control-C,"
say "to stop this play copy. Nothing else you have running is affected."
say ""

# Start the project's own identified dev server and keep the browser opener
# tied to this process and its identity. A later process taking the port cannot
# cause this launcher to open the wrong build.
npm run dev:identified -- --port "$PORT" &
SERVER_PID=$!

open_game_when_ready() {
  for _ in $(seq 1 90); do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      say "The launched server exited before its identity was ready."
      return 1
    fi
    IDENTITY="$(curl -fsS --max-time 2 "http://127.0.0.1:$PORT/__dev/identity" 2>/dev/null || true)"
    case "$IDENTITY" in
      *"\"workspace\":\"$VERIFIED_PLAY_DIR\""*"\"head\":\"$VERIFIED_PLAY_HEAD\""*)
        if curl -fsS -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/" 2>/dev/null; then
          open "$URL" 2>/dev/null || say "Open this address yourself: $URL"
          return 0
        fi
        ;;
    esac
    sleep 1
  done
  say "The launched server did not answer with the verified identity in time."
  return 1
}

open_game_when_ready &
OPENER_PID=$!

trap '
  if [ -n "${OPENER_PID:-}" ] && kill -0 "$OPENER_PID" 2>/dev/null; then
    kill "$OPENER_PID" 2>/dev/null || true
  fi
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
' INT TERM

wait "$SERVER_PID"
SERVER_STATUS=$?
if kill -0 "$OPENER_PID" 2>/dev/null; then
  kill "$OPENER_PID" 2>/dev/null || true
fi
wait "$OPENER_PID" 2>/dev/null || true
trap - INT TERM
exit "$SERVER_STATUS"
