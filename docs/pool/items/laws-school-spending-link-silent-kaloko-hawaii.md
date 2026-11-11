---
id: laws-school-spending-link-silent-kaloko-hawaii
title: "The schools line's web link never fires in the health and schools test's Kaloko, Hawaii world"
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
lead: laws
blocked-on:
source: added by hand on claude/laws-medical-debt (the lead's builders do not push to main)
after: laws-teacher-minimum-misses-a-named-teacher
model: haiku
effort: low
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** src/core2/law-wiring-health-schools.test.ts fails in Kaloko, Hawaii (place 1526867, world seed 9d81ae8d65f3ef846ff8b7ee8a840ad51e55175bffa3f89648ffe0fb3d44f2bc; pin it with GOLDEN_PATH_PLACE_KEY=1526867 GOLDEN_PATH_WORLD_SEED=9d81ae8d65f3ef846ff8b7ee8a840ad51e55175bffa3f89648ffe0fb3d44f2bc): "the web link school-spending-to-attainment never fired". The town's web month rows hold no effect for the link in any month from 2025-01-23 to 2026-05 although the test raises the schools line on its first day. It fails the same way with and without the Nov 1 changes on claude/laws-medical-debt. Guards: raising the schools line moves the school measure the player reads on the Metrics tab in every town.

**Cause.** Measured: on main d59e6935d7, `GOLDEN_PATH_PLACE_KEY=1526867 GOLDEN_PATH_WORLD_SEED=9d81ae8d65f3ef846ff8b7ee8a840ad51e55175bffa3f89648ffe0fb3d44f2bc npx vitest run src/core2/law-wiring-health-schools.test.ts` (Kaloko, Hawaii) now fails before the school spending link is checked: "counted teachers covered: expected 0 to be 14" (line 637), while the link is checked at line 889. A probe, since removed, printed the teacher question's rows for Hawaii: the test enacts it on 2025-01-23, and Hawaii's sitting legislature answers it no by HB 20 from 2025-02-24. So the engine rightly ends every teacher row, and the test's later checks of that law fail too ("no applied record"). This is the cause written in `laws-teacher-minimum-misses-a-named-teacher` (HB 12 in Hauula). Whether `school-spending-to-attainment` fires in Kaloko cannot be read until the test gets past the teacher law.

**Fix.** Nothing of its own yet. Once `laws-teacher-minimum-misses-a-named-teacher`'s test fix lands (coverage read against the law in force), re-run the command above. If the link still never fires, read Kaloko's web month rows and the cause row the link reads (`budget.schools-added-pct`), write what is seen into this item, and build only then.

**Time box.** 1 hour for one Haiku session, after the teacher item lands.

**Rules.** One rule for all 56 places. Read the records first: the schools line's raise (the council's budget row and the treasury's payments on it), and the cause the web reads for the link (budget.schools-added-pct) in the town's month rows.

**Done when.** After the teacher item's fix is on main, a second session runs the test on the Kaloko pin above and one fresh seed, and sees it pass, with `school-spending-to-attainment` firing in a named web month row by record id.

**Waits on.** laws-teacher-minimum-misses-a-named-teacher.

**Files.** src/core2/law-wiring-health-schools.test.ts, src/core2/modules/outcome-web.ts, src/core2/budgets-treasury.ts

**Notes.** Found Nov 1 by the laws lead's builder on claude/laws-medical-debt. The same world first failed on medicaid-expansion-to-medical-debt never firing: Hawaii's legislature passed HB 23 restoring the expansion on 2025-03-04, the same day as the test's repeal, and the test's latest-row helper broke the tie the other way from the web's lawValue, so the test never repealed it again. The test's helpers now read the latest row as the web does (latestAt), and the expansion's link fires there.

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_PLACE_KEY=1526867 GOLDEN_PATH_WORLD_SEED=9d81ae8d...f2bc npx vitest run src/core2/law-wiring-health-schools.test.ts` (Kaloko, Hawaii): still red, but at a different assertion than the item names: "counted teachers covered: expected +0 to be 14". The school-spending link message did not print first. No fresh draw run (red).

Nov 11 (cause finder for Fable B): ran the pinned Kaloko repro on main d59e6935d7. It now stops at the teacher checks, because Hawaii's legislature repeals the teacher minimum during the run (HB 20, from 2025-02-24), which is the teacher item's cause. The school spending link is not reached. This item waits on that fix and then re-measures.
