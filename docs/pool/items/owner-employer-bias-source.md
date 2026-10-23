---
id: owner-employer-bias-source
title: "What makes an employer pass over an applicant, so the discrimination ban has something to refuse"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Claude, Oct 19: the ruling is in OWNER-DECISIONS.md (employer passing over an applicant, #5102): the owner's traits and views read against the applicant's record, reasons recorded, and a ban refuses a decision citing a protected trait. Not built: a person (PersonInput in src/core2/types.ts) carries no protected trait except age (birthDate); there is no recorded sex, race, religion or disability, and the owner's views of groups do not exist. The hire pick in src/core2/modules/jobs.ts (fit: experience, reliability, referral) has no such input. Building this first needs a spec for which protected traits a person has, where they come from (census data, per place) and how an owner's view of a group is formed. That is a population-model decision, not a jobs change.

Unblocked Oct 24 (owner, OWNER-DECISIONS.md, "Oct 24: rulings"): yes, people carry sex, race, religion, disability and the other categories the law names, seeded from the place's sourced shares, so a discrimination ban has something to refuse.
