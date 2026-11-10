---
id: elections-law-test-filing-announcement-red
title: "elections-law.test.ts fails its filing-announcement check on main in Waimea, Hawaii and Durham, New Hampshire"
area: elections
kind: bug
priority: 1
size: S
status: merged
standard: 2
claimed-by: claude/fable-stance-listeners-cycle
pr: #8243
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: added with npm run pool -- add
checked: fable 2026-11-10
merged-at: 2026-11-10T23:29:21.435Z
---

**What.** Confirmer replay of #7239's unit on main 7898b3ea2c: npx vitest run src/core2/elections-law.test.ts fails 'the filing announcement's tag follows the contest's basis; a next contest points at the serving term' in Waimea, Hawaii (US-HI, seed e7e4517e988c, its own draw) and again with GOLDEN_PATH_SEED=e7e4517e988c, which drew Durham, New Hampshire (US-NH): 1 failed, 17 passed. The assertion lists contests from 2026 to 2030 (president 2028-11-07, U.S. Senate 2030 and 2028, U.S. House 02 2026). #7239 (Alabama towns vote in 2025) last changed this test.

**Cause.** Measured: `GOLDEN_PATH_SEED=e7e4517e988c npx vitest run src/core2/elections-law.test.ts` on main e15e039586 (Nov 10; Durham, New Hampshire) runs no test at all: the file fails while loading with "Cannot access 'stanceListeners' before initialization". Three causes sit one behind the other. Found in code: (1) the test's first engine import is src/core2/election-ties.ts, which imports src/core2/modules/views.ts first; the views engine and the campaign engine import each other, so src/core2/modules/interest-groups.ts registered its listener (`registerStanceListener`, its last line) and src/core2/electorate.ts read `VIEWS_KEYS` (`NATIONAL_ENGAGEMENT`) while views.ts was half loaded. (2) With the file loading, the named test failed in every place with "Module has no registered state": `governorLimit` in src/core2/law-reach/group-a-voting.ts read `lawInForce` in a world without the laws engine, where the file's own `inForce` (line 107) answers that no law is in force. (3) With that read guarded, the test's last count failed by draw: it files on the opening day, January 5, 2026, and in most places no race takes filings that day (New Hampshire's open on April 13).

**Fix.** Three small changes. (1) The stance listeners move to src/core2/stance-listeners.ts and the survey keys to src/core2/views-keys.ts, two files that import no engine; views.ts still exports both names, and both files are doors of their family in tests/guards/families.json. (2) `governorLimit` returns no limit where the laws engine is not installed, as `inForce` does. (3) The test runs its world to the first day a race takes filings before it files, and keeps its count.

**Time box.** 4 hours for one Sonnet session, to read the earlier fixes to this test, find the cause and fix it.

**Rules.** Red main comes first (red-main skill). Look before you ask: the earlier fixes to this test, such as #7239, are read first so the cause is found in the engine or data and not guessed again. One rule, all 56 places: never skip a place or loosen the assertion. Fix at the root in the engine or data the test reads.

**Done when.** A second session runs `GOLDEN_PATH_SEED=e7e4517e988c npx vitest run src/core2/elections-law.test.ts` on main and it passes, and so do three fresh draws from all 56 (place and seed written down). The cause is named by file and line, and in the running game the filing announcement in Waimea, Hawaii reads the contest's own basis and points a next contest at the serving term.

**Waits on.** Nothing.

**Files.** src/core2/elections-law.test.ts, src/core2/stance-listeners.ts (new), src/core2/views-keys.ts (new), src/core2/modules/views.ts, src/core2/modules/interest-groups.ts, src/core2/electorate.ts, src/core2/law-reach/group-a-voting.ts, tests/guards/families.json

**Notes.** Found and fixed by Fable on Nov 10 while reading causes; the file had not loaded on main since about Nov 9, so every test in it was hidden.
