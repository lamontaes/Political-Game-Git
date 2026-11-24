---
id: play-replies-offer-three-as-often-as-four
title: "Half the reply sets offer three choices: of 14 sets in the audit's browser sessions, 7 had three and 7 had four, against the owner's rule of four always"
area: words
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
standard: 2
model: opus
effort: high
root: rc4-hand-written-words
lead: words
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 5, "What the code does and what a player sees")
checked: fable 2026-11-10
claimed-at:
branch: claude/fable-four-replies
---

**What.** The audit measured on Nov 9 that of 14 sets of replies offered in its browser sessions, 7 had three choices and 7 had four, against the owner's rule of four always (its browser life was in Blodgett Landing, New Hampshire; the count names no seed). The rule is in the data, but neither composer fills a short set. A second session on Nov 10 also saw a set of four that was one answer worded four ways (Grandville, Michigan, seed c163aaf0-16e5-460f-872e-56f2b65d2412): "I'm from Grandville. And you?", "I grew up here.", "I'm from Grandville.", "Here in Grandville." Fix both: a turn that offers replies offers four different answers, drawing the fourth from the moves the scene allows when one drops out, and a node that cannot reach four is reported as a gap in the banks, never shown short.

**Cause.** Found in code: `rankChoices` in src/director/conversation.ts (line 2775) drops a second wording of a move already offered and then cuts to four, so three different moves give three; `composeSceneTalk` in src/director/scene-talk.ts (line 465, lines 1412 to 1433) drops a reply move with no wording for the scene's facts; `directorChoicesPerTurn` is 4 in src/director/data/director.json (line 707); and the subject `home-new` in data/english/parts/conversation.json has four keys that all give one answer, because the Oct 27 fix keeps one reply per move key, not per meaning.

**Fix.** Give each reply move a meaning group in the data so "different" is something a test can read, make both composers fill to four different groups from the moves the scene allows, report a node that cannot reach four as a bank gap, and add moves to the everyday subjects that have only one meaning (Story writes the lines; one writer per bank file). Read `.agents/skills/words-engine/SKILL.md` and `.agents/skills/scene-standard/SKILL.md` first. The words machine will carry this as a rule that reads the four together; this item does not wait for it.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the fourth reply is a bank piece chosen by the engine for that scene, never a stock line typed into code and never a reworded copy of another of the three. Owner, Oct 14 (OWNER-DECISIONS): "Four dynamic choices, always." with "say nothing" as a smaller control beside them, never one of the four. Owner, Oct 27: "four replies are four different answers, never one reworded." Simulate it, don't ask: no question goes to the owner.

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named), plays ten weeks with Day and Week and takes a screenshot of every set of replies offered, in scenes and in talks it starts by clicking people. Every screenshot shows four replies with Say nothing as the smaller control beside them, and no two of the four are the same answer in other words; the proof is a table of the scene or talk, its record id and the four replies. A test composes every purpose arc's nodes and a sample of everyday talks in six drawn places and fails on any offered set that is not four, naming the node and the missing move. The same ten weeks in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed) count the sets of three (the audit counted 7 of 14), reported beside the new count.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/director/scene-talk.ts, src/director/data/purpose-arcs.json, src/director/data/scene-talk-rules.json, src/director/data/director.json, data/english/parts/scene-talk.json, data/english/parts/conversation.json

**Notes.** From the audit's Pillar 5, measured in its browser sessions (the played life and the dev-mode sessions; the audit does not say which sessions the 14 sets came from). The ruling is recorded three more times: docs/play-first/LAW.md (lines 57 and 58 quote it), OWNER-DECISIONS Oct 27, 5:40 p.m. ("A conversation keeps four replies with Say nothing as the smaller control beside them (Oct 14)"), and the parameter's own citation. A fifth reply is allowed where the owner asked for the lie (`maxReplies` is 5 in `src/director/data/scene-talk-rules.json`, "the lie, which he asked for as a fifth reply on the purposes that allow one (Oct 15, night)"); a count of the arcs on Nov 10 found 86 nodes listing four moves, 17 listing five, one listing three and one listing none, so the short sets come from moves dropped at play time more than from the arcs. A narration beat with only Continue is not a reply set. Related claimed items: words-talk-replies-follow-move-pair-grades, words-everyday-talk-one-engine; related open: words-talk-reply-not-offered-after-one-engine. Read `.agents/skills/words-engine/SKILL.md` and `.agents/skills/scene-standard/SKILL.md` first. Not verified by the audit: which composer produced each of the 7 short sets, and which moves were dropped.

**Seen, Nov 10 (CTO).** A second session's screenshot on main (`docs/seen/pr-8137-back-to-the-counts/2-talk-with-anthony-mcdaniel.png`; Grandville, Michigan, world seed `c163aaf0-16e5-460f-872e-56f2b65d2412`, main 9478f160): Anthony McDaniel asks "Where are you from?" and the four replies are "I'm from Grandville. And you?", "I grew up here.", "I'm from Grandville." and "Here in Grandville." That's four, but one answer said four ways. The owner, Nov 10: "these are familiar problems. These are not new problems." Why it is back (read in code, not run): the Oct 27 fix (#6412, 13e94a88, "A conversation never offers a second wording of a reply already offered") keeps one reply per bank move key in `rankChoices`, not per meaning. In `data/english/parts/conversation.json` the subject `home-new` has four answer keys (plain "I'm from {place}.", always "I grew up here.", brief "Here in {place}.", turn "And you?") that all give the same answer. It has no move that adds a detail from the player's record, deflects, or changes the subject. Earlier, #4469 (Oct 16, words-replies-continue) filled short sets with "another wording of a real answer", the opposite of the rule. `answersTo` in `src/director/data/conversation-rules.json` names fitting moves for one question only (news-ask-think). So the fix is two parts. First, give each move a stated meaning group in the data, so "different" is something a test can read, and fill four from different groups. Second, add moves to the everyday subjects that have only one meaning. The words machine (#8117, #8124) is asked on #7365 to carry this as a rule that reads the four together; this item does not wait for it.

**Notes (Fable's check, Nov 10).** A build of this is under way on branch `claude/fable-four-replies` (not yet a pull request). Claiming this item takes that branch over; read its last commits first.

**Notes (owner's ruling, Nov 10).** The owner changed the reply count: 'So just up to 4.' A short set is no longer a defect. Stop the half of this item that fills every set to four. Keep the other half: meaning groups in the data, so a test can tell the offered replies are different answers.

Released by next (2026-11-13): no push to claude/fable-four-replies since 2026-11-10 19:22 UTC, more than twice its 8-hour time box. Continue on branch claude/fable-four-replies.
