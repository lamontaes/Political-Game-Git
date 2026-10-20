---
id: research-stopgaps-oct19-apply
title: "Apply the Oct 19 stopgap research: 112 rows have sourced values or estimates with spreads"
area: core
kind: stopgap
priority: 2
size: L
status: claimed
claimed-by: claude/apply-stopgap-research
pr:
blocked-on:
source: "data/research/stopgaps-oct19/README.md"
claimed-at: 2026-10-20T03:33:04.306Z
---

**What.** `data/research/stopgaps-oct19/` holds a researched value, spread, sources and a one-line builder note for each of 112 open stopgap rows. Apply them: move each value into the game's data or code, resolve the stopgap row with the source, and keep low-confidence rows labeled as estimates with their spread. Split by file (A to E) so several builders can take a part each.

**Rules.** One rule, all 56 places; estimate, never unknown; estimate labels show only in developer mode; never copy a publisher's table whole; AGENTS.md rules.

**Done when.** Every row in the five files and the census folder is applied to the game's data or code or carries a written reason it cannot be yet, each applied value is read by a test in a drawn place, and the stopgaps report shows those rows resolved with their sources.

**Files.** data/research/stopgaps-oct19/, src/core2/data/stopgaps.json

**Notes.** The rows still blocked on the Census API key are named in the README.

Applied Oct 20 (claude, PR for SG-GOV-statewide-parties-unverified, C-government-law): 49 rows verified against Ballotpedia lose their `estimated` flag; corrections: MP lieutenant governor Independent -> Republican, CA / WA / ND superintendents (nonpartisan offices) party -> none, GA public service commission kept Republican as the 3R-2D majority with the note. Still estimated (11 rows: AZ and NJ lieutenant governor, HI OHA, VI boards, MP attorney general, others the research marked low). Note: claude/apply-stopgap-research also claimed this item; rows applied so far are in #5461, #5465, #5466 and this PR, so check those before taking a row.
