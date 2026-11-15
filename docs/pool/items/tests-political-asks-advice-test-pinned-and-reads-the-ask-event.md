---
id: tests-political-asks-advice-test-pinned-and-reads-the-ask-event
title: "The political-asks advice test drew places where no party asked, and read asks from a log that does not keep them"
area: gov
lead: governing
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread, Nov 14, political-asks advice test
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** CI at seed cfbeec2e0606127e found no party-asked member at six drawn places, so the advice test failed by draw. Seen: the failing advice test in CI and the passing run at Rainelle, West Virginia.

**Cause.** Measured: with `npx vitest run src/director/political-asks.test.ts -t "the advice"` two things were wrong. A party asks only on the day filing opens for a partisan seat where it has a chair and nobody filed under its label (partyProspects, src/core2/modules/candidacy.ts), and at most drawn places that day falls after the 360 days the test played (Black Hawk, Colorado day 362; Roslyn, South Dakota 375; Louisburg, Kansas 437; Esperanza, Puerto Rico in 2028). And the test found asks in `core.logByKind`, but the durable log keeps an event only when it names the player's circle (retainLog in src/core2/state.ts), so a party's ask of a member the player does not know is never in it: at Rainelle (world seed 2f25fb7e430b668e070d0566797f919b69f4d98980ad291944d6a73c00966ea8) three asks were written on 2025-12-02 and the log held none, with bookkeeping on or off.

**Fix.** The test is pinned to Rainelle, West Virginia (5466652) at that world seed, starting 2025-11-10 three weeks before the window, reads the asks through `subscribeEvents` in the first replay, and in the second replay (which watches the member, so the ask is kept) tries each ask taken under a seated officeholder's wing in order, naming the ones passed over (the first of the three at Rainelle has no advice scene bound). No assertion is changed. The whole advice test runs in about 50 s with a 120 s limit.

**Time box.** 1 hour for one sonnet session.

**Rules.** Pinned tests: a fixed place, world seed and start date, never red by draw; never loosened.

**Done when.** In the played world at Rainelle, West Virginia, a drawn place of the 56 (seed above, start 2025-11-10) the advice test passes in under two minutes, and a second session sees the same pass on the train.

**Waits on.** Nothing.

**Files.** src/director/political-asks.test.ts

**Notes.** Cause reasoning from M5 on the windows (Rainelle 2025-12-02, Midway 2025-11-09). Midway, Utah (4949820) also asks in year one; not pinned. Filed by hand.
