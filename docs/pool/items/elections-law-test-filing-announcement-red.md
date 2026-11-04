---
id: elections-law-test-filing-announcement-red
title: "elections-law.test.ts fails its filing-announcement check on main in Waimea, Hawaii and Durham, New Hampshire"
area: elections
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Confirmer replay of #7239's unit on main 7898b3ea2c: npx vitest run src/core2/elections-law.test.ts fails 'the filing announcement's tag follows the contest's basis; a next contest points at the serving term' in Waimea, Hawaii (US-HI, seed e7e4517e988c, its own draw) and again with GOLDEN_PATH_SEED=e7e4517e988c, which drew Durham, New Hampshire (US-NH): 1 failed, 17 passed. The assertion lists contests from 2026 to 2030 (president 2028-11-07, U.S. Senate 2030 and 2028, U.S. House 02 2026). #7239 (Alabama towns vote in 2025) last changed this test.

**Rules.** Red main comes first (red-main skill). Fix at the root in the engine or data the test reads; never loosen the assertion or skip a place. One rule, all 56 places.

**Done when.** GOLDEN_PATH_SEED=e7e4517e988c npx vitest run src/core2/elections-law.test.ts passes on main, and so do three fresh draws from all 56 (place and seed named in the PR); the PR names the cause by file and line.

**Files.** src/core2/elections-law.test.ts, src/core2/elections-calendar.ts, src/core2/gov-rules/

**Notes.** TODO
