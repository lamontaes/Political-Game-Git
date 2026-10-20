---
id: release-stopgap-data-access
title: "Cloud sessions cannot reach the data most open stopgaps need"
area: release
kind: research
priority: 3
size: S
status: in-pr
claimed-by: claude/pool-data-access
pr: #5282
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:36:59.705Z
---

<<<<<<< HEAD
**What.** Find out which data hosts a cloud session can and cannot reach, so the stopgap items that say they need outside data can be sorted into "build now" and "genuinely blocked". Probed Oct 19 from a cloud session through the agent proxy.

**Rules.** Research before building (real data checks the simulation and never decides an outcome); look before you register.

**Done when.** The reachable and blocked hosts are written below with how each was tested; the stopgap items that name a blocked host are marked blocked-on this item by the CTO.

**Files.** docs/pool/items/release-stopgap-data-access.md

**Notes.** The network is not the blocker. The proxy tunnels every host tried (`200 Connection Established`); the 403s come from the sites' own bot protection, and a browser User-Agent does not change them.

- Reachable (HTTP 200/301/302 from `curl https://<host>/`): www.census.gov, api.census.gov, data.cdc.gov, sda.berkeley.edu (the GSS cumulative file analysis pages), www.bea.gov, fred.stlouisfed.org, www.govinfo.gov, www.fec.gov, www.irs.gov, www.dol.gov, www.bjs.gov, data.bls.gov, api.bls.gov (public API v2, 200), www.atusdata.org (302 to its login), archive.org, zenodo.org, doi.org, api.github.com, raw.githubusercontent.com.
- Blocked by the site (403, AkamaiGHost, DataDome or similar): www.bls.gov, www.ssa.gov, www.congress.gov, www.fema.gov, www.cbo.gov. Use the API host or a mirror instead where one exists (api.bls.gov for BLS series; govinfo.gov for Congress texts; zenodo.org or archive.org copies of datasets).
- No answer (000): gssdataexplorer.norc.org, api.open-meteo.com.
- Not tested: whether the calibration panels the stopgaps name (Roberts and Dunbar tie-strength data, the cohort data behind `SG-P8-life-utility`) are posted anywhere reachable; the "needs a published panel" stopgaps still need that found, not a different network.
  \=======
  **What.** Of 268 open stopgap rows, about 80 (missing-data, assumed-data, estimated-*) wait on outside data. Checked Oct 19 from a cloud session: bls.gov returns 403 (no OEWS industry-occupation matrix for SG-P8-authored-job-mix); api.census.gov answers but needs a key (PACE abatement costs for SG-WORLD-business-compliance-cost, county housing estimates); data.openstates.org returns 403; eac.gov is reachable but its EAVS files count polling places and do not give their kinds (SG-GOV-polling-place-kind); api.fdic.gov works without a key. Statute-by-statute rows (SG-GOV-justice-bribery-grade, SG-GOV-recall-bars-national, SG-WORLD-housing-foreclosure-steps) each need 56 reads.

**Rules.** Research before building; never copy a publisher's table whole; one rule, all 56 places; estimate, never UNKNOWN.

**Done when.** The owner or CTO supplies a Census API key and an allowed route to BLS and Open States, or a downloaded copy under data/source, or rules which rows stay estimated with a spread; the list of rows each source unblocks is recorded here by stopgap id.

**Files.** src/core2/data/stopgaps.json, data/source/

**Notes.** Found while working the pool on Oct 19 (claude/pool-data-gated-stopgaps); no code change.

> > > > > > > origin/main

- Update Oct 20: `api.bls.gov` answers (HTTP 200) but its v1 API, the one that needs no key, returns "the daily threshold for total number of requests ... has been reached" from the shared cloud address, so no BLS series (OEWS staffing by industry, JOLTS) can be pulled from a cloud session without a registered key. A key in the environment's secrets (`environment.secrets`, in the cloud environment settings) would unblock `SG-P8-authored-job-mix` and the other OEWS rows.
