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

**What.** Of 268 open stopgap rows, about 80 (missing-data, assumed-data, estimated-*) wait on outside data. Checked Oct 19 from a cloud session: bls.gov returns 403 (no OEWS industry-occupation matrix for SG-P8-authored-job-mix); api.census.gov answers but needs a key (PACE abatement costs for SG-WORLD-business-compliance-cost, county housing estimates); data.openstates.org returns 403; eac.gov is reachable but its EAVS files count polling places and do not give their kinds (SG-GOV-polling-place-kind); api.fdic.gov works without a key. Statute-by-statute rows (SG-GOV-justice-bribery-grade, SG-GOV-recall-bars-national, SG-WORLD-housing-foreclosure-steps) each need 56 reads.

**Rules.** Research before building; never copy a publisher's table whole; one rule, all 56 places; estimate, never UNKNOWN.

**Done when.** The owner or CTO supplies a Census API key and an allowed route to BLS and Open States, or a downloaded copy under data/source, or rules which rows stay estimated with a spread; the list of rows each source unblocks is recorded here by stopgap id.

**Files.** src/core2/data/stopgaps.json, data/source/

**Notes.** Found while working the pool on Oct 19 (claude/pool-data-gated-stopgaps); no code change.
