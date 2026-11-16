---
id: world-opening-no-player-where-everyone-lives-in-group-quarters
title: "A place whose every resident lives in group quarters cannot open a new game: the player pick finds no adult in a household and throws"
area: world
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9712
after:
blocked-on:
root: none
lead: world
model: sonnet
effort: medium
source: "world-opening thread, Nov 16, found gating the past-share pull request (past-votes-by-level.test.ts red by draw)"
---

**What.** At Evergreen Colony, South Dakota (4620208) a new world throws "No adult resident here." while it is being built, so no game opens there. `src/core2/past-votes-by-level.test.ts` goes red whenever its draw lands on such a place (seed 5bc53fe8652953407299bbc2d8b66138fa2925af, draw 1). Seen: the build stops before day one.

**Cause.** Measured: at Evergreen Colony, South Dakota (4620208), seed 1b1afef5af5375db5c742506eddc1b31176c17b23c2ecbf13454c4557ce44c16, by `buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey: "4620208" })` on Train 6d12556a with #9689 merged: 54 people are generated in the place, aged 16 to 86, and every one of them lives in a group-quarters household, so `townResidents` (src/bench/world.ts) returns none and `entrantChoice` throws. Found in code: `townResidents` keeps only people that `inHousehold` (src/core2/population.ts) passes, and `inHousehold` drops anyone whose household is `quarters`. The rule was the same before start-at-18 (the old pick threw "No resident here."), so the fault predates #9684.

**Fix.** Where the place has no adult in a household, the player is the adult whose quarters are the place's own (a colony, a dormitory, a barracks), picked by the same seeded unit among them in id order, and dev mode's "How this world opened" says the player lives in group quarters. Do not draw a household that does not exist. If a group-quarters player cannot run the opening (a home, a kitchen), the place is passed over by the place draw for a new game with its reason named, never silently.

**Time box.** 1 hour.

**Rules.** One rule, all 56 places: no place is named in logic. No dice: the pick is seeded generation of who the player is.

**Done when.** At Evergreen Colony, South Dakota (4620208), seed 1b1afef5…, a new world opens with a player 18 or older, or the place draw for a new game names the place as passed over with its reason; `past-votes-by-level.test.ts` passes at seed 5bc53fe8652953407299bbc2d8b66138fa2925af. A second session sees a new game open at a drawn place it names with its seed.

**Waits on.** Nothing.

**Files.** src/bench/world.ts, src/core2/population.ts.

- Nov 16, world-opening thread: built on branch claude/project-thread-7ooue6-newgame-passover. The draw passover-152 lands on Evergreen Colony, SD (4620208); the world opens in the same state's next place and dev mode names the place passed over. A failed build at such a place stops after 0.2 to 1.2 s; a full open takes 13 to 15 s.
