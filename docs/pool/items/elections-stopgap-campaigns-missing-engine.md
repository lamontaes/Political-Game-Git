---
id: elections-stopgap-campaigns-missing-engine
title: "Stopgaps in campaigns (missing-engine): 2 open"
area: elections
kind: stopgap
priority: 3
status: done
claimed-by: claude/ad-reach-outlets
pr: #4615
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/campaigns.ts, kind missing-engine"
claimed-at: 2026-10-16T04:47:07.685Z
---

**What.** Replace or clear the 2 open missing-engine stopgap row(s) in src/core2/modules/campaigns.ts: SG-GOV-views-stand-in, SG-GOV-ad-reach-media-habits. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/campaigns.ts

**Notes.** First row: Each person's stance on a policy question is their lean times the question's measured left-right axis. Where PEOPLE's views engine runs, the lean orders people by their own view (CES 2024 cell plus household); elsewhere,

**Split (Oct 16).** This item now covers SG-GOV-ad-reach-media-habits: ad time is bought from the press's town outlet and reaches its followers (test in `src/core2/campaign-ads.test.ts`). SG-GOV-views-stand-in moved to `elections-campaign-stances-from-views`, which keeps the row open.
