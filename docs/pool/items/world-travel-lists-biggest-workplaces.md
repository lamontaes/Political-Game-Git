---
id: world-travel-lists-biggest-workplaces
title: "Travel lists the places tied to the player first, then the town's biggest workplaces across every kind of work, not only kitchens and markets"
area: world
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude-world
pr: 9765
blocked-on:
after:
lead: world
model: sonnet
effort: medium
root: none
source: Owner, Nov 16, 2026 ("it's just a bunch of kitchens and markets"), his Desk answer at 5:20 PM, crew line #9747 item 6a
---

**What.** Travel filled its list after the player's own places with a typed set of public places, so it showed kitchens, markets and little else. The town's real workplaces, such as factories, farms, builders and schools, never appeared. Seen: owner playing, Nov 16.

**Cause.** Found in code: `src/bench/places.ts` kept `PUBLIC_PLACES`, a typed list of backdrop names, and listed a place with no tie to the player only when its backdrop was in that list.

**Fix.** `townPlaces` in `src/bench/places.ts` lists the places tied to the player first, then the town's biggest workplaces across every kind of work, one kind's biggest after another's, by headcount from the organization and job records (`staffOf`). The typed list is deleted. The player sees each as "One of the town's biggest workplaces" on its card.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** The `wire-to-the-world` rule applies: the list reads the town's organization and job records, so every place has its own. No dice: ordering is by headcount and name.

**Done when.** In a drawn place and a seed the builder did not choose, Travel lists the player's own places first and then the biggest workplace of each kind of work the town has, shown in `src/bench/travel-biggest-workplaces.test.ts`; a second session sees the same on the Travel screen.

**Waits on.** Nothing.

**Files.** src/bench/places.ts, src/bench/data/controls.json, src/bench/travel-biggest-workplaces.test.ts

**Notes.** The label "One of the town's biggest workplaces" is a control name in `controls.json`, for Story to sign.
