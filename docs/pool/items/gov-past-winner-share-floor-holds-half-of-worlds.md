---
id: gov-past-winner-share-floor-holds-half-of-worlds
title: "About half of all worlds open the President's approval at exactly 50.5%, because a past race's winner share is clamped to a fixed floor"
area: world
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9709
after:
blocked-on:
root: none
lead: elections
model: sonnet
effort: medium
source: "Account lead, Nov 16 08:43Z, on #9689's measured day-one approval: file an item for pastWinnerShareMin, addressed to whoever owns past-elections"
---

**What.** A past race the research records opens at its real two-party share, moved by the world's drift of up to 2 points (`pastRealShareDrift`, owner: "recognizable with drift"). The result is then clamped to `pastWinnerShareMin` (0.505), so a close real race lands on exactly 50.5% in every world whose drift goes below it. The President's race is one: the real 2024 national two-party share is 50.67%, so roughly 46% of worlds (drift below −0.0017 of a ±0.02 spread) open with the President's share, and since #9689 their day-one approval, at exactly 50.50%. The same holds for any recorded House or Senate race won with under 52.5%. Seen: day-one approval of 50.50% at Paradise, Montana (3056425) and Bethel Springs, Tennessee (4705380), and 51.48% at Shubert, Nebraska (3145225).

**Cause.** Measured: at Shubert, Nebraska (3145225), Paradise, Montana (3056425) and Bethel Springs, Tennessee (4705380), seeds age-3145225, age-3056425 and age-4705380, by building each world with `buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey })` on #9689's head dcedffea, running one day and reading `presidentElection(api)` and `latestApproval(api)`: 51.48, 50.50, 50.50. Found in code: `worldWinnerShare` in src/core2/offices-past-results.ts (before that branch, the same expression in src/core2/past-elections.ts `buildPriorElections`) takes `Math.max(pastWinnerShareMin, seededBetween(…, base - drift, base + drift))`. The corpus sum is in `realResult` (president branch): 1 − 0.4933 = 0.50667.

**Fix.** Bound the drift by the real margin instead of clamping to a constant. A drift that cannot flip the recorded winner is one whose half-width toward the loser is at most the winner's real lead over half (`base − 0.5`, less one whole vote), so draw inside `[max(base − drift, 0.5 + one vote), base + drift]` for a recorded race. The share then spreads evenly inside what the record allows, with no pile at one value. `pastWinnerShareMin` stays only for races with no record (the office average's band), where it is the rule that a winner holds more than half. Do it in `worldWinnerShare`, the one place both offices.ts and past-elections.ts read, so a holder's last share and the past race keep one number.

**Time box.** 1 hour.

**Rules.** No dice: seeded generation of who exists is allowed, and the drift is generation of the world's past, so no new draw site. Sliding scales: no clamp onto one value. One rule, all 56 places.

**Done when.** At the three places above, with the same seeds, the day-one approval and every recorded House and Senate holder's last share sits inside the real share's drift and above half, and over twenty seeds of one place, no two worlds open the President's approval at the same value. A second session sees in the running game, at a drawn place it names with its seed, that dev mode's "How this world opened" shows a day-one approval that is not 50.5% exactly, unless that world's drift put it there.

**Waits on.** Nothing. Builds on #9689 and the past-share pull request that adds src/core2/offices-past-results.ts (thread world-opening).

**Files.** src/core2/offices-past-results.ts (new), src/core2/data/past/parameters.json.

- Nov 16, world-opening thread: built on branch claude/project-thread-7ooue6-share-room. Day-one approval: Shubert 51.87, Paradise 51.17, Bethel Springs 50.14 (were 51.48, 50.50, 50.50); 20 seeds at Shubert (share-1 to share-20) give 20 different values.
