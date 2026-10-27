---
id: scene-challenged-from-within
title: "A sitting officeholder hears that someone from their own party has filed against them: the primary challenge is a scene"
area: director
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "owner, Oct 14: primary challenges (docs/design/scenes/owner-scene-examples.md); words-and-scenes lead, Oct 27, scene web campaign pass"
lead: director
milestone: play-first
claimed-at:
---

**What.** The owner asked for primary challenges. The elections engine already lets two filers of one party file for a seat and counts the primary (`holdPrimary`, the `primary-result` record). But nothing tells the sitting holder that a challenger from their own side has filed, and no director code reads `primary-result`. The packet `docs/design/scenes/from-life/a-primary-challenge-from-your-own-side.md` (state legislative primaries, calibration only) shows the moment. Someone close brings the news, the party's leaders stay out or take a side, and the challenger runs on the holder's record.

**Rules.** No dice: the scene fires from the `candidate-filed` record whose party matches the holder's for the holder's own seat. Serves `scene-standard`: the bearer is cast from the holder's staff, party chair or a close tie, and the reply is written back. One rule, all 56 places: primaries follow each place's own election data.

**Done when.** In a buildBenchWorld drawn place (seed named), when a same-party filer files for a seat a full-person holder seeks again, a situation type stages for the holder on the filing's day, citing the `candidate-filed` record by id. It is cast from the holder's ties, and its reply is written as a `scene.reply`. A test fails when such a filing stages nothing.

**Time box.** 4 hours.

**You will see.** A call from your party chair: someone from your own side just filed for your seat.

**Screenshot.** The scene in the bench, with place and seed.

**Files.** src/director/data/situation-types.json, src/director/scheduling.ts

**Notes.** Engine gaps the packet names: a party can't take a side in a contested primary (parties), and a challenge keeps no reason (elections). The primary loss itself is `words-primary-loss-scene`.
