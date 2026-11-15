---
id: words-door-resident-asks-before-signing
title: "At a signature door, a resident can ask what signing does before they sign"
area: director
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-words-machine
source: Words lead (Nov 15, 02:35Z), after the door scenes builder took the unreachable signature-door asks out in #9288
---

**What.** At a door where the player asks for a petition signature, the resident only ever answers yes or no. They never ask what signing commits them to, whether their name is public, or whether it binds their vote. The owner asked tonight for more at the door, so a resident who asks back belongs in that work, with an outcome that follows from the answer. Seen: at a signature door, a cautious resident asks what the signature does, the player answers from the petition's record, and the resident signs or does not.

**Cause.** Design: docs/design/words-machine.md. Found in code: the door scene answers first from the petition record, and in src/director/scene-talk.ts (line 699) a resident's own question is reached only through the asks path, where `asksFirst` is set only by the serve ask (line 1002). So the generic replies path with move "ask" never plays at a signature door: 0 of 50 doors in the #9288 replay. The four resident asks there (including reply-ask.what-does-signing-commit-me-to) were deleted in #9288 for that reason.

**Fix.** Let the signature door offer the asks path when the resident's own record makes a question likely (no signature yet, guarded or careful traits, a petition they have not seen). The answer is read from the petition and filing records: the signature puts the candidate on the ballot, it does not bind a vote, and whether signer names are public in that place comes from the place's filing rules in data. The resident's choice after the answer reads the same record. The Words lead writes the ask and answer lines; the builder wires the path and the facts.

**Time box.** 3 hours, Sonnet.

**Rules.** No hand-written player text: the ask and answer come from the bank, and every fact the answer says comes from the petition or filing record. One rule, all 56 places: whether names are public is place data, never a named state in logic.

**Done when.** A played file of the played world at three drawn places, headed with the sha, shows a resident asking before signing at a signature door, the player's answer naming facts from the petition record by record id, and the resident's choice after it; tests/english-answerable-asks.test.ts stays green with the new ask. A second session sees it in the game.

**Waits on.** Nothing.

**Files.** src/director/scene-talk.ts, src/director/doors.ts, src/director/purpose-scene.ts, data/english/parts/scene-talk.json

**Notes.** Filed by the door scenes builder (thread "Write more door scenes"), Nov 15, at the Words lead's word. For the "Build out many more scenes" work.
