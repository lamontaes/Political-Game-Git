---
id: laws-income-tax-flatten-sponsor-rate
title: "A graduated income tax's repeal writes the sponsor's own flat rate, not one national rate"
area: laws
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-laws-income-tax-flatten-sponsor-rate
---

**What.** When a catalog act repeals a graduated state or local income tax, it enacts one national flat rate (4.25%) for every place. Real legislatures that flattened chose a rate tied to their own old schedule: five conversions from 2023 to 2026 set the new rate at 0.667 to 1.0 of the old top rate, sourced in data/research/laws/taxfoundation-2022-2026-flat-tax-conversions.json. The provision should carry the rate the sponsor writes from their views and the law in force, as the legislature's rate sections already do through `shapedRate`, so the repeal reads that rate instead of the national parameter and resolves SG-GOV-REACH-B-flat-tax-replacement. Seen: the new flat rate on the bill card when a repeal replaces a graduated income tax.

**Cause.** Found in code: `incomeTaxAct` in src/core2/law-reach/group-b-money.ts (line 1893) enacts `stateFlatIncomeTaxPercent` (lines 1960 and 2064) for every place; the stopgap SG-GOV-REACH-B-flat-tax-replacement is in src/core2/data/stopgaps/gov.json (status open). `shapedRate` (src/core2/modules/legislature.ts, line 1755) is how the legislature's rate sections carry the sponsor's rate.

**Fix.** Carry the sponsor's rate in the repeal provision through `shapedRate`, from the sponsor's views and the place's old schedule, and have `incomeTaxAct` read it instead of the national parameter. Withholding for full and counted workers reads the enacted rate, and an affected worker receives the explanation with a director line. Resolve the stopgap.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Sliding scales and causes: the flat rate comes from the sponsor's views and the place's own old schedule, never one national number, and the sourced conversion band only checks the totals. Wire to the world: withholding for full and counted workers reads the enacted rate. No hand-written player text: the director line comes from the English engine.

**Done when.** A second session, not the builder, plays a drawn place from all 56 in the played world (`buildBenchWorld`, place and seed named). A repeal of a graduated income tax enacts the sponsor's rate from the provision, the law row id shows that rate, a named worker's withholding record reads it, and SG-GOV-REACH-B-flat-tax-replacement is resolved in src/core2/data/stopgaps/gov.json, shown by src/core2/law-reach-group-b.test.ts. The conversion band is reported next to the rate as a figure, not a pass mark. Nothing on screen reads it yet beyond Politics → Budgets.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/modules/legislature.ts, src/core2/data/laws/reach-group-b-parameters.json, data/research/laws/taxfoundation-2022-2026-flat-tax-conversions.json, src/core2/data/stopgaps/gov.json, src/core2/law-reach-group-b.test.ts

**Notes.** TODO

Released (2026-11-11): Read and scoped, not built: it needs a new field on the repeal provision (catalog and bill drafting), shapedRate in legislature.ts to carry the sponsor's rate, incomeTaxAct (group-b-money.ts line ~1960) to read it, a withholding check for full and counted workers, and a director line from the English engine (new bank lines are Story's); four modules and a words dependency, not one bounded part. Continue on branch claude/pool-laws-income-tax-flatten-sponsor-rate.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:21 UTC) on branch claude/pool-laws-income-tax-flatten-sponsor-rate.

Released by next (2026-11-13): no push to claude/pool-laws-income-tax-flatten-sponsor-rate since 2026-11-11 06:21 UTC, more than twice its 4-hour time box. Continue on branch claude/pool-laws-income-tax-flatten-sponsor-rate.
