---
id: people-school-rooms-from-district-joint-use
title: "A school is a place to hold a meeting only when its district lets outside groups use its schools"
area: people
kind: stopgap
priority: 2
size: M
status: in-pr
claimed-by: claude/project-thread-86yqt4
pr: "#9276"
blocked-on:
source: stopgap plan cluster 29 part 3 (Nov 14, 2026); Account lead, Nov 14 17:21Z
claimed-at: 2026-11-14T17:30:00Z
after: people-party-mentor-taken-when-asked
lead: elections
standard: 2
model: opus
effort: medium
root: none
checked: account lead 2026-11-14
---

**What.** A person moved to organize around a cause holds a meeting at a public meeting place. Every high school, every college and every congregation or organizing group in the directory was offered as one, with "permission not established" (SG-P8-civic-inputs, marked dropped Nov 10 while its marker still ran in every world). Seen: where the people of a town hold their organizing meetings, and the meeting a scene or the Journal mentions.

**Cause.** Found in code: `src/core2/data/civic-inputs.json` gave the `public-meeting-place` affordance (read by `knownPublicTargets` in `src/core2/modules/life.ts`) to the rules `school-meeting-inquiry`, `campus-meeting-inquiry` and `recorded-association` with no record that a room was open; `enrichCivicInputs` in `src/core2/civic-inputs.ts` stamped every listing with the stopgap id.

**Fix.** Each school district gets a joint use agreement fact when the world is built, at the share of districts that had one in its Census region (CDC SHPPS 2012, `data/research/core/shpps-2012-joint-use.json`; territories take the national share). A high school is a meeting place only when its district (the first seven digits of its NCES id) has one; its facts say which. Colleges become institutions to inquire at, never a meeting place (no record says a room of theirs is open). An association's hall is its building on record (a town workplace with its own staff), so it stays a meeting place for its own members and staff only (`knownPublicTargets` in `src/core2/modules/life.ts`). The stopgap row, its marker and the stamped id are deleted.

**Time box.** 4 hours for one opus session.

**Rules.** No dice (the agreement is generated with the world, never rolled in play); one rule, all 56 places; real rates check the total.

**Done when.** A second session, in a drawn place, opens dev mode's records for the town's public places and sees each high school say whether its district lets outside groups use it, sees organizing meetings in a played year held only at schools whose district does, no college offered as a meeting place, and a congregation's or union's hall offered only to its members.

**Waits on.** Nothing.

**Files.** src/core2/civic-inputs.ts, src/core2/data/civic-inputs.json, src/core2/modules/life.ts, src/core2/data/stopgaps/p8.json, src/core2/civic-inputs.test.ts, src/core2/civic-joint-use.test.ts (new)

**Notes.** Pinned test src/core2/civic-joint-use.test.ts (seed joint-use-1: 10,518 districts, 61.2% with an agreement, inside the survey's 57.5% to 65.5%; Alexander City AL a yes district, Adamsville AL a no district).
