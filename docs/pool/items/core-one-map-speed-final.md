---
id: core-one-map-speed-final
title: "Record where the slower year came from"
area: core
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A bisect of year 1 puts the jump from about 45 s to about 117 s at State Sessions' #7290, not at the place map.

**Rules.** One run, one number. No dice.

**Done when.** The speed report names the commit where the year slowed

**Files.** docs/reports/place-map-speed-2026-11-05.md

**Notes.** TODO
