---
id: creator-hair-label
title: "The creator's hair style reads lowercase beside Slim and Button shirt"
area: people
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/creator-hair-label
pr: #6591
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T07:03:39.869Z
---

**What.** Merger W on #6426: the creator's Hair row shows the art's style name as written ('long straight') while Build and Clothes read capitalized ('Slim', 'Button shirt').

**Rules.** One naming rule for the creator's rows; no new player text.

**Done when.** creator.test.ts steps through every hair style for both sexes and finds each hair and face name capitalized (fails without the fix).

**Files.** src/bench/appearance.ts, src/bench/creator.test.ts

**Notes.** TODO
