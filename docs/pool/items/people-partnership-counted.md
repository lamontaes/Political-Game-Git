---
id: people-partnership-counted
title: "Counted adults partner, separate and leave home by the same rules as full people, times their count"
area: people
kind: feature
priority: 2
size: M
status: blocked
claimed-by: claude/pool-partnership
pr:
blocked-on: people-partnership-forms, people-partnership-ends, people-leave-parents-home
after: people-partnership-forms,people-partnership-ends,people-leave-parents-home
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:35:20.062Z
---

**What.** Counted adults partner, separate and leave their parents' home by the same rules as full people, times their count. Once the full-person partnership and leaving-home items land, the counted-moves engine reads the same decision inputs for each counted group and moves counts between households. Households then form and split in the wider population, and the births engine reads the couples that result.

**Rules.** One model, two tiers: a counted group is read by the same rule as a full person, times its count. No dice: partnering and splitting follow closeness, strain, age fit, money and housing, never a percentage.

**Done when.** In a one-year run of `buildBenchWorld` in a drawn place with a seed the builder did not choose, counted households form and split with counts moved by record id, the births engine reads a couple that resulted, and a test in src/core2 shows the counted result equals the full-person rule times the group count.

**Files.** src/core2/modules/counted-moves.ts, src/core2/births-counted.ts, src/core2/counted-moves-town.test.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.
