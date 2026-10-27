---
id: play-scene-talk-opens-with-unrelated-news
title: "A scene's talk opens with an unrelated news remark before the person's own news ('I read in WKFA-TV about juvenile justice.' then 'Can we talk?')"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Brockton, Massachusetts (2509000), bench seed 9e114f4e6e2f8f29, the household's eviction scene on September 4, 2025 opens its talk with the mother saying 'I read in WKFA-TV about juvenile justice.', then 'Can we talk?' and 'We have to be out of the house.'. The bench's talk view (talkView, src/bench/handler.ts) puts what the other person brings up (bringItUp) after the greeting lines; a household's hard news opens with 'Can we talk?' instead of a greeting, so the unrelated remark comes first. A scene's talk keeps to its occasion (src/director/conversation.ts, openConversation), so a talk a scene opens should not add an unrelated remark.

**Rules.** LAW.md §4, Scenes and conversations: a scene's talk is about the scene's moment. No hand-written player text. Applies to every scene talk, in all 56 places.

**Done when.** In a drawn place (seed named), the first scene talk the player opens from a story stop starts with the scene's own opener or greeting and carries no line the other person brings up from unrelated news; before and after screenshots at 1440x900 in the PR body.

**Files.** src/bench/handler.ts

**Notes.** TODO
