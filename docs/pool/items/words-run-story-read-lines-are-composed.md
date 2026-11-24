---
id: words-run-story-read-lines-are-composed
title: "Talking over a story someone read, both sides name the story and stand on its question from their own views"
area: words
kind: bug
priority: 1
size: M
status: dropped
standard: 2
claimed-by:
pr:
after: words-run-filing-clerk-lines-are-composed
blocked-on:
lead: words
model: opus
effort: medium
root: rc4-hand-written-words
source: owner, Nov 11, 2026 (docs/coordination/OWNER-DECISIONS.md, "Nov 11: every line goes through the English engine"); planned for Fable B from a read of main at 5ef67361
checked:
claimed-at:
branch:
---

**What.** Someone at home or at work read a story and brings it up with the player. Their telling names the story and the paper ("Did you see the piece in {outlet} on {story}?"), but the player's replies are fixed: "I saw it. They've got it about right.", "Yeah. I've been thinking the same thing for a while.", "I did, and I'm glad someone finally said it." Agree or disagree is offered whatever either person thinks, and the talk moves no one's view. 64 of the 110 lines under the `story-read` purpose have no insert. Seen: the talk box at home or at work when someone brings up a story they read, and the player's replies.

**Cause.** Found in code: the `story-read` type in src/director/data/situation-types.json fires on `circumstance:story-read-home` and `circumstance:national-news-work`. `composeBinding` in src/director/purpose-scene.ts, for a `news.read` record, adds `story` (the story's question, worded by `questionAbout`, else the topic), `took-effect` when the story is about a law taking effect, and `outlet`. `state/tell` (14 lines) and the narration use them. The replies (`agree` 8 of 8 with no insert, `disagree` 7 of 8, `ask` 4 of 5, `deflect` 5 of 5) and the closes carry no slot. Where the reader stands on the story's question (`viewOn` in src/core2/modules/views.ts) is on record and not passed, and the code says the talk moves nothing: stopgap `SG-WORDS-story-read-talk-moves-nothing` in purpose-scene.ts.

**Fix.**

1. **Compose.** Use the scene composer from words-run-filing-clerk-lines-are-composed (step 1, in `wordSceneMove`).
2. **The facts.** Pass `reader-side` (`for` or `against`, the sign of the reader's `viewOn` the story's question, or none near zero by the views engine's own threshold) and `player-side` the same way for the player, each citing the views records. A story with no question passes neither.
3. **The parts.** The reader's telling (`state/tell`): add reasons by `reader-side` naming `{story}`, at least 6 each. The reader's answers (`follow/*`) and closes: a core naming `{story}` or `{outlet}`, at least 6 per move.
4. **The replies.** Up to four, each a different move, at least 8 wordings each, each naming `{story}`: agree (offered only where `player-side` matches `reader-side`), disagree (only where they differ), ask what it means here (`ask`, naming `{place}`), and put it off (`deflect`). `expectUpToFourDifferent` (src/director/reply-set-check.ts) passes.
5. **What it writes back.** On agree or disagree, the reader learns the player's view on the question through `learnView` (src/director/view-learned.ts) with the stance record, so the reader's card and a later talk read it. That clears `SG-WORDS-story-read-talk-moves-nothing`: delete its marker in purpose-scene.ts and its row in the director's stopgap file, src/director/data/stopgaps.json, in the same change. `replyInScene` still writes `scene.reply` with the ending. Name the record ids in the pull request.
6. **Delete what this replaces, with every reference.** The 64 lines with no insert under `story-read`. None is graded good, and none serves another purpose. Then `npm run words:grade` and `npm run words:rules` twice.
7. **Lower the guard's count** for `scene-talk` in tests/guards/english/line-inserts-baseline.json.
8. **Tests.** In src/director/story-read-scene.test.ts, on drawn places: a player whose view matches the reader's is offered agree and not disagree, and the opposite; after agreeing, the reader holds the player's view; every reply set passes `expectUpToFourDifferent`. Run tests/guards/english and the bank tests yourself.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code. No dice: who stands where is the views engine's record. Ask why: the reader cites the story only because their record says they read it. An effect is a read: the reader's card reads what the talk taught them.

**Done when.** A second session, in the running game on main at 1440x900, plays three new lives in drawn places it writes down with their seeds until someone brings up a story they read. Each talk names the story and the outlet, and the player's replies are at most four different moves about that story, with agree or disagree offered as the player's own view bears out. It answers, opens the reader's card and finds where the player stands. `git grep -n "SG-WORDS-story-read-talk-moves-nothing" -- src` returns nothing, and tests/guards/english passes with the lowered count.

**Waits on.** The CTO's ruling on whether the builder drafts the `data/english/parts` lines with `Review: words` or the Story session writes them (the same question as words-opening-evening-talk-raises-what-the-president-said; PR #8715).

**Files.** src/director/purpose-scene.ts, src/director/data/stopgaps.json, src/director/view-learned.ts, src/director/reply-set-check.ts, src/director/data/situation-types.json, src/english/scene-talk-words.ts, src/english/question-names.ts, src/core2/modules/views.ts, data/english/parts/scene-talk.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Planned by Fable B's Words planner (2026-11-11) from main at 5ef67361. 110 lines, 64 with no insert and not excused. Three today: "I saw it. They've got it about right.", "Yeah. I've been thinking the same thing for a while.", "I did, and I'm glad someone finally said it."

- Dropped Nov 12, 2026 by the story builder for the lead (Fable A): its scene was deleted with the scene inventory (docs/design/scene-inventory.md, branch claude/story-scene-inventory); the scene's reply was read by no engine.
