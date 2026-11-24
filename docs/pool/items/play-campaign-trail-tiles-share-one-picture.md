---
id: play-campaign-trail-tiles-share-one-picture
title: "The campaign trail's tiles each show their own place: Volunteers, Endorsements, Mail and Poll no longer share the campaign office"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pt-board-tiles
pr:
blocked-on:
source: owner sitting 2026-11-23-1, CTO's catch on #10377 (comment 7124283577)
claimed-at: 2026-11-24T07:00:00.000Z
after:
lead: play-first
model: sonnet
effort: medium
root: none
---

**What.** The CTO's catch on the Nov 23 replay (#10377, comment 7124283577): "Campaign (Board mock, lane 8): four tiles share the same office painting." On the campaign trail (Bordentown, New Jersey, seed 9c78fd91-cdf8-4a17-ad48-6cb31af452a3), Volunteers, Endorsements, Poll, Mail and Pay people to gather signatures all show the campaign office, and Hold an event and Give a speech both show the same courthouse-square rally. Seen: the campaign trail at 1440x900, where every tile shows a picture of its own.

**Cause.** Found in code: `TRAIL_PLACES` in src/bench/campaign.ts gives `volunteer`, `endorsement`, `mail` and `poll` the one `volunteerOfficePlace` or `endorsementMeetingPlace` picture (`campaign-office-storefront` in src/bench/data/scene-places.json), and `event` and `speech` both `speechPlaces[0]`; `trailPictures` draws each tile from that table. The circulators tile in src/bench/play.mjs reads `pictures?.mail`.

**Fix.** Replace the six single-place keys in src/bench/data/scene-places.json (`phoneBankPlace`, `volunteerOfficePlace`, `adBuyPlace`, `interviewPlace`, `debatePlace`, `endorsementMeetingPlace`) with one `trailPlaces` section: each act's names tried in order, the first painted wins, a wanted picture first and a painted stand-in after it. `TRAIL_PLACES` and the act scenes read it. The office tiles get their wanted pictures (volunteers at a table, an endorsement meeting, a phone-survey room, a mail table, circulators outside a store, each in `wantedPictures`) and distinct painted stand-ins (the campaign office, the coffee shop, the office, the post office, a strip-mall parking lot); the event gets the lodge hall; the circulators tile reads its own picture. No picture is painted.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One list for pictures (owner, Nov 14, `.agents/rules/scene-pictures.md`): a missing picture never holds work back, and a wanted picture goes in `wantedPictures`. Replace, never layer: the old keys are deleted, not left beside the new section.

**Done when.** A second session starts the bench on main in a drawn place (named with its seed), files for an office when filing opens, opens the campaign trail at 1440x900 and sees no two tiles with the same picture except the two at the player's home (a house party before its host is known, and the player's own money); `npm run scene-pictures -- --check` passes.

**Waits on.** Nothing.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/bench/data/scene-places.json, docs/art/SCENE-PICTURES.md, docs/art/WANTED.md

**Notes.** Filed by Board mock (lane 8) in the PR that builds it, Nov 24, on the Coordinator's relay of the CTO's catch. The wanted pictures were first named in play-campaign-trail-scrolls-and-tile-names-fade's Fix.
