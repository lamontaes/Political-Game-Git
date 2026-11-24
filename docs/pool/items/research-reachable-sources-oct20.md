---
id: research-reachable-sources-oct20
title: "Cloud sessions reach Census bulk files, CDC open data, FHFA, BEA, Pew and Harvard Dataverse: retry the research items marked blocked on outside data"
area: core
kind: research
priority: 2
size: S
status: done
claimed-by: claude/reachable-sources
pr: #5491
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T21:20:20.243Z
---

**What.** Checked Oct 20 from a cloud session: www2.census.gov (ACS PUMS and summary files), data.cdc.gov, www.fhfa.gov, apps.bea.gov, www.pewresearch.org, gss.norc.org and dataverse.harvard.edu return 200 and a 188 MB Cooperative Election Study file downloaded in one call; api.census.gov redirects (a key is needed), and www.bls.gov and www.ssa.gov return 403. Several research and stopgap items were marked blocked on 'outside data' on the belief that all of these fail. Re-read each blocked research item, pick the ones whose source is on a reachable host, and take them.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself. Cite publisher, year and URL in the data. Never copy a publisher's table whole.

**Done when.** A list in this item's Notes names, for each blocked research item, the host its source is on and whether it is reachable; at least two items that were blocked on outside data are moved to open or in-pr with the data fetched; no item is marked blocked on a host that is reachable, and each moved item's own done-when names the drawn place and played world (buildBenchWorld) its data will be checked in.

**Files.** docs/pool/items

**Notes.** TODO

**Sweep so far (Oct 20).** Reachable from a cloud session (HTTP 200): www2.census.gov (county adjacency, ACS PUMS directories, ACS table-based summary files under /programs-surveys/acs/summary_file/2023/table-based-SF/), data.cdc.gov, www.fhfa.gov, apps.bea.gov, www.pewresearch.org (landing pages), gss.norc.org, dataverse.harvard.edu (a 188 MB CES file downloaded in one call). Not reachable: www.bls.gov and www.ssa.gov (403); api.census.gov redirects (key needed). First uses: `SG-WORLD-housing-county-estimate` (county adjacency; PR 5491) and the CES stance loadings (`research-opening-stance-loadings`, PR 5489). Candidates not yet taken, with their host: `SG-P15-partnership-model` and `SG-CORE-district-placement` (ACS place and legislative-district tables from the table-based summary files, large), `SG-WORLD-macro-mortgage-spread` (FHFA National Mortgage Database; the CTO excluded Freddie Mac, so FHFA is the allowed government series), `SG-WORLD-regional-territory-estimate` (BEA territory GDP tables). Still to sweep: every other item marked blocked on outside data.

Sent back 2026-10-20 from PR #5491 (branch claude/reachable-sources): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5491 (branch claude/reachable-sources): The remaining diff contains only docs/pool/items/research-reachable-sources-oct20.md and no docs/release/changes declaration. Add an impact:none declaration for the actual research-host sweep, with only id and impact in its frontmatter, and describe that remaining scope rather than the housing change already on main. A docs-only PR still needs the release declaration required by the merger rule.; finish on that branch, merge main into it first.

**Sweep result (Oct 20, second pass).** Every item marked blocked on outside data, with its host. Reachable: research-deep-past-sourced-parameters (www2.census.gov ACS table-based summary files; moved to open), world-dwelling-position (www2.census.gov summary files and Gazetteer; moved to open), research-core-parameters-sourced-parameters (www2.census.gov Gazetteer centroids; row noted as takeable). Not reachable: research-world-sourced-parameters (www.epa.gov returns no response, 2005 PACE tables), and www.bls.gov, www.ssa.gov (403) and api.census.gov (key needed), so jobs-entry-requirement-by-occupation (BLS) stays on its spec block. No other blocked item names a host; the rest are blocked on design, spec, or another item.
Sent back 2026-10-20 from PR #5491 (branch claude/reachable-sources): The release declaration and corrected docs-only scope address the earlier return, and current main merges cleanly here. The item still requires at least two previously blocked items to be moved to open or in-pr with the data fetched. The new Notes record directory HTTP 200 responses and remove the two blocks, but give no fetched ACS B15001/B05/B11 tables or tract/block-group data for those two items. A reachable directory is not that required fetched-data proof. Add the named downloads and evidence for both moved items before marking this sweep done; keep their own played-world requirements intact.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5491 (branch claude/reachable-sources): The fetched ACS-file notes address the earlier directory-only return. The body still lacks the Done when evidence table required by merger skill section 2.5. Map the complete blocked-item/host list, two unblocked items with their fetched-file URLs and values, absence of reachable-host blocks, and preservation of each moved items drawn buildBenchWorld acceptance to their actual Notes. Also replace the housing title with the research-host sweep that is the remaining diff. No local gate pass is claimed here.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5491 (branch claude/reachable-sources): The body/title/table fixes and fetched-data proof are present, and the docs conflict is resolved with both Notes kept. One receipt count is false: docs/pool/items/research-deep-past-sourced-parameters.md:35 says the B15001 file contains 48 state rows. I downloaded the exact 160,422,985-byte file; SHA-256 90a66ecbfb1c944650df98ee3ca68088693f76c2b6f308e99c2e99af1e69b688 matches, and its GEO_ID prefix 0400000US has 52 state-level rows: all 50 states, D.C. and Puerto Rico. Correct 48 to that explicit 52-row scope. The 85,381 tract rows, 32,325 place rows, U.S. total 258,742,302 and margin 4,128 all match; the B01003 receipt also matches here. Typecheck, changed-file Prettier, zero-dice and release check passed locally; pool has five unrelated errors reproduced on frozen main. Main integration is plain-pushed at 775c8b8ac9.; finish on that branch, merge main into it first.
