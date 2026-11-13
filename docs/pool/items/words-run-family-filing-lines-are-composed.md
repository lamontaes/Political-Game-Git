---
id: words-run-family-filing-lines-are-composed
title: "The relative who hears the player filed names what the race costs this household: the office, the savings, the days left, the child at home"
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

**What.** After the player files, a relative at home with a stake in it confronts them. The records already say which stake (money the household lacks for the race, or a young child at home while the player works) and the opening question sometimes names it, but the talk that follows is fixed: "So. You did it.", "I'm running because somebody has to.", "I didn't tell you because I wasn't sure I'd go through with it." 111 of the 134 lines under the `family-filing` purpose have no insert, so a spouse with three weeks of savings and one with a toddler hear the same replies. Seen: the talk box at home after filing, and the player's four replies.

**Cause.** Found in code: the `family-filing` type in src/director/data/situation-types.json fires on `cause:event:candidate-filed` and casts the relative through `household-stake`. `filingStakeOf` in src/director/family-stake.ts gives the stake's facts: `stake-money` with `cushion` (days the savings carry the household) and `remaining` (days left in the race), or `stake-time` with `child` (the youngest child's name), or `worked` or `gave` for a loss. `composeBinding` in src/director/purpose-scene.ts adds `name`, `first`, `place` and `office`. Only `state/ask` (10 lines, 4 with no insert) and the narration use them. Every reply and follow line (`reply/tell`, `request`, `deflect`, `comfort`, `promise`, `accept`, `thank`; `follow/*`) is a whole sentence, 4 to 8 lines a move with almost none carrying a slot. The player's own job, whose hours the campaign takes (`filer.jobId`), is read by `filingStakeOf` to decide the stake and then dropped.

**Fix.**

1. **Compose.** Use the scene composer from words-run-filing-clerk-lines-are-composed (step 1, in `wordSceneMove`): pieces carrying `piece` fields are joined by `composeGroundedLine`.
2. **The facts.** Pass the player's employer as `employer` from the filing's job (`filer.jobId`, the organization's name) for `stake-time`, citing the job; keep the rest.
3. **The parts.** The relative's question (`state/ask`): a required core by stake that names `{office}` and the stake's fact (`{cushion}` and `{remaining}`, or `{child}`), at least 8 for each stake. The relative's answers (`follow/*`): a required core naming the stake's fact, at least 6 per move. The closes: a core naming `{office}`, at least 6.
4. **The replies.** Up to four, each a different move about this stake, at least 8 wordings each: say why you are running (`tell`, naming `{office}`); ask for help (`request`, naming `{remaining}` or `{child}`, which `replyInScene` already turns into a volunteer when the answer is a promise); a promise about the stake (`promise`, naming `{child}` or `{cushion}`: "I'll be home for {child} by six."); and put it off (`deflect`, naming `{office}`). `expectUpToFourDifferent` (src/director/reply-set-check.ts) passes.
5. **What it writes back.** `replyInScene` in purpose-scene.ts already writes the `scene.reply` record with the stake, the ending's `keeps` (`not-yet` strains the tie through `ENDING_STRAIN`), and enlists the relative as a volunteer (`enlistVolunteer` in src/core2/modules/campaigns.ts) after a request answered with a promise. Name those record ids in the pull request.
6. **Delete what this replaces, with every reference.** The 111 lines with no insert under `family-filing`, except the two the owner graded good that have no insert ("I can't do this alone. I need help with phones and door knocking. ..." and "Can we even afford this? It's not like we have a ton of savings, right? ..."), which keep their grade rows and stay where they play now, as openers of the new sentences where they fit. The third good line ("... Who's going to take care of {child}?") carries an insert and stays. A piece that also serves another purpose (8 do) loses only its `family-filing` use. Then `npm run words:grade` and `npm run words:rules` twice.
7. **Lower the guard's count** for `scene-talk` in tests/guards/english/line-inserts-baseline.json.
8. **Tests.** In src/director/family-stake-scene.test.ts, on drawn places: a household short on savings hears its own days named; a household with a young child hears the child's name; the two never share a reply; every reply set passes `expectUpToFourDifferent`; a request answered with a promise enlists the relative. Run tests/guards/english and the bank tests yourself.

**Time box.** 5 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code. No dice: the stake is read from the household's money, jobs and children. Ask why: each figure the relative says cites the household's records. One rule, all 56 places: the tests draw their places.

**Done when.** A second session, in the running game on main at 1440x900, starts three new lives in drawn places it writes down with their seeds, with a spouse or a child at home, and files for office in each. The relative's lines name the office and the stake from that household's records (the days the savings last, or the child's name), and the replies are at most four different moves, each about that stake. It answers with a request, and the relative appears as a volunteer on the campaign. tests/guards/english passes with the lowered count.

**Waits on.** The CTO's ruling on whether the builder drafts the `data/english/parts` lines with `Review: words` or the Story session writes them (the same question as words-opening-evening-talk-raises-what-the-president-said; PR #8715).

**Files.** src/director/family-stake.ts, src/director/purpose-scene.ts, src/director/family-stake-scene.test.ts, src/director/reply-set-check.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/english/scene-talk-words.ts, src/core2/modules/campaigns.ts, data/english/parts/scene-talk.json, data/english/part-grades.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Planned by Fable B's Words planner (2026-11-11) from main at 5ef67361. 134 lines, 111 with no insert and not excused. Three today: "So. You did it.", "I didn't tell you because I wasn't sure I'd go through with it.", "I'm running because somebody has to."
