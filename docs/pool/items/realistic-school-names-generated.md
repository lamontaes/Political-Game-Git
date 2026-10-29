---
id: realistic-school-names-generated
title: "The opening's schools are generated, not the real NCES roster"
area: core
kind: feature
priority: 2
size: S
status: done
claimed-by: claude/wire-school-names
pr: #6664
blocked-on:
lead: m0-m2
source: owner, Oct 27, 5:40 PM Eastern ("realistic not real"); docs/reports/real-statistics-in-play-2026-10-27.md
claimed-at: 2026-10-28T16:18:13.165Z
---

**What.** Row 37 of docs/reports/real-statistics-in-play-2026-10-27.md: the opening's school names, grades and enrollments are the real NCES roster (src/core2/deep-past.ts:351), and the Journal names them. The old core already generates names from shape counts (src/simulation/school-names.ts). The owner ruled on Oct 27 that every non-law statistic starts realistic, not real, and differs in every world from the moment Start is pressed.

**Rules.** Estimate, never UNKNOWN: Schools are generated from the place's records with enrollments drawn around the published ones; no real school's name ships. One rule, all 56 places: the draw and its spread come from data, never a named state, city or GEOID in logic.

**Done when.** In a played world on a drawn place and seed, no opening school name equals an NCES name, and the Journal names a generated school by record id.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/deep-past.ts, src/core2/data/opening-schools.json

**Notes.** Filed by the realistic-not-real audit of Oct 27.

Oct 29 (CTO): set done; PR #6664 merged (the done flip failed while branch protection refused the flip job's push).
