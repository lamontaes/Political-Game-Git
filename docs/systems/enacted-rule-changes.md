# Enacted rule changes

`src/simulation/enacted-rule-changes.ts` is where a law passed in the game
changes a rule the game reads. Before it, institutional rules (chamber seats,
term length, candidate qualifications) were compiled constants. Enacted bills
already moved money (tax policy, transit appropriations, program spending), and
a constitutional amendment could change only the vote needed to propose the
next amendment.

## Producers

- **Ordinary statute.** `fileRuleChangeProvision` records a clause on a state
  bill before its final outcome. It acts only if the bill is enacted, from the
  enactment's effective date. A clause filed after the outcome, for another
  state's office, or twice on one bill is refused, and integrity refuses a save
  carrying one.
- **Constitutional amendment.** `ConstitutionalRuleDelta` has a `rule-field`
  kind. It acts from the ratified amendment's operative date. State routes only;
  the federal and charter routes refuse it with the reason.

## Values and applicability

Most fields take a whole number inside game bounds. `executive.term.years`
and `executive.term.limit` exist for the executive-term consumer (Nationwide
government lane), which owns what they mean. A term limit is a
`TermLimitRule` (`maxConsecutiveTerms`, `maxLifetimeTerms`, `lookbackYears`)
or null for no limit. A change may carry `applicability`
(`appliesTo: terms-beginning-after | immediately`, `countsPriorService`); null
in either part means the law is silent and the consumer decides.

## Reader

`enactedRuleChangeAt(world, { stateUsps, officeKey, field, onDate })` returns
the change in force: the latest operative amendment if any, otherwise the
latest operative statute, a later record winning a same-day tie.
`ruleValueInWorld(world, query, compiled)` returns the value in force with
where it came from (`compiled`, or `enacted` with the measure, effective date,
basis, instrument and applicability).
Nothing stores "the current rule": the value is derived from the clause and
the enactment each read, so a bill that never becomes law never changes
anything.

`resolveCapability` and `resolveCapabilityField` take an optional `world`, and
the nationwide port's request does too. With a World, an enacted value replaces
the compiled one (reported as `state-statute` or `state-constitution`, with the
act as its citation), and may establish a rule the game had no compiled value
for. A changed term length carries into the derived term end. Without a World,
only compiled law is read, which is right for a question about real law.

## Marked as not modelled, with the blanket rule applied

- **Effective dates.** The rule packs hold each state's effective-date rule as
  prose; nothing computes a date from it and no caller in play passes one, so
  every enactment's `effectiveAt` is null. Blanket rule: the change operates
  `STATUTE_EFFECTIVE_DEFAULT_DAYS` (90) after the act is recorded, and its
  `operativeBasis` and citation say so.
- **Which instrument a rule needs.** Whether a state requires an amendment or
  allows a statute for each rule is not compiled. Blanket rule: either may
  change any amendable field, the record keeps which one did, and an amendment
  always outranks a statute.
- **Floor amendments.** A rule-change clause offered on the floor is not
  modelled. Blanket rule: clauses are filed before the first floor vote, and
  integrity refuses one filed after.
- **An office registry.** A statute's legislative clause must name a chamber
  of its own rule pack. Elsewhere the office key must carry the state's own
  prefix (`us-nh-governor`, `dc-mayor`).
- **Fields no law can change yet** are listed in
  `NOT_YET_AMENDABLE_RULE_FIELDS`, each with its reason, and refused with it.

## Consumers

Anything reading rules through the resolver or the nationwide port with the
World picks a change up. Consumers that read compiled tables directly (for
example candidacy qualification rows) do not yet; routing them through the
resolver is how they join.

## The levels of law (added 2026-09-22)

`src/simulation/law-hierarchy.ts` ranks six levels: federal constitution,
federal statute, state constitution, state statute, local charter, local
ordinance. Every enacted change carries its `level`, and `ruleChangeInForce`
takes the highest level in force, then the latest law at that level. Today's
producers are state statutes and state amendments; the other levels are
declared so a later producer lands in the right place.

Not modelled, each with its blanket rule and each asked in
`constitutional-hierarchy-and-intergovernmental-relations`:

- **Home rule versus Dillon's rule**, per state and class of local
  government. Blanket: Dillon's rule, and no state grants a locality any rule
  the game reads, so `localInstrumentMayChange` always refuses, with the reason.
- **Floor preemption.** Blanket: every conflict is field preemption, resolved
  by rank.
- **Compacts, full faith and credit and extradition.** No compact exists and
  no rule the game reads is set by one.
- **D.C. and Puerto Rico.** Treated as states for the levels below federal
  law.

## Amendments in every state (added 2026-09-22)

`stateAmendmentProfile` gives each of the fifty states an amendment route
through its own legislature (`legislatureForState`, `seatsForChamber`).
California keeps its sourced thresholds. Every other state proposes by
two-thirds of each chamber's membership and ratifies by a statewide majority,
marked as the game profile and carrying no source digest. Real procedures are
asked in `modern-state-constitutions-fully-mutable`.

## Amendments with no player (added 2026-09-22)

`src/simulation/living-world/constitutional-reform.ts` reviews each
materialized governorship once a year on the ordinary clock. It considers an
amendment to the governor's term limit only when a cause is on the record
(the sitting governor is barred from another term, or has served three or
more), rarely, and puts it through the legislature and then the voters by the
same route a player's amendment takes. A ratified change is what the next
governor election reads, through `executive-term-limits.ts`
(`checkExecutiveTermLimit`), which the Nationwide government lane owns.

Every cause, rate and margin there is a **placeholder**, not research: the
owner has ruled out invented depth. They wait on
`governor-term-limit-amendment-causes` and `constitutional-amendment-frequency`.
Chamber votes are drawn and recorded by seat, since members' own positions
are not modelled; the statewide result is in shares of 10,000, since turnout
is not modelled; only the governor's term limit is reviewed; D.C. and Puerto
Rico are not.
