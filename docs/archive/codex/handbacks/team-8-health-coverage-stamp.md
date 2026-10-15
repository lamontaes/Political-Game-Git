# Coverage changes retain the law that governed them

The coverage writer already records who gained or lost Medicaid. It now preserves the governing law on each changed-person record through the shared stamp contract. A work-rule loss or restoration names the work rule; expansion eligibility and repeal name the expansion rule. This adds attribution, not new coverage, deaths, costs or opinions.

## 1. Why-chain

1. A coverage consequence needs an attributable law because downstream audit and noticing must distinguish it from unrelated changes.
2. The writer already computes a changed person's eligibility from household pay, age, residence and exemptions.
3. Its canonical state-law reader supplies the applicable expansion and work rules.
4. The shared helper preserves the exact enacted measure or starting-law key, jurisdiction, operative date and application date.
5. The terminal is the existing legal eligibility decision and actual saved coverage change. The original causal parent remains separate: a governing-rule stamp alone does not prove a new enactment caused the entire change.

Unknown law produces no fabricated stamp. No new employer, work hours, exemption or household is supplied.

## 2. Research

No numerical effect is introduced. Existing program rules come from `data/research/money/public-programs-2026.json`. The producer's current 138% poverty-line eligibility, 80-hour requirement and fixed mortality interpretation are inherited. They are not newly certified here. Team9 is researching the missing mortality population conversion and range. Other exemptions and waiver differences remain source limits.

## 3. Revisions

The optional `LawEffectStampedRecord` mixin keeps old saves valid. Original IDs, dates, reasons and causal parents remain. Work-rule coverage restoration names the repealed work rule rather than attributing that gain to a different expansion law. No shared map or catalog file is edited.

## 4. Numbered parts

1. Add the shared optional stamp mixin to `HealthCoverageRecord`.
2. Select the actual governing rule from the writer's canonical reader.
3. Append its stamp to a changed person's existing record.
4. Exercise starting coverage, work-rule loss, work-rule repeal/restoration and expansion repeal in five states.

Exact owned production files are `src/simulation/crisis/health-coverage.ts` and only the import/interface hunk in `src/simulation/crisis/types.ts`. The matching coverage test is owned. Team3 confirmed no unpublished coverage/schema changes at transfer.

## 5. Simulated, records, world pieces, checks

SIMULATED: existing eligibility reads real saved household, residence, age, income, work and exemptions. This patch changes no choice or entitlement.

RECORDS: the changed coverage row carries the shared stamp and its existing cause; prior rows remain untouched. Repeating an unchanged pass returns the same world.

WORLD PIECES: the shared helper is published at `205c598a5adb7f77eeed69af8f3745e5cbe64ce1` and landed at `b2d0bf43794ce9ccb497b4c3eb4e2c678eb70d71`. News consumption is the next Team8 reader change. Journal and close-friend records are not established by this attribution patch.

CHECKS: a starting-law key remains a starting-law key; a repeal names its actual measure; work-rule changes cannot be mislabeled expansion; actual cause and prior-row IDs remain linked; old rows and input worlds stay unchanged.

## 6. Proof run

Five bounded household fixtures use Quantico, Maryland; Rockland, Idaho; Tab, Indiana; Sacramento, California; and Seattle, Washington. Quantico and Tab are unincorporated opening cases. Each fixture uses the actual place key and a generated adult identity, canonical household/location/membership writers, and explicit fictional enacted rules.

Each state preserves four changed coverage rows: starting coverage, work-rule loss, work-rule repeal/restoration and expansion repeal. The final focused run passed six tests in 24.08 seconds: five new attribution cases and the retained hazard interval check. Two existing lengthy watched-clock cases were NOT RUN. JSONL records remain in ignored `test-results/team8/health-stamp-fixtures.jsonl`.

An initial fixture attempted two changes on one day and hit the writer's existing duplicate stable-key refusal. The fixture now uses later dated passes. That failure receipt is retained. These fixtures are not the nationwide 24-month audit or proof of all five law-record parts.

## 7. Worked example

The fictional Quantico fixture records Alicia Franco gaining coverage on January 5, 2026. Record `crisis-record_ff56cd340fc366e7` names the Maryland starting expansion rule and the actual household-membership cause.

On January 6, the authored work rule takes coverage away. The saved loss is `crisis-record_ff56ce340fc3689a`.

On January 7, its repeal restores coverage. That change is `crisis-record_ff56cf340fc36a4d`.

On January 8, the authored expansion repeal ends coverage. The saved loss is `crisis-record_ff56c0340fc350d0`.

Each change retains its own governing rule. No dollar transfer, spoken complaint or death is inferred.

MERGED: this coverage change awaits CTO review and Merge.

WHAT EMERGED: HARDWIRED attribution reads existing canonical rule decisions. No new simulated behavior is introduced.

VITAL STATISTICS: 5 state fixtures, 20 changed-person coverage rows with stamps, 6 focused tests passed, 2 lengthy watched tests not run. Zero of nine assigned laws has all five parts accepted; nationwide firing/missing counts remain unmeasured.
