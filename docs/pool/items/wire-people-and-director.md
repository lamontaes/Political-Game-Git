---
id: wire-people-and-director
title: "Wire people and the director: one relation and closeness reader for the card, the family sheet, the calendar and every scene; acquaintances from employer and school records; the card shows its past"
area: director
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Engine map lines 10, 11, 12, 13 and 25. One relation reader, familyRelation and closenessBetween (src/core2/closeness.ts:269 and :85), serves the director, the person card, the family sheet and the calendar; kinRelations (src/director/ledger.ts:260) and the eight prefix loops are deleted. Director threads fade by closenessBetween; the director's own half-life rows are deleted. Coworkers and schoolmates come from the employer's staff (the jobs engine) and the school's records (src/director/school.ts), not generated acquaintance facts. The person card shows the past and seats it already receives. One polling-place path: the situation type, not the bespoke visit. Time box: 4 hours.

**Rules.** Replace, never layer: every PR deletes the second path and counts it. One engine per mechanic and the simulation as the one layer (AGENTS.md first bullet). No new mechanic (AGENTS.md step 0): a missing piece is a registered stopgap naming the engine. Every cut corner a registered stopgap. The guards on main (npm run guards, sixteen ids in scripts/guards/index.ts) pass on every PR; a shrinking baseline is lowered in the same PR. Sessions never message; the channel block and PR bodies are the record. One PR per line; mergers merge on green; a golden-path red that reproduces on clean main does not block. Guards: one-history, no-second-source, families.

**Done when.** In a drawn place (name it and the seed), a known person's scene and their card read the same tie and the same history by record id; the deleted readers are gone (grep named); the one-history proxy list is shorter by the acquaintance kinds.

**Files.** src/core2/closeness.ts,src/director/ledger.ts,src/director/scheduling.ts,src/director/school.ts,src/bench/card.ts,src/bench/play.mjs

**Notes.** Filed by the CTO from the engine map on the owner's go (Oct 28). engine: closeness.ts, jobs engine, school.ts. guard: one-history, no-second-source, families. Read: OWNER-DECISIONS, the engine map, duplicates report (X1, X2, W7, H5, S3, W5). Starts wiring when the Trim block says the people deletions landed. Oct 28, 08:45 UTC (wire-people-and-director session, box spent): set back to open. **Done:** line 13 (#6538, merged) and line 12 (#6585, merged). **In PR, ready:** line 10 (#6596, branch `claude/wire-people-one-relation-reader`; `familyFactsOf` is the one relation reader, and `kinRelations` and the nine prefix loops are deleted; it also carries the `tie-turns` test fix main needs since #6585) and line 11 (#6603, branch `claude/wire-people-thread-fade`, stacked on #6596; threads fade by `currentCloseness` on the relationship record). With those merged, the done-when's three lines have their evidence (`src/bench/card-shared.test.ts`, `src/director/thread-fade.test.ts`; places and seeds in the PR bodies). **Left:** line 25, one polling-place path, not started. The `polling-place` type's cause waits on an `election-day` producer, while `src/bench/player.ts:322` calls `pollingVisitDue` (`src/director/polling-place.ts`) directly, with its own voter rule (`mayVote`, `votingAge` 18 in `src/director/data/polling-place.json`). To wire it: a director producer that stages `polling-place` on an election date for each watched voter the voting engine counts; `player.ts` reads the scheduled entry; `pollingVisitDue` gives way to building the ballot for that entry; the voter rule comes from the voting engine (and the age from the election-law row, line 24, `wire-elections-and-campaigns`); keep `polling.browser.mjs` and `election-day.browser.mjs` green. Also left from line 10: `src/core2/estates.ts:85` keeps a first-fact `relationsOf` that decides who inherits, so moving it to `familyFactsOf` (latest fact) changes estates and gets its own PR. Stopgap registered: `SG-WIRE-PEOPLE-SCHOOLMATES`.
