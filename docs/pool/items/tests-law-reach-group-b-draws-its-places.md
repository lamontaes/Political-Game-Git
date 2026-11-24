---
id: tests-law-reach-group-b-draws-its-places
title: "law-reach-group-b.test.ts draws its place and seed on every run, so a red may be a bad draw"
area: core
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: 9387
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
source: "Account lead, Nov 15 01:31Z, after the group B reds on the train at 07919bd2"
claimed-at:
checked:
---

**What.** `src/core2/law-reach-group-b.test.ts` took its seed from the clock and its places from a hash of that seed, redrawing up to forty times until a place held what a case reads. A red could therefore be a bad draw, not a defect. Pin every case to a named place and a fixed seed and keep every assertion. Guards: the group B law-reach proofs, so a red there is a defect and never a draw.

**Cause.** Found in code: in src/core2/law-reach-group-b.test.ts, `let seed = process.env.GOLDEN_PATH_SEED ?? sha256("reach-b:" + Date.now())`, a `pick()` of state and place per attempt, and `build({ pinned, need })` looping `attempt < 40` with `continue` when a need was missing; the `pinned: true` cases read `GOLDEN_PATH_PLACE_KEY` or drew. Measured: pinned at seed 0123, 32 of 32 cases pass in 41 s on top of #9380.

**Fix.** Design: `build({ placeKey, need })` builds once at the named place and throws, naming what the place lacks, when a need is missing; it never redraws and never skips. Places found once by looking at built worlds: Acalanes Ridge CA 0600135 (school job, private school, paycheck, highway line, welfare household), South Fork Estates TX 4868966 (Medicaid), Abanda AL 0100100 (preschool child), and the Guam case keeps its own seed.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes and say so in a one-line note.

**Rules.** Pinned tests (named place, fixed seed, no draw loops). Never loosen an assertion.

**Done when.** A second session, on main, runs the file twice at a place and seed it did not choose (any of the 56 places, e.g. Abanda, Alabama, seed 0123, which the file names) and sees the same 32 cases pass at the same places and seed both times, and finds no `Date.now`, `GOLDEN_PATH_SEED` or draw in the file.

**Waits on.** #9380 (a world without the economy has no tier); without it seven cases here fail with "Module has no registered state".

**Files.** src/core2/law-reach-group-b.test.ts

**Notes.** Filed by F5 at the Account lead's order.
