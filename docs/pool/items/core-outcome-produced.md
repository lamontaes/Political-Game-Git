---
id: core-outcome-produced
title: "The web produces the outcomes its links point at"
area: core
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/outcome-produced
pr: #5083
blocked-on:
source: "split from core-stopgap-outcome-web-faked-mechanic (SG-WEB-outcome-drift), Oct 15"
claimed-at: 2026-10-19T18:27:17.606Z
---

**What.** 15 links wait because the web does not produce their target outcome (`outcome-not-produced`): property crime from police, youth gun deaths, low-wage jobs, rent from property tax, wages from corporate tax, undocumented and US-born employment, youth turnout, mortality 55 to 64, pretrial detention, evictions and federal incarceration. Add each as a kept outcome with its real starting level in the base file, so the link can move it and a screen, budget or view can read it. Each is a kept outcome like the 40 the web already holds.

**Rules.** An effect is a read, not a record: each outcome is read by views, budgets, news or a screen. Estimate, never UNKNOWN: each starts at its real recent level with a source.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) each added outcome has a starting level from the base file and moves after its cause changes, shown by the outcome's month record id and a reader's record id; the test in src/core2/outcome-web.test.ts lists the link as built.

**Files.** src/core2/outcome-web-model.ts, data/research/outcome-web/place-outcome-bases-2024.json, data/research/outcome-web/links.json

**Notes.** Split from core-stopgap-outcome-web-faked-mechanic. See also the draft in data/research/outcome-web/cloud-f-new-measure-bases-2024.draft.json.
