# Official Census finance and employment production inputs

SRC-CAP2 adds repository-native production acquisition and compilation to the
existing two domains. Fixtures remain separate and synthetic. No simulation,
government-unit identity contract, or player surface changes.

## Products and reproducible scope

| Domain              | Official current individual-unit product                                                                                                | Production scope                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Government finances | [2024 State & Local Government Finance public-use files](https://www.census.gov/data/datasets/2024/econ/local/public-use-datasets.html) | 886 published item observations for the first 25 sorted publisher IDs          |
| Public employment   | [2025 ASPEP individual-unit files](https://www.census.gov/data/datasets/2025/econ/apes/annual-apes.html)                                | 298 published function observations for the first 25 sorted nonzero legacy IDs |

Both are annual survey samples, not census universes. The committed QA samples
are further bounded subsets of those samples. `SAMPLE_ESTIMATE` identifies the
survey basis; it does not turn an individual observation into a population
estimate. No weighting, population expansion, or aggregate inference occurs.

`source:acquire -- --domain <domain>` downloads and hashes the full official ZIP,
caches it, and cuts byte-preserving rows using the predicate recorded in each
artifact lock. It retains complete technical documentation and disclaimer PDF
members. Finance additionally locks the official historical PID/GID crosswalk,
local methodology, and state technical documentation. Each parent archive has
its own SHA-256 and its primary data member's separate hash. The lock holds exact
URLs, actual retrieval instants, byte counts, storage and lineage. No hand-entered
retrieval dates or fixture matrices become production artifacts.

Production openers verify locked bytes before parsing. Compilation, manifest,
validation and replay require no network. The QA selection depends on official
identifiers, never names or preferred numerical results. Full archive acquisition
is implemented; a full-universe production claim is not.

## Publisher layouts and mapping

Finance `2024FinEstDAT_07152026modp.txt` is fixed-width: ID 1–12, item 13–15,
amount 16–27, year 28–31, flag 32. The technical document says 32 in prose and
33 in its layout table; all 511,362 acquired rows are 32 bytes before the line
terminator. The parser accepts 32, or 33 only when column 33 is blank padding.
It refuses shifted fields, extra content, unknown years/flags, and duplicate
ID/item/year records. `Fin_PID_2024.txt` is 146 bytes: ID 1–12, name 13–76,
fiscal ending MMDD 141–144, survey year 145–146. The remaining publisher columns
are retained in the unchanged artifact rather than invented as canonical facts.

The 2024 local codebook's item table supplies names and the revenue, expenditure,
debt, and cash/security line families. State documentation additionally defines
E27, F27 and M27 (environmental health), absent from that table. State F-code
labels explicitly changed from construction to **all capital expenditures** in
2022; production state records use those current state-specific labels. Local
records retain their product's labels. Unknown item codes fail closed. Category
mapping is a classification of source lines, not a capacity, solvency, efficiency,
or health assessment.

Finance amounts remain USD thousands. R is reported, A analyst correction, I
imputed, and **S alternative source**, all retained as publisher flags beside the
value. M becomes UNKNOWN, N NOT_APPLICABLE, and a blank is UNKNOWN. A numeric zero
with a numeric-data flag stays KNOWN(0). No suppression sentinel is documented in
this product: an unrecognized sentinel is rejected, never interpreted as zero or
borrowed from the fixture vocabulary. Existing fixture suppression semantics stay
under regression test.

Employment `25empst.txt` is 80 bytes: legacy ID 1–14, function 18–20, FT employees
21–30/flag 32, FT payroll 33–44/flag 46, PT employees 47–56/flag 58, PT payroll
59–70/flag 72, PID6 75–80. `25empid.txt` is 213 bytes: legacy ID 1–14, name 15–78,
FIPS state 110–111, PID6 208–213. The leading Census state code is **not FIPS**;
USPS comes from the codebook's Census-state table and FIPS from the directory.
Reserved positions and exact widths are checked. The four flags remain in source
order (FT count/payroll, PT count/payroll), preserving reported versus imputed
status without relabeling imputed values as direct reports. Unknown flags,
malformed values, absent/contradictory identities, and duplicate observations fail.

The individual-unit product has no FTE field. Every FTE is UNKNOWN with codebook
evidence; no FTE is synthesized from headcount. Blank cells differ from zero.
The fixture's `S` suppression token is not valid in this publisher's flag table.

## Identity and SRC-GOV2

Employment joins the observation and directory by the published legacy ID and
requires the independently supplied PID6 to agree. Finance's 12-character ID
contains FIPS state, type, county and the six-character unit identifier. It joins
the latter through the [official historical PID/GID crosswalk](https://www2.census.gov/programs-surveys/gov-finances/data/PID_to_GID_Crosswalk.zip),
whose README describes the 2017 conversion to a random six-digit PID. Names are
never join keys. Native IDs survive alongside legacy canonical IDs and evidence.

SRC-GOV2 confirmed this crosswalk is useful but incomplete for the modern
universe. Every selected finance PID must actually appear; an absent PID throws
an explicit SRC-GOV2 dependency. The bounded result does not clear the separate
government-units universe migration or assert a fabricated mapping for newer IDs.

## Reference periods and architecture correction

[2024 local methodology](https://www2.census.gov/programs-surveys/gov-finances/technical-documentation/methodology/2024/2024_methodology.pdf)
defines the local survey window as July 1, 2023–June 30, 2024. Local MMDD is placed
in that documented window, preserving both source MMDD and survey year.
[2024 state technical documentation](https://www2.census.gov/programs-surveys/state/technical-documentation/complete-technical-documentation/statetechdoc2024.pdf)
places state fiscal endings in the survey year: June 30 except Alabama/Michigan
September 30, New York March 31, Texas August 31. The combined finance archive's
Alabama MMDD is 0930 and survey year 24. It therefore becomes 2024-09-30 for the
state, whereas a local government's 0930 becomes 2023-09-30.

The previous universal July–June validator incorrectly generalized the local
methodology to state records. Production now carries an explicit period basis;
only documented state records use the state-year rule. Existing fixture/local
window behavior remains intact. This is a contained correction to source
semantics, not a change to Stage 6 simulation time. The government fiscal-year
**label remains UNKNOWN** in all production records. Corpus as-of is the latest
supported fiscal ending, not a fabricated December 31.

ASPEP headcounts reference the pay period containing March 12, 2025. Payroll is
the 31-day March equivalent; its March 1–31 period is retained separately. The
corpus reaches March 31; no December 31 coverage is asserted.

## Reliability and limitations

The Census Bureau edits individual-unit data to support aggregate estimates and
has not reviewed these individual units as accurate time series. Sampling and
nonsampling error, nonresponse, classification differences, and imputation can
affect these records. Census is the source of the original data only and has not
sanctioned downstream analyses. Both complete publisher disclaimers are locked
and accompany the QA artifacts; coverage metadata carries these cautions.

The archival crosswalk is not a current government-universe certification.
Larger scopes may expose unmapped IDs or undocumented item codes and must fail
closed until supported. Suppressed/unpublished facts never become zeros; no
invented capacity or efficiency measures are emitted.

## Verification and LEARN

Publisher adversaries cover exact widths, missing/extra fields, invalid bytes,
reserved columns, unknown codes and flags, zero/blank/unknown/not-applicable
values, dates and year drift, duplicate rows, contradictory official ID pairs,
missing crosswalk IDs, lock tampering, and unknown rights. Actual archived bytes
are recut locally and checked against committed QA bytes. CI can compile and
replay from committed locked inputs without downloading the full archives.

Architecture audit: source/core dependency direction and fixture capability
boundary confirmed; source-only publisher metadata and period interpretation
corrected; government-unit PID6 migration remains owned by SRC-GOV2; simulation,
World identity, UI, and frozen Stage 6 behavior unchanged.

LEARN: a working fixture parser is not a production adapter, and a one-letter
flag cannot be interpreted without its product's codebook. Exact publisher-shape
and gate-regression tests are the durable checks for this failure pattern.
