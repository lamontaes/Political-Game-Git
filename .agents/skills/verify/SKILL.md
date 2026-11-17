---
name: verify
description: >
  Verifies a change before each commit and before a pull request: runs the
  changed files' checks and every guard with one script, and when the change
  touches what the player sees, starts the bench headless, reaches the screen
  by playing (dev mode allowed) in a drawn place and saves a screenshot for
  the pull request's stamp; also the longer play walks that write down every
  line a new life shows. Use before every commit that changes code, before
  marking a pull request ready, and whenever you need to see a screen in the
  running game. Not for the full suite or the heavy runs (merger, speed-work)
  or the second session's check (seen-in-game).
---

# Verify

The CTO's rules of Nov 16 (#9747, skill `done-proof`): done means seen in the running game, and every pull request says how it was verified. This skill is the fast, runnable half of that: one command for the checks a builder runs, and one flag for the screenshot. Claude Code runs a project skill named `verify` before each commit on its own, so the default run is kept to the fast set.

## Run it

From the checkout's root:

```
node .claude/skills/verify/scripts/verify.mjs
node .claude/skills/verify/scripts/verify.mjs --screen politics/Metrics --dev
```

- **No flags:** the changed files' checks, then every guard. The checks are the focus stages that `scripts/agent-test-cadence.mjs` plans for the files changed against `origin/main`: the changed test files, `zero-dice` and `zero-real-data` for engine files, `old-imports` for code, the pool check for pool items, `test:skill-ops` for instruction files. Then `npm run guards`, with `CHANGED_FILES` set as the CI guards job sets it.
- **`--screen <tab>[/<button>...]`** (repeatable): the ring tab's `data-tab` name (`politics`, `who`, `calendar`, `news`), then the buttons to press in its sheet by their words. The script starts `src/bench/server.ts` when nothing answers on port 3000 and stops it after, starts a new life in a drawn place with `startLife` (`src/bench/start-life.mjs`, which plays the opening as a player does), opens each screen and saves a 1440x900 picture.
- **`--dev`:** dev mode on (`devModeOn`, `src/bench/dev-setup.mjs`) before the screens.
- **`--place <key> --seed <seed>`:** replay one place and seed, only to reproduce a red. A drawn place is the default and the rule (`drawn-place-tests`).
- **`--out <dir>`** (logs and pictures; default a folder in the system temp directory named for the head), **`--base <ref>`**, **`--no-guards`**, **`--typecheck`**, **`--observe`** (report only, always exit 0).

It prints one line per stage, PASS, FAIL, SKIPPED or DID NOT RUN, the drawn place and seed, the picture paths, and a `Verified:` line to paste into the stamp. Full logs stay in the out folder. Exit 0 means every stage passed, 1 a stage failed, 3 a stage did not run.

## What to do with the result

- **Before a commit that changes code:** run it with no flags. A red in a file you changed is yours; fix its cause. A red that is also red on clean main is named in the stamp as red on main too.
- **Before a pull request that changes a screen:** add `--screen` for each screen it changes, put each picture in the pull request beside its mock or the owner's words, and paste the `Verified:` line into the stamp (`done-proof`, section 8).
- **DID NOT RUN is never a pass.** Say which stage did not run and why (no bench, no browser, no merge base). Never swap in a mock, a stand-in or a guess.
- **Three real attempts at a red's cause, then stop** and post "for the CTO" on the crew's thread (`done-proof`, section 4). A rerun is not an attempt.
- **In a cloud container:** set `BENCH_BROWSER=/opt/pw-browsers/chromium` (the script also finds that path itself) and `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` for npm.

## How this fits the owner's Oct 29 rule

AGENTS.md, "Builders build; checkers check": a builder runs only the test files it wrote or changed. Under `done-proof` (CTO, Nov 16) the fast set also runs before a pull request: the changed files' checks and the guards. This script is that fast set. Typecheck, the full suite and the 20-year run stay with the checker and the merge desk (`merger`); `--typecheck` runs it here only when asked.

## Gotchas (Nov 16 and 17)

One line each: what happened, its cause, and what to do.

- Nov 16, 23:52Z: a British spelling in a skill turned `guards` red on every pull request. Cause: the English guard reads skills too. The default run includes the guards, so it catches this before the commit.
- Nov 16, 23:52Z (#9753): eslint failed with `'URL' is not defined` in a browser check. Cause: `no-undef` reads `.mjs` files, this one included. Declare exactly the globals a script uses on its `/* global */` line.
- Nov 17 (Screens): a check that clicks into the room before the opening talk ends finds the address still speaking. Cause: the opening plays first. The script starts every life with `startLife`, which plays it, and never Skip scene.
- Nov 17 (Speed): the bench server "at 124% CPU" after a build was `ps` reading a lifetime average. Cause: a misread, not a leak. The script stops the server it started, so nothing is left running.

## More in this folder

Read each file here when its moment comes:

- `.claude/skills/verify/scripts/verify.mjs` (the same file sits under `.agents/skills/verify/scripts/`): the script; `--help` prints its options.
- `references/play-walks.md`: before a build goes to the owner, after a train of screen or words pull requests, when reading a words or screen pull request on screen, or when someone says the game says nothing.
