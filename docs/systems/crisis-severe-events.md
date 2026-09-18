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
- On the first day of each calendar quarter a `crisis:mortality-window` due
  item exposes every living person the World holds (production worlds are
  mostly lightweight people, including officeholders) and schedules a
  `crisis:mortality-death` item on the exact crossing day, if it falls in that
  quarter. Nothing stores a death date beyond the current quarter. A death
  item re-derives its day when it comes due and cancels itself if a later
  hazard change moved it. Quarterly (rather than monthly) windows keep the
  clock's fixed per-due-item cost down; they do not change any death day.
- `crisis:*` due items are World processes: the resolver settles them even
  when a caller advances time with a narrower handler registry.
- Death uses `recordPersonDeath` with cause
  `crisis-mortality:all-cause-unresolved`. A life table is not a diagnosis.
- An older save starts exposure at the first quarter boundary after its first
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
Congress seats. Office keys are `us-president`, `us-vice-president`,
`us-chief-justice`, the state executive's own office key, and Congress seat
keys (`us-house:KY-03`, `us-senate:KY:class-2`). CRISIS never ends a term, names a successor, invokes the 25th
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

## K5 international crisis, first depth

The World represents no foreign governments yet, so `declareInternationalCrisis`
names an authored, fictional counterparty and allies (“a foreign government”)
and never a real state. The player is not the cause: the World declares the
incident, and the player decides only while holding the Presidency.

1. **Incident** (public) and an **intelligence assessment** (limited) with a
   drawn confidence and an assessed intent that can be wrong.
2. **Options** two days later: diplomatic, economic (both non-force) and
   force posture (force-capable), with adviser positions, risk and legal notes
   and a recommendation.
3. **Decision.** An NPC President takes the recommendation; a player President
   decides with `decideInternationalCrisis`; with no President recorded, the
   departments continue diplomatically and the record says so.
4. **Responses** five days later: the counterparty de-escalates, holds or
   escalates and allies support or stand aside, each drawn independently of
   the player. Tension moves with the answer. Up to three cycles run fourteen
   days apart; a de-escalation ends the crisis, and after the third cycle it
   settles into a standoff.
5. **War Powers**, only when force posture introduces forces: a report the
   next day (§1543(a), within 48 hours); after 60 days without a recorded
   declaration or authorization (§1544(b)) an NPC President certifies the
   30-day safe-withdrawal extension and forces leave at its end; a player
   President may certify with `certifyWarPowersExtension`, and otherwise forces
   leave at day 60. Forces also leave when the crisis ends. Diplomatic and
   economic decisions start no clock.

CHANGE receives `international-conflict-spillover` envelopes for a force
decision or a counterparty escalation (tension ordinal, `amount: null`).

`recordViolenceAttempt` records an abstract attempt on a person's life. It
requires earlier canonical threat evidence, describes no method, and has
unharmed, injured (a serious, publicly known K2 episode) and killed
(`crisis-violence:attempt`, with the ordinary continuity notice) outcomes.
Nothing schedules attempts; there is no quota.

Timings and response shares are `crunch46-provisional-v1`
(`PROVISIONAL_INTERNATIONAL_POLICY`); the statutory 48-hour, 60-day and 30-day
periods come from 50 U.S.C. §§1543–1544.

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

## The availability index is last-wins, and that is not monotone

`crisisEntityExists` answers presence over an append-only array: once an id is
there it stays there, so the answer can only move from false to true. It is
safe for any check that must never flip from passing to failing.

`crisisEntityAvailableAt` is not. Its index keeps the LAST record seen for an
id, so a later record for the same id can carry a later `effectiveAt` and turn
an availability that passed into one that fails. That is the opposite property,
behind a function of the same shape and nearly the same name, which is why it
has to be written down rather than inferred at a call site.

It matters because the event validation loop proves each event once and skips
one it has already proved. A check that can go from passing to failing makes
that proof unsound: the event that would newly fail is exactly the one never
re-checked, and the World would accept history it should reject. So
`crisisEntityAvailableAt` must not enter that loop without first being made
monotone — for example by keeping the earliest entry for an id, as the press
availability index already does — or by excluding the events that depend on it.

Nothing calls it there today. The guard in `events-suffix-proof.test.ts` fails
if anything starts to, and `EVENT_PROOF_MONOTONE_CHECKS_COMPOSED` carries the
same warning at the declaration. This paragraph exists because the guard and
the comment both live where somebody already editing that code will see them,
and the person who needs this is the one deciding whether to call it at all.
