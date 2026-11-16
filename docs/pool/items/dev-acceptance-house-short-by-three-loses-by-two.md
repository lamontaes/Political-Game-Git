---
id: dev-acceptance-house-short-by-three-loses-by-two
title: "dev-acceptance draws its place at run time, and at Edwardsburg, Michigan the House's short-by-three vote loses by two"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
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

**Cause.** Needs cause. Looked at: `DEV_MODE_SEED=edab0e3052fb6f15 npx vitest run src/bench/dev-acceptance.test.ts` fails at line 201 (expected 2 to be 3) on Train a62a2fdad884ccd1313d1e1436088fe05986d49b with and without #9646. A count at that seed found 435 House members in `dev.lawmakingBodies()`, so the miss is not an even member count. Not yet read: how `decideAt` in src/bench/dev-mode.ts fills the margin for a chamber where some members are missing from the roll or already hold a choice.

**Fix.** None until the cause is found.

**Time box.** 1 hour to find the cause, one Sonnet session at medium.

**Rules.** Every effect can be triggered and traced in dev mode: the margin dev mode is asked for is the margin the roll shows, or the card says why not. One rule, all 56 places: the test names its place and seed, so it never goes red by draw (pinned-tests).

**Done when.** At Edwardsburg, Michigan (seed edab0e3052fb6f15), dev mode's Hold the vote with margin -3 on a U.S. House bill ends with a floor count three short, or the result says which member's vote could not be set and why. The test names a fixed place and seed and passes three times in a row. A second session, in the running game at a place drawn from all 56, presses Hold the vote at a margin of three short on a U.S. House bill and sees the dev card's count three short.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/dev-acceptance.test.ts

**Notes.**

- A member who holds a choice row of their own, or who did not vote, could leave the margin one short. The free-member fill in `decideAt` is the place to look first.
