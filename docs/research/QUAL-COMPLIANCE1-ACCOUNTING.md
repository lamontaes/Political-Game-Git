# QUAL-COMPLIANCE1 Field Accounting

As of 2026-09-08. "Staged" means exact research transport compiled without
production promotion. "Accepted" means a smaller field was independently
verified against current first-party text and has a typed runtime consumer.

## Exact transports

| Artifact               |  Rows | Identity                                                                   | Disposition                                                                                                           |
| ---------------------- | ----: | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 31D recovered TSV      |   601 | SHA-256 `bc8afda99ae2e9e22180126bc4801fbd9fe5c6f9f3e12f442f8e16ab5de50473` | All 14 columns compile as research; 31 Ohio claims independently clear the first-party production gate                |
| 31F compiler-ready TSV |   118 | Checked-in 12-column source                                                | All rows compile as research; 32 claims across MN, MO, NE, and NV independently clear the first-party production gate |
| 92M JSON               | 1,020 | SHA-256 `49c5bd015b071dc888ce7ab31cf9336483b6f006690699ebc7bab427d1551a31` | 51 jurisdictions times 20 fields compile; 1,020 staged                                                                |

31D contains 516 `DIRECT`, 83 `DERIVED`, and 2 `HISTORICAL` rows. The
earlier "516 damaged claims" count was the direct-row count, not the artifact's
total. Every row has 14 fields; no delimiter was guessed.

## 31D field accounting

| Field                        | Transported | Accepted here | Blocked/staged |
| ---------------------------- | ----------: | ------------: | -------------: |
| `office_existence`           |          70 |             7 |             63 |
| `selection_type`             |          59 |             4 |             55 |
| `term_length_years`          |          59 |             6 |             53 |
| `term_limit`                 |          59 |             6 |             53 |
| `min_age`                    |          59 |             0 |             59 |
| `us_citizenship`             |          59 |             0 |             59 |
| `state_residence_years`      |          59 |             0 |             59 |
| `district_residence`         |          59 |             2 |             57 |
| `elector_required`           |          59 |             6 |             53 |
| `professional_qualification` |          59 |             0 |             59 |
| **Total**                    |     **601** |        **31** |        **570** |

The status mix is 444 KNOWN, 88 NOT_APPLICABLE, 58
NO_REQUIREMENT_FOUND, and 11 OFFICE_DOES_NOT_EXIST. The rows cover NC, ND,
NM, NY, OH, OK, OR, PA, RI, and SC. Thirty-one Ohio rows were matched to
reviewed transcriptions from acquired, hashed first-party provisions. The other
570 remain staged or refused; no missing authority, mismatched citation,
`review_required`, or historical row is promoted.

## 31F field accounting

| Field                       | Transported | Accepted here | Blocked/staged |
| --------------------------- | ----------: | ------------: | -------------: |
| Office Existence            |          24 |             7 |             17 |
| Minimum Age                 |          23 |             9 |             14 |
| State Residence Duration    |          23 |             5 |             18 |
| Term Limit Rule             |          15 |             4 |             11 |
| Selection Mechanism         |           9 |             1 |              8 |
| Term Length                 |           8 |             2 |              6 |
| Professional Qualifications |           7 |             1 |              6 |
| District Residence Duration |           3 |             2 |              1 |
| Elector Requirement         |           3 |             0 |              3 |
| U.S. Citizenship Duration   |           3 |             1 |              2 |
| **Total**                   |     **118** |        **32** |         **86** |

The status mix is 113 KNOWN, 2 NO_REQUIREMENT_FOUND, and 3
OFFICE_DOES_NOT_EXIST. The rows cover MA, MI, MN, MO, MS, MT, NE, NH, NJ,
and NV. Thirty-two rows across Minnesota, Missouri, Nebraska, and Nevada match
reviewed transcriptions from acquired and hashed first-party provisions. The
other 86 remain staged or refused behind the source gate.

## Independently accepted qualification fields

The production source domain contains 63 unique rows: 31 from recovered 31D
and 32 from 31F. It contains 14 office-existence, 9 minimum-age, 5
state-residence, 4 district-residence, 6 elector, 1 citizenship, 1 professional,
8 term-length, 10 term-limit, and 5 selection-mechanism facts. All are `KNOWN`;
the other epistemic states remain distinct in the 719-row staged transport and
never become values by default.

The earlier Alaska implementation remains a separate already-locked source
path:

| Jurisdiction / office | Minimum age | State residence | District residence |    Term | Accepted fields |
| --------------------- | ----------: | --------------: | -----------------: | ------: | --------------: |
| Alaska House          |          21 |         3 years |             1 year | 2 years |               4 |
| Alaska Senate         |          25 |         3 years |             1 year | 4 years |               4 |

These eight fields carry 31A lineage but were accepted only after reading the
already locked Alaska Constitution bytes. They do not promote other 31A prose
claims. A pure assessment proves a complete pass when supplied all dated facts.
The existing generic seat has no district ID, so normal candidacy is refused at
the district-residence boundary rather than inferring geography.

## 92M field accounting

Every actual field has 51 transported jurisdiction rows. No composite 92M row
is promoted wholesale.

| Field                                 | Rows |                                           Accepted runtime subclaims | Blocked/staged                                               |
| ------------------------------------- | ---: | -------------------------------------------------------------------: | ------------------------------------------------------------ |
| `candidate_committee_registration`    |   51 | 2 Kentucky subclaims; 2 Minnesota obligations; 1 Nebraska obligation | 51 composite rows staged                                     |
| `reporting_cadence_events`            |   51 |                                                 8 Kentucky subclaims | 51 composite rows staged                                     |
| `contribution_limits`                 |   51 |                                                                    0 | 51; Kentucky amount explicitly UNKNOWN after the 2026 change |
| `corporate_labor_treatment`           |   51 |                                                                    0 | 51                                                           |
| `public_financing`                    |   51 |                                                                    0 | 51, preserving 31 NOT_APPLICABLE values                      |
| `independent_expenditures`            |   51 |                                                                    0 | 51                                                           |
| `campaign_finance_enforcement_agency` |   51 |                                                                    0 | 51                                                           |
| `late_failure_consequences`           |   51 |                                                                    0 | 51; no violation or corruption inference                     |
| `financial_disclosure`                |   51 |                                                                    0 | 51                                                           |
| `gift_restrictions`                   |   51 |                                                                    0 | 51                                                           |
| `conflicts_of_interest`               |   51 |                                                                    0 | 51                                                           |
| `recusal_disqualification`            |   51 |                                                                    0 | 51                                                           |
| `revolving_door_restrictions`         |   51 |                                                                    0 | 51                                                           |
| `ethics_enforcement_structure`        |   51 |                                                                    0 | 51                                                           |
| `lobbyist_registration_trigger`       |   51 |                                                                    0 | 51; no lobbying engine                                       |
| `client_principal_relationship`       |   51 |                                                                    0 | 51                                                           |
| `lobbying_enforcement_body`           |   51 |                                                                    0 | 51                                                           |
| `lobbying_gift_restrictions`          |   51 |                                                                    0 | 51                                                           |
| `lobbying_reporting_scope_cadence`    |   51 |                                                                    0 | 51                                                           |
| `lobbying_structural_exceptions`      |   51 |                                                                    0 | 51                                                           |

Exact 92M status totals are 989 KNOWN and 31 NOT_APPLICABLE. Separately
verified Kentucky runtime fields are: statement within five days, the $5,000
reporting threshold, four schedule points, KEFMS transport, immediate public
record visibility on receipt, the $200 itemization threshold, and no
commingling. Current Registry guidance supplies one more accepted field:
amendment transport through the electronic system. Filing is stored as
`filed`, never approved.

The Minnesota and Nebraska obligations were not promoted from 92M. They were
independently compiled from two acquired, hashed statutes. Minnesota contributes
a `KNOWN` $750 aggregate trigger from sources other than the candidate and a
distinct no-second-principal-committee rule whose threshold is
`NOT_APPLICABLE`. Nebraska contributes a `NOT_APPLICABLE` threshold because its
filed-statement and qualified-treasurer prerequisite has no monetary trigger.
The generated runtime export contains three unique record IDs, so none of these
normalized obligations duplicates another row.

## Stopped-counterpart recovery accounting

Shared Recovery section H identified the stopped Claude checkout at
`/Users/lamontae/Documents/Political-Game-QUAL-COMPLIANCE1`, branch
`claude/qual-compliance1-qualification-campaign-rules`, commit
`2c3ebc0aaf706999cab43ce17c9610c825f7bef5`. Its unique first-party source,
compiler, transcription, generated-adapter, and ledger work was replayed into
this branch. Its second copy of 31D was not retained: the current Drive-exact
file differs only by one trailing newline and remains the single transport.
Its duplicate progress plan was likewise omitted after its claims were folded
into this accounting.

Recovery artifacts outside the repository preserve the stopped state:

- working-tree patch SHA-256
  `ec830396a163ebee05a21740919942d8486c78715a3b3806410c220cbfa928d8`;
- untracked-files archive SHA-256
  `1116960499f24ab899dae5f6096d336021bff4d7bf512c46ed8c798c60126a9a`.

## Block reasons

- No locked field-supporting first-party bytes: staged, not promoted.
- Composite synthesis row contains more than the verified subclaim: only the
  subclaim is accepted.
- Review or historical flag: preserved and blocked from current truth.
- Missing exact district or actor identity: qualification/compliance refused.
- Unsupported contribution-limit amount: UNKNOWN; no fallback value.
- Municipal governing procedure, global navigation, lobbying systems, and the
  #135 campaign clock remain owned elsewhere and unchanged here.

## LEARN

- Text patches can rewrite line endings in locked HTML. Recovery therefore
  replays exact source bytes from the stopped checkout/archive and verifies
  every lock rather than trusting an emailed diff as binary transport.
- A staged research-only compiler belongs outside auto-discovered production
  source domains unless it provides a complete `sourceDomain`; the 92M reader
  now lives under `src/source/research`.
