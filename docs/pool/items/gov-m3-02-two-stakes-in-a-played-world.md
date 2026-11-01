---
id: gov-m3-02-two-stakes-in-a-played-world
title: "In the played world the player learns two colleagues' stakes on their bill through routes the character uses"
area: gov
lead: governing
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: governing lead Oct 29
---

**What.** M3-02's test sentence says the player learns at least two members' stakes through routes the character could use. `learnStake` (src/core2/modules/legislature.ts) has a conversation route and a record route, and an aide's brief reads stakes by record (`briefOnBill`, src/core2/modules/staff.ts), but the only test that learns two stakes is legislature.test.ts, in a small population world where the test calls `learnStake` directly. In the bench world the player's talk with a colleague and the aide's brief are never checked for the stakes they reveal. Prove both routes from the player's office in the played world.

**Rules.** An effect is a read, not a record: a learned stake counts only when the office panel or the talk reads it back for the player, by bill and member. No dice: each stake is the member's own recorded position, never a roll. One rule, all 56 places: the place is drawn from all 56 and named with its seed.

**Done when.** A test in a drawn place built with buildBenchWorld and the seed it prints has the player, sitting on their town's body with a drafted bill, learn one colleague's stake by talking to them and a second by their record or an aide's brief, through the office acts; both stakes are on the record by bill and member id and the office panel shows them; the M3-02 command names the test file.

**Files.** src/bench/office.ts, src/bench/office-deals.test.ts, src/core2/modules/legislature.ts, src/core2/modules/staff.ts

**Notes.** Filed by the governing lead, Oct 29, from the M3-02 command (branch governing/m3-spec-commands). Phase B of the governing order adds "what colleagues told you plus your aide's estimate before a vote" (Oct 29); build this as its first unit. src/bench is the lane's; ask before editing.
