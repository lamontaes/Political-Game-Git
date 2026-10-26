---
id: web-matrix-unrun-links-not-reaching
title: "The effect matrix grades a link the web does not run as not reaching, with its reason"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/web-matrix-unrun-links
pr: #6008
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T18:54:56.096Z
---

**What.** scripts/outcome-web/effect-matrix.ts grades a link's reach point as pass when an engine reads its outcome, even when the web does not run the link and nothing carries it (coverage.json lists it under waiting). About a dozen links grade as reaching this way, for example coverage-to-mortality-55-64 (its cause is each person's own coverage), marriage-equality-to-coverage (no engine records its cause), disaster-to-out-migration, rent-burden-to-homelessness and defense-contracts-to-earnings. None can move a record, so they inflate the count of links that reach people and are missing from the unwired list. Grade a waiting, uncarried link as not reaching, give it its specific reason and stopgap, and regenerate the unwired list.

**Rules.** An effect is a read, not a record: a link reaches only when the web runs it into an engine that reads it, or an engine carries its cause. Never delete stopgap rows; mark them resolved.

**Done when.** effect-matrix.ts regenerated on a branch from main grades every link coverage.json lists as waiting and not carried as not reaching, with its waitingOn reason; each appears in unwired.json with a specific stopgap row; outcome-web-unwired.test.ts passes, and a test fails if a waiting link grades as reaching. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** scripts/outcome-web/effect-matrix.ts, scripts/outcome-web/write-unwired.ts, src/core2/outcome-web-unwired.test.ts

**Notes.** Filed Oct 25 by the effects lead while writing the health family's played proof: 29 links are waiting in coverage.json and pass the reach point, of which about a dozen are not carried.
