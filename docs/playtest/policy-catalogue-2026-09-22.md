# Where the politics would be

Walked 2026-09-22 from 08:20Z on `main` at `de030bff`. One life, forty years
old, made through the ordinary creator in Springfield, Illinois — no fixtures,
no injected records, no developer menu. Code claims below are read at that same
head.

This is the follow-up the morning walk did not take. Memory has the empty
policy catalogue down as the largest single gap in the project, on the strength
of a boundary assertion in the source. Nobody had looked at it from a chair in
front of the game.

## The finding

**There is nothing in this game for a player to have an opinion about, and the
screen named after opinions is about money.**

The Politics hub has five tabs: Your office, Campaigns, Government, Parties,
and **Issues and budget**. That last one is the only place a policy would live.
It has two sections and neither is an issue:

- Budget & economy
- Constitutional & charter changes

There are no domains, no issues, no propositions, no subjects and no
principles. Not a short list — none.

## Three menu entries, one screen

Something smaller and checkable falls out of walking it. The shell menu offers
Budget, Tax and Transit as separate destinations under Politics. All three land
on the same page.

The visible text of the Budget destination and the Tax destination is identical,
character for character, and Transit opens the same screen again. The section
strip on that screen lists only Budget & economy and Constitutional & charter
changes, so there is no tax section and no transit section for an ordinary
player to be taken to.

A player who chooses Tax from a menu and is shown a budget page has been
answered with something else without being told.

## What the empty catalogue actually costs

This is the part that is bigger than "the bill lifecycle has nothing to be
about", and it is a built-but-unreachable finding rather than a broken one.

`assertProductionCatalogBoundary` in `src/simulation/production-catalog.ts`
refuses to build a production world whose policy catalogue holds anything at
all. Its own comment is honest about why:

> Emptiness is the current honest state of each of these, so it is also the
> check. Adding sourced content means changing this function on purpose and
> saying where the content came from.

That is a good rule. But a policy **proposition** is the key that three other
systems are filed under, and with no propositions none of them can be entered:

- **A private belief.** `evaluatePoliticalBeliefFormation` in
  `political-belief-formation.ts` throws `Missing policy proposition` before it
  does anything else. In a production world that is every call.
- **A public position.** `recordPublicPosition` in `politics.ts`.
- **A campaign promise.** `recordCampaignCommitment`, in the same file.

All three are written, all three are covered by tests, and outside those tests
the only caller of any of them in the whole tree is `src/simulation/demo.ts`.
There is no route from the game to any of them.

So the conviction layer — what your character believes, what they have said in
public, what they promised while running — is locked twice over. There is no
content to have a view about, and there is no button that would record one.

## The journal is the one screen that would show it, and it says nothing

`src/presentation/world39-journal.ts` is the only file in the presentation or
player layers that reads the policy catalogue at all. It builds journal entries
for beliefs, public positions and campaign commitments, and each loop does the
same thing when the proposition is missing:

```ts
const proposition = world.policyCatalog.propositions[belief.propositionId];
if (!proposition) continue;
```

A `continue`, not a sentence. So the journal renders an absence silently, which
is the one place this build otherwise does not: everywhere else it says what it
does not know, in words, and well.

## What the walk did find, and it is good

Worth saying, because the above is all gap.

The Budget & economy screen is one of the most honest surfaces in the game. It
names its place and date, says plainly that reading it changes no budget and
moves no time, separates reference observations from this save's own history,
and then refuses four different ways without ever printing a zero:

> No aggregate budget-history or outturn records are available for Springfield,
> Illinois on 2026-01-05.

> No reviewed economic source binding is available for this exact place. Figures
> from another city, county, metro, or state have not been substituted.

> No modeled public receipts account has been opened for Springfield, Illinois
> in this life. That is no record, not a zero balance.

The last sentence is the whole design in one line. The starting conditions it
does have — unemployment near 3.9%, prices rising about 0.8% a year — are
labelled as starting conditions rather than released figures.

The Government screen is the same shape: two named senators for Illinois, the
city and county listed from the Census Bureau, districts reported as not
recorded rather than guessed, and "Looking at government does not use any time
or give you any power."

## A mod pack cannot fill it, and that is settled

This was the open question the walk left, because it is the shortest imaginable
route from here to a game with politics in it. The answer is no, twice over.

**The boundary is not a creation-time check.** `assertProductionCatalogBoundary`
runs inside `validateWorldIntegrity`, which every `assertWorldIntegrity` call
reaches, so any production world carrying a proposition fails validation no
matter when it acquired one. The line says so itself:

> A world that says it is somebody's game must not be carrying the engine's
> validation substrate, whoever built it and however it was loaded.

**And the mod vocabulary has no word for a policy anyway.** A
`RuntimeContentPack` — the only thing `installRuntimeContentPack` will put into
a world — carries exactly two kinds of content:

- `durations`, a key and a number of minutes
- `scenes`, life scene definitions

That is the whole list. No policies, no propositions, no traits, no effects.
This is the concrete shape of the gap recorded elsewhere as "the mod loader
ships and works but its effect vocabulary is empty": the loader, the digest,
the dependency ordering and the save round-trip are all real and all careful,
and what they carry is scenes and durations.

So filling the catalogue means changing `assertProductionCatalogBoundary` on
purpose and saying where the content came from — which is exactly what its own
comment asks for. There is no side door, and looking for one is now a settled
question rather than an open one.

### A correction to the morning walk, from the same measurement

That walk said traits are "pack-driven", in a sentence that reads as though a
mod could add one. The pack shape is real — `loadedTraitRegistry()` composes
`peopleTraitPack()` and `legislatureTraitPack()`, and the simulation honours
what they declare — but both are compiled into the build, `loadTraitPacks` is
never called with anything else anywhere in the tree, and the runtime pack type
above has no field for a trait. A trait added **to the build** works. A trait
added **by a mod** is not possible today. The walk's own file is corrected in
the same commit as this one.

## What this walk did not establish

- **Whether tax and transit sections appear for an officeholder.** This life
  holds no office — "You do not hold a job or an office right now." The three
  destinations collapsing to one page is measured for an ordinary player only.
- **What the bill lifecycle does with an empty catalogue.** Unreached; a player
  with no office cannot open it.
