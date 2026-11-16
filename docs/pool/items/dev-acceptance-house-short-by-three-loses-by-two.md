---
id: dev-acceptance-house-short-by-three-loses-by-two
title: "dev-acceptance draws its place at run time, and at Edwardsburg, Michigan the House's short-by-three vote loses by two"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: vote-reasons thread
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
source: vote-reasons thread, run of src/bench/dev-acceptance.test.ts beside other dev tests on Train a62a2fda, Nov 16; Account lead, Nov 16 03:55Z (a test that draws at run time cannot sit as a known red)
---

**What.** The test "Congress at a bare majority fails for want of the votes to end debate, and says so; at a wide margin the bill is law" in src/bench/dev-acceptance.test.ts fails with DEV_MODE_SEED edab0e3052fb6f15 (Edwardsburg, Michigan) on Train a62a2fda. It fails the same way with and without #9646. `dev.decideAt(bill, -3, { chairHears: true })` on a U.S. House minimum-wage bill ends `floor-lost`, but `no - yes` is 2, not 3 (test line 201). The House has 435 members at that seed, so the cause is not an even member count. The test draws its seed with `randomBytes` at run time (line 34), so it passes or fails with the draw.
Seen: the replay with DEV_MODE_SEED=edab0e3052fb6f15 on both dev-mode.ts versions, from the vote-reasons thread.

**Cause.** Found in code: `decideAt` in src/bench/dev-mode.ts sets yes to `Math.round((roster + margin) / 2)` and gives every other free member no, so a roster and margin of opposite parity can't be met and are rounded without a word. At this seed Jennifer Mitchell (official:seat:US-TX:us-house:23) died before 2025-03-01, so `members()` holds 434. round(431 / 2) is 216, which leaves the vote 216 to 218. The Senate of 100 rounds the same way for any odd margin.

**Fix.** When the count runs one over or one under the margin, one free member abstains (the last yes, or the first no). The returned tally names that member, the voting members and the seats the offices engine holds open (`seatsHeldOpen`, from its vacancy rows), and the dev card shows it ("434 voting members, one seat vacant"). Pin dev-acceptance.test.ts to this seed to keep the vacancy case.

**Time box.** 1 hour to find the cause, one Sonnet session at medium.

**Rules.** Every effect can be triggered and traced in dev mode: the margin dev mode is asked for is the margin the roll shows, or the card says why not. One rule, all 56 places: the test names its place and seed, so it never goes red by draw (pinned-tests).

**Done when.** At Edwardsburg, Michigan (seed edab0e3052fb6f15), dev mode's Hold the vote with margin -3 on a U.S. House bill ends with a floor count three short, or the result says which member's vote could not be set and why. The test names a fixed place and seed and passes three times in a row. A second session, in the running game at a place drawn from all 56, presses Hold the vote at a margin of three short on a U.S. House bill and sees the dev card's count three short.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/dev-acceptance.test.ts

**Notes.**

- A member who holds a choice row of their own, or who did not vote, could leave the margin one short. The free-member fill in `decideAt` is the place to look first.
