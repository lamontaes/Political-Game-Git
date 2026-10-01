# Missing office salaries use sourced peers instead of a seed draw

Before: An office missing a published annual salary received a seeded amount
between other states' lower and upper salary quartiles. Different world seeds
changed the amount despite identical source facts.

After: The fallback ranks actual salaries for the same office category by
Census region and sourced household-income distance. The nearest references
carry more weight under the owner's accepted ranking rule. If the target's
income is unread, the same-office plain mean is explicitly labeled. Published
salaries and the existing enacted-law and payroll readers retain their paths.

## 1. Why-chain

Why does this office need an estimate? Its source table has no single annual
salary. Why use the same office category? Governors, legislators and judges
have different duties and pay schedules. Why compare region and income?
Those are the owner's required sourced dimensions for peer estimation. Why
give nearer references more weight? The accepted reciprocal-rank rule expresses
that authored estimation choice. Why can the seed not choose the amount?
Changing an identity seed changes neither the source salary nor these
comparison facts. Bedrock: actual source salary rows and an explicitly
authored deterministic estimate, not a new statutory pay law.

## 2. Research

The Council of State Governments' Book of the States supplies governor
salary table 4.3, legislative salary table 3.9 and trial-judge table 5.4.
The existing source metadata and California's sourced newer legislative
salary remain unchanged. Forty states publish one annual legislative figure
in this packet. Amounts are annual USD, not an hourly rate or per diem.

Peer distance reads the existing Census Current Population Survey 2023
median household-income packet, Table H-8. It is a place comparison, not the
worker's own income. The existing Census regional classification is reused.
Reciprocal-rank weights are authored design choices from the accepted similar-
state deduction fallback, not empirically estimated salary coefficients.
No new numerical research claim or fiscal power is added.

## 3. Revisions

The same office category is selected before ranking. Same region precedes
income distance. Equal closeness shares a competition rank and weight;
alphabetical order only stabilizes display. When target income is absent,
all same-office references have equal weight and produce the plain mean.
No invented territory income is used. Annual estimates retain the existing
nearest-$100 rounding. Immutable source rankings are cached per office/state,
so repeated paychecks do not re-sort the source packet.

## 4. What gets built

1. Remove the fallback's RNG import and salary draw.
2. Rank same-office sourced reference salaries using existing place data.
3. Mark the amount, references and authored weighting as an estimate.
4. Preserve published salaries and existing enacted-rule/worker readers.
5. Prove seed independence and canonical reload of an actual saved worker.

## 5. Simulated, records, world pieces, checks

Simulated: no new election, appointment, compensation flow or payment.
Records: the existing office salary reader reads the actual work role and
location; this repair adds no saved schema. World pieces: the worker and
work relationship are still required. A missing role keeps the existing
unsupported behavior. Published data bypasses the estimate, and an operative
salary law still uses the unchanged dated reader. Congress remains statutory
and is not estimated here. Checks: same source facts give the same amount
across seeds, published figures remain exact, and reading/reload changes no
saved bytes.

## 6. Proof run

Source 45768d95e079c3abdd08724ff8a9ca8ea70896e0 from main
2afdc30b07b8f2a73f2042521abd86c254d111e6
passed all seven cases in the changed office-pay.test.ts. Six original cases
retain published salary coverage and the fallback's positive amount, rounding
and replay checks. The old cross-seed variation assertion is changed to seed
independence, as required by A42; it is not a weakened timeout or exclusion.
The added saved-work case reaches the existing officePayInForce reader and
canonical Save/Continue without changing serialized bytes.

An intermediate saved-work fixture passed six cases and failed one because
it omitted a nullable occupation and used two unsupported role enum values.
Those authored inputs were corrected to the existing taxonomy. The production
fallback did not change during that repair. Two scoped strict TypeScript
roots load 734 files with zero owned diagnostics. Scoped lint, formatting,
whitespace, report and PR-range release checks pass. Zero-dice exits 1 with
zero new findings and five inherited stale entries. Spelling exits 1 with
19 inherited findings outside this patch. Shared baselines remain untouched.

No natural office appointment, payment, wage-law phase or all-56 watched-world
proof is claimed. Browser, game-year, full suite and the other teams' annual-
salary integration are NOT RUN. The remaining part of A42, how enacted salary
changes reach sitting holders through the same pay writer, stays with that
existing integration and its actual legal-term dependencies.

## 7. Worked example

In the controlled Salt Lake City salary-reader fixture, Sonia Velasquez has
saved person ID person_c3f0a51afb382f25 and work ID
work-relationship_04319793a43926e1. Her authored Utah legislative work role
has no published single annual salary in the source packet. The existing
reader returns $51,700 annually, law null, with the estimated basis. The
same source facts return that amount for every tested seed and after canonical
reload. It creates no appointment, payment or law-effect stamp. Utah's actual
per-day pay is still a separate source/representation gap; this is an annual
game estimate, not a claim that the state legally pays that annual salary.
