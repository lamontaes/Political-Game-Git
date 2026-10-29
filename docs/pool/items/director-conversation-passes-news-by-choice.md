---
id: director-conversation-passes-news-by-choice
title: "conversation.test 'passes news' reads the first choice, which tells no news in some places (Moscow, Tennessee; Galateo, Puerto Rico)"
area: director
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/conversation.test.ts 'records talking as time together, and passes news the other hasn't heard' says talk.choices[0] and then expects the other to know fixture-story as 'told'. In Moscow, Tennessee (seed cvd4) and Galateo, Puerto Rico (seed cvd5) the first choice is an answer that tells no news, so api.knows(...).access is undefined. It fails the same on clean main.

**Rules.** One rule, all 56 places: pick the eligible choice from the conversation's own tells data, never by trying choices until one passes; keep the assertion that the news was told.

**Done when.** The test passes with GOLDEN_PATH_SEED=cvd4, cvd5 and one fresh seed named in the PR, choosing the choice that tells the news from CONVERSATION_DATA, and fails when news passing is disabled.

**Files.** src/director/conversation.test.ts

**Notes.** Found while fixing director-conversation-drawn-fixture-lacks-subjects.
