---
id: gov-prestart-government-test-red-on-main
title: "src/core2/pre-start-government.test.ts is red on clean main: 'Cannot read properties of undefined (reading find)'"
area: gov
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/pool-gov-prestart-government-test-red-on-main
pr: #8257
blocked-on:
lead: cto
standard: 2
model: sonnet
effort: low
root: rc2-done-from-records
source: Fable, Nov 10, 2026, found by a helper building the life record's second step and rerun on clean main
after:
checked: fable 2026-11-10
claimed-at: 2026-11-10T22:56:50.646Z
branch: claude/pool-gov-prestart-government-test-red-on-main
merged-at: 2026-11-10T23:37:42.113Z
seen-by: second-session-1
seen-at: 2026-11-11T00:20:39.903Z
---

**What.** On clean main on Nov 10 (after #8116, before the life record pull requests), `npx vitest run src/core2/pre-start-government.test.ts` fails its one test, 'lists how an official reached their seat before the start, by record id', with 'TypeError: Cannot read properties of undefined (reading find)'. A helper on a branch from an earlier main saw the same test fail as `personCard(...).seats` being undefined, so the card the test reads no longer carries the field it expects (the person card's list of seats). Either the card stopped returning seats for that person or the test reads a card shape that has since changed. The test draws its own place; the run printed no place or seed before the error.

**Cause.** Found in code: src/core2/pre-start-government.test.ts (line 38) reads personCard(core, holder).seats, but personCard in src/bench/card.ts (line 45) returns no seats field, while knownCard (line 1019, seats at line 1211) does.

**Fix.** Change the test to read the card a click opens (knownCard) and say so in the PR; if the life-record work moves seats, read them from its reader instead. Never skip the test.

**Time box.** 1 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Red main comes first (owner, Oct 15): this red is fixed at its root on its own pull request before other work. No hand-written player text in code and screens show record data: if the card dropped an official's seats, that is a loss on a screen the player reads and is fixed in the card; if only the test's reading is stale, the test is fixed and the pull request says which. A test is never skipped or deleted to get green.

**Done when.** `npx vitest run src/core2/pre-start-government.test.ts` passes on main in three drawn places named with their seeds, and the pull request says which side was wrong. A second session opens an official's card in the running game in a drawn place and reads how they reached their seat before the start, with the record opening in dev mode's Trace.

**Waits on.** Nothing.

**Files.** src/core2/pre-start-government.test.ts, src/bench/card.ts, src/core2/modules/offices.ts

**Notes.** Not checked: which commit turned it red. The life record's first step (#8115, open) rewrites the card's history assembly; this failure is on main without it. Skill red-main says how to take it from here.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-10 22:49 UTC) on branch claude/pool-gov-prestart-government-test-red-on-main.

Seen in the game (2026-11-11, second-session-1): Platte Center, Nebraska, seed 6a0d5cf2-a21e-441c-820a-1ac0898f14ff, main 2d2a25ad69a08d788de93ebb458f68c5453b369a: The test passed in three runs (it draws its own place each run); in the game Avery Harrington's card from the Politics sheet read 'served as council member since 2023' and 'took office as council member', and the trace route opened her seat record with reached 'in office at the opening' (trace called by route, not clicked; card text does not say how she reached the seat).
