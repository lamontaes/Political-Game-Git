---
id: roadmap-m1-flip-proven-one
title: "Roadmap M1-01 reads passes: true, with its run and bench screenshot"
area: core
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** PR #5875 now accepts only M1-01 (laws in force) after its M1-02 send-back. M1-01's command passed in the place the golden-path runner draws for it, and its test covers the whole spec text. Give that one flag its own item so merging the PR does not complete the two-flag parent, whose M1-02 half stays open until its loan-cost witness exists.

**Rules.** Wire to the world: the flag flips only on its command passing in a place drawn from all 56 and the spec played in the bench. Never edit a spec's test text; only passes changes. Keep M1-02 false.

**Done when.** docs/roadmap/features.json reads passes: true for M1-01 and false for M1-02; the PR body names the command's place and full seed, its passing output on the main-integrated result, and a committed bench screenshot of the spec played in that place; roadmap-m1-flip-proven-three stays open for M1-02.

**Files.** docs/roadmap/features.json, docs/reports/m0-m2-lead-2026-10-24/, docs/release/changes/

**Notes.** TODO
