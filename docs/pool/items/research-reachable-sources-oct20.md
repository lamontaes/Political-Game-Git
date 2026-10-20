---
id: research-reachable-sources-oct20
title: "Cloud sessions reach Census bulk files, CDC open data, FHFA, BEA, Pew and Harvard Dataverse: retry the research items marked blocked on outside data"
area: core
kind: research
priority: 2
size: S
status: claimed
claimed-by: claude/reachable-sources
pr: #5491
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:42:19.481Z
---

**What.** Checked Oct 20 from a cloud session: www2.census.gov (ACS PUMS and summary files), data.cdc.gov, www.fhfa.gov, apps.bea.gov, www.pewresearch.org, gss.norc.org and dataverse.harvard.edu return 200 and a 188 MB Cooperative Election Study file downloaded in one call; api.census.gov redirects (a key is needed), and www.bls.gov and www.ssa.gov return 403. Several research and stopgap items were marked blocked on 'outside data' on the belief that all of these fail. Re-read each blocked research item, pick the ones whose source is on a reachable host, and take them.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself. Cite publisher, year and URL in the data. Never copy a publisher's table whole.

**Done when.** A list in this item's Notes names, for each blocked research item, the host its source is on and whether it is reachable; at least two items that were blocked on outside data are moved to open or in-pr with the data fetched; no item is marked blocked on a host that is reachable.

**Files.** docs/pool/items

**Notes.** Swept Oct 20 from a cloud session (HTTP status of the landing or directory page; a download is only claimed where the sweep says so).

| Host                                                              | Status                                      | What it serves                                              |
| ----------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| www2.census.gov (ACS table-based summary files, county adjacency) | 200                                         | ACS 5-year place, county and tract tables; county adjacency |
| api.census.gov                                                    | 200 on the docs page; data calls need a key | ACS API                                                     |
| lehd.ces.census.gov                                               | 200                                         | LEHD commuting (LODES)                                      |
| data.cdc.gov                                                      | 200                                         | CDC open data                                               |
| www.fhfa.gov                                                      | 200                                         | FHFA data, including the mortgage survey series             |
| apps.bea.gov                                                      | 200                                         | BEA GDP and income tables, including territories            |
| www.pewresearch.org                                               | 200                                         | Pew landing pages                                           |
| www.irs.gov/statistics                                            | 200                                         | IRS statistics of income                                    |
| www.eia.gov, nces.ed.gov, www.cms.gov, www.sba.gov                | 200                                         | energy, schools, Medicare and Medicaid, small business      |
| gss.norc.org, dataverse.harvard.edu                               | 200                                         | GSS; CES file (188 MB, one call)                            |
| www.bls.gov, data.bls.gov, www.ssa.gov                            | 403                                         | not reachable                                               |
| www.fema.gov (OpenFEMA), www.fbi.gov                              | 403                                         | not reachable                                               |

Blocked research items and their hosts: `research-deep-past-sourced-parameters` (ACS sex-by-age, marital status and household relationship tables: www2.census.gov, reachable), `research-residents-sourced-parameters` (county B23001 employment by age: www2.census.gov, reachable), `research-housing-sourced-parameters` (territory prices: apps.bea.gov and www2.census.gov, reachable), `research-macro-sourced-parameters` and `macro-mortgage-rate-fhfa-transition-index` (www.fhfa.gov reachable; blocked on an owner decision about Freddie Mac, not on access), `world-opening-jobs-vs-lodes-commuting` (lehd.ces.census.gov, reachable; blocked on `world-commuters-in-opening`), `research-opening-income-sourced-parameters` (matched benefit records: mixed; SSA is not reachable). The rest name a researcher with no host: `research-core-sourced-parameters`, `research-core-parameters-sourced-parameters`, `research-people-sourced-parameters`, `research-content-sourced-parameters`, `research-elections-sourced-parameters`, `research-gov-sourced-parameters`, `research-law-reach-sourced-parameters`, `research-legislature-sourced-parameters`, `research-opening-customers-sourced-parameters`. Not marked blocked on a host: none of the blockers above name a host that failed; `www.bls.gov`, `www.ssa.gov` and OpenFEMA are the only failures, and no item here names them as its only source.

Moved to open on this sweep: `research-deep-past-sourced-parameters` and `research-residents-sourced-parameters`, both sourced from the ACS summary files on www2.census.gov (directory listing `/programs-surveys/acs/summary_file/2023/table-based-SF/` with `data/` and `documentation/` returned 200). First uses of reachable hosts: `SG-WORLD-housing-county-estimate` (county adjacency, resolved on main) and the CES stance loadings (`research-opening-stance-loadings`).

**Sweep result (Oct 20, second pass).** Every item marked blocked on outside data, with its host. Reachable: research-deep-past-sourced-parameters (www2.census.gov ACS table-based summary files; moved to open), world-dwelling-position (www2.census.gov summary files and Gazetteer; moved to open), research-core-parameters-sourced-parameters (www2.census.gov Gazetteer centroids; row noted as takeable). Not reachable: research-world-sourced-parameters (www.epa.gov returns no response, 2005 PACE tables), and www.bls.gov, www.ssa.gov (403) and api.census.gov (key needed), so jobs-entry-requirement-by-occupation (BLS) stays on its spec block. No other blocked item names a host; the rest are blocked on design, spec, or another item.
