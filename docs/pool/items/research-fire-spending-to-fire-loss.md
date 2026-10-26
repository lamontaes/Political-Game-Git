---
id: research-fire-spending-to-fire-loss
title: "Size the link from fire department spending or staffing to fire losses"
area: laws
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** budget-line:fire has no sized outcome-web link: it stays the stopgap SG-LAW-outcome-link-unresearched. The justice helper's Oct 24 search found Challands 2010 (New Zealand Fire Service, about US 2,400 dollars of loss per extra minute of response, seen only through a news report) and a 2023 Liberty University dissertation calling the staffing and fire-loss link questionable, but no estimate from spending or staffing to loss, and the web keeps no fire-loss measure.

**Rules.** Research before building: sources fetched and quoted, a size with its spread, never deciding one fire. Estimate, never UNKNOWN.

**Done when.** data/research/outcome-web/links.json holds a sized link from the fire line (or fire staffing) to a measure the web keeps, with source, anchor quote and range, or a researched about-zero row; budget-line:fire leaves outcome-research-gaps.json; src/core2/outcome-web.test.ts passes.

**Files.** data/research/outcome-web/links.json, src/core2/data/laws/outcome-research-gaps.json

**Notes.** From the laws lead's justice helper, Oct 24.
