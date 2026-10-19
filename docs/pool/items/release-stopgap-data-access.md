---
id: release-stopgap-data-access
title: "Cloud sessions cannot reach the data most open stopgaps need"
area: release
kind: research
priority: 3
size: S
status: claimed
claimed-by: claude/pool-data-access
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:36:59.705Z
---

**What.** Find out which data hosts a cloud session can and cannot reach, so the stopgap items that say they need outside data can be sorted into "build now" and "genuinely blocked". Probed Oct 19 from a cloud session through the agent proxy.

**Rules.** Research before building (real data checks the simulation and never decides an outcome); look before you register.

**Done when.** The reachable and blocked hosts are written below with how each was tested; the stopgap items that name a blocked host are marked blocked-on this item by the CTO.

**Files.** docs/pool/items/release-stopgap-data-access.md

**Notes.** The network is not the blocker. The proxy tunnels every host tried (`200 Connection Established`); the 403s come from the sites' own bot protection, and a browser User-Agent does not change them.

- Reachable (HTTP 200/301/302 from `curl https://<host>/`): www.census.gov, api.census.gov, data.cdc.gov, sda.berkeley.edu (the GSS cumulative file analysis pages), www.bea.gov, fred.stlouisfed.org, www.govinfo.gov, www.fec.gov, www.irs.gov, www.dol.gov, www.bjs.gov, data.bls.gov, api.bls.gov (public API v2, 200), www.atusdata.org (302 to its login), archive.org, zenodo.org, doi.org, api.github.com, raw.githubusercontent.com.
- Blocked by the site (403, AkamaiGHost, DataDome or similar): www.bls.gov, www.ssa.gov, www.congress.gov, www.fema.gov, www.cbo.gov. Use the API host or a mirror instead where one exists (api.bls.gov for BLS series; govinfo.gov for Congress texts; zenodo.org or archive.org copies of datasets).
- No answer (000): gssdataexplorer.norc.org, api.open-meteo.com.
- Not tested: whether the calibration panels the stopgaps name (Roberts and Dunbar tie-strength data, the cohort data behind `SG-P8-life-utility`) are posted anywhere reachable; the "needs a published panel" stopgaps still need that found, not a different network.
