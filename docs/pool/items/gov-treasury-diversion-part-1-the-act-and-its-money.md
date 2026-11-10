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

**What.** An official the player is not, with a recorded reason, chooses among asking the body to amend the budget, moving the money quietly, or leaving it. A quiet move is a crime record of a new kind in the corruption engine, with its money on the journal and on the lines. This is part 1 of gov-treasury-diversion. Read docs/design/treasury-diversion.md first; this part builds its sections "The act" and "When an official considers it", and nothing of who finds out.

**Cause.** Design: docs/design/treasury-diversion.md, written from the owner's Nov 10, 2026 ruling in docs/coordination/OWNER-DECISIONS.md ("Yes, keep it": an official can move money from one budget line to another outside the law, found out the way bribery is, through audits, the press or complaints). In code today, `CrimeRecord` in src/core2/modules/corruption.ts (line 62) has only kind `bribe`, `decide` (line 107) takes only the roles offer, take and tell, and nothing but a lawful measure moves a line (`amendBudget`, src/core2/modules/budgets.ts line 2105).

**Fix.** In src/core2/modules/corruption.ts add kind `diversion` to the crimes table's record (official, government, line the money left, destination, amount, reasons) and a role `divert` to `decide`, offered as three options through the one chooser: ask the body, move it quietly, leave it. Ask only an official of a government in the player's own place's chain (the town, the county, the state), and only on a cause: at a month's close (`closeTreasuries`, src/core2/budgets-treasury.ts line 1122) a line of their government cannot cover what it owes while another has room, or the event `credit.payment-missed` or `housing.eviction` is recorded for the official's household. The values weighed are the ones the design names (the shortfall, the room on the other line, the strength of the official's recorded stance or promise for the short line, `pressure` at line 175 for the household case, and how many people keep or read the books), each a sliding share, with weights as TUNABLE rows in src/core2/data/corruption/parameters.json under one registered stopgap in src/core2/data/stopgaps/gov.json. A move to another line calls `amendBudget` with the crime's id as the measure id. A move to the official's own money is a journal transfer from the government's account under a new source kind `corruption:diversion`, counted against the line the way `chargeLine` (line 536) counts a payment. The official and the person on the government's payroll who keeps its books (`localClerkFor` in src/core2/modules/candidacy.ts, or the finance post where the records name one) each get a private knowledge record with `api.observe`, as both parties to a bribe do. Choosing "ask the body" files a budget amendment bill through `proposeAsExecutive` (src/core2/modules/legislature.ts line 3431). Skip anyone `isPlayerSeat` is true for: part 4 gives the player the choice. Do not reuse the old branch claude/gov-treasury-diversion (pull request #4587, sent back eight times): build from main.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: nobody diverts on a roll or a monthly chance; the cause is a record and the choice is the chooser's. Sliding scales and causes: no cutoff decides it. Wire to the world: the shorted line's payees are paid less the same month, through the engines that already pay from the line. An effect is a read, not a record: parts 2 and 3 read the crime record, and until they merge this part's reader is the treasury close and the lines' payers. One rule, all 56 places. One model, two tiers. Every weight is a registered TUNABLE row. Follow .agents/skills/played-world-proof/SKILL.md.

**Done when.** A second session, on main in a drawn place (place and seed named), finds in a played world (`buildBenchWorld`, up to four years, drawing another place if no cause arises) at least one official who was asked, with all three options scored and the reasons kept, by record id. Using dev mode to pick the quiet move for one official, it sees the money leave the named line and arrive at the other line or the official's cash by journal record id, the shorted line's next payments smaller by that amount, and the Trace reaching the crime record, its cause and its two knowledge records. A test in src/core2 names the place, the seed and the record ids, fails when the money does not balance to the dollar, and never passes without a diversion to check.

**Waits on.** Nothing.

**Files.** src/core2/modules/corruption.ts, src/core2/data/corruption/parameters.json, src/core2/data/stopgaps/gov.json, src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/modules/executive.ts, src/core2/modules/legislature.ts, src/core2/treasury-diversion.test.ts (new), docs/design/treasury-diversion.md
