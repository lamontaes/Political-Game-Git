---
id: story-quarrel-scenes-name-their-cause
title: "The argument, the apology and the reconciliation can say what the falling-out was about"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: opus
effort: medium
root: none
source: Story lead, Nov 18, from the bank 5 writer's report (claude/story-lines-home-bank5-rest)
checked:
---

**What.** Three home scenes stage from records but cannot be written: a neighbor confronts the player (`argument`), someone owed an apology asks for it (`apology`), and someone the player fell out with reaches out (`reconciliation`). Their packets carry only the people, the town and the tie flags, so no line can say what happened between the two. Seen: the evening at home after a falling-out, as a scene with lines instead of a journal line.

**Cause.** Found in code: `composeBinding` in src/director/purpose-scene.ts has no block for these causes. `argument` and `reconciliation` stage from a tie turn (`labelPrefix: "tie:"`, `threadTurn` soured or grew, src/director/data/situation-types.json), and no fact names the record that turned the tie. `apology` stages from `family.quarrel` (src/core2/modules/quarrel.ts), whose `missedId` names the credit engine's missed payment and its `loanKind`. `paymentSaid` (src/english/payment-words.ts) names only the `personal` kind, and promise-talk relies on it returning null for the rest.

**Fix.** Add a quarrel facts function beside letterFacts in src/director. For `apology`, it names the payment from the missed payment's loan kind, through a wording row for every loan kind in data/english/payment-words.json, kept apart from the promise rule's named kinds. For `argument` and `reconciliation`, it names what turned the tie: the ledger moment's cause record behind the soured turn, as the scene's `happened` fact. Then the Story session writes the three scenes' lines, and their keys leave `CUT_PURPOSES` in src/director/scene-talk.test.ts.

**Time box.** 3 hours for the facts. The lines follow on their own branch.

**Rules.** Ask why: a line that says what the quarrel was about cites the record that holds it. No dice: the scenes stage only from records the engines wrote. Simulate it, don't ask: what the quarrel was about comes from the credit and tie records, never a picked reason.

**Done when.** A second session, in a drawn place and seed in the running game (dev mode allowed), sees a played year stage an `apology` scene whose packet names the missed payment, and an `argument` or `reconciliation` scene whose packet names the record that turned the tie. Each fact cites its record id, and the three keys leave `CUT_PURPOSES` with scene-talk.test.ts passing.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/director/quarrel-facts.ts (new), data/english/payment-words.json, src/director/scene-talk.test.ts

**Notes.** Nov 18 (Story): filed from the bank 5 writer's probes at Rockville, IN (seed "p1"), where staged `family.quarrel` and tie records gave packets with no cause fact.
