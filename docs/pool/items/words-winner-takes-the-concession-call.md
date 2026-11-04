---
id: words-winner-takes-the-concession-call
title: "After you concede, the winner takes your call, gracious or gloating by their traits"
area: words
kind: feature
priority: 2
size: S
status: done
claimed-by: lane3/rival-gloats
pr: #7178
blocked-on:
after: words-concession-reaches-the-paper
source: added with npm run pool -- add
claimed-at: 2026-11-04T04:52:36.538Z
---

**What.** Path 6 asks for a rival who may gloat after you lose. When the loser concedes, the press's concession record (conceded yes) now stages a phone scene, concession-taken. The winner speaks first, with lines whose bearings their traits pull (calm and polite toward gracious, cocky and smug toward glad), and the loser can wish them well, keep it short or answer back.

**Rules.** Scene-standard: cast from the world (the winner from the record), lines vary by the speaker's traits through calibration bearing pulls, never a roll (no dice), and the scene writes back: a sharp exchange ends relationship-strained on the tie. No hand-written player text: the lines are scene-talk bank pieces.

**Done when.** In a drawn place (buildBenchWorld), a loser who concedes gets the concession-taken scene with the winner as asker. A warn, refuse, accept path writes a scene reply whose keeps is relationship-strained. src/director/concession-reported.test.ts passes on a fresh seed, naming the place, the seed, the winner's trait values and the reply id.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/data/director.json, data/english/parts/scene-talk.json, src/director/concession-reported.test.ts

**Notes.** Built by Lane 3, Nov 4, on branch lane3/rival-gloats (stacked on #7159), head 74c3c015. The boasts-only slice of words-arrogance-anger-and-fear; threats and alarms stay there. PR waits for a free slot (Lane 3 is at 5 open).
