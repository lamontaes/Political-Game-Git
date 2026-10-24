---
id: roadmap-m0-flip-proven-four
title: "Mark the four proven M0 specs accepted without closing the scored-explanation gap"
area: play
kind: feature
priority: 2
size: S
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-m0-flags
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T13:57:45.632Z
---

**What.** PR #5869 now accepts only M0-01, M0-02, M0-03 and M0-06 after its M0-04 send-back. Give those four completed flags their own item so merging the PR does not complete the five-flag parent. The scored-explanation requirement stays open in roadmap-m0-flip-proven-five and play-m0-04-why-scores-all-sampled.

**Rules.** Keep each roadmap feature test text unchanged. Flip only the four named flags after their commands and committed native screenshots substantiate the drawn-place behavior. Keep M0-04 false and its unmet scored-explanation acceptance open.

**Done when.** docs/roadmap/features.json reads passes true for M0-01, M0-02, M0-03 and M0-06 and false for M0-04; the PR body names each command, drawn place, full seed, passing output and committed bench screenshot. The three m0-check commands and m0-life-at-18 test pass on the main-integrated result, and the broader five-flag item and scored-explanation follow-up remain open.

**Files.** docs/roadmap/features.json, docs/reports/m0-m2-lead-2026-10-24/, docs/release/changes/roadmap-m0-flip-proven-five.md

**Notes.** TODO
