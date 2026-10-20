---
id: release-tripwire-audit-diagnostics-oct20
title: "The core2 tripwire audit reports 9,785 diagnostics on main (185 stopgap rows point to the wrong line, 126 stale rows, 33 rows with unsupported fields)"
area: core
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/tripwire-diagnostics
pr: #5594
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:43:23.614Z
---

**What.** Running auditCore2Tripwires over main on Oct 20 gives 9,785 diagnostics: numeric-literal 8,860, player-text-literal 236, stopgap-location-mismatch 185, stale-stopgap-entry 126, inline-content-registry 120, checkrange-shape 105, parameter-estimate-stopgap 52, stopgap-entry-fields 33 (resolved rows carrying resolution, resolvedAt or resolvedBy), and smaller ones. The release build refuses while any stopgap is open and the tripwire tests fail on an unregistered one, so these hide real drift. Fix the stopgap-bookkeeping classes first (location mismatch, stale, entry fields and status, unregistered markers), which are mechanical, then decide with the CTO which literal classes are meant to be gated.

**Rules.** Never close a stopgap row by deleting it. Replace, never layer: correct the row or the marker, not both a new row and the old. Report counts per code before and after.

**Done when.** auditCore2Tripwires over the repository reports zero diagnostics in the stopgap-location-mismatch, stale-stopgap-entry, stopgap-entry-fields, stopgap-entry-status, stopgap-entry-line and unregistered-source-marker classes, with the counts per class in the PR body and the tripwires test passing.

**Files.** src/core2/data/stopgaps.json, src/core2/tooling/tripwires.ts

**Notes.** Found Oct 20 (claude, session 016wegiN8JnX2MQwcojrnX87) while registering stopgaps for #5555 and #5557, whose own rows I checked against the audit and corrected.
