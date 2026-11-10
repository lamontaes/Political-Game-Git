---
id: people-protected-traits-on-record-part-2-hire-pick-reasons
title: "A hiring decision records reasons citing the decision-maker's traits against an applicant's race or sex"
area: people
kind: wiring
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: people-protected-traits-on-record-part-1-race-on-record
blocked-on:
lead: laws
model: opus
effort: high
root: design-one-model-two-tiers
source: split from people-protected-traits-on-record in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The employer's hire pick weighs experience, reliability and referral and reads no protected trait, so nobody is ever passed over. An employer's pass-over should come from the owner's or hiring manager's own traits and views read against the applicant's record, with the reasons recorded (OWNER-DECISIONS.md, "Employer passing over an applicant"). This takes the employer pass-over of the merged owner-employer-bias-source.

**Cause.** Found in code: src/core2/modules/jobs.ts runWeek's fit score (around line 3200) weighs experience, reliability and referral (referralStanding) and reads no protected trait.

**Fix.** Add the decision-maker's traits and views against the applicant's recorded race or sex to the hire pick's weighing, and record the reasons on the decision.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: seeded generation of who exists may assign race from shares, but a pass-over comes only from the decision-maker's recorded traits and views, never a roll. One model, two tiers: counted groups carry the same shares and the same decision rule times their count. One rule, all 56 places: shares come from each place's Census data, estimated with a labeled median where a place has none. Ask why: a refused decision records the law and the reason it cited.

**Done when.** A second session plays a year of buildBenchWorld in a drawn place (seed named) and sees a hiring decision whose recorded reasons cite the decision-maker's traits against an applicant's race or sex, by decision record id.

**Waits on.** people-protected-traits-on-record-part-1-race-on-record.

**Files.** src/core2/modules/jobs.ts, src/core2/types.ts, src/core2/law-wiring-rights-env.test.ts

**Notes (Fable's check, Nov 10, proposed for the CTO).** Proposed: drop as a duplicate of world-hiring-bias-reasons. Both record a hiring decision's reasons from the decision-maker's traits and views against the applicant's record, in the hire loop of src/core2/modules/jobs.ts. The kept item has the sourced attitude table behind it and now waits on part 1 of this family for the race record.
