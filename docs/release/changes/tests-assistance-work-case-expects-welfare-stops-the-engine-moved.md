---
id: tests-assistance-work-case-expects-welfare-stops-the-engine-moved
impact: patch
section: Fixed
title: Cash welfare stops after a person's own time limit under a work rule
---

Where a state's work rule for assistance is law, a head of a family with a child who works under 30 hours a week stops drawing cash welfare once their months on it, counted over their whole life, reach 60, and the stop is recorded. Before, the welfare line paid everyone whatever the rule said.

**Rules.** No dice: the stop follows the head's own months on the welfare line and the work rule in force. One model, two tiers: counted households follow the same rule as named ones. Wire to the world: the stopped household's payment, and the poverty measure that reads it, change.

**Done when.** A second session, not the builder, runs the assistance work requirement case of `npx vitest run src/core2/law-reach-group-b.test.ts` on main at a drawn place and seed it names and sees a stopped head's welfare payment end, the counted groups paid the whole-cent rate over those still drawing, and a repeal pay them again.

**Waits on.** The group B test setup fix folding.

**Files.** src/core2/law-reach/group-b-money.ts; src/core2/law-reach/group-b.ts; src/core2/law-reach-group-b.test.ts

**Notes.** Years with no work rule in force are unchanged. The 60 months and 30 hours are the federal default, unverified here; per-state limits are a research item.
