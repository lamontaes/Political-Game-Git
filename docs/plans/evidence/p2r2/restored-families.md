# P2R2 — what is playable again, and what is still withheld

P2R1 offered 2 of the 35 authored adult families. P2R2 offers **9**, and the
other **26** stay withheld with their reasons unchanged. Nothing was restored by
loosening a gate: each of the seven newly offered families is answerable because
the world now writes the record its scene was withheld for.

## The mechanism, in one paragraph

`src/simulation/life-opportunities.ts` is a writer. It creates canonical records
— a world event, a scheduled occasion where the thing has a day, and a knowledge
record for the player who was told — during a transition the player actually
took: opening an ordinary life, choosing something, or letting a stretch of time
go by. Nothing on the reading path calls it. Listing situations, building a fact
packet and rendering a scene are still pure, and a surface that manufactured the
record it then cites as evidence would prove nothing, which is the whole reason
the scenes ask for a premise.

Seven kinds, capped at four open at once, replenished only when a life has
nothing open. Each names the one family it makes answerable, and
`life-opportunities.test.ts` pins that the two lists agree.

## The nine offered families

| Family                          | Stakes   | The record that grounds it                                                                                                                                                                                    | What it still does not claim                                                                                                   |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `adult.household-standing`      | notable  | The active household week — an errands work item owned by and assigned to the player. Retained from P2R1, and now recurring: a new week is written once the last one is finished and seven days have gone by. | Past burden, anyone's silence, or an agreed division.                                                                          |
| `adult.ordinary-good-day`       | ordinary | The same active week. Retained from P2R1.                                                                                                                                                                     | That the day is otherwise free. Its scene line was rewritten so it no longer opens with the same sentence as the family above. |
| `adult.household-quiet-evening` | ordinary | `household-evening`: the person the player lives with says they will be in, and a specific evening is put on the calendar. It expires when that evening does.                                                 | That anybody enjoyed it, or that the evening recurs.                                                                           |
| `adult.weekend-invitation`      | ordinary | `social-occasion`: somebody whose household is recorded in the same place asks the player to something, with a Saturday on the calendar. It expires when the Saturday passes.                                 | Friendship. A shared place is a shared place; the inviter is "somebody local" and the record says no more.                     |
| `adult.friend-favour`           | notable  | `favour-request`: a person the world has a recorded interaction with — or a relative, colleague or fellow group member — asks for a hand with one thing and says it matters to them.                          | That it is easy for the player. Nothing establishes what it would cost them, and the old scene line told them it was nothing.  |
| `adult.friend-in-difficulty`    | pressing | `confidence-disclosed`: a private two-person event, plus a knowledge record for the player and for nobody else. The scene's "they told you rather than anybody else" is read off that, not asserted.          | That nobody has heard since. The world does not track that, and the owner's privacy control forbids implying it.               |
| `adult.work-extra-hours`        | notable  | `extra-hours-request`: somebody the player actually works with asks for extra hours on stated terms. Employment alone still establishes neither, so the gate reads both.                                      | Who benefits, or that the terms are fair.                                                                                      |
| `adult.local-issue-position`    | notable  | `meeting-agenda-item`: one item of the posted agenda published in full, and a knowledge record that this player read it. A posted meeting is not a read agenda item, which is exactly why this was withheld.  | That the player has a view. That is what the options decide, so the scene line stops at having read it.                        |
| `adult.candidacy-approach`      | pressing | `candidacy-approach`: somebody the player takes part in something with asks, outright, whether they would ever run for public office. Requires an actual organization participation and age 21.               | A seat, a party, a district or anybody's backing.                                                                              |

## The 26 still withheld, and the exact record each needs

Unchanged from P2R1 except that four of its withheld reasons no longer apply and
those families moved above. These are the remaining exclusions, per family.

| Family                            | Missing record                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `adult.household-repair`          | A canonical household object or repair record. The world names no objects.               |
| `adult.household-money-shortfall` | A monthly income or spending record. The world keeps no monthly arithmetic.              |
| `adult.family-request`            | The two-week request itself and the plan it conflicts with. Kinship establishes neither. |
| `adult.care-request`              | A named recipient and an actual care request preceding the choice.                       |
| `adult.partner-plan`              | Two conflicting plans and a partner proposal.                                            |
| `adult.work-rule-pressure`        | The rule, the conflict, and the senior request.                                          |
| `adult.work-credit`               | Authorship, misattribution, and who heard the claim.                                     |
| `adult.work-colleague-struggling` | The colleague's difficulty, its disclosure, and the player's knowledge of it.            |
| `adult.work-offer-elsewhere`      | An actual offer, its terms, and the player's knowledge of it.                            |
| `adult.work-good-week`            | Completed work and available time.                                                       |
| `adult.housing-cost-change`       | Changed payment terms and notice to the player.                                          |
| `adult.housing-repair-standoff`   | A dwelling defect record and a tenure that names a repair-responsible counterpart.       |
| `adult.debt-call`                 | Debt terms, a demand, and the resources the payment options need.                        |
| `adult.unexpected-expense`        | A broken object and a monthly amount.                                                    |
| `adult.small-windfall`            | An amount, a source, and whether anything already claims it.                             |
| `adult.help-with-strings`         | The offer, its terms, and the concrete problem it would solve.                           |
| `adult.friend-good-news`          | The news and the invitation.                                                             |
| `adult.local-dispute`             | The agenda item and its cost to the other household.                                     |
| `adult.community-meeting`         | A meeting tonight, an agenda item its options can act on, and completed minutes.         |
| `adult.volunteer-ask`             | The organization and the request, both before the option.                                |
| `adult.community-building`        | The building decision and the payment terms.                                             |
| `adult.petition-ask`              | The petition, the request, and its disclosure terms.                                     |
| `adult.incident-aftermath`        | The affected household, the recovery state, and the player's knowledge.                  |
| `adult.incident-neighbour-help`   | Comparative damage, the request, and the player's knowledge.                             |
| `adult.promise-comes-due`         | Due terms and the actual conflict.                                                       |
| `adult.old-favour-returns`        | The prior action — which may have been a refusal — and the new request.                  |

Several of these are one record away and were deliberately not taken. A
`household-object` record would open two families; a monthly resource ledger
would open three. Both are systems, not sentences, and neither is in this
repair's scope. The exclusions above are the handoff.

## The scenes as they now read

Reviewed with their real neighbours — scene line, every option label,
description, memory and witnessed line together — rather than as isolated rows.

**`adult.weekend-invitation`.** Scene: _Somebody local asked you to something on
Saturday. Nobody needs you there._ Both halves are records now: a person in the
same place, and an occasion nobody made the player responsible for. Its two
memories were rewritten to answer a person (_You told them you would come on
Saturday_, _You told them you would not be coming on Saturday_) rather than to
record a mood, and both options gained a witnessed line, because there is now
somebody there to witness them.

**`adult.friend-favour`.** Scene: _Somebody you know has asked you for a hand
with one thing, and said it matters to them._ The previous line told the player
it was easy for them, which nothing records. What the asker said matters to
them is in the request. `do-it`'s memory was rewritten off the option's own
description.

**`adult.friend-in-difficulty`.** Scene unchanged — it was already exactly what
a private disclosure supports. `keep-it`'s memory was rewritten from _You kept
the personal matter private_ to _You told nobody else what they had told you_,
and `push-them`'s witnessed line from _They told them to go and deal with it_ to
_They told them to sort it out themselves_, which had two unbound "they"s in one
sentence.

**`adult.local-issue-position`.** Scene: _You have read the agenda item in full.
Nobody has asked what you make of it._ The old line said the player already had
a view, which is what its three options are for deciding.

**`adult.candidacy-approach`.** Scene: _Somebody has asked you outright whether
you would ever run for public office._ The owner's candidacy control: "whether
you would ever stand for anything" does not tell somebody they are being asked
about a ballot.

**`adult.household-quiet-evening`.** Scene: _The evening is free, and the person
you live with said they would be in for it._ Both facts come from the record
that opened the evening, in the order the record establishes them.

**`adult.work-extra-hours`.** Scene unchanged; it already described an ask with
a cost. `decline`'s memory lost "the requested extra hours", which is a form
phrase for something a colleague said out loud.
