---
id: gov-world-races-governor-races-counted
title: "Governor races outside the player's state run on the counted engine and record their winners from each state's inauguration day"
area: gov
kind: feature
priority: 2
size: S
status: done
claimed-by: claude/world-governor-races
pr: #5969
blocked-on:
source: split from gov-world-races-run-no-governors by its merger send-back, Oct 24
claimed-at:
---

**What.** The world races module builds House, Senate, legislative and presidential races but no governor race, so no governor outside the player's state is ever elected. This bounded part runs those races and records each winner; seating the winner as the state's governor in the officials roster, and an executive engine reading them, stay with gov-world-races-run-no-governors.

**Rules.** One rule, all 56 places: each state's governor race comes from its own election calendar in data and runs on the same counted engine as a Senate race. A territory with no counted electorate or recorded governor party is a registered stopgap, never an invented result. The winner record must not be called a serving term.

**Done when.** The M2-10 command (src/bench/m2-10-check.ts), in Fort Myers Beach, Florida (place key 1224150, seed 40d19d5aa53ea43b2f08600258d255a8e64dc3307f48afd84d58bbfc387c5051) and a second place drawn from all 56, shows every governor race outside the town's state that its calendar holds in November 2026 run, counted in places with reasons, and its winner recorded in the world races' seats from the state's inauguration day, by record id in the PR body; the officials roster's governor is left unchanged and the gap stays a registered stopgap.

**Files.** src/core2/modules/world-races.ts, src/bench/m2-10-check.ts, src/core2/offices-state.ts

**Notes.** Split Oct 24, 2026 from gov-world-races-run-no-governors at Merger 1's send-back of lamontaes/Political-Game-Git#5969, which offered this split. The serving governor and its executive reader remain that item's acceptance.
