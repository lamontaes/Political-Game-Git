# Legislation

Legislation is composed of substantive provisions and proceeds through institution-specific rules.

## Rules

- A proposal has a stable identity, revisions, and one or more identifiable provisions.
- Actors may support or oppose the whole proposal or particular provisions for different reasons.
- Amendments create explicit historical revisions; they do not silently mutate the original proposal.
- Negotiation may change provisions, timing, sponsorship, implementation, safeguards, or coalition composition.
- Procedures—including referral, committee action, scheduling, amendment, voting, executive action, delay, and obstruction—come from institutional data.
- Support is contextual and may depend on beliefs, goals, relationships, expertise, constituencies, promises, incentives, information, and procedure.
- The player does not accumulate visible persuasion points or receive deterministic support thresholds.
- Substantive objections may require substantive changes or may remain unresolved.
- Easy legislation may remain easy; difficult legislation should create meaningful choices rather than repetitive work.
- Failed legislation remains durable political history.

The Stage 4 character-mind and decision architecture can later help explain contextual support, opposition, and negotiation choices, but it does not define bills, provisions, institutions, procedures, votes, law, or policy effects.

## Implemented legislative spine (D-056)

A measure now moves through a real institution, and the institution is data.

### Rule packs

`src/simulation/legislature-rules.ts` is the runtime institutional contract:
chamber structure, sessions, introduction, referral, committees, floor stages,
amendments, inter-chamber transit, executive presentment, veto, override forum,
and enactment. `src/simulation/legislature-rule-packs.ts` supplies packs
compiled from the 50-state institutional research warehouse, each value citing
the constitution, chamber rule, uniform rule, or statute behind it. The engine
carries no jurisdiction knowledge; `assertRulePackIntegrity` rejects an
incoherent institution before play.

Three states stay distinct and never collapse:

- `known` — resolved from a source, including a resolved negative such as a
  committee that may decline to hear a bill;
- `unknown` — no source settled it; this is not zero, none, or absent;
- `not-applicable` — the institution has no such concept, as with a second
  chamber in Nebraska.

Reading an unknown rule and reading a not-applicable rule raise different
errors, and the player surface distinguishes them in plain language.

These states **fail closed**. Only a rule that is `known` and permits something
authorises an act; unknown, not-applicable and a known negative all refuse, at
the writer, in the steps offered to the player, and in integrity checking
alike. This is visible in play: nothing read for the Alaska pack establishes
the authority to amend on the floor, so the Alaska scenario is never offered an
amendment, and no pack currently resolves what becomes of a measure pending at
adjournment, so none can record one dying that way.

Source metadata is part of the contract. Each chamber cites its own instrument,
and `verification` says what was actually read: `verified` for text read at the
cited section, `partial` for a heading or official summary. See
[Where the legislative rule packs come from](./legislative-rule-sources.md) for
the evidence behind each pack and what the 2026-09-02 audit corrected.

### Canonical records

`LegislativeMeasureRecord` carries identity. `LegislativeActionRecord` is the
append-only log of consequential transitions. Referrals, committee actions,
amendments, votes, executive dispositions, and enactments are their own record
families. Where a bill sits is **derived** by replaying its actions against its
rule pack, never stored as a bucket. Every transition also writes an ordinary
historical event, so a measure's story lives in the same history as everything
else and survives save, reload, and replay.

Replay is a **legal state machine**. Each action must be legal from the state
immediately before it; the chamber, committee and floor stage it names must be
the ones the measure was actually in; and nothing may follow a terminal action.
`assertLegislationIntegrity` refuses any history that breaks those rules, so a
save cannot contain an impossible order of events, a measure cannot be both
dead and law, and it resolves exactly once. Enactment is legal only from the
position where enactment is the next step — having been signed at some point is
not standing authority to be enacted later.

A committee's **recommendation** and whether its **motion to report carried**
are separate facts. Kentucky's chambers let a committee report a bill with the
opinion that it should pass, should pass as amended or substituted, or should
not pass, and all of those reach the floor. A committee that will not report
the bill at all is a different event with a different consequence, and
`CommitteeDisposition` shapes the two differently.

Stable keys for new records are derived from the measure's own recorded
history, so identity belongs to the saved world rather than to a running
process. Saving, reloading and carrying on produces the same next key as never
having left, and two bills played in parallel cannot collide.

### Voting

Legislative voting shares nothing with the election substrate. A
`LegislativeVoteRecord` names members and their dispositions (yea, nay,
present-not-voting, absent, excused), the eligible membership, presence where
the record represents it, the threshold fraction, its denominator, and its
rounding rule. Denominators are real institutional choices: members elected,
members present, members voting, committee membership, or a joint sitting's
combined membership. A majority is strictly more than half, so a majority of
thirty-eight is twenty; three-fifths takes at least the fraction, so
three-fifths of forty-nine is thirty. Integrity recomputes every tally and
required count from the record's own dispositions.

How a member decides is out of scope here: scenarios author member decisions
rather than modelling legislator behaviour, and no step applies an unexplained
modifier to a tally. The relationship, bargaining, and lobbying systems attach
at that seam later.

### Time

A committee hearing is scheduled through the existing future-due substrate and
fires on the ordinary time advance. There is no second legislative clock.

A rule requiring a chamber's floor stages to fall on **separate legislative
days** is behaviour, not decoration. The next stage cannot be reached before
its earliest eligible date, and waiting for that day is a step the player takes
on the same clock as everything else. Nebraska's three stages therefore land on
three different dates, and the vote record shows them.

One executive act carries one date: the disposition, the action and the event
all agree, and none may precede the presentment they answer. Deadlines are
shown to the player, but they do not fire on their own, and no action deadline
is claimed until there are calendar semantics to compute one.

### Whose decision it is

The player is never offered somebody else's decision as a choice. Where a
measure sits with an actor the player does not control, the only step is to
wait; what that actor then does is revealed after the wait rather than picked
before it. The steps a player is offered are acts and requests — file, ask,
move, wait — not outcomes.

### Agreement between two chambers

Two chambers cannot send different texts to a governor. Where the second
chamber adopts an amendment, the measure goes back to the chamber it started in
for a recorded vote on accepting that change: Kentucky's rules send such a bill
to the Rules Committee and then to the floor (House Rule 54, Senate Rule 54,
House Rule 59). Agreement leads to enrolment; refusal ends the bill. A second
chamber that passes the text unchanged goes straight to enrolment. Conference
between two chambers that will not agree remains unimplemented.

### Portability proved

Three packs differ structurally rather than cosmetically:

|                    | Kentucky                                  | Nebraska                                 | Alaska                                                        |
| ------------------ | ----------------------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| Structure          | Bicameral (100 / 38)                      | Unicameral (49)                          | Bicameral (40 / 20)                                           |
| Floor              | One passage stage                         | General File, Select File, Final Reading | One passage stage                                             |
| Separate days      | Between stages, but there is only one     | Enforced: three stages, three dates      | Between stages, but there is only one                         |
| Second chamber     | Yes                                       | Not applicable                           | Yes                                                           |
| Chamber agreement  | Required when the Senate amends           | Not applicable                           | Required when the Senate amends                               |
| Floor amendments   | Permitted (House Rule 60, Senate Rule 60) | Permitted                                | Unresolved, so not offered                                    |
| Guaranteed hearing | No — a committee may hold a bill          | Unresolved: most bills, with exceptions  | Unresolved                                                    |
| Executive inaction | Unresolved                                | Bill becomes law                         | Bill becomes law (Art. II Sec. 17)                            |
| Effective date     | Unresolved                                | Unresolved                               | Ninety days after enactment (Art. II Sec. 18)                 |
| Veto override      | Each chamber, majority elected (51 / 20)  | Three-fifths elected (30 of 49)          | One joint sitting of 60; two-thirds, three-quarters for money |

### Deliberately unimplemented

Conference committees, calendars and deadlines as live constraints, automatic
adjournment, executive inaction firing on its own, action deadlines on a
disposition record, committee substitutes, procedural motions on the floor,
line-item and amendatory vetoes, confirmations, interest-group lobbying, party
caucus behaviour, public-opinion effects, appropriations and budgeting,
judicial review, and the other forty-seven states.

Adopting an amendment does not yet produce a new version of the bill's text:
the amendment is recorded, and the agreement it forces between chambers is
real, but no provision is rewritten. Comparing two chambers' texts is therefore
not modelled either, and the packs must not be treated as adapter-ready for an
external bill corpus until it is.

## Stage 6.5 Run C working-document boundary

Run C adds one synthetic office working draft as a presentation-layer bridge to
the accepted quantitative-policy records. Stable document, provision,
selection, and prepared-variant identity support readable legal text,
actor-specific staff analysis, a noncommittal comparison, one bounded staff
conversation, and an ordinary historical instruction selecting the office's
current working version.

That working draft is explicitly not introduced legislation, an appropriation,
enacted law, institutional procedure, or policy realization. It creates no bill,
law, institution, committee, vote, sponsorship, agenda, or amendment record.
The future legislation system remains responsible for those identities and
procedural semantics; it may consume the existing quantitative-policy layer
without treating the Run C presentation record as canonical law.
