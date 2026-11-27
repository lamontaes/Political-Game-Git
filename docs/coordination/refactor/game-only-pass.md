# The game-only pass (owner, Nov 26, about 1:40 p.m.)

**The owner:** "this will completely slim the game stuff down to, like the game code and stuff, down to the absolute minimum. No tests, no notes, other than stopgaps... no attributions, nothing. Just straight game code. Like if I were to download a game online and I were to open the folder and look at all the files, it should just be the game stuff." His pick: **"Game folder clean, workshop separate"**, run **after the builders finish**.

**When:** last, after the other four sessions (History, Talk engines, Reach-ins, Past and Day One) post that their queues are done, or after the CTO says go on #10377. It touches nearly every file they edit, so it never runs alongside them.

**What it does, each step on its own branch:**

1. **Tests out of the game folder.** Move every `*.test.ts`, `*.spec.ts` and `*.browser.mjs` (1,734 test files on Nov 26), and the browser tests' helpers src/bench/start-life.mjs, dev-setup.mjs and ui-look-scan.mjs (added Nov 27, screens SC6), out of `src/` into a `tests/` tree that mirrors the paths. Update `vite.config.ts` test includes, the workflows' test-file filters (validate's "changed test files" step, heavy's shards, the unrun-files list), `tests/guards`, the skills and the docs that name test paths. `src/` keeps only game code.
2. **Notes out of the code.** Strip owner quotes, dates, CTO-line ids, PR numbers and attributions from comments in `src/`.
   - **Keep:** stopgap markers (`stopgap(...)`, `SG-...` ids) and short comments that say what a line does or why, in plain words.
   - **Move** any ruling a comment carried that isn't already recorded into `docs/coordination/OWNER-DECISIONS.md` first, so nothing he said is lost.
   - Comments only. No behavior change; the records proof must match.
3. **The workshop in one place.** Docs, skills, rules, CI, scripts and research stay outside the game folder. Nothing in `src/`, `public/` or `art/` is a note, a test or a doc.
4. **The shipped app holds only game files.** In `desktop/electron-builder.yml`, keep `desktop/tests/**` (and any other non-game file) out of the packaged app. Check by listing a staged package's files.
5. **A guard so it stays that way.** A check fails when a test file, a Markdown note, or a comment holding an owner quote, a date-stamped ruling or a PR attribution lands under `src/`, `public/` or `art/`. Stopgap markers are allowed. It must go red on the old tree.

**Rules:** the same as the cleanup assignment. Structure only, with an identical `speed:year` records proof. Never edit bank lines. Never loosen a check; moved tests keep every assertion. Update every pointer in the same change.
