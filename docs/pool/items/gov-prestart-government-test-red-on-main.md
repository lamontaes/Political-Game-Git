---
id: gov-prestart-government-test-red-on-main
title: "src/core2/pre-start-government.test.ts is red on clean main: 'Cannot read properties of undefined (reading find)'"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: cto
source: Fable, Nov 10, 2026, found by a helper building the life record's second step and rerun on clean main
---

**What.** On clean main on Nov 10 (after #8116, before the life record pull requests), `npx vitest run src/core2/pre-start-government.test.ts` fails its one test, 'lists how an official reached their seat before the start, by record id', with 'TypeError: Cannot read properties of undefined (reading find)'. A helper on a branch from an earlier main saw the same test fail as `personCard(...).seats` being undefined, so the card the test reads no longer carries the field it expects (the person card's list of seats). Either the card stopped returning seats for that person or the test reads a card shape that has since changed. The test draws its own place; the run printed no place or seed before the error.

**Rules.** Red main comes first (owner, Oct 15). A view shows record data, so if the card dropped an official's seats that is a player-facing loss to fix in the card; if only the test's reading is stale, fix the test and say which. Never skip or delete the test to get green.

**Done when.** `npx vitest run src/core2/pre-start-government.test.ts` passes on main in three drawn places named with their seeds, and the pull request says which side was wrong. A second session opens an official's card in the running game in a drawn place and reads how they reached their seat before the start, with the record opening in dev mode's Trace.

**Files.** src/core2/pre-start-government.test.ts, src/bench/card.ts, src/core2/modules/offices.ts

**Notes.** Not checked: which commit turned it red. The life record's first step (#8115, open) rewrites the card's history assembly; this failure is on main without it. Skill red-main says how to take it from here.
