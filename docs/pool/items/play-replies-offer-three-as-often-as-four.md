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
lead: words
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 5, "What the code does and what a player sees")
---

**What.** Measured by the audit on Nov 9: "Three replies as often as four. In my browser sessions, of 14 sets of replies I was offered, 7 had three choices and 7 had four. Your rule is four, always." The audit's line names no place or seed for the count; its browser life was in Blodgett Landing, New Hampshire, a random world, where one set it quotes had three: "We'll manage. We always do." "I haven't heard." "Good. That's been a long time coming." Read in code on main, Nov 10, not measured. The rule is in the data: `directorChoicesPerTurn` is 4 in `src/director/data/director.json` (line 707), citing the Oct 14 ruling. But neither composer fills a short set. In everyday talk, `rankChoices` in `src/director/conversation.ts` (line 2774) drops a second wording of a move already offered and then cuts to four, so a pool with three different moves gives three. In scenes with a purpose, `composeSceneTalk` in `src/director/scene-talk.ts` (line 465) drops a reply move that has no wording for this scene's facts, or whose line was already said, and offers what is left (lines 1412 to 1433); the arcs in `src/director/data/purpose-arcs.json` mostly list four moves a node, so one gap leaves three. Fix the cause in both composers: a turn that offers replies offers four different answers, drawing the fourth from the moves the scene allows when one drops out, and a node that cannot reach four is reported as a gap in the banks, never shown short.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the fourth reply is a bank piece chosen by the engine for that scene, never a stock line typed into code, and never a reworded copy of one of the other three. Owner, Oct 14, afternoon (OWNER-DECISIONS, "Rulings, October 14, 2026, afternoon"): "Four dynamic choices, always. A conversation always offers four replies ranked by the engine, with 'say nothing' as a smaller control beside them, never one of the four. A reply's second move follows from its first." OWNER-DECISIONS, Oct 27, afternoon (scenes have depth or they do not fire): "four replies are four different answers, never one reworded." OWNER-DECISIONS, Oct 15, evening: "The four replies each move the talk somewhere."

**Done when.** A different session starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named in the proof) and plays ten weeks with Day and Week, taking a screenshot of every set of replies offered, in scenes and in talks it starts by clicking people. Every screenshot must show four replies, with Say nothing as the smaller control beside them and not one of the four, and no two of the four may be the same answer in other words. The proof is a table: the scene or talk, its record id, the four replies. A test composes every purpose arc's nodes and a sample of everyday talks in six drawn places and fails on any offered set that is not four, naming the node and the missing move. The same ten weeks are then played in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed), as the named repro, counting sets of three (the audit counted 7 of 14). The owner plays it: every time someone speaks to him he has four different things he can say.

**Files.** src/director/conversation.ts, src/director/scene-talk.ts, src/director/data/purpose-arcs.json, src/director/data/scene-talk-rules.json, src/director/data/director.json, data/english/parts/scene-talk.json

**Notes.** From the audit's Pillar 5, measured in its browser sessions (the played life and the dev-mode sessions; the audit does not say which sessions the 14 sets came from). The ruling is recorded three more times: docs/play-first/LAW.md (lines 57 and 58 quote it), OWNER-DECISIONS Oct 27, 5:40 p.m. ("A conversation keeps four replies with Say nothing as the smaller control beside them (Oct 14)"), and the parameter's own citation. A fifth reply is allowed where the owner asked for the lie (`maxReplies` is 5 in `src/director/data/scene-talk-rules.json`, "the lie, which he asked for as a fifth reply on the purposes that allow one (Oct 15, night)"); a count of the arcs on Nov 10 found 86 nodes listing four moves, 17 listing five, one listing three and one listing none, so the short sets come from moves dropped at play time more than from the arcs. A narration beat with only Continue is not a reply set. Related claimed items: words-talk-replies-follow-move-pair-grades, words-everyday-talk-one-engine; related open: words-talk-reply-not-offered-after-one-engine. Read `.agents/skills/words-engine/SKILL.md` and `.agents/skills/scene-standard/SKILL.md` first. Not verified by the audit: which composer produced each of the 7 short sets, and which moves were dropped.
