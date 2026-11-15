---
id: director-talk-opens-on-old-school-red-at-told1
title: "The talk test that forbids opening on a school or old job without a reason is red at seed told1"
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

**What.** `src/director/conversation.test.ts`, "conversations in Howey-in-the-Hills, Florida (seed told1) › never opens on a school or an old job without a reason, and a question answered is followed up, not answered with goodbye", fails at line 1093 with "expected 0 to be greater than 0". Seen: talks in a drawn town follow a question answered with a follow-up again.

**Cause.** Measured: `GOLDEN_PATH_SEED=told1 npx vitest run src/director/conversation.test.ts` is red on the clean Train head 693479ab90 and on the lying branch alike, Howey-in-the-Hills, Florida. Needs cause past that: the count at line 1093 found no answered question to check in that town, so either no talk asked one or the pairing the test reads changed.

**Fix.** Trace the failing count to the function in src/director/conversation.ts that stopped producing it, and fix that function; never loosen the test.

**Time box.** 1 hour, one Sonnet session at medium effort.

**Rules.** No dice; never loosen or re-pin the test.

**Done when.** The test passes at seed told1 and at its other seeds, and a second session, on main, plays a drawn town and sees the behavior in talks.

**Waits on.** Nothing.

**Files.** src/director/conversation.test.ts, src/director/conversation.ts
