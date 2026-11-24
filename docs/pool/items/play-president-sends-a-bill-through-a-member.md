---
id: play-president-sends-a-bill-through-a-member
title: "The President can't draft a bill: Your office for the President shows no Draft a bill list, though the engine asks a member for any executive with a by-request right"
area: play
kind: feature
priority: 2
size: S
status: open
standard: 2
after: play-bill-menu-for-mayors-and-governors
blocked-on:
lead: screens
source: Carry of #8341 (PR #9151), account lead thread, Nov 14, 2026; the gaps its body named
model: sonnet
effort: medium
root: rc7-player-cannot-drive
checked: carrier thread 2026-11-14
---

**What.** A player who is President gets the same Draft a bill list a governor gets, for the House or the Senate, and the bill goes through a member who agrees to carry it. Today a President who opens Your office sees no list at all, although a governor in the same game does, so the one executive with the largest agenda is the one who cannot draft. Seen: Politics, Your office, Draft a bill, as President.

**Cause.** Found in code: `bodiesOf` in src/bench/legislature.ts adds by-request bodies only for the executive's own level (`chamber.level === office.level`), and the President's two chambers are `FEDERAL_HOUSE` and `FEDERAL_SENATE`, which sit at no single office's jurisdiction; `proposeAsExecutive` (src/core2/modules/legislature.ts) takes one body per ask. PR #8341 left the President out.

**Fix.** Offer the President both chambers as by-request bodies (a bill is asked of a member of the chamber the player picks) through the same `seatAsk`, with no second path.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: read from the office rows and the place's records, never a named place. Replace, never layer: use the one draft card and the one bill engine. No dice. Words come from the English engine and control names; the Words lead reads any new line.

**Done when.** A second session plays a drawn federal world as President (names the place and seed), opens Your office, drafts a bill for the House and one for the Senate; each prints who was asked and the answer, and a carried bill shows the President as requester by record id. A bench test pinned to named places fails when the President gets an empty menu.

**Waits on.** PR #9151 (or #8341) folding into the train.

**Files.** src/bench/legislature.ts, src/bench/play.mjs, src/bench/handler.ts, src/bench/data/controls.json

**Notes.** Look-first, Nov 14: searched docs/pool/items for the executive bill menu, carry refusal and desk signature; the only neighbors are gov-carry-ask-player-decides (done) and play-bill-menu-for-mayors-and-governors (in-pr, carries this item's parent).
