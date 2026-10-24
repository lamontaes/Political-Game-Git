---
id: owner-employer-bias-source
title: "Protected traits and owner views of groups, so the ruled employer pass-over has an input the ban can refuse"
area: gov
kind: owner-decision
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add

---

**What.** The owner has ruled (OWNER-DECISIONS.md, "Employer passing over an applicant", #5102): an employer's pass-over comes from the owner's or hiring manager's traits and views read against the applicant's record, with the reasons recorded, and the discrimination ban (SG-GOV-REACH-A-discrimination) refuses a decision whose recorded reasons cite a protected trait. No dice. What is still missing is the population input: a person (`PersonInput` in src/core2/types.ts) carries no protected trait except age (`birthDate`), and the owner's views of groups do not exist, and the hire pick in src/core2/modules/jobs.ts (experience, reliability, referral) reads neither.

**Rules.** No dice: the pass-over comes from recorded traits, views and the applicant's record, never a roll. Owner decisions are flagged, never waited on: the open work is the population spec below, not the question of the source. Until it is built the ban stays an open stopgap.

**Done when.** A spec names which protected traits a person has, where they come from (census data, per place), and how an owner's view of a group is formed; a build item exists that reads it in the hire pick and records the reasons. Nothing in this item is built.

**Files.** docs/coordination/OWNER-DECISIONS.md

**Notes.** Claude, Oct 19: the ruling is in OWNER-DECISIONS.md (employer passing over an applicant, #5102): the owner's traits and views read against the applicant's record, reasons recorded, and a ban refuses a decision citing a protected trait. Not built: a person (PersonInput in src/core2/types.ts) carries no protected trait except age (birthDate); there is no recorded sex, race, religion or disability, and the owner's views of groups do not exist. The hire pick in src/core2/modules/jobs.ts (fit: experience, reliability, referral) has no such input. Building this first needs a spec for which protected traits a person has, where they come from (census data, per place) and how an owner's view of a group is formed. That is a population-model decision, not a jobs change. Laws lead, Oct 24: the owner answered the spec question "yes" (OWNER-DECISIONS.md, Oct 24, "Sex and race on the record"): every person carries a recorded sex and race, race from the place's Census shares and counted groups by the same shares times their count, and an employer or landlord passes someone over only from their own recorded traits and views, never a roll. The build is `people-protected-traits-on-record`; this item is unblocked and its spec is that ruling.
