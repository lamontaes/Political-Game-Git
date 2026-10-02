# 1. Why-chain

The reopening report said “0 of its 10 students and staff” because
`schoolDecisions` printed `people.length`. That array came from `passIndex`.
The index combined active saved education enrollments and work relationships.
Those records describe the materialized people, not a census of the school.
The formatter treated the cohort as the full population because it added
“of its.” Bedrock: actual saved membership supports cohort participation, not
a whole-school enrollment or staffing total.

# 2. Research

Team 6's source contract, issue1615 comment5944682650, confirms this distinction.
The existing education institution/district projection has no total-enrollment
field. Local education agency finance rows cannot supply this school's roster.
No numerical research or multiplier is substituted for the missing producer.

# 3. Revisions

The producer's event summary now reports positive absences without a population
denominator. With zero cohort absences it reports the actual reopening alone.
The event's explanation likewise avoids a whole-school zero-illness claim.
School population, coverage of the illness observation and the existing closure
mechanism are not repaired by this bounded wording correction.

# 4. What gets built

1. Correct the existing saved closure/reopening event summary and explanation.
2. Preserve actual principal, school, date, IDs, participants and cohort tags.
3. Update the existing closure sentence assertion without dropping its checks.
4. Prove the real due-item producer with controlled saved memberships and illness.

# 5. Simulated, records, world pieces, checks

No new population, illness, authority or decision mechanism is added. The
principal lookup, cohort, closure threshold, schedule and records remain the
existing path. New exports: none. Replaces: the unsupported whole-school
denominator and zero-universal statement in `schoolDecisions` event prose only.
The missing whole-school population producer remains a dependency for Audit/CTO.

# 6. Proof run

The new changed test passed 10/10 in 15.06 seconds. Five distinct jurisdictions
were sampled with `school-cohort-summary:0` through `:4` from all 56. Each
controlled world saved a school, its actual principal's work relationship and
three named people's enrollments. The real due-item handler produced reopening
with zero cohort absences; canonical reload and repeat preserved the event and
schedule. Positive cases came from three actual saved health episodes and
produced a count-only closure summary. These fixtures do not prove natural
whole-school illness or enrollment coverage.

The old changed `epidemic.test.ts` includes a 400-day run and has not been
executed by the builder. Official Claude gate and current-main acceptance are
pending. Browser screenshot is blocked by CTO10:47's JSON-import collection
repair, owned exclusively by Audit. No blocked browser collection was repeated.

The new Node/browser fixture drew Koblerville, Northern Mariana Islands with
`school-cohort-summary:browser`. Its actual saved principal Jasper Ward reopened
the controlled school through the real due-item handler. Canonical serialization
and the existing Around projection retained event `event_6c94ca93dfc11948` with
the count-free reopening sentence. Two added fixture/spec files pass scoped
lint/format. The ordinary Continue → News → Around screenshot test is authored,
not yet collected or run before Audit's fix.

# 7. Worked example

A controlled saved principal reopens “Fixture learning center.” The event says
the principal reopened it, retaining their actual ID and the school's ID. It
does not claim that the whole school has only four people or that everyone is
healthy. In the positive fixture three enrolled people have actual saved illness
episodes; the closure event reports three absences without inventing total
enrollment. No fictional population, recovery or school-finance conversion is
introduced.
