# Saying why a conversation is unavailable

Published early, small on purpose, and written for D, who owns the guardian
conversation producers. This is UI (#144) stating what the shell now does with
a refusal, so the producers can be written against it rather than around it.

Branch `codex/ui-core-release-transfer`.

## What the shell does now

The room asks `openConversationWith(world, playerId, personId)` when a person is
selected, before rendering their action menu, and keeps the whole entry:

```ts
const talkEntry = actionPerson
  ? openConversationWith(session.world, session.personId, actionPerson.personId)
  : null;
```

An entry of `kind: "unavailable"` disables Talk **and prints `entry.reason`
beside it**, as an element the disabled button points at:

```
<button data-testid="action-talk" disabled aria-describedby="pg-action-talk-reason">
<p id="pg-action-talk-reason" data-testid="action-talk-reason">{reason}</p>
```

`aria-describedby` is how this reaches a screen reader: a disabled button is not
focusable in every browser, and a reason no one can hear is not a reason given.

## What that asks of a producer

Only this: **when the answer is no, the reason is the sentence the player
reads.** It is already player-facing prose — it was simply never displayed, so a
refusal reached the player as a greyed-out button and nothing else.

So a reason should:

- say what is true of this world right now, in the second person, ending in a
  full stop — "There is no conversation established with Derek Thomas here yet."
- name the person where naming them helps, from canonical truth, never from a
  filename or a label;
- never carry an id, a key, a symbol name or a developer note; and
- never promise a route the game does not have. "Not yet" is honest; "try again
  later" is not, unless later really does change it.

A refusal is not a defect and does not need softening. A truthful "no" is a
finished answer for the refusal itself — it is not, on its own, the guardian
conversation D is building, and UI is not treating it as one.

## What UI will not do

Not rewrite a reason, not substitute a friendlier one, not suppress a reason it
finds ugly, and not infer a refusal the producer did not return. Whatever
`openConversationWith` says is what the room says. If a reason reads badly to a
player, that is a note back to D about that string, not a patch in the shell.

## Where it is proven

`tests/e2e/ui-core.spec.ts` and the UI9-03 review run under
`docs/agent/evidence/ui903-people-in-the-room/`. In that run's seed the
conversation was available, so no reason was due and none was printed; a
child-guardian seed shows the refusal and its wiring.
