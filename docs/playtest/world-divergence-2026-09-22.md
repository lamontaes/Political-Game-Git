# How the world changes on its own, and what it cannot change

Measured 2026-09-22 against `main` at `62368c1e`, by running ordinary saves
forward in code and reading what the world recorded. Figures came out of runs.
Claims about code were re-grepped at this head.

The question: how do the press, crises, wars, assassinations and scandal arise,
how do they drift, what do they do to the world — and can a local or regional
drift ever move the larger region.

## The one sentence

**The world changes richly on its own, and nothing that happens in it changes
anybody's politics, because no wire exists between the two.**

Two lanes reached that wall from opposite directions within the same hour. This
lane came at it from an enacted law and found that a passed bill moves nothing
but money in one named account. The playtest lane came at it from a hurricane
and found that a governor who handles one badly faces no worse election,
because no election reads it. It is the same boundary:
`assertProductionCatalogBoundary` permits a shipped save to carry no causal
mechanism at all, with one authored transit contract as the only exception.

So the honest framing for everything below is not "these systems are shallow".
Several of them are the deepest work in the repository. It is that they are
**terminal**: they record what happened, completely and carefully, and nothing
downstream reads the record.

## What happens on its own — measured

One Kentucky save, one seed, run forward with the ordinary transition registry
and sampled as it went.

**A scope caveat added 15:45Z, and it is not a small one.** That save's place
is `kentucky`, whose `scope` is `"state"`, confirmed by reading the record
rather than assuming it. The playtest lane swept all 51 states and found that
every one of the 35,582 town-scope places carries
`legislativeScenarioKey: null` — the legislative start opens in **no town in
America**, only in nine whole states, Kentucky among them. So this save is the
state-scope arm, and it seats a legislature that a save in a town cannot. Every
figure below is measured in a world of that shape. Where the same figure is
measured again in a town save it may differ, and the party-record counts are
the ones most likely to.

**Year two, from a standing start:**

|                             | at birth of the world | after two years       |
| --------------------------- | --------------------- | --------------------- |
| people                      | 555                   | 642                   |
| party units                 | 2                     | 3                     |
| party evolution changes     | none                  | **one party founded** |
| party body decisions        | 0                     | 18                    |
| party platforms             | 0                     | 19                    |
| party initiatives raised    | 0                     | 1                     |
| hazard episodes             | 0                     | 12                    |
| disaster assessments        | 0                     | 12                    |
| disaster responses          | 0                     | 36                    |
| disaster damage records     | 0                     | 7                     |
| official continuity records | 0                     | 10                    |
| people with no party        | 13                    | 98                    |

Two things in that table are worth stopping on.

**A third party founded itself.** No player did anything. An ordinary save
produced a new party organisation with two people affiliated to it, through the
party-evolution machinery, inside two years. The vocabulary for this is
complete — a party can be `founded`, `split-off`, `merged`, `renamed`,
`dissolved`, or have its platform changed.

**Ninety-eight people with no party.** The population grew by 87 and the
unaffiliated count grew by 85. People arriving in the world get no political
identity, and nothing ever gives them one.

## The crisis system, which is the best-built thing here

He said outright he did not know how it works. It works like this, and it is
serious.

**Natural hazards are sampled from real recorded weather.** A compiled
NOAA/NCEI Storm Events catalogue drives a national stream. The count law is
Poisson at that catalogue's own recorded monthly rate for the state; a state
rate is thinned to a county by the state's recorded median county footprint
over its county count; and an episode's footprint is **resampled from an actual
recorded episode of the same state, hazard family and month**. A Louisiana
hurricane season is drawn from what Louisiana actually recorded. The module
states its own limit: the catalogue counts _reported_ events, so a rate is a
recorded-report rate for 2000–2024 and not a claim about any future year.

**Then a full chain runs.** Hazard → damage to the homes and organisations the
world actually represents → injuries and deaths among the residents of damaged
and destroyed homes → local response → a governor's request inside a 30-day
window (cited to 44 CFR 206.36(a)) → a federal decision that names actual
programme kinds (public assistance, individual assistance, hazard mitigation by
magnitude) → a finite repair queue that completes two effort units a week
locally and six with federal assistance. A declaration never creates damage,
approval never repairs instantly, and a denial never erases the event.

**Death is off the real life table.** SSA 2023 period life table.

That is why 12 hazard episodes and 36 response records appear in two years
without anyone doing anything. This half of the crisis system is alive.

## What cannot happen at all

Each of these is a complete, tested subsystem with **zero callers outside its
own tests**. Re-grepped at this head. Scandal was on this list and has been
struck below — it is reachable, narrowly.

|                                              | The writer                                              | Callers in play |
| -------------------------------------------- | ------------------------------------------------------- | --------------- |
| An assassination or attempt on anyone's life | `recordViolenceAttempt` (`crisis/international.ts:876`) | none            |
| An international crisis, hence any war       | `declareInternationalCrisis` (`:221`)                   | none            |
| A war-powers extension                       | `certifyWarPowersExtension` (`:789`)                    | none            |

**The asymmetry is the finding.** `decideInternationalCrisis` _is_ wired, from
`player/CrisisNoticesPanel.tsx:307`. The player's panel for deciding an
international crisis is connected to the game. Nothing can start one for them
to decide. An attempt on a life additionally requires prior canonical evidence
of threat or intent — a deliberate and correct guard — and nothing in the game
produces such evidence, so the guard has never been reached.

### Correction, 15:30Z: scandal does not belong on that list

~~A scandal — filing an allegation (`recordAllegation`, `press/matters.ts:275`)
— zero callers. A scandal — filing a complaint (`fileComplaint` `:412`,
`fileRivalComplaint` `:785`) — zero callers.~~

[Edit: both rows were wrong and are struck rather than deleted, because the
claim was reported to the owner before it was checked properly.] The grep that
produced them looked for callers of the innermost writers. The chain is entered
two functions above them, and it **is** reachable in ordinary play:

`pressWeeklyHandler` (`press/transitions.ts:37`, on the weekly desk sweep) →
`produceRivalComplaints` (`matters.ts:698`) → a rival's `evaluateDecision` →
`fileRivalComplaint` (`:785`) → `recordAllegation` + `fileComplaint`.

So a scandal can happen. What it cannot do is happen to anybody but the player.
`produceRivalComplaints` returns the world unchanged unless **all** of these
hold: the world is controlled by a person; that person has an active campaign;
that campaign has a resource flow of basis `custom:campaign-expenditure` to an
organization; the contest has another candidate the world still knows; and no
matter or decision trace already exists for that campaign's stable key. That
last condition caps it at **one scandal per campaign, ever**. The player's own
route in is `spendCampaignFundsPersonally`, wired from
`player/PressDeskPanel.tsx:447`.

The machinery itself is general — `openMatter` takes `subjectPersonIds` and
does not care who they are. **The missing piece is a producer that can open a
matter about somebody who is not the player.** Filed as
`what-opens-a-scandal-about-somebody-else`.

**Narrower still, added 16:05Z.** There are two producers that open a matter,
not one, and the second can never fire. `pressLedgerReviewHandler`
(`matters.ts:495`) opens a matter at `:635` when a campaign's bookkeeper raises
a concern about a ledger entry — but it finds that bookkeeper by walking
`campaign.staffWorkRelationshipIds`, and **both filing routes in the game pass
an empty staff list**: `presentation/nationwide-candidacy.ts:161` and
`presentation/campaign-projection.ts:634` each pass `staffPersonIds: []`, and
the only code that fills the list is the loop inside `fileCampaign` itself
(`campaigns.ts:716`) which those empty inputs never enter. So the handler
always ends on `press:no-one-reviewed-the-books`, for everybody, forever. The
playtest lane found the staff-list defect from the campaign side and it is
verified here from the press side. **One live producer remains**, and a scandal
therefore additionally requires a rival's own decision to come out `file`
against two considerations of equal weight.

## His three examples, answered

**"A very popular president turning the South reliably Democratic."** Cannot
happen, and not because the South resists. Three separate reasons, any one of
which is sufficient:

1. **There is no presidential popularity.** The generated presidency carries
   electoral votes, a winner, state winners and how it was decided. No approval,
   no standing, nothing that could rise or fall.
2. **Partisan geography is drawn once and never redrawn.** National, Census-region
   and per-state swings are drawn at world creation from compiled real election
   results, through `generatePoliticalStartingConditions`, called from exactly one
   place — `presentation/opening-life.ts:57` — and nothing anywhere else ever
   writes `regionSwingPp` or `stateSwingPp`. The South's lean is a constant
   established before the player's first day.
3. **Seats carry no lean to change.** The living-world contract says it plainly:
   "No seat carries a regional lean: state partisan geography is not modeled, so
   seats are assigned without one rather than from an unsourced guess."

The regions themselves are real — the Census Bureau's four, sourced — and the
region is used to share one political factor at startup. It is a birth
condition, not a living quantity.

**"The US having a true third-party system."** Half of it happens already: a
party founded itself in an ordinary save inside two years. The other half
cannot. `partyBallotStatusAt()` (`living-world/party-evolution.ts:417`) takes no
arguments and returns the literal string `"not-represented"`, with the comment
"No registered committee or ballot access is represented; a label grants
neither." A new party can exist, hold meetings, adopt a platform and gain
members. It cannot appear on a ballot, because ballot access is not a thing the
game represents for anybody.

**"How the crisis system works."** Above. Half of it is the most
thoroughly-sourced system in the repository; the other half cannot fire.

## The life he asked for, and why it cannot be told yet

He asked for a report shaped like a life: in this save Joe Johnson was born in
Arkansas, the president was assassinated while he was young, and that shaped his
views in this particular way.

The first clause is available. Every save generates real people with real
birthplaces and birthdays — Fiona Terrell born 4 December 1985 in one save,
Cameron Cruz born 18 September 1985 in another, with different families, jobs
and neighbours.

The second clause cannot happen: no assassination can occur.

**The third clause has no mechanism at all, and this is the most important
sentence in this document.** A person in this game cannot presently hold a
conviction. The apparatus for it is fully built — private beliefs, public
positions, campaign commitments, principles, whether somebody has changed their
private position, what their public position was on a given date. The writers
are called by nothing outside the demo world. The readers are called by nothing
outside their own tests. Both ends are finished and neither is connected.

So the report he asked for, written honestly today, reads: _the world diverges
richly, and no one in it is changed by what happens_. That is the finding, and
it is worth more than a narrative would have been.

## The ten-year run, complete

The Kentucky state-scope save reached year 10 at 15:50Z. Sampled every two
years from day one, no player action at any point. Seed `drift-A`, start
2026-01-05, end 2036-01-03.

|                                 | day 1 | yr 2 | yr 4 | yr 6 | yr 8 | yr 10 |
| ------------------------------- | ----: | ---: | ---: | ---: | ---: | ----: |
| people                          |   555 |  642 |  734 |  851 |  955 |  1053 |
| with no party at all            |    13 |   98 |  193 |  307 |  411 |   508 |
| major party A                   |   263 |  255 |  256 |  258 |  267 |   266 |
| major party B                   |   279 |  287 |  283 |  284 |  275 |   277 |
| the party founded in play       |     0 |    2 |    2 |    2 |    2 |     2 |
| party-evolution changes         |     0 |    1 |    1 |    1 |    1 |     1 |
| hazard episodes                 |     0 |   12 |   20 |   26 |   34 |    42 |
| disaster responses              |     0 |   36 |   60 |   78 |  100 |   124 |
| officeholder continuity records |     0 |   10 |   24 |   38 |   49 |    61 |

**Three things this says that the six-year sample could not.**

1. **The population nearly doubles and the parties do not grow at all.** Both
   major parties are flat to within a few people across ten years while 498
   people arrive with no political identity. By year 10, **48% of everyone alive
   belongs to no party**, against 2% on day one. Nothing gives an arriving
   person an affiliation, so the world is steadily becoming politically
   unreadable. This is the clearest defect the run found.
2. **The party that founded itself never grew.** Two members at year 2, two
   members at year 10. The founding is real and nothing follows it.
3. **Party evolution fires once in ten years and never again.** One founding;
   no split, merge, rename, dissolution or platform change ever occurred. The
   vocabulary has six changes in it and the run exercised one.

The crisis figures accumulate steadily and linearly throughout, which is what a
Poisson process at a fixed rate should look like, and is the strongest evidence
that the hazard system is genuinely running rather than firing once at setup.

### Reading the economy from the kernel, beside the screen

The playtest lane walked four towns for a year and read the Macro conditions
panel verbatim. This lane read the same projection from the kernel for the same
four towns, through `projectMacroConditions`, one year each, seed `four-towns`.

|                             | Bemidji MN | Galena IL | Chicago IL | Houston TX |
| --------------------------- | ---------: | --------: | ---------: | ---------: |
| real output growth, 2026-Q4 |      1.690 |     1.911 |      1.898 |      2.023 |
| unemployment, 2026-12       |      4.894 |     5.979 |      5.543 |      4.580 |
| housing ratio, 2026-12      |      1.010 |     1.284 |      1.003 |      1.092 |
| consumer price inflation    |       none |      none |       none |       none |

**What this does and does not establish.** It confirms the shape: every figure
varies by place, and each is a real per-place series rather than one national
number repeated. It does **not** confirm the values, because the two runs used
different seeds, so the two tables are not comparable figure to figure and are
not presented as agreeing. The cross-check that matters — the same seed read
from the kernel and from the screen — is still owed, and is the one thing
neither lane can do alone.

**Confirmed independently from the kernel:** consumer price inflation has no
value at all through the first year. The twelve-month change needs a month
twelve months earlier to exist, which is correct arithmetic and the panel says
so in its own words. The player-facing consequence is the finding: the creator
tells a player inflation runs about 2.8% a year, and then the game shows them
no inflation figure for over a year of play.

## What a divergence report should carry

**Superseded 15:50Z.** ChatGPT answered this directly, and its six groups
replace the five proposed below. Its answer names this lane as owner, with the
playtester executing browser cases, and requires **every** group to carry its
actual source, setup/seed, initial and final game dates, unit, geography,
coverage and intervention:

1. **Material output and price levels AND rates**, with the unemployment
   denominator stated and modeled housing separated out.
2. **Party vote and seat shares**, with contests, incumbency, coverage and the
   outside-top-two share, separating unlike offices rather than pooling them.
3. **Fixed-boundary regional change**, keeping opinion and approval separate
   from votes and seats, and showing actual information and causal propagation.
4. **Distinct ordinary-life contact and goal chains**, reported as
   open/lapsed/blocked/completed outcomes rather than as inflated event counts.
5. **Usable institutional authority, roles, action and delivery** — not raw
   person counts.
6. **Crisis origin, exposure, response, harm and recovery** — not a count of
   headlines.

Method, in its words: use same-state and common-innovation intervention
controls first, then explicit different seeds, and **vary the actual
`setup.seed` rather than only the questionnaire answers**.

**Two cautions it gave that bear on findings already in this document.**

- On the identical figures across saves reported below: _"Exact arithmetic must
  stay exact across seeds. The same tax rate on the same stated taxable amount
  SHOULD produce the same receipt in different saves... 'No two saves alike'
  never means every equal input must have a different result."_ So that finding
  stands as a **lead** — the variation belongs in the tax base, the actors and
  the uptake, not in the multiplication — and specifically must not be answered
  by adding randomness.
- _"Surface fill is NOT a target: correctly empty differs from missing
  producer, unreachable, stale or broken. Do not generate scandals, news or
  debt to fill panels."_ Which is the right constraint on every producer this
  document asks for.

### The five proposed before that answer arrived

Kept because three of them are not in the six and are cheap to carry; the
numbering above is what a report should be organised by.

The audit lane proposed six; these are the ones theirs does not cover, so the
two sets compose rather than compete.

1. **Party evolution changes by kind over N years** — founded, split, merged,
   renamed, dissolved, platform-changed. Zero founded would be a regression; it
   is currently one in two years.
2. **Share of people with no party affiliation, over time.** Currently rising,
   which is a defect rather than a drift.
3. **Crisis records by kind over N years** — hazard episodes, assessments,
   responses, damage, official continuity. Any kind that is always zero is a
   subsystem that cannot fire.
4. **Officeholder deaths and resulting vacancies**, which is the one measured
   path by which a natural event changes who governs.
5. **Sameness across seeds**, taken from the audit lane and worth repeating: run
   the same route on several saves and count how many produce an identical
   value. Anything identical every time is a suspected constant. Known true
   constants — a four-year presidential term — are excluded by name rather than
   reported as drift.

## Measured divergence between two saves, for reference

Two Kentucky saves, same setup, different seeds, run to March 2028.

|                                     | save A | save B |
| ----------------------------------- | ------ | ------ |
| people                              | 641    | 666    |
| deaths                              | 27     | 20     |
| officeholders died in office        | 17     | 12     |
| hazards and disasters               | 11     | 7      |
| crisis records                      | 83     | 57     |
| seats fallen vacant                 | 19     | 15     |
| international developments reported | 15     | 13     |
| party chapter meetings invited to   | 32     | 40     |
| scheduled activities                | 64     | 80     |
| press records                       | 442    | 454    |
| things the player came to know      | 33     | 41     |
| total recorded events               | 1,835  | 1,803  |

One save is harsher: more disasters, more funerals, more seats emptying. The
other is quieter and more social. The one figure that did **not** differ is the
revenue from an enacted tax, identical to the cent in every save, because the
tax reads nothing about the world it is in.

## Does policy reach any of this — an inventory

For each thing asked about: does it exist in the code, is it reachable in play,
and is there any wire from a policy to it. Searched at this head.

| Thing                                                    | Exists?                                                                                                                                   | Reachable in play?                                                                                                                  | Any wire from policy?                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Investing in FEMA, or any disaster-preparedness spending | **No.** No such concept in the tree.                                                                                                      | —                                                                                                                                   | —                                                                                                                                                                                                                                                                                                                            |
| Solar panels, or any energy investment                   | **No.** No match anywhere in `src/`.                                                                                                      | —                                                                                                                                   | —                                                                                                                                                                                                                                                                                                                            |
| Power grid, or any utility failure                       | **No.** No match anywhere in `src/`.                                                                                                      | —                                                                                                                                   | —                                                                                                                                                                                                                                                                                                                            |
| The pharmaceutical industry                              | **No.** One sentence in a setup questionnaire mentions pharmaceutical precursors; there is no industry, no supply, no producer behind it. | —                                                                                                                                   | —                                                                                                                                                                                                                                                                                                                            |
| Executive orders                                         | **No.** No match anywhere in `src/`.                                                                                                      | —                                                                                                                                   | —                                                                                                                                                                                                                                                                                                                            |
| Civil war                                                | **No.** No match anywhere in `src/`.                                                                                                      | —                                                                                                                                   | —                                                                                                                                                                                                                                                                                                                            |
| Federal disaster programmes                              | **Named only.** Public assistance, individual assistance and hazard mitigation are named per magnitude inside the disaster policy.        | The names reach the record.                                                                                                         | **No.** Nothing else in the tree reads those names. A declaration names programmes and no programme does anything. The module says so: CRISIS records the decision and the programmes, never an amount.                                                                                                                      |
| Constitutional amendments                                | **Yes, and half-wired.**                                                                                                                  | **Proposing one is reachable** — `ConstitutionalWorkspace.tsx:69` calls `proposeConstitutionalMeasure`, and `PlayerGame` mounts it. | **No, and it cannot finish.** The four writers that resolve a proposal — `recordConstitutionalProposalVote`, `recordArticleVRatification`, `recordCaliforniaRatification`, `recordCarsonCharterEnactment` — have zero callers outside tests. A player can propose an amendment and nothing can ever vote on it or ratify it. |

**On "disasters are hardcoded not to affect politics" — not quite, and the
difference decides what gets built.** Nothing singles disasters out. A shipped
save may carry **no causal mechanism of any kind**, with one authored transit
contract as the only exception, and that boundary exists to stop invented
content shipping as though it described somewhere real. The build used to ship
players a synthetic policy corpus and an invented outbreak model, and the repair
was to carry nothing rather than to carry different invented content. So it is
not that a hurricane was blocked from reaching an election; it is that no cause
reaches any effect anywhere.

**What it takes to open it** is already written down and already demonstrated
once. Policy content now loads through packs that must declare where they came
from — either an authored fiction that claims nothing about the real world, or a
reading of named, checkable sources — and the boundary admits what a pack
declares while still refusing anything arriving another way. A causal mechanism
would go the same way: declared provenance, loaded through a registry, admitted
because it answered the question the boundary exists to ask. The tax route is
the worked example of a wire that was allowed through, and it works because
every number in it is exact and declared.

## A defect this run exposed, fixed

Advancing an ordinary save forward killed it outright, and the cause is worth
recording because nothing in the suite was reaching it.

A governor dies in office — which happens on its own, off the SSA life table,
17 times in one two-year run. The seat is vacant. When the next regular
election's candidate field closes, the world records the incumbent's decision to
stand again or not. With nobody in the office there is no person to name, the
record was written with no entities at all, and a historical event must involve
at least one entity. So the save threw and could not be advanced past that day —
permanently, for that player.

The branch was deliberate: the code carries a written reason for exactly this
case, "no sitting governor is on record." It had simply never been run.

Fixed by naming the state whose office it is, which is what the record was
always about. Covered by a regression test.
