---
id: scene-close-reads-what-the-last-reply-did
title: "A scene's closing line reads what the last reply did, so a refusal is not thanked"
area: director
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Words builder A, Nov 14, 2026, from #9247 and the readers' notes"
model: opus
effort: medium
root: none
---

**What.** The closing line of a scene is drawn without regard to the reply before it, so a refusal gets thanked. Seen: Royal Kunia, Hawaii: 'I won't give you more to carry.' then 'Thank you for answering, Dylan.' North Clarendon, Vermont: 'I'll answer it there, not out here.' then 'Thank you for hearing me out, Noor.' #9290: 'Thank you. I'm glad we talked.' after being put off; the Words lead found the same in the committee study scenes. Seen: a scene where the player is refused or put off ends on a close that fits it, never a thanks.

**Cause.** Found in code: src/director/scene-talk.ts, `closeFor` picks a close from `ARCS.close[outcome]` (src/director/data/purpose-arcs.json, `close`) by `outcomeOf(move)`, which has only three outcomes (resolved, refused, open), filtered by `sceneMoveFits` and a hash order; a reply that refuses with a reason or puts the person off is classed `open` or `resolved` and gets a thanks. The close is not gated by what the last reply's piece set.

**Fix.** Make `closeFor` (and `endNode`, next to the `needsAnswer` helper #9290 adds) read what the last reply did (gave, refused, put off, left) from what its piece sets (a `setsFacts`/outcome on the reply piece in data/english/parts/scene-talk.json, not a second classification in code), and make only closes that fit that result eligible. No per-scene patches, no new lines: where a kind of ending has no fitting close at all, list the gap for the Words lead. Builds on #9290 and on the 'Write the stages of a bill' builder's change to the reply loop in scene-talk.ts; take the later PR on the lines they share.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: one scene engine's close serves every scene, and the old per-outcome pick is deleted in the same change. One engine per mechanic: the one scene engine's close, every scene. Replace, never layer. A line is never changed only to pass a guard.

**Done when.** A second session, in a drawn place with its seed named, plays the case on main through the screens a player reaches and sees the result in the player's words, by record id.

**Waits on.** nothing.

**Files.** src/director/scene-talk.ts, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json

**Notes.** Nov 14, Account lead, from the Words lead's ruling /mnt/project-files/words-lead/letters/ruling-leave-by-letter.md: (1) the rule widens by one case for every scene: no follow presses a leave. After the player leaves, the other person does not press or ask ("Can I count on that? I'd like to plan around it." after a leave in the letter-ask scene, M5 pair 0vup7u7bzqj, is the played case to pin). Fix it in the engine rule, not with an excludes on that pair. (2) In the same PR, the letter-ask leave line "I'd rather not settle this by letter. I'll write back." becomes "I'd rather not settle this by letter." with nothing after it (it promised an answer no record keeps open); the changed line goes to M5. Builds on #9290 (`needsAnswer`, `RULES.answerMoves`, endNode) and waits for the stages-of-a-bill builder's reply-loop PR; that builder does not touch closeFor or endNode. The #9328 builder's study-committee endings (claude/carry-7965 d49b6fb3) are data only and agree with this rule; once it is on the train, their per-arc `when` can be deleted.
