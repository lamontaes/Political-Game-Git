---
id: core-stopgap-opening-private-tuition-aggregate-spending
title: "Stopgaps in opening-private-tuition (aggregate-spending): 1 open"
area: core
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/fs11vb-private-tuition
pr: #5294
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/opening-private-tuition.ts, kind aggregate-spending"
claimed-at: 2026-10-20T03:37:02.834Z
---

**What.** Replace or clear the 1 open aggregate-spending stopgap row(s) in src/core2/opening-private-tuition.ts: SG-CORE-private-tuition-average. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/opening-private-tuition.ts

**Notes.** First row: Each household with school-age children pays its children's share of the town's private tuition (the national private share times the average tuition) to the town's private school; no family chooses a school, and no chil

Oct 20 (claude, claude/fs11vb-private-tuition): read and released, not built. `withPrivateTuition` (src/core2/opening-private-tuition.ts, 134 lines) runs once on the opening input: it ranks each town's families with children aged 5 to 17 by cash per child, takes the best-off until the NCES private share is reached, and writes one monthly finance contract per enrolled family (`opening-private-tuition:<household>:<school>`, payer the family's adults, payee the school). Nothing revisits it, so a family whose means change keeps or never gets a seat. Replacing it needs (1) a yearly pass (each August) that re-ranks the town's families on their current cash per child, and ends and creates those contracts through the finance engine; (2) a rule that reads the family's views and the schools nearby, which needs the schools engine decision named in the row's replacement, and an answer under DECISION-REGISTER.md on whether belief should enter at all; and (3) the same rule for counted families, who have no such contract. That is the schools engine, an L item, and should be split before it is claimed again.
