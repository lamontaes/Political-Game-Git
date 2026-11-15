---
id: people-coverage-counted-premium-charged-for-every-household-a-record-stands-for
title: "A counted record with one unplaced worker is charged a health premium for all 162 households it stands for"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
source: "Fable B, Nov 15 (found while tracing the federal wage question at Marion, Mississippi)"
model: opus
effort: medium
root: none
---

**What.** A small rise in pay can cost a town's counted households tens of millions of dollars in health premiums in a few months. At Marion, Mississippi a federal wage floor raised the counted households' income by $6.9 million over 180 days and their premiums by $42.7 million. The player would see a wage law leave the town's households far poorer, with the money gone to the outside account as premiums. Seen: the Metrics tab's money result after a wage law, and a counted household's premium in dev mode's household money.

**Cause.** Found in code: in `holdersToday` (src/core2/modules/coverage.ts) a counted household record whose workers have no recorded employer enters the ranking as one candidate with `weight: h.unplacedWorkers`, so it takes that many of the policy slots. When it is held, `reviewCounted` writes one coverage row for the household and `payCountedPremiums` pays `row.premiumMonthlyMinor` through `countedPayment` (src/core2/counted-money.ts), which multiplies by `weightOf(h)`, the number of real households the record stands for. The two weights are not the same thing. Measured: Marion, Mississippi (2845160), world seed 7df73e53cd67, train at 53e4b29fe8, twin worlds with and without a federal wage floor of $17.00 from February 11, 2025. 3,169 counted records hold unplaced workers; together they stand for 22,646 households and 2,841 unplaced workers. About 120 of them stand for 162 households each and hold 0.68 to 1.37 unplaced workers. In the twin none of those is held (rank 2,265 to 3,011 of about 3,540 candidates, below the cutoff where 55 percent of the workers' weight is used up) and the held records stand for 1,192 households. With the floor the pool's daily pay goes from $87.85 to $90.61, those records move to rank 607 to 1,353, and on March 1 the held records stand for 20,961 households. Each of the 120 then pays $85,000 a month (one family premium of $524.67 times 162), or $18,500 for a one-adult record: $42,007,000 in five months.

**Fix.** Charge the premium for the workers who hold the policy, not for every household the record stands for: the counted coverage row keeps the holder weight the ranking used (`h.unplacedWorkers` for an unplaced candidate, `weightOf(h)` for a recorded job) and `payCountedPremiums` pays `premiumMonthlyMinor` times that weight with `whole: true`. Where a record's unplaced workers are fewer than its households, only that many households hold a plan. The ranking and the share of workers covered do not change.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted record pays what its real households would pay, one premium for each worker who holds a plan. Sliding scales and causes: a 3 percent change in pay must not move 19,000 households into a plan in one month. An effect is a read: medical bills read the coverage row, so the covered count there follows the same weight. Never loosen a test to get green.

**Done when.** In a drawn place it names with its seed, a second session sees on the train or main that the premiums the counted side pays in a month are no more than one premium for each counted worker who holds a plan, by the coverage rows and the journal's premium posts, and at Marion, Mississippi (2845160, world seed 7df73e53cd67) that the twin with a $17.00 federal floor pays within 10 percent of the premiums of the twin without it.

**Waits on.** Nothing.

**Files.** src/core2/modules/coverage.ts, src/core2/counted-money.ts, src/core2/health-coverage-counted.test.ts

**Notes.** Nov 15 (Fable B): the ranking figures came from a temporary print at the end of `holdersToday` (not committed) in both worlds at the February 1 and March 1 reviews; the premium posts from `setJournalTrace`. Related and not the same: `people-coverage-counted-premium-due-mismatch-mccoy` (one household's due against its row). Not measured: how the medical bills of those households changed with the wider coverage (the counted side paid $7.5 million less for medical care in the same run).
