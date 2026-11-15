---
id: play-travel-campaign-trail-card-has-no-picture
title: "Travel's card for the campaign trail is a black box, while every other card there shows its place"
area: play
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/p1-travel-trail-tile-picture
pr: 9021
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: Playtester P1, Nov 13
claimed-at: 2026-11-13
---

**What.** Curtisville, Pennsylvania (bench seed 24b09c77-0589-433f-9b6b-0c77e53b4ff7, main 5e68cde1), after filing for supervisor. Travel shows CAMPAIGN with one card, "The campaign trail", as an empty black box above the filing office and the town's places, which all have pictures. #8681 gave the trail's own tiles (doors, event, forum…) their pictures, but not the card that opens the trail. Seen: the campaign trail's card at the top of Travel once the player has filed.

**Cause.** Found in code: src/bench/play.mjs, `campaignParts` builds each campaign's part as `{ filing, contest, trail }` and drops the trail's `pictures`. Travel's `trails` (the `travel` sheet) gives the card no `presentation`, so src/bench/ui/travel-screen.mjs `drawTile` draws no picture.

**Fix.** Carry the doors picture (`pictures.doors`, the street the trail starts on, from src/bench/campaign.ts `trailPictures`) on the part, and give Travel's trail card `presentation.imageUrl` from it. src/bench/campaign-trail.mjs, which every trail browser check opens the trail through, fails when the card has no picture.

**Time box.** 1 hour for one Sonnet session.

**Rules.** screen-to-mock: Travel's cards all show a picture of the place, the trail's included, through the one shared tile. One rule, all 56 places: the picture is the trail's own record.

**Done when.** A second session, on main, plays a new life in a drawn place to a filing, opens Travel, and takes a screenshot: the campaign trail's card shows a street, and src/bench/campaign-actions.browser.mjs passes on the bench.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/campaign-trail.mjs, src/bench/ui/travel-screen.mjs
