---
id: traits-meetings-take-part-spread-across-towns
title: "Taking part at a meeting fits the study across five towns but spreads from 0.94 to 2.16 log odds on fresh draws"
area: people
lead: laws-effects
kind: research
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: high
root: none
source: laws-and-effects lead, Oct 27 (recheck of #6143)
checked: fable 2026-11-10
---

**What.** The take-part weight (0.32) was fitted on five towns' kept meeting pools, whose thirds' log odds run 0.91 to 1.29 against Mondak et al.'s 1.088. On PR #6143's merged head (99fc0b1579) three fresh draws of src/core2/modules/meetings.traits.test.ts read 2.158 in Fair Oaks, Oregon, 1.167 in Brian Head, Utah and 0.941 in Denham, Minnesota; Crescent Springs, Oklahoma read 2.058 earlier. The PR's notes give the likely cause: a fifth to a third of residents feel as strongly as anyone can about a question, and among them temperament alone sets who fills the room. Find whether the spread comes from that saturation of feeling, from room size against town size, or from too few contested rooms, and fit the weight or the cause across more towns.

**Cause.** Needs cause. Looked at: npx vitest run src/core2/modules/meetings.traits.test.ts on fresh draws (Oct 27, #6143 head 99fc0b1579) read 2.158 in Fair Oaks, Oregon; 1.167 in Brian Head, Utah; 0.941 in Denham, Minnesota; 2.058 in Crescent Springs, Oklahoma. Antelope Hills, Wyoming and Whitney, Nebraska fill a 40-seat room from about 55 driven residents and stay near 0.3 at any weight. The weight is read at src/core2/modules/meetings.ts line 185 (traitWeightMeetingsTakePart, parameters.json line 6557).

**Fix.** None until the cause is found.

**Time box.** 5 hours for one Opus session.

**Rules.** Research before building: real data checks the simulation and never decides an outcome. No dice: temperament weighs beside each resident's circumstances; a room is filled by the drive, not a draw. Sliding scales: nothing flips at a threshold.

**Done when.** A second session plays at least eight places drawn from all 56 over their election windows in buildBenchWorld (seeds it chose, named) and sees the take-part thirds' net log odds reported beside the study's 1.088 for each, the cause of any outlier named by record id, and src/core2/modules/meetings.traits.test.ts passing on each seed.

**Waits on.** Nothing. (#6143 has merged and traits-meetings-take-part-measured is done.)

**Files.** src/core2/modules/meetings.ts, src/core2/modules/meetings.traits.test.ts, data/research/trait-effect-sizes.json, src/core2/data/parameters.json

**Notes.** Filed by the laws-and-effects lead, Oct 27, from the recheck of PR #6143 on its merged head. Read with meetings-town-hall-evening-cost, whose fix may narrow the spread. CI on 99fc0b1579 drew a town at 2.320 (job 121947722002); a helper is refitting the weight on #6143's branch (Oct 27). Measured Oct 27 on 20 fresh places (the meetings test's own draw; places, seeds and nets in PR #6143's body): at 0.32 the net runs 0.31 to 2.52 log odds; at 0.26 it runs 0.31 to 2.04. Antelope Hills, Wyoming (54 residents weighed) and Whitney, Nebraska (59) fill a room of 40 from about 55 residents driven, the same people at every town hall, and stay near 0.3 at any weight.

**Notes (Fable's check, Nov 10).** How to find the cause: in each of the six towns named, run src/core2/modules/meetings.traits.test.ts and print, for each contested room, its seats, the residents whose take-part drive (meetings.ts 185) was above zero, and each third's mean feeling before the trait weight is applied. A room that fills from fewer residents than about twice its seats points to room size against town size; thirds whose feeling is already at the top of its range point to saturated feeling; fewer than three contested rooms in the window points to too few rooms. Write which one holds in each town, with the room record ids, and only then write the Fix (refit the weight, or change the cause).

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have narrowed a take-part fit that spreads from 0.94 to 2.16; calibration spread no player sees, and the town-hall item keeps who fills the room.
