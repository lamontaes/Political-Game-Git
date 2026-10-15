---
id: core-year-over-120s
title: "A town year runs over 120 seconds in some places (Garden City ID 131 s, Exeter NH 146 s)"
area: core
kind: bug
priority: 1
status: claimed
claimed-by: pool/core-year-over-120s
pr:
blocked-on:
milestone:
source: "known bugs"
---

**What.** Speed guard: a town's game year must run under two minutes. Profile and fix the hot scan (index, or act on the day something changed).

**Rules.** Speed; never scan the whole world daily.

**Done when.** Both places under 120 s, one process at a time on the same machine.

**Files.** src/core2/ (profile)

**Notes.** None.

Measured Oct 15 (this container is slower than the machine of record, so read ratios, not seconds). Each place, one process at a time, same seed, base against branch: Exeter, New Hampshire 224.5 s to 159.9 s (-28.8%); Garden City, Idaho 161.0 s to 124.7 s (-22.5%). Two causes: the monthly price settlement posted one cash entry per counted household per rule and scanned every organization for each (now one entry per counted group, one scan per place), and the cash journal ran its debugging re-checks in play (now only with bookkeeping on). The proof year balances in Garden City. The 120-second target is not shown in absolute seconds here; Session D's machine must confirm (131.1 s and 146.1 s before, so the ratios predict about 101 s and 104 s).
