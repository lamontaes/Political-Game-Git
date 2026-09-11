# Public personnel

Public personnel decisions run as sourced procedure steps over ordinary LIFE
work relationships. There is no second employment engine. Employment, roles
and status stay in `workRelationships`, `workRoles` and `workStatuses`; this
system adds a record family (`history.personnelRecords`) for the procedure:
who may act, which position an employment occupies, and each notice, filing,
appeal and decision. Every record pairs with an ordinary event.

Code: `src/simulation/civil-personnel-actions.ts` (writers and projection),
`civil-personnel-integrity.ts` (integrity, which runs on every write and every
load), `civil-personnel.ts` (class query, preparation and the LIFE/EXEC
provider), and `src/player/CivilPersonnelPanel.tsx`.

## Sources and dates

`src/source/adapters/civil-personnel-procedures.ts` declares reviewed
procedure transcriptions over the locked civil-service artifacts. Each excerpt
must be found in the rights-scoped enacted text. A numeric term (30 calendar
days, ten calendar days, four years, 15 days) must also appear, as digits or a
word, in its own evidence phrase within those excerpts, and each named ground
carries its own phrase. Otherwise the projection and its replay test fail. The accepted source domain, its locks and its digest are
unchanged.

Procedures are `CURRENT_OBSERVATION` on the 2026-09-06 retrieval date. As in
the qualification consumer, they answer that date and later simulation dates,
never an earlier one. A world before 2026-09-06 cannot use them.

## Authority

A person may act only by currently holding the exact leadership role an active
`authority-designation` empowers. The basis is closed:

- `statute`: a transcribed provision names the office. Today that means only
  the chapter 43A commissioner's settlement decision (§ 43A.33, subd. 3(b)).
- `authored-charter`: a game-authored state agency's charter names its
  appointing authority. Only an organization with authored provenance and the
  `service:state-agency` classification can carry one. The acquired text never
  says who any real agency's appointing authority is, so no real institution is
  chartered.

Designations, positions and incumbencies are setup writers for scenarios and
content, never panel actions: no player can designate their own authority.
Titles, kinship, friendship, leadership labels and bargaining rights grant
nothing.

## Entry

A new game reaches this system through one explicit Custom Start:
`startingLife: "state-agency-director"`, handled by
`initializeStateAgencyStart` (`src/simulation/civil-personnel-start.ts`). It
is accepted only on the Custom route, at age 25 or older, with the early years
summarized, in a state with compiled procedures (today Minnesota). It runs
once, at Custom Begin, after the ordinary production world is built. It
authors a fictional agency, its charter, positions, staff and a vacancy, plus
a fictional holder of the commissioner office. Nothing a player does later
creates authority. The start date stays 2026-01-05, so procedures remain
unavailable until ordinary play reaches 2026-09-06.

The projection reaches the simulation as a generated TypeScript module, never
a JSON import. Node's ESM loader loads Playwright specs and `world.ts`, and it
refuses a JSON import without `with { type: "json" }`. A guard test forbids
such bare imports anywhere either one reaches.

## Civil and labor facts stay separate

A position carries its civil class and, separately, its bargaining coverage
and agreement coverage. Tenure belongs to the incumbency. A permanent classified
employee with unknown bargaining coverage still has the just-cause procedure,
because merit protection does not depend on bargaining. An agreement-covered
employee gets no statutory procedure, because the agreement governs and its
terms are not represented. Bargaining rights never imply tenure.

## One controlled perspective

World integrity requires every player-required Work state to belong to the
controlled person, so a valid world keeps one controlled perspective. The
playable perspective is the appointing authority. Counterparts decide for
themselves through the general decision architecture. Each decision is
recorded once as a durable trace, and neither the timing nor the outcome is the
player's to choose:

- The discharged employee decides whether to appeal on receiving the notice.
  Deciding not to appeal is final.
- When an appeal arrives, the single holder of the commissioner's office
  decides on settlement. If no holder able to decide existed then, the decision
  is shown as not represented. No party can later trigger or time it.
- A former employee answers a reinstatement offer on receiving it, from their
  own situation at that moment. The draw is keyed to the person and employer,
  not to the position offered, and a decline stands for that employer, so
  asking again cannot reroll it. The offer, its answer and any new incumbency
  are recorded in one write, and integrity refuses any offer left unanswered.

None of these is a ruling on the merits.

## Integrity

`assertPersonnelIntegrity` re-derives what each writer checked. It confirms:

- the actor held the designated role on the record's date;
- the class, tenure and agreement preconditions;
- the named just-cause ground;
- the statutory deadlines and the `timely` flag;
- the four-year window and the probation rule;
- the vacancy of a filled position;
- the tenure and civil and labor facts each paired event established;
- each NPC's own decision trace and chosen option.

A save that rewrites who acted or what an NPC chose fails to load. The snapshot
id is a content name, not a signature, so this is a consistency contract, not
anti-tamper protection.

## Supported Minnesota transitions

| Step                                       | Actor                                                      | Source                                | Result                                                                                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Informal resolution meeting                | Designated appointing authority                            | § 43A.33, subd. 1                     | A 30-minute scheduled activity both attend; required before discipline                                                                                                             |
| Reprimand or discharge                     | Designated appointing authority                            | § 43A.33, subds. 1-3(b)               | Named just-cause ground and specific reasons, written notice evidence the employee receives, discharge ends the LIFE employment; permanent, classified, not agreement-covered only |
| File notice with the commissioner          | Any current appointing authority of the employer           | § 43A.33, subd. 3(b)                  | Completes the Work item; a filing after ten calendar days is recorded as late                                                                                                      |
| Appeal to the Bureau of Mediation Services | The discharged employee (NPC)                              | § 43A.33, subd. 3(b)                  | Pending appeal within 30 calendar days, or a final decision not to appeal                                                                                                          |
| Settlement decision                        | Single holder of the chapter 43A commissioner office (NPC) | § 43A.33, subd. 3(b)                  | Settlement directed or not; terms are not represented                                                                                                                              |
| Direct reinstatement offer and answer      | Designated appointing authority; the former employee (NPC) | § 43A.15, subd. 15; § 43A.16, subd. 1 | Vacant position in the same job class, former permanent or probationary service within four years, consent; probation only for a different former appointing authority             |

## Refused, with the missing instrument

- Classified selection and appointment: commissioner qualifications, finalist
  pool and pay plans.
- Probation completion: the plan or agreement that sets its length.
- Probationary or agreement-covered discipline: the plan or the agreement.
- Suspension and demotion: class, pay and return terms.
- Arbitrator list, selection, hearing and award: Bureau rules and the plan.
- Alaska employer actions: personnel rules under AS 39.25.150(15)-(16), so no
  qualifying dismissal and no Personnel Board hearing can arise. Exempt and
  partially exempt refusals are sourced (AS 39.25.110, .120(b)).
- Federal actions: 5 U.S.C. § 7511 coverage, OPM regulations and the acting
  agency official.
- Nebraska and every other jurisdiction: no compiled procedure.

Pay after a reinstatement follows a plan or agreement that is not represented,
so no compensation flow is created and no money moves.

## Consumers

- `publicEmploymentPermissionProvider()` is the LIFE `LifeEligibilityProvider`.
  It answers only `work:public-discipline`, `work:public-remove` and
  `work:public-reinstate` for the requesting actor on the named records.
- `executiveOfficeStaffBoundary(jurisdictionKey, date)` gives EXEC the sourced
  class of governor's-office staff: Minnesota unclassified (§ 43A.08, subd.
  1(6)) and Alaska exempt (AS 39.25.110(20)). It states that appointment and
  removal authority are not established, and it authorizes nothing.
- The panel keeps its `{world, onWorldChange}` signature, with optional
  `transitionHandlers`. With no positions, it renders exactly the earlier
  preparation view. With positions, it also lists unsupported powers as
  unavailable, with reasons: competitive selection, probation completion,
  suspension and demotion, agreement-governed discipline and arbitration.
