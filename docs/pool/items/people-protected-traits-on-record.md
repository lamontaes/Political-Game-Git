---
id: people-protected-traits-on-record
title: "Every person carries a recorded sex and race, so a discrimination ban has a decision to refuse"
area: people
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on: people-protected-traits-on-record-part-1-race-on-record, people-protected-traits-on-record-part-2-hire-pick-reasons, people-protected-traits-on-record-part-3-tenant-pick-reasons, people-protected-traits-on-record-part-4-ban-refuses
source: laws lead, Oct 24, from the owner's ruling
after:
standard: 2
model: sonnet
effort: low
root: design-one-model-two-tiers
lead: laws
checked: fable 2026-11-10
---

**What.** The owner ruled on Oct 24 that sex and race go on each person's record. Sex is recorded today; race is not, and no hiring or renting decision reads either, so the ban on discrimination in housing and work reaches nobody: nobody is ever passed over (rights family laws-nine-links-rights-env, stopgap SG-GOV-REACH-A-discrimination). Each person gets a race from the place's Census shares when the world generates who exists, and counted groups carry the same shares times their count. The employer's hire pick and the landlord's tenant pick weigh the decision-maker's own recorded traits and views against the applicant's record and record the reasons; a ban in force refuses a decision whose reasons cite a protected trait. The employer pass-over of owner-employer-bias-source is merged here. Seen: the bill card's line for who a discrimination ban reached, and a hire or rental that is refused (owner's ruling, Oct 24).

**Cause.** Design: owner ruling Oct 24, 2026, "Sex and race on the record" (docs/coordination/OWNER-DECISIONS.md); PersonInput in src/core2/types.ts carries no race and the hire pick in src/core2/modules/jobs.ts reads no protected trait.

**Fix.** Record race from the place's Census shares (counted groups by the same shares times count), then have the hire pick and the tenant pick weigh the decision-maker's own traits and views against it with recorded reasons, and have the discrimination ban refuse a decision citing a protected trait. Four parts.

**Time box.** 2 hours for one Sonnet session, the closing check after those items. When it runs out, write what was seen in the item and stop.

**Rules.** No dice: seeded generation of who exists may assign race from shares, but a pass-over comes only from the decision-maker's recorded traits and views, never a roll. One model, two tiers: counted groups carry the same shares and the same decision rule times their count. One rule, all 56 places: shares come from each place's Census data, estimated with a labeled median where a place has none. Ask why: a refused decision records the law and the reason it cited.

**Done when.** A second session plays a year of buildBenchWorld in a drawn place (seed named) and sees a hire or tenant decision record a pass-over whose reasons cite the decision-maker's traits against an applicant's race or sex, and with the discrimination ban in force the same kind of decision refused, recorded by lawApplied and named by record id in src/core2/law-wiring-rights-env.test.ts.

**Waits on.** people-protected-traits-on-record-part-1-race-on-record, world-hiring-bias-reasons (the hiring decision's recorded reasons; part 2 is a proposed drop into it), people-protected-traits-on-record-part-3-tenant-pick-reasons, world-hiring-discrimination-ban-refusal (the ban refusing a hire) and people-protected-traits-on-record-part-4-ban-refuses (the ban refusing a tenant decision).

**Files.** src/core2/types.ts, src/core2/modules/jobs.ts, src/core2/modules/housing.ts, src/core2/law-wiring-rights-env.test.ts

**Notes.** Filed by the laws lead on Oct 24 from the owner's ruling.
