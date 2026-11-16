---
id: design-player-goes-to-a-doctor
title: "The player can go to a doctor, so a promise to get checked after a rescue can be kept"
area: people
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: promises brief T, Words lead rulings 1 (Nov 14)
lead: director
standard: 2
model: opus
effort: medium
root: design-story-director
---

**What.** A build waiting on a missing player act, not a drop. After a housemate gets help for the player, the rescuer asks the player to see a doctor. The player has no act that takes them to a doctor; care is the coverage engine's monthly bill. So the promise could not be kept or broken, and under ruling 1 it was cut from rescue-ask (/mnt/project-files/words-lead/promises/cuts.md). Seen: at the rescue scene, and later when the rescuer asks whether the player went.

**Cause.** Design: src/core2/modules/health.ts has no care-visit action for a person (its exports read in the Nov 10 triage, docs/stopgaps/triage-2026-11-10/director.md); the promise kind `see-a-doctor` is named in src/director/data/promise-kinds.json with `settle: []`.

**Fix.** Design a care visit as one player act that the health engine records and charges through the coverage it already keeps (the visit's cost, what it finds). Then give `see-a-doctor` its settle operation on that record, and restore the rescue-ask promise reply and its ending row. The Words lead writes the restored lines.

**Time box.** Design 2 hours (Opus); build 1 day (Sonnet).

**Rules.** No dice: what the visit finds comes from the health record. Wire to the world: the visit moves money through coverage. Nothing is done for the player without their press.

**Done when.** A second session sees in the running game, in a drawn place (place and seed named) the player promises at a rescue scene and then goes to a doctor; the promise ends kept by the visit's record id and the payment is on the journal; at a second place they do not, and it ends broken; each is said once at the next talk.

**Waits on.** Nothing.

**Files.** src/core2/modules/health.ts, src/director/data/promise-kinds.json, src/director/data/purpose-arcs.json, src/director/promises.ts
