---
id: release-laws-work-order-declaration
title: "Declare the laws work-order documentation change so main releases again"
area: release
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Release run 40371694575 fails exact incoming-range declaration enforcement for docs/work-orders/lead-laws-effects-2026-10-26.md. The work order was written directly to main without its declaration. Add an explicit none-impact declaration for this documentation-only change.

**Rules.** Red main comes first: preserve exact-range declaration enforcement, do not exempt work orders, and never skip client validation or merge this repair as its author.

**Done when.** The exact failed range a6925bc62555eb31b1b913c2c272bdf6c8f6249b..6c4acf01fcd01d3deb664b2952bf817652d41cdd fails locally with the named work-order path. The repaired range including its explicit none-impact declaration passes locally, the changed-file gate is recorded, and another merger merges the pinned repair head. No on-screen change is intended.

**Files.** docs/release/changes/release-laws-work-order-declaration.md

**Notes.** TODO
