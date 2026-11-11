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
after:
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** src/core2/law-wiring-health-schools.test.ts fails in Kaloko, Hawaii (place 1526867, world seed 9d81ae8d65f3ef846ff8b7ee8a840ad51e55175bffa3f89648ffe0fb3d44f2bc; pin it with GOLDEN_PATH_PLACE_KEY=1526867 GOLDEN_PATH_WORLD_SEED=9d81ae8d65f3ef846ff8b7ee8a840ad51e55175bffa3f89648ffe0fb3d44f2bc): "the web link school-spending-to-attainment never fired". The town's web month rows hold no effect for the link in any month from 2025-01-23 to 2026-05 although the test raises the schools line on its first day. It fails the same way with and without the Nov 1 changes on claude/laws-medical-debt. Guards: raising the schools line moves the school measure the player reads on the Metrics tab in every town.

**Cause.** Needs cause. Looked at the item and its pinned repro (GOLDEN_PATH_PLACE_KEY=1526867, world seed 9d81ae8d65f3ef846ff8b7ee8a840ad51e55175bffa3f89648ffe0fb3d44f2bc), but nobody has yet read Kaloko's month rows or the cause row the link reads (`budget.schools-added-pct`), so why the link never fires is not known.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. The session reads the town's budget rows and month rows for the link and rewrites this item with Found in code or Measured and a real Fix.

**Rules.** One rule for all 56 places. Read the records first: the schools line's raise (the council's budget row and the treasury's payments on it), and the cause the web reads for the link (budget.schools-added-pct) in the town's month rows.

**Done when.** A second session, not the fixer, runs the test on the pinned drawn place. The pinned Kaloko world passes the test's lagged-link check, or the PR names by record why the link has no cause there and the test's opening check redraws such a town before it plays.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-health-schools.test.ts, src/core2/modules/outcome-web.ts, src/core2/budgets-treasury.ts

**Notes.** Found Nov 1 by the laws lead's builder on claude/laws-medical-debt. The same world first failed on medicaid-expansion-to-medical-debt never firing: Hawaii's legislature passed HB 23 restoring the expansion on 2025-03-04, the same day as the test's repeal, and the test's latest-row helper broke the tie the other way from the web's lawValue, so the test never repealed it again. The test's helpers now read the latest row as the web does (latestAt), and the expansion's link fires there.

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_PLACE_KEY=1526867 GOLDEN_PATH_WORLD_SEED=9d81ae8d...f2bc npx vitest run src/core2/law-wiring-health-schools.test.ts` (Kaloko, Hawaii): still red, but at a different assertion than the item names: "counted teachers covered: expected +0 to be 14". The school-spending link message did not print first. No fresh draw run (red).
