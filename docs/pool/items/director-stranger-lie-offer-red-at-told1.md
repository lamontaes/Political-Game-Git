---
id: director-stranger-lie-offer-red-at-told1
title: "A stranger's 'Where are you from?' offers no lie at seed told1"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Lying builder, Nov 15 (red on the clean Train head at the same seed)
---

**What.** `src/director/conversation-lie-reach.test.ts`, "a stranger's 'Where are you from?' offers a false place", fails at GOLDEN_PATH_SEED=told1 in Edgerton, Kansas (2019825): "no stranger's question offered a lie: expected 0 to be greater than 0". Seen: a stranger asking where the player is from offers the scales' false place again.

**Cause.** Measured: `GOLDEN_PATH_SEED=told1 npx vitest run src/director/conversation-lie-reach.test.ts` is red on the clean Train head 693479ab90 and on the lying branch alike. Needs cause past that: which condition of the lie offer (the listener not knowing, the player's own record) stops the offer in that town is not yet traced.

**Fix.** Trace the failing count to the function in src/director/conversation.ts that stopped producing it, and fix that function; never loosen the test.

**Time box.** 1 hour, one Sonnet session at medium effort.

**Rules.** No dice; never loosen or re-pin the test.

**Done when.** The test passes at seed told1 and at its other seeds, and a second session, on main, plays a drawn town and sees the behavior in talks.

**Waits on.** Nothing.

**Files.** src/director/conversation-lie-reach.test.ts, src/director/conversation.ts
