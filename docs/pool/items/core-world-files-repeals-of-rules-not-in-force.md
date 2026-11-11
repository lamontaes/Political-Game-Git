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

**Cause.** Found in code: read by opus-5251 on main 6e585134a6, Nov 11. The repeal sections are not members' filings. They are sections added on the floor or in committee, a trade amendment or a poison pill, and the check those amendments read counts "no law" as open for a repeal.

1. The members' own filings are right. `fileChanges` (src/core2/modules/world-legislating.ts, line 547) asks the council's `needsChange` (line 2042, the repeal arm at line 2045), which files a repeal only where the town's own latest row is on: `ownRow(api, jurisdiction, question) === 1`. A filed bill has one section (`holdSession`, line 835, drafts `provisions: [one]`).
2. Section 2 comes from `ownSections` (src/core2/modules/legislature.ts, line 4474). A holdout's trade section (line 4690) or an opponent's pill (line 4726) is a question the member holds a stance on, kept only where `!questionSettled(api, makes, q, stance)` (line 4508). It is signed by the member's stance, so a member against a rule gets value -1, a repeal.
3. `questionSettled` (src/core2/modules/laws.ts, line 835) returns null, meaning "not settled, the section would change the law", when the jurisdiction has no law row on the question: `if (!latest) return null;` (line 853). For an enact that is right. For a repeal it is wrong: with no row, nothing is in force, and the repeal restates that. So a council member against rent stabilization in a town that never had it is given a repeal of it, and the section survives to enactment.
4. The same null lets it through twice more. `mootAtFloor` (world-legislating.ts, line 954) does not call such a bill moot. At enactment (legislature.ts, line 6190) the section is not recorded as a repeat, and `enactLaw` writes a new row with value 0 for a rule that never stood.

**Fix.**

1. In `questionSettled`, treat no row as "not in force". With no row and `value <= 0`, return `{ lawId: null, why: "restates-in-force" }`. Make `SettledQuestion.lawId` `string | null` ("no row: the starting answer, nothing in force") and let `BillRow.repeats` carry it. With no row and `value > 0`, it stays null, as now.
2. Nothing else changes. `ownSections` then offers no repeal of an absent rule, `mootAtFloor` calls a bill moot when that is its only section, and enactment lists such a section as a repeat instead of writing a 0 row. Every caller reads the one check (one rule for both the members' filings and the amendments).
3. Readers of `repeats[].lawId` (the bill paper and dev mode's bill card) say "no such rule in force" where it is null, through the bill paper's existing wording for a repeated section. List the lines it needs; the words are the Story session's.

**Time box.** 2 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the check draws its places and names them with their seeds. No dice: a body files a change from its members' wants and the law in force, never by chance. An effect is a read: the filer reads the same law record the bill's section reads.

**Done when.** A test in src/core2/modules runs in ten drawn places from all 56 and names each drawn place with its seed. It builds each world with `buildBenchWorld` (two-level) and runs it ninety days. It counts every enacted or pending local bill section that repeals a question whose law in force for that body was off before the bill (`questionSettled` with the bill excepted): zero, naming every bill record id it checked. In the same run, at least one repeal of a rule that was in force still appears, or the test names the places it passed over looking for one. A second session reads Lino Lakes, Minnesota (bench seed 046d2235-27df-4daa-a680-423d6f24d0d7, run to February 4, 2025): Ordinances 2025-1 and 2025-3 carry no section repealing a rule the town does not have.

**Waits on.** Nothing.

**Files.** src/core2/modules/laws.ts (`questionSettled`, `SettledQuestion`), src/core2/modules/legislature.ts (`ownSections`, the enactment's `repeats`), src/core2/modules/world-legislating.ts (`mootAtFloor`), src/core2/modules/repeal-of-nothing.test.ts (new)
