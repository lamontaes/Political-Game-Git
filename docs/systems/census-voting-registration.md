# Census reported voting and registration

Status: authorized intake acquired; compiler and read-only player adapter validated and ready for receiving; actual U player integration remains pending. This document is a bounded implementation contract, not a claim of production coverage.

The owner's state population and voter-breakdown request uses the existing BEA state population reader independently. Census CPS November 2024 tables 4a, 4b and 4c provide a separate historical survey context. They do not establish current voter rolls, legal eligibility, party registration, party preference or simulated residents' attributes.

## Evidence and scope

Official table landing: https://www.census.gov/data/tables/time-series/demo/voting-and-registration/p20-590.html . The linked workbooks remain under programs-surveys/cps/tables/p20/587/vote04a_2024.xlsx, vote04b_2024.xlsx and vote04c_2024.xlsx. The April 30, 2025 table release is established by the official Census release announcement. Methodology cpsnov24.pdf has its own unknown publication date; retrieval time is never its publication date.

The five actual HTTP 200 originals (three tables, methodology and release announcement) and digests are in data/source/census-voting-registration/artifact-lock.json. Total raw intake is 2,196,226 bytes, below the authorized 6 MiB bound. No source bytes or retrieval metadata were edited. Initial generic request metadata incorrectly applied the table release date to the methodology PDF; declaration and publisher.releaseDate were corrected to null without redownloading or changing hashes.

Actual workbook inspection found 52 geographies (United States, 50 states and D.C.): 52 rows in 4a, 572 rows in 4b (11 groups each), 312 rows in 4c (six groups each). All data cells in these exact files are numeric; future missing or provider-marker cells must remain nonnumeric states, never zero.

## Normalized and consumer contract

- One row retains the publisher's exact geography name, table, sheet, physical row/cell locators, group name/dimension and raw cell literals. Normalized state identity joins exact known names to the existing identity catalog; no place-name heuristics.
- Reference period is November 2024. Dates describe the survey reference, not a current simulated electorate. Methodology page 10 states interviews November 10–19, permits self or proxy responses and asks about the November 5 election. Label estimates “reported,” not “self-reported” only.
- Population universe is civilian noninstitutionalized adults age 18 and over. Total adult and citizen-adult population are distinct. Neither is the all-age BEA resident population nor a legally eligible count.
- Four count columns are published in thousands. Conversion to people must retain the raw literal and thousand-person rounding resolution; a rounded displayed zero does not establish the absence of people. Only count columns receive the factor of 1,000.
- Reported registered and reported voted rates each retain separate total-adult and citizen-adult denominators. Their margins of error are percentage points at 90% confidence, not count uncertainty or standard error. No rate is recomputed from rounded counts in place of the published rate.
- Race/Hispanic-origin categories overlap; no totals or 100% pie may be inferred. Sex and age group labels retain publisher meaning, distinct from character identity fields. Preserve rounding and sampling qualifications without assigning survey attributes to individual saved people.
- Unknown, suppressed or unrecognized marker values carry no numeric fallback. Percentage and count units remain explicit. Administrative registration, legal eligibility and party registration remain unavailable unless independently sourced.

Use the existing source-core acquisition, branded locked-artifact opening, XLSX reader, value algebra, corpus writer, validator and replay. No parallel source store. Compiled historical data is read-only context; no World mutation, law, registration command, travel, money or time consequence follows from viewing it. U owns the actual state display and browser acceptance; a compiler or isolated fixture is not proof of that route.


## Player interface and ownership

`queryStateVotingContext({ stateUsps, asOf })` in `src/presentation/state-voting-context.ts` lazily reads `/data/state-voting/v1`. Its pure projector returns a total row and separate sex, race/Hispanic-origin and age groups. Every group rate uses that group's adult or citizen-adult denominator, never the share of all state voters. An unavailable state, wrong-state shard, invalid date or date before the April 30 release yields no totals. Unresolved values retain no number.

`scripts/source/export-state-voting-context.ts` deterministically derives one shard per state and D.C. from the production corpus. Its guard checks production class, corpus hash and artifact-lock agreement; browser manifest includes publisher URLs, raw digests and actual retrieval metadata. These are generated delivery files, not a second source store. U owns shared replay/build registration, population/voter display and actual production browser verification. The independent BEA all-age population mount need not wait for these survey data.


## Focused validation receipt

In the released two-minute W slot, five source/reader tests passed; strict semantic TypeScript included application roots and all nine new TypeScript roots, with zero diagnostics. All five artifact locks rehashed successfully. The compiler produced 936 records with zero domain findings. Corpus digest: `10e69654c29e3dc202312cadcf0e3e44c097afa56379712d462c95f4e5b8ed71`. Both corpus files and all 52 browser files (51 state/D.C. shards plus manifest) replayed byte-identically. Scoped ESLint, Prettier and diff checks passed. A first lint failure caught direct presentation-to-domain type imports; the pure projector and types were moved behind the actual named one-way source adapter, and the full focused sequence reran successfully without disabling the rule.

Tests include independent Kentucky values, count-only scaling, retained rounded-zero precision, unknown cell tokens, denominator corruption despite a recomputed digest, invalid date, pre-release cutoff, D.C., unknown state, no neighboring/national fallback, read purity and wrong-state browser refusal. Temporary replay evidence is at `/private/tmp/w-cps-replay-WfNfHy`. This is scoped source/reader validation, not the full source gate or composed browser acceptance. Global source manifest and replay/build export registration remain U-owned. No World or save migration, simulated voter composition or active registration behavior is claimed.
