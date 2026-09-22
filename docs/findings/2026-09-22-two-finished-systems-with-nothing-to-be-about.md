# Two finished systems are starving for content, and that is the headline

Measured on `main` at `e908f446`, 2026-09-22.

## The finding

The two largest pieces of finished machinery in this repository have almost
nothing to operate on, and in both cases the missing thing is content, not
code. They are separate discoveries that turned out to be the same defect.

**The bill lifecycle has nothing to be about.** A new world ships with an
empty policy catalogue — no domains, issues, propositions, subjects or
principles — enforced by `assertProductionCatalogBoundary`. The lifecycle
itself is 2704 lines and finished. It can carry a bill from introduction to
enactment and it has no bills to carry, because a bill has to be about
something and there is nothing for it to be about.

**The living world has twenty-two sentences.** `developments.ts` holds the
whole bank of things that can happen in the wider world as two `const` arrays:
two international storylines with three stages each, and four local subjects
with four stages each. The press desk is faithfully reporting the only things
there are to report, which is why the front page reads like machinery. Full
account in `2026-09-22-news-front-page-reads-like-machinery.md`.

## Why they belong in one finding

Both are the hardcoded-content defect class the audit went looking for, at the
largest scale it appears in: content living in code, or not existing at all,
while the system that consumes it is complete. Neither is a bug in the system
that consumes it. Nothing in the bill lifecycle needs changing to make bills
interesting, and no headline writer can make six storylines feel like a world.

That also makes them the two best candidates for the first real mod. Both want
exactly the same thing — a content pack the game discovers rather than a
`const` array it imports — which is the stated RimWorld/Sims goal for this
project. Whoever builds the pack format for one has built it for the other.

## Why neither was done tonight

Both touch the simulation on a night with no CI verdict available, and both
are authoring work rather than engineering work: the shape of the pack is a
decision, and the content that goes in it is writing. A wrong move in the
living world is not visible until sixty simulated days later. They are filed
rather than attempted, deliberately.

## What would settle the next step

The pack format is one question answered once: whether a policy domain and a
world-event storyline are two shapes or one shape with two uses. Everything
else follows from the answer.
