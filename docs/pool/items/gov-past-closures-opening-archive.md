---
id: gov-past-closures-opening-archive
title: "A new town's news archive holds the businesses that closed in the year before day one, each told and heard by its former owner"
area: gov
kind: feature
priority: 3
size: S
status: in-pr
claimed-by: claude/political-game-pool-yucp92-oo
pr: #5513
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-22T01:24:19.938Z
---

**What.** PR 5513 builds the opening's past closures (src/core2/past-business.ts): the state's yearly exit share sizes the year, capped by the owners who could have retired; each closure is a story in the town paper's archive (past-news.ts) and its former owner heard it the day it happened. The played-year acceptance of gov-past-closures-archive stays open.

**Rules.** No dice; one rule, all 56 places; the counted parents' deaths stay registered as SG-CORE-past-counted-parents-deaths.

**Done when.** past.test.ts, in places drawn from all 56 with bounded redraws that fail on exhaustion, finds at least one past closure dated before day one and checks its printed story and its former owner's heard record by id.

**Files.** src/core2/past-business.ts, src/core2/past-news.ts, src/core2/past.test.ts

**Notes.** TODO
