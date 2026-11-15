---
id: tests-laws-death-taxes-kentucky-marker-of-a-resolved-stopgap
title: "laws-death-taxes fails at Kentucky: it expects a hit on a stopgap that was resolved, and a resolved stopgap records none"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: Found by the bargaining thread (brief O) running changed tests for PR 9356 and PR 9310 on train e24cb825, Nov 15 2026; the same red on the clean train and with the estate fix taken out
lead: laws-effects
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** src/core2/laws-death-taxes.test.ts, "a state that adopts a death tax by setting only a rate taxes the whole amount at that rate", fails with `US-KY: expected false to be true` (GOLDEN_PATH_SEED=612deadbcae7ad23). The amounts are right: a government heir in Kentucky pays 0. The failing line expects the government-heir estimate to be recorded as a stopgap hit, and nothing is recorded. The adopting-state check further down expects the same hit and would fail the same way. It fails on the clean train e24cb825 and with PR 9356's estate change taken out. Guards: the inheritance tax a government heir pays, which the estates engine reads when an estate escheats.

**Cause.** Found in code: `SG-LAW-government-heir-exempt-assumed` in src/core2/data/stopgaps/law.json was set `status: resolved` on Nov 10 by the stand-in triage (#8934; replacement reads "Dropped Nov 10, 2026 (too in depth, owner): the estimate stays as the game's answer"). `stopgap()` in src/core2/stopgaps.ts line 39 records a hit only for an open row, so the marker at src/core2/laws-death-taxes.ts lines 180 to 183 no longer records anything. The test still asserts the hit (lines 178 to 187 and 191 to 197).

**Fix.** Finish the resolution the triage started (skill remove-a-stopgap: a resolved row has no marker left). Delete the `api.stopgap("SG-LAW-government-heir-exempt-assumed")` call and its marker comment, keeping the zero amount it guards. Delete the test's two stopgap-hit assertions and the `marked` setup that serves only them. Keep every amount assertion, and state the old premise (the estimate was a marked stopgap) in the pull request for the lead's yes, since this removes assertions.

**Time box.** 1 hour.

**Rules.** Pinned tests: assertions come out only with the old premise stated and the lead's yes in the pull request. Remove a stopgap: the resolved row and its marker in the code go together, never one without the other. One rule, all 56 places: the government-heir answer is read from each state's row, never from a named state.

**Done when.** A second session runs src/core2/laws-death-taxes.test.ts at seed 612deadbcae7ad23 and it passes. In the running game, dev mode shows an estate that escheats to the state in a drawn inheritance-tax state paying no inheritance tax, with no developer banner for the dropped stopgap.

**Waits on.** Nothing.

**Files.** src/core2/laws-death-taxes.ts, src/core2/laws-death-taxes.test.ts

**Notes.**
