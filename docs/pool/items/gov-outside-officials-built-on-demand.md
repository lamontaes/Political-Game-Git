---
id: gov-outside-officials-built-on-demand
title: "Another state's roughly 7,500 legislators are named and built when something asks for them, not at the opening"
area: gov
kind: feature
priority: 2
size: M
status: claimed
claimed-by: officials-on-demand
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-08T01:44:46.323Z
---

**What.** At the opening every other state's chambers are seated as named officials (the offices engine seats the seats, the officials engine names each holder the first time a chamber is read), which costs about 7 seconds and tens of thousands of records in a country's first year. The owner ruled on Nov 5 that those legislators are not built at the opening if nothing needs them yet, and are named and built on demand, because a named person is a real person once named. Another government's session now needs only each seat's party and district lean and an opening view, so the draw of a member's ideal and signature can run from the seat's data without creating the person, and the person is filled in only when the player opens that member, a roll call, a story or a scene.

**Rules.** Serves the owner's Nov 5 ruling in OWNER-DECISIONS.md: simulate from the people there, keep only the result, generate on demand. One model, two tiers: a legislator outside the player's chain is a counted seat read by the same rule as a full person until met, and a filled-in member must match what the records say (the seat, the party, the stated views). No dice: the draw is the seat's own seeded draw, the same every time.

**Done when.** In a buildBenchWorld played year from a drawn place, a test names the place and seed and shows that the first year's records kept for other states' legislators are fewer than the 7,500 named officials of today, that opening a roll call from rollCallOf for one law row names the same member keys twice and fills in only those members, and that npm run speed:year on Upper Witter Gulch, seed 5a1c0de7a11ce5e1, runs year 1 within 5 percent of its 59.5 second base.

**Files.** src/core2/modules/officials.ts, src/core2/modules/world-legislating.ts, src/core2/modules/legislature.ts

**Notes.** Filed by State Sessions, Nov 5, from the CTO's relay of the owner's ruling (item 4). Reuse the game's fill-in path (core-fill-in-hook and its neighbors); do not add a second generator. Numbers so far: year 1 69.5 s against a 59.5 s base after the result-only change (#7299), of which naming the officials once and electing party leaders in 56 chambers are the known one-time costs (CPU profile, Nov 5).

Nov 8 (State Sessions), bisect and profile. The year-1 growth on main traces to this item's cause. Upper Witter Gulch, seed 5a1c0de7a11ce5e1, `speed:year --years 1 --exclusive`: the commit before #7290 (every legislature sits) kept 179,817 records after year 1 and ran in 26.6 s; #7290's merge kept 617,344 and ran in 69 s; main today keeps about 404,000 (the result-only change #7299 took some back) and runs about 52 s. Largest gaps against Nov 4: law-effects applied rows 30,475 against 9,442, budget year-to-date 16,594 against 1,591, credit applications 12,704 against 29, relationships 20,830 against 8,293, cash-journal account tables about 8,900 against 1,300 each. A year-1 CPU profile on main (62 s with the profiler on) puts the monthly pay of the other states' officials at 10.9% (`payMonth` in `official-pay.ts`), their sessions at 7.9% (`openSession`, of which `openOutsideSession` 6.9%) and naming them at 5.9% (`seatAll`): about a quarter of the year. The cut is the one this item asks for: pay, living cost and accounts for a legislator outside the player's chain must be counted until someone meets them, and filled in from the seat's salary when asked, so the same person and the same balance come back every time. Not started; the item stays open for anyone.
