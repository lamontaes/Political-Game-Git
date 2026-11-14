---
id: words-filing-counter-fee-is-a-node-of-the-clerk-scene
title: "The fee, the try and the refusal at the filing counter are replies in the clerk's scene, not a list of moves beside it"
area: words
kind: feature
priority: 2
size: M
status: in-pr
pr: 9348
standard: 2
after: elections-filing-fee-paid
blocked-on:
model: opus
effort: medium
root: none
source: found by the #9153 filing-fee carry thread, Nov 14, with the account lead
lead: words
---

**What.** At the filing counter the clerk's scene (`filing-clerk`, `composeSceneTalk`) tells the race in one answer, including what the office does (the `tell-duty` move, 55 bank pieces) and the day the papers are due, then offers replies. The fee, the player's try at filing, the clerk's refusal and "I'll come back with it." (#9153) are counter moves in `src/director/filing-visit.ts` that sit beside that scene, so the counter is a scene plus a list of moves, not one talk. Seen: the filing counter in a place whose race has a fee, as in South Vienna, Ohio, seed ff1:0.

**Cause.** Found in code: `pickContest`, `refusedAtCounter`, `offerComeBack` and `filedAtCounter` in `src/director/filing-visit.ts` word the fee lines with `visitLine` as separate steps (`state-tell-filing-fee`, `state-rule-filing-fee`, `state-filing-fee-paid`, `reply-come-back` in `data/english/parts/scene-talk.json`), while the tree the player walks (`clerkScene`, `followReply`) is built by `composeSceneTalk` from the `filing-clerk` arc, which has no fee node. Corrected Nov 14: an earlier version of this item said the clerk never says the office's duties; that is wrong, the clerk's answer already does (`tell-duty`), and the `filing-clerk` scene's depth passes the depth test. The depth red in `src/director/scene-talk.test.ts` ("composes a tree", expected 1 to be at least 2) is the `filing` type, the next day's petition scene, which is a different scene.

**Fix.** Make the fee part of the scene: the arc's tree gets a fee node after the race is told when `checkEligibility` returns a `filing-fee` check, with the player's replies "file" and "I'll come back with it"; a try without the fee reaches the refusal node, a paid filing reaches the paid node. `filedAtCounter`, `refusedAtCounter` and `comeBackLater` then follow the node the player is on (`followReply` already walks the path), and the separate `visitLine` steps for the fee are deleted in the same change. Where the paid line follows the clerk's "I've got you on the list", the paid piece is excluded by condition so "the list" is not said twice. No reply is added to reach a depth. The `filing` petition scene's depth is its own item.

**Time box.** 4 hours for one Opus session; the lines are the Words lead's.

**Rules.** No dice. Words come from the bank. One rule, all 56 places: no office is named in the logic, the duties come from the office record. A figure is said once.

**Done when.** A second session plays two drawn places, one office with a fee and one without, at the counter: the clerk tells the race, then (where there is one) the fee, and the whole talk is one run of the one scene with no counter step beside it; `git grep` finds no `visitLine` call for a fee move; names the places and seeds.

**Waits on.** elections-filing-fee-paid (#9153).

**Files.** src/director/filing-visit.ts, src/director/scene-talk.ts, src/bench/filing.ts, data/english/parts/scene-talk.json, src/director/data/purpose-arcs.json

**Notes.** Filed by the #9153 carry thread, Nov 14. The owner's Oct 28 item 32 (the clerk says the duties) is already met by `tell-duty`; this item is only about making the fee one talk with the scene. The account lead ruled this comes after #9153 and before petition in lieu; the fee, refusal and "I'll come back with it." lines of #9153 are the nodes it joins to the tree.

Built (Nov 14): the fee is a `tell-filing-fee` move in the `filing-clerk` arc's statement (`stateMoves`); the refusal is `follow` `refuse` after `agree`, worded only with the `fee-short` fact (the accept pieces exclude it); `come-back` is the scene's reply after the refusal (`again.refuse`), with an act-kind row in `data/content/trait-decisions.json`; the separate `visitLine` fee steps in `filing-visit.ts` are gone. The paid line stays one step after the filing is taken (it cites the filing record), and the one accept piece that says "on the list" is excluded where a fee was paid so the list is said once.
