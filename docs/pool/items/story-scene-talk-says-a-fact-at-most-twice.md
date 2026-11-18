---
id: story-scene-talk-says-a-fact-at-most-twice
title: "A scene talk names the same fact at most twice"
area: words
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/story-scene-talk-says-a-fact-twice
pr: 10156
after:
blocked-on:
lead: story
model: opus
effort: medium
root: none
source: Story lead's played-world proof of #10138, Nov 18
checked:
---

**What.** In a scene talk, once a fact like how long two have been together or the workplace is on the packet, nearly every line names it. A breakup said "about fifty years" in the statement, all four replies and two answers; a layoff said "at the restaurant" in four of four replies. Seen: any scene talk whose packet carries a rich fact, such as a breakup, a layoff or a funeral.

**Cause.** Measured: the played breakup at Ten Sleep, WY (place 5675790, seed 0d8f47a0e8c167bf1654, cause `family.separated:partnership_d220388866e3ac55:2025-02-19`) and the played layoff at Lyman, UT (place 4946410, seed 328eed2af3b8c3039130). The most specific wording wins (`wordSceneMove` in src/english/scene-talk-words.ts): a piece that requires one more fact outranks every piece with fewer whenever that fact is set, so every spot with such a wording uses it.

**Fix.** The composer counts each fact's text in what the talk has said so far, plus the replies already on the screen. A candidate that would say a fact a third time ranks below the best one that does not; where none avoids it, the best one stands. The approach copies the conversation engine's "one screen names a thing once" rule with a ceiling of two.

**Time box.** 2 hours.

**Rules.** The owner's padded-name rule (Nov 14) holds for every fact: a slot is said where a speaker would really say it, at most twice a talk. Most specific still wins among wordings that do not repeat.

**Done when.** A second session, in a drawn place, plays a breakup or a layoff whose packet carries the rich fact, and no fact's text is said in more than two lines of a screen where a wording without it fits; the scene-talk test passes.

**Waits on.** Nothing.

**Files.** src/english/scene-talk-words.ts, src/director/scene-talk.ts, src/director/scene-talk-said-twice.test.ts

**Notes.** Nov 18 (Story): built by an Opus helper. The layoff's reply, follow and close spots still need wordings without the workplace for the rule to bite everywhere; those lines go on #10138.
