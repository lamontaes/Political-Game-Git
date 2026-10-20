---
id: elections-stopgap-campaigns-missing-data
title: "Stopgaps in campaigns (missing-data): 3 open"
area: elections
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (The region's or state's real polling firms (County Business Patterns NAICS 541910 by county) as recorded organizations a campaign buys from....)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/campaigns.ts, kind missing-data"
---

**What.** Replace or clear the 3 open missing-data stopgap row(s) in src/core2/modules/campaigns.ts: SG-GOV-campaign-pollster-seller, SG-GOV-campaign-mail-seller, SG-GOV-campaign-venue-seller. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/campaigns.ts

**Notes.** First row: Where the town records no professional-services business (NAICS 5419 includes public opinion polling), a campaign's poll interviews are paid to a stand-in pollster organization in town.
