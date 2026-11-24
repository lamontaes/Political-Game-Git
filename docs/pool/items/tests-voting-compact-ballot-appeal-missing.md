---
id: tests-voting-compact-ballot-appeal-missing
title: "Voting spec assumes every cast ballot retains appeal details"
area: elections
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/tests-m2-07-race-draw
pr: #6135
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T16:28:45.355Z
---

**What.** The M2-07 voting test crashes when it sorts b.appeal for a ballot that has no retained appeal object. Merger 3 reproduced Object.entries(undefined) at voting.test.ts:195 on clean main fdc9397b9f with seed 066fd6a83c0c24e9ec327985f635b05ff2a32d36, and at line198 on current-main integrated PR5979. Preserve the ballot reason check while following the actual compact ballot or retained reason contract; this differs from the already registered no-open-race draw problem.

**Rules.** One model, two tiers: named and counted voters follow the same choice rule and the test must inspect their actual retained representation. Never loosen a check: preserve positive ballot and reason assertions rather than skip every compact record.

**Done when.** The changed voting test passes on the named seed and a fresh place drawn from all56, naming place and seed. A played race verifies each cast ballot against actual available reasons or its compact decision record without assuming appeal exists, and assertions cannot pass over an empty set.

**Files.** src/core2/voting.test.ts, src/core2/modules/voting.ts

**Notes.** TODO

Merger 3, October26: confirmed the same Object.entries(undefined) on the current main tree with seed066fd6a83c0c24e9ec327985f635b05ff2a32d36. Handling in PR6135 on claude/tests-m2-07-race-draw: the fixture checks every named voter, so request the existing setKeepEveryonesWhy debug scope, restore its previous value in finally, and strengthen positive noncandidate-choice and appeal assertions. No ordinary-play retention or ballot-choice code is changed.
