---
id: core-old-imports-opening-work
title: "The opening's work schedules come from the core, not the old work-schedules code"
area: core
kind: cleanup
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `src/core2/opening-work.ts` imports the old engine's `living-world/work-schedules` (714 lines) for the opening's canonical work schedules. Move the part the opening uses into the core, write it fresh where that is simpler, and delete the rest from the old file when nothing else reads it. The opening reads schedules by occupation, so the part it needs is small.

**Rules.** Replace, never layer: the old import is deleted when its replacement lands. Build only what the golden path needs. Same town by record id for a drawn place before and after. One rule, all 56 places: no place is named in code.

**Done when.** The grep for imports of the old engine in `src/core2/opening-work.ts` prints nothing, the typecheck passes, and a drawn-place opening builds the same work commitments by record id before and after.

**Files.** src/core2/opening-work.ts, src/simulation/living-world/work-schedules.ts

**Notes.** Split Oct 17 from core-old-imports-opening-builders. One of five parts; take it independently of the others.
