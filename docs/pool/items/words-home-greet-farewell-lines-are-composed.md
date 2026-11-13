---
id: words-home-greet-farewell-lines-are-composed
title: "Hellos and goodbyes name the person, the last time the two met and what they talked about"
area: words
kind: bug
priority: 1
size: M
status: merged
standard: 2
claimed-by: claude/words-w3-greet-farewell
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
branch: claude/words-w3-greet-farewell
merged-at: 2026-11-11T18:59:55.068Z
---

**What.** Every talk away from home opens with a greeting and ends with a goodbye. Today the other person says one of 96 whole sentences under the bank's `greet` and `farewell` subjects ("Good to see you.", "Take care of yourself.", "I've got to run."), the same in every town and after every talk. 31 of them have four words or more and no insert. Under the owner's ruling, the short ones ("Hello.", "Bye.") stay; the rest are composed, with a core that names the person, the last time the two met, or what the talk was about. Seen: the first line and the last line of every talk box away from home, and the last line of a talk at home.

**Cause.** Found in code: `openConversation` in src/director/conversation.ts words the greeting with `words(..., "greet", "open", { statementsOnly: true }, ...)` and passes only `name` (the player's first name, when the other person knows it). `endConversation` in the same file words the goodbye with `words(..., "farewell", "leave", ...)`, passes only `name` (a family member of the player's to say hello to, from `subjectsBetween`), and uses stage `home` between housemates. Both go to `wordConversationMove` in src/english/conversation-words.ts, which picks one whole bank sentence through `renderLine`. Nothing reads when the two last met, though `lastContact` in conversation.ts already returns it, and nothing reads the talk's own topic (`conversation.topics[0]` and its subject's facts), though the goodbye is said right after it.

**Fix.**

1. **Use the opening's composer.** words-opening-evening-talk-raises-what-the-president-said makes `wordConversationMove` join a move's pieces with `composeGroundedLine` (src/english/english-composition.ts) when the move's bank parts carry a `piece` field. Read every subject's pieces through that one path. Never add a second composer.
2. **The greeting's facts.** In `openConversation`, add `when` from `lastContact(core, otherId, playerId)` worded by `spokenWhen` (src/director/words.ts), and `daypart` from the scene's minute (`dayOpening` in src/english/day-words.ts gives the same reading), each citing its record. Pass `name` as today.
3. **The goodbye's facts.** In `endConversation`, pass the first topic's own fact, read from the subject in `conversation.topics[0]`: `employer`, `school`, `place`, `topic` or `relation`, whichever that subject carries, under the slot `about-said`, cited to the subject's records. Keep `name` for "Say hello to {name}." Declare the new slots `when`, `daypart` and `about-said` in the bank's `slots` map where they are not there yet.
4. **The parts.** Greeting (`greet`, role `open`): a sentence `greet-open` with an optional opener (the short lines stay as openers, "Hello." and "Hi."), and a required core in two kinds, at least 10 wordings that name `{name}` and at least 8 that name `{when}` ("Haven't seen you since {when}."). A stranger, with no name known and no last meeting, gets a short line alone. Goodbye (`farewell`, role `leave`): a sentence `farewell-leave` with an optional opener, and a required core of at least 12 wordings that name `{about-said}` ("Good luck at {about-said}.") and at least 6 that name `{name}`. For stage `home`, at least 8 cores that name `{daypart}` ("I'll see you at supper." needs the evening mark). Every piece carries `piece` with `of`, `part` and `required` (the `words-engine` skill, "How a joined piece says so"); the insert is always in the core.
5. **The replies.** The player's answer to a greeting (`greet` `answers`, choice `fine`) and to a goodbye (`farewell` `answers`, choice `bye`) are one to three words or carry `{name}`. The scene allows one reply here; offer one or two, never two wordings of one move.
6. **What it writes back.** Nothing new: the time together is already written by `say` through `api.relationship(..., "contact", ...)`, and the next greeting reads it back through `lastContact`. Name that record id in the pull request.
7. **Delete what this replaces, with every reference.** The 31 lines with no insert under `greet` and `farewell`, except the two the owner graded good (`conversation.greet-open-hello.good-to-see-you` and `conversation.farewell-leave-bye.take-care-of-yourself`), which become openers of the new sentences and keep their grade rows. A piece that also serves another subject loses only its `greet` or `farewell` use. Then `npm run words:grade`, and `npm run words:rules` twice.
8. **Lower the guard's count** for `conversation` in tests/guards/english/line-inserts-baseline.json to what the test asks for.
9. **Tests.** In src/director/conversation.test.ts, on drawn places: a second talk between the same two people opens with a line naming the last meeting; a talk about work closes with the employer named; at home, an evening goodbye never names the morning. Over 100 talks in one world, at least 30 different greetings and 30 different goodbyes are said. Run tests/guards/english and the bank tests yourself.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: every word is a bank part, composed by the engine. No dice: which wording plays follows the records and the speaker's traits through `renderLine`'s stable hash, never a draw. One rule, all 56 places: nothing names a place, and the tests draw their places. A line that names the time of day plays only when the scene's minute makes it true (`scene-standard`, the time-of-day marks).

**Done when.** A second session, in the running game on main at 1440x900, starts three new lives in drawn places it writes down with their seeds. In each, it talks to the same person twice on different days away from home, and the second greeting names when they last met; each talk's goodbye names what the talk was about or someone the player knows. The three lives share no greeting of four words or more. `git grep -n "I've got to run" -- data/english/parts` returns nothing, and tests/guards/english passes with the lowered count.

**Waits on.** The CTO's ruling on whether the builder drafts the `data/english/parts` lines with `Review: words` or the Story session writes them (the same question as words-opening-evening-talk-raises-what-the-president-said; PR #8715). Until then, the builder builds the code steps and lists the lines it needs in its pull request.

**Files.** src/director/conversation.ts, src/english/conversation-words.ts, src/english/english-composition.ts, src/english/day-words.ts, src/director/words.ts, src/director/conversation.test.ts, data/english/parts/conversation.json, data/english/part-grades.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Planned by Fable B's Words planner (2026-11-11) from main at 5ef67361. Counts are distinct bank parts with a `greet` or `farewell` use: 96 lines, 31 with no insert and not excused (greet 47 and 7; farewell 53 and 26; six parts serve both or another subject). Three today: "I've got to run.", "Have a nice day.", "Let me know if you need anything."
