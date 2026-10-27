---
id: traits-meetings-take-part-spread-across-towns
title: "Taking part at a meeting fits the study across five towns but spreads from 0.94 to 2.16 log odds on fresh draws"
area: people
lead: laws-effects
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: laws-and-effects lead, Oct 27 (recheck of #6143)
---

**What.** The take-part weight (0.32) was fitted on five towns' kept meeting pools, whose thirds' log odds run 0.91 to 1.29 against Mondak et al.'s 1.088. On PR #6143's merged head (99fc0b1579) three fresh draws of src/core2/modules/meetings.traits.test.ts read 2.158 in Fair Oaks, Oregon, 1.167 in Brian Head, Utah and 0.941 in Denham, Minnesota; Crescent Springs, Oklahoma read 2.058 earlier. The PR's notes give the likely cause: a fifth to a third of residents feel as strongly as anyone can about a question, and among them temperament alone sets who fills the room. Find whether the spread comes from that saturation of feeling, from room size against town size, or from too few contested rooms, and fit the weight or the cause across more towns.

**Rules.** Research before building: real data checks the simulation and never decides an outcome. No dice: temperament weighs beside each resident's circumstances; a room is filled by the drive, not a draw. Sliding scales: nothing flips at a threshold.

**Done when.** In at least eight places drawn from all 56 with seeds the builder did not choose, each played over its election window in buildBenchWorld, the take-part thirds' net log odds fall within a factor of 1.5 of the study's odds in at least six, the cause of any outlier is named by record id in the PR body, and the meetings trait test passes on each seed.

**Time box.** 3 hours, one Sonnet researcher; after #6143 merges.

**Files.** src/core2/modules/meetings.ts, src/core2/modules/meetings.traits.test.ts, data/research/trait-effect-sizes.json, src/core2/data/parameters.json

**Notes.** Filed by the laws-and-effects lead, Oct 27, from the recheck of PR #6143 on its merged head. Read with meetings-town-hall-evening-cost, whose fix may narrow the spread. CI on 99fc0b1579 drew a town at 2.320 (job 121947722002); a helper is refitting the weight on #6143's branch (Oct 27). Measured Oct 27 on 20 fresh places (the meetings test's own draw; places, seeds and nets in PR #6143's body): at 0.32 the net runs 0.31 to 2.52 log odds; at 0.26 it runs 0.31 to 2.04. Antelope Hills, Wyoming (54 residents weighed) and Whitney, Nebraska (59) fill a room of 40 from about 55 residents driven, the same people at every town hall, and stay near 0.3 at any weight.
