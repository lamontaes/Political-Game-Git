---
id: words-hearing-chair-title-and-yes
title: "A hearing chair is addressed by title and answers a yes"
area: words
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: words
source: story/restore-liked-lines, Nov 8 (a rewrite never deletes a line the owner graded good)
claimed-at:
after:
standard: 2
model: sonnet
effort: medium
root: rc4-hand-written-words
checked: fable 2026-11-10
---

**What.** Three lines the owner graded good sit in data/english/parts/hearing.json under stopgap SG-WORDS-hearing-no-reader: "Thank you, Chairman.", "Thank you, Mr. Chairman." and "Yes, thank you.". The witness scene (hearing-witness) opens after the testimony, on the way out, so no scene speaks to the chair, and nothing carries the chair's title, so a title line would say Chairman to any chair, and none of the chair's questions is a yes-or-no one. Open the witness scene in the hearing room at the witness's turn, with a chair-title fact from the chair's office record and a chair question a yes answers, and read the three pieces there.

**Cause.** Found in code: data/english/parts/hearing.json holds the three owner-graded pieces under stopgap SG-WORDS-hearing-no-reader (src/director/data/stopgaps.json, line 448); the hearing-witness scene type (src/director/data/situation-types.json, line 4812) and its witness-stake purpose (src/director/data/purpose-arcs.json, line 4316) open on the way out of the hearing, carry no chair-title fact and give the chair no question, so nothing reads them.

**Fix.** Add a chair-title fact read from the chair's seat and person record (a woman chair never gets "Mr."), and a chair question that a yes answers, so the three pieces play from the scene; then resolve the stopgap.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the title comes from the chair's recorded seat and person, never typed per place. One rule, all 56 places: no state, city or GEOID in logic. No hand-written player text: the lines are the bank pieces hearing.thanks.thank-you-chairman, hearing.thanks.thank-you-mr-chairman and hearing.answer.yes-thank-you; a rewrite never deletes a line the owner graded good (Nov 8).

**Done when.** A second session, not the builder, plays or replays a hearing-witness scene in a drawn place from all 56 (place and seed named in the PR body). With a man as chair the witness can say "Thank you, Mr. Chairman."; with a woman as chair the witness never does; and when the chair asks a question a yes answers, "Yes, thank you." plays. A test beside src/director/hearing-witness.test.ts (removed) names the scene and the chair's record ids, and SG-WORDS-hearing-no-reader is deleted from src/director/data/stopgaps.json.

**Waits on.** words-hearing-chair-question, which adds the chair's question parts to data/english/parts/hearing.json. This item adds only the chair-title fact and the yes-or-no kind of question on top of those parts, so the bank gets one set of chair questions.

**Files.** src/director/purpose-scene.ts, src/director/data/purpose-arcs.json, src/director/data/situation-types.json, src/director/data/stopgaps.json

**Notes.** Added Nov 8 by the Story session with the restore of the owner's liked lines (`scripts/dialogue-batch/liked-lines-kept.test.ts`). The graded keys stay in a bank until a scene reads them.

- Dropped Nov 12, 2026 by the story builder for the lead (Fable A): its scene was deleted with the scene inventory (docs/design/scene-inventory.md, branch claude/story-scene-inventory); the scene's reply was read by no engine.
- Reopened Nov 16, 2026 by the story builder for the Account lead: the line register (words-line-register-leftovers) lists hearing.json as good lines waiting for a reader, and the owner's Nov 8 ruling keeps them, so the reader is now the hearing-witness scene that exists on main.
