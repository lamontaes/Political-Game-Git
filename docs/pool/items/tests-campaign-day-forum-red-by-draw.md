---
id: tests-campaign-day-forum-red-by-draw
title: "The campaign-day forum test is red by draw: the commonest question is not answered from the platform"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
source: "Interview check thread, Nov 15, 2026, gating the outlet-of-record change on train 53e4b29f"
root: none
---

**What.** `src/core2/campaign-day.test.ts`, "hosts a forum", fails with "the commonest question is answered from the platform: expected undefined to be -1". It failed on the clean train 53e4b29f and on the outlet-of-record branch at different drawn places, so it turns a gate red by draw. Seen: a builder's or the train's gate goes red on a test nobody's change touched.

**Cause.** Measured: Bieber, California (0606336), run seed dbc530fbe5beccdc8988e26aa2a57a7885069941e008133870c3fcbad9a593aa, on the outlet-of-record branch; Weiser, Idaho (1686140), run seed 19878114cb0260522b883db8abfe4f2ac575f42e44b6ceca5ce69f4cb66e31f9, draw :4, on the clean train.

**Fix.** Read why each drawn place above fails (a case the place cannot reach, or a real defect). Then pin the test to named places and fixed seeds in the test file where the case is reachable, with the passed-over places named, per the pinned-tests skill. If a place shows a real defect, file it as its own item.

**Time box.** 2 hours.

**Rules.** No dice: the pinned places are chosen from the record of the case, never by rerunning seeds until one passes.

**Done when.** The test runs at its named places and seeds, passes on the train, and its comment says why each place was chosen. A second session runs it on main twice in a row and sees the same result, then plays the case in a drawn place in the running game and names its seed.

**Waits on.** Nothing.

**Files.** src/core2/campaign-day.test.ts
