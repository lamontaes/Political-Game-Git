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
---

**What.** The appointer chooses a town's department heads from the town's full people only (src/core2/modules/executive.ts, townPostInput reads peopleByPlace). In a two-level world those are the player's household and circle, officials and people met, about 120 in Anson, Texas (playtest seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213, 80 of them adults), so the player's household is a large share of the pool: on main two of Anson's eight heads came from it (the player's mother as city administrator, and a 17-year-old sister at public works, fixed for age in play-stop-20). The town's counted adults are never weighed.

**Rules.** One model, two tiers (owner, Oct 14): a rule that applies only to full people is an unregistered placeholder; a counted group is read by the same rule times its count and filled in when it matters. No dice.

**Done when.** In a two-level played world in a place drawn from all 56 (place and seed named), the appointer weighs the town's counted adults by the same reasons, and the share of department heads from the player's household is no higher than its share of the town's adults; a counted adult who is appointed is filled in and matches the records (their job, pay and household).

**Files.** src/core2/modules/executive.ts

**Notes.** Found by the speed lead on play-stop-20 (Oct 25).
