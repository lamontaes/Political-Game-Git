---
id: words-press-comment-in-the-story
title: "What a member tells a reporter about their bill, or that they declined, is in the paper's story of it"
area: words
kind: feature
priority: 2
size: S
status: claimed
claimed-by: lane3/press-comment-printed
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T02:54:52.505Z
---

**What.** The press-interview scene's endings keep story-runs, and no engine read them. The scene could also never be worded for an introduced bill: no narration fit, because the introduced fact and the outlet were never set. Path 7 asks for a reporter's story that quotes you or says you declined.

**Rules.** An effect is a read: the press keeps the comment, and the paper's story of the record reads it. No hand-written player text. One rule, all 56 places.

**Done when.** In two drawn places (buildBenchWorld), a resident council member drafts a bill, answers or refuses the reporter's press-interview scene, and the paper's story of office.introduced quotes them or says they declined, citing the scene reply's id; src/director/comment-printed.test.ts passes on a fresh seed.

**Files.** src/core2/modules/press.ts, src/bench/printed-words.ts, src/english/english-newscast.ts, src/director/purpose-scene.ts, data/english/parts/news.json

**Notes.** Built by Lane 3, Nov 4, branch lane3/press-comment-printed, head e1b30cc7. The vote half of scene-reporter-calls-on-a-vote still waits on a reporter calling about a vote.
