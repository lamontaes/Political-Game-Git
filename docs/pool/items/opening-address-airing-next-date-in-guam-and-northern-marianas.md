---
id: opening-address-airing-next-date-in-guam-and-northern-marianas
title: "The opening address airs on the next local date in Guam and the Northern Marianas, but the opening day stays and the player lands at 11 a.m."
area: play
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: none
lead: screens
source: found building the address airing for play-opening-lands-at-830-pm, Nov 14, 2026
---

**What.** The President's address airs at 9 p.m. Eastern. In Guam and the Northern Marianas that moment is late morning the next calendar day. The game keeps the opening day and lands the player at the true local clock hour, so the player is home at about 11 a.m. before the address has aired. American Samoa is the other way: mid-afternoon the same day. Seen: on the player card and the landing line on the opening day in Guam and the Northern Marianas.

**Cause.** Found in code: `addressAiring` in src/director/address-airing.ts returns `shiftsDay: true` for those places, and `openingArrivalMinute` in src/bench/opening.ts ignores it.

**Fix.** Move the opening evening to the local date the address airs on in those places (or land the household home that evening after a day of its own) so the landing and the clock agree, reading `shiftsDay` where the opening chooses its date.

**Time box.** 2 hours.

**Rules.** One rule, all 56 places. Every number lives in a parameter table tagged SOURCED, ESTIMATED or TUNABLE. No new stopgaps.

**Done when.** A second session starts a life in Hagåtña or another Guam village and in a Northern Marianas village (place and seed named), plays the opening, and the card shows the date and hour the address aired at that place, with the landing line naming that date.

**Waits on.** Nothing.

**Files.** src/director/address-airing.ts, src/core2/data/opening/address-airing.json, src/bench/opening.ts
