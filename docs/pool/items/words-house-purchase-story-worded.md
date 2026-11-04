---
id: words-house-purchase-story-worded
title: "The paper words a house purchase it prints"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/bench/printed-words.test.ts ('words every story the press prints in a year') fails on main at GOLDEN_PATH_SEED=8d34c386acfb392ec95fae606581c868e19fac50, Maple Grove, Michigan: 27 printed stories of kind event:housing.purchase (officials' households buying homes, e.g. event:housing.purchase:household:official:cabinet:US:education:0:2025-02-06) have no wording in the news banks.

**Rules.** No hand-written player text in code: words come from the banks. Every printed story is worded or not printed (press-topics).

**Done when.** printed-words.test.ts passes at that seed and a fresh seed; each housing.purchase story the press prints is worded from data/english, or press-topics keeps it off the wire with the reason in the PR body.

**Files.** data/english/parts/news.json, data/english/parts/headlines.json, src/core2/modules/press-topics.ts

**Notes.** Filed by Lane 3 (Nov 4); red on main independent of lane 3's branches (checked with the change stashed).
