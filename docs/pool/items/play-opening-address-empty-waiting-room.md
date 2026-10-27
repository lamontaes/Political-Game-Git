---
id: play-opening-address-empty-waiting-room
title: "Show the opening address in its intended setting with its speaker"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by: play-first/play-opening-address-empty-waiting-room
pr: #6238
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T05:56:56.259Z
---

**What.** The numeric President address plays over an empty office waiting room. Merger3 reproduced on PR6103 and the author before/after images already disclose it as existing. The numeric text fits at both checked window sizes, but the scene does not show the speaker giving the address.

**Rules.** Wire to the world: the opening renderer must read the actual address frame and its speaker records to place the scene. Browser visual acceptance: no green script overrides visible failure. Read the existing opening frame place/backdrop/cast records and use the intended scene; do not hard-code a place or create an alternate engine.

**Done when.** In an ordinary drawn new game, screenshot the inaugural address with the intended setting and visible President, inspect native1440x900 and1024x768 captures, and show record IDs and real playback with no page errors. Add a drawn regression case for the backdrop and cast reader.

**Files.** src/bench/opening.ts, src/bench/play.mjs, src/bench/data/opening-pictures.json

**Notes.** Observed Sa ilele American Samoa seedbe36e975-96e3-44f3-b712-df15c5927a29 and Los Heroes Puerto Rico seede2e7428f-99d6-49f0-b875-590326606fb6; speech macro-month:2024-12. Screenshot evidence will be linked on PR6103. This existing scene defect is separate from Words numeric address implementation. Playtest Oct 26 sitting 1 (installed v0.34.0): v0.34.0: the President is only a small portrait, never seen giving the address; cutaway offices (unemployment, grocery, factory) are empty.

CTO root-cause report, Oct 27 (docs/reports/opening-root-cause-2026-10-27.md): in Iowa City, Iowa, seed 28c0b8150290, all four cutaways (unemployment-office, factory-floor, grocery-store, main-street) are empty. Cause: the topic rules in src/bench/data/opening-pictures.json:24-71 carry no cast, so castOf (src/bench/opening.ts:89-101) returns nobody. The whole fix is director-opening-as-a-scene (lead director), which casts each cutaway from the town business and its workers; this item closes with it.
