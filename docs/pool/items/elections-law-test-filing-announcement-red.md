---
id: elections-law-test-filing-announcement-red
title: "elections-law.test.ts fails its filing-announcement check on main in Waimea, Hawaii and Durham, New Hampshire"
area: elections
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Confirmer replay of #7239's unit on main 7898b3ea2c: npx vitest run src/core2/elections-law.test.ts fails 'the filing announcement's tag follows the contest's basis; a next contest points at the serving term' in Waimea, Hawaii (US-HI, seed e7e4517e988c, its own draw) and again with GOLDEN_PATH_SEED=e7e4517e988c, which drew Durham, New Hampshire (US-NH): 1 failed, 17 passed. The assertion lists contests from 2026 to 2030 (president 2028-11-07, U.S. Senate 2030 and 2028, U.S. House 02 2026). #7239 (Alabama towns vote in 2025) last changed this test.

**Cause.** Needs cause. Looked at: `npx vitest run src/core2/elections-law.test.ts` on main 7898b3ea2c fails 'the filing announcement's tag follows the contest's basis; a next contest points at the serving term' (1 failed, 17 passed) in Waimea, Hawaii (US-HI, seed e7e4517e988c) and with GOLDEN_PATH_SEED=e7e4517e988c in Durham, New Hampshire (US-NH). The assertion lists contests from 2026 to 2030, and #7239 last changed the test. `src/core2/elections-calendar.ts` and `src/core2/gov-rules` have not been read.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session, to read the earlier fixes to this test, find the cause and fix it.

**Rules.** Red main comes first (red-main skill). Look before you ask: the earlier fixes to this test, such as #7239, are read first so the cause is found in the engine or data and not guessed again. One rule, all 56 places: never skip a place or loosen the assertion. Fix at the root in the engine or data the test reads.

**Done when.** A second session runs `GOLDEN_PATH_SEED=e7e4517e988c npx vitest run src/core2/elections-law.test.ts` on main and it passes, and so do three fresh draws from all 56 (place and seed written down). The cause is named by file and line, and in the running game the filing announcement in Waimea, Hawaii reads the contest's own basis and points a next contest at the serving term.

**Waits on.** Nothing.

**Files.** src/core2/elections-law.test.ts, src/core2/elections-calendar.ts, src/core2/gov-rules

**Notes.** TODO
