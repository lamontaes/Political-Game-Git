---
id: words-home-family-kin-lines-are-composed
title: "Asked after a relative, people say what happened to them by name, place and work"
area: words
kind: bug
priority: 1
size: M
status: merged
standard: 2
claimed-by: claude/words-w4-family
pr: #8801
after: words-opening-evening-talk-raises-what-the-president-said
blocked-on:
lead: words
model: opus
effort: medium
root: rc4-hand-written-words
source: owner, Nov 11, 2026 (docs/coordination/OWNER-DECISIONS.md, "Nov 11: every line goes through the English engine"); planned for Fable B from a read of main at 5ef67361
checked:
claimed-at:
branch: claude/words-w4-family
merged-at: 2026-11-11T16:20:49.717Z
---

**What.** In the first days at home and with neighbors, people ask after each other's relatives ("How's your mother?") and mention relatives the player has not met. The question already names the person, but the answers are often fixed: "He's in the hospital.", "My father passed away.", "She's doing well. I'll tell her you asked.", "I don't think so." 13 of the 50 lines under the bank's `family` and `kin` subjects have no insert. Seen: the talk box when someone asks after a relative or brings up one of their own, and the player's replies.

**Cause.** Found in code: in src/director/conversation.ts, `subjectsBetween` raises `family` (the speaker's relative the listener knows) with `relation` and `name`, plus the facts and stage of `familyNews`: the relative's latest happening, staged `ill`, `moved`, `job` or `baby` by `familyNews.stages` in src/director/data/conversation-rules.json, with `place` for a move and `employer` for a new job. The `ill` and `gone` stages pass no fact about the illness or the death, though the moment that set the stage is the health or death record. `kin` (a relative the listener has not met) passes `relation` and `name` and nothing about the relative's life, though their town (`placeId`) and job (`jobOf`) are on record. `playerFacts` gives `housemate` for a `kin` relative who lives with the player.

**Fix.**

1. **Use the opening's composer.** words-opening-evening-talk-raises-what-the-president-said makes `wordConversationMove` (src/english/conversation-words.ts) join pieces that carry a `piece` field with `composeGroundedLine`. Use that path; never a second one.
2. **The facts.** In `familyNews`, for `ill`, add `when` (the health moment's date, by `spokenWhen` in src/director/words.ts); for a death, `when` the same way. For `kin`, add `place` (the relative's town when it is not the speaker's, with `spoken`) and `employer` (their job through `jobOf`), each citing its record. Declare any new slot in the bank's `slots` map.
3. **The parts.** `family` answers by stage, each a sentence with a required core that names `{name}` or `{relation}` and an optional reason that names the happening's fact: `well` (at least 8 cores, naming `{name}`), `ill` (at least 6, with `{when}`), `gone` (at least 6, with `{when}`), `moved` and `job` (already carry `{place}` and `{employer}`; add 4 each). `kin` raise: a core naming `{relation}` and `{name}` with a reason naming `{place}` or `{employer}` (at least 8 reasons). Every piece carries `piece` (`of`, `part`, `required`).
4. **The replies.** Up to four, each a different move about the relative: ask after them by name (`how`), say you have or have not met them (`is` or `not`, the `not` answers rewritten to name `{name}`: "I don't think I've met {name}."), ask where they live now (answered by `place`), and thanks or comfort by stage. `expectUpToFourDifferent` (src/director/reply-set-check.ts) passes on each set.
5. **What it writes back.** Give the `kin` subject an `own` the way `own-work` has one (`{ key: "person:<relativeId>:relation", value: <the relation> }`), so `say` records it through its existing `tell` (the `conversation.told` event, `data.toldEvent`) when the player answers it: the player then knows who the relative is to the speaker, and the next talk asks after them by name instead of introducing them again (`kin` is raised only for a relative the listener does not know). No new record kind. Name the record id in the pull request.
6. **Delete what this replaces, with every reference.** The 13 lines with no insert under `family` and `kin`; a piece that also serves another subject (4 do) loses only those uses. None is graded good. Then `npm run words:grade` and `npm run words:rules` twice.
7. **Lower the guard's count** for `conversation` in tests/guards/english/line-inserts-baseline.json.
8. **Tests.** In src/director/family-news-talk.test.ts, on drawn places: an ill relative's answer names when they fell ill; a relative who moved names the place; a `kin` mention names the relative's town or work when they live elsewhere or work; the replies pass `expectUpToFourDifferent`. Run tests/guards/english and the bank tests yourself.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code. Ask why: a line that names an illness, a death or a move cites the record that set its stage. No dice. One rule, all 56 places: the tests draw their places. One screen names a thing once (lead, Nov 11, from the reviews of PR 8736 and PR 8750): wherever this item says each reply names the same thing, read it as each reply carries an insert, no two replies on one screen carry the same insert, and the speaker's own line names the thing once and then says "it". Say an office, a bill or a person the way people say it, never a form's title and never a parenthesis.

**Done when.** A second session, in the running game on main at 1440x900, starts three new lives in drawn places it writes down with their seeds, and talks with neighbors and relatives until someone is asked after a relative and someone mentions one the player has not met. Each answer names the relative and what happened to them (a place, a job or a date) as the records say, and the replies are at most four different moves, each naming the relative. tests/guards/english passes with the lowered count.

**Waits on.** The CTO's ruling on whether the builder drafts the `data/english/parts` lines with `Review: words` or the Story session writes them (the same question as words-opening-evening-talk-raises-what-the-president-said; PR #8715).

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, src/director/words.ts, src/director/reply-set-check.ts, src/director/family-news-talk.test.ts, src/english/conversation-words.ts, src/core2/closeness.ts, data/english/parts/conversation.json, tests/guards/english/line-inserts-baseline.json

**Notes.** Planned by Fable B's Words planner (2026-11-11) from main at 5ef67361. 50 lines, 13 with no insert and not excused (family 33 and 8, kin 17 and 5). Three today: "He's in the hospital.", "My father passed away.", "I don't think so." The relatives' own lives outside the town come from the `lives` skill's engines; this item only reads them.

- 2026-11-11, Words builder W4: built on claude/words-w4-family, stacked on claude/words-w4-work. No line raised a relative the listener had not met before this (the `kin` subject had no raise line), so it never played; it now does, with a husk relative's town too. The `where they live now` reply is not built: the raise already names the town or the work.
- 2026-11-11, Words builder W4: "a relative asked after" seen in plain play (no dev routes, 1440x900) in two drawn places: Port Republic, Virginia (seed w4seed-u, day 18): "How's Dad?" / "Dad started feeling poorly a few days ago.", with the illness on record; Fairhaven, California (seed w4seed-k, day 12): "How is Mom?" / "Thank you for asking. I'll let Mom know.", nothing on record to tell. The third place is owed; a second session doing this item's seen check can supply it. Picture: docs/seen/words-nov11/w4-family-talk/w4seed-u-asked-after-dad.png on claude/words-w4-school.
