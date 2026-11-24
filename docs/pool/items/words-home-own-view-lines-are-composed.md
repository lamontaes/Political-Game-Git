---
id: words-home-own-view-lines-are-composed
title: "When someone says where they stand, they name the question they care most about and why, from their own life"
area: words
kind: bug
priority: 1
size: M
status: merged
standard: 2
claimed-by: claude/words-w3-own-view
pr: #8822
after: words-opening-evening-talk-raises-what-the-president-said
blocked-on:
lead: words
model: opus
effort: medium
root: rc4-hand-written-words
source: owner, Nov 11, 2026 (docs/coordination/OWNER-DECISIONS.md, "Nov 11: every line goes through the English engine"); planned for Fable B from a read of main at 5ef67361
checked:
claimed-at: 2026-11-11
branch: claude/words-w3-own-view
merged-at: 2026-11-11T18:59:32.982Z
---

**What.** A person who follows politics tells the player where they stand. Today they say one of 18 labels as whole sentences ("I should tell you, I lean conservative.", "I'm about as liberal as they come.", "Politics? I keep out of it."), and the player answers with one of 8 fixed replies ("I see it the same way."). 25 of the 26 lines under the bank's `own-view` subject have no insert. Nobody names a question, so a farmer and a teacher with the same lean say the same thing. Seen: the talk box when someone the player knows says where they stand, and the player's replies; then the person card's line for where they stand.

**Cause.** Found in code: `viewSubjectOf` in src/director/view-learned.ts returns only the stage (the view's label, `very-liberal` to `very-conservative` or `not-sure`), the record id `views:people:<id>` and a weight; `subjectsBetween` in src/director/conversation.ts raises `own-view` with that stage and one empty fact (`stand`). The views engine keeps each person's stances by question (`stancesOf` and `viewOn` in src/core2/modules/views.ts, record `views:stances:<id>:<question>`), and `questionAbout` (src/english/question-names.ts) words a question, but nothing passes the person's strongest question or why they hold it. The replies are mapped in src/director/data/conversation-rules.json (`replyMoves.own-view`: `agree`, `disagree`, `hear`, `private`).

**Fix.**

1. **Use the opening's composer.** words-opening-evening-talk-raises-what-the-president-said makes `wordConversationMove` (src/english/conversation-words.ts) join pieces that carry a `piece` field with `composeGroundedLine`. Use that path; never a second one.
2. **The question they care most about.** Add `strongestQuestion(api, personId)` in src/director/view-learned.ts: from `stancesOf`, the question whose `viewOn` is farthest from zero, ties broken by the question id; null when no stance is past the views engine's own no-view threshold. Return the question, `about` (worded by `questionAbout`), the side (`for` or `against`) and the stance's record id. A question `questionAbout` cannot word is skipped.
3. **Why, from their own life.** In the same function, one reason, in order: `work` when the question is about work or pay and the person lost a job this year (`lastEndedJob` in conversation.ts) or holds one in that field (`jobOf`), with `employer`; `money` when it is about prices, rent or taxes and `hardshipStress` (src/core2/trait-decisions.ts) is past its own threshold; else none. Name each reason's record.
4. **The subject and its facts.** `viewSubjectOf` adds `about`, `side` and, with a reason, `employer`; keep the stage. Declare the slots in the bank's `slots` map (`about` is already there).
5. **The parts.** `own-view` raise: a sentence with an optional opener by stage (the lean, said plainly: these may stay without an insert as openers, since the core always carries one) and a required core of at least 10 wordings for each side that name `{about}` ("Where I come down hardest is {about}."), plus at least 6 reasons that name `{employer}` and 6 for money. A `not-sure` person with no strongest question keeps one-to-three-word lines or says none.
6. **The replies.** Up to four, each a different move about `{about}`: agree (the player's own `viewOn` the same question on the same side), disagree (the other side), ask why, and keep your own to yourself. Agree and disagree are offered only where the player's record bears them out. At least 8 wordings each, naming `{about}`. `expectUpToFourDifferent` (src/director/reply-set-check.ts) passes.
7. **What it writes back.** `learnView` already records that the player knows the person's lean; it now also cites the stance record of `{about}`, so the person card can say the question. When the player answers agree or disagree, the speaker learns the player's view through the same `learnView`. Name the record ids in the pull request.
8. **Delete what this replaces, with every reference.** All 25 `own-view` lines with no insert that are not kept as openers in step 5. None is graded good. Then `npm run words:grade` and `npm run words:rules` twice.
9. **Lower the guard's count** for `conversation` in tests/guards/english/line-inserts-baseline.json.
10. **Tests.** In src/director/view-learned.test.ts, on drawn places: two people with the same lean but different strongest questions say different questions; someone out of work whose strongest question is about work names the employer they lost; the replies pass `expectUpToFourDifferent`; the player who agrees is on the speaker's record afterward. Run tests/guards/english and the bank tests yourself.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code. No dice: the question and the reason come from the views engine and the person's own records. Ask why: the reason cites the record behind it. One rule, all 56 places: the tests draw their places. One screen names a thing once (lead, Nov 11, from the reviews of PR 8736 and PR 8750): wherever this item says each reply names the same thing, read it as each reply carries an insert, no two replies on one screen carry the same insert, and the speaker's own line names the thing once and then says "it". Say an office, a bill or a person the way people say it, never a form's title and never a parenthesis.

**Done when.** A second session, in the running game on main at 1440x900, starts three new lives in drawn places it writes down with their seeds, and talks with people the player knows until one says where they stand. Each names a policy question and which side they are on, and the three share no sentence; the replies are at most four different moves about that question. It answers, opens the person's card and finds where they stand with the question named. tests/guards/english passes with the lowered count.

**Waits on.** The CTO's ruling on whether the builder drafts the `data/english/parts` lines with `Review: words` or the Story session writes them (the same question as words-opening-evening-talk-raises-what-the-president-said; PR #8715).

**Files.** src/director/view-learned.ts, src/director/view-learned.test.ts, src/director/conversation.ts, src/director/data/conversation-rules.json, src/director/reply-set-check.ts, src/english/conversation-words.ts, src/english/question-names.ts, src/core2/modules/views.ts, src/core2/trait-decisions.ts, data/english/parts/conversation.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Planned by Fable B's Words planner (2026-11-11) from main at 5ef67361. 26 lines, 25 with no insert and not excused, none shared with another subject. Three today: "I'm about as liberal as they come.", "I should tell you, I lean conservative.", "I keep mine to myself, mostly." The opening item's `address-point` reads the same `viewOn`; the two share `strongestQuestion` if the opening builds one first, never two copies.
