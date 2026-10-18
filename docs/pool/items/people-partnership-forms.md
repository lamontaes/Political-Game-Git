---
id: people-partnership-forms
title: "Two single adults who are close, fit in age and can afford it become one household, as a decision from their traits and money"
area: people
kind: feature
priority: 2
size: M
status: in-pr
claimed-by:
pr: #4963
blocked-on:
after: core-household-membership-change
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Built Oct 17 (claude/partnership-forms, stacked on claude/leave-parents-home and claude/family-link-change).** `reviewPartnerships` in src/core2/modules/partnerships.ts runs with the monthly review. Each single adult looks at the people they know who are single adults of the other gender (not kin), closest first. Each of the two weighs becoming partners through the chooser: a baseline, closeness between them, the age gap and how many times the rent their pays together cover, against staying single. When both choose it, one moves into the other's household (an owner's home stays, else the larger household; a mover's minor children go with them when no other adult stays) through `changeHouseholdV1`, then `setPartnersV1` links them, and the births engine takes the couple up. The record is a row in the module's `partnered` table with both people's reasons. Weights are TUNABLE (SG-PEOPLE-partnership-weights); the baseline of -5.5 follows a measurement in eight places: at -3 about 50 people per thousand named residents partnered in a year, at -5 about 22, against about 12 (CDC NCHS marriages, two people each); the check item refines it. Left: (1) a woman and a man only, since the records hold no orientation (SG-PEOPLE-partnership-orientation, an owner question); (2) people who own a home do not move out, so two owners never pair; (3) the counted tier does not partner yet (people-partnership-counted); (4) a couple is not married or engaged: the game shows partnering as a record the director can read (`people.partnered`), and how marriage is shown is undecided. The test is src/core2/partnership-forms.test.ts.

Sent back 2026-10-17 from PR #4963 (branch claude/partnership-forms): Morning check: the partnership-forming stack includes the same non-Words edit to protected src/director/play-modules.ts as #4959. Land that installation through a Words-owned PR and merge the Core household/family-link prerequisites first, then merge main here so the remaining People diff can be checked. Record World-area agreement for the housing-engine helpers, or split them to World.; finish on that branch, merge main into it first.
