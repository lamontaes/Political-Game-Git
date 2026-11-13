---
id: words-run-town-hall-question-lines-are-composed
title: "At a town hall or a protest, the resident's question and the player's answer name the issue and what it has done to the resident's own life"
area: words
kind: bug
priority: 1
size: M
status: open
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

**What.** At a town hall the player holds, or when a protester or striker confronts them, a resident stands up with a question. The question already names the issue ("Where do you stand on {issue}?"), but the player's replies and the resident's answers are mostly fixed: "People say a lot of things.", "Good. I'll hold you to that.", "At least you said it to my face." 61 of the 103 lines under the `town-hall-question` purpose have no insert, and nothing says why this resident cares. Seen: the talk box at a town hall or a confrontation by a protester or striker, and the player's replies.

**Cause.** Found in code: two types use the purpose in src/director/data/situation-types.json: `town-hall-question` (on `cause:event:town-hall`, the resident cast from `town-hall-askers`) and `action-confront` (on `cause:event:civic.protest` and `civic.strike`). `composeBinding` in src/director/purpose-scene.ts adds `issue` (the question, worded by `questionAbout`), `host-opposed`, `host-agreed` or `host-declined` (the host's answer against the resident's own `viewOn`), and for a protest or strike `protest` or `strike` and `number` (the crowd). `state/ask` (23 lines) and the narration use them. The replies (`answer`, `relent`, `offer`, `deflect`, `lie`, `leave`: 3 to 6 lines a move, almost all with no insert) and the follows do not. The resident's own stake in the issue is on record and not passed: a lost job this year (`lastEndedJob` pattern in src/director/conversation.ts, or the `laid-off` and `out-of-work` reads in src/director/data/arc-variants.json), rent owed or money trouble (`hardshipStress` in src/core2/trait-decisions.ts, the `rent-owed` read).

**Fix.**

1. **Compose.** Use the scene composer from words-run-filing-clerk-lines-are-composed (step 1, in `wordSceneMove`).
2. **The facts.** Pass `stake` with one reason, in order: `work` (the resident lost a job this year, with `employer`), `money` (rent owed or `hardshipStress` past its threshold), or none; each cites its record. Use the arc-variant reads where they already compute it, never a second reader.
3. **The parts.** The question (`state/ask`): keep the cores that name `{issue}`; add reasons naming `{employer}` or the money stake, at least 6 each. The resident's answers (`follow/*`) and closes: a core naming `{issue}`, at least 6 per move, with the host reading (`host-opposed`, `host-agreed`, `host-declined`) choosing among them.
4. **The replies.** Up to four, each a different move, at least 8 wordings each, each naming `{issue}`: answer where you stand (`answer`), give ground (`relent`), offer to meet (`offer`, naming `{name}` or `{issue}`), and put it off (`deflect`). A lie stays possible only where the arc offers it in place of one of these. `expectUpToFourDifferent` (src/director/reply-set-check.ts) passes.
5. **What it writes back.** `replyInScene` (purpose-scene.ts) writes `scene.reply` with the ending's `keeps` (`promise`, `meeting-set`, `trust-lost`, `relationship-strained`); the meetings engine keeps the host's answer on the town hall row. Name the record ids in the pull request.
6. **Delete what this replaces, with every reference.** The 61 lines with no insert under `town-hall-question`, except the one the owner graded good, "People say a lot of things.", which stays as an opener of the deflect reply and keeps its grade row. A piece that also serves another purpose (45 do, many shared with donor-ask and press-comment) loses only this use. Then `npm run words:grade` and `npm run words:rules` twice.
7. **Lower the guard's count** for `scene-talk` in tests/guards/english/line-inserts-baseline.json.
8. **Tests.** In src/director/town-hall-question-scene.test.ts, on drawn places: a resident who lost a job names the employer in their question's reason; a host who answered against the resident's view hears a different answer than one who agreed; every reply set passes `expectUpToFourDifferent`. Run tests/guards/english and the bank tests yourself.

**Time box.** 5 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code. No dice: the issue, the stake and the reading come from the meetings engine and the resident's records. Ask why: the reason cites the record behind it. One rule, all 56 places: the tests draw their places.

**Done when.** A second session, in the running game on main at 1440x900, plays three new lives in drawn places it writes down with their seeds until the player holds a town hall or is confronted at a protest or strike. Each resident's question names the issue, and where the records hold one, a reason from their own work or money; the replies are at most four different moves, each naming the issue. It answers with an offer and finds the meeting on record. tests/guards/english passes with the lowered count.

**Waits on.** The CTO's ruling on whether the builder drafts the `data/english/parts` lines with `Review: words` or the Story session writes them (the same question as words-opening-evening-talk-raises-what-the-president-said; PR #8715).

**Files.** src/director/purpose-scene.ts, src/director/data/situation-types.json, src/director/data/arc-variants.json, src/director/town-hall-question-scene.test.ts, src/director/reply-set-check.ts, src/english/scene-talk-words.ts, src/core2/modules/meetings.ts, src/core2/modules/public-action.ts, src/core2/trait-decisions.ts, data/english/parts/scene-talk.json, data/english/part-grades.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Planned by Fable B's Words planner (2026-11-11) from main at 5ef67361. 103 lines, 61 with no insert and not excused. Three today: "Good. I'll hold you to that.", "People say a lot of things." (graded good, kept), "At least you said it to my face." The protest and strike lines are a stopgap (`SG-WORDS-action-confront-town-hall-lines` in purpose-scene.ts); this item keeps that registration.
