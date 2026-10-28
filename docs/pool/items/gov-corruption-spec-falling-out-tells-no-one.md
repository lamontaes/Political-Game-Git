---
id: gov-corruption-spec-falling-out-tells-no-one
title: "Corruption spec M3-09 fails in Green Isle, Minnesota: after a falling-out no one learns of a taken bribe although one party leans toward telling"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/corruption-falling-out
pr: #5687
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T13:09:26.062Z
---

**What.** The golden-path spec M3-09 (src/core2/corruption.test.ts, 'is known only to the two people, until one falls out with the other and tells someone') fails in Green Isle, Minnesota (place key 2725658) with GOLDEN_PATH_SEED=ef107e99e7fd670627e4cd93a4978b953cfbbf1cdd4a2a31ff129c1943cdd857: AssertionError expected 0 to be greater than 0 at 'learned.length'. The test picks a taken bribe where either party's corruption.tell lean is above zero, drops their contact from 200 to 50, and expects at least one person other than the two to learn of it. In this town no one does. Find whether the test's premise (a lean above zero tells after a 150-hour falling-out) is what the tell chooser actually decides (the soured term against corruptionQuietPull and the temperament weight in considering the tell in src/core2/modules/corruption.ts), and fix the test or the engine at its cause.

**Rules.** No dice: whether a party tells follows the chooser's reasons (soured tie, temperament), never a roll. One rule, all 56 places: the check draws its place; do not special-case this town. Never loosen the assertion to hide the failure.

**Done when.** With the seed and place key above, src/core2/corruption.test.ts passes, and it also passes in at least five other drawn places named with their seeds in the PR body; the PR states whether the test premise or the engine was wrong and why.

**Files.** src/core2/corruption.test.ts,src/core2/modules/corruption.ts

**Notes.** TODO
