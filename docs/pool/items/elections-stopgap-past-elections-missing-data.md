---
id: elections-stopgap-past-elections-missing-data
title: "Stopgaps in past-elections (missing-data): 1 open"
area: elections
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5747
blocked-on: research data: the row's replacement needs sourced data (Each territory's certified 2024 delegate and governor returns (territorial election offices) as research data, read in place of the town's ballots....)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/past-elections.ts, kind missing-data"
claimed-at:
---

**What.** Replace or clear the 1 open missing-data stopgap row(s) in src/core2/past-elections.ts: SG-CORE-past-territory-ballots. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/past-elections.ts

**Notes.** First row: A territory's prior elections (its delegate and governor) count only the town's own ballots, since territories cast no presidential vote to scale from.

Sent back 2026-10-20 from PR #5747 (branch claude/territory-past-returns): data/research/elections/territory-returns-2024.json MP.governor records first-round votes and only the runoff total; past-elections.ts:149-166 then calls the largest first-round candidate the certified winner. The body labels Torres (5728) the winner, but the cited 2022 Northern Mariana Islands gubernatorial election page says Palacios won the runoff with 54.14% to Torres 45.86%. Record and use the deciding-round winner/share accurately, and distinguish first-round totals from winning returns in the claims. The pool done-when also requires the replacement to be read by another engine in a one-year played-world run by record id; the new test only builds the opening and the body reports no completed year. Supply that proof before resolving SG-CORE-past-territory-ballots.; finish on that branch, merge main into it first.
