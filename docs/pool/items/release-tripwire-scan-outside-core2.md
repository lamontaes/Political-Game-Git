---
id: release-tripwire-scan-outside-core2
title: "The tripwire audit scans only src/core2, so stopgap markers in the bench and the desktop shell are never checked"
area: release
kind: cleanup
priority: 3
size: S
status: done
claimed-by: claude/tripwire-scan-outside
pr: #5598
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:49:58.096Z
---

**What.** auditCore2Tripwires reads TypeScript under src/core2 and JSON under src/core2/data only. Six registered stopgaps name files outside it (SG-PLAY-act-control-names, SG-LOC-residence-rooms, SG-PEOPLE-one-look-per-activity, SG-PLAY-dev-law-reach-full-only, SG-PLAY-desktop-update-dialog-text, SG-PLAY-creator-age-keeps-past), so a marker moved or removed there raises no diagnostic. PR 5594 stopped reporting them stale for that reason. Decide with the CTO whether the scan widens to src/bench and the desktop shell, then widen it and relocate any row that then mismatches.

**Rules.** Replace, never layer: widen the one scanner, no second one. Report counts per code before and after.

**Done when.** auditCore2Tripwires reads the files the six rows name, reports zero stopgap-location-mismatch and stale-stopgap-entry for them, and a test in src/core2/tooling/tripwires.test.ts places a marker in a src/bench fixture file and finds it.

**Files.** src/core2/tooling/tripwires.ts, src/core2/tooling/tripwires.test.ts, src/core2/data/stopgaps.json

**Notes.** TODO
