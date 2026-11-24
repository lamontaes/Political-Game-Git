---
id: laws-state-death-tax-reads-federal-rate
title: "A state with no estate or inheritance tax reads the federal 40 percent as its own"
area: laws
kind: bug
priority: 1
size: S
status: merged
claimed-by: bargaining thread (brief O)
pr: 9356
after:
blocked-on:
source: Found by the bargaining thread (brief O) staging amount bills (#9310), Nov 14 2026
lead: laws-effects
standard: 2
model: opus
effort: medium
root: none
---

**What.** `billValueInForce` gives a state with no estate tax row the federal estate tax rate, 40 percent, as the state's own amount in force. Estate and inheritance taxes were not in `LAW_SERIES`, so they took the "single" doctrine, where the last governing level's row wins and the federal row is the only one. A state bill that creates a 16 percent estate tax therefore weighed as a cut from 40, members read it on the wrong side of their views, and in Iowa (1926400), seed cost1, the amount-bill filer filed it. Seen: the bill paper's "struck and inserted" estate tax rate and every member's vote on a state estate or inheritance tax bill.

**Cause.** Found in code: src/core2/laws-in-force.ts `LAW_SERIES` lists income, sales and corporate income taxes as additive but not estate and inheritance taxes, and `billValueInForce` in src/core2/laws-bill-values.ts takes the governing federal row for a "single" series when the state has none.

**Fix.** Estate and inheritance taxes are additive, like the other taxes owed at each level: a state's own rate is its own row, or nothing (0) when it has none. The federal estate tax stays at its own level (26 U.S.C. 2001).

**Time box.** 1 hour.

**Rules.** One rule, all 56 places: the doctrine is per series, never per state. Pinned tests: a named place and seed.

**Done when.** `src/core2/state-death-tax-own-level.test.ts` passes at Nathrop CO, seed 612deadbcae7ad23: Colorado's estate and inheritance taxes in force are 0 with no record, the federal estate tax is still 40, and a 16 percent state estate tax bill raises it. It fails with the fix taken out (40, not 0). A second session then opens a state estate tax bill in a drawn state with no estate tax of its own choosing in the running game, and sees the bill paper strike nothing and insert the new rate.

**Waits on.** Nothing.

**Files.** src/core2/laws-in-force.ts, src/core2/state-death-tax-own-level.test.ts (new)
