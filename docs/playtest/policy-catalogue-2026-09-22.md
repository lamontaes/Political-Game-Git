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

## Retracted: "three menu entries, one screen"

**Retracted 2026-09-22 08:45Z, re-measured on `main` at `0e0cebe8` in
Chromium 141.** This document first said the shell menu offered Budget, Tax
and Transit as three separate destinations under Politics, that all three
opened the same page, and that a player who asked for Tax was shown a budget
without being told. None of that is true, and the way it went wrong is worth
more than the claim was.

What the menu actually holds, read off the open flyout in two lives:

- One Politics entry, and only one. `nav-politics-budget`, `nav-politics-tax`
  and `nav-politics-transit` are each present zero times on the page.
- Its hint changes with the life: "Running for office, jobs and study" for a
  life with no office, "Your office, jobs and study" for one that has one.

Those three names are not the game's. They are keys in `POLITICS_HUB`, a map
inside `tests/e2e/support/creator.ts` that lets a spec name a place inside the
hub; the helper clicks the single Politics entry and then walks to a tab and a
section. When the section control does not exist it does this:

```ts
if (step.startsWith("politics-sub-") && (await control.count()) === 0) {
  continue;
}
```

So three helper destinations walked to the same tab, found no section to
click, and left the walk on the same page three times. The identical text was
the same screen read three times, not two screens that had been confused for
each other. **A test helper's route is not a player's route**, which is this
lane's own standing rule, and this is what breaking it looks like.

What is really there is the opposite of a defect. Transit and tax are separate
surfaces with their own frames and titles — "Transit service", "Taxes and
public receipts" — and when a life cannot use them the screen says so in
words, at `PlayerGame.tsx` `transit-withheld` and `tax-withheld`:

> Transit service work opens when you hold an office that can propose a
> service appropriation.

> Tax work opens when you hold an office with power to propose taxes.

`politicsIssueAccess` in `src/presentation/politics-issues.ts` is deliberate
about it and says why: the public budget is for everyone, and transit and tax
are an office's configuration tools. That is the fails-soft rule working.

This is the fourth claim tonight that was true of one reading and false of
another, so the reconciliation is the finding: the player-facing-text lane read
the cases on `claude/player-facing-text-client` at `6db9b5bd` and found the
three separate frames; this lane walked the screen on `main` at `0e0cebe8` and
found the same thing. Both trees agree. Only the helper disagreed.

## What the Issues tab actually offers, in two lives

Measured the same way, in the browser, on `main` at `0e0cebe8`:

- **A life with no office**, Springfield, Illinois: the Issues tab is there and
  the section strip is not. `politics-sub-budget`, `politics-sub-transit` and
  `politics-sub-tax` are each present zero times. A tab with one section draws
  no strip, so the budget is simply the tab.
- **A life that starts as legislative staff**, Nebraska: the same. Still no
  transit section and no tax section. `politicsIssueAccess` returns false for
  both, because a staff start is not a seat that can propose a service
  appropriation or a tax.

So the open question "do tax and transit appear for an officeholder" is
answered for staff and still open for a seated member, which needs an election
won rather than a creator choice.

### The legislative-staff start exists in three states

Found while reaching for that measurement, and it is a location-agnosticism
gap rather than a politics one. The creator's Legislative staff choice is
disabled unless the selected place has a legislative scenario, and
`legislativeScenarioKeysForPlace` reads `BLUEPRINTS` in
`src/simulation/legislation-scenarios.ts`, which holds scenarios for Kentucky,
Nebraska and Alaska and no other state.

It is also statewide-only. Choosing a town disables the button even inside
those three: Springfield, Illinois and Lincoln, Nebraska both render

> A legislative staff start is not available for this selected place yet.

and only the statewide custom choice for Nebraska enabled it. So of
fifty-one places a player might start, three offer this route, and only if
they decline to name a town.

## What the empty catalogue actually costs

It is a built-but-unreachable finding rather than a broken one, and it is
narrower than the sentence that has been carried between lanes.

**"The bill lifecycle has nothing to be about" is retired.** Measured
afterwards by opening the drafting table from a Legislative staff start in
Nebraska and written up in `drafting-table-2026-09-22.md`: a bill has more
than forty templates across eighteen subject families to be about, and
choosing one produces drafted statutory sections with editable parameters.
The legislation layer is not filed under propositions and does not need them.
What the empty catalogue locks is the conviction layer, below.

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

- **Whether tax and transit sections appear for a seated member.** Answered
  above for a life with no office and for a legislative-staff start, in both
  cases no. A seated member needs an election won, which is a year of play and
  not a creator choice, so it stays unmeasured.
- **What happens after a bill is filed.** The drafting table was reached
  later, from a Legislative staff start, and is written up in
  `drafting-table-2026-09-22.md`. Filing itself needs a seated member, so
  referral, readings, committee and the vote are all still unreached.
