---
id: bench-reached-law-by-bill-id
title: "The golden path's law steps match a law to the bill that made it by id, not by its number"
area: play
kind: bug
priority: 2
size: S
status: claimed
claimed-by: governing/reached-law-by-bill-id
pr:
blocked-on:
lead: governing
source: review of gov-record-vote-per-question, Nov 1
claimed-at: 2026-11-01T18:07:27.395Z
---

**What.** src/bench/reached.ts decides steps 9 to 11 of the golden path by matching a law that took effect to a bill with lawId.endsWith(':' + bill number). Two bodies number their first bill of a year alike (a council's 2025-1 and the county board's 2025-1), so each matches the other's law, and step 10's press and step 11's ballot can be credited to the wrong bill. The law row already carries the bill that enacted it (terms.enactedByBill, legislature.ts), so the match should read it.

**Rules.** One engine per fact: the law row's enactedByBill is the record of which bill made a law; the bench reads it, never a second key built from the number. One rule, all 56 places: nothing names a place.

**Done when.** reached.ts matches every law to its bill by the law row's terms.enactedByBill for steps 9, 10 and 11; step-9-is-a-read.test.ts shows a law of another bill with the same number is not credited; path-check in a drawn place with its seed printed reaches the same steps as before where no number repeats; the lane reviews the PR.

**Files.** src/bench/reached.ts, tests/golden-path/step-9-is-a-read.test.ts

**Notes.** Split from gov-record-vote-per-question (#7013) at the lane's request (Nov 1, 17:57). The fix was written and reviewed there; it moves here unchanged.
