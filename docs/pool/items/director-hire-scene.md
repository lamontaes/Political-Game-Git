---
id: director-hire-scene
title: "A hire opens a scene at work with the employer who decided it, as a layoff does, so the leaver-refill chain ends in the director's line"
area: director
kind: feature
priority: 3
size: M
status: claimed
claimed-by: claude/director-hire-scene
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:25:16.081Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Checked Oct 20 (claude/political-game-pool-3xfqef-12), on reading `ledger.ts` and `data/english/parts/scene-words.json`: this item duplicates what exists. A hire already reaches the director as a `job-started` change (the household's pay changing, `ledger.ts` around line 926) and has worded scenes `lead-first-day-alone` and `lead-first-day-other`. It reaches only people the director watches (the player and their household and circle), which is the two-tier rule: everyone else gets no scene until they are filled in. So the chain test for a leaver's replacement cannot assert a director line for an arbitrary hire; a test that the player's own hire opens the first-day scene belongs to the player-offers test (`jobs-player-offers.test.ts`). The CTO can close this item as dropped.
