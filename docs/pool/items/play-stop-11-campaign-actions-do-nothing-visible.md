---
id: play-stop-11-campaign-actions-do-nothing-visible
title: "Go on Knock on doors lands on a porch with nothing to do: no montage, no porch talk, no one to click"
area: elections
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
standard: 2
model: opus
effort: high
root: rc2-done-from-records
source: added with npm run pool -- add
lead: play-first
milestone: play-first
---

**What.** The owner, Nov 23 (P41), after Go on Knock on doors: "It says here, Riley Ferguson, Nora Hale. I can't do anything. I literally can't do anything." Go cuts to a porch with the people the doors reached on the HERE strip, no talk, no montage and nothing to press but Hour, Day and Week; the Player reproduced it on main 7f04c334 at Lucerne, Wyoming, seed 6d1a4e79d335 (#9995, comment 7117014537). His Oct 8 ruling is that door knocking plays as a montage with porch scenes, not a tally (OWNER-DECISIONS, "Oct 8 montage ruling"), and on Oct 27 "a short scene at 1 or 2 doors, maybe sometimes it's uneventful". The Go itself works and the trail's layout stays as it is (P40: "This is an improvement").
Seen: Go on Knock on doors plays the day's doors as a montage that ends at a porch talk.

**Cause.** Found in code: `goOut` in src/bench/play.mjs (from line 2075) handles a doors outing by closing the sheet and, at lines 2131-2134, setting the backdrop and calling `drawHere(result.scene)` with no click handler, so the people on the strip can't be talked to (the room passes `talkTo` at line 449). It then calls `showStory` only if the packet from the outing's hours holds a stop (`storyStop(result.packet)`, line 2128), and it never does. `campaignDay` (src/bench/campaign.ts:1033) returns `scene` as `outingScene` (campaign.ts:959): a picture and the people met, with no talk and no beats. The porch scene the engine does have, the director's `door-ask` situation (circumstances `door-first`, `door-again` and `door-petition` in src/director/data/circumstances.json, built by `purposeScene` and proven by src/director/door-ask-scene.test.ts), is fed by `doorsKnocked` (src/director/doors.ts:32) through `produceCircumstances` (src/director/ledger.ts:1614), which runs only in `onAfterDay` (ledger.ts:2264-2269), when the day closes. So on Go the scene doesn't exist yet. It is staged hours later and met, if at all, at a later pause, where it competes with that day's other moments. Measured at Verdigre, Nebraska (jurisdiction_acd66a0193bcadb4), seed 3c87be06-3434-405b-afab-c219d0d1b68d, main 7f04c334, as an announced council candidate: `POST /api/campaign/day?kind=canvass` returned 36 doors knocked, 22 answered, 3 people in `scene`, and a `complete` packet at 11:00 AM on Jan 21, 2025. The next Week stopped on Jan 22 for the Governor's address, not a door. Nothing in src/bench builds a montage for doors: `addressMontage` (src/bench/montage.ts:96) serves the President's address only.

**Fix.** Make Go play the doors where they happen, through the engines that exist. (1) At the end of a doors outing, `campaignDay` asks the director to stage that outing's door at once: run the circumstance step for the doors records of the outing (`doorsKnocked` into the `door-ask` rows, with their spacing) for the player, instead of waiting for `onAfterDay`, and return the staged moment's id. (2) The outing's story carries montage beats, one per door met, from `outingPeople` (campaign.ts) and `doorPlaceFor` by each household's dwelling, played one per Continue by the beat path `showStory` already uses for the address (`story.beats`, play.mjs about line 2593). A day with no door that has a stake ends on its last beat, which keeps "sometimes it's uneventful". The day's door with a stake ends in its porch talk, the `door-ask` purpose scene. (3) `drawHere` for an outing passes `(p) => talkTo(p.personId)`, as the room does. Keep the trail's layout. Words for the beats come only from Story's banks; any line a beat needs that the bank lacks is listed for Story, not typed.

**Time box.** 4 hours for one Opus session.

**Rules.** This is a game, not a spreadsheet: a doors outing is told as a montage and a porch talk, never as the tally of doors. Wire to the world: the porch talk writes back through the campaign engine's door cause and the resident's answer, as door-ask-scene.test.ts proves. No dice: which door is staged stays the cause's stake and agreement (`doorsKnocked`), never a roll.

**Done when.** A second session starts a new life in a drawn place on main after the merge, announces or files for a local race, and presses Go on Knock on doors: the doors play as a montage with Continue, at least one outing in the first week ends in a porch talk with a resident by name, and the HERE strip's people open a talk when clicked. It records the place and seed, the door cause's record id and screenshots at 1440x900 of a montage beat and the porch talk. A browser check that presses Go and fails when no talk opens fails on 7f04c334.

**Waits on.** Nothing. Lines for the montage's beats, if the banks lack them, are listed for Story in the pull request.

**Files.** src/bench/play.mjs, src/bench/campaign.ts, src/bench/story.ts, src/director/ledger.ts, src/director/doors.ts

**You will see.** Go on Knock on doors plays the day's doors one at a time and can end at a porch talk with a resident by name.

**Screenshot.** A montage beat and the porch talk after Go on Knock on doors, from a drawn place, with the place and seed under it.

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:05, 16:06; screenshots 49, 50, 53, 54, 55. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was laws. Split Oct 24 into play-stop-11-campaign-actions-do-nothing-visible-a and play-stop-11-campaign-actions-do-nothing-visible-b, each four hours or less; the CTO sets this item done when the last part is done. A grayed campaign outing (Knock on doors, Hold an event, Ask for an interview, Call donors) now shows its reason from the records on its button, in the play-stop-25 fix on branch claude/play-stop-25-door-count (speed lead, Oct 25); this item's "a grayed action says why" can cite it once that lands.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:03 UTC) on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible.

Released by next (2026-11-11): no push to claude/pool-play-stop-11-campaign-actions-do-nothing-visible since 2026-11-10 23:04 UTC, more than twice its 2-hour time box. Continue on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible and pull request #8262.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 03:06 UTC) on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible.

Released (2026-11-11): Replayed by API on main (Indio Hills, CA, place seed 1cc574fd5e0997f2e017845121fcd8a6e28a462123d6e45cbfda333bd972d4ce; filed for the US House seat first after 3 weeks): doors returns a scene (backdrop door-knocking-suburban); interview returns an interview record; speech begins with opener choices; event and forum are unavailable with the reason eventMoney (price 36791 minor, cash 0); calls and donor meeting returned named people each with a reason line (not-warm, no-spare) and raised 0 in week one, so 'raise money from a named person' was not seen in this place. Browser screenshots not taken; pool seen refuses a claimed item. Continue on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible and pull request #8262.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 03:18 UTC) on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible.

Released (2026-11-11): Replay-only item needing a filed candidate and each campaign action in the running game; not replayed by me; pool seen refuses non-merged items. Continue on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible and pull request #8262.

Claimed by next for sonnet-13d3 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 04:10 UTC) on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible.

Released (2026-11-11): Replay-only item (Fix: nothing is built); needs a second session in the running game with screenshots, and pool seen refuses a claimed item; released twice already. Continue on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible and pull request #8262.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 04:14 UTC) on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible.

Reopened Nov 23 by the Dead stops tracer (lane 5) from the owner's sitting 2026-11-23-1, row P41. The earlier replay above (Nov 11) saw doors "return a scene (backdrop door-knocking-suburban)"; that is the picture and strip this reopen says is a dead stop. Give a speech, Call donors and the interview are not this row: the interview is P50, in press-city-council-candidates-never-invited.
