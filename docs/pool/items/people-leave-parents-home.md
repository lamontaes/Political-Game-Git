---
id: people-leave-parents-home
title: "A young adult leaves their parents' home when work, money and housing allow"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr: #4959
blocked-on: PR 5017 (World housing helpers) and PR 4948 landing; then merge main into claude/leave-parents-home
after: core-household-membership-change
source: added with npm run pool -- add
claimed-at:
---

**What.** A young adult who lives with their parents never moves out of the household in play, so the town's households keep their opening shape and no new renter household forms from them. Leaving should follow from the person's own record: work and pay, savings against the rent of a place of their own, and the housing on offer in town. PR #4959 builds the decision in the partnerships engine (src/core2/modules/partnerships.ts) with a new household and its lease when the young adult goes.

**Rules.** No dice: a young adult leaves home from their own work, money and the rents on offer, never from a monthly chance. Wire to the world: the move ends one household membership, starts a household and its lease, and moves rent on the journal.

**Done when.** In an ordinary buildBenchWorld played year in a drawn place (place and seed named in the PR body), with the module installed through the play modules and not by the test, at least one young adult leaves their parents' household, shown by the departure, the new household and its lease record ids.

**Files.** src/core2/modules/partnerships.ts, src/core2/modules/moves.ts, src/core2/home-leaving.test.ts, src/director/play-modules.ts (installation, through the Words line)

**Notes.** TODO

Sent back 2026-10-17 from PR #4959 (branch claude/leave-parents-home): Morning check: this People/home-leaving stack edits Words-protected src/director/play-modules.ts to install partnerships. Have that installation land through a Words-owned PR, then merge main here. Merge the Core household-call prerequisite (#4948) first as well, so this People PR can be checked on its remaining diff; record World-area agreement for its housing-engine helper changes or split those helpers to World.; finish on that branch, merge main into it first.

Sent back 2026-10-19 from PR #4959 (branch claude/leave-parents-home): Morning check: edits to World-area src/core2/modules/housing.ts remain on this branch until World PR #5017 lands; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #4959 (branch claude/leave-parents-home): The World helper diff is removed, but the body says the new people module is installed only by the test until the Words-line installation lands. Current src/director/play-modules.ts peopleModules does not install it. A test that adds the module itself is not the ordinary buildBenchWorld route claimed for the player. Land the real installation through the owning session, then supply the ordinary played-year departure/household/lease record proof with place and seed; or name the actual consuming PR and accurately label this as unfinished integration rather than a playable home-leaving feature.; finish on that branch, merge main into it first.
