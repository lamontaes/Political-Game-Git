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

**Cause.** Found in code: the repeal section comes from a trade, not from the filer. `ownSections` (src/core2/modules/legislature.ts, line 4474) lists what a member would add to a bill: the holdout's section in a trade for their vote (line 4686) and the poison pill (line 4718). It takes every policy question the member has a stance on and writes `value: Math.sign(stance)`, so a member against a policy gets a repeal section. Its only check against the law is `questionSettled` (src/core2/modules/laws.ts, line 835), which returns null when the body has no row of its own on the question. So a repeal is offered where the town never had the rule. The filer has the right rule and the trade does not: the town's filer (src/core2/modules/world-legislating.ts, line 2042) files a repeal only when `ownRow(...) === 1` and an enactment only when `!inForceForTown(...)`, and `needsChange` (line 321) says "Nothing to undo where no law stands". The section's `before.value` of 0 is `billValueInForce` (src/core2/laws-bill-values.ts, line 36) finding no row. The same gap lets a member trade for a "yes" section on a rule the state already made law for the town.

**Fix.** One rule, read by the filers and by the trade.

1. In src/core2/modules/world-legislating.ts, make one function from what the three filers pass as `needsChange`: for a body and a question and a direction, a repeal needs the body's own answer in force to be yes, and an enactment needs the question not to be law for the body already (a town: at no level of its chain, as `inForceForTown` reads it; a state or the federal government: its own answer, the recorded starting answer counted, as `answerIn` reads it). The three filers call it.
2. `ownSections` keeps a section only where that function says the law needs the change. legislature.ts cannot import world-legislating.ts (the import runs the other way), so the function reaches it the way the budget hearing does: registered from the world-legislating module's open function, read in `ownSections`. A body with no function registered offers no section.
3. Delete the copies the one function replaces (`needsChange`, and the two inline rules at lines 1266 and 2042), and count them in the pull request body.
4. Add the test the Done when names to src/core2/modules/world-legislating.test.ts or a new file beside it, with drawn places (skill drawn-place-tests).

**Time box.** 3 hours. If the trade stops producing any section in three drawn places, stop and write what was seen in Notes.

**Rules.** One rule, all 56 places: the check draws its places and names them with their seeds. No dice: a body files a change from its members' wants and the law in force, never by chance. An effect is a read: the filer reads the same law record the bill's section reads.

**Done when.** A second session, on main, runs a test that builds three worlds with buildBenchWorld, each in a drawn place named with its seed, runs each two weeks, and finds no local bill with a section, sections added in a trade included, that repeals a question whose law in force for that body is 0 (by bill record id), while a repeal still appears where a rule is in force.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts (`needsChange`, the town's filer, `inForceForTown`); src/core2/modules/legislature.ts (`ownSections`); src/core2/modules/laws.ts (`questionSettled`, read only)
