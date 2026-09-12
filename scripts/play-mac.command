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
#     the port, so a game served on 5199 cannot read or write the saves made by
#     a game served on 5188. The candidate-art mode also keeps its lives in its
#     own IndexedDB database on top of that.
#
# CONFIGURE (only the first one usually matters)

# Where your clone of the repository lives.
REPO="${PG_REPO:-$HOME/Political-Game-Git}"

# Which source to play. A branch name is resolved fresh from the remote every
# run, so you get that branch's current head rather than a remembered commit.
# This default is the branch that carries the assembled UI composition.
SOURCE="${PG_SOURCE:-origin/codex/ui-core-release-transfer}"

# The port for THIS play copy. Deliberately not 5173 (the project default) and
# never 5188 (kept for the server you already run).
PORT="${PG_PORT:-5199}"

# "candidate" shows the banked candidate people. "production" shows the
# shipped art, where most household members appear as initials.
MODE="${PG_MODE:-candidate}"

# Where the play copies are kept.
PLAY_ROOT="${PG_PLAY_ROOT:-$HOME/political-game-play}"

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
[ -d "$REPO/.git" ] || fail "$REPO is not a git clone (no .git). Point REPO at the clone itself."

command -v git >/dev/null 2>&1 || fail "git is not installed."
command -v node >/dev/null 2>&1 || fail "node is not installed. Install Node 22 or newer."
command -v npm >/dev/null 2>&1 || fail "npm is not installed."

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
git -C "$REPO" fetch --quiet origin 2>/dev/null || say "  (could not reach the remote; using what is already downloaded)"

SHA="$(git -C "$REPO" rev-parse --verify --quiet "${SOURCE}^{commit}")" \
  || fail "Cannot resolve '$SOURCE' in $REPO.
Check the branch name, or set PG_SOURCE to one that exists."

say "Source:      $SOURCE"
say "Commit:      $SHA"
say "Mode:        $MODE art"
say "Port:        $PORT"
say ""

# --- 4. A NEW detached worktree, per commit. Never your own checkout. ------

mkdir -p "$PLAY_ROOT" || fail "Cannot create $PLAY_ROOT"
PLAY_DIR="$PLAY_ROOT/play-${SHA:0:12}"

if [ -d "$PLAY_DIR" ]; then
  say "Reusing the play copy already built for this exact commit:"
  say "  $PLAY_DIR"
else
  say "Creating a separate play copy (your own checkout is not touched) ..."
  git -C "$REPO" worktree add --detach "$PLAY_DIR" "$SHA" \
    || fail "Could not create a worktree at $PLAY_DIR"
fi
say ""

# From here on we work in the play copy, and we stay there.
cd "$PLAY_DIR" || fail "Cannot enter $PLAY_DIR"

# --- 5. Dependencies. If this fails, we stop. We do not launch anyway. -----

if [ ! -d "$PLAY_DIR/node_modules" ]; then
  say "Installing dependencies (a few minutes the first time for a commit) ..."
  if ! npm ci --no-audit --no-fund; then
    fail "Dependency install failed in $PLAY_DIR.
The game was NOT started. Fix the install error above and run this again.
To start over for this commit, delete that folder and re-run:
  git -C \"$REPO\" worktree remove --force \"$PLAY_DIR\""
  fi
  say ""
else
  say "Dependencies already installed for this commit."
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
say " Address:    $URL"
say "=============================================================="
say ""
say "Leave this window open while you play. Close it, or press Control-C,"
say "to stop this play copy. Nothing else you have running is affected."
say ""

# Open the game's address once the server is actually answering. Only this
# address is opened -- no review page, no file, no gallery.
(
  for _ in $(seq 1 90); do
    sleep 1
    if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/" 2>/dev/null; then
      open "$URL" 2>/dev/null || say "Open this address yourself: $URL"
      exit 0
    fi
  done
  say "The server did not answer in time. Open this address yourself: $URL"
) &

# Run the project's own identified dev server in the foreground, in this
# directory. --port is passed through to it; it pins the port strictly, so it
# will refuse rather than silently move to another one.
exec npm run dev:identified -- --port "$PORT"
