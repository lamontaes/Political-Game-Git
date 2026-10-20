---
id: release-guam-payment-proof-note
title: "Correct the Guam tax regression declaration after removing skipped payment cases"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/guam-note
pr: #5758
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T22:41:42.040Z
---

**What.** PR #5684 merged with separate tax and payment fixtures, but docs/release/changes/laws-graduated-tax-repeal-guam.md still says Medicaid and preschool payment tests say they were skipped. That declaration contradicts the merged non-skipped fixture tests. Correct the test-only declaration to describe the pinned tax case and separate payment draws.

**Rules.** Claims must match the checked diff. Preserve the non-skipped payment assertions and the pinned Guam regression; this is a release metadata correction, not permission to weaken tests.

**Done when.** The declaration accurately describes the pinned Guam tax fixture and the separate non-skipped Medicaid and preschool payment draws; compare its claims with src/core2/law-reach-group-b.test.ts and pass formatting and release checks on the changed declaration.

**Files.** docs/release/changes/laws-graduated-tax-repeal-guam.md

**Notes.** Found on main during merger review after another merger landed PR #5684 at 10147057e0422da8fb4a8b930f6aed4d9f0bfcbf. The stale sentence says the Medicaid and preschool payment tests then say they were skipped. The merged tests instead use separate required-payee fixtures.
