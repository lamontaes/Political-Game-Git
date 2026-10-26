---
id: play-siblings-spaced-adults-by-birthday
title: "Brothers and sisters at the opening are born months apart, only residents who have turned 18 are weighed for town posts, and relatives don't ask after a relative they share"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The owner's playtest (play-stop-20, Anson, Texas, v0.22.10, seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213): his sister Madison was born seven days after him and was not a twin; each child's birthday in a household was drawn on its own. The town appointer counted age by year of birth (src/core2/modules/executive.ts, ageOn), so a resident born in February 2007 counted as 18 in January 2025: two of Anson's eight department heads on main were 17. And two relatives asked each other after a relative they share, by first name ("How's John?") or as "your father" (src/director/conversation.ts, subjectsBetween).

**Rules.** One model, two tiers (owner, Oct 14): a household filled in around the player matches the records, including birth spacing and who can hold a job. No dice: spacing and the appointment pool follow records, not a draw. LAW.md §5 (Journal and the past) and §11 (The world on screen makes sense).

**Done when.** In Anson, Texas with the playtest's seed and Bo Snider born February 3, 2007, and in a place drawn from all 56 (place and seed named): every pair of brothers and sisters at home at the opening is born at least siblingBirthGapDays apart, or marked as twins, including after the player chooses a birthday; no resident who has not turned 18 by their birthday is weighed for or holds a town post; and subjectsBetween offers no kin, family or their-family subject about a relative the speaker and listener share, while a neighbor's own relative whom the player knows, and whose recorded happening the director keeps, is still asked after. Each is shown by a test that fails on main, with before-and-after bench screenshots of Anson in the PR.

**Files.** src/core2/sibling-births.ts, src/core2/population.ts, src/core2/state.ts, src/core2/modules/executive.ts, src/director/conversation.ts

**Notes.** Split from play-stop-20 on Merger 0's send-back of #6080 (Oct 26), which asked for the finished corrections to have their own bounded item while the umbrella stays open. The umbrella's remaining parts: gov-department-head-qualified-by-record (who is qualified to head a department) and words-family-talk-kin-address (calling a shared parent Dad). Branch claude/play-stop-20-siblings, PR #6080.
