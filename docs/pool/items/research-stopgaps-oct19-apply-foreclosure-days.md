---
id: research-stopgaps-oct19-apply-foreclosure-days
title: "A foreclosure with no published timeline takes the median days of its state's process"
area: core
kind: stopgap
priority: 3
size: S
status: done
claimed-by: claude/apply-stopgaps-d2
pr: #5465
blocked-on:
source: "data/research/stopgaps-oct19/D-economy-world.json"
claimed-at: 2026-10-20T03:33:04.306Z
lead: researcher
---

**What.** The one row SG-WORLD-housing-foreclosure-steps of the Oct 19 stopgap research: a place with no published average days from first filing to sale takes the median of its process class (nonjudicial, judicial, both) computed from the places whose own average is published, in place of the national average.

**Done when.** In a played world in a place drawn from all 56, a foreclosure in a place with no published average runs the days of its process median (174, 2007 or 2293), shown by `housing-foreclosure-days.test.ts` over all 56 places from the data, with the place and seed named and the foreclosure's record id; a place's own published average still wins; the statute's notice days remain the floor; and the stopgap row stays open with revised text for the unread statutes.

**Files.** src/core2/housing-foreclosure.ts, src/core2/housing-foreclosure-days.test.ts, src/core2/data/stopgaps.json

**Notes.** A bounded slice of research-stopgaps-oct19-apply, which stays open for the other rows (merger send-back of Oct 20 and Oct 27).

Oct 29 (CTO): set done; PR #5465 merged (the done flip failed while branch protection refused the flip job's push).
