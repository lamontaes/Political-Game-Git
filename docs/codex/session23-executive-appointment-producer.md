# Executive appointment producer — Session 23 Part 3

This is a work-in-progress producer handoff, not a ready Part 3 or a played
confirmation proof. Its branch is `codex/session23-p3-player-appointments`, based
on main `f88508186b78f526ecf89a420b5fb584171e039a`. The board packet supplies the
exact published producer head. Session 21 owns the bounded
`executive-appointment` admission in `chamber-votes.ts`; Session 23 owns these
additive files, the appointment matter, and the confirmation caller.

`governing/executive-appointment-posts.ts` reads a named post together with the
shared `executiveProfileForOfficeKey` authority path. Its first primary-backed
post is `us-ak-personnel-board`: three seats, six-year terms, unexpired vacancy
remainders, joint-legislature confirmation, a majority of all members, United
States citizenship, no state employees, and at most two members of one party.
AS39.05.053 supports March 1 expiration. It does not supply expiration years,
seat staggering, current incumbents, or an individual nominee's qualifications.
The inventory never establishes a vacancy. Remaining named-post coverage is
unfinished; this first post is not evidence of all-56 appointment coverage.

`governing/executive-appointments.ts` exports:

- `latestExecutiveAppointmentSeat(world, postOfficeKey, seatOrdinal)`: actual
  saved `world.office-tenure`/`world.office-vacancy` records for that named seat,
  indexed through the canonical growing-history index.
- `recordExecutiveAppointmentVacancy(world, {incumbentTermEventId, cause,
causeEventId})`: requires a saved incumbent term and an actual expiry, death,
  or incumbent resignation. No missing-incumbent inference.
- `executiveAppointmentVacancy(world, vacancyEventId)`: current vacancy identity
  and its former incumbent term/person and unexpired end, if any.
- `scheduleExecutiveAppointmentTermExpiry(world, incumbentTermEventId)`: one
  canonical future due item from the recorded term end. Its consumer is the
  additive `executiveAppointmentTermExpiryHandler` in `office-continuity.ts`,
  outside protected succession and daily turnover bodies.
- `recordExecutiveAppointmentNomination(world, {matterEventId,
governingDecisionEventId, nomineePersonId})`: validates current authority,
  actual vacancy, eligible nominee, actual governing decision, and the earlier
  canonical appointer trace; writes no seating or favor.

`state-governing.ts` exports
`openExecutiveAppointmentMatter(world, vacancyEventId)`. The matter uses the
existing `decideGoverningMatter(world, matterId, optionKey, billReasons?)` command,
with `person:<actual-person-ID>` options. Its own shortlist comes from
`appointmentCircle` and `appointmentShortList`; a bare event participant list
does not establish acquaintance. The controlled instruction goes through the
existing `evaluateDecision` player-constraint pattern and durable trace writer.
NPC choice remains on that chooser's recorded reasons. Matching replay retains
the existing trace identity; a different choice under that key is refused. The
matter has no invented legal deadline or required-time blocker.

The nomination event is `executive.appointment-nominated`. It is public, dated,
and carries the actual office jurisdiction and these tags:

```text
appointment-post:<post-office-key>
appointment-seat:<positive-seat-ordinal>
appointment-vacancy:<actual-vacancy-event-ID>
appointment-term:<actual-former-incumbent-term-event-ID>
appointment-decision:<canonical-appointment-decision-trace-ID>
appointment-matter:<actual-governing-matter-opened-event-ID>
source-event:<actual-governing-matter-decided-event-ID>
```

Its person participants are `agency:appointer` and `agency:nominee`. The trace
has decision type `appointment.choose-appointee`, the actual appointer,
`context:appointment` subject keyed by the named post, selected option
`person:<nominee-ID>`, and precedes the governing decision and nomination. The
trace's controlled-choice source is the actual open matter event. The vacancy
uses `world.office-vacancy`, with matching post/seat/former-term tags,
`vacancy-cause:term-expired|death|resignation`, and its actual cause in
`source-event:`. Opening tenure records must not claim historic confirmation.

For the executive-appointment member-vote input, the agreed names are
`nominationEventId`, `postOfficeKey`, `seatOrdinal`, `vacancyEventId`,
`incumbentTermEventId`, and `appointmentDecisionTraceId`, alongside existing
nominee/appointer/jurisdiction fields. The caller will read actual saved House
and Senate rosters. Alaska's joint majority is one tally of all members, not two
independent chamber passage requirements or a Senate-only proxy. Missing rosters
do not authorize generating attendance or a vote during a read.

`executive-appointment-eligibility.ts` reads private authority qualifications.
It does not grant the executive knowledge or a scene presence fact. Until
Session 13's canonical citizenship reader is admitted, it retains the documented
positive-birth legacy fallback only when no `citizenshipStatuses` field exists;
canonical status presence is unverified. No transition is written to qualify a
nominee. A recorded party or employment fact is read through existing writers
and readers, not a parallel personnel or citizenship store.

The seven producer tests cover inventory versus vacancy, actual expired term
lineage and reload, refusal of future/unrelated departures, and an authored
governor's recorded acquaintance → player choice → nomination → reload without
seating or a favor. These are controlled fixtures, not natural election,
ordinary opening-incumbent, played scene, hearing, confirmation, or seating
evidence. The Part 3 browser screenshot and full saved follow-through remain
pending. Appointment favors belong only after actual confirmation and seating,
under the existing preferential-tie-over-better-merit rule.

The additive `executive-appointment-opening.ts` now materializes the named
opening cohort through existing context-person, organization, participation,
and tenure writers. Board expiration years and staggering are marked fictional
opening estimates; cabinet heads have no invented expiration date. The cabinet
post table supplies all fifteen departments with separate held-office and rule
identifiers. It does not assert researched coverage of every collateral
qualification. Defense remains unverified without its actual service-history
producer. No funds or government accounts are created by this producer.

`processExecutiveAppointmentDeath(world, personId, deathEventId)` uses the
append-following holder index after `recordPersonDeath` has saved the canonical
death record. It rechecks current seats through the existing causal vacancy
writer, then opens the actual executive matter. A saved incumbent resignation
also closes its existing canonical membership. Portable controlled-test and
failure receipts are in `session23-appointment-producer-proof/checks.json`.

## Confirmation caller and one seating writer

This producer now composes Session 21's exact nomination API from #2463 head
`6133f05526b213000af15087758722817605cb00`. That PR is open, so this is a
candidate dependency composition, not an admitted-main claim.

`governing/executive-appointment-confirmation.ts` exports:

- `confirmExecutiveAppointment(world, nominationEventId)` returning
  `ExecutiveAppointmentConfirmationResult`: `world`, `status`
  (`pending|refused|confirmed|rejected`), `reason`, `rollCallEventId` and
  `tenureEventId`. It takes the saved nomination identity, rechecks current
  appointer/vacancy/authority eligibility, reads the confirming rosters from
  the shared authority data and calls `decideChamberVote` once. Alaska combines
  both House and Senate. Its denominator is all 60 authorized seats and its
  requirement is 31 yes votes. It does not use two independent passage tests.
- `scheduleExecutiveAppointmentConfirmation(world, nominationEventId)` writes
  one canonical future item keyed by the actual nomination. It uses the
  existing disclosed hearing calendar, not a legal deadline or evidence of
  actual attendance. The `executiveAppointmentConfirmationHandler` adjacent
  to the existing term-expiry handler consumes that item. Closed sessions and
  missing rosters remain pending; no confirming roster is generated here.

The roll call is a public `executive.appointment-confirmation` world event,
written through `recordWorldEvent`, with each actual member's disposition and
recorded reason. Tags retain post, seat, source nomination, causal vacancy,
eligible members, denominator, required votes, yes/no counts, majority rule and
outcome. A quiet result stays pending; its content key avoids duplicate
unchanged attempts while allowing actual changed reasons or rosters.

Only the private `seatConfirmedExecutiveAppointment` writes the new named-post
tenure and canonical membership after confirmation, then schedules its term
expiry and calls the existing favor writer. Judicial seating remains in its
existing domain writers. No Supreme Court or bill vote record is impersonated
by this board roll call. Supportive personal reasons and a better merit record
passed over are both required for an appointment debt.

Controlled scenario: seed `session23-actual-joint-confirmation`, Alex Taylor,
actual dated board resignation and acquaintance, both canonical opening
legislative rosters, then deliberately authored saved supportive experiences
for 31 actual members. The canonical clock reaches February 8, 2026, consumes
the scheduled confirmation and seats Alex. Save/reload retains the same
roll-call and tenure IDs. Exact records and source/check/failure receipts are
in `session23-appointment-producer-proof/controlled-confirmation-records.json`
and `confirmation-checks.json`. This is an edge-case fixture, not proof of a
natural election, ordinary generated executive route, played hearing, or a
new-game browser screenshot. Those remain pending with the other Part 3
appointment domains and cabinet depth.

Saved member reasons currently retain the shared vote API's shortened reason
keys. Its complete member evaluation/context is ephemeral and not returned.
Session 21 received the bounded retention question in board comment 6014999878.
This caller does not re-evaluate or forge a durable member vote. Full saved
consideration/source snapshots remain a limitation until the canonical vote
producer supplies that packet.
