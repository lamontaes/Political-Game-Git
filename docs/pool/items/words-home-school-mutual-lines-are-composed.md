---
id: words-home-school-mutual-lines-are-composed
title: "Old classmates and people both know are talked about by name, school, years and what happened to them"
area: words
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: words-opening-evening-talk-raises-what-the-president-said
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

**What.** Meeting people around town, the talk turns to the school two people went to and to people both of them know. The questions name the school or the person ("Do you remember {school}?", "Have you seen {name}?"), but the answers are fixed: "That was a long time ago.", "Those were the days.", "I haven't seen him.", "Not in a while.", "Why do you ask?" 22 of the 71 lines under `shared-school`, `mutual` and `asked-mutual` have no insert, and nothing says why the person came up, though a mutual acquaintance is raised only because something happened to them. Seen: a talk away from home with a former classmate or someone who knows the same person, and the player's replies.

**Cause.** Found in code: in src/director/conversation.ts, `subjectsBetween` raises `shared-school` from `sharedHistory` (src/core2/shared-history.ts) with `school`, `years` and `long-ago`, and raises `mutual` for someone both know only when `happened(id)` is true, that is, when `latestMoment(core, director, speakerId, id)` finds a recorded moment for them. It passes `name` and `first`, and drops the moment it found. `replyFacts` gives the listener `when` from `lastContact` (stage `saw` or `not`); `playerFacts` gives the player `my-when` or `my-not`. `asked-mutual` (`otherRaises` in src/director/data/conversation-rules.json) is the other person asking it back. The happening that made the person worth mentioning (a new job, a move, an illness, a birth: the `happenings` prefixes in the same rules file) never reaches the line.

**Fix.**

1. **Use the opening's composer.** words-opening-evening-talk-raises-what-the-president-said makes `wordConversationMove` (src/english/conversation-words.ts) join pieces that carry a `piece` field with `composeGroundedLine`. Use that path; never a second one.
2. **What happened, for `mutual`.** Keep the moment `latestMoment` returns and pass its stage and fact, with the same stage table `familyNews` uses (`familyNews.stages`: `ill`, `moved`, `job`, `baby`), its `place` or `employer` where the moment names one, and `happened-when` by `spokenWhen` (src/director/words.ts). Reuse `familyNews`'s reading: make it take any person, not only a relative, rather than a second copy.
3. **The parts.** `mutual` raise: a required core naming `{name}` and a reason by stage naming the happening ("{first} just started at {employer}."), at least 6 reasons for each stage and 8 cores. `mutual` and `asked-mutual` replies (`not`, `saw`): a core naming `{name}` and, for `saw`, `{when}` or `{my-when}`. `shared-school` replies (`years`) and answers (`plain`, `brief`, `years`): a core naming `{school}` or `{years}` ("{years} years since {school}, and it doesn't feel like it."), at least 8 each.
4. **The replies.** Up to four, each a different move: say when you last saw them (`mine-saw`, `{my-when}`) or that you have not (`mine-not`, naming `{name}`); ask about the happening ("Where's {first} working now?", answered by the fact); ask after them kindly (`care`); for school, remember it (`plain`) or turn it back ("Did you stay in touch with anyone from {school}?"). The `change` and `deflect` answers that jump to an unrelated subject are deleted (scene-standard: a reply follows from the line before it). `expectUpToFourDifferent` (src/director/reply-set-check.ts) passes.
5. **What it writes back.** The listener already remembers the talk's topic (`talkedKey` in `say`). Add: when the player is told a happening, they learn it as `api.observe` knowledge keyed by the moment, cited to it, so a later talk with that person can ask after it rather than learning it again. Name the record id in the pull request.
6. **Delete what this replaces, with every reference.** The 22 lines with no insert under the three subjects. None of them is graded good; the one line graded good here, "Have you seen {name}?", carries an insert and stays. A piece that also serves another subject (14 do) loses only these uses. Then `npm run words:grade` and `npm run words:rules` twice.
7. **Lower the guard's count** for `conversation` in tests/guards/english/line-inserts-baseline.json.
8. **Tests.** In src/director/conversation.test.ts, on drawn places: a mutual acquaintance who took a job is raised with the employer; two schoolmates name the school and the years; no answer to "Have you seen {name}?" jumps to work or home; every reply set passes `expectUpToFourDifferent`. Run tests/guards/english and the bank tests yourself.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code. Ask why: a person is mentioned only for a recorded happening, and the line cites it. No dice. One rule, all 56 places: the tests draw their places.

**Done when.** A second session, in the running game on main at 1440x900, starts three new lives in drawn places it writes down with their seeds, and talks with people away from home until someone brings up a person both know and someone brings up a shared school. Each names the person and what happened to them, or the school and the years, as the records say; the replies are at most four different moves that stay on that person or school. tests/guards/english passes with the lowered count.

**Waits on.** The CTO's ruling on whether the builder drafts the `data/english/parts` lines with `Review: words` or the Story session writes them (the same question as words-opening-evening-talk-raises-what-the-president-said; PR #8715).

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, src/director/words.ts, src/director/reply-set-check.ts, src/director/conversation.test.ts, src/english/conversation-words.ts, src/core2/shared-history.ts, data/english/parts/conversation.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Planned by Fable B's Words planner (2026-11-11) from main at 5ef67361. 71 distinct lines, 22 with no insert and not excused (shared-school 29 and 10, mutual 29 and 6, asked-mutual 17 and 6). Three today: "That was a long time ago.", "I haven't seen him.", "Not for a long time." Between relatives neither subject is raised (`familyTalk.dropped`).
