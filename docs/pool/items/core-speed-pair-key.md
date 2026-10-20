---
id: core-speed-pair-key
title: "A pair of ids is joined into one key without building and sorting an array each time"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5413
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** An allocation profile of a played year in Discovery Harbor, Hawaii (seed m7a) charges the sort calls in modules/people.ts 120 MB, mostly [a, b].sort().join(':') building a relationship key for every candidate pair every day, and the same pattern sits in state.ts, free-block.ts and others. A pair key is the smaller id, a colon, the larger id; comparing two strings does that with no array.

**Rules.** Speed: no change may make a year more than 20 percent slower, measured before and after on the same machine one process at a time; Replace, never layer: every two-element sort-and-join in the engine is replaced by the one helper.

**Done when.** Seed m7a timed three runs each on a branch and on main, in the PR body, with the relationship tests passing; the helper returns the same key as the old expression for every pair.

**Files.** src/core2/kernel/pair-key.ts, src/core2/modules/people.ts, src/core2/state.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5413 (branch claude/speed-pair-key): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5413 (branch claude/speed-pair-key): Merging current origin/main conflicts in src/core2/modules/views.ts. Resolve that code conflict using one shared pair-key implementation and preserving the current stance behavior, then rerun the changed-file gate. Keep the key-equivalence proof and measured timing caveat; this return is for the unresolved merged code, not for the inconclusive speed gain.; finish on that branch, merge main into it first.
