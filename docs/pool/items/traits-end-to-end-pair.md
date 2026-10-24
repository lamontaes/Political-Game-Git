---
id: traits-end-to-end-pair
title: "Two residents with opposite temperaments in the same situation live a played year differently, named by record"
area: people
kind: wiring
priority: 1
size: S
status: claimed
claimed-by: claude/serene-mccarthy-ae8xo9
pr: #5885
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T14:40:39.733Z
---

**What.** The first part of the traits lead's acceptance (traits-end-to-end-proof), split so the test can land while the opposite-neighbors gap is worked. A test plays one year of the played world in a place drawn from all 56, picks by rule the two working adults in the same situation (age band, household size, savings band) with the most opposite temperaments, and puts them in focus as a player's contacts are, so their acts keep their reasons. It names the decisions where their recorded trait reasons pulled opposite ways and the outcomes their years ended with.

**Rules.** No dice: every difference comes from traits weighing recorded reasons, never a roll. Ask why: each outcome is printed beside the acts that led there, and each decision by its act record id or weighed call. One model, two tiers: the pair is picked from the people the world built, the same rule for any place.

**Done when.** scripts/traits/trait-end-to-end.test.ts plays one year of buildBenchWorld in a drawn place, seed named, names by record id at least five decisions where the pair's trait reasons differed and at least three outcomes that differ, and fails with the pair's traits wiped flat.

**Files.** scripts/traits/trait-end-to-end.test.ts

**Notes.** Split Oct 24 by the traits lead from traits-end-to-end-proof, which keeps its opposite-neighbors gap clause and is blocked on traits-neighbors-gap-routine.

Sent back 2026-10-24 from PR #5885 (branch claude/serene-mccarthy-ae8xo9): Done when requires five decisions by record ID but optional IDs and date-only call witnesses count toward five, with only two record IDs in the table; require actual decision record witnesses and evidence; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5885 (branch claude/serene-mccarthy-ae8xo9): changed-file played-year test exits without an assertion result after an OOM kill in both the 6 GB attempt and isolated 4 GB retry under the 8 GB merger environment; finish on that branch, merge main into it first.
