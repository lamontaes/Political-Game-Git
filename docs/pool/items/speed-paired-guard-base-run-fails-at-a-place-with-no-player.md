---
id: speed-paired-guard-base-run-fails-at-a-place-with-no-player
title: "The paired performance guard's base run fails at a drawn place where every adult lives in group quarters"
area: core
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: claude/speed-paired-place
pr:
after:
blocked-on:
lead: speed
model: sonnet
effort: low
root: rc5-full-detail-every-day
source: CTO, Nov 17, 19:46Z on #9747: paired-performance went red on the base before the head's code ran, at place 3062825 (Rimrock Colony, Montana)
---

**What.** The paired performance check draws one place from every locality for each head (`drawPlace(head, "M0-11")` in `scripts/core2-guard/paired.mjs`) and plays a month at it on the base revision and on the head revision. Where every adult in the drawn place lives in group quarters (a colony, a dormitory) there is nobody to play, and the base revision stops with an error, so the check is red for every pull request drawn there, whatever the pull request changes. Seen: a pull request's paired-performance job fails with "No adult resident in a household here: all 38 adults live in group quarters" before it measures anything.

**Cause.** Measured: at Rimrock Colony, Montana (key 3062825, seed aaaaaaaaaaaaaaaa, 2025-01-20), `buildBenchWorld` with `placeKey` set throws `NoPlayerHereError` (src/bench/world.ts); the passing-over rule from #9950 (`passOver`) applies where the place key is the golden-path runner's draw, named in `GOLDEN_PATH_PLACE_KEY`, and the paired script sets no such key and runs the base revision, which may not have the rule at all. Found in code: scripts/core2-guard/paired.mjs line 76 (`drawPlace`), line 115 (`--place-key`).

**Fix.** The paired script's own build (the head's) chooses the place once before measuring, with the draw named as a draw (`GOLDEN_PATH_PLACE_KEY`), so a place with nobody to play is passed over and the same state's next place is taken, as a new game does; base and head then measure at that place, and the receipt and the job summary name the place passed over.

**Time box.** 2 hours.

**Rules.** Speed: a change measured at the same place and seed on base and head; never loosen a limit to get green. One rule, all 56 places: nothing names a place in code; the test draws nothing and uses a stand-in build.

**Done when.** At the drawn place Rimrock Colony, Montana (key 3062825, seed any), `playablePlace` returns the same state's next place, Riverbend (key 3063042), and passes it as `passedOver` for the receipt; `scripts/core2-guard/paired.node-test.mjs` passes, including the test that fails on the old script (it imports `playablePlace`). A second session sees a pull request drawn at such a place measured and green in the paired job.

**Waits on.** Nothing.

**Files.** scripts/core2-guard/paired.mjs, scripts/core2-guard/paired.node-test.mjs

**Notes.** Filed by Speed, Nov 17, on the CTO's line (19:46Z). Related, not the same: `speed-paired-guard-draws-a-different-town-every-push` (which town is measured), `golden-path-drawn-key-with-no-player-throws` (the golden-path runner's draw).
