# Playing a build on a Mac

`scripts/play-mac.command` opens a playable copy of the game on a Mac without
disturbing anything already running. Copy it to the Desktop and double-click
it, or run it from a terminal.

## What it does

1. Checks the repository path is real, is actually this project, and resolves
   it through Git so both clones and linked worktrees are accepted.
2. Refuses to take a port from a running program, and refuses port 5188
   outright.
3. Resolves the chosen source from the remote to an exact commit, and prints
   both the source and the commit. A failed fetch stops unless
   `PG_OFFLINE_CACHED=1` explicitly opts into a labelled cached build.
4. Verifies a reused play copy's actual repository, `HEAD`, and source
   cleanliness. A stale or dirty copy is preserved and a fresh **separate
   detached worktree** is created instead. Your own checkout is never checked
   out, stashed, reset or cleaned.
5. Installs dependencies there. A success marker is keyed to the lockfile,
   Node version/platform, and npm version; an existing `node_modules` without
   that marker is not trusted. **If the install fails it stops**, and the game
   is not started.
6. Serves with the project's own `npm run dev:identified -- --port <port>`,
   verifies the served identity before opening, and opens **only the game's
   own address**. The opener is tied to that server process and cannot later
   open an unrelated process that takes the port.

## Settings

All are environment variables, and each has a default at the top of the file.

| Variable            | Default                                 | Meaning                                                 |
| ------------------- | --------------------------------------- | ------------------------------------------------------- |
| `PG_REPO`           | `$HOME/Documents/Political Game`        | your clone or linked worktree                           |
| `PG_SOURCE`         | `origin/codex/ui-core-release-transfer` | branch or commit to play                                |
| `PG_PORT`           | `5199`                                  | port for this play copy; never 5188                     |
| `PG_MODE`           | `candidate`                             | `candidate` or `production` art                         |
| `PG_PLAY_ROOT`      | `$HOME/political-game-play`             | where play copies are kept                              |
| `PG_OFFLINE_CACHED` | unset                                   | explicit `1` allows a cached source after fetch failure |

```bash
PG_PORT=5200 PG_SOURCE=origin/main ~/Desktop/play-mac.command
```

## Why it cannot reach your saves

Browser storage is per **origin**, and an origin includes the port. A game
served on `127.0.0.1:5199` cannot read saves stored by a game served on
`127.0.0.1:5188`, but a later run on `5199` can load saves created on `5199`.
Candidate-art mode additionally keeps its lives in its own IndexedDB database
(see `src/presentation/art-preview.ts`), so a wardrobe choice made against
unreleased art is isolated from an ordinary save.

## `candidate` versus `production`

`PG_MODE=candidate` appends `?art-preview=candidate`. That is **the ordinary
game with the banked candidate people composed in** — not a gallery and not a
separate route. It is development-only: the mode is gated on
`import.meta.env.DEV`, which a production build replaces with `false`, so no
address selects candidate art in a shipped build. The screen says so while it
is on.

In `production` mode most generated household members appear as initials. That
is a release-eligibility refusal, not missing art.

## One play copy per commit

The worktree is named for the commit, so playing the same clean commit again
can reuse the copy and its verified dependencies. A stale or dirty copy is
never reset or cleaned; the launcher creates a fresh one beside it. Playing a
different commit builds a new one beside it. To remove one:

```bash
git -C ~/Political-Game-Git worktree remove --force ~/political-game-play/play-<commit>
```

## If it stops

Every stop prints the reason and changes nothing. The common ones are a
`PG_REPO` that does not point at the clone, a port already in use (pass a
different `PG_PORT`), and a dependency install failure, which is reported with
npm's own error above it.
