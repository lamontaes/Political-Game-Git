---
id: law-levels-authority-null-build
title: "Repair the nullable state-law return blocking the main build"
area: laws
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: astra/authority-null-build
pr: #7336
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-07T23:21:04.723Z
---

**What.** The main Mac build reports TS2322 at policy-authority.ts:54 after #7325: stateLaw promises LawRowInput or undefined but a level row can be null. The merge desk requested this separate repair in #7335.

**Rules.** Normalize the absent row to undefined in the existing reader. No authority behavior changes, test exclusions or guard changes.

**Done when.** stateLaw returns its declared optional type, and a new game opens and runs four weeks. The checker verifies the formerly failing typecheck on the exact PR head.

**Files.** src/core2/policy-authority.ts

**Notes.** Astra, Nov 7. Red main takes priority over the claimed opening-income-tax regression. Existing release-main-red item is an unrelated completed declaration incident. Source: #7335 comment linking #7325 issuecomment-6713525540. No helpers.
