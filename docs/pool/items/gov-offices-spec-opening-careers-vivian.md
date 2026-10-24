---
id: gov-offices-spec-opening-careers-vivian
title: "Offices spec M2-01 fails in Vivian, West Virginia: a township board seat's careers check reads 20 where it needs 21"
area: gov
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/offices-careers-vivian
pr: #5910
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T06:15:29.583Z
---

**What.** The accepted golden-path spec M2-01 (src/core2/offices.test.ts, case 'holders at the opening have careers of real length: terms begin before it and earlier terms are on the record') fails on clean main c510ec9a64 in Vivian, West Virginia (place key 5483764, GOLDEN_PATH_SEED=05f4a8c63e8b0520ec69de73d1c20fbc3ef1e68467d575e4dcc25c89059bf98e) with 'seat:gus2025:176938:board:0: expected 20 to be greater than or equal to 21'. It turned the golden-path run red on PR 5887, whose head drew this place for M2-01. The earlier Rillito, Arizona failure of the same case was fixed by PR 5696; this one is a board seat of a local government recorded as gus2025:176938.

**Rules.** Never narrow or skip a test: the careers check stays. One rule, all 56 places: whatever makes this seat's record short must be fixed for every place, not this one. Wire to the world: name the seat, its holder and the terms on record.

**Done when.** With GOLDEN_PATH_SEED=05f4a8c63e8b0520ec69de73d1c20fbc3ef1e68467d575e4dcc25c89059bf98e and GOLDEN_PATH_PLACE_KEY=5483764, npx vitest run src/core2/offices.test.ts passes, and a drawn place passes too. The PR body names the seat, its holder, what the two numbers in the check measure, and why this seat's record fell one short; the fix fails the test when undone.

**Files.** src/core2/offices.test.ts, src/core2/modules/offices.ts

**Notes.** Found Oct 24 from PR 5887's golden-path run (job 120783805976); reproduced identically on clean main.
