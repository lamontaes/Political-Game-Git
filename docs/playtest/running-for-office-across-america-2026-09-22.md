# Running for office in fifteen towns, big and small

**Walked** 2026-09-22 between 13:45Z and 14:15Z, on `claude/playtest-cwpd3o` at
`e683fbd0` (which is `main` at `d956b92a` plus this lane's two name fixes), in
**Chromium 141 locally — not the version CI runs**. Fifteen lives, each made
through the ordinary creator, age 34, no fixtures, no injected records and no
developer menu. Screenshots were taken at the moments that decide something
and are handed over with this record; they are deliberately not in the
repository.

Asked for by lamontae: "do playtests. test all this stuff. all these events.
being running for office in big and small towns all over america."

Each state appears twice where it could — a large place and a small one —
because a refusal read in one town is not the state's behaviour until a second
town in the same state says the same thing.

## What happened, in one table

| Town        | State       | Size  | Seats offered | Filed    | Result                |
| ----------- | ----------- | ----- | ------------- | -------- | --------------------- |
| Chicago     | Illinois    | large | yes           | House    | won, 72.0%            |
| Galena      | Illinois    | small | yes           | House    | won, 81.7%            |
| Lexington   | Kentucky    | large | yes           | House    | won, 75.3%            |
| Paducah     | Kentucky    | small | yes           | House    | won, 85.6%            |
| Reno        | Nevada      | large | yes           | Assembly | won, 79.0%            |
| Ely         | Nevada      | small | yes           | Assembly | won, 78.9%            |
| Kansas City | Missouri    | large | yes           | House    | won, 71.3%            |
| Hannibal    | Missouri    | small | yes           | House    | won, 75.0%            |
| Baltimore   | Maryland    | large | yes           | House    | won, 90.5%            |
| Cumberland  | Maryland    | small | yes           | House    | won, 84.1%            |
| Sitka       | Alaska      | small | yes           | House    | won                   |
| Anchorage   | Alaska      | large | **no**        | —        | refused, and says why |
| Nashville   | Tennessee   | large | **no**        | —        | refused outright      |
| Helena      | Montana     | small | **no**        | —        | refused outright      |
| San Juan    | Puerto Rico | large | **no**        | —        | refused outright      |

Eleven candidacies filed, eleven played through to a decided election. No page
threw an error anywhere.

## 1. The legislative route invents its own election. The governor's route does not.

This is the finding with the most behind it, and it is visible on one screen.

Open Campaigns anywhere the game has read the state's offices. Under **The
state's top office**, in every one of the eleven places checked:

> Governor of Illinois — You may stand for Governor of your state today.
> **The next regular election is November 3, 2026. The winner takes office
> January 4, 2027.**

Under **Running for office**, on the very same screen, every legislative seat
says:

> Upcoming election timing is not established in this save.

And filing for one produces, in all eleven towns, in five states, for a House
seat and for an Assembly seat alike:

> **· 28 DAYS TO GO** — Running against _one named person_.

The cause is two lines, in `src/presentation/campaign-projection.ts`, inside
`fileForOffice`:

```ts
const opponents = ensureCampaignOpponents(world, { ..., count: 1, ... });
// Long enough to have to choose what to spend the weeks on, short enough
// that the election is a thing this life reaches rather than a horizon.
const electionDate = addDays(world.currentDate, 28);
```

The twenty-eight days carries a comment explaining itself as a deliberate
pacing choice. The `count: 1` carries none. So:

- **Every legislative race in the game is two-way.** There is no primary, no
  three-way race, no unopposed seat, and no incumbent — the opponent is
  generated at the moment of filing.
- **Every legislative election is twenty-eight days after you file it**,
  whatever the office, whatever the state, whatever the date. File on a
  Tuesday in March and the election is in March.
- **The game is not short of a calendar.** It has a real one, on the same
  screen, for the governorship. The legislative route does not use it.

This is a product decision rather than a defect, so it is reported rather than
changed. What a legislative seat's calendar and field should be is filed as
research.

## 2. The player wins, every time, by a lot

Eleven for eleven, between 71.3% and 90.5%. Nothing here is a fluke of one
state: the spread covers a city of 2.7 million and a town of three thousand,
and the shares do not track either.

The campaign outcome curve is **tabled** by lamontae's own decision, so this
record does not argue with it. What it adds is that the curve is being asked to
do its work against a single generated opponent with no incumbency, no party
standing and no record, which is a different question from how steep the curve
should be.

## 3. Election night could print 100.1 percent — fixed

Chicago printed "72.0%" and "28.1%". Hannibal printed "75.0%" and "25.1%". Two
of ten races, and a reader who adds the two numbers on the screen gets 100.1.

Nothing was wrong with the count. The simulation allocates whole basis points
and they sum to ten thousand. Each share was then rounded on its own, in the
last step before the screen, and 71.95 and 28.05 both round up.

Fixed in this branch: `displayedSharePercents` rounds by largest remainder, so
what is printed totals 100.0 and no share moves by more than a tenth.
`src/presentation/displayed-vote-shares.test.ts` holds the two walked races
and a property check over two to seven candidates.

## 4. Three more states still refuse outright, on main today

Nashville, Helena and San Juan all read, word for word:

> The game has not read this state's elected offices yet, so there is nothing
> to stand for here. It will not borrow another state's rules to fill the gap.

This is the refusal measured as broken in #342 for Maine, Georgia and Arizona.
It is still live, and **Tennessee, Montana and Puerto Rico are three more**, on
`main` at `d956b92a`. Six states confirmed, forty-five not checked.

lamontae's own standing rule is that an unresearched jurisdiction gets a
realistic range rather than a refusal, drawn nationally, varying per state and
stable per state across saves — and that the second half of the rule, never
borrowing another state's rules, must survive any fix. The sentence above
honours the second half and breaks the first. **The nationwide lane owns the
fix**; this record only adds three states to its count and confirms the wording
has not changed.

Worth separating: Puerto Rico's own refusal under The state's top office is
different and is correct. "This life is not set in one of the fifty states, so
there is no state executive office to stand for." That is a true statement
about Puerto Rico, not a gap.

## 5. Anchorage refuses well, and Sitka proves it is the town

Anchorage, read on screen:

> The district-residence rule requires 1 year. This character's town lies
> across more than one district, so the world cannot say which district they
> live in.

That is specific, true, and tells the player which fact is missing. Sitka, in
the same state on the same day, offers both chambers and files. So the Alaska
behaviour is a property of Anchorage, not of Alaska — which is exactly the
distinction that made "Alaska opens" and "Alaska refuses" both true earlier
today.

## 6. Every town had a party, including the ones that refuse

Both parties, with a named organizer and five activities each, in all fifteen
towns — including Nashville, Helena and San Juan, where there is nothing to
stand for. Galena, population three thousand, gets "County of Jo Daviess
Democrats, with Ayanna Woodward" and "County of Jo Daviess Republicans, with
Kieran Dalton". Sitka gets "Sitka, Alaska Democrats, with Diego McCoy".

So the party layer does not wait on a state's offices being read. That confirms
`party-chapters-reach-every-town-walked-2026-09-22.md` across nine more towns.

## What this walk did not establish

- **Whether any of these races can be lost.** Every one was campaigned the same
  way — take the outreach offer whenever it is offered, then pass the day. A
  life that ignores the campaign entirely was not walked.
- **Whether the twenty-eight days is felt as wrong in play.** It is reported
  here as a mismatch with the governor's calendar on the same screen, which is
  a fact; whether a player minds is not.
- **Forty-five states.** Six were read for the outright refusal and five for a
  successful candidacy. Nothing here licenses a claim about the rest.
- **Anything after election day.** The walk stops at the result. What a won
  seat does next is `a-legislative-seat-resolves-too-2026-09-22.md`.

## How this was run

A Playwright walk of fifteen cases, each a fresh browser with storage cleared,
run locally and **deliberately not added to the suite**: it costs eleven
minutes of browser time, and browser shard duration is already the binding
constraint on how often anything merges here. The walk is a measuring
instrument, not a gate. A reporting walk rather than a table: it asserts
only what must hold everywhere — the page throws nothing, and a filed candidacy
reaches a result — so a state behaving differently is recorded rather than
failing the run. Per-town records and screenshots are written outside the
repository, in keeping with the convention that keeps captures out of tracked
evidence.

The first pass of five towns did not finish, and that was the walk's own
selector rather than the game: where the game offers nothing to stand for it
renders no campaign section at all, and the spec waited for one. It was
rewritten to record where it stopped and to capture the screen there, which is
how the three outright refusals above were read.
