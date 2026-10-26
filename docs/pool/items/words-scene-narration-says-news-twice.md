---
id: words-scene-narration-says-news-twice
title: "A scene's narration says who came and why twice: 'Your mother has news for you. Your mother has something to tell you.'"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: words/scene-narration-news-twice
pr: #6129
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T01:53:40.852Z
---

**What.** In Brockton, Massachusetts (2509000), bench seed 9e114f4e6e2f8f29 (place seed 9922a3cd196023921842984f27fbaad8fe75cbc0e063e3fd411e95bdd3e0891e), the player's first director scene, on Thursday, September 4, 2025, is the household's eviction (moment person_886a0549b32087e5:2025-09-04:event:housing.eviction:eviction:lease:household_dc2f09eb48a80b82:2025-05-06). Its narration reads 'It's a Thursday in September. You're at home in Brockton. Your mother has news for you. Your mother has something to tell you.' The scene's lead sentence (lead-news-arrives-other) already says who came and why, and the opening sentence (opening-tell-tell) says the same of the same person (composeScene, src/director/scene.ts). The player reads the same news announced twice before anyone speaks.

**Rules.** Words engine: the director picks moves, the English engine says them; one sentence per thing the records say. Wire to the world: the rule applies to every scene type whose lead names the person who opens it, in all 56 places, not only the eviction.

**Done when.** In a drawn place (seed named), a scene whose lead names the person who opens it has one sentence saying who came and why, not two; a test over a played world's scenes fails on main when a narration names the opener in both its lead and its opening.

**Files.** src/director/scene.ts, src/director/scene.test.ts

**Notes.** TODO
