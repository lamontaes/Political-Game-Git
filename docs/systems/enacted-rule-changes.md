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

## Marked as not modeled, with the blanket rule applied

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
  modeled. Blanket rule: clauses are filed before the first floor vote, and
  integrity refuses one filed after.
- **An office registry.** A statute's legislative clause must name a chamber
  of its own rule pack. Elsewhere the office key must carry the state's own
  prefix (`us-nh-governor`, `dc-mayor`).
- **Fields no law can change yet** are listed in
  `NOT_YET_AMENDABLE_RULE_FIELDS`, each with its reason, and refused with it.

## Consumers

Anything reading rules through the resolver or the nationwide port with the
World picks a change up. Candidacy (`candidacyEligibility`) reads the three
`qualification.*` fields through `enactedRuleChangeAt` for a legislative
office: a change in force replaces the compiled rule for its field, from
either compiled source (the pack's rule set or the per-state rows), and its
refusal names the act. Whether a seat must be named by district
(`districtSeatMustBeNamed`) still reads compiled rules only, since it takes no
World. Other consumers that read compiled tables directly do not yet.
