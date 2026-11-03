---
id: play-parties-says-how-it-knows
title: "Parties says how it knows your party and fit, and names the places on its map"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: play-first/play-parties-says-how-it-knows
pr: #7097
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:40 UTC (second batch)
lead: play-first
milestone: play-first
claimed-at: 2026-11-01T23:36:33.548Z
---

**What.** Owner, Nov 1 playtest of v0.73.0, on Politics, Parties: "First of all, I don't know what this is supposed to be. I think this is supposed to be the Virgin Islands... But it says Democratic. Views fit close. How do you know?" The map draws the islands as unlabeled shapes, and Your party reads "Democratic, Views fit Close" for an 18-year-old with no registration or stated views shown anywhere. Your party should read the player's registration record (or say they are not registered), and a fit should say what it compares (the player's recorded views against the party's platform) or not appear until the player has views. The map names its places.

**Rules.** Ask why: a claim on screen names the record it reads, or it does not show. No hand-written player text: the labels and the fit's reason come from the English engine. Estimate, never UNKNOWN does not apply to the player's own choices: an unchosen party reads as not registered.

**Done when.** In two drawn places (named with seeds), Your party shows the registration from its record id or "not registered", any fit line names what it compares, and the map labels each island or county; screenshots before and after.

**Time box.** 3 hours.

**You will see.** Parties tells you why it thinks you're a Democrat, or says you aren't registered, and the map is labeled.

**Screenshot.** Parties before and after, in a territory and a state.

**Files.** src/bench/play.mjs, src/bench/parties-map.browser.mjs, src/bench/play-party.test.ts

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest, second batch (Nov 1, 22:40 UTC, five screenshots, a game in the U.S. Virgin Islands). Read: OWNER-DECISIONS (Oct 29 menus redesigned the way Government was; Oct 29 Political Process baseline; one history), the pool for twins.

Lane 5 (pool truth, Nov 3): claimed with PR #7097 open from its branch; set in-pr.
