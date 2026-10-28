---
id: words-grade-control-on-scene
title: "A grade control on a scene: thumbs or one word writes a grade record that reaches the engine"
area: words
kind: feature
priority: 2
size: S
status: done
claimed-by: words/grade-control
pr: #6454
blocked-on:
lead: words
milestone: play-first
source: words-grades-calibrate-by-trait-and-register follow-up (owner, Oct 27)
claimed-at: 2026-10-28T00:19:59.006Z
---

**What.** The owner grades inside play, not in a laid-out batch (Oct 27). The reach of a grade now exists (`src/english/grade-reach.ts`); nothing in play writes one. Add a thumbs up or down and a one-word note on a scene line, written as a grade on the piece that said it.

**Rules.** Sliding scales and causes: a grade shifts a weight by a small amount and never bans a line or flips at a threshold. Serves `scene-standard` and `screen-to-mock`: the control is one shared part, not a new renderer. Lines reach the grade through the piece keys the talk lines already carry. Review: words.

**Done when.** In a played world from a drawn place (name the place and seed), grade one scene line with the control and show a grade record for that piece id written to `data/english/grades`, then run `apply-grades` and show the pieces whose weight moved in `docs/reports/grade-reach.md`, with a test that fails when the control writes nothing.

**Time box.** 2 hours. If not done, push what exists, open the draft PR and write the handoff.

**You will see.** A thumbs control and a one-word note beside the line a scene just said; the next scenes of that kind, by that kind of person, change with it.

**Screenshot.** A scene with the control beside a line, before and after tapping it.

**Files.** src/bench (the control on a scene), data/english/grades, scripts/dialogue-batch/apply-grades.ts

**Notes.** Lead: words. Split from `words-grades-calibrate-by-trait-and-register` (branch words/grade-reach). Needs `Review: words`.
