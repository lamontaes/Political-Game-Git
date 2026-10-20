---
id: core-stopgap-property-tax-rate-unreached
title: "SG-WORLD-property-tax-rate is never reached in a played world: the budgets engine registers the terms, so the fallback marker is dead"
area: core
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/political-game-pool-yucp92-bs
pr: #5717
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T14:33:16.819Z
---

**What.** In a played world the budgets engine registers the property-tax terms (registerPropertyTax in src/core2/modules/budgets.ts), so the state-average fallback in terms() in src/core2/housing-property-tax.ts, which carries the marker SG-WORLD-property-tax-rate, is never reached; a full year in Stockholm, Wisconsin (seed cdf70b9dd29604a1cce1188c1ac1cc9dc31e0e32f71aad929d27e63bce6fb994) did not hit it. Decide whether the row is dead or the fallback still serves a place, and resolve or delete accordingly.

**Rules.** Replace, never layer: delete a dead fallback and its row rather than keep both. Look before you register: read DECISION-REGISTER.md first.

**Done when.** A two-year run of the played world in three drawn places (seeds named) either hits the marker or the fallback and the stopgap row are removed, with the tripwire tests passing.

**Files.** src/core2/housing-property-tax.ts, src/core2/data/stopgaps.json, src/core2/modules/budgets.ts

**Notes.** Found Oct 20 while fixing the test on PR #5452 (core-stopgap-hits-miss-module-calls).
