# Private citizenship is recorded when people are created

New people receive a private citizenship estimate from their place's Census county shares. A later recorded event can establish naturalization or a change in status. Names, appearance, behavior, and moves never rewrite it. Old saves without a record remain unknown on read.

## Consumer contract

`citizenshipStatusOf(world, personId, options?)` reads the canonical `Person.citizenshipStatuses` family. Options are `asOfDate` and `historySequenceExclusive`. It returns the latest applicable private record or null. Records contain `status`, `effectiveAt`, `recordedAt`, `citizenSince`, `sequence`, `sourceEventId`, and estimate/source provenance. No second citizenship store is needed.

`citizenshipEligibility(world, personId, {...options, minimumYears?})` returns `isCitizen`, `verdict`, `citizenSince`, `years`, `record`, `estimated`, and `sourceEntityIds`. It checks citizenship only. Sessions 23 and 21 must retain their own applicable board, office, and voting requirements. Null status means unknown, never noncitizen. Estimated naturalized status has no invented oath date: citizenship can meet a status-only requirement while a duration remains unverified.

`recordCitizenshipTransition(world, input)` is the sole change writer. Input requires `stableKey`, `personId`, `effectiveAt`, `kind`, `status`, `citizenSince`, `sourceEntityIds`, and `reason`. Kinds are `naturalization`, `citizenship-loss`, and `status-confirmation`. Naturalization requires `naturalized-citizen` and `citizenSince === effectiveAt`. It returns a World with a private `citizenship.status-recorded` event and an appended person record. Repeating the same stable key and status/date returns the same World; conflicting status/date fails. Future or out-of-order transitions fail. Prior event IDs are retained as checked source references in the record provenance and event tags; they are not treated as involved entities. The writer does not grant knowledge, advance time, or change other qualification rules. For a document confirming earlier naturalization, use `status-confirmation` effective now with the actually supplied earlier `citizenSince`; do not invent a date or backdate the creation estimate.

Creation uses `initializePersonCitizenship` through the existing lightweight, starting-person, context-person, and World creation paths. Do not call it to infer a missing old-save status. `citizenByBirthSince` remains unchanged as positive birthplace evidence; it is not the latest-status reader. Compiled candidacy assessments prefer canonical status and use legacy positive evidence only when the canonical record is absent.

## Source and limits

The official 2020–2024 ACS tables B05001 and B05001PR provide 3,222 county rows. Each row preserves all six estimates, their margins of error, source table, and source line. Verified lossless gzip inputs and their raw/stored hashes are retained under `data/source/acs-county-citizenship/raw`; `scripts/source/compile-county-citizenship.py --check` verifies the generated corpus. Puerto Rico uses its own companion table. Multiple counties are population-weighted. Missing county joins fall back to the state's published counties, then all published counties, with the basis saved explicitly.

The four other island areas lack observations in these ACS tables. They use the marked published-county estimate. The estimates establish fictional starting attributes under CTO6011713499; they are not individual legal documents, historical applicability, or immigration categories. A noncitizen record does not establish unlawful presence or permanent residency. No appearance or name is used as evidence. Private authority reads do not establish another person's knowledge.

## Verification and publication

Source compilation verifies the partition and hashes of all 3,222 counties. Focused regressions cover creation in all 56 jurisdictions, starting and appended people, private naturalization, same-day sequence, save/reload, future-date refusal, unknown old saves, unchanged identity/home reads, and citizenship duration. Recorded-transition fixtures are source proof, not a played naturalization or election route. No merge or build is authorized for this producer.
