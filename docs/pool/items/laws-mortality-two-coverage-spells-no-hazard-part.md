---
id: laws-mortality-two-coverage-spells-no-hazard-part
title: "A person paid coverage by both the state expansion and the federal match has no coverage part in their death hazard"
area: core
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** MORTALITY_WEB_SEED=m2 GOLDEN_PATH_SEED=m2 npx vitest run src/core2/law-wiring-mortality-web.test.ts fails on main with: Sale Creek, Tennessee [4766220], seed m2:5 person_ad93ce081ff8fceb: no coverage part (own 1, parts []). The person is paid coverage by two spells dated 2025-03-23, reach-b:coverage:us-policy-positions:health-human-services.expand-medicaid-eligibility:US-TN|person_ad93ce081ff8fceb:2025-03-23 and the same law's medicaid-match spell for the United States, yet their own death-hazard factor reads exactly 1 and carries no coverage-to-mortality-55-64 part. Found Oct 29 by Merger 1 while checking the mortality-own-records PR (#6731) on a seed its author did not choose, sent back, then merged by Merger 3 after a new head that does not change this result; either the hazard misses a person holding both a state and a federal coverage spell, or this person is outside the link's age band or lag at the look and the test should pass them over with a named reason.

**Rules.** An effect is a read, not a record: a coverage spell that pays a person must move the hazard that reads it at the day it decides, with the person's own record named by id. One rule, all 56 places: the proof must hold on a seed the builder did not choose, not only on the pinned chain.

**Done when.** In Sale Creek, Tennessee (MORTALITY_WEB_SEED=m2, draw 5) person_ad93ce081ff8fceb either carries a coverage-to-mortality-55-64 part in their death hazard, read from both coverage spells by record id, or the test passes them over with a stated reason such as their age or the link's lag at the look; the same command passes on m2 and on two other seeds drawn by the fixer, and a test in src/core2 covers a person holding both a state and a federal spell.

**Files.** src/core2/law-wiring-mortality-web.test.ts, src/core2/health-own.ts, src/core2/health-web.ts

**Notes.** Reproduce with the command in What. The send-back is in my comment on #6731 (Oct 29 about 02:45 UTC).
