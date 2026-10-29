---
id: play-workplace-staff-read-once
title: "Who works at a place is read once for scenes and the town's places, not twice"
area: play
kind: cleanup
priority: 2
size: S
status: in-pr
claimed-by: claude/dup-who-works-here
pr: #6484
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T02:23:48.641Z
---

**What.** The scene picker (presentIds, for coworkers at a shift) and the town's places (staffOf, for who is there and a visit) each built the staff of an organization from the open full jobs and the counted residents' jobs. Two readers of one fact that can drift (duplicates report row M3). The opening's own employer list is the third and goes with director-opening-as-a-scene.

**Rules.** One source per fact (owner, Oct 27) and one model, two tiers: one staffOf in src/bench/scene.ts reads the full and counted workers by the same rule for both screens, and the copy in places.ts is deleted with no wrapper.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56, 150 workers' scenes, the player's town places and ten visits are identical on main and on this branch on day one and a year on by fingerprint, with the same number of people filled in, and grep finds one staffOf in src/bench.

**Files.** src/bench/scene.ts, src/bench/places.ts

**Notes.** TODO
