# What is held shut on purpose, and what a bare number decides

Measured on `origin/main` at `1c4992e8`, 2026-09-22. Three questions were
filed into `docs/research/requests/` from this sweep and are named at the end.

This covers the player-facing surfaces and the content and identity systems.
Everything downstream of an enacted law — the production catalogue boundary,
the causal-effects engine, the economy derivations, the forecast refusal — is
the "What passing a law actually does" lane's, by an agreed split, and is
deliberately absent here rather than missing.

## 1. A content pack may carry scenes and durations, and nothing else

`RuntimeContentPack` in `src/simulation/runtime-content-packs.ts` has eight
fields, of which two carry content: `durations` and `scenes`. `shape()` throws
on any key not in its list, so the whitelist is enforced rather than merely
documented, and the API's own version string says so plainly:
`ordinary-scenes-v1`.

Measured by feeding the validator packs identical but for one added field:

```
bare pack, scenes+durations only:  ACCEPTED
pack adding a trait:               REFUSED — Content pack has missing or unsupported fields.
pack adding a first name:          REFUSED — Content pack has missing or unsupported fields.
pack adding a job:                 REFUSED — Content pack has missing or unsupported fields.
pack adding a policy issue:        REFUSED — Content pack has missing or unsupported fields.
pack adding a place:               REFUSED — Content pack has missing or unsupported fields.
```

Two standing rules meet here. "Modders may change content AND rules,
explicitly NOT a small whitelisted vocabulary" — it is a small whitelist, of
two field kinds. And "ignore it and say so", unknown content skipped with a
stated reason, never refused whole, never silent — one unknown field loses the
whole pack, and the message names no field, so a modder is not told which one
was wrong. `importContentPack` in `src/presentation/content-pack-import.ts` is
the only import path and adds no soft-fail layer above the throw.

Filed as `mod-api-vocabulary-is-two-fields` (P0).

## 2. Seven of seventeen room surfaces are painted by nothing

`src/presentation/scene-consumers.ts` declares every player-facing surface that
could show a room and derives whether it is actually wired. Seventeen
consumers; seven painted by nothing. Most are honestly blocked on artwork or on
lamontae's own visual acceptance, which is correct.

Two are not, and they are the expensive ones. **The chamber floor** and **a
committee hearing** both have finished, registered production art and are dark
for one shared reason, which `src/presentation/scene-venues.ts` states in its
own words: committee hearings and floor votes "are scheduled as future due
items rather than as located activities, so they carry no location key for this
table to map. The room is ready; the hearing needs a location before it has
one."

So the two rooms where legislating visibly happens are one missing fact away
from lighting up, in a game whose owner rates governing and legislative play 8
to 9 out of 10. Three other surfaces already work through this exact seam — the
posted public meeting, the campaign office, the staff workroom — so the
mechanism is proven and only the producer's write is absent.

A caution that has cost time before: **the shared staff workroom looks
reachable and is not.** Its venue mapping is declared and proven, but the key
`lexington-legislative-office` is written ONLY by `createRunDLiteFixture`, a
development fixture at `?view=office-fixture`. Verified by searching every
writer of that key. No ordinary life reaches that room either.

Filed as `finished-rooms-waiting-on-a-location` (P1).

## 3. The numbers that decide what a person does

The category lamontae named as "if asking someone three times then makes them
say yes". Two of this shape were found and fixed today by other lanes — a party
breakaway gate counting two decision records with no date guard, and
`bargainingMannerFromRecord` reading three clauses in one sitting as "strong".
Both were defensible numbers counting the wrong thing, which is the distinction
worth carrying: a better number would have fixed neither.

`PARTY_BODY_CADENCE` in `src/simulation/living-world/party-evolution.ts` is six
of them in one named block — a review every 3 months, a standing committee of
4, a national committee of 5, a unit inactive after 180 days, and a dispute
that must recur at least 2 times before anyone considers leaving.

Two more are not in that block at all, but inline literals in the middle of the
logic, at lines 708 and 716:

```ts
const leave = allies.length >= 2 ? "split" : "found";
confidence: disputed.length >= 3 ? "high" : "medium",
```

Two allies decides whether leaving is a split or a founding. Three disputes
decides whether the consideration a player reads is labelled "high" confidence.
That second line is lamontae's own example, in the code, deciding a word on
screen. None of the six is reachable from a content pack.

`LEGISLATIVE_CADENCE_PROFILE` in `src/simulation/governing/legislative-clock.ts`
is labelled in the source as a "PROPOSED balance parameter, pending the
director's confirmation" and carries 3 days between institutional steps and 7
days from referral to hearing. The comment records that an answer was wanted.
Nothing records that one arrived, and it has been running as if confirmed.

A count-comparison sweep across `src/simulation` and `src/presentation`
separated structure from judgement, which is the useful half. Most numeric
comparisons are structural and belong in code: a decision needs at least 2
options, a merger at least 2 organizations, a birth 1 or 2 parents. The ones
that read as judgement are the party numbers above, plus
`life-personality.ts:137` (at least 2 pieces of evidence), `life-episodes.ts:922`
(at least 2 non-context anchors), `career-path7.ts:404` (at least 2 pieces of
work history) and `life-paths2.ts:1643` (at least 10 shifts). Each decides
whether something about a person is established or ignored.

Filed as `decision-thresholds-are-constants-in-code` (P1).

## 4. Two handed over by the enacted-law lane, and verified here

The "What passing a law actually does" lane found these outside its own scope
and handed them over rather than filing them. Both re-measured on `1c4992e8`
before being written down.

**A bill is not about anything.** `introduceMeasure`
(`src/simulation/legislation.ts:1341`) accepts `policyAlternativeIds` as an
optional input defaulting to `[]`. Searching every call site: there are
**seven**, in `legislation-docket.ts`, `legislation-world.ts`, `tax-work.ts`,
`legislation-bundle-docket.ts`, `municipal-public-work.ts`,
`legislation-scenarios.ts` and `governing/legislative-clock.ts`, and **not one
of them passes it**. Outside the module the field appears only in two test
files, both passing `[]` explicitly. So every bill in every game carries an
empty list of the policy alternatives it is supposed to be choosing between.

This is a wiring gap, not a content gap, and it is the same shape as the
policy catalogue finding: the vocabulary landed in #379, and the thing that
would connect a bill to it was never called. The lane's count was six; it is
seven.

**A control offered on the bill and refused on the world.**
`DocketWorkspace.tsx` enables the fiscal-estimate control from `canEstimate`,
which tests the bill alone — it states a ceiling, and it authorizes or
provides money. `legislation-estimate-action.ts:248` then looks for a
`government.outlays` metric definition and a `mechanism.linear-transition`
mechanism in the save, finds neither, and refuses with:

> A spending scenario cannot be calculated with the information currently
> available.

Those two definitions are exactly what the production catalogue boundary
forbids a production save from carrying, so on any money bill in an ordinary
game the button is offered and can never succeed. The sentence reads as "not
right now", which a player will take as something they can change by waiting
or by gathering more; the truth is "not in this build". That is the
reachable-and-empty-with-nothing-saying-why pattern, on a control rather than
a screen.

Deliberately not fixed here. The honest replacement sentence is a statement
about the catalogue boundary, which the enacted-law lane owns and is writing
up in #389, and two lanes should not author the same explanation. The
player-facing half — the sentence, and whether the control should be offered
at all — comes back here once their account lands.

## 5. Built producers with no player entry point

The enacted-law lane's read-only sweep returned fourteen leads outside its
scope and handed them over explicitly unverified. Each of the following was
re-measured here on `1c4992e8`. **Two of the fourteen did not survive
measurement and are recorded as corrections rather than findings.**

### Verified

**A sink the type system forbids filling.** `living-world-orientation.ts:57`
declares `readonly publicMatters: readonly never[]`, commented "Filled by W3
producers; empty until then". `never[]` cannot hold any value, so the field
cannot be populated without changing the type. Its producer,
`projectPublicMatters` at `living-world/developments.ts:607`, is fully
implemented — and every caller is a test, across
`world-recap-matters.test.ts` and `living-world-developments.test.ts`. A
finished producer and a sink the compiler forbids filling is the
empty-surface pattern in its purest form.

**The officeholder's matters surface has no importer at all.**
`src/presentation/office-response.ts` exports `projectOfficeMatters` (line
184), the surface that would show an officeholder the matters against them.
Searching for any import of that module across `src/` returns nothing. Its
only internal caller is line 262 of the same file. Nothing a player touches
reaches it.

**The scandal subsystem's readers are wired and its writers are not.**
`src/simulation/press/matters.ts` is not test-only — `press/index.ts`
re-exports it, `press/views.ts` and `press/transitions.ts` import from it,
and `office-response.ts`, `press-disclosure.ts` and `PressSourceDesk.tsx`
import from `simulation/press`. But the acts that would _create_ a matter —
`recordAllegation`, `fileComplaint` and `fileRivalComplaint` — have **zero
callers anywhere outside their own module**. The machinery that would show a
scandal is connected; nothing can start one.

**One place has economic context; the other fifty-one have none.**
`economic-context-bindings.ts:39` builds `BINDINGS_BY_PLACE` from a single
entry, `LEXINGTON_ECONOMIC_BINDING`, so `economicContextBindingForPlace`
returns `null` for every other place. Against a 52-jurisdiction goal, and
against the standing rule that Kentucky and Lexington are one scenario rather
than the normal start.

**A transcribed civic-venue corpus nothing imports.**
`src/environment/reference/` holds a large catalog of real transcribed civic
venues with a query engine beside it. No file outside that directory imports
anything from it.

### Corrections to the handed-over leads

**"press/matters.ts is test-only" is false**, as measured above: three
non-test modules import it. The true finding is narrower and sharper — the
writers have no callers.

**"projectOfficeMatters has no non-test importer" understated it.** It has a
non-test caller inside its own file. The true finding is stronger: the module
has no importer at all.

**Seventeen room surfaces, not eighteen.** Section 2 above says seventeen and
that is correct; a count of `consumerId:` occurrences returns eighteen because
line 53 is the interface's own field declaration. Seven carry
`wiredThrough: null`, which both counts agree on.

Also carried across, from that lane's own correction rather than measured
here: the earlier claim that this game has no unemployment or inflation figure
a law could move **was wrong and is struck**. `src/simulation/macro-economy`
runs a real monthly national economy in every ordinary save. Nothing in this
document depends on the withdrawn claim.

## 6. A constant standing in for something the world should decide

The playtest lane found the sharpest instance of this by walking fifteen
towns: every race in America had exactly one opponent. The cause is a literal
`count: 1` passed to `ensureCampaignOpponents`, whose input type
(`campaigns.ts:407`) accepts a `count: number` that could be drawn from the
office, the state or the seat, and is instead written in at both filing
routes — `nationwide-candidacy.ts:140` and `campaign-projection.ts:670`.
Those are the only two callers outside the module and its tests.

lamontae asked for this to become the audit's search pattern, so it was
searched rather than assumed. **The result is mostly negative, and that is
the finding.** Sweeping `src/presentation`, `src/simulation` and
`src/player` for a numeric literal passed as a count, size, seat, member,
candidate, party or district quantity into a generator returns exactly those
two lines and nothing else. The shape the opponent defect has is rare; it is
not a widespread habit in this codebase.

One candidate was checked and cleared, recorded so nobody re-flags it:
`opening-officeholders.ts:44` writes `years: 4` for the presidency, which
looks like the same shape and is not. The four-year term is constitutional,
the module cites `archives.gov` for it, and the Chief Justice in the same
list correctly carries `years: null` rather than a number. A fixed value that
is fixed in the world is not a stand-in.

The distinction worth carrying out of this section: a literal is a defect
when the thing it describes varies and the generator could have been told,
and it is correct when the thing it describes does not vary. The opponent
count varies by office, state and seat and the generator takes a parameter
for it. The presidential term does not vary at all.

Also worth separating from both: `life-paths2-catalog.ts` holds many literal
minimum ages, gaps and elapsed days. Those are authored content that happens
to live in a `.ts` file rather than constants standing in for a world
decision. They belong in the modding question — whether a pack can reach
them — not in this one.

## 7. Walk up the chain before saying nothing can start it

A zero-caller result on the innermost writer is not the claim "nothing can
start this", and this sweep proved that on itself.

The divergence lane reported that nothing in the game could open a scandal,
having checked the two functions that write an allegation and found no
callers. That was wrong: the chain is entered two levels further up, on the
weekly press sweep, where a rival decides whether to file over a campaign
expenditure. The true finding was narrower and better — a scandal can only
ever be about the player, at most one per campaign, and only if they spent
campaign money personally, though the machinery does not care who the subject
is. A widening job, not a building job.

Warned of that, this lane re-walked its own belief finding and **found the
same mistake in it.** The first version named four recorders whose only caller
is `demo.ts`. It missed `recordPrivateBelief` entirely, and above that an
entire exported routine: `political-belief-formation.ts` carries
`evaluatePoliticalBeliefFormation` (line 80), which proposes a belief, and
`applyNpcPoliticalBeliefFormation` (line 233), which validates the proposal
against its own decision trace and records it. Both are re-exported from
`src/simulation/index.ts`, so they are public API rather than internal
helpers.

Walked one level higher again, the chain does terminate at the demo: the only
non-test importer is `demo.ts`, and no scheduled step registers it. But the
corrected finding is smaller and more actionable than the one it replaces.
**What is missing is a scheduler, not an author.** The routine already exists
and already decides; nothing calls it on any tick.

The rule this sweep now follows, and states in each record: walk up until you
reach something a player or the clock actually drives, and say where you
stopped looking.

**And a third correction, this one against the direction of the other two.**
This document previously said the catalogue had stopped being a blocker,
because the boundary now refuses only what no loaded pack declares. The
people-and-life lane challenged that and was right. The boundary is genuinely
open, but `POLICY_PACKS` loads one pack; `propositions` is an **optional**
field on `PolicyPack`; and that pack does not carry it — `grep -c proposition`
on `policy-pack-us-state-and-local.ts` returns **0**. The registry declares 13
domains, 127 issues and no propositions at all. Every belief writer in
`politics.ts` calls `requireProposition` first, at lines 73, 98, 142 and 179.

So the first piece is **one row of content, not one function call**, and no
scheduler helps until a proposition exists to hold a belief about. Two
corrections made a finding smaller; this one puts a step back in front of it.
A lane that only corrects in the flattering direction is not checking, it is
agreeing, and the rule that catches all three is the same: measure at a named
head and say what you did not look at.

## 8. Healthcare, negotiation and budgets: where the numbers come from

lamontae asked for more than the economy, and for each number to be proven —
which player-facing input moves it, if any. Measured at `1c4992e8`, the three
he named give three different answers.

**Negotiation is real and playable.** `MeasurePaperWorkspace.tsx` carries 24
interactive controls and `MeasureFloorSurface.tsx` two, reaching
`offerNegotiatedAmendment` and `takeNegotiatedFloorVote` in
`legislative-bargaining-actions.ts`. A player presses something and the
negotiation moves. This is the one of the three that needs nothing.

**Budgets are read-only, and the page says so.**
`src/player/BudgetEconomyWorkspace.tsx` exists, resolves
`projectBudgetEconomy`, and shows macro conditions and fiscal availability —
and it contains **zero** buttons, inputs, selects, forms or click handlers.
Its own text tells the player: "Reading this page does not change a budget,
grant fiscal authority, or move time." So the honest answer to "what
player-facing input moves these numbers" is **none, by design, and the game
admits it on the page.** That is not a defect to repair quietly; it is a
decision to confirm or change.

**Healthcare has vocabulary and no substance.** There is no healthcare
file anywhere under `src/` — no model, no numbers, no surface. What exists is
policy _content_: the shipped pack declares a `health-human-services` domain
("Coverage, care and the services people fall back on. Medicaid, insurance,
hospitals, public and behavioral health...") with issues including
`health-human-services.medicaid` and `health-human-services.insurance-access`.
So a player can file a bill about Medicaid, and nothing in the world
represents healthcare for that bill to affect or be measured against. Naming a
subject is not modelling it, and this is the clearest example in the codebase
of the difference.

The pattern across the three is worth stating: **a number on screen, a control
that moves it, and a system underneath are three separate things, and this
game has every combination of them.** Negotiation has all three. Budgets have
the first and third without the second. Healthcare has none, behind a
vocabulary that makes it look present.

## What this sweep did not establish

`PARTY_BODY_CADENCE.repeatedDisputes` still reads 2 on `1c4992e8`. The
people-and-life lane's date-guard fix may be on a branch that has not merged.
This records the threshold, not the state of that fix.

The judgement list in section 3 came from a comparison sweep, not from reading
every one of those call sites in full. Each named line was opened and read; the
sweep's coverage of lines it did not match is unmeasured, so treat the list as
a floor rather than a total.
