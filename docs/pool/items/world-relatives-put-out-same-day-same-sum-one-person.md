---
id: world-relatives-put-out-same-day-same-sum-one-person
title: "At Charlotte Amalie West three relatives' households are put out the same day owing the same 95,920 cents, each one person"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: world
source: "Account lead, Nov 14, 2026, from the second words reader's read of #9120"
model: opus
effort: medium
root: rc1-world-outside-town
checked: account lead 2026-11-14
---

**What.** In a played world nothing staged (the proof only advances days), three households of the player's relatives are put out on Feb 21, 2025, each owing 95,920 cents, and every household that was put out in the proof's runs held one person. A town's evictions that are the same sum on the same day and always single people read as one pattern copied, not as separate households whose money ran out. Seen: the relatives of the player in the eviction talk (Rachel, Jason and Antonio of one family name) all tell the same day and nearly the same figure ("I owed about $950", "about a month behind").

**Cause.** Measured: Charlotte Amalie West, U.S. Virgin Islands, seed a20d6c4e-e890-49d7-8027-bc461837d0c9 draw 0 of 1 (place seed 15fa4ab216ba340c8d4a6513d0b69a6277084ce843e65c54215026a1593153a6), run with `node --import tsx scripts/words/eviction-talk-proof.ts --seed a20d6c4e-e890-49d7-8027-bc461837d0c9 --draws 3`. The housing cases `eviction:lease:household_5d4fc5697df3700a:2025-02-06`, `eviction:lease:household_6a5602244dd13250:2025-02-06` and `eviction:lease:household_6f0c1f74dff001ca:2025-02-06` all show `removed 2025-02-21` and `owed 95920 cents`. The first account's note on #8924 saw the same at Beckett NJ, Leoma TN and West Stewartstown NH and named `world-opening-husks-in-town-hold-no-cash`; that item's root cause was the cabinet heads, so this is a different cause not yet found: the leases share one rent and one start date, which looks like household records made from one template at the opening.

**Fix.** Find where the opening makes the relatives' households and leases (src/core2/opening-kin.ts and the housing opening) and read whether they share one rent, start date and cash row; give each household its own rent from its place's rent distribution, its own start and its own cash, from the world's spread, never a typed number. Prove it in the same three drawn places.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a husk or counted household is read by the same rules as a full one. Estimate, never UNKNOWN: starting rent and cash come from the real average with a per-world spread. Registered stopgaps only.

**Done when.** A second session, in three drawn places with seeds named, plays 200 days on main and lists every household put out: no two relatives' households share the same removal day and the same sum unless their leases differ in that way by record, and households of more than one person appear among them.

**Waits on.** nothing.

**Files.** src/core2/opening-kin.ts, src/core2/modules/housing.ts, scripts/words/eviction-talk-proof.ts
