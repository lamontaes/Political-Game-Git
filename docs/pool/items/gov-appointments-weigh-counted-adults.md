---
id: gov-appointments-weigh-counted-adults
title: "A town's department heads are chosen only from its full people, so the player's household fills the posts"
area: gov
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/gov-appointments-weigh-counted-adults
pr: #8830
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-11T14:44:50.979Z
after:
lead: governing
standard: 2
model: opus
effort: high
root: design-one-model-two-tiers
checked: fable 2026-11-10
---

**What.** The appointer chooses a town's department heads from the town's full people only. In a two-level world those are the player's household and circle, officials and people met, about 120 in Anson, Texas (playtest seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213, 80 of them adults), so the player's household is a large share of the pool: on main two of Anson's eight heads came from it (the player's mother as city administrator, and a 17-year-old sister at public works, fixed for age in play-stop-20). The town's counted adults are never weighed. The design question (Oct 27 analysis in Notes) was settled in favor of option (a): a coarse counted score, then fill in only the top few. Seen: who the mayor's department heads are, on the town's officials list; the player's own household stops filling the posts.

**Cause.** Found in code: `src/core2/modules/executive.ts` `townPostInput` (line 410) builds its pool from `peopleByPlace` full people only and ranks each by `personLean`, `appointmentQualification` and acquaintance with the appointer, all of which read a full person's work history, past facts and ties.

**Fix.** Weigh a town's counted adults with a coarse score from their packed traits and age (no work history, past facts or ties, which they do not have until filled in), reusing the counted pool in `countedPool` of `src/core2/modules/staff.ts`. Fill in only the top few as full people with `fillInPerson` (job, pay and household from the records), and weigh them in full with the full people. A filled-in person must match what the records already say.

**Time box.** 6 hours for one opus session.

**Rules.** One model, two tiers (owner, Oct 14): a rule that applies only to full people is an unregistered placeholder; a counted group is read by the same rule times its count and filled in when it matters. No dice. Speed: never fill in the whole counted adult list; score by index and fill in only the few who could win.

**Done when.** A second session plays a two-level world in a place drawn from all 56 (place and seed named), opens Politics, Government and sees the town's department heads include counted adults who were filled in, each matching the records (job, pay, household), and the share of heads from the player's household is no higher than its share of the town's adults. A test names the filled-in person ids.

**Waits on.** Nothing.

**Files.** src/core2/modules/executive.ts, src/core2/modules/staff.ts

**Notes.** Found by the speed lead on play-stop-20 (Oct 25).

Oct 25 audit: From the dropped gov-town-posts-counted-candidates: every post the town's form names is filled at the opening or its record says why no adult could take it (place 3812060).
Analysis (claude pool worker, Oct 27; released unbuilt, a design pass first). `townPostInput` (src/core2/modules/executive.ts about line 301) builds its pool from `api.state.peopleByPlace.get(town)` full `PersonState`s and ranks each by `personLean(people, p, 0)`, `appointmentQualification(p, postRecord(api, p, spec.key, date))` and `known` (a relationship pair with the appointer). All three read a full person: `postRecord` reads the person's work commitments, tenure rows and `pastFacts`; the lean and the known test read relationships. A counted adult has traits (`countedResidents(state)` in the staff review, packed traits in the residents store) and a birth date, pay and household, but no work history, past facts or ties until filled in (AGENTS.md: nobody gets a full past or memory until they're filled in). Weighing them "by the same reasons" therefore needs a decision: (a) a coarse counted score (temperament from traits, the base qualification and age, no field years or schooling, never `known`) for every counted adult in town, then fill in only the top few, who join the pool as full people and are weighed in full, or (b) fill in the town's counted adults of founding age on the first appointment (about 5,000 in a town of 10,000, against the speed and "full people only where they matter" rules). (a) is the fit; it also settles the done-when's other line (an appointed counted adult is filled in and matches the records: `fillInPerson` already carries job, pay and household, as `hireStaff` in staff.ts does for aides). The staff review already has the counted pool code to reuse (`countedPool` in src/core2/modules/staff.ts, traits and working-age weight). Estimated M. Needs the governance lead to say which counted reasons count (owner decisions: none found, searched pool items gov-appointments-*).

Split (opus-5251, Nov 11, at the lead's request): the Done when line on the household's share now belongs to gov-town-posts-weigh-both-tiers-from-one-list. Over thirty drawn places (seed th3), 5 of 183 heads are still in the player's household, because each post weighs every full adult but only the top three counted ones (`townPostInput`). Pull request 8830 carries the other line: counted adults are weighed, and the one named is filled in, with `filledIn: counted` on the appointment record.
