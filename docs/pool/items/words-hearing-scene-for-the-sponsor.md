---
id: words-hearing-scene-for-the-sponsor
title: "A public-comment hearing scene is staged for the bill's sponsor, who did not speak"
area: words
kind: bug
priority: 2
size: S
status: claimed
claimed-by: words/hearing-scene-sponsor
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T09:33:15.494Z
---

**What.** src/director/hearing-scenes.test.ts fails on main on Dalton, Pennsylvania, seed 845b0e010bcbe17391d9cd5565012d261f2ba937:1. The watched person person_1fe1ba7f240abcbb has a public-hearing scene staged from the record public-comment:bill:office:gus2025:191328:board:2025-12-16:person_1fe1ba7f240abcbb:63. That record lists six other residents as its speakers; person_1fe1ba7f240abcbb is in the bill's own id, so they are most likely its sponsor. The director should stage a public-comment hearing scene only for the people the comment record names as speakers, and reach the sponsor through a scene of their own if one fits.

**Rules.** Ask why: the scene's cast must follow from the cause record, so a person the public-comment record does not name never stands in the speaker's scene. One rule, all 56 places: the fix holds for every drawn place, not only this seed.

**Done when.** hearing-scenes.test.ts passes on Dalton, Pennsylvania, seed 845b0e010bcbe17391d9cd5565012d261f2ba937 and on a seed nobody chose; in that played world (buildBenchWorld) every public-hearing scene's watched person is in its public-comment record, named by record id.

**Files.** src/director/scheduling.ts, src/director/data/situation-types.json, src/director/hearing-scenes.test.ts

**Notes.** TODO
