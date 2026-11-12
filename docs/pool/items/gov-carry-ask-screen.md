---
id: gov-carry-ask-screen
title: "A member's request to carry a bill shows on the player's Issues and Government page with Agree and Decline"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10 (SG-GOV-carry-ask-no-screen)
lead: play-first
standard: 2
model: sonnet
effort: medium
root: rc7-player-cannot-drive
---

**What.** When another official asks the player, as a member, to carry a bill, the ask is held but nothing on screen shows it, so the player can never answer and the ask never closes. Show each waiting ask on Politics, Issues and Government with who asked, what it would do and Agree and Decline buttons. Today the engine half is built and tested, so the only gap is the screen: the player's answer is never collected. Seen: on Politics, Issues and Government, as a waiting request with Agree and Decline.

**Cause.** Found in code: `src/core2/modules/legislature.ts` line 3322 registers `SG-GOV-carry-ask-no-screen` where `askToCarry` puts a row with `awaitingPlayer` in the `carryAsks` table; `carryAsksAwaiting` (line 3366) and `answerCarryAsk` (line 3377) exist and nothing in `src/bench` calls either.

**Fix.** In `src/bench/government.ts` read `carryAsksAwaiting(api)` for the player and add a card to the Issues and Government page, built from `src/bench/ui/card.mjs` and `button.mjs`, listing each ask with the asker's name, the provisions in the bank's wording (no ids) and two buttons that call `answerCarryAsk(api, id, true|false)` through the bench's existing action route in `src/bench/play.mjs`. Agreeing shows the bill filed with the player as sponsor; declining shows the ask closed. Mark the stopgap resolved. No new player step beyond answering a question already asked of them.

**Time box.** 6 hours for one sonnet session.

**Rules.** The engine offers and the player decides. Screens read the one record and compute nothing (`screen-to-mock`, `player-screen-text`), so no record ids or kinds show on screen. No dice: the ask is a recorded request, never a roll.

**Done when.** A second session starts the bench in a drawn place with a council whose mayor can ask (name the place and seed), plays as a member the executive's ask reaches (dev mode's bill card or Play as), sees the waiting ask on Issues and Government, presses Agree and sees the bill on the agenda with the asker recorded as the requester by record id, then does the same with Decline and sees nothing filed and the ask gone. A screenshot of the page shows no developer text. `SG-GOV-carry-ask-no-screen` is resolved in `src/core2/data/stopgaps/gov.json`.

**Waits on.** Nothing; an executive asking a member is built (gov-carry-ask-player-decides, done). It meets play-bill-menu-for-mayors-and-governors (open, player as executive) only at the same page; ask that item's session whether the card exists.

**Files.** src/bench/government.ts, src/bench/play.mjs, src/bench/ui/card.mjs, src/core2/modules/legislature.ts, src/core2/data/stopgaps/gov.json
