---
id: jobs-1-travel-and-cards-show-every-workplace-kind
title: "Travel and person cards show every kind of workplace the town has, not only markets and kitchens"
area: core
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: jobs
model: sonnet
effort: medium
source: "owner, Nov 15 20:44Z and 20:48Z (jobs read as textiles or markets; chains in sectors), 21:00Z (the point is that laws reach businesses by sector; not finely detailed, the effect web must play out); Account lead's five-piece plan, Nov 15 20:59Z; trace by T54 at /mnt/project-files/account-lead/t54-jobs-trace.md"
---

**What.** Seen (trace: /mnt/project-files/account-lead/t54-jobs-trace.md): Travel at Gratz KY (2132428) lists Public Works, Fox Trucking, the schools, three "X's Market", two "X's Kitchen" and a salon; at Bloomingdale NJ (3406340) four Kitchens and two Markets among nine. The town's records hold 15 to 20 business kinds (clinic, care home, plant, insurance agency, inn, auto shop...), and the player is offered almost none of them. Seen: the Travel menu on the first morning and the person cards of the household.

**Cause.** Found in code: after the household's own workplaces, Travel fills to nine (`PUBLIC_FILL`, src/bench/places.ts:57) only from `PUBLIC_PLACES` (src/bench/places.ts:37: diner, coffee shop, tavern, grocery, store, hardware, pharmacy, barbershop, library, post office, church, park). In a town's records those are only the retail and restaurant businesses, so the fill is Markets and Kitchens. A workplace whose kind is not on that list is offered only when someone in the household works there. #8942 (core-town-jobs-are-mostly-markets-and-kitchens, folded on Train #9554 at 688efe21, not on main) widened the town's employer mix; it did not change the Travel fill.

**Fix.** The fill draws from every open workplace in the town, one per business kind before a second of any kind, by the existing reasons and order (#8485's "why each place is listed" stays the one reason line). A workplace a stranger cannot walk into (a plant, a quarry) is offered with the reason the records give (someone the player knows works there, an opening there), never invented. No new list: `PUBLIC_PLACES` keeps only its job of saying who may walk in. Person cards already name the employer from the job record; check them at the same places.

**Laws that reach it.** None directly; this is the view. Its point is that the kinds laws reach (piece 2) are places the player can go and see.

**Time box.** 3 hours, one Sonnet session at medium effort.

**Rules.** One rule, all 56 places. No hand-written player text (reasons come from the bank). Replace, never layer.

**Done when.** At Gratz KY (world from seed "d4"/home-price-paths) and Bloomingdale NJ, named with seeds, Travel on day one lists workplaces of at least as many kinds as nine places allow from the town's kinds, each with a reason line, before and after pictures in the pull request. A second session sees it at a drawn place.

**Waits on.** Train #9554 (#8942, #8485) as its base.

**Files.** src/bench/places.ts, its test.
