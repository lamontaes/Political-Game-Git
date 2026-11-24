---
id: world-disaster-names-the-executives
title: "A disaster record names the sitting executives of the places it hit, so their first hours can be a scene"
area: world
kind: feature
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-world-disaster-names-the-executives
pr: #8498
blocked-on:
after:
model: sonnet
effort: medium
root: design-director-on-core2
source: words-and-scenes helper D, Oct 27; probes of governors' and mayors' played years in Prospect and Hindman, Kentucky, Graball, Tennessee and Bismarck, North Dakota
lead: laws-effects
claimed-at: 2026-11-11T02:49:00.292Z
checked: fable 2026-11-10
branch: claude/pool-world-disaster-names-the-executives
merged-at: 2026-11-12T19:13:09.777Z
---

**What.** The hazard record for a declared disaster is written with no people on it (personIds empty), and in the probed years it appeared one to four times a year (four in Prospect and Hindman, Kentucky) without any executive's moments changing. Name the sitting mayor of an affected town, the county executive of an affected county and the governor of the state in personIds, and carry the disaster number and title in the facts it already has, so a first-hours scene can find its executive and its place. Until then an executive's first hours of a disaster cannot be a scene. Seen: the first-hours scene where the mayor, county executive or governor meets a declared disaster.

**Cause.** Found in code: the `begin` function in src/core2/modules/disasters.ts (line 454) emits hazard.disaster with personIds: []; it also takes the town from the player's current place (core.people.get(core.playerId).placeId), not from the damaged town. Evidence is in docs/design/scenes/from-life/executive-record-gaps.md.

**Fix.** Name the sitting mayor, county executive and governor of the affected governments in personIds, carry the disaster number and title in the facts, and add the director moment for each executive in src/director/data/director.json.

**Time box.** 4 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the record is read by the director, which stages a scene. No dice: who is named is whoever holds the office on the day it is recorded. One rule, all 56 places: no place is named in the change.

**Done when.** A second session (not the builder) plays a world (`buildBenchWorld`) in a drawn place and a seed the builder did not choose, through a year that records a disaster, and sees it name the sitting executive of each affected government who is a full person and the director hold a moment from it for that executive; a test fails when an affected executive is missing from personIds.

**Waits on.** Nothing.

**Files.** src/core2/modules/disasters.ts, src/director/data/director.json, docs/design/scenes/from-life/executive-record-gaps.md

**Notes.** Evidence in docs/design/scenes/from-life/executive-record-gaps.md. Lead laws-effects.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:48 UTC) on branch claude/pool-world-disaster-names-the-executives.
