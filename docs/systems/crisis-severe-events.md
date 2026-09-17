# CRISIS severe events

Authority: CRUNCH46 §11 (CRISIS), §13 (provisional policy and event
envelopes) and ALIVE44 chunk 6. CRISIS produces severe-event facts. It does
not decide who succeeds to an office (GOVERNING), how a family or a
controlled life continues (PEOPLE), what an event does to the economy
(CHANGE), or what the press publishes (PRESS). Those lanes read the typed
projections below.

Everything CRISIS writes lives on the shared history sequence as
`history.crisisRecords` (`crisis-record-v1`), alongside the existing vitality
writers for death and functional capacity. Worlds written before CRISIS have
no such field and load unchanged.

## K1 ordinary mortality

Source: SSA 2023 period life table as used in the 2026 Trustees Report,
ages 0–119, male and female annual `qx`
(`src/simulation/crisis/ssa-2023-period-life-table.json`). The SSA CDN refuses
scripted clients, so the table was read through an in-browser GET (HTTP 200,
56,589 bytes, SHA-256 `e2aababb…907f`) and transcribed from the page's table.
Raw bytes are not committed; the packet's sample values (age 26 and age 80,
both categories) are asserted in tests. Ages above 119 reuse the age-119 rate,
an authored extension.

Model `crisis-mortality-hazard-v1`:

- `qx` is converted once to the age-year hazard `H = −ln(1 − qx)`. Inside an
  age-year of `D` days each day carries `H / D`, so splitting at birthdays is
  exact. The engine never rolls `qx` per month.
- Each person has one survival threshold `−ln(u)`, drawn from a fork keyed
  only by world seed and person id. Nothing else can reroll it.
- A person dies on the first day whose end brings accumulated hazard to the
  threshold. The total is a pure function of dates and records, so any
  partition of a time skip yields the same day. Logarithms and sums are
  BigInt fixed-point, identical in every JavaScript engine.
- The category is `equal-mixture` (the mean of the two source hazards) unless
  a `mortality-calibration` record states one. It is never inferred from
  gender identity, name or appearance. Office, party and fame change nothing.
- On the first of each month a `crisis:mortality-window` due item exposes every
  living person the World holds (production worlds are mostly lightweight
  people, including officeholders) and schedules a `crisis:mortality-death`
  item on the exact crossing day, if it falls in that month. Nothing stores a
  future death date. A death item re-derives its day when it comes due and
  cancels itself if a later hazard change moved it.
- Death uses `recordPersonDeath` with cause
  `crisis-mortality:all-cause-unresolved`. A life table is not a diagnosis.
- An older save starts exposure at the first month boundary after its first
  time advance (`ensureCrisisMortality`, called from `passOrdinaryDays`).
  Earlier history is not reinterpreted.

## K2 health and incapacity

`beginHealthEpisode`, `changeHealthState` and `discloseHealthEpisode` write
separate dated records for onset, state, functional limitation and
disclosure (`private` → `specific-people` → `official` → `public`; disclosed
information never becomes less known). Capacity changes go through
`recordPersonFunctionalCapacity`. No researched condition pack is installed,
so every episode is a labeled `simulation-episode`: no disease name, no
prognosis, no death date.

Authored first-playable recovery courses (`crunch46-provisional-v1`, not
clinical data): acute → limited at day 7 → recovered at day 21; serious →
limited at day 30 → recovered at day 90; chronic continues. Death is never
scripted by a course: it comes from K1 hazard (an episode may carry an
authored multiplier with a stated basis) or from an explicit injury outcome.
When a person dies, their open episodes close as `deceased` on the death date.

A diagnosis alone never touches office. An incapacity becomes an institutional
fact only when the responsible people know it (`official` or `public`). For an
incapacitated NPC officeholder, staff learn it the next day (authored policy).
The controlled person's own disclosure is always their decision.

## K3 office continuity (consumed by GOVERNING)

When a current officeholder dies, or a known incapacity begins or ends, CRISIS
writes one `official-continuity` record with the offices frozen as held just
before the change, plus an ordinary `crisis.officeholder-*` event (public for
a death). Office detection reads what the World already represents: elected
President/Vice President, opening federal tenures, state executives and
Congress seats. CRISIS never ends a term, names a successor, invokes the 25th
Amendment or schedules a vacancy election.

## K4 flood and severe-storm chain

`declareHazardEpisode` declares one episode on the current day with explicit
family, magnitude (`minor`…`catastrophic`), state and affected jurisdictions,
and a stated basis. The first wave predicts no local annual hazards; nothing
declares an episode by chance.

1. **Damage** is drawn per represented record located in the affected
   jurisdictions: household locations, dwellings and organization profiles.
   Production openings hold almost no such records, so damage counts are small
   and honest; nothing counts unrepresented homes or people. Residents of a
   damaged home may be injured (a K2 episode with `injury` origin) and, for a
   destroyed home in a major or catastrophic event, may die
   (`crisis-injury:<family>`). A `disaster-assessment` freezes the counts.
2. **Local response** is recorded the same day (public event).
3. **Governor request.** Three days later the current governor decides. An
   NPC governor requests federal help for major or catastrophic events, or a
   moderate event that destroyed a home; a player governor decides with
   `decideStateDisasterRequest` inside the 30-day window of 44 CFR 206.36(a)
   and otherwise lapses. No recorded governor means no request, said so.
4. **Federal decision.** Ten days after a request the current President
   declares (major or catastrophic) or denies (NPC), or a player President
   decides with `decideFederalDisasterDeclaration`. No recorded President
   leaves the request undecided, said so.
5. **Repairs.** Weekly cycles apply finite repair capacity to the oldest
   damage first: 2 units locally, 8 once a declaration exists. Damaged homes
   need 2 units, destroyed 8. Interrupted organizations carry lost-service
   days, not repair work.
6. **Follow-up.** Once recorded repairs are done and the request chain has
   settled, a public recovery review closes the episode.

A declaration never changes the assessment, approval never repairs on the
spot, and a denial or missing request leaves the disaster and its damage in
history. CRISIS records programs (`public-assistance`, …) but never an amount:
money moves only through GOVERNING's public-account writers.

All numbers above are `crunch46-provisional-v1` authored balancing
(`PROVISIONAL_DISASTER_POLICY`), not empirical damage curves or FEMA
thresholds. Pending player decisions appear in `pendingDisasterDecisions` and
`crisisProtectedDecisions`.

CHANGE reads `disaster-damage` (from the assessment: counts with units and an
ordinal severity), `aid-decision` (declared/denied, programs, `amount: null`)
and `repair-progress` envelopes (in-progress, repaired, and `ended` at
follow-up).

## Read-only projections

| Export                                                    | Consumer      | Meaning                                                                       |
| --------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------- |
| `crisisOfficeContinuityNotices(world, { afterSequence })` | GOVERNING     | officeholder death / incapacity began / ended, with offices and source record |
| `crisisPersonDeathNotices(world, { afterSequence })`      | PEOPLE        | every death, cause resolved or not, controlled-person and held-office flags   |
| `crisisEnvelopesBetween(world, from, to, { visibility })` | CHANGE, PRESS | §13 envelopes by effective date                                               |
| `crisisEnvelopeDedupeKey(envelope, consumer, version)`    | all           | exactly-once key                                                              |
| `crisisProtectedDecisions(world, afterSequence)`          | time command  | facts only the controlled person can act on                                   |
| `healthDecisionsFor(world, personId)`                     | UI            | a person's open episodes and the disclosures still available                  |

Reads never write.

## Shared registration

The only edits outside `src/simulation/crisis/` are registrations: the
`crisis-record` entity kind and optional `history.crisisRecords`
(`types.ts`); history sequence, integrity and event-entity checks
(`world.ts`); due-item provenance (`future-transitions.ts`); death/capacity
sources (`vitality-integrity.ts`); the production handler registry
(`campaigns.ts`); the simulation barrel; and starting the model in
`passOrdinaryDays`.
