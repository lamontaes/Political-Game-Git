---
id: words-carry-bill-and-confirm-vote-rewritten-with-inserts
title: "The ask to carry a bill and the check on a promised vote say what the records hold: your stand, the asker's last ask, the section traded for, the veto, and a thank never follows a no"
area: words
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: rc4-hand-written-words
lead: story
model: sonnet
effort: medium
source: owner, Nov 16, "No. Count them again and rewrite them with inserts", "either that or remove them and start fresh"; Story lead's spec of Nov 17 (the carry-bill and confirm-vote rewrite)
---

**What.** Someone asks the player to carry a bill, and a sponsor comes to make sure of a vote the player traded for or to try a failed override again. Those talks held 253 uses, 221 placed by nothing: a greet with nothing behind it, "Alright. We have a deal." after a no, and a yes that never said why. The talks now lean on the player's stand, the asker's last ask, the section traded for and the veto, and the player's yes writes the promise a roll call settles.
Seen: in a drawn place an ask to carry a bill names what the bill is about and the player's yes or no gives their stand on it, a trade that came due on the floor names the section the member got, and no thank follows a no.

**Cause.** Found in code: the routine set of both purposes in data/english/parts/scene-talk.json carried no `requiresFacts`, `excludesFacts` or `onlyWhen` (greet 16, follow/accept 13, follow/thank 8, the closes and most replies), and `composeBinding` in src/director/purpose-scene.ts set no fact for the player's stand on the bill's question, the asker's party, an earlier ask, the player's own waiting bill, the section a committee trade added or the executive who vetoed, so no line could be placed by them; `recordPromises` in src/core2/modules/legislature.ts wrote the vote promise with no `side`, so the promises engine could never settle a yes given on it.

**Fix.** Add `carryAndConfirmFacts` in src/director/carry-and-confirm-facts.ts, called from `composeBinding` for `carry-asked`, `office.introduced`, `vote-promise` and `veto-override` records: `about` with `stand-for`, `stand-against` or `no-stand` (the views engine through bill-question-facts.ts), `asker-same-party` or `asker-other-party` (`partyOf`), `carried-for-them-before` or `declined-them-before` with `earlier-ask` (`closedCarryAsks` over the `carryAsks` table), `your-bill-waits` with `your-bill` (`waitingBillsOf`), `traded` (the bill's accepted deal), `override`, `vetoed-by` and `margin-one` (the override record's tally). Delete the uses the spec lists, place the rest, write the families against the facts, set `said-yes` and `said-no` on the replies so the thanks need a yes and the accepts a no, write `side` on the vote-promise record and give `confirm-vote` the promise rows `ask-vote` has in src/director/data/promise-kinds.json.

**Time box.** 6 hours, Sonnet at medium effort.

**Rules.** No hand-written player text: every line is a bank piece placed by a fact the packet sets. Wire to the world: each fact is read from the views engine, the carry asks, the bills table, the deal row or the override record, so a line plays only where its record holds. No figure is spoken: the count is in words.

**Done when.** In a drawn place, Town, State (seed nobody chose), a second session seats the player on a body in dev mode, has someone they know ask them to carry a bill and presses every reply, sees a trade that came due on the floor and a failed override as vote-confirmed talks and presses every reply, and finds the player's yes names their stand by record id, the asker remembers an earlier ask, no thank follows a no, and every new line is said or out of the bank. The line-inserts count for scene-talk holds or falls.

**Waits on.** #9935 (ask-vote shares the greets, relents and the bill-question read).

**Files.** data/english/parts/scene-talk.json, data/english/judged, data/english/pulled.json, src/director/carry-and-confirm-facts.ts, src/director/bill-question-facts.ts, src/director/purpose-scene.ts, src/director/data/promise-kinds.json, src/core2/modules/legislature.ts, src/director/carry-and-confirm-paths.test.ts, scripts/words/carry-confirm-walk.ts, tests/english-parts-banks.test.ts

**Notes.**

- 2026-11-17 (Story lead's builder, Sonnet): built from the spec of Nov 17. See the pull request for the counts, the played talks and the lines for the lead to sign.
