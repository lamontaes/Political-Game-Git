# What a law actually does to the world

Measured 2026-09-22 against `main` at `62368c1e`, by driving bills through the
enactment route in code and diffing the world before and after. Every figure
below came out of a run, not out of reading a file. The harness is described at
the end so anyone can repeat it.

The question asked was: pass laws, including combinations of laws, and measure
what moves — GDP, inflation, unemployment, approval — across several saves and
several points in a game's history.

## The short answer

**Enacting a law moves exactly one kind of figure in this build: money in a
named account.** Nothing else in the world responds to a law at all. There is
no GDP, no inflation rate, no unemployment rate and no approval rating that a
law can move, because in a player's save those quantities either do not exist
or are read-only published observations that the game is forbidden to alter.

Two laws _do_ interact, and the interaction is real and already tested: a tax
law collects money into a public account and an appropriation spends from that
same account, so the appropriation succeeds or is refused depending on what the
tax collected. That is the whole of "policy interaction" in the build today, and
it exists in one state.

## What was run

### Every authored legislative scenario, driven to its end

The developer route (`?view=legislation`, `LegislationDevRoute` in
`src/player/LegislationWorkspace.tsx`) carries a filed bill through referral,
committee hearing, committee report, calendar, floor vote, transmittal,
enrollment, presentment, executive action, override and enactment. All nine
authored scenarios were driven step by step and the whole world diffed at the
end.

| Scenario                  | Outcome             | New records written by the run                                                                                       |
| ------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| kentucky                  | enacted             | +20 events, +18 legislative actions, 6 votes, 2 committee actions, 2 referrals, 1 executive disposition, 1 enactment |
| nebraska                  | enacted             | +16 events, +13 actions, 5 votes, 1 committee action, 1 referral, 1 disposition, 1 enactment                         |
| alaska                    | enacted             | +18 events, +16 actions, 5 votes, 2 committee actions, 2 referrals, 1 disposition, 1 enactment                       |
| kentucky-signage          | enacted             | +17 events, +15 actions, 4 votes, 2 committee actions, 2 referrals, 1 disposition, 1 enactment                       |
| alaska-ferry-notice       | enacted             | +18 events, +16 actions, 5 votes, 2 committee actions, 2 referrals, 1 disposition, 1 enactment                       |
| nebraska-credentials      | failed in committee | +4 events, +3 actions, 1 vote, 1 committee action, 1 referral                                                        |
| kentucky-crossing-signals | failed on override  | +19 events, +17 actions, 6 votes, 2 committee actions, 2 referrals, 1 disposition                                    |
| nebraska-winter-clearing  | failed on override  | +15 events, +12 actions, 5 votes, 1 committee action, 1 referral, 1 disposition                                      |
| alaska-harbor-dredging    | failed on floor     | +13 events, +11 actions, 4 votes, 2 committee actions, 2 referrals                                                   |

Every one of those changed keys is a record _of the procedure itself_. Across
all nine runs, enacted and failed alike:

- world metric states written: **0**
- causal effect activations: **0**
- causal processes: **0**
- tax policies adopted: **0**
- money moved: **0**

The bill lifecycle is complete and correct and it terminates in a record that
nothing reads. That is not a bug in the lifecycle; it is that these authored
bills carry no policy content. `introduceMeasure` accepts a
`policyAlternativeIds` list, it defaults to empty, and no route in the game
passes it — so a bill is a designation, a short title, a summary and a subject
class, and there is nothing in it for the world to respond to.

### The one law that moves a figure, six runs

A tax levy filed from office (`fileTaxProposalFromOffice`) becomes an effective
tax policy after enactment (`adoptEnactedTaxPolicy`), on an effective date read
off the enactment plus ninety days rather than invented. Paired with a transit
appropriation, the two laws interact through a public account.

All six runs were in Alaska, the player holding a supplied state House seat,
earning their own money through ordinary shop work first — no cash was seeded.

| Run | Seed                           | Laws filed          | Taxable occurrences | Public account before | Public account after | Metric states / effects |
| --- | ------------------------------ | ------------------- | ------------------- | --------------------- | -------------------- | ----------------------- |
| 1   | effects-A                      | tax + appropriation | 2                   | $0.00                 | $202.00              | 0 / 0                   |
| 2   | effects-A                      | tax + appropriation | 1                   | $0.00                 | $101.00              | 0 / 0                   |
| 3   | effects-B                      | tax + appropriation | 2                   | $0.00                 | $202.00              | 0 / 0                   |
| 4   | effects-C, filed 2031 not 2027 | tax + appropriation | 2                   | $0.00                 | $202.00              | 0 / 0                   |
| 5   | effects-A                      | tax only            | 2                   | $0.00                 | $202.00              | 0 / 0                   |
| 6   | effects-A                      | appropriation only  | —                   | not queried           | not queried          | 0 / 0                   |

Run 6 filed and enacted the appropriation with no tax behind it. Asking for the
service refuses with _"This appropriation takes effect on 2027-05-20"_ — the
route stops at the effective date before it ever reaches the question of
funding, so a player passing a spending law alone is told when it starts, not
that there is no money.

**The interaction between the two laws is real and is already asserted in the
suite.** `src/presentation/civic-funded-service.test.ts` builds the same life
twice, once with $202.00 collected and once with $101.00, against an
appropriation of $200.00. Fully funded, both service periods are paid and
delivered from collected public cash. Underfunded, the second period is refused
with no payment, no service and no cash change. That is one law changing what a
different law can do, measured, passing today (3 tests, 53s).

### Same law, different worlds, identical numbers

Runs 1, 3 and 4 are the same two laws in three different saves — two different
seeds, and one filed four years later in the world's history. **Every figure is
identical to the cent, and so is every date offset.** The tax became effective
ninety days after enactment in all three; the account held $202.00 in all three.

That is a finding in its own right, against the standing expectation that no two
saves should be alike. Nothing in the tax path is drawn from the world's own
condition — not the rate, not the base, not who pays, not what the money is
worth. The player declares a taxable occurrence of a stated amount and the
policy's stated rate applies to it. Two worlds that differ in every other way
produce the same revenue, because revenue here is arithmetic on numbers the
player typed rather than a reading of anything in the world.

## Why nothing else can move

Three separate, deliberate mechanisms, all of which have to change before any
law can move a second kind of figure.

**1. A production save carries no world metrics and no causal mechanisms, by
assertion.** `assertProductionCatalogBoundary` in
`src/simulation/production-catalog.ts` throws if a player's world carries any
world metric definition other than two named exceptions
(`campaign.candidate-support-share` and the authored transit contract quantity),
or any causal mechanism other than that same transit contract. The effects
engine in `src/simulation/causal-effects.ts` is substantial — thresholds,
magnitudes, contributions, aggregate metric evaluation, all of it built and
tested — and a real save is asserted to contain nothing for it to run on. This
emptiness is the repair rather than the defect: the build used to ship players a
synthetic policy corpus and an invented outbreak model, and the fix was to carry
nothing rather than to carry different invented content.

**2. Unemployment and inflation are observations, not state.** What the
Economic context and Macro conditions screens show are BLS LAUS and BEA
published figures, carried with their vintage, release status and geography.
The code says so in its own words: _"No GDP response or policy elasticity is
inferred"_, _"Changing a slider cannot create an economic or GDP effect"_, and
_"An area unemployment rate is not a person's probability of unemployment."_
These are not figures a law is allowed to move; moving them would be writing a
number into a slot labelled as a real agency's published reading.

There is a derived economic layer built on top — `deriveLaborMarketAt`
(unemployment from labour force and employment counts), `derivePurchasingPowerAt`
(real purchasing power from nominal income and a cost level),
`deriveFiscalBalanceAt` (revenue against outlays). **Outside tests, nothing in
the tree calls any of the three.** Their input metrics
(`labor.force-count`, `labor.employed-count`, `prices.cost-level`,
`income.aggregate-personal`, `government.revenue`, `government.outlays`) are
exactly the kind the boundary above refuses. So the simulated economy exists,
takes the right inputs, and is unreachable from a player's save in both
directions at once.

**3. There is no approval rating.** Searched the whole tree: the only support
figure in the game is `campaign.candidate-support-share`, which is a campaign's
own field memo with a stated margin. No officeholder approval, no public opinion
on a policy, no popularity that a law could move. It is not that enacting a law
fails to move approval; approval is not a quantity this game keeps.

## A player-facing consequence worth naming

The Docket workspace offers the player a private conditional fiscal estimate on
a bill in front of them (`src/presentation/legislation-estimate-action.ts`, used
by `src/player/DocketWorkspace.tsx`). It validates the player's office, the
bill's provisions, the reference period and the money, and then looks for a
`government.outlays` metric and a `mechanism.linear-transition` causal mechanism.
Neither can exist in a production save — the boundary above forbids both. So the
route always ends at:

> "A spending scenario cannot be calculated with the information currently
> available."

This is an honest refusal rather than a wrong number, which is the right
failure. But it is a button a player can press, in a normal game, that can never
produce a result, and the sentence does not say that no such estimate is
possible in this build.

## What would have to exist for an effect to be measurable

Named concretely, in the order they block each other.

1. **A bill has to be about something.** `introduceMeasure` already takes
   `policyAlternativeIds`; no caller passes it. A policy alternative already
   carries a `propositionId` and quantitative metric operations (set-level,
   absolute-change, relative-change, share-of-baseline, cap, floor). The six
   sites that introduce measures would have to attach the bill's policy content
   at filing. Until then a bill has nothing an effect could read.
2. **The world has to keep the figure the law would move.** That means a world
   metric definition in a player's save — `labor.employed-count` or a cost level
   or a jurisdiction's own revenue — which today the production boundary refuses
   by name. Relaxing it is a deliberate act the file asks for explicitly: say
   where the content came from, exactly as the policy packs now do by declaring
   `authored-fiction` or `sourced`.
3. **Something has to activate an effect at enactment.** `recordEnactment` today
   writes a record and returns. The tax path is the pattern that works:
   `recordNewlyEnactedTaxPolicies` watches for new enactments and turns the
   matching ones into an operative policy on its own effective date. The
   equivalent for a causal effect would activate a mechanism from the bill's own
   policy alternative, against a metric that exists, with the bill as its
   recorded source.
4. **Only then is there anything to compare across saves,** and only then does
   the world's own condition have somewhere to enter the arithmetic, which is
   what would make two saves differ.

Steps 2 and 3 are engineering on top of machinery that already exists. Step 1 is
the gate, and it is small. What is _not_ small, and is a product question rather
than an engineering one, is what a law should actually do to a figure — the
question filed as research alongside this record.

## Coverage note

The tax route works in **one jurisdiction in the country**.
`src/fiscal-authority/tax-powers.generated.json` carries a single acquired
tax-power contract, `US-AK`, dated 2026-09-06, and `fileTaxProposalFromOffice`
refuses with _"No acquired tax-power contract supports this office and
instrument"_ everywhere else. So the one law in the game that moves a figure can
only be passed in Alaska, and only after that date.

## How to repeat this

Both harnesses are throwaway scripts, deliberately not committed; they are
reproduced here so the runs can be re-done rather than taken on trust.

- **All nine scenarios:** for each key from `legislativeScenarioKeys()`, build
  with `createLegislativeScenario`, then loop `availableMeasureSteps` (skipping
  `offer-amendment`) through `applyLegislativeStep` until the measure is
  terminal, snapshotting every `world.history` array length plus the metric,
  mechanism and policy catalog sizes before and after.
- **The tax and appropriation runs:** `createNewGameWorld` in Alaska at age 40,
  `addSuppliedLegislativeSeat("US-AK", "house")`, advance to the filing date,
  earn to $202.00 through `shop-assistant` career work, then
  `fileTransitAppropriation` and `fileTaxProposalFromOffice`, each enacted
  through `prepareRecordedLegislativeSitting` plus the step loop, then pass days
  to the policy's effective date, declare the occurrences, and read the public
  account with `publicTaxAccountForJurisdiction`.
- **The interaction, already in the suite:**
  `npx vitest run src/presentation/civic-funded-service.test.ts` — 3 tests, all
  passing at this head.
