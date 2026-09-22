# What a law actually does to the world

Measured 2026-09-22 against `main` at `62368c1e`, by driving bills through the
enactment route in code and diffing the world before and after. Every figure
below came out of a run, not out of reading a file. The harness is described at
the end so anyone can repeat it.

The question asked was: pass laws, including combinations of laws, and measure
what moves — GDP, inflation, unemployment, approval — across several saves and
several points in a game's history.

## Correction, added after the first pass

The first version of this record said no GDP, inflation or unemployment figure
exists in a player's save for a law to move. **That was wrong, and wrong in the
direction that matters.** It came from looking at world metrics and at the
BLS/BEA observation panel and concluding those were all the economy there was.

There is a second, separate economy, kept in `world.macroEconomy` rather than in
the metric catalog, which is why a search for world metrics missed it entirely.
It is a live modelled national economy, it steps every month in an ordinary
player's save, and the player can see it. Measured below. Everything the rest of
this record says about the _catalog_ boundary, the causal-effects engine and the
three `economy.ts` derivations still holds — those are genuinely empty and
genuinely uncalled. But they are not the only economy, and the live one changes
the answer to the question that was asked.

## The live economy, measured

Through the ordinary opening route (`prepareOpeningLife` → `generateOpeningLife`,
which is what `PlayerGame.tsx` uses), then advancing an ordinary life with the
ordinary transition registry. Two seeds, both Kentucky, age 40, read at day one
and after roughly one and two years.

|                                     | seed macro-A         | seed macro-B         |
| ----------------------------------- | -------------------- | -------------------- |
| opening unemployment                | 3.571122%            | 4.229721%            |
| opening 12-month inflation          | 1.373956%            | 2.174871%            |
| housing, first month                | shortage             | surplus              |
| unemployment after ~1 year          | 3.481064%            | 4.425896%            |
| unemployment after ~2 years         | 3.853804%            | 4.823765%            |
| inflation after ~1 year             | 1.835716%            | 2.425062%            |
| inflation after ~2 years            | 2.430386%            | 2.730191%            |
| real output growth, latest quarter  | 1.386243% annualized | 1.173759% annualized |
| monthly records written in ~2 years | 26                   | 26                   |

So: real output growth released quarterly, an unemployment rate and a 12-month
consumer price inflation rate released monthly, plus a housing supply-to-demand
ratio, all national, all carried in the save with their own release keys, all
shown on the Macro conditions panel. **Two saves are genuinely different and
drift apart** — which is the standing expectation, met, in the one part of the
game that models an economy.

The kernel is a real model rather than a lookup: inflation persists at 0.95 month
to month, and unemployment responds to the _previous_ month's growth gap with an
Okun-style coefficient of 0.04, with authored innovation standard deviations on
all three series. That is the formula already sitting behind a hard check.

## What a law cannot do to it

The economy moves through **shocks**. `CHANGE_AUTHORED_IMPULSES`
(`src/simulation/macro-economy/policy.ts:101`) authors a signed impulse profile
for **eleven** shock kinds — percentage points added to growth, unemployment and
inflation at full intensity, decaying geometrically by a `monthlyRetention`
factor unless the origin records an end, and naming the sectors each one hits.

A shock reaches the kernel only through an **origin reader**. There are
**two**, and between them they can emit **three** of the eleven kinds:

| Reader                           | Kinds it can emit                                             | What triggers it                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `W3_INTERNATIONAL_ORIGIN_READER` | `trade-disruption`                                            | Exactly one living-world subject, index `"0"`, the authored sentence about shipping delays on an international trade route. The map has one entry. |
| `CRISIS_ORIGIN_READER`           | `disaster-reconstruction`, `international-conflict-spillover` | Disasters and crises.                                                                                                                              |

**The other eight kinds are authored, sitting in the table, and nothing in the
game can ever emit them.** Among them, by name:

- `revenue-shortfall` — growth −0.05pp, unemployment +0.01pp, retention 0.6
- `revenue-windfall` — growth +0.05pp, unemployment −0.01pp, retention 0.6
- `credit-tightening`, `productivity-improvement`,
  `energy-input-cost-disruption`, `regional-industry-downturn`,
  `regional-industry-boom`, `public-health-disruption`

A revenue shortfall and a revenue windfall are precisely what a tax rise, a tax
cut and an appropriation produce. The vocabulary for a law's effect on the
economy is already written, with magnitudes and a decay curve, and the only
thing missing is something that watches enacted measures and emits one.

**So the honest answer to "make policy effects measurable" is not "build an
economy".** The economy is built, it runs, it is seen, and it differs per save.
It is one origin reader away from a law. That reader would sit beside the two
that exist, read the enactment records this build already writes, and emit a
shock of the kind the law is — the same shape as the disaster reader, against a
kernel that already handles persistence and decay.

Two things stand between that and shipping, and both are decisions rather than
engineering. The impulse magnitudes say so themselves: they are _"CHANGE-authored
placeholders for first play. They are not estimates and are reported to the
director for confirmation; a later confirmed table is a new version, never a
silent edit of this one."_ And nothing yet says which law is which shock kind,
because a bill is not about anything yet (see below).

## The short answer

**Enacting a law moves exactly one kind of figure in this build: money in a
named account.** Nothing else in the world responds to a law at all.

That is not because the figures are missing. ~~There is no GDP, no inflation
rate, no unemployment rate and no approval rating that a law can move, because
in a player's save those quantities either do not exist or are read-only
published observations that the game is forbidden to alter.~~ [Edit: the first
three are wrong. A player's save carries a live national economy that steps
every month — real output growth, an unemployment rate, a 12-month inflation
rate — which differs between saves and drifts over time. See the correction
above, which supersedes the struck sentence.] What is missing is any route from
an enacted law into it: the economy moves on shocks, eleven shock kinds have
authored magnitudes including a revenue shortfall and a revenue windfall, and
only three of the eleven can ever be emitted — by disasters and by one authored
sentence about international shipping. Nothing a government does can emit any of
them.

There is no approval rating at all, and that part stands. The unemployment and
price figures on the _Economic context_ screen are a different thing again: real
BLS and BEA readings the build deliberately refuses to infer a policy response
from.

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

There is a derived economic layer built on top, and it is worth naming exactly,
because it is the closest thing the game has to the machinery this question
needs. Three derivations in `src/simulation/economy.ts`:

| Derivation                | Inputs it requires                                                                                            | What it produces                                                                                        | Could an enacted law supply the input?                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deriveLaborMarketAt`     | `population.resident-count`, `labor.force-count`, `labor.employed-count`, all exact `count:people` quantities | resident population, labour force, employed, unemployed, and an **unemployment rate** as an exact share | Not directly. A law does not hire or fire anyone. It would have to move employment through an intermediate the game does not have.                                                                         |
| `derivePurchasingPowerAt` | `income.aggregate-personal` (money), `prices.cost-level` (an `index:cost-level` quantity)                     | real purchasing power of that income                                                                    | Partly. A law that transfers money could plausibly move aggregate personal income; nothing in the game has any claim on a cost level.                                                                      |
| `deriveFiscalBalanceAt`   | `government.revenue`, `government.outlays`, matching scope and interval                                       | revenue against outlays                                                                                 | **Yes, and this is the one.** The tax route already collects real money into a named public account and an appropriation already spends from it. Those two are revenue and outlays in everything but name. |

**Outside tests, nothing in the tree calls any of the three.** Every input metric
above is exactly the kind `assertProductionCatalogBoundary` refuses by name. So
the simulated economy exists, takes well-specified exact inputs, guards its own
identities (labour force cannot exceed population, employed cannot exceed labour
force), and is unreachable from a player's save in both directions at once: the
save may not hold its inputs, and no code asks it for its outputs.

The shortest honest path from where the game is to a law moving a figure runs
through `deriveFiscalBalanceAt`, because its two inputs are the only quantities
in this game a law already moves for real.

**3. There is no approval rating.** Searched the whole tree: the only support
figure in the game is `campaign.candidate-support-share`, which is a campaign's
own field memo with a stated margin. No officeholder approval, no public opinion
on a policy, no popularity that a law could move. It is not that enacting a law
fails to move approval; approval is not a quantity this game keeps.

## A player-facing consequence worth naming

First, what does work, because the distinction matters. `legislation-analysis.ts`
separates two things on purpose: reading what a bill's sections _say_ they cost
is arithmetic on the bill's own text, available in every world, recomputed when
an amendment changes the provisions — and the Docket page shows it. Forecasting
what the programme would _do_ needs a measured series and a baseline. The module
says so in its own words: a new game carries neither, so it names the missing
series rather than inventing a budget, an analyst or an impact.

What does not work is the second one, and the player is still offered it.
`DocketWorkspace.tsx:495` enables the estimate control whenever the bill states
a ceiling and either authorizes or provides money and has no annual provision —
a test about the bill, not about whether an estimate is possible. Pressing it
runs `legislation-estimate-action.ts`, which validates the office, the
provisions, the reference period and the money, and then looks for a
`government.outlays` metric and a `mechanism.linear-transition` causal mechanism.
Neither can exist in a production save — the boundary above forbids both. So for
every money bill in a normal game the route ends at:

> "A spending scenario cannot be calculated with the information currently
> available."

This is an honest refusal rather than a wrong number, which is the right
failure. But the control is offered on the basis of the bill and refused on the
basis of the world, so it can never succeed in a normal game, and the sentence
reads as "not right now" when the truth is "not in this build".

## What would have to exist for an effect to be measurable

Named concretely, in the order they block each other.

1. **A bill has to be about something.** `introduceMeasure` already takes
   `policyAlternativeIds`; no caller passes it. A policy alternative already
   carries a `propositionId` and quantitative metric operations (set-level,
   absolute-change, relative-change, share-of-baseline, cap, floor). **Seven**
   sites call `introduceMeasure` and not one passes the field:
   `presentation/legislation-bundle-docket.ts:343`,
   `presentation/legislation-docket.ts:951`,
   `presentation/legislation-world.ts:434`, `presentation/tax-work.ts:47`,
   `simulation/governing/legislative-clock.ts:706`,
   `simulation/legislation-scenarios.ts:732` and
   `simulation/municipal-public-work.ts:1673`. Each would have to attach the
   bill's policy content at filing. Until then a bill has nothing an effect
   could read. (An earlier count of six, carried in project memory, was short by
   one and named a stale line number; the seven above were re-grepped at this
   head.)
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
