---
id: laws-mortality-two-coverage-spells-no-hazard-part
title: "A person paid coverage by both the state expansion and the federal match has no coverage part in their death hazard"
area: core
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** MORTALITY_WEB_SEED=m2 GOLDEN_PATH_SEED=m2 npx vitest run src/core2/law-wiring-mortality-web.test.ts fails on main with: Sale Creek, Tennessee [4766220], seed m2:5 person_ad93ce081ff8fceb: no coverage part (own 1, parts []). The person is paid coverage by two spells dated 2025-03-23, reach-b:coverage:us-policy-positions:health-human-services.expand-medicaid-eligibility:US-TN|person_ad93ce081ff8fceb:2025-03-23 and the same law's medicaid-match spell for the United States, yet their own death-hazard factor reads exactly 1 and carries no coverage-to-mortality-55-64 part. Found Oct 29 by Merger 1 while checking the mortality-own-records PR (#6731) on a seed its author did not choose, sent back, then merged by Merger 3 after a new head that does not change this result; either the hazard misses a person holding both a state and a federal coverage spell, or this person is outside the link's age band or lag at the look and the test should pass them over with a named reason. Seen: the bill card's line for who a Medicaid expansion reached, and a red test on main.

**Cause.** Measured: `MORTALITY_WEB_SEED=m2 GOLDEN_PATH_SEED=m2 npx vitest run src/core2/law-wiring-mortality-web.test.ts` fails in Sale Creek, Tennessee (4766220), draw m2:5: person_ad93ce081ff8fceb has own factor 1 and no coverage-to-mortality-55-64 part although two coverage spells dated 2025-03-23 pay them. The factor is `ownCoverageFactor` in src/core2/health-own.ts; the test throws at its "no coverage part" check (line 461 of src/core2/law-wiring-mortality-web.test.ts).

**Fix.** Read the person's age and the link's lag at the look from their record. If they are in band, make the hazard in src/core2/health-own.ts read both the state and the federal spell; if not, make the test pass them over with a named reason.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: a coverage spell that pays a person must move the hazard that reads it at the day it decides, with the person's own record named by id. One rule, all 56 places: the proof must hold on a seed the builder did not choose, not only on the pinned chain.

**Done when.** A second session, not the fixer, runs the same command and sees it pass: in the drawn place Sale Creek, Tennessee (MORTALITY_WEB_SEED=m2, draw 5) person_ad93ce081ff8fceb either carries a coverage-to-mortality-55-64 part in their death hazard, read from both coverage spells by record id, or the test passes them over with a stated reason such as their age or the link's lag at the look. The command also passes on two other seeds the second session draws, and a test in src/core2 covers a person holding both a state and a federal spell.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-mortality-web.test.ts, src/core2/health-own.ts, src/core2/health-web.ts

**Notes.** Reproduce with the command in What. The send-back is in my comment on #6731 (Oct 29 about 02:45 UTC).
