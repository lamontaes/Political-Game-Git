---
id: story-lines-office-press-and-pressure
title: "A pressed bribe, a reporter's comment call, a scandal call and an accusation play again in office"
area: words
kind: feature
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: Story lead, Nov 19 00:45Z on the Story thread (issue 9750), from the triage of the cut's reds (#10063)
checked:
---

**What.** Five scenes an officeholder meets lost their lines in the cut of Nov 17:

- someone presses a bribe (the "begging" arc of `bribe-pressed`);
- a reporter calls for a comment (`press-comment`);
- a reporter calls about a scandal or a conflict on an award (`scandal-comment`);
- someone accuses the player in front of a witness (`conflict-accuse`);
- a member asked again for their vote says they were asked before.

Each stages from its record and plays as a journal line. Seen: a term in office, when the paper and the people around the player push.

**Cause.** Measured: on the cut (#10063, head 2d057529e6), these fail while the same seeds pass on train/nov17b, each with "no narration ... can be worded from the records given" or a skipped arc:

- `src/director/arc-variant.test.ts` (2 cases);
- `press-comment-variants.test.ts`;
- `scandal-call-printed.test.ts` (5 cases);
- `accusation-variants.test.ts`;
- `ask-before-the-roll.test.ts`;
- `vote-asked-again.test.ts` at Banks, ID.

Each is shown by `npx vitest run <file>` on the cut.

**Fix.** Write the five scenes' lines in data/english/parts/scene-talk.json and their narration, from their patterns in docs/story/scene-patterns.json, placed by the facts their packets set: the bribe and its stake, the outlet and the story, the award and the conflict, the witness. Take each test's `it.fails` mark off as its scene composes.

**Time box.** 4 hours, in two writers' rounds.

**Rules.** No hand-written player text in code: every line is a bank row. The player says only what they chose, so no reply promises an act the engine does not record (scene-standard rule 12). Narration says what is seen or what a record holds, never a want or a reason.

**Done when.** A second session, in a drawn place and seed in the running game (dev mode allowed), plays a reporter's call and an accusation in office, each from its record. The seven test files above pass with their `it.fails` marks off, and every new reply pair and narration has a verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/arc-variant.test.ts, src/director/press-comment-variants.test.ts, src/director/scandal-call-printed.test.ts, src/director/accusation-variants.test.ts, src/director/ask-before-the-roll.test.ts, src/director/vote-asked-again.test.ts

**Notes.** Nov 19 (Story): filed from a Sonnet triage of each red file on the cut and on the train at one seed.

Nov 19 (Story, from Fixer A on #9750 at 07:14Z): the recall scene (`recall-confront`) also comes back with this item, and it needs an opening for a recall over misconduct, not only over a vote. The engine starts recalls for misconduct (`cause: "misconduct"` in src/core2/modules/recalls.ts), but the `recall-petition` event's facts carry no cause, only `lawId` (the misconduct event's id) and no `billId`. So the packet must first say it: in `purposeScene` (src/director/purpose-scene.ts), read the recall row by `recallId` (`recallsOf`) and set `misconduct`, plus `charged` when the cause is a `justice.charged` event or `exposed` for an exposure, each citing the row. Then write the openings on those facts, and keep the {bill} openings for a vote.
