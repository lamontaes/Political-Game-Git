---
id: world-stopgap-business-books-authored-economic-crosswalk
title: "Stopgaps in business-books (authored-economic-crosswalk): 1 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: The current input preserves employer classifications but not firm legal form and all funding routes. Unknown classifications produce a gap; mods extend the mapping as data.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/business-books.json, kind authored-economic-crosswalk"
---

**What.** Replace or clear the 1 open authored-economic-crosswalk stopgap row(s) in src/core2/data/business-books.json: SG-P8-business-books-classification. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/business-books.json

**Notes.** First row: Existing authored workplace classifications mapped to corporate industry priors and explicit excluded institutional funding routes; no legal form, supplier relationship or budget is established.
