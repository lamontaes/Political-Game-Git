---
id: gov-m3-05-player-signs-one-vetoes-another
title: "As mayor the player signs one bill and vetoes another from the desk, each with its recorded reasons"
area: gov
lead: governing
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: governing lead Oct 29
---

**What.** M3-05's test sentence says that as mayor, in the place's real form of government, the player signs one bill and vetoes another with recorded reasons. legislature.test.ts has the player as mayor sign through `executiveDecision` and leave one unsigned past its window, and src/core2/office-day-desk.test.ts has a governor's character decide by the engine's lean, but no test has the player veto, and the player's own route, `deskDecide` in src/bench/office.ts (about lines 121 to 127, called from the play handler), is never tested. Prove the player's sign and veto through the desk, with the reasons the act keeps.

**Rules.** The chain is the acceptance: the signed bill is followed to the law in force that changed and the vetoed one to the override vote or its end, by record id. No dice: the player's choice is theirs, and a decision left to the character comes from `executiveLean`, never a roll. One rule, all 56 places: a place with no mayoral veto is redrawn from all 56, never named.

**Done when.** A test in a drawn place built with buildBenchWorld and the seed it prints, where the state gives the mayor a veto, seats the player as mayor, puts two passed ordinances on the desk, signs one and vetoes the other through `deskDecide`, and finds each office act with its reasons and each bill's status (signed or enacted, vetoed or overridden) by record id; the M3-05 command names the test file.

**Files.** src/bench/office.ts, src/bench/office-desk.test.ts, src/core2/modules/office-day.ts, src/core2/modules/legislature.ts

**Notes.** Filed by the governing lead, Oct 29, from the M3-05 command (branch governing/m3-spec-commands). src/bench is the lane's; ask before editing. Phase D of the governing order (the desk at city hall) builds on this.
