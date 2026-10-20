---
id: research-stopgaps-oct19-apply
title: "Apply the Oct 19 stopgap research: 112 rows have sourced values or estimates with spreads"
area: core
kind: stopgap
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: "data/research/stopgaps-oct19/README.md"
claimed-at:
---

**What.** `data/research/stopgaps-oct19/` holds a researched value, spread, sources and a one-line builder note for each of 112 open stopgap rows. Apply them: move each value into the game's data or code, resolve the stopgap row with the source, and keep low-confidence rows labeled as estimates with their spread. Split by file (A to E) so several builders can take a part each.

**Rules.** One rule, all 56 places; estimate, never unknown; estimate labels show only in developer mode; never copy a publisher's table whole; AGENTS.md rules.

**Done when.** Every row in the five files is applied or carries a written reason it can't be yet, and the stopgaps report shows them resolved.

**Files.** data/research/stopgaps-oct19/, src/core2/data/stopgaps.json

**Notes.** The rows still blocked on the Census API key are named in the README.

Applied Oct 20 (claude, third PR, A-people-behavior-1): recorded the researched spreads (value unchanged, tag TUNABLE, stopgap rows still open) for driveWeight (0.6 to 1.2), companyHorizonDays (7 to 30), appraisalRelationshipWeight (0.5 to 1), appraisalDistressTraitWeight and appraisalBroodingTraitWeight (0.25 to 0.75), each with the research basis and the sources that were fetched vs only cited. Not applied: rows that move a value (stressHalfLifeDays 3, goalWeight 0.8, traitWeight 0.6 against the owner's Oct 14 equal-weight ruling, emotionWeight 0.35, effortWeight 0.3, restEffect 0.08, careEffect 0.04) because each is low confidence and moves the whole-life ATUS check; they need a run of the P9 whole-life check before and after.
