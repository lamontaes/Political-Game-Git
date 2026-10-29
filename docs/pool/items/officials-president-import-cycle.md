---
id: officials-president-import-cycle
title: "The officials roster and the president's file import each other, so a test that loads the director first fails before it runs"
area: core
kind: bug
priority: 2
size: S
lead: wire-elections
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On main at 4d9066aed9, npx vitest run src/director/player-asks-for-a-vote.test.ts fails at load with TypeError: Cannot read properties of undefined (reading 'president') at src/core2/officials-president.ts:29, through src/core2/modules/officials.ts:55 and src/core2/modules/record.ts:19. officials-roster.ts imports appointments.ts, which imports modules/elections.ts, which reaches officials-president.ts while officials-roster.ts is still loading, so OFFICIALS_DATA is undefined. The cycle came in with 59bceeaed9 (the world swing reaches officials through the elections entry). The vote-ask test has not run on main since.

**Rules.** One engine per mechanic; fix the cycle at the import, not by reordering test imports.

**Done when.** npx vitest run src/director/player-asks-for-a-vote.test.ts loads and passes on main; no file under src/core2 imports in a cycle through officials-roster.ts.

**Files.** src/core2/officials-president.ts, src/core2/officials-roster.ts, src/core2/appointments.ts, src/core2/modules/elections.ts

**Notes.** Oct 29 07:05 UTC, Words and director: #6753 removes the two load-time reads of the roster's copy (officials-president.ts DATA, modules/officials.ts candidacy), so the vote-ask test loads and passes again (Edgeley, North Dakota, run seed e1862627959d449c). The cycle itself (done-when line 2) is still open for the elections lead.
