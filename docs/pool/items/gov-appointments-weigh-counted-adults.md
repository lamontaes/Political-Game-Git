---
id: gov-appointments-weigh-counted-adults
title: "A town's department heads are chosen only from its full people, so the player's household fills the posts"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The appointer chooses a town's department heads from the town's full people only (src/core2/modules/executive.ts, townPostInput reads peopleByPlace). In a two-level world those are the player's household and circle, officials and people met, about 120 in Anson, Texas (playtest seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213, 80 of them adults), so the player's household is a large share of the pool: on main two of Anson's eight heads came from it (the player's mother as city administrator, and a 17-year-old sister at public works, fixed for age in play-stop-20). The town's counted adults are never weighed.

**Rules.** One model, two tiers (owner, Oct 14): a rule that applies only to full people is an unregistered placeholder; a counted group is read by the same rule times its count and filled in when it matters. No dice.

**Done when.** In a two-level played world in a place drawn from all 56 (place and seed named), the appointer weighs the town's counted adults by the same reasons, and the share of department heads from the player's household is no higher than its share of the town's adults; a counted adult who is appointed is filled in and matches the records (their job, pay and household). **On screen.** Nothing yet: it would show on Politics → Government, and nothing there reads it.

**Files.** src/core2/modules/executive.ts

**Notes.** Found by the speed lead on play-stop-20 (Oct 25).

Oct 25 audit: From the dropped gov-town-posts-counted-candidates: every post the town's form names is filled at the opening or its record says why no adult could take it (place 3812060).
Analysis (claude pool worker, Oct 27; released unbuilt, a design pass first). `townPostInput` (src/core2/modules/executive.ts about line 301) builds its pool from `api.state.peopleByPlace.get(town)` full `PersonState`s and ranks each by `personLean(people, p, 0)`, `appointmentQualification(p, postRecord(api, p, spec.key, date))` and `known` (a relationship pair with the appointer). All three read a full person: `postRecord` reads the person's work commitments, tenure rows and `pastFacts`; the lean and the known test read relationships. A counted adult has traits (`countedResidents(state)` in the staff review, packed traits in the residents store) and a birth date, pay and household, but no work history, past facts or ties until filled in (AGENTS.md: nobody gets a full past or memory until they're filled in). Weighing them "by the same reasons" therefore needs a decision: (a) a coarse counted score (temperament from traits, the base qualification and age, no field years or schooling, never `known`) for every counted adult in town, then fill in only the top few, who join the pool as full people and are weighed in full, or (b) fill in the town's counted adults of founding age on the first appointment (about 5,000 in a town of 10,000, against the speed and "full people only where they matter" rules). (a) is the fit; it also settles the done-when's other line (an appointed counted adult is filled in and matches the records: `fillInPerson` already carries job, pay and household, as `hireStaff` in staff.ts does for aides). The staff review already has the counted pool code to reuse (`countedPool` in src/core2/modules/staff.ts, traits and working-age weight). Estimated M. Needs the governance lead to say which counted reasons count (owner decisions: none found, searched pool items gov-appointments-*).
