---
id: officials-president-import-cycle
title: "The officials roster and the president's file import each other, so a test that loads the director first fails before it runs"
area: core
kind: bug
priority: 2
size: S
lead: wire-elections
status: done
claimed-by:
pr: #8173
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: sonnet
effort: medium
root: none
merged-at: 2026-11-10T18:39:31.368Z
seen-by: second-session-2
seen-at: 2026-11-11T01:32:42.643Z
---

**What.** The officials roster and the president's file import each other, so a test that loads the director first fails before it runs. On main at 4d9066aed9, npx vitest run src/director/player-asks-for-a-vote.test.ts failed at load, because officials-roster.ts imports appointments.ts, which imports the elections module, which reaches officials-president.ts while officials-roster.ts is still loading. The load-time crash is worked around, but the cycle itself is still there. Remove the import that closes the cycle.

**Cause.** Found in code: src/core2/officials-roster.ts line 16 imports partySide from ./appointments, and src/core2/appointments.ts line 18 imports worldRoster from ./modules/elections, which reaches src/core2/officials-president.ts, where lines 26 to 28 keep a comment-marked workaround that reads the officials file directly.

**Fix.** Move the worldRoster read out of appointments.ts (pass it in or read it lazily) so officials-roster.ts no longer reaches the elections module, then delete the workaround comment and the direct read in officials-president.ts.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: fix the cycle at the import, not by reordering test imports. Replace, never layer: the import that closes the cycle is removed or moved in the same change, and no second loader or load-order workaround is left beside it. One rule, all 56 places: the vote-ask test draws its place.

**Done when.** A second session runs npx vitest run src/director/player-asks-for-a-vote.test.ts on main and sees it load and pass in a drawn place (place and run seed named), and sees by reading the imports that no file under src/core2 imports back into officials-roster.ts through appointments.ts, and the workaround comment in officials-president.ts is gone.

**Waits on.** Nothing.

**Files.** src/core2/officials-president.ts, src/core2/officials-roster.ts, src/core2/appointments.ts, src/core2/modules/elections.ts, src/director/player-asks-for-a-vote.test.ts

**Notes.** Oct 29 07:05 UTC, Words and director: #6753 removes the two load-time reads of the roster's copy (officials-president.ts DATA, modules/officials.ts candidacy), so the vote-ask test loads and passes again (Edgeley, North Dakota, run seed e1862627959d449c). The cycle itself (done-when line 2) is still open for the elections lead.

Seen in the game (2026-11-11, second-session-2): drawn seed 7ae2be4ff3b9 (test world), seed 7ae2be4ff3b9, main 32a6683b: player-asks-for-a-vote.test.ts loaded and passed on a fresh seed, appointments.ts does not import officials-roster, and the workaround comment is gone
