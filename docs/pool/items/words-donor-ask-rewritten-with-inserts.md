---
id: words-donor-ask-rewritten-with-inserts
title: "The donor's call asks about the bill the gift names, and the player answers from where the bill is and where they stand"
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

**What.** The donor's call (`donor-ask` and its `.large`, `.small`, `.friend` and `.again` variants) held 385 fixed lines, 290 of them placed by nothing: "Thank you. I won't forget it." in every town, a donor who said the gift as a figure ("I put {money} behind you") and a player who lied about a bill with no record that the lie was false. The call now asks about the bill the gift names, says the gift's weight in words, and the player answers from where the bill is, whether they vote on it and which side their own recorded view puts them on.
Seen: a donor's gift to the player's campaign names a pending bill, and the talk says what the donor wants done with that bill, the player's agree plays only where their own view matches the donor's, a lie that the bill is moving is caught by someone who would know, and no thank-you follows a refusal.

**Cause.** Found in code: `excusedAs` in tests/guards/english/line-inserts.test.ts counts a line as placed when its use names any fact, so the 290 `donor-ask` lines of data/english/parts/scene-talk.json that carried no `requiresFacts`, `excludesFacts` or `onlyWhen` (and the six that said the gift as `{money}`) were never counted as fixed text, and `composeBinding` in src/director/purpose-scene.ts set no fact for the gift's weight, where the bill is, whether the player votes on it, the player's own side of its question, or who could say a lie about it is false (`knows-truth` and `source` were set only for a reporter's call), so no line could be placed by them. No pool item rewrote them with inserts.

**Fix.** Delete the donor-ask lines placed by nothing, the ones that say the gift as a figure, the ones that need a fact nothing sets and the lies with no record behind them; keep what a record places and that carries a slot; write the families the spec names. Add `donorReads` in src/director/donor-ask-facts.ts, called from the donor block of `composeBinding`: `gift-first`, `gift-biggest`, `gift-smallest` and `gift-weight` (the donor's total against the other named donors', from `giftsToCampaign`, a read added to the campaigns entry), `stand-with`, `stand-apart` and `your-side` (the views engine, `viewOn`, on the bill's question), `bill-filed`, `bill-held`, `bill-heard`, `bill-one-house`, `bill-on-desk` and `bill-stage` (the committee's and the chambers' records), `votes-on-it` (the chambers the bill goes through) and `knows-truth` with `source` (the bill's sponsor, else the committee's chair, when the bill has not moved). The player's agree sets nothing; a refusal sets `turned-down`, which a thank-you close excludes, and a lie sets `lied`, which only the replies to its catch read. Lower scene-talk's count in tests/guards/english/line-inserts-baseline.json once the recount lands.

**Time box.** 5 hours, Sonnet at medium effort.

**Rules.** No hand-written player text: every line is a bank piece placed by a fact the packet sets and none is typed in code. No figure in talk (rule 101): the gift's weight is said as words. Wire to the world: each fact a donor line needs is read from the gifts table, the views engine, the committee's records or the legislature's chambers, so a line plays only where its record holds.

**Done when.** In a drawn place, Town, State (seed nobody chose), a second session gets a gift that names a bill (dev mode: ask the town for money), presses every reply, and finds the donor's side and the player's own side match the views engine's answer by record id, an agree is offered only where the two match, a lie about the bill is caught by the person the record names, and no thank-you follows a refusal. The line-inserts count for scene-talk is lower than before.

**Waits on.** The recount of the line-inserts count (#9757) before the count can fall.

**Files.** data/english/parts/scene-talk.json, src/director/donor-ask-facts.ts, src/director/purpose-scene.ts, src/core2/modules/campaigns.ts, src/director/donor-ask-reads.test.ts, scripts/words/donor-walk.ts, data/english/pulled.json

**Notes.**

- 2026-11-17 (Story lead): drafted with a Sonnet writer. See the pull request for the counts, the played talks and the lines for the lead to sign.
- A gift that names no bill no longer stages a donor's call: with no bill, no employer-free reply can be worded, and the engine does not offer a scene it cannot answer (`fewer than two replies ... can be worded`). Before, it played stock lines.
- The arc's root has no `ask` reply (rule 29, "Why me?"): the arcs in src/director/data/purpose-arcs.json and arc-variants.json list no `ask` among the donor's replies, a gap that was there before this item and needs an arc change, not a line.
