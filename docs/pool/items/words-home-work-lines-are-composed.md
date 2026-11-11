---
id: words-home-work-lines-are-composed
title: "Talk about work names the employer, the job and how long, and every question has its answer on record"
area: words
kind: bug
priority: 1
size: M
status: merged
standard: 2
claimed-by: claude/words-w4-work
pr: #8767
after: words-opening-evening-talk-raises-what-the-president-said
blocked-on:
lead: words
model: opus
effort: medium
root: rc4-hand-written-words
source: owner, Nov 11, 2026 (docs/coordination/OWNER-DECISIONS.md, "Nov 11: every line goes through the English engine"); planned for Fable B from a read of main at 5ef67361
checked:
claimed-at:
branch: claude/words-w4-work
merged-at: 2026-11-11T13:57:42.997Z
---

**What.** Meeting people, the talk most often turns to work. The raise already names the employer ("I work at {employer}."), but the questions and answers around it are fixed: "What do you do?", "Have you been there long?", "Is it busy there?", "Let's not talk shop. Maybe another time." 23 of the 90 lines under the bank's four work subjects (`own-work`, `other-work`, `heard-work`, `shared-work`) have no insert, and some ask what no record answers ("Is it busy?"). Seen: a first meeting away from home, when either person names where they work, and the player's replies to it.

**Cause.** Found in code: in src/director/conversation.ts, `subjectsBetween` raises `own-work` with `employer` (from `jobOf`), `shared-work` with `employer` and `long-ago` (from `sharedHistory` in src/core2/shared-history.ts), and `their-work` and `their-tenure` with no facts. `replyFacts` fills the listener's side: `employer` and stage `working` or `none` for `their-work`, `years` from `tenureYears` for `their-tenure`, `still` or `left` for `shared-work`. `playerFacts` gives the player `my-employer`, `years` and `my-place`. The job's title (`job.title`, which `job-new-detail` already reads as `position`) and the employer's town (the organization's place) are on record and never passed for these subjects. No reader says how busy an employer is, so the `other-work` answers that ask it ("Good for you. Is it busy?") have no answer. The replies are mapped in src/director/data/conversation-rules.json (`replyKinds`, `follows`, `related`, `otherRaises`).

**Fix.**

1. **Use the opening's composer.** words-opening-evening-talk-raises-what-the-president-said makes `wordConversationMove` (src/english/conversation-words.ts) join pieces that carry a `piece` field with `composeGroundedLine`. Use that path; never a second one.
2. **The facts.** For `own-work`, `their-work` (in `replyFacts`) and the player's own (`playerFacts`), add `position` from the job record's `title` (with `withArticle`, as `job-new-detail` does) and `work-place` from the employer's place when it is not the speaker's own town, each citing the job and the organization. Keep `employer`, `years` and `since`.
3. **The parts.** Raise and reply (`own-work` `raise/tell`, `other-work` `reply/at`): a sentence whose required core names `{employer}` (already so) and whose optional reason names `{position}` or `{years}`, at least 8 cores and 8 reasons. The questions (`own-work` `ask/still-at`, `other-work` `answers/tenure`, `own-work` `answers/turn`): each a sentence whose core names `{employer}` ("Are you still at {employer}?", "How long have you been at {employer}?"), at least 8 wordings for each choice.
4. **The replies.** Up to four, each a different move, each naming `{employer}`, `{position}` or `{my-employer}`: say your own (`own`), ask how long (`tenure`), ask what they do there (`detail`, answered by `position`), and a brief take-in (`ack`, kept to one to three words or carrying `{employer}`). The `deflect` and `change` answers either name what they turn to (`{my-place}`) or are deleted. `rankChoices` keeps one per move; `expectUpToFourDifferent` (src/director/reply-set-check.ts) passes.
5. **Questions the records cannot answer are deleted:** every line that asks or says how busy an employer is, and "Do you like it there?" (no record holds it).
6. **What it writes back.** A true answer already tells the listener the speaker's employer through `say` (`data.toldEvent`, `person:<id>:employer`); add the position the same way under `person:<id>:position`, so the person card reads it. Name the record id in the pull request.
7. **Delete what this replaces, with every reference.** The 23 lines with no insert under the four work subjects; a piece that also serves another subject (43 do, mostly the shared `news-answer-react` and `own-work-answer-turn` parts) loses only these uses. Then `npm run words:grade` and `npm run words:rules` twice.
8. **Lower the guard's count** for `conversation` in tests/guards/english/line-inserts-baseline.json.
9. **Tests.** In src/director/conversation.test.ts, on drawn places: two people who work at different places name both employers and at least one position; a question about how long is answered with the years on record; no line asks how busy a place is; every reply set passes `expectUpToFourDifferent`. Run tests/guards/english and the bank tests yourself.

**Time box.** 5 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code. Estimate, never UNKNOWN: a fact no record holds is not asked about, rather than answered with a guess. No dice. One rule, all 56 places: the tests draw their places and nothing names one.

**Done when.** A second session, in the running game on main at 1440x900, starts three new lives in drawn places it writes down with their seeds, and meets someone new away from home in each. Each work talk names the person's employer and either their job or how long they have been there, and the player's replies are at most four different moves, each naming an employer or a job. It opens that person's card afterward and finds the employer on it. tests/guards/english passes with the lowered count.

**Waits on.** The CTO's ruling on whether the builder drafts the `data/english/parts` lines with `Review: words` or the Story session writes them (the same question as words-opening-evening-talk-raises-what-the-president-said; PR #8715).

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, src/director/reply-set-check.ts, src/director/conversation.test.ts, src/english/conversation-words.ts, src/core2/shared-history.ts, data/english/parts/conversation.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Planned by Fable B's Words planner (2026-11-11) from main at 5ef67361. 90 distinct lines across the four subjects, 23 with no insert and not excused (own-work 39 and 8, other-work 42 and 14, heard-work 21 and 3, shared-work 17 and 1). Three today: "What do you do?", "Have you been there long?", "Let's not talk shop. Maybe another time." Work is not talked about between relatives (`familyTalk.dropped`), so this is heard away from home.

- 2026-11-11, Words builder W4: built on claude/words-w4-work. In the conversation-test worlds nobody has a start-date record for their current job (`heldSinceRecord` finds none), so "how long" is offered only where the bench's played worlds have one; the test checks that an offered "how long" is answered with the years.
