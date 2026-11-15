---
id: director-arc-variant-played-year-test-draws-an-unlogged-seed
title: "The arc-variant played-year test draws a random seed and a gate run that fails cannot be replayed"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: sonnet
effort: medium
root: none
source: the gate run for PR 9394 on Nov 14, 2026 (a bribe-offer case failed once and passed on two reruns)
checked:
claimed-at:
---

**What.** In src/director/arc-variant.test.ts the describe "variants in a played year" builds a world from `seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex")` (line 38), so each run draws a new place and a new seed. The case "gives different causes in one season different variants" (offers a bribe to three residents, then composes each bribe-offer scene) failed once on a drawn seed with the scene not composing (line 457, `result?.kind` expected "composed"), and the gate output kept only the last twelve lines, so neither the place nor the seed was recorded. Two reruns passed. A test that fails by draw and cannot be replayed is the fault. Seen: the test runs the same named place and seed every time and fails the same way when the record it needs is missing.

**Cause.** Found in code: src/director/arc-variant.test.ts line 38 draws the seed with `randomBytes`, and `drawPlace(`${seed}:0`, "arc-variant")` (line 387) then draws the place from it; no place or seed is pinned in the file.

**Fix.** Pin one named place and one fixed seed in the file, chosen once with the drawn-place-tests skill's search so that three residents can be offered bribes (the case needs residents with money and a living cost); keep `GOLDEN_PATH_SEED` as an override for a replay; put the place name and seed in the failure message (already in `where`). Do not loosen any assertion.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Tests are pinned to named places and fixed seeds (pinned-tests skill); a rare event is staged through the game's own path, never waited for; never loosen or re-pin without the old premise stated and the lead's yes. One rule, all 56 places: the pinned place is a draw made once and named, never a state typed into logic.

**Done when.** A second session runs src/director/arc-variant.test.ts five times in a row on main and gets the same place and seed in each run's output, passing each time; it also runs it with `GOLDEN_PATH_SEED` set to another seed and sees that place named in the output.

**Waits on.** Nothing.

**Files.** src/director/arc-variant.test.ts
