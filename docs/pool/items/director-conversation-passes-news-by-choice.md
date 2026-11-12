---
id: director-conversation-passes-news-by-choice
title: "conversation.test 'passes news' reads the first choice, which tells no news in some places (Moscow, Tennessee; Galateo, Puerto Rico)"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-director-conversation-passes-news-by-choice
---

**What.** `src/director/conversation.test.ts` ('records talking as time together, and passes news the other hasn't heard') takes `talk.choices[0]` and then expects the other person to know fixture-story as 'told'. In Moscow, Tennessee (seed cvd4) and Galateo, Puerto Rico (seed cvd5) the first choice is an answer that tells no news, so `api.knows(...).access` is undefined. It fails the same on clean main.

**Cause.** Found in code: `src/director/conversation.test.ts` line 339, `say(core, talk, talk.choices[0]!.key)` in the test at line 326; the first choice is not always the one that tells the news. Measured: GOLDEN_PATH_SEED=cvd4 (Moscow, Tennessee) and cvd5 (Galateo, Puerto Rico).

**Fix.** Pick the choice that tells the news from the conversation's own tells data (`CONVERSATION_DATA`, `src/director/conversation.ts` line 177) instead of index 0, and keep the assertion that the news was told.

**Time box.** 2 hours for one Sonnet session.

**Rules.** One rule, all 56 places: pick the eligible choice from the conversation's own tells data, never by trying choices until one passes; keep the assertion that the news was told.

**Done when.** A second session runs `src/director/conversation.test.ts` with GOLDEN_PATH_SEED=cvd4, cvd5 and one fresh seed (place named) and it passes. With news passing disabled in a scratch copy the same test fails. In a drawn place it talks to a neighbor in the running game after a story reaches the player and sees the neighbor know the story afterward.

**Waits on.** Nothing.

**Files.** src/director/conversation.test.ts, src/director/conversation.ts

**Notes.** Found while fixing director-conversation-drawn-fixture-lacks-subjects.

Released (2026-11-11): Cause not reproducible on main 076daae15d: 'records talking as time together, and passes news the other hasn't heard' passes at GOLDEN_PATH_SEED=cvd4 (Moscow, Tennessee) and cvd5 (Galateo, Puerto Rico), whole file at cvd5 21/21. At cvd4 two other tests in src/director/conversation.test.ts fail instead: 'leaves a lie as a belief in everyone present, until someone who knows the truth tells them' (expected '2021-01-04' to be '2021-01-05') and 'the answers to a question fit it > never parts with a word the talk already said'; those are different defects and need their own items. Continue on branch claude/pool-director-conversation-passes-news-by-choice.

Released (2026-11-11): Cause differs on main 2026-11-11: src/director/conversation.test.ts 'passes news' passes at both named seeds, GOLDEN_PATH_SEED=cvd4 and cvd5 (1 passed each, rest skipped); no red to fix. Close or give a new repro. Continue on branch claude/pool-director-conversation-passes-news-by-choice.

Released (2026-11-11): Not reproduced on main (Nov 11): conversation.test.ts passes the 'passes news' case with GOLDEN_PATH_SEED=cvd4 and cvd5 (cvd5: 21 of 21; cvd4: that test passes but two other cases fail, 'leaves a lie as a belief...' expected 2021-01-04 to be 2021-01-05, and 'never parts with a word the talk already said' expected 0 to be greater than 0 -- not this item's test). Cause (choices[0] telling no news) appears already fixed or seed-dependent on a version of main that has since changed. Continue on branch claude/pool-director-conversation-passes-news-by-choice.
