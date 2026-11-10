---
id: gov-treasury-diversion-part-1-the-act-and-its-money
title: "An official who has a reason can move a budget line's money quietly, and every dollar is on the books"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: split from gov-treasury-diversion by Fable after the owner's Nov 10 ruling
checked: fable 2026-11-10
---

**What.** An official the player is not weighs, at each month's close of their own government, asking the body to amend the budget, moving the money quietly, or leaving things as they are. They weigh it from who they are, how likely they think they are to be found out, and need, through the one chooser. A quiet move is a row of a new kind in the crimes table that exists, with its money on the journal and on the lines. This is part 1 of gov-treasury-diversion. Read docs/design/treasury-diversion.md first; this part builds its sections "The act", "Why an official does it" and "When they are asked", and nothing of who finds out. Seen: the town budget screen's line paid less than its budget, and the scandal that follows.

**Cause.** Design: docs/design/treasury-diversion.md, written from the owner's Nov 10, 2026 rulings in docs/coordination/OWNER-DECISIONS.md: "Yes, keep it" (an official can move budget money outside the law, found out the way bribery is); "Some people just commit crimes. You know, personalities. Or maybe they think they can get away with it"; and "there shouldn't be a bribe system and an embezzlement system. It should be a crime system". In code today, `CrimeRecord` in src/core2/modules/corruption.ts (line 62) has only kind `bribe`, `decide` (line 107) takes only the roles offer, take and tell, and nothing but a lawful measure moves a line (`amendBudget`, src/core2/modules/budgets.ts line 2105).

**Fix.** In src/core2/modules/corruption.ts add kind `diversion` to the crimes table's record (official, government, line the money left, destination, amount, reasons) and a role `divert` to `decide`, offered as three options through the one chooser: ask the body, move it quietly, leave it. Add no second table and no second chooser. Ask only an official who controls the lines of a government in the player's own place's chain (the town, the county, the state), once at each month's close of that government (`closeTreasuries`, src/core2/budgets-treasury.ts line 1122), so it is a handful of decisions a month. The values weighed are the three reasons the design names, each a sliding share: temperament (the trait term `decide` already keeps; give the decision `corruption.divert` its own weight row, `traitWeightCorruptionDivert`, beside `traitWeightCorruptionTake` in src/core2/data/parameters.json (line 6002), and list it in data/content/trait-coverage.json as `corruption.take` is); perceived risk, read only from what the official knows (months since the government's last audit row and whether it reported anything, once part 3 writes audits; their own or a known colleague's diversions that stand unreported, from `crimesKnownTo`; the line's share of the budget and whether a department head holds it; how many people keep or read the books; a scandal reported in this government, from `scandalsOf`); and need (`pressure`, line 175, for the household, and for a line they care about, by their recorded stance or promise, its shortfall against another line's room). Until part 3 exists the audit terms read as no audit on record. The weights are TUNABLE rows in src/core2/data/corruption/parameters.json under one registered stopgap in src/core2/data/stopgaps/gov.json. A move to another line calls `amendBudget` with the crime's id as the measure id. A move to the official's own money is a journal transfer from the government's account under a new source kind `corruption:diversion`, counted against the line the way `chargeLine` (line 536) counts a payment. The official and the person on the government's payroll who keeps its books (`localClerkFor` in src/core2/modules/candidacy.ts, or the finance post where the records name one) each get a private knowledge record with `api.observe`, as both parties to a bribe do. Choosing "ask the body" files a budget amendment bill through `proposeAsExecutive` (src/core2/modules/legislature.ts line 3431). Skip anyone `isPlayerSeat` is true for: part 4 gives the player the choice. Do not reuse the old branch claude/gov-treasury-diversion (pull request #4587, sent back eight times): build from main.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** This is a game (owner, Nov 10: "it has to perform like a game"): a handful of decisions a month for the governments the player lives under, never a loop over every official in the country. One crime system (owner, Nov 10): a kind in the one crimes table, the one chooser, no second path. No dice: nobody diverts on a roll or a monthly chance; the choice is the chooser's, from traits, what the official knows and need. Sliding scales and causes: no cutoff decides it. Wire to the world: the shorted line's payees are paid less the same month, through the engines that already pay from the line. An effect is a read, not a record: parts 2, 3 and 5 read the crime record, and until they merge this part's reader is the treasury close and the lines' payers. One rule, all 56 places. Every weight is a registered TUNABLE row. Follow .agents/skills/played-world-proof/SKILL.md.

**Done when.** A second session, on main in a drawn place (place and seed named), finds in a played world (`buildBenchWorld`, four years) every official who was asked, each with all three options scored and the three reasons kept by record id, and reports how many chose each option beside the count of officials asked. Using dev mode to pick the quiet move for one official, it sees the money leave the named line and arrive at the other line or the official's cash by journal record id, the shorted line's next payments smaller by that amount, the official's next month's decision carrying the unreported move in its perceived risk, and the Trace reaching the crime record and its two knowledge records. A test in src/core2 names the place, the seed and the record ids, fails when the money does not balance to the dollar, and never passes without a diversion to check. A year's run is no more than 20 percent slower than its base on `npm run speed:year`.

**Waits on.** Nothing.

**Files.** src/core2/modules/corruption.ts, src/core2/data/corruption/parameters.json, src/core2/data/stopgaps/gov.json, src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/modules/executive.ts, src/core2/modules/legislature.ts, src/core2/treasury-diversion.test.ts (new), docs/design/treasury-diversion.md
