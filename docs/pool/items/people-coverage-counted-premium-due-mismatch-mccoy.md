---
id: people-coverage-counted-premium-due-mismatch-mccoy
title: "A counted household's premium due is not its record's premium in McCoy, Colorado"
area: people
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: #9514
after:
blocked-on:
lead: m0-m2
source: Laws thread gate on the train, Nov 15, 2026 (PR #9443's gate; red on Train 693479ab without that PR)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
merged-at: 2026-11-16T01:32:27.556Z
---

**What.** In McCoy, Colorado, a counted household's coverage row says a premium of $524.67 a month is due, but the coverage engine billed it $114.00. The counted household then pays a different premium from a full household of its shape, against the one-rule standard. Seen: the counted household's premium in dev mode's household money and in the coverage records.

**Cause.** Measured: McCoy, Colorado (0847345), `GOLDEN_PATH_SEED=420d72d82b58b7a4 npx vitest run src/core2/health-coverage-counted.test.ts -t "counted household pays the premium"` on the train at df168042e6, with a scratch copy of the test (not committed) that wrote down each handed household's members at the failing check. The engine is right. Of the nine households filled in that still hold a policy on July 1, eight pay what their counted record said. The ninth, household_02b2594fd2103768, had two people on its policy. Its policyholder, person_519e5551fd61e72f, was born on June 10, 1960 and turned 65 between the June 1 and July 1 reviews. On July 1 the review moves them to Medicare, as the test itself expects a few lines earlier, and the one person left on the plan (person_c62742c6a65e263e, born 1962) becomes the policyholder and pays the single premium, $114.00, where the pair paid the family premium, $524.67. The test then compared that row with the counted record's premium and holder as if nobody had left the plan. The McElhattan, Pennsylvania failure (seed 28ac47ac2d77e301) is the same birthday month at an earlier check: the full household the test picks as the counted one's twin, household_99273f32e5fc1832, has a member born on June 14, 1960. On June 1 two of its people were under 65 and it paid the family premium; the test counts its people under 65 on the day it reads, June 30, finds one, and pairs it with a counted household of one.

**Fix.** In src/core2/health-coverage-counted.test.ts, the check on the next 1st counts the handed members still under the Medicare age that day. Where that count is the counted record's, the premium due is the record's, to the minor unit, as before. Where a member has turned 65 since, the premium due is the one the parameter table gives for the people still on the plan, and the test prints the household. The twin a counted household is compared with is picked by its people under the Medicare age on the payday, when the review set the premium, not on the day the test reads. No engine change.

**Time box.** 2 hours for one Opus session at medium effort to find the cause.

**Rules.** One model, two tiers: a counted household pays its premium by the same rule as a full household of its shape, times its weight. Pinned tests: the case is replayed at its named seed, not redrawn.

**Done when.** A second session replays the test at seed 420d72d82b58b7a4 on the train and it passes, then runs it in a drawn place from all 56 with buildBenchWorld, names the place and seed, and sees each counted household's premium due equal its record's premium by record id; the cause is written here.

**Waits on.** Nothing.

**Files.** src/core2/health-coverage-counted.test.ts, src/core2/modules/coverage.ts

**Notes (laws thread, Nov 15, 2026).** Not one place: the same test at seed 28ac47ac2d77e301 drew McElhattan, Pennsylvania [4246112] and failed with the same figures on Train d82bf47eeba5859e55bb556b705b444945568fea (journal:2025-06-01:46067, counted household_001be3c3df3e6896, against journal:2025-06-01:45604, full person_57e5ff2880293ab2: expected 11400 to be 52467). The same $114.00 against $524.67 in two states points at one rule, not a place's data.

**Notes (Fable B, Nov 15).** Built in #9514. `GOLDEN_PATH_SEED=420d72d82b58b7a4` (McCoy, Colorado) and `GOLDEN_PATH_SEED=28ac47ac2d77e301` (McElhattan, Pennsylvania): the whole file passes 2 of 2 at each, and at a third seed, fb9511a, that passed before. Both failures were people born in June 1960.
