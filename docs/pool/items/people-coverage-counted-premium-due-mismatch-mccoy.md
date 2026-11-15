---
id: people-coverage-counted-premium-due-mismatch-mccoy
title: "A counted household's premium due is not its record's premium in McCoy, Colorado"
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
source: Laws thread gate on the train, Nov 15, 2026 (PR #9443's gate; red on Train 693479ab without that PR)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** In McCoy, Colorado, a counted household's coverage row says a premium of $524.67 a month is due, but the coverage engine billed it $114.00. The counted household then pays a different premium from a full household of its shape, against the one-rule standard. Seen: the counted household's premium in dev mode's household money and in the coverage records.

**Cause.** Needs cause. Measured: `GOLDEN_PATH_SEED=420d72d82b58b7a4 npx vitest run src/core2/health-coverage-counted.test.ts -t "counted household pays the premium"` on Train 693479ab90eaa361dc807c993b87daad5eb4d750 fails at McCoy, Colorado [0847345] on coverage:person_c62742c6a65e263e:2025-07-01: premium due expected 11400 to be 52467 (`lastDueMinor` against the household record's `premiumMonthlyMinor`).

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session at medium effort to find the cause.

**Rules.** One model, two tiers: a counted household pays its premium by the same rule as a full household of its shape, times its weight. Pinned tests: the case is replayed at its named seed, not redrawn.

**Done when.** A second session replays the test at seed 420d72d82b58b7a4 on the train and it passes, then runs it in a drawn place from all 56 with buildBenchWorld, names the place and seed, and sees each counted household's premium due equal its record's premium by record id; the cause is written here.

**Waits on.** Nothing.

**Files.** src/core2/health-coverage-counted.test.ts, src/core2/modules/coverage.ts

**Notes (laws thread, Nov 15, 2026).** Not one place: the same test at seed 28ac47ac2d77e301 drew McElhattan, Pennsylvania [4246112] and failed with the same figures on Train d82bf47eeba5859e55bb556b705b444945568fea (journal:2025-06-01:46067, counted household_001be3c3df3e6896, against journal:2025-06-01:45604, full person_57e5ff2880293ab2: expected 11400 to be 52467). The same $114.00 against $524.67 in two states points at one rule, not a place's data.
