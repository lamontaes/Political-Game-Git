---
id: play-campaign-trail-scrolls-and-tile-names-fade
title: "The campaign trail's tile list scrolls inside its panel and its tile names fade on bright pictures"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: owner sitting 2026-11-23-1, C14
claimed-at:
after:
lead: play-first
model: sonnet
effort: medium
root: none
---

**What.** The CTO's catch C14 on the owner's Nov 23 playthrough: the campaign tiles share one office picture for Volunteers, Endorsements, Poll and Mail, their names are faint on bright pictures, and the panel scrolls ("none of these scrollers, especially when there's ample dead space in these menus"). Fifteen tiles in three columns run past the panel, so the last group ("Speak") is cut off and the tile list scrolls inside its box. Seen: the campaign trail at 1440x900 shows every tile with its group, with no scrollbar, and each name reads on its picture.

**Cause.** Measured: at Alta, California, seed b64d8224-6a4b-4ff2-86f5-4a8dcf9708e0, 1440x900, the trail is `travelScreen` (src/bench/ui/travel-screen.mjs) in the sheet's `place-view`; its `.travel-left` box is capped at `100vh - 230px` (src/bench/play.css) and holds fifteen tiles of 104 pixels in three columns, so "Speak" falls below the foot and the box scrolls (panel 825 of 850). The names are faint because `.travel-tile::after` (the shade) comes after the name `b` in the tile and draws over it, and its gradient starts at 45% with 60% black. The four tiles share a picture because `TRAIL_PLACES` in src/bench/campaign.ts gives mail, poll, volunteer and endorsement the one `campaign-office-storefront` picture.

**Fix.** In src/bench/play.css lift the name above the shade (`z-index: 1`) and darken the shade (from 30%, 78% black). For the trail only (`#sheet-body.place-view .travel-screen`), widen the screen to the panel, use `repeat(auto-fill, minmax(150px, 1fr))` columns and an 84 pixel tile, so the fifteen tiles fit. Remove the trail's entry from the ui-look baseline if it was there. The shared picture is a wanted picture, not a painting: four pictures (volunteers at a table, an endorsement meeting, a phone-survey room, a mail table) are listed in the PR body for Story and the scene-pictures list; nobody paints them in this item.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** This is a game, not a spreadsheet: a menu has no scroll while it has free space, and the tile names read on every picture. Replace, never layer: the trail's tiles use the one travel screen part with a scoped size, not a second tile.

**Done when.** A second session starts the bench on main in a drawn place (named with its seed), files for an office when filing opens, opens Politics, Campaign and the trail at 1440x900 and sees every group including Speak with no scrollbar, each tile name readable on its picture; `npm run ui-look` passes with the trail in its crawl.

**Waits on.** Nothing.

**Files.** src/bench/play.css, src/bench/ui-look.browser.mjs

**Notes.** Filed by Box and scroll (lane 2) in the PR that builds it, Nov 23. Tiles sharing one picture: wanted pictures for Story and Art, not built here.
