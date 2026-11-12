---
id: words-run-filing-clerk-lines-are-composed
title: "At the filing counter, the clerk and the player talk about this race: the office, the dates, the other candidates and the papers"
area: words
kind: bug
priority: 1
size: L
status: merged
standard: 2
claimed-by:
pr: #8750
after: words-opening-evening-talk-raises-what-the-president-said
blocked-on:
lead: words
model: opus
effort: high
root: rc4-hand-written-words
source: owner, Nov 11, 2026 (docs/coordination/OWNER-DECISIONS.md, "Nov 11: every line goes through the English engine"); planned for Fable B from a read of main at 5ef67361
checked:
claimed-at:
branch:
merged-at: 2026-11-11T16:20:10.834Z
---

**What.** Filing for office is golden path step 3. At the counter the clerk already states the race from its record ("{office}: the general is {general}, the term is {term} years."), but the talk around it is fixed: "Morning. Here to file?", "Then let's get mine in.", "Polite. Brought a pen from home. Asked who else had filed." 102 of the 173 lines under the `filing-clerk` purpose in data/english/parts/scene-talk.json have no insert, most of them the player's replies and the clerk's answers. This item also gives every scene the composing step that the other running-for-office items use. Seen: the talk box at the filing office, from the clerk's greeting to the papers taken, and the filing scene the clerk stages after it.

**Cause.** Found in code: src/director/filing-visit.ts words every line through `visitLine`, which calls `wordSceneMove` (src/english/scene-talk-words.ts) with purpose `filing-clerk`, key `routine`, and the facts it is given. `openFilingVisit` gives the greeting none and the office pick only `office`. `raceTold` gives `office`, `general`, `primary` or `no-primary`, `term`, `office-<kind>` and `body`. The scene after the filing goes through `composeBinding` in src/director/purpose-scene.ts, which adds `name`, `first`, `place` and, for a race, `opponent` (the runner-up by votes). `wordSceneMove` picks one whole piece by `fitting` and `renderLine`. It never joins pieces, though `composeGroundedLine` (src/english/english-composition.ts) does for the newscast (`line` in src/english/english-newscast.ts). The other candidates already filed for the office are in the elections engine's filings (`openContests` and the candidate list in src/core2/modules/elections.ts) and the clerk's name is a cast person, but neither reaches the greeting or the player's replies. Of the steps, `state/tell-race`, `state/tell-deadline` and the narration already carry inserts. The no-insert lines are `reply/agree` (9 of 9), `reply/leave` (10 of 11), `follow/accept` (15 of 15), `state/tell-duty` (10 of 15) and the `close` lines.

**Fix.**

1. **Scenes compose (the step every running-for-office item builds on).** In `wordSceneMove`, when the pieces that fit a move carry a `piece` field (`of`, `part`, `required`; the `words-engine` skill, "How a joined piece says so"), group them by `piece.part` into a `ComposedLineBank` (opener, core, reason, closer) and join them with `composeGroundedLine`, the way `line` in src/english/english-newscast.ts builds its bank. Pieces with no `piece` field keep today's path until they are rewritten. One composer for every scene: words-opening-evening-talk-raises-what-the-president-said does the same in `wordConversationMove`, and if both can share one helper in src/english/english-composition.ts, they do.
2. **The facts.** In `openFilingVisit`, pass the clerk's `name` (the cast clerk) and the place (`place`, the town's spoken name) to the greeting. In `raceTold` and the filing scene's facts, add `filed` (how many others have filed for this office so far, from the elections engine's filings, with the first one's name as `opponent` when there is one), citing the filing records. Declare `filed` in the bank's `slots` map.
3. **The parts.** The greeting (`state/greet-counter`, `open/greet`): a required core naming `{place}` or the office ("Here for {office}?" once picked), at least 8. The duties (`state/tell-duty`): a core naming `{office}` or `{body}`, at least 10. The clerk's answers after the papers (`follow/accept`, `follow/answer`): a core naming `{office}`, `{filed}` or `{opponent}` ("You're the third to file for {office}."), at least 12. The closes: a core naming `{general}` or `{deadline}`, at least 8.
4. **The replies.** Up to four, each a different move, each naming the race: agree and file (`agree`, naming `{office}`), ask who else has filed (`ask`, answered by `{filed}` and `{opponent}`), ask about the dates (`tell`, answered by `{general}` or `{primary}`), and leave without filing (`leave`, naming `{office}`). At least 8 wordings each. `expectUpToFourDifferent` (src/director/reply-set-check.ts) passes on each set. The player's line in the transcript is the reply they picked (scene-standard rule 12).
5. **What it writes back.** Filing itself is GOV's `fileCandidacy`, as today. The `leave` reply writes the scene's reply record with ending `cold-feet` (`replyInScene` in purpose-scene.ts) as today; name both record ids in the pull request.
6. **Delete what this replaces, with every reference.** The 102 lines with no insert under `filing-clerk`, except the one graded good, "Alright." (`scene-talk.state-accept-terms.all-right`, three words, kept). A piece that also serves another purpose (12 do) loses only its `filing-clerk` use. Then `npm run words:grade` and `npm run words:rules` twice.
7. **Lower the guard's count** for `scene-talk` in tests/guards/english/line-inserts-baseline.json.
8. **Tests.** In src/director/filing-visit.test.ts, on drawn places: the clerk's greeting names the town or the office; after a second candidate files, the clerk's answer names how many have filed and who; every reply set passes `expectUpToFourDifferent`. In src/director/scene-talk.test.ts, a scene whose pieces carry `piece` fields is joined by `composeGroundedLine`, and one whose pieces do not is worded as before. Run tests/guards/english and the bank tests yourself.

**Time box.** 6 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code. One rule, all 56 places: the office, dates and filing office come from each place's records, never a named place. No dice: who else filed is the elections engine's record. Wire to the world: the line names a filing that is in the elections engine.

**Done when.** A second session, in the running game on main at 1440x900, starts three new lives in drawn places it writes down with their seeds, and files for an office in each. The clerk's lines name the office and the race's dates, and in at least one place they name another candidate who filed. The player's replies are at most four different moves, each naming the office or the race. The three visits share no clerk sentence of four words or more. tests/guards/english passes with the lowered count.

**Waits on.** The CTO's ruling on whether the builder drafts the `data/english/parts` lines with `Review: words` or the Story session writes them (the same question as words-opening-evening-talk-raises-what-the-president-said; PR #8715).

**Files.** src/english/scene-talk-words.ts, src/english/english-composition.ts, src/english/english-newscast.ts, src/director/filing-visit.ts, src/director/filing-visit.test.ts, src/director/purpose-scene.ts, src/director/scene-talk.ts, src/director/scene-talk.test.ts, src/director/reply-set-check.ts, src/core2/modules/elections.ts, data/english/parts/scene-talk.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Planned by Fable B's Words planner (2026-11-11) from main at 5ef67361. 173 lines, 102 with no insert and not excused. Three today: "Morning. Here to file?", "Then let's get mine in.", "Polite. Brought a pen from home. Asked who else had filed." The visit before filing is still a stopgap (`SG-WORDS-filing-counter-prompts` in filing-visit.ts); this item keeps its sequence and only changes how its lines are made. The other running-for-office items (`words-run-*-lines-are-composed`) build on step 1.
