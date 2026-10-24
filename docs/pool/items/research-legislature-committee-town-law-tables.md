---
id: research-legislature-committee-town-law-tables
title: "Research tables for each chamber's committee rule, each place's ordinance clause and mayor's bill right"
area: gov
kind: research
priority: 2
size: S
status: in-pr
claimed-by: claude/dreamy-tesla-bgi3ui-legislature
pr: #5862
blocked-on:
source: "split Oct 24, 2026 from research-legislature-sourced-parameters (PR #5862)"
claimed-at: 2026-10-24T01:40:00.000Z
---

**What.** Records what real law says for the three legislature stand-ins as per-place research tables under data/research/gov/: chamber-committee-appointment-2026.json (who seats the committees of 108 chambers: 27 SOURCED from the chamber's adopted rules, 16 of them seated by another hand than the template's, and 81 ESTIMATED as the template default), local-ordinance-style-2026.json (the enacting clause and numbering state law gives a town's or county's ordinances in all 56 places: 12 states' town clauses, 2 states' county clauses and one council's two-part numbering SOURCED, the rest ESTIMATED as the national default) and local-executive-introduction-2026.json (how a mayor or county executive brings a bill in all 56 places: 6 mayor rows SOURCED, the rest ESTIMATED). The engines do not read these tables yet: the readers are scripts/research/legislature-local-rules-check.ts, which exits 1 when a table disagrees with its quotes or its template default, and scripts/research/legislature-year.ts, so no parameter row or engine value changes and play is unchanged. It updates the `replacement` of SG-GOV-committee-structure, SG-GOV-local-bill-numbering and SG-GOV-local-executive-proposal to name each table, the check script and the builder item that will read it, and it reports one played year in Plattsmouth, Nebraska. Split from research-legislature-sourced-parameters, which stays open until the engines read the tables and the rows still ESTIMATED are read.

**Rules.** Research calibrates, never decides: no source text reaches a player and no number picks one actor's outcome; the tables only record what the law says for the builders who will wire them in. Estimate, never UNKNOWN: a chamber or place whose law the cloud could not reach is ESTIMATED as the template or national default with its source, never invented. One rule, all 56 places: each table has a row for every chamber or place, and no state is named in logic.

**Done when.** (a) Every row of the three tables is SOURCED or ESTIMATED, and each SOURCED row names its rule or statute, gives its URL and quotes the fetched text, and the check script exits 1 for a SOURCED clause whose words are not in its quote and for an ESTIMATED chamber whose appointer is not the template default. (b) Each of the three files under data/research/gov/ is read by scripts/research/legislature-local-rules-check.ts and scripts/research/legislature-year.ts (no engine reads them yet), and tests/guards/research-data-has-reader.test.ts lists none of them. (c) SG-GOV-committee-structure, SG-GOV-local-bill-numbering and SG-GOV-local-executive-proposal each keep their row in src/core2/data/stopgaps.json, still open, with a `replacement` naming the research table, the check script and the builder item that will read it (gov-leadership-committee-appointer-by-chamber, gov-legislature-local-rules-by-place and words-local-enacting-clause-by-state). (d) The tripwire and calibration-guard tests pass (src/core2/tooling/tripwires.test.ts, calibration-guard.test.ts). (e) A one-year played world (buildBenchWorld, a place drawn from all 56, seed named in the PR) reports each band and where the town landed, with record ids where a record exists.

**Files.** data/research/gov/chamber-committee-appointment-2026.json, data/research/gov/local-ordinance-style-2026.json, data/research/gov/local-executive-introduction-2026.json, scripts/research/legislature-local-rules-check.ts, scripts/research/legislature-year.ts, src/core2/data/stopgaps.json

**Notes.** Split Oct 24, 2026 from research-legislature-sourced-parameters, after the merger's send-back of PR 5848 asked for a bounded item matching what a PR delivers. Delivered by PR #5862 on branch claude/dreamy-tesla-bgi3ui-legislature.
