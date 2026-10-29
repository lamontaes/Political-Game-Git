---
id: laws-override-record-names-members-and-reads-replies
title: "The veto-override record names its chamber and its movable members, and a scene reply is read at the sponsor's next vote"
area: laws
kind: wiring
priority: 2
size: S
status: done
claimed-by: claude/laws-override-record
pr: #6365
blocked-on:
lead: laws-effects
source: added with npm run pool -- add
claimed-at: 2026-10-27T16:23:29.204Z
---

**What.** The veto-override record (legislature.ts, executiveDecision) lists only the sponsor and the executive and carries no chamber fact, so a scene cannot be staged in the chamber or cast the members who decided the override. Add a chamber fact and the member keys of the override vote rows that were no or abstain, nearest zero first. Also have a member's later position on the sponsor's bill (positionOn) read a scene.reply of type veto-override as one recorded reason: a favor owed raises it, a strain lowers it, both citing the reply id.

**Rules.** No dice: the reply is one more recorded reason at the member's decision, never a roll. Wire to the world: proven in a generated world. One rule, all 56 places.

**Done when.** src/director/override-scenes.test.ts or legislature.test.ts in the played world (buildBenchWorld) on a place drawn from all 56 with a seed nobody chose shows a veto-override record with a chamber fact and member keys, and a later vote whose recorded reasons cite a scene.reply id.

**Files.** src/core2/modules/legislature.ts,src/director/override-scenes.test.ts

**Notes.** lead: laws-effects. Time box 3 h, Sonnet. Packet: docs/design/scenes/from-life/veto-override-whip.md.
