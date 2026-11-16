---
id: world-job-offer-needs-a-cause
title: "A job offer comes to the player only through someone they know at the employer or an opening they applied for"
area: world
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude-world
pr: 9754
blocked-on:
lead: world
model: sonnet
effort: medium
root: none
source: Owner, Nov 16, 2026 ("I didn't even apply for one."), crew line #9747, item 6b
---

**What.** A jobless player was offered a job by a stranger at an employer they never contacted. The weekly pass applied the player to every opening in town, so any employer could pick them. Seen: owner playing, Nov 16, an offer from Lisa Cruz that no record of the player's explains.

**Cause.** Found in code: `src/core2/modules/jobs.ts` `runWeek` called `apply(position.id, player)` for every open position in the player's place, and `hiringPerson` named the longest-tenured staffer, a stranger, as the maker of the offer.

**Fix.** `runWeek` now considers the player only for an opening where `speaksForPlayer` finds a person they know or are kin to on that employer's staff, or where the player recorded an application with `applyForOpening`; `offerToPlayer` names the known person as the maker. The player sees the offer's scene from someone they know.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** The `wire-to-the-world` rule applies: the offer reads the player's known and kin records and application. No dice: the employer's pick is still the best-placed applicant by fit, with no roll.

**Done when.** In a drawn place and a seed the builder did not choose, every job offer to the player has a maker the player knows or an opening the player applied to, shown by offer id and person id in `src/core2/jobs-player-offer-cause.test.ts`; a second session sees the same in the running game.

**Waits on.** A screen where the player applies to an opening (Screens lane).

**Files.** src/core2/modules/jobs.ts, src/core2/modules/staff.ts, src/core2/jobs-player-offer-cause.test.ts, src/core2/jobs-player-offers.test.ts, src/core2/staff-never-hires-the-player.test.ts

**Notes.** Owner's earlier rulings: "The player can apply or get a job through someone they know, and can be turned down" (prior-rulings/economy.md); "a job offer comes through a person and a scene or not at all" (Oct 27).
