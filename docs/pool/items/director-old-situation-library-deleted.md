---
id: director-old-situation-library-deleted
title: "The old core's situation-type library and move list, which no code loads, are deleted beside the director's"
area: director
kind: cleanup
priority: 2
size: S
status: done
claimed-by: claude/dup-old-situation-library
pr: #6463
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T00:48:13.539Z
---

**What.** data/content/situation-types.json (32 types) and data/content/story-moves.json are the old story director's library. The director's own src/director/data/situation-types.json (79 types) was ported from it and every scene reads that one; the moves live in scripts/english-corpus/moves.json. No file in src, scripts or tests loads the old pair, only three design documents name it (duplicates report row W14).

**Rules.** Replace, never layer: the ported library replaced the old one, so the old files go in the same change and the design documents point at the kept files instead of the deleted ones.

**Done when.** grep finds no code reference to data/content/situation-types.json or data/content/story-moves.json, both files are gone, the director's scene tests (director.test.ts, scene-talk.test.ts) pass, and the scene path in a played world (buildBenchWorld) reads only src/director/data/situation-types.json.

**Files.** data/content/situation-types.json, data/content/story-moves.json, docs/design/story-director.md, docs/design/director-on-core2.md

**Notes.** TODO
