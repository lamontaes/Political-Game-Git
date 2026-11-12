---
id: justice-federal-case-stream
title: "A federal case stream from BOP and Sentencing Commission data, so mandatory minimums have a reader"
area: world
kind: feature
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on: justice-federal-case-stream-part-1-case-on-open, justice-federal-case-stream-part-2-door-and-proof
lead: governing
model: sonnet
effort: medium
root: rc1-world-outside-town
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Federal laws (mandatory minimums, drug sentencing) need a case stream so they reach a person, not only a count. The counts half is on main: src/core2/modules/federal-courts.ts keeps the federal courts as a monthly flow and a stock by offense group from the Sentencing Commission's yearly admissions (data/research/justice/ussc-federal-sentencing-fy2025.json) and the Bureau of Prisons table (data/research/justice/bop-federal-offenses-2026.json, 152,107 in custody, fetched Nov 8), checks the stock against the Bureau's table without steering to it, and reads the reduce-mandatory-minimums law (`REDUCE_MANDATORY_MINIMUMS`, `reductionFactor`). What is left is the case: its header says "No case, judge or defendant is kept" and that who was sentenced "is built when someone opens the case". Add a federal case through the existing justice case flow, built when opened, so one defendant, one judge and one sentence exist, and the sentencing floor the mandatory-minimum question sets is the one the case reads. Feeds: nation-president-orders-by-series-part-4-pardons, which waits on it.

**Cause.** Design: docs/design/country-tier.md (the rest of the country kept as counts and built into people when someone looks). Found in code: src/core2/modules/federal-courts.ts (`federalCourtsFor`, line 142, and the header comment) keeps flow and stock only, and src/core2/modules/justice.ts has no federal court or federal defendant (its office handling at line 1426 returns null for a federal office), so SG-LAWS-federal-position-no-reader in src/core2/data/stopgaps/laws.json still lists mandatory minimums.

**Fix.** Build it in two parts: part 1 builds a federal case, defendant and sentence on open from the flow through justice.ts; part 2 adds the door that opens one, proves the stock against the Bureau's table by offense group over ten years, and shows that an enacted mandatory-minimum bill changes the floor the case reads.

**Time box.** 2 hours for one Sonnet session, the closing check once both parts are done. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No dice: sentences come from the Sentencing Commission's means and the law in force, never a roll. One engine: justice.ts case flow, not a second court system. One model, two tiers: a counted federal case is read by the same rule as a named one, times its count. Estimate, never UNKNOWN: sizes are SOURCED with citation. Real figures (the Bureau's table) are reported next to the result, never steered to (owner, Nov 8: ranges aren't targets).

**Done when.** A second session, not the builder, plays two drawn places (names and seeds in the PR body). Federal convictions appear each year by offense group with sentences, a federal case opened from the flow names its defendant, judge and sentence by record id through justice.ts, the federal prison stock after ten years is shown next to the Bureau's table by offense group, and with the mandatory-minimum question enacted by a real bill the sentencing floor the case reads changes and the law checker grades its reach. SG-LAWS-federal-position-no-reader loses this question.

**Waits on.** justice-federal-case-stream-part-1-case-on-open and justice-federal-case-stream-part-2-door-and-proof.

**Files.** src/core2/modules/justice.ts, src/core2/modules/federal-courts.ts, data/research/justice/bop-federal-offenses-2026.json, data/research/justice/ussc-federal-sentencing-fy2025.json, src/core2/modules/laws.ts, src/core2/data/stopgaps/laws.json

**Notes.** Found by the Dev Tester, Nov 8 night. BOP figures fetched; USSC figures still to fetch.

Nov 10, Fable audit: the audit of Nov 9 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 3, "Washington", read in the code) found that "The federal courts module counts prisoners and hears no cases." Confirmed on main, Nov 10: `src/core2/modules/federal-courts.ts` (Nation, Nov 8) now keeps the federal courts as a monthly flow and a stock by offense group from the Sentencing Commission and Bureau of Prisons tables, and its header says "No case, judge or defendant is kept" and that who was sentenced "is built when someone opens the case (pool item justice-federal-case-stream)". So the counts half of this item is on main, and the case stream (a case, a judge and a defendant built on open, and a door on a screen that opens one) is what is left. The audit ran no check on the federal prison stock against the Bureau's table. The other parts of the audit's "Washington barely acts" finding have evidence on `gov-congress-passes-policy-laws` and `nation-president-orders-by-series`.
