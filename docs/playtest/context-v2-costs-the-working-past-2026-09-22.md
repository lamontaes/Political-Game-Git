# `context-v2` does not skip a line in a transcript; it deletes the player's working past

**Where this is: `codex/client-content-delivery`, the client integration branch,
and the merge of `main` into it made on 2026-09-22.** Measured 2026-09-22
13:37–13:47Z, Node 22.22.2, on the merged tree.

This supersedes nothing in
`docs/playtest/client-line-lost-schooling-2026-09-22.md` about what was lost. It
answers the question that document left open — which commit did it — and
corrects the account of what the loss costs the player.

## What did it

`DEFAULT_NEW_GAME_SETUP.earlierLifeGenerationVersion = "context-v2"`, in
`src/presentation/new-game.ts`. It routes `summarizeEarlierLife` to
`generateContextualCharacterHistory` instead of `generateQuickCharacterHistory`,
and that generator declines to write a school or a job into a grown character's
summarized past, on the stated grounds that the game should not invent a
biography nobody chose.

It is deliberate, versioned and tested. It is not a regression anybody
introduced by accident, which is why a bisect would have been the wrong
instrument: the commit that did it says it is doing it.

**Old saves were never affected.** A replay descriptor written before the field
existed decodes with it undefined and rebuilds the world `main` built at
`fed321f7` byte for byte — hash `446fc2516699d0a28d87d7a6e3268f11c7d8be919a58c
48ced817575dc48bf55`, 4 enrollments, 2 work roles, 544 people. The earlier
report of old saves losing their jobs came from
`src/presentation/world46-opening.test.ts`, whose `legacySetup` helper spreads
today's defaults and deletes the version fields one at a time; it had two of
four. The helper built a hybrid descriptor no save has ever had.

## What it costs a player

Not one character. The whole earlier working life, and the people who came with
it.

60 fresh saves per generator, Kentucky, `shares-a-home`,
`summarize-earlier-life`, twenty seeds at each of three ages, counting saves
where somebody has reached out to the player and not yet been answered:

| age | old generator | `context-v2` |
| --- | ------------- | ------------ |
| 22  | 17 / 20       | 11 / 20      |
| 40  | 16 / 20       | **8 / 20**   |
| 58  | 13 / 20       | 9 / 20       |

Under the old generator most of those contacts are people the player holds a
work relationship with — 12 of the 16 at age 40. Under `context-v2` there is no
work history, so none of those people exist and every remaining contact is
someone with no work tie at all.

**An ordinary forty-year-old is about half as likely to have anybody get in
touch with them.**

## What it broke on main's side

`src/simulation/people-trait-occasions.test.ts`, which is main's and has no copy
on this branch, fails five ways on the merged tree. It builds a life, has
somebody reach out, lets the day pass unanswered, and checks that the person who
was ignored becomes someone who reaches out less — the first occasion in play
that changes anybody's temperament. On its four seeds, under `context-v2`,
nobody reaches out at all, so the fixture returns null and every assertion
after it fails.

Stated exactly, because the stronger version of this sentence is not supported
by the table above: the occasion does not stop firing, it fires less often, and
on those four particular seeds it does not fire.

## What was done about it

The flag is **off by default and not removed**
(`src/presentation/new-game.ts`). New games use the generator that writes a
past; `context-v2` and its tests stay, so a replay written under it still
rebuilds exactly what it described.

On the owner's decision of 2026-09-22: a person's history is generated up to
their age and the state of the world being loaded into. A blank past is further
from that than a generated one. The generated past is a placeholder for a
sourced one, not the answer — the properly sourced school histories being built
on main are.

## The transferable part

The client-line report asked which commit dropped the schooling and proposed a
bisect. The commit was findable by reading one diff, because a deliberate change
announces itself in its own comments; a bisect would have cost twenty minutes to
arrive at a line that says what it does. **Bisect for a change nobody meant to
make. Read the diff for one somebody did.**

And a four-seed agreement is not a rule. "The only person who ever reaches out"
was four seeds that happened to agree, and it survived one retelling before 60
seeds reduced it to "about half as likely". See
[[a-claim-travels-further-than-its-measurement]].
