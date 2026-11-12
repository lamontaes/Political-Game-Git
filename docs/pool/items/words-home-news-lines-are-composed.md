---
id: words-home-news-lines-are-composed
title: "Talk about the news names the story and where the person stands on it from their own life"
area: words
kind: bug
priority: 1
size: M
status: merged
standard: 2
claimed-by: claude/words-w3-news
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
branch: claude/words-w3-news
merged-at: 2026-11-11T19:00:03.034Z
---

**What.** When someone passes on news (a story they read, or a place in town that closed), the raise already names it ("Did you see {headline} in {outlet}?"), but the rest of the exchange is fixed. They ask "What do you make of the news?", and the player answers "I think it's terrible." or "I think it's great." whatever the story is and whatever their own life says. 24 of the 58 lines under the bank's `news` subject have no insert. Seen: a talk that opens on a story or a closing in town, its question back to the player and the player's four replies.

**Cause.** Found in code: `subjectsBetween` in src/director/conversation.ts raises `news` two ways. `printedHeard` gives `headline`, `outlet` and the medium. `changesKnownTo` (src/director/bring-it-up.ts) gives `topic`, the institution's name. `replyFacts` gives the listener the stage `heard` or `not-heard` (`knowsNews`), and `playerFacts` gives the player the same stage. Nobody reads what the story or change has to do with the person: whether they worked at the place that closed (`sharedHistory` in src/core2/shared-history.ts, or their job through `jobOf`), or where they stand on the story's question (`viewOn` in src/core2/modules/views.ts). So the `ask/think` lines (6, all with no insert) and the `answer/opinion` lines (17, 10 with no insert) cannot say anything about this story. `conversation-rules.json` maps `news-ask-think` to the `opinion` answers only.

**Fix.**

1. **Use the opening's composer.** words-opening-evening-talk-raises-what-the-president-said makes `wordConversationMove` (src/english/conversation-words.ts) join a move's pieces with `composeGroundedLine` when they carry a `piece` field. Use that path; never a second one.
2. **What the news means to this person.** Add `newsStake(core, personId, subject)` beside `knowsNews` in src/director/conversation.ts. It returns one reason, in order, with its record: `worked-there` (the person worked at the institution, now or once, from `jobOf` or `sharedHistory`), `stance` (the story names a policy question, worded by `questionAbout` in src/english/question-names.ts, and the person's `viewOn` it is past the views engine's own no-view threshold), or `none`. With `stance`, the stage is `for` or `against` by the sign. Pass `about` (the worded question) and `employer` as facts. A story with no question and no tie gives `none`, and the line names only the headline or the place.
3. **The question back.** `ask/think` becomes a sentence `news-ask` with an optional opener and a required core of at least 10 wordings that name `{headline}` or `{topic}` ("What do you make of {topic} closing?").
4. **The player's replies.** Up to four, each a different move, offered only where its record holds: `opinion` with stage `for` or `against` from the player's own `newsStake` (at least 8 wordings each, naming `{about}` or `{topic}`); `worked-there` when the player worked there (at least 6, naming `{employer}`); `ask-why` ("Did they say why {topic} closed?", at least 6); and `not-heard`. `answersTo` in src/director/data/conversation-rules.json lists the moves that answer `news-ask-think`; `rankChoices` keeps one per move, and `expectUpToFourDifferent` (src/director/reply-set-check.ts) passes on every set.
5. **Their answer back.** The `yes`, `no` and `react` lines with no insert are rewritten as composed answers that name `{topic}` or `{headline}`, the core always carrying it.
6. **What it writes back.** When the player says where they stand on a story's question, the listener learns the player's view through `learnView` (src/director/view-learned.ts) with the views engine's stance record, so their card and a later talk read it. Name the record id in the pull request.
7. **Delete what this replaces, with every reference.** The 24 lines with no insert under `news`; a piece that also serves another subject (9 do) loses only its `news` use. None is graded good. Then `npm run words:grade` and `npm run words:rules` twice.
8. **Lower the guard's count** for `conversation` in tests/guards/english/line-inserts-baseline.json.
9. **Tests.** In src/director/household-news.test.ts or a new src/director/news-talk.test.ts, on drawn places: two people with opposite views on a story's question answer it on opposite sides; someone who worked at a place that closed says so with its name; every reply set passes `expectUpToFourDifferent`. Run tests/guards/english and the bank tests yourself.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code. No dice: the stand and the reason come from the person's records. Ask why: a person cites a story only when their knowledge holds it, and the line's source ids name the story and the record behind the reason. One rule, all 56 places.

**Done when.** A second session, in the running game on main at 1440x900, plays three new lives in drawn places it writes down with their seeds, until someone raises a story or a closing in a talk. In each, the question back to the player names the story or the place, and the replies are at most four different moves, each naming it. Where the player picks a stand, it opens that person's card and finds where the player stands on record. tests/guards/english passes with the lowered count.

**Waits on.** The CTO's ruling on whether the builder drafts the `data/english/parts` lines with `Review: words` or the Story session writes them (the same question as words-opening-evening-talk-raises-what-the-president-said; PR #8715).

**Files.** src/director/conversation.ts, src/director/bring-it-up.ts, src/director/view-learned.ts, src/director/data/conversation-rules.json, src/director/reply-set-check.ts, src/director/household-news.test.ts, src/director/news-talk.test.ts (new), src/english/conversation-words.ts, src/english/question-names.ts, src/core2/modules/views.ts, src/core2/shared-history.ts, data/english/parts/conversation.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Planned by Fable B's Words planner (2026-11-11) from main at 5ef67361. 58 lines, 24 with no insert and not excused. Three today: "What do you make of the news?", "I think it's terrible.", "I heard about that." The opening's own news talk (the President's address) is words-opening-evening-talk-raises-what-the-president-said; this item does not touch the `address` subjects.
