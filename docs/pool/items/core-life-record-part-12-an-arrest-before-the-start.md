---
id: core-life-record-part-12-an-arrest-before-the-start
title: "The life record, part 12: a past can hold an arrest or charge before the start, from the justice engine's own rates"
area: people
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: high
root: design-life-record
source: gap sheet, Nov 12, 2026 (Fable A), filed by the Life records builder opus-lr
checked: opus-lr 2026-11-12
---

**What.** The owner, Nov 8: "None of my history is simulated." A past never holds an arrest or a charge, though a real share of adults have one (gap sheet, Nov 12, row 4). The justice engine already writes these records in play. Seen: a person's card and the Journal, which tell the charge with a year.

**Cause.** Found in code: `src/core2/modules/justice.ts` writes `justice.charged` (line 814) and `justice.convicted` (line 1038) only from an investigation in play; no writer of the past (`src/core2/past-*.ts`, `openWholePast` in src/core2/modules/people.ts line 577) reads its rates before the start.

**Fix.** Research first (skill `researcher`): the share of adults ever arrested and ever convicted by age and sex (BJS and NLSY97 cumulative arrest shares), as rows in `src/core2/data/past/parameters.json`. When a person is opened, their own lean (the same trait leans the justice engine reads for offending and pleas) against a seeded line says whether and when they were charged, written as the justice engine's own record kinds dated before the start (`justice.charged`, and `justice.convicted` with a short sentence served where the share says so), so `lifeOf` tells them through the existing `law/*` rows. Nothing is told publicly unless a conviction is a public record, as in play.

**Time box.** 1 hour of research and 5 hours of building, Sonnet.

**Rules.** No dice: the person's traits and seeded line decide; the rates check totals. One engine: the justice engine's record kinds, no second justice model.

**Done when.** A test in three drawn places opens every town adult and prints the share ever charged and convicted by age band against the researched shares; every record has a year and is on `lifeOf`. A second session sees one such past on a card on main.

**Waits on.** Nothing.

**Files.** src/core2/modules/justice.ts, src/core2/modules/people.ts, src/core2/data/past/parameters.json, src/core2/data/life/remembered.json
