---
id: core-world-files-repeals-of-rules-not-in-force
title: "A town council or county board passes ordinances that repeal rules it never made"
area: core
kind: bug
priority: 2
size: S
status: merged
claimed-by: claude/fable-b-traded-sections-need-a-law-to-change
pr: #9452
after:
blocked-on:
source: P1, Nov 11, 2026, found while building play-bill-compare-strikes-and-adds-the-same-sentence (#8868), at Fable B's word
lead: laws
standard: 2
model: opus
effort: medium
root: none
merged-at: 2026-11-16T01:35:38.104Z
---

**What.** In Lino Lakes, Minnesota (bench seed `046d2235-27df-4daa-a680-423d6f24d0d7`, the world as Advanced builds it, run to February 4, 2025), the city council filed and enacted Ordinance 2025-1, whose section 2 repeals "the rules now in force on highway money used for transit" (`shift-highway-funds-to-transit`, value -1), and Ordinance 2025-3, whose section 2 repeals "the rules now in force on limits on rent increases" (`rent-stabilization`, value -1). For both, the bill's own record gives the town's law in force as 0 (`billForm(api, bill).sections[1].before.value`), so each repeal repeals nothing, and a player reading the ordinance is told of rules the town never had. Seen: Politics, Bills, the ordinance's text and its Compare view (docs/seen/play-bill-compare-strikes-and-adds-the-same-sentence/compare-after-lino-lakes-mn.png on #8868).

**Cause.** Found in code: the repeal section comes from a trade, not from the filer. `ownSections` (src/core2/modules/legislature.ts) lists what a member would add to a bill: the holdout's section in a trade for their vote, and the poison pill. It took every policy question the member has a stance on and wrote `value: Math.sign(stance)`, so a member against a policy got a repeal section. Its only check against the law was `questionSettled` (src/core2/modules/laws.ts), which returns null when the body has no row of its own on the question. So a repeal was offered where the body never had the rule. The filers had the right rule and the trade did not: the town's filer (src/core2/modules/world-legislating.ts) filed a repeal only where the body's own row stood and an enactment only where the question was not law for the town at any level. Measured again on the train at 32a994212b, in the world a new game builds: Kickapoo Site 1, Kansas (place 2036735, seed 0cf71112d131311a0b418c26f0033c8fe15db50f63a33e4809aba42621e331ab) held one such section by March 10, 2025, and Lino Lakes held three by February 10 (bills `…board:2024-12-30:person_1c61dbfdf92d6da2:4`, `…council:2025-01-06:person_114239c8f9c3c8ea:9`, `…board:2025-01-13:person_1c61dbfdf92d6da2:14`).

**Fix.** One rule, read by the filers and by the trade.

1. `lawNeedsChange(api, level, jurisdiction, question, direction)` in src/core2/modules/laws.ts is the rule the three filers passed as `needsChange`: a state or Congress reads its own answer in force, its recorded starting answer counted; a town, county or township body enacts only what is not already law for the town at any level, and repeals only a rule of its own. `answerIn`, `ownRow` and `inForceForTown` move there with it.
2. The three filers and the two re-checks in world-legislating.ts call it. `ownSections` keeps a section only where it says the law needs the change.
3. The copies in world-legislating.ts are deleted (`needsChange`, `ownRow`, `inForceForTown`, `answerIn` and its federal answers reader), and the seven files that imported `answerIn` from there import it from laws.
4. src/core2/traded-sections-need-a-law.test.ts is pinned to the two places above.

**Time box.** 3 hours. If the trade stops producing any section in the pinned places, stop and write what was seen in Notes.

**Rules.** One rule, all 56 places: the check draws its places and names them with their seeds. No dice: a body files a change from its members' wants and the law in force, never by chance. An effect is a read: the filer reads the same law record the bill's section reads.

**Done when.** A second session, on the train or on main once it is there, starts the bench at Lino Lakes, Minnesota with seed 046d2235-27df-4daa-a680-423d6f24d0d7 (or a place it draws and writes down with its seed), plays to the council's or county board's second meeting, opens Politics, Bills and reads every ordinance with more than one section: no section says it repeals the rules now in force on a question unless Politics, Laws shows that body's own rule on it, and at least one ordinance still carries a second section a member won in a trade. The test src/core2/traded-sections-need-a-law.test.ts passes at both named places and fails at both with the new check taken out of `ownSections`.

**Waits on.** Nothing.

**Files.** src/core2/modules/laws.ts (`lawNeedsChange`, `answerIn`); src/core2/modules/legislature.ts (`ownSections`); src/core2/modules/world-legislating.ts (the three filers); src/core2/traded-sections-need-a-law.test.ts

**Notes.** Cause found and built by Fable B, Nov 15, 2026, on a branch from the Account lead's train. O3 reached the same cause on Nov 11 and proposed changing `questionSettled` to call a repeal with no row settled; that was not built, because `enact` reads `questionSettled` too and a state's repeal of a starting answer that is not a row would then write no law.
