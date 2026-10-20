---
id: world-hiring-bias-reasons
title: "A hiring choice records its reasons: the owner's traits and views read against the applicant's record, protected traits among them"
area: world
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/hiring-bias-reasons
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:09:44.839Z
---

**What.** When an employer picks among applicants in the jobs engine, the choice records its reasons: the owner's recorded traits and views read against each applicant's own record (experience, reliability, and the applicant's protected traits such as gender and age that the people records already carry). Reasons are saved only for the decisions that actually hire or pass over someone. The player sees it as a choice among people, never a form, and no hire changes unless a recorded view already pulled one way.

**Rules.** An effect is a read, not a record: the reasons are read by the next item's law check, not just logged. No dice: reasons come from traits, views and records, never a roll. Ask why: every pass-over answers why by record id. One rule, all 56 places: nothing names a place.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body), a hiring decision's job-change record lists its reasons by record id, a test in src/core2/jobs.test.ts shows two applicants with the same fit chosen differently only where the owner's recorded view differs, and no hiring outcome changes where no view applies.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/offices.ts (owner views), src/core2/jobs.test.ts

**Notes.** Split from world-sale-eligibility-reads (an L item) on Oct 19; the owner's ruling is in docs/coordination/OWNER-DECISIONS.md, "Employer passing over an applicant (#5102)": the owner's traits and views read against the applicant's record, with the reasons recorded; a discrimination ban refuses a decision whose recorded reasons cite a protected trait. Stopgap SG-GOV-REACH-A-discrimination.

Looked at Oct 19 (claude/hiring-bias-reasons), not built. `views.ts` holds political-question stances from the CES 2024 spread; no record holds an owner's attitude toward a group, and jobs.ts reads no protected trait of an applicant. The item needs a sourced attitude table (for example survey or audit-study rates of employer callbacks by group, spread per place) before any decision can cite it; building the reasons without it would invent a bias. First step: a research item for that table, then the hook in `runWeek`'s scoring.
