---
id: people-coverage-counted-unplaced-record-ranked-as-one-worker
title: "The health coverage ranking counts a record of 162 households as one worker, so nearly none or nearly all counted households hold a plan"
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

**What.** In a town made mostly of counted households, either almost none or almost all of them hold an employer health plan, and a small change in pay can move them from one to the other in a month. At Marion, Mississippi a federal wage floor raised the counted households' income by $6.9 million over 180 days and their premiums by $42.7 million. The player would see a wage law leave the town's households far poorer, with the money gone to the outside account as premiums. Seen: the Metrics tab's money result after a wage law, and a counted household's premium in dev mode's household money.

**Cause.** Found in code: in `holdersToday` (src/core2/modules/coverage.ts) a counted household record whose workers have no recorded employer enters the ranking with `weight: h.unplacedWorkers`. That figure is the unplaced workers in one real household (every other reader multiplies it by `weightOf(h)`, as `unplacedShare` in src/core2/modules/residents.ts does), not the workers the record stands for. A record's recorded job enters with `weight: weightOf(h)`, as the `Candidate` type says a counted one should. So the total the 55 percent share is taken of leaves out nearly all the counted workers, and a record of 162 households uses up 0.68 of a slot. When such a record is held, every household it stands for pays the premium, which is right for a held record. Measured: Marion, Mississippi (2845160), world seed 7df73e53cd67, train at 53e4b29fe8, twin worlds with and without a federal wage floor of $17.00 from February 11, 2025. 3,169 counted records hold unplaced workers and stand for 22,646 households; the ranking counts them as 2,841. About 120 of them stand for 162 households each. In the twin none of those is held (rank 2,265 to 3,011 of about 3,540 candidates, below the cutoff) and the held records stand for 1,192 households, 5 percent. With the floor the pool's daily pay goes from $87.85 to $90.61, those records move to rank 607 to 1,353, and on March 1 the held records stand for 20,961 households, 93 percent. Each of the 120 then pays $85,000 a month (one family premium of $524.67 times 162), or $18,500 for a one-adult record: $42,007,000 in five months against $1,600,000 in the twin. The national share the rule aims at is 55 percent in both.

**Fix.** In `holdersToday`, an unplaced candidate stands for the policyholders its record stands for: `Math.min(1, h.unplacedWorkers) * weightOf(h)` (one policyholder to a household). The total, the slots and the running count then use the same unit as recorded jobs. Nothing else changes: the premium a held record pays is already one premium for each household it stands for.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted record is ranked for the workers it stands for, by the same rule as a full person. Sliding scales and causes: a 3 percent change in pay must not move 19,000 households into a plan in one month. An effect is a read: the premium posts and the medical bills read the coverage rows the ranking writes. Never loosen a test to get green.

**Done when.** In a drawn place it names with its seed, a second session sees on the train or main that the counted households holding an employer plan after the opening review stand for between 40 and 70 percent of the place's counted workers, by the coverage rows, and at Marion, Mississippi (2845160, world seed 7df73e53cd67) that the twin with a $17.00 federal floor pays within 10 percent of the premiums of the twin without it.

**Waits on.** Nothing.

**Files.** src/core2/modules/coverage.ts, src/core2/counted-money.ts, src/core2/health-coverage-counted.test.ts

**Notes.** Nov 15 (Fable B): the ranking figures came from a temporary print at the end of `holdersToday` (not committed) in both worlds at the February 1 and March 1 reviews; the premium posts from `setJournalTrace`. Related and not the same: `people-coverage-counted-premium-due-mismatch-mccoy` (one household's due against its row). Not measured: how the medical bills of those households changed with the wider coverage (the counted side paid $7.5 million less for medical care in the same run).
