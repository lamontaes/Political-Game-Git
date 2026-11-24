---
id: words-run-press-comment-lines-are-composed
title: "A reporter's questions and the player's answers name the bill, the vote and the story, with the count and the outlet"
area: words
kind: bug
priority: 1
size: L
status: open
standard: 2
claimed-by:
pr:
after: words-run-filing-clerk-lines-are-composed
blocked-on:
lead: words
model: opus
effort: high
root: rc4-hand-written-words
source: owner, Nov 11, 2026 (docs/coordination/OWNER-DECISIONS.md, "Nov 11: every line goes through the English engine"); planned for Fable B from a read of main at 5ef67361
checked:
claimed-at:
branch:
---

**What.** A reporter catches the candidate or official for a comment on a bill, a vote, a signing or a story. The reporter's question names the bill ("Can you tell me how you'll vote on {bill}?"), but nearly everything after it is a fixed sentence: "I'm voting for it, and you can quote me.", "I'll have something to say after the vote.", and hundreds of follows and closes with no name, bill or outlet in them. 401 of the 484 lines under the `press-comment` purpose have no insert, the largest share of any purpose on the running-for-office path. Seen: the talk box when a reporter stops the player (a hallway, a doorstep, after a vote), and the player's replies; then the story the outlet runs.

**Cause.** Found in code: the `press-interview` type in src/director/data/situation-types.json (purpose `press-comment`) fires on executive acts, bill events and printed stories, with the reporter cast from `press-corps`. `composeBinding` in src/director/purpose-scene.ts adds `bill` (its spoken number), `cause`, `story` (the bill or topic, when the record names no story), `outlet` and `reporter` for a printed story, and the marks `signed`, `introduced`, `vetoed`, `veto-held`, `vote-held`, `voted-yes`, `voted-no`, `same-day`; `chooseVariant` (src/director/arc-variant.ts; variants in src/director/data/arc-variants.json) adds its reads. The lie branch in src/director/scene-talk.ts adds `knows-truth` and `source`. Only `state/ask` (20, all with inserts), the narration and `follow/confront` use them. The player's replies (`answer` 55 of 56 with no insert, `deflect` 19 of 23, `refuse` 18 of 20, `stall` 24 of 24, `lie` 24 of 30, `boast` 15 of 15, `leave` 30 of 35) and the reporter's follows (`accept` 57 of 57, `thank` 38 of 39, `press` 24 of 26) carry no slot. The floor vote's count is in the legislature engine's bill record (`billOf` in src/core2/modules/legislature.ts) and is never passed; neither is the player's own recorded vote beyond the yes or no mark.

**Fix.**

1. **Compose.** Use the scene composer from words-run-filing-clerk-lines-are-composed (step 1, in `wordSceneMove`).
2. **The facts.** Pass `count` (the floor vote as "5 to 2", from the bill's vote record) where a vote was held, and `about` (the bill's question, worded by `questionAbout` in src/english/question-names.ts) where the bill names one, each citing the bill and vote records. Keep the rest.
3. **The parts.** Every reply move and every reporter follow becomes a sentence whose required core names `{bill}`, `{story}`, `{about}` or `{outlet}`, and whose reason, where it has one, names `{count}` or the vote mark: at least 8 cores for each reply move and 6 for each follow move. The closes name `{outlet}` or `{bill}` ("That'll be in {outlet} tomorrow."), at least 8.
4. **The replies.** Up to four, each a different move, at least 8 wordings each, each naming the bill, the story or the question: answer on the record (`answer`, the side from the player's own vote or `viewOn`), decline to comment (`refuse`), put it off until the vote (`stall`, offered only before `vote-held`), and push back on the story (`confront`). A lie stays possible only where the arc offers it in place of one of these. `expectUpToFourDifferent` (src/director/reply-set-check.ts) passes.
5. **What it writes back.** `replyInScene` (purpose-scene.ts) writes `scene.reply` with ending `keeps: "story-runs"` for an answer, a refusal or a walk-off, and src/core2/modules/press.ts reads it (the check on `facts.keeps !== "story-runs"`) to run the story with the player's line. Name the story's record id in the pull request.
6. **Delete what this replaces, with every reference.** The 401 lines with no insert under `press-comment`, except the thirteen with no insert that the owner graded good ("Do you have a moment for a couple of questions?", "Mind if I ask you a few things?", "I'm voting for it, and you can quote me.", "I'll have something to say after the vote.", "Even then. It's the right call.", "Read the bill before you judge it.", "I'd tell them I listened, and I still disagree.", "Then let me answer it on the record.", "We have it on the record. I'm just giving you a chance to respond.", "That's all I needed. Thanks.", "People say a lot of things.", "I'm not doing this in a hallway.", "Your vote is public. Your reasons don't have to be a secret."), which stay as openers or closers of the new sentences and keep their grade rows. A piece that also serves another purpose (18 do) loses only its `press-comment` use. Then `npm run words:grade` and `npm run words:rules` twice.
7. **Lower the guard's count** for `scene-talk` in tests/guards/english/line-inserts-baseline.json.
8. **Tests.** In src/director/press-scenes.test.ts, src/director/press-comment-variants.test.ts and src/director/press-comment-context.test.ts, on drawn places: after a held vote, an on-the-record answer names the bill and the count; a stall is never offered after the vote; every reply set passes `expectUpToFourDifferent`; the story the outlet runs carries the player's line. Run tests/guards/english and the bank tests yourself.

**Time box.** 8 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop. If it runs out, split the remaining reply moves into their own item rather than stopping halfway through a move.

**Rules.** No hand-written player text in code. No dice: the answer's side is the player's recorded vote or view. Ask why: every figure cites the bill or vote record. One rule, all 56 places: the tests draw their places. An effect is a read: the story the press engine runs reads the reply.

**Done when.** A second session, in the running game on main at 1440x900, plays three new lives in drawn places it writes down with their seeds until a reporter asks the player about a bill. Each exchange names the bill, and after a held vote the count; the replies are at most four different moves, each naming the bill or the story. It answers on the record and finds the outlet's story quoting the answer in the news. tests/guards/english passes with the lowered count.

**Waits on.** The CTO's ruling on whether the builder drafts the `data/english/parts` lines with `Review: words` or the Story session writes them (the same question as words-opening-evening-talk-raises-what-the-president-said; PR #8715).

**Files.** src/director/purpose-scene.ts, src/director/arc-variant.ts, src/director/data/arc-variants.json, src/director/scene-talk.ts, src/director/press-scenes.test.ts, src/director/press-comment-variants.test.ts, src/director/press-comment-context.test.ts, src/director/reply-set-check.ts, src/english/scene-talk-words.ts, src/english/question-names.ts, src/core2/modules/legislature.ts, src/core2/modules/press.ts, data/english/parts/scene-talk.json, data/english/part-grades.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Planned by Fable B's Words planner (2026-11-11) from main at 5ef67361. 484 lines, 401 with no insert and not excused. Three to rewrite today: "You've got that wrong, and you know it.", "Yes. Some things matter more than one election.", "Go ahead. I meant every word." Seventeen lines here are graded good; four of them carry an insert.
