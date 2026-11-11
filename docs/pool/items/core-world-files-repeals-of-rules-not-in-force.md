---
id: core-world-files-repeals-of-rules-not-in-force
title: "A town council files and passes ordinances that repeal rules not in force in the town"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: P1, Nov 11, 2026, found while building play-bill-compare-strikes-and-adds-the-same-sentence (#8868), at Fable B's word
lead: laws
standard: 2
model: opus
effort: medium
root: none
---

**What.** In Lino Lakes, Minnesota (bench seed `046d2235-27df-4daa-a680-423d6f24d0d7`, the world as Advanced builds it, run to February 4, 2025), the city council filed and enacted Ordinance 2025-1, whose section 2 repeals "the rules now in force on highway money used for transit" (`shift-highway-funds-to-transit`, value -1), and Ordinance 2025-3, whose section 2 repeals "the rules now in force on limits on rent increases" (`rent-stabilization`, value -1). For both, the bill's own record gives the town's law in force as 0 (`billForm(api, bill).sections[1].before.value`), so each repeal repeals nothing, and a player reading the ordinance is told of rules the town never had. Seen: Politics, Bills, the ordinance's text and its Compare view (docs/seen/play-bill-compare-strikes-and-adds-the-same-sentence/compare-after-lino-lakes-mn.png on #8868).

**Cause.** Needs cause. Looked at: world-legislating.ts `needsChange(direction, now)` files a repeal only when `now === 1`. The state and federal filers pass it `answerIn(api, jurisdiction, question, true)`; where the town's filer gets `now` from was not read, and `inForceForTown` (same file) counts a rule in force at any level, the state's included, while the bill's section reads the town's own law (0). Whether the council is repealing a state-level rule as if it were the town's, or its filer reads no law at all, is not known.

**Fix.** None until the cause is found.

**Time box.** 2 hours to find the cause.

**Rules.** One rule, all 56 places: the check draws its places and names them with their seeds. No dice: a body files a change from its members' wants and the law in force, never by chance. An effect is a read: the filer reads the same law record the bill's section reads.

**Done when.** A second session, on main, runs a test that builds three worlds with buildBenchWorld, each in a drawn place named with its seed, runs each two weeks, and finds no local bill with a section that repeals a question whose law in force for that body is 0 (by bill record id), while a repeal still appears where a rule is in force.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts (`needsChange`, the town's filer, `inForceForTown`)
