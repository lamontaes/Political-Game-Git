---
id: core-one-map-county-gaps
title: "Place towns the Census place-in-county files miss under their government's county"
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

**What.** The place map left 712 towns with no county because the Census place-in-county files miss them. The 2025 government listing says which county area a town's own government sits in; the map builder now uses it where the Census files are empty, which places 66 of them.

**Rules.** A gap is reported, never filled with a guess; this uses a sourced listing.

**Done when.** Gap report county-area count falls from 712 to 646; place-map tests and guards pass.

**Files.** src/core2/tooling/place-map-build.ts

**Notes.** TODO
