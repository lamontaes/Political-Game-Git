---
id: research-reachable-sources-oct20
title: "Cloud sessions reach Census bulk files, CDC open data, FHFA, BEA, Pew and Harvard Dataverse: retry the research items marked blocked on outside data"
area: core
kind: research
priority: 2
size: S
status: in-pr
claimed-by: claude/reachable-sources
pr: #5491
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:06:24.654Z
---

**What.** Checked Oct 20 from a cloud session: www2.census.gov (ACS PUMS and summary files), data.cdc.gov, www.fhfa.gov, apps.bea.gov, www.pewresearch.org, gss.norc.org and dataverse.harvard.edu return 200 and a 188 MB Cooperative Election Study file downloaded in one call; api.census.gov redirects (a key is needed), and www.bls.gov and www.ssa.gov return 403. Several research and stopgap items were marked blocked on 'outside data' on the belief that all of these fail. Re-read each blocked research item, pick the ones whose source is on a reachable host, and take them.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself. Cite publisher, year and URL in the data. Never copy a publisher's table whole.

**Done when.** A list in this item's Notes names, for each blocked research item, the host its source is on and whether it is reachable; at least two items that were blocked on outside data are moved to open or in-pr with the data fetched; no item is marked blocked on a host that is reachable.

**Files.** docs/pool/items

**Notes.** TODO

**Sweep so far (Oct 20).** Reachable from a cloud session (HTTP 200): www2.census.gov (county adjacency, ACS PUMS directories, ACS table-based summary files under /programs-surveys/acs/summary_file/2023/table-based-SF/), data.cdc.gov, www.fhfa.gov, apps.bea.gov, www.pewresearch.org (landing pages), gss.norc.org, dataverse.harvard.edu (a 188 MB CES file downloaded in one call). Not reachable: www.bls.gov and www.ssa.gov (403); api.census.gov redirects (key needed). First uses: `SG-WORLD-housing-county-estimate` (county adjacency; PR 5491) and the CES stance loadings (`research-opening-stance-loadings`, PR 5489). Candidates not yet taken, with their host: `SG-P15-partnership-model` and `SG-CORE-district-placement` (ACS place and legislative-district tables from the table-based summary files, large), `SG-WORLD-macro-mortgage-spread` (FHFA National Mortgage Database; the CTO excluded Freddie Mac, so FHFA is the allowed government series), `SG-WORLD-regional-territory-estimate` (BEA territory GDP tables). Still to sweep: every other item marked blocked on outside data.
