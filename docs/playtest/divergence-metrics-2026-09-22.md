# What to measure when we ask whether the world diverges

Written 2026-09-22 by the hardcoded-content audit lane, for the playtest lane
to execute. lamontae asked for metric points after his ten-year run, whose
conclusion was: "the world diverges richly, and nobody in it is changed by what
happens."

That sentence contains two separate claims, and they need two separate
measurements. The first is about **spread** — do different seeds produce
different worlds. The second is about **consequence** — does anything that
happens change anybody. A run can score well on the first and zero on the
second, which is exactly what he observed, and a single "does it feel varied"
impression cannot tell them apart.

Everything below is defined so that a failure is distinguishable from nothing
having been measured. That is the standing hazard here: a probe that finds no
difference and a probe that never ran produce the same number.

## A. Spread: does the seed actually change the world

Run N ≥ 10 saves that differ **only** by seed, with the same place, the same
start age and the same start kind. For each, record the values below at day 0
and again at year 10.

| Point | What to record                                            | What a pass looks like                                                                                                                                                                      |
| ----- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1    | Count of people in the world                              | Varies across seeds. A constant is a defect.                                                                                                                                                |
| A2    | The player's starting household composition               | At least three distinct shapes across ten seeds.                                                                                                                                            |
| A3    | Names of the five nearest NPCs                            | No name appears in more than three of ten seeds.                                                                                                                                            |
| A4    | The set of offices the campaign screen offers             | May legitimately be identical — it is a function of place, not seed. Record it anyway, so that a difference is visible if one appears.                                                      |
| A5    | Who reaches out to the player, and how often, over year 1 | Prior measurement: 16 of 20 saves at age 40 had someone reach out, mostly colleagues from generated job history. Re-measure at age 20 and age 60.                                           |
| A6    | The front-page news sentences printed in week 1           | Prior measurement: 22 authored sentences behind the whole news surface, and three outlets print one sentence word for word. Record how many **distinct** sentences a player sees in a year. |

**The number that answers his question is a sameness rate**: for each point,
the share of seed pairs that produce an identical value. Report it per point,
not as one average — an average hides a point that is pinned at 100%.

**Four seeds that agree are not a rule.** Ten is the floor for stating a rate,
and the rate is reported with its denominator every time.

## B. Consequence: is anybody changed by what happens

This is the half his run says is at zero, and it is the half worth the time.
For each of the following, the measurement is the **same world read twice** —
once before the event, once after — not two worlds compared.

| Point | The event                                    | What must differ afterwards                                                                                                                                                                                         |
| ----- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1    | A law is enacted                             | Any recorded value outside the bill record itself. Prior measurement: a production save is asserted to carry zero causal mechanisms, with one exception, an enacted tax levy.                                       |
| B2    | A NOAA-driven disaster fires                 | Any person's recorded state, any office's agenda, any news beyond the event's own summary sentence.                                                                                                                 |
| B3    | The player wins an election                  | Whether any NPC's recorded belief, standing or behavior toward the player differs.                                                                                                                                  |
| B4    | The player takes a public position           | Whether any NPC records a belief in response. Prior measurement: `recordPrivateBelief` and the NPC belief-formation routine both exist and are registered on no scheduled step, so the expected answer today is no. |
| B5    | Ten years pass with the player doing nothing | What changed anyway. This is the control for B1–B4: if the world moves the same amount whether or not the player acts, the divergence in section A is weather, not consequence.                                     |

**B5 is the point to run first.** If a do-nothing ten-year run and an active
ten-year run diverge by the same amount on the section A points, then section A
is measuring generation, not play, and every number in it should be read that
way.

## C. What he named specifically

He asked about regional and local drift that ends up affecting a larger region:
a popular president turning the South, a genuine third-party system, and how
the crisis system works. Each is a B-type question, and each needs its own
before-and-after:

- **A popular president turning a region.** Read the recorded party standing of
  a set of states before and after a presidency. If no such per-state standing
  value exists, that is the finding, and it is a bigger one than any number.
- **A third party.** Whether a party founded in play appears on a later ballot,
  in a later news sentence, and in a later person's recorded affiliation.
  `party-evolution.ts` decides split-or-found on `allies.length >= 2`, a bare
  constant, so record what the constant produced as well as what happened.
- **The crisis system.** He reports NOAA-driven disasters work and that wars,
  assassinations and scandals cannot start. The measurement is which of the
  three has a producer with a caller the clock reaches — not whether the type
  exists.

## How to report it

One table of numbers with its denominator, then the sentences that the numbers
support and nothing further. Say which build, which branch and which seeds.
A run that produced no number is reported as a run that produced no number,
not omitted.
