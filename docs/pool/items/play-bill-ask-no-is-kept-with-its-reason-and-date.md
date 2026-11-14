---
id: play-bill-ask-no-is-kept-with-its-reason-and-date
title: "When a member declines to carry an executive's bill, the screen says no and nothing more: the reason and the date are not kept, and the player cannot ask them again later"
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

**What.** A member who declines a mayor's, county executive's or governor's bill is shown with the reason in their own words, the no is kept with its reason and date, and the player may ask the same member again later (owner's standing rule for a person asked to serve, Nov 14 05:17Z, applied to a bill). Today a no looks the same each time. Seen: the member's reason on Your office's plate, and the later ask.

**Cause.** Found in code: `seatAsk` (src/bench/legislature.ts) returns only `carried`, `awaitingPlayer` and the member's name; `proposeAsExecutive` records the member's position total but no worded reason, and the screen line for a refusal (`seat.askedRefused`) names the member only.

**Fix.** Keep the refusal on the tie or ask record with its reason (the position terms that decided it) and the date; show the reason as a worded line from the English engine; allow a later ask of the same member. Reuse the one record that already keeps reasons for the person asked to serve.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: read from the office rows and the place's records, never a named place. Replace, never layer: use the one draft card and the one bill engine. No dice. Words come from the English engine and control names; the Words lead reads any new line.

**Done when.** In a drawn place with a refusal (the second session says how it found one without forcing it), the player sees the member's reason in words and a date, asks again a month later and gets a fresh answer; both asks are kept by record id.

**Waits on.** PR #9151 (or #8341) folding into the train.

**Files.** src/bench/legislature.ts, src/bench/play.mjs, src/bench/handler.ts, src/bench/data/controls.json

**Notes.** Look-first, Nov 14: searched docs/pool/items for the executive bill menu, carry refusal and desk signature; the only neighbors are gov-carry-ask-player-decides (done) and play-bill-menu-for-mayors-and-governors (in-pr, carries this item's parent).
