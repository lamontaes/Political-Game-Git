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

### Canonical records

`LegislativeMeasureRecord` carries identity. `LegislativeActionRecord` is the
append-only log of consequential transitions. Referrals, committee actions,
amendments, votes, executive dispositions, and enactments are their own record
families. Where a bill sits is **derived** by replaying its actions against its
rule pack, never stored as a bucket. Every transition also writes an ordinary
historical event, so a measure's story lives in the same history as everything
else and survives save, reload, and replay.

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

### Portability proved

Three packs differ structurally rather than cosmetically:

|                | Kentucky                                 | Nebraska                                 | Alaska                                                        |
| -------------- | ---------------------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| Structure      | Bicameral (100 / 38)                     | Unicameral (49)                          | Bicameral (40 / 20)                                           |
| Floor          | One passage stage                        | General File, Select File, Final Reading | One passage stage                                             |
| Second chamber | Yes                                      | Not applicable                           | Yes                                                           |
| Veto override  | Each chamber, majority elected (51 / 20) | Three-fifths elected (30 of 49)          | One joint sitting of 60; two-thirds, three-quarters for money |

### Deliberately unimplemented

Conference committees, concurrence after second-chamber amendment, calendars
and deadlines as live constraints, line-item and amendatory vetoes,
confirmations, interest-group lobbying, party caucus behaviour, public-opinion
effects, appropriations and budgeting, judicial review, and the other
forty-seven states.

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
