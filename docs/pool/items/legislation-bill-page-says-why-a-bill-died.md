---
id: legislation-bill-page-says-why-a-bill-died
title: "The bill page says a committee held or voted down the player's bill, but never why"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
source: Lying thread, Nov 15 2026, from the 60-run rerun on Train #9554 (the Account lead asked whether the player is told why on the page)
---

**What.** Most bills a state senator player writes die in committee. At 4846968 (Texas) seed 8647-mason, 51 of 60 player bills on Train head 29ef4685 died there: 45 because the chair never heard them and 6 because the committee heard them and voted them down, all by Feb 9, 2025. The bill page's committee section says only that the bill was held (`words.held`), or lists who voted for and against. The chair's reasons are kept on the committee record (`chairReasons`: their position's reasons and what their temperament adds to holding a hearing, laws-held-bill-keeps-chair-reasons), and each committee vote keeps the member's position, but the page shows neither. So the player learns that their bill is dead and not why, which is the one thing they need to try again (ask the chair, win a co-sponsor, change the bill). Seen: the bill page's committee section for a held or voted-down bill.

**Cause.** Found in code: src/bench/bill-stage.ts `billStage` maps each committee record without `chairReasons`, and src/bench/ui/bill-stage.mjs (the committee section in `billStageSections`) prints `words.held` and the voters' names only.

**Fix.** Carry the chair's reasons into the one stage view (`billStage` committees, by the committee record's id) and the strongest reason of each committee vote. The bill page words them the way its desk section already words a governor's reasons (`words.reasons[reason]` with its side, src/bench/ui/bill-stage.mjs), from the same bank: the chair's reasons for a held bill, and for a vote-down the reasons the no votes give. No count, no raw kind. The Story session writes the lines (data/english/parts); this item lists the lines it needs and builds the screen read. When the record holds no reason, the line is left out. Clear the stopgap SG-LAW-held-bill-chair-reasons-unread only if its named replacement (the scene and the press line) also reads them; otherwise leave it and say so.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: every word comes from the bank (player-screen-text). One engine: the page reads the committee record through the one stage view, and computes nothing of its own.

**Done when.** At the named place 4846968 seed 8647-mason, with the player at senate seat 016 writing the right-to-counsel bill on day 1, a pinned test shows the stage view carrying the chair's reasons for the held bill by the committee record's id. A second session sees on the bill page in the running game on main why the committee held it, in words.

**Waits on.** Nothing.

**Files.** src/bench/bill-stage.ts, src/bench/ui/bill-stage.mjs
