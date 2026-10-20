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

**Done when.** Every row in the five files is applied or carries a written reason it can't be yet, and the stopgaps report shows them resolved.

**Files.** data/research/stopgaps-oct19/, src/core2/data/stopgaps.json

**Notes.** The rows still blocked on the Census API key are named in the README.

Applied Oct 20 (claude, PR for SG-GOV-delegate-race-size): PR, GU, VI, MP delegate races sized from src/core2/data/elections/delegate-races-2024.json (votes cast and registered voters, EAVS 2024); AS has no two-party lean on record and stays unsized. Row kept open with revised text.
