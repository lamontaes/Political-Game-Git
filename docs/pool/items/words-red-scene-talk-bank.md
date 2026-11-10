---
id: words-red-scene-talk-bank
title: "Fix the scene-talk bank's red English checks on main: five duplicate texts, undeclared slots, a banned word, today and tonight lines without their marks"
area: words
kind: bug
priority: 1
size: S
status: merged
claimed-by: story/red-scene-talk-bank
pr: #8113
blocked-on:
lead: words
source: tests/english-parts-banks.test.ts red on main for scene-talk.json on every seed (found Nov 10)
claimed-at: 2026-11-10T07:00:00.000Z
merged-at: 2026-11-10T05:33:27.079Z
---

**What.** Five scene-talk texts were duplicated and are merged into one piece with both uses; the slots `earlier`, `new-child`, `married`, `new-employer`, `spouse`, `honoree`, `absent`, `age` and `partner` are declared with what fills each, from the code that sets the fact; "piece" (a developer word) is reworded in three press-comment lines; two "today" lines require `same-day`; thirteen "tonight" lines exclude `daytime`.

**Done when.** tests/english-parts-banks.test.ts passes in full; the english guards, director.test.ts and families pass.

**Files.** data/english/parts/scene-talk.json, data/english/grade-map.json, data/english/grade-reach.json
