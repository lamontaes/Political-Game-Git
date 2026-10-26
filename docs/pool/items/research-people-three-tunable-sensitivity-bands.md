---
id: research-people-three-tunable-sensitivity-bands
title: "Record assumed sensitivity bands for three unchanged people-model tunables"
area: core
kind: research
priority: 2
size: S
status: in-pr
claimed-by:
pr: #5466
blocked-on:
source: added with npm run pool -- add
---

**What.** The corrected spread-only slice of the October19 research records three assumed sensitivity bands for driveWeight, companyHorizonDays and appraisalRelationshipWeight. Their current values, tunable tags and open stopgap identities are unchanged, and the citations distinguish contextual research from an empirically fitted bound. This bounded metadata slice does not complete the research umbrella or claim any whole-life calibration or gameplay change.

**Rules.** Estimate, never UNKNOWN: label every unmeasured coefficient range honestly as an assumption, preserve the open stopgap and calibration work, and never present a model sensitivity band as a published interval.

**Done when.** Only the three named spread metadata rows change; the full numeric-value projection, tags and stopgap IDs are identical to current main, each band contains its retained value, and all three stopgaps stay open. The tripwires test and changed-file checks pass, the body maps this bounded evidence, and research-stopgaps-oct19-apply stays open for the remaining calibration and research rows.

**Files.** src/core2/data/parameters.json, docs/release/changes/research-stopgaps-oct19-apply-spreads.md

**Notes.** Bounded completion target for PR #5466 after its corrected metadata/table commit; branch claude/apply-stopgaps-a. Merger2 narrows final scope to three remaining rows after main already carries the other two; no runtime value or completed empirical calibration is claimed.
