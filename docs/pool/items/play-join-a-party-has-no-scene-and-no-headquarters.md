---
id: play-join-a-party-has-no-scene-and-no-headquarters
title: "Joining a party only changes a line on the Parties tab: no scene plays and there is no party office to go to (audit's New Hampshire life)"
area: play
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-play-join-a-party-has-no-scene-and-no-headquarters
pr: #8453
after:
blocked-on:
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6, "Not fixed (measured)")
model: opus
effort: medium
root: rc6-scenes-repeat
checked: fable 2026-11-10
claimed-at: 2026-11-11T01:59:58.615Z
---

**What.** Measured by the Nov 9 audit: "Join a party changes the tab to 'Registered Republican since January 20, 2025.' No scene plays and there is no headquarters to visit." The audit's browser life was in Blodgett Landing, New Hampshire (a random world, no seed). The owner said it on Nov 8 (v0.94.0, Manchester, Connecticut): "I clicked join Democrat. Nothing happened. I expected maybe a scene to play. Maybe I'd show up to the headquarters or whatever... But then I click now and it says that I'm registered Democrat already." Fix the cause for every party in every place: joining is an act with a place and a person, told by the director from the joining record, and the opening leaves the player's party for the player to choose.

**Cause.** Found in code: `joinParty` in src/core2/modules/parties.ts (line 432) writes the party tie and the membership and nothing else, so no news, journal line or scene follows and the director has no situation type caused by a joining record; the opening gives every adult a party by lean without skipping the player (parties.ts, about lines 250 to 310), which is why he was 'registered already'; `townPlaces` in src/bench/places.ts (line 69) lists no party office. The Join button posts to /api/party/join (src/bench/play.mjs, line 1626). Measured by the Nov 9 audit in Blodgett Landing, New Hampshire (no seed).

**Fix.** Skip the player at the opening, then have the joining record cause a director scene at the party's place with a party member from the world, write a journal line, and list the office in Travel with the reason the player may go there. If no party organization has a place, register a stopgap and stage the scene where the party's chair works.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: joining a party must reach a person, a place and a record another engine reads, not only a line on a menu. An effect is a read, not a record: the director's scene and the journal read the joining record, and the party's chair or meeting reads the new member. No hand-written player text: the scene's lines come from the banks through the director, cast from the party's own people in the world. Owner, Sept 29 (quoted in the playtest check, point P24): "Everything is happening within a menu. I need to be able to meet people." The scene-standard skill applies: the scene exists only if it writes something back.

**Done when.** A second session starts the bench (`npm run bench`), starts a new game as an adult in a drawn place (place and seed named in the proof), opens Politics, then Parties, and takes a screenshot before joining: the player must not already be shown as registered. The session clicks Join for one party. A scene must play at that party's own place with a named party member from the world, and end with something kept (the record id named in the proof). After it, a screenshot of Parties must show the membership with the day it happened, the Journal must hold a line about it, and Travel must list the party's office with the reason the player may go there. Nothing on these screens may be a raw id or record kind. The same steps are then run in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed), as the named repro. The owner plays it: he clicks Join, is taken to the party's office, meets someone there, and afterward can find that office in Travel.

**Waits on.** Nothing.

**Files.** src/core2/modules/parties.ts, src/bench/play.mjs, src/bench/places.ts, src/bench/handler.ts, src/director/data/situation-types.json, src/director/data/circumstances.json

**Notes.** From the audit's Pillar 6, re-checked in the game; playtest point P24 of docs/coordination/playtest/2026-11-08-1.md and its row in `2026-11-08-1-check.md`. Related items, both done and both about the button and the record only: play-join-party, parties-join-act-writes-no-membership (marked done, still shows no scene). Related open: play-travel-in-a-village-lists-no-town-office (filed Nov 10), words-scene-party-asks-you-to-run. The Nov 9 Screens row note on Travel (check file, "Row notes", P13) holds that a political place appears in Travel only when the player has business there that the records show; a party the player belongs to is such business, but the CTO should confirm before the office is listed for non-members. Not verified by the audit: whether the audit's character was registered by the opening or by the click (the date shown, January 20, 2025, is the opening day), and whether any party in the drawn world keeps an organization with a place of its own. If no party organization has a place, register that as a stopgap and stage the scene where the party's chair works.
