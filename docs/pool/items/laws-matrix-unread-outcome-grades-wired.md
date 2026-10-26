---
id: laws-matrix-unread-outcome-grades-wired
title: "Law matrix does not credit unread outcome ledger rows as completed wiring"
area: laws
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/matrix-unread-grades
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T18:57:26.362Z
---

**What.** The law-wiring matrix marks a built nonzero outcome link wired when a run contains fired monthly ledger rows, without checking whether a production engine reads that outcome factor. PR #6026 exposes the false positive: SNAP maximum receives a wired web cell from a food-insecurity ledger change while the committed unwired report and registered stopgap explicitly say no person, household or organization record changes. This can incorrectly certify a family whose acceptance forbids registered stopgaps. The fired-row shortcut already exists on main, so this checker repair is tracked separately from the returned family.

**Rules.** An effect is a read, not a record: a nonzero monthly ledger change does not complete an unread production link. The chain is the acceptance: complete outcome evidence identifies the owning engine and actual affected generated-world record. Registered stopgaps remain honest gaps until their production reader exists.

**Done when.** A targeted regression test using the committed SNAP maximum food-insecurity evidence grades the web cell partial or stopgap while its registered unread reason remains and no production reader exists. A genuine engine-carried outcome and a supported long-lag link with an existing reader still receive their correct grade. Rebuilding the law matrix no longer calls this unread SNAP outcome wired; the report names the missing reader without deleting its stopgap, weakening a guard, or requiring every empirical effect to appear before its research lag.

**Files.** scripts/law-wiring/matrix.ts, src/core2/data/outcome-web/unwired.json, docs/reports/law-wiring-matrix.json, docs/reports/law-wiring-table.md

**Notes.** Found by Merger 2 reviewing #6026 at348daf28e1bde98298068a130aee2adc64479ecb; matrix.ts561-574 is unchanged against main. Published source unwired.json611-614 and stopgaps.json6019-6023 say the factor is unread, while matrix2200-2201 grades its monthly rows wired. Separate from web-matrix-engine-source-evidence, which tracks another report writer. Return receipt6420457298.
