---
id: core-stopgap-opening-outside-market-outside-demand
title: "Stopgaps in opening-outside-market (outside-demand): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5297
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/opening-outside-market.ts, kind outside-demand"
claimed-at:
---

**What.** Replace or clear the 1 open outside-demand stopgap row(s) in src/core2/opening-outside-market.ts: SG-CORE-outside-market. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/opening-outside-market.ts

**Notes.** First row: Buyers outside the town are one account per place paying each firm a fixed weekly share of its projected receipts (adjusted with its demand), not individual outside customers, freight orders, Medicaid claims or guests.
