# Where every number comes from, and what a player can do about it

lamontae, 2026-09-22: _"i want to know not only the numbers but i want it to be
proven where those numbers come from - i.e. the player facing input if there is
one"_ — and that the economy is not the game: healthcare, negotiation and
budgets are his subject too.

So every figure below gets three lines. **What it is.** **Where it is computed**,
by file. **What a player can press that moves it**, or a plain statement that
nothing can. Read at `493720e2`, branched from main `62368c1e`.

---

## Two economic panels, and only one of them is real data

This is the correction the exercise produced, and it is a conflation rather
than a reversal. **The game has two economic surfaces and they have completely
different provenance.** This lane has written about them as though they were
one thing, which made an accurate sentence about one of them into a wrong
sentence about the other.

### Economic context — real published observations

`presentation/economic-context.ts`, shown by `player/EconomicContextPanel.tsx`.
These are BLS LAUS and BEA figures compiled from locked publisher bytes
(`src/source/domains/bls-laus/`), carried with their vintage, release status
and geography. The panel tells the player so in its own sentence, including
_"This area rate is not your personal chance of losing a job."_

**Player-facing input: none, and correctly so.** These are somebody else's
published readings. A law must not move them, and the build refuses to infer a
policy response from them on purpose. Everything this lane has said about this
panel stands.

### Macro conditions — authored constants and a random draw

`presentation/macro-conditions.ts:94`, shown by
`player/MacroConditionsPanel.tsx` and inside the Budget & economy workspace.
This is **not** published data, and this lane has previously described it as
though it were. Each series is built from `macroReleasesAt(...)` filtered to
`scope === "national"`, and those releases are written monthly by
`simulation/macro-economy/producer.ts:448` off a series the save computes for
itself. The starting values come from `macro-economy/kernel.ts:60`, which takes
the constants in `macro-economy/policy.ts:17` and moves them by a latent draw:

| constant                 | value     | what the source file calls it                                      |
| ------------------------ | --------- | ------------------------------------------------------------------ |
| unemployment             | 4.6%      | "Retained ALIVE archive/calibration example, not a required value" |
| consumer price inflation | 2.7%      | "Retained ALIVE archive/calibration example, 12-month CPI"         |
| real output growth       | 2%        | "Authored normal-growth anchor"                                    |
| housing supply/demand    | 1.0       | "Authored neutral: neither shortage nor surplus"                   |
| policy rate              | 3.5-3.75% | "Retained reference"                                               |

Month to month it moves by an Okun-style rule — growth persistence 0.85,
inflation persistence 0.95, unemployment responding to the **previous** month's
growth gap at 0.04 — plus a random innovation each month of 0.15pp on growth
and 0.04pp on unemployment and inflation. The constant holding all of it is
named `CRUNCH46_PROVISIONAL_POLICY`, and nothing in
`src/simulation/macro-economy/` reads a real observation anywhere.

**Measured proof rather than assertion.** Four saves identical except the
player's town, read from the kernel, December 2026 national unemployment:

| Bemidji MN | Galena IL | Chicago IL | Houston TX |
| ---------: | --------: | ---------: | ---------: |
|     4.894% |    5.979% |     5.543% |     4.580% |

A published national figure is the same number in every save. These are four
different numbers, because each save drew its own.

**Player-facing input: none.** No screen changes any of them, and no law can
either — the shock vocabulary exists (`CHANGE_AUTHORED_IMPULSES`) and no
enacted law emits one.

### Why the distinction is worth holding onto

The honest sentence for each is different. For Economic context it is _"this is
real and a law may not touch it."_ For Macro conditions it is _"this is
authored calibration, labeled provisional in its own file, and nothing in play
reaches it."_ The first is a design decision to defend. The second is a wire
that does not exist.

---

## Healthcare

**What exists, and it is more than expected.** A health episode carries a
severity, a functional limitation, a course of states, an access level, and who
knows about it. `crisis/health.ts`.

- **Where it is computed.** `beginHealthEpisode` (`crisis/health.ts:284`). The
  course advances on a scheduled review, `healthReviewHandler` (`:574`),
  registered on `HEALTH_REVIEW_KEY` in `crisis/index.ts:54`. So it genuinely
  progresses; this is not a stub.
- **What starts one.** Two callers. `crisis/disaster.ts:420`, a resident of a
  damaged home, which is live. And `crisis/international.ts:959`, inside
  `recordViolenceAttempt`, which has no caller at all — so that half is dead.
  **The only way anybody in this game becomes ill or hurt is a natural
  disaster damaging their home.** There is no illness, no chronic condition,
  nothing arising from age.
- **The chance, exactly.** `disaster.ts:81`, per resident of a damaged home:
  **minor 0%**, moderate 3%, major 8%, catastrophic 15%, doubled if the home
  was destroyed rather than damaged. A minor hazard can never injure anybody,
  by construction.
- **Measured.** Ten years of one Kentucky save: 42 hazard episodes, 124
  disaster responses, 15 damage records, and **zero `health-episode`
  records**. In a decade, with 42 disasters, nobody was hurt once. The
  magnitude mix of those 42 was not recorded in that run and is the next thing
  to measure, because if they were all minor then the injury rate was 0% by
  the table above and no draw ever had a chance to land.
- **Player-facing input: one, and it is a disclosure, not a treatment.**
  `discloseHealthEpisode` is wired from `player/CrisisNoticesPanel.tsx:278` —
  the player chooses who learns about a condition. `healthDecisionsFor`
  (`:670`) reaches the player through `presentation/crisis-shell.ts:105`.
  Nothing a player presses causes, treats, cures or pays for health.

---

## Negotiation

**This one works, and it is the clearest positive answer in this document.**

- **Where it is computed.** `presentation/legislative-bargaining-actions.ts` —
  `offerNegotiatedAmendment` (`:178`) and `takeNegotiatedFloorVote` (`:291`),
  over the decision machinery in `simulation/legislative-bargaining-decisions.ts`.
- **Player-facing input: yes, two real controls.**
  `player/MeasureFloorSurface.tsx:175` offers an amendment and `:182` takes the
  floor vote. A player's offer changes what members do and the result is a real
  count.
- So when this document says elsewhere that a player's action reaches nothing,
  that is a statement about those systems and not about this one.

---

## Budgets

- **Where it is computed.** `presentation/budget-economy.ts:43`
  (`projectBudgetEconomy`), with exact fiscal graphs underneath and
  `simulation/public-fiscal.ts` holding the payment rules.
- **Player-facing input: none on that screen, and the screen says so itself.**
  `player/BudgetEconomyWorkspace.tsx:58` renders, to the player, in the game's
  own words: _"Reading this page does not change a budget, grant fiscal
  authority, or move time."_ That is honest and it is also the whole answer:
  the budget screen is a reading surface.
- **The one route that does move money** is a law. An enacted revenue measure
  collects into a named public account and an enacted appropriation spends from
  it; those two interact, and the interaction is asserted in
  `civic-funded-service.test.ts`. It works in exactly one jurisdiction in the
  country, Alaska, because one acquired tax-power contract exists. That is the
  worked example of an honest effect, and it is the only one.

---

## Where the people come from, measured

The people-and-life lane found that nobody is ever born in a running game: the
birth writer has no caller outside tests, and could not fire anyway because no
couple ever forms. This lane's Kentucky save has the population going from 555
to 1,053 in ten years. Both are true, and this settles how.

**One Kentucky year, the arrivals counted and their ages asked.** 556 people
became 640; **84 new people**; ages **29 to 69**, median **46**; **none under
18, and not one under 29.** Nobody was born. Every arrival walked in as a
middle-aged adult.

**What created them, by name, and it accounts for all 84.** 82 of the 84 are
named in `world.legislative-seat-tenure` events — congressional turnover
minting successors and defeated challengers, `living-world/congress-turnover.ts:391`,
where a person is made with a drawn name, a generated identity and a birth date
computed backwards from a drawn age. The other 2 are named in
`press.reporter-joined-outlet`: scene demand, a newsroom needing somebody to
write a story.

So for that year the split is **98% elections, 2% scene demand**, which
refines an estimate the people-and-life lane was careful not to claim. One
save, one year, one state; the shape is likely stable but the exact share is
not yet measured over ten.

**Player-facing input: none**, and this is the finding rather than the
plumbing. The world grows by manufacturing adults to fill institutional roles.
None of those routes assigns a party, which is the whole of the 48% answer:
the people arriving are defeated candidates and minor officials, and the code
that mints them has nothing to say about what they believe.

---

## The rest of the figures this lane has reported

| figure                          | computed in                                                                | player input that moves it                                                                                                |
| ------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| people alive, arrivals          | people generation on the world clock                                       | none                                                                                                                      |
| party affiliation of a person   | `living-world/party-evolution.ts` `affiliationAt`                          | none — and nothing else assigns one either, which is why 48% of a ten-year world belongs to no party                      |
| party evolution changes         | `living-world/party-evolution.ts`                                          | a party body review the player can attend; the stance that drives it is drawn at random without reading who the member is |
| hazard episodes                 | `crisis/hazard-producer.ts`, Poisson at the NOAA recorded state-month rate | none                                                                                                                      |
| disaster response and repair    | `crisis/disaster.ts`                                                       | none at state or federal level; the player is not in that chain                                                           |
| officeholder deaths             | `crisis/mortality.ts`, SSA 2023 life table                                 | none                                                                                                                      |
| a law's receipt into an account | `adoptEnactedTaxPolicy`                                                    | **yes** — enacting a revenue measure through the Docket                                                                   |
| ballot status of a party        | `living-world/party-evolution.ts:417`                                      | none; the function takes no arguments, returns a literal, and has no caller                                               |

---

## What this adds up to

Of everything a player can see change, **two things move because a player did
something**: a negotiated amendment and floor vote, and money collected by a
law they passed. Everything else on this list moves on its own or does not move
at all.

That is not a complaint about the economy being wrong. The economy is carefully
built, its constants are labeled honestly as provisional calibration examples
in their own source file, and it refuses to infer effects it cannot source.
The finding is narrower and more useful: **the most prominent numbers in the
game are authored placeholders, and no route in play reaches them.**
