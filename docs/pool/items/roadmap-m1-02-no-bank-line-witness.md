---
id: roadmap-m1-02-no-bank-line-witness
title: "M1-02 command fails in Swanton with no bank line open at a rate change"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The registered M1-02 command exits one in independently drawn Swanton, Nebraska, because no town bank line exists during any policy rate change. All 46 national bands and five rate decisions pass, but the required town loan-cost witness is absent. Clean main 143df7a4fd and PR 5875 return identical output, so this is a main acceptance gap rather than a regression from the roadmap flags.

**Rules.** Wire to the world: preserve a positive generated-world rate-decision to town loan-cost read by record id; never skip the repricing assertion or accept zero witness rows. One rule, all 56 places: keep drawn places and report every attempted seed.

**Done when.** The registered M1-02 command obtains and verifies a positive loan repricing chain in an ordinary generated world, names the drawn place, seed, decision and facility records, retains the zero-line Swanton regression, and still fails when the rate reader is removed.

**Files.** src/core2/tooling/m1-02-check.ts, src/core2/modules/macro.ts, docs/roadmap/features.json

**Notes.** Found by Merger 3 on PR #5875. Seed f9afc43813e78125cca0f168c33cbd5ddf89e39bb1618c86fa21ce1cbe9ce361; place 3148060; 2025-01-20 start through two years; townBankLines 0, repricings 0. Same output on clean main and integrated PR.
