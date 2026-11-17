---
id: words-owed-apology-rewritten-with-inserts
title: "The apology over a missed payment talks about that payment, and your promise to pay on time is settled by the next one"
area: words
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: rc4-hand-written-words
lead: words
model: sonnet
effort: medium
source: owner, Nov 14, on the lines the world does not place, and Nov 16, "No. Count them again and rewrite them with inserts", "either that or remove them and start fresh"
---

**What.** The money and close arcs of the apology (`owed-apology.money`, `owed-apology.close`, played by `apology` after the quarrel module's `family.quarrel`) held 59 fixed lines placed by nothing: "the missed payment" in general words, never the loan, and "I promise to do better. You can count on me with the bills." promised nothing the game settles. The talk is now about this payment, and the promise is the `pay-on-time` promise the credit engine's next payment record settles.
Seen: a housemate who shares the bills opens with the loan and who called, the player's replies name the next due day, a promise to pay on time is kept after the next payment is made and broken after it is missed, and no thank-you follows a confront.

**Cause.** Found in code: `excusedAs` in tests/guards/english/line-inserts.test.ts counts a line as placed when its use names any fact, and the 59 `owed-apology.money` and `.close` lines named none, while `composeBinding` in src/director/purpose-scene.ts set no fact from the credit engine's missed-payment record (`credit.payment-missed`, which carries `loanId` and `loanKind`) or its loan row, so no line could name the loan, the lender, how far behind or the next bill, and no line could be placed by them.

**Fix.** Delete the 59 fixed `.money` and `.close` lines; 90 new lines are written. Add `apologyReads` in src/director/apology-facts.ts, called from `composeBinding` for the `owed-apology` purpose: `loan` (payment-words.json by the missed payment's loan kind), `lender` (the loan row's lender organization), `behind` (the row's past-due money against its payment, in words from src/director/data/apology-reads.json), `household-short` (family-stake.ts's `householdMoney`, now shared with the filing stake), `due-next` (the credit engine's next billing day on its own calendar) and `quarreled-before` (an earlier `family.quarrel` between the two over another missed payment). The credit module exports `loanOf` and `nextBillingDay` through the business entry. The ending `promised-to-make-it-right` already writes the `pay-on-time` promise (promise-kinds.json); no second path. Replies set `confronted`, which the thank-you closes exclude. Lower scene-talk's count in tests/guards/english/line-inserts-baseline.json once the recount lands.

**Time box.** 5 hours, Sonnet at medium effort.

**Rules.** No hand-written player text: every line is a bank piece placed by a fact the packet sets. No figure in talk (rule 101). Wire to the world: each fact is read from the credit engine's record or the household's money, so a line plays only where its record holds. Numbers live in apology-reads.json (TUNABLE).

**Done when.** In a drawn place, Town, State (seed nobody chose), a second session misses a payment in dev mode with a grown housemate at home, presses every reply of the `.money` and `.close` talks, and finds the confront names the loan from the credit row by record id, the promise writes `pay-on-time` against the missed payment's quarrel, it is kept after the next payment is made and broken after it is missed, no thank-you follows a confront, and every new line is said or out of the bank. The line-inserts count for scene-talk holds or falls once #9757 lands.

**Waits on.** The recount of the line-inserts count (#9757) before the count can fall.

**Files.** data/english/parts/scene-talk.json, src/director/apology-facts.ts, src/director/data/apology-reads.json, src/director/family-stake.ts, src/director/purpose-scene.ts, src/director/apology-paths.test.ts, src/core2/modules/credit.ts, src/core2/modules/business.ts, src/core2/modules/partnerships.ts, scripts/words/apology-walk.ts

**Notes.**

- 2026-11-17 (Story lead): drafted with a Sonnet writer. See the pull request for the counts, the played talks and the lines for the lead to sign.
- Not built: the spec's `tell` reply (the arc's replies are apologize, promise, deflect and confront; the household-short reason is said in an apology line), and a confront placed by the wronged's own missed payment (no read of it without a scan of the credit records by person).
