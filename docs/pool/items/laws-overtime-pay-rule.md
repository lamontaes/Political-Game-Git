---
id: laws-overtime-pay-rule
title: "Overtime pay is a law: hours over the law's threshold in a pay week pay at the law's multiple, and exempt salaried jobs are paid by the period"
area: laws
kind: feature
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
milestone:
source: Split from core-stopgap-work-prototype-pay-projection by pool feeder Oct 20; the stand-in research (docs/research/stand-in-figures-2026-10-12.md) notes the DOL state payday and overtime pages as the source
lead: laws-effects
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** Pay in the work engine is the job's hourly rate times attended minutes (`work-state.ts`), with no overtime and no salaried jobs, because the pay terms are a projected proxy (stopgap SG-P8-work-pay-terms). Add overtime as law data: a series in src/core2/data/laws/starting-law.json for the federal Fair Labor Standards Act (time and a half after 40 hours in a work week) with state rows where a state's law is stricter (a daily threshold, a double-time tier), the exempt salary threshold below which a salaried worker is still owed overtime, and the territories' own rows. Make the work module's pay accrual for a pay period read the law in force at the job's place: hours past the threshold in the week are paid at the multiple, and a job recorded as salaried and above the exempt threshold is paid its period amount whatever the hours. Employer cost follows, so business books and the budget line for a public employer see the higher wage.

**Cause.** Design: the item itself plus docs/research/stand-in-figures-2026-10-12.md and stopgap SG-P8-work-pay-terms; owner rule "one rule, all 56 places" (overtime as law rows).

**Fix.** Add overtime law rows to starting-law.json (federal and state, exempt threshold) and make work pay accrual read them; employer cost follows.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: overtime is law rows per jurisdiction in data, with no state named in logic. An effect is a read, not a record: the work pay accrual and the employer's labor cost must read the law row when they pay. No dice: pay follows hours, the recorded pay basis and the law in force. Replace, never layer: the plain hourly product is replaced by the law-reading calculation, not kept as a second path. One model, two tiers: counted workers' wage flows use the same rule times their count. Numbers in the parameter table are SOURCED with citation to the statute or the state labor department.

**Done when.** A second session, not the builder, runs a one-year buildBenchWorld in a drawn place from all 56 (place and seed named, a seed the builder did not choose) and sees: a worker whose schedule runs past the law's threshold in a pay week is paid the multiple on the extra hours, by payroll journal record id; an exempt salaried job is paid its period amount; and the employer's cost in the business book moves with it. src/core2/overtime-pay.test.ts proves it for a place with a daily-overtime state row and one with only the federal row.

**Waits on.** Nothing.

**Files.** src/core2/data/laws/starting-law.json, src/core2/work-state.ts, src/core2/work-pay-period.ts, src/core2/modules/work.ts, src/core2/overtime-pay.test.ts (new)

**Notes.** Split from core-stopgap-work-prototype-pay-projection by pool feeder Oct 20; the stand-in research (docs/research/stand-in-figures-2026-10-12.md) notes the DOL state payday and overtime pages as the source.

**Notes (Fable B, Nov 10, depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have added overtime and salaried pay to the work engine with a new law series; no overtime law is on the bill menu today and no ruling asks for one.
