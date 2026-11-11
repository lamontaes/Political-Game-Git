---
id: world-hiring-bias-reasons
title: "A hiring choice records its reasons: the owner's traits and views read against the applicant's record, protected traits among them"
area: world
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: jobs
model: opus
effort: medium
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** When an employer picks among applicants in the jobs engine, the choice records its reasons: the owner's recorded traits and views read against each applicant's own record (experience, reliability, and the applicant's protected traits such as gender and age that the people records already carry). Reasons are saved only for the decisions that actually hire or pass over someone. The player sees it as a choice among people, never a form, and no hire changes unless a recorded view already pulled one way. The owner's ruling is in docs/coordination/OWNER-DECISIONS.md, "Employer passing over an applicant (#5102)": a discrimination ban refuses a decision whose recorded reasons cite a protected trait (the next item, world-hiring-discrimination-ban-refusal). Seen: a hire told as a choice among people, with its reasons on the job-change record the player can open, and the bill card for a discrimination ban (owner, Oct 24 and Oct 26: "I said yes").

**Cause.** Found in code: the hire loop `runWeek` in src/core2/modules/jobs.ts reads only src/core2/jobs-age-bias.ts for any hiring bias; no record holds an owner's attitude toward a group (views.ts holds political-question stances only), so a hiring decision has no recorded view to cite until world-employer-attitude-table lands.

**Fix.** Record each hire and pass-over decision's reasons by record id from the owner's recorded attitude and the applicant's record, in the hiring scoring in src/core2/modules/jobs.ts, with no change of outcome where no view applies.

**Time box.** 8 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the reasons are read by the next item's law check, not just logged. No dice: reasons come from traits, views and records, never a roll. Ask why: every pass-over answers why by record id. One rule, all 56 places: nothing names a place.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, a drawn place and a seed the builder did not choose, both named in the PR body) and sees a hiring decision's job-change record list its reasons by record id; a test in src/core2/jobs.test.ts shows two applicants with the same fit chosen differently only where the owner's recorded view differs, and no hiring outcome changes where no view applies. On screen: nothing yet; it would show on Jobs and study, and News, and nothing there reads it.

**Waits on.** world-employer-attitude-table (the sourced attitude table the reasons cite), and people-protected-traits-on-record-part-1-race-on-record (the applicant's race on the record; until it lands, record reasons for sex and age only and say so).

**Files.** src/core2/modules/jobs.ts, src/core2/modules/offices.ts, src/core2/jobs-age-bias.ts, src/core2/jobs.test.ts

**Notes.** Split from world-sale-eligibility-reads (an L item) on Oct 19; the owner's ruling is in docs/coordination/OWNER-DECISIONS.md, "Employer passing over an applicant (#5102)": the owner's traits and views read against the applicant's record, with the reasons recorded; a discrimination ban refuses a decision whose recorded reasons cite a protected trait. Stopgap SG-GOV-REACH-A-discrimination. Claim released Oct 23: branch gone.

Looked at Oct 19 (claude/hiring-bias-reasons), not built. `views.ts` holds political-question stances from the CES 2024 spread; no record holds an owner's attitude toward a group, and jobs.ts reads no protected trait of an applicant. The item needs a sourced attitude table (for example survey or audit-study rates of employer callbacks by group, spread per place) before any decision can cite it; building the reasons without it would invent a bias. First step: a research item for that table, then the hook in `runWeek`'s scoring.

**Notes (Fable's check, Nov 10).** This item also covers people-protected-traits-on-record-part-2-hire-pick-reasons (proposed drop): the decision-maker's own traits and views, read against the applicant's recorded race or sex, are part of the recorded reasons here, under the owner's Oct 24 ruling "Sex and race on the record" (docs/coordination/OWNER-DECISIONS.md).
