---
id: play-campaign-trail-tiles-are-black-boxes
title: "The campaign trail's tiles are black boxes: each shows the place its act happens"
area: play
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by:
pr: 8681
after:
blocked-on:
lead: screens
model: fable
effort: medium
root: rc7-player-cannot-drive
source: Fable B's walk of the menus, Nov 10 and 11, 2026 (the audit of Nov 7, screen 55: "a wall of buttons")
checked: fable 2026-11-11
---

**What.** The campaign trail lists what a candidate can do today: knock on doors, hold an event, ask for an interview, call donors and the rest. Each is a tile, and every tile is a black box with a name on it, though the approved mock (pl-trail) shows a picture of the place on each. A blocked act says why under a heading that reads "Ask". Seen: the Campaign tab's trail in Politics, where each tile shows the street, hall, newsroom or office its act opens in.

**Cause.** Found in code: `campaignParts` in src/bench/play.mjs builds the trail's entries for `travelScreen` (src/bench/ui/travel-screen.mjs), which draws `entry.picture` on a tile when it is given one, and no trail entry carries a picture. The server knows the place: `outingScene` and `askScene` in src/bench/campaign.ts pick each act's place from src/bench/data/scene-places.json, but only when the act is done, and `campaignView` sends the trail no picture. The heading comes from `labels: { whatICanDo: T.groupAsk }` in the same `campaignParts`.

**Fix.** One list in src/bench/campaign.ts of where each act happens, read by the act's scene and by its tile. `campaignView` sends each outing its `picture` and a `pictures` map for the other tiles (the asks, the money, the speech, a debate), each a backdrop in the town's own light and region. `campaignParts` passes them to the tiles. An interview is pictured at a newsroom and a debate at a studio, from two new rows in scene-places.json. A blocked act's reason sits under "Not today", and the hall's cost is a sentence.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the pictures come from the place list and the town's regional backdrops, with no place named in code. No hand-written player text in code: the two new labels are rows in src/bench/data/controls.json. Replace, never layer: the scene and the tile read one list of places, not two.

**Done when.** A second session, in the running game on main in a drawn place it writes down with its seed, files for an office when filing opens, opens Politics, Campaign and the trail at 1440x900, and sees a picture on every tile and on the chosen act's detail, with no black tile; it chooses an act that is out of reach and reads its reason under "Not today"; and it presses Go on one act and finds itself in the place its tile showed.

**Waits on.** Nothing.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/bench/data/scene-places.json, src/bench/data/controls.json, src/bench/ui/travel-screen.mjs

**Notes.** Written and built by Fable B (2026-11-11). The trail still lists the money acts as tiles with number boxes (stopgap SG-PLAY-campaign-acts-buttons); that is not changed here. Before and after in San Jose, Tinian, Northern Mariana Islands (seed 9ebc2906-33b6-4e80-a74e-7de4dd91aa4b) are in docs/seen/campaign-trail-pictures.
