---
id: scene-replies-placed-by-what-was-said
title: "A scene's lines are placed by what was asked and what the record says, so no reply contradicts the player's vote, a why gets a reason and a sharp reply is earned"
area: words
kind: bug
priority: 1
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Owner, Nov 14 22:17Z to 22:19Z (the reporter's call, "This is all feedback for the words engine or story"); Words lead rules 110 to 114
claimed-at:
---

**What.** The owner played the reporter's call after a council vote. After "You voted against it. Why?" he was offered replies that restate the question, a scolding nobody earned, and "I never had a problem with the ordinance." The game today (train 2190669e, Gilbert, Iowa 1930630, seed reporters-call-1) still offers "I support it. It's good for Gilbert." as the first answer after a no vote, and "They'll see when I vote." after the vote is over. Seen: in any scene, every line offered fits what was asked and what the record says the player did.

**Cause.** Found in code: `useFit` in src/english/scene-talk-words.ts places a piece by step, move, role, purpose, key, `after` and the piece's own `requiresFacts` / `excludesFacts` only. Nothing on the scene's packet says what the asked person did on the bill (only a vote cause set `voted-yes` / `voted-no`, and only for that cause), how it went, or why; and 2,358 of 3,065 player reply uses in data/english/parts/scene-talk.json require no fact (745 of them leave, confront, deflect or refuse). The bank serves the call before a vote and after it, for and against, so a reply placed by nothing fits nothing.

**Fix.** One PR per rule, in order. (113) src/director/vote-stand-facts.ts: any scene whose cause names a bill the asked person voted on (or the bill that enacted its law) carries `acted`, `voted-yes` / `voted-no`, `bill-passed` / `bill-failed`, `body` and `reason-*` (the floor's own `publicReasons`, all of them, plus a trade taken and their last vote) and `against-people`; a signature or a veto sets `acted`; `bill-cuts` from the bill's sections. Lines that state a side, wait on a vote, or say a bill works carry the fact they need. (110) the opener says what just happened, from those facts (Words lead's lines). (111, 112) facts set as lines are said (#9292's `setsFacts`): the question's kind, `pressed`, `gave-reason`, `reported-act`; a why is answered by a reason or a plain decline; a sharp reply needs `pressed`, `tie-rival` or `printed-against`. No new mechanism: the existing fit reads the facts.

**Time box.** 8 hours over the three PRs for one Opus session at medium. When it runs out, push what passes and set the state honestly.

**Rules.** Ask why: every line offered is placed by a fact that cites the record behind it. No dice: the record and the talk place a line, never a draw. No line changed only to pass a guard; new or reworded lines come from the Words lead; changed talks go to M5 as sheets; a played file at the exact head for the reader. Tests pinned to a named place and seed.

**Done when.** A second session plays the reporter's call after a no vote and after a yes vote in two drawn places and finds no line that contradicts the vote, the opener says what just happened, every why offers at least two true reasons and a decline, and no sharp reply is offered at a first plain question; the same holds for a recall petition and a neighbor's argument about a law.

**Waits on.** #9290 and the stages builder's piece-pick fix (file order in scene-talk.ts and scene-talk-words.ts); #9292 for the facts set during a talk.

**Files.** src/director/vote-stand-facts.ts, src/director/floor-debate-facts.ts, src/director/purpose-scene.ts, data/english/parts/scene-talk.json

**Notes.** Cases sent by other threads: /mnt/project-files/words-lead/reporters-call/cases-in-class.md (door promises after a bare no; "Somebody had to." after a view; a fee bill asked why it cuts a program, Fairfield OK, seed 14fecd05-cd2a-4dbf-9bdc-c52c9a54e162).

Released by next (2026-11-18): no push to Account lead builder (thread "Fix the reporter's call scene") since 2026-11-15 00:00 UTC, more than twice its 8-hour time box.
