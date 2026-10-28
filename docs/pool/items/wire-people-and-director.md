---
id: wire-people-and-director
title: "Wire people and the director: one relation and closeness reader for the card, the family sheet, the calendar and every scene; acquaintances from employer and school records; the card shows its past"
area: director
kind: feature
priority: 1
size: M
status: claimed
claimed-by: claude/wire-people-and-director
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T05:25:06.603Z
---

**What.** Engine map lines 10, 11, 12, 13 and 25. One relation reader, familyRelation and closenessBetween (src/core2/closeness.ts:269 and :85), serves the director, the person card, the family sheet and the calendar; kinRelations (src/director/ledger.ts:260) and the eight prefix loops are deleted. Director threads fade by closenessBetween; the director's own half-life rows are deleted. Coworkers and schoolmates come from the employer's staff (the jobs engine) and the school's records (src/director/school.ts), not generated acquaintance facts. The person card shows the past and seats it already receives. One polling-place path: the situation type, not the bespoke visit. Time box: 4 hours.

**Rules.** Replace, never layer: every PR deletes the second path and counts it. One engine per mechanic and the simulation as the one layer (AGENTS.md first bullet). No new mechanic (AGENTS.md step 0): a missing piece is a registered stopgap naming the engine. Every cut corner a registered stopgap. The guards on main (npm run guards, sixteen ids in scripts/guards/index.ts) pass on every PR; a shrinking baseline is lowered in the same PR. Sessions never message; the channel block and PR bodies are the record. One PR per line; mergers merge on green; a golden-path red that reproduces on clean main does not block. Guards: one-history, no-second-source, families.

**Done when.** In a drawn place (name it and the seed), a known person's scene and their card read the same tie and the same history by record id; the deleted readers are gone (grep named); the one-history proxy list is shorter by the acquaintance kinds.

**Files.** src/core2/closeness.ts,src/director/ledger.ts,src/director/scheduling.ts,src/director/school.ts,src/bench/card.ts,src/bench/play.mjs

**Notes.** Filed by the CTO from the engine map on the owner's go (Oct 28). engine: closeness.ts, jobs engine, school.ts. guard: one-history, no-second-source, families. Read: OWNER-DECISIONS, the engine map, duplicates report (X1, X2, W7, H5, S3, W5). Starts wiring when the Trim block says the people deletions landed.
