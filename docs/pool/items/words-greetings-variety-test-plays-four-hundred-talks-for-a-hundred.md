---
id: words-greetings-variety-test-plays-four-hundred-talks-for-a-hundred
title: "The greetings and goodbyes test plays up to 400 talks to count variety over 100, and times out under load"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: sonnet
effort: medium
root: none
source: Builder M3 on #9455, Nov 15; Account lead asked for the cause before any limit moves
---

**What.** The test "names when the two last met on a second talk, the employer of a talk about work, and says over 30 different greetings and goodbyes in 100 talks" in src/director/conversation.test.ts runs about 27.5 seconds against vitest's 30 second default, and failed with a timeout when other work ran beside it. A test that sits at nine tenths of its limit is red by load, not by a fault. Measured on the base of #9455 at 27.5 and 29.1 seconds, and over the limit at 30.1 while two other test runs shared the machine. Guards: the greetings and goodbyes the player hears in a talk keep their variety and their naming of the last meeting.

**Cause.** Found in code: src/director/conversation.test.ts, the `it` at line 1394, plays every person away from the player's household, up to 200, in two rounds (`everyone().slice(0, 200)`, `for (const round of [0, 1])`), so up to 400 talks of up to eight turns each (`play`), although its own title and its comment say variety is read over the first 100 goodbyes (`if (said <= 100)`). There is no draw loop; the cost is the count of talks played.

**Fix.** Play only as many talks as the assertions read: stop a round once 100 goodbyes are counted and the second round has enough second greetings (`second` above zero) to check the naming of the last meeting, and keep the limit as it stands (the rule is a limit near twice the measured time, set after the run is cut, not before).

**Time box.** 1 hour.

**Rules.** Tests pin named places and fixed seeds, take about a minute and never loosen an assertion to pass; this test keeps every assertion and plays fewer talks.

**Done when.** In the played world at a drawn place, the one the test builds (buildBenchWorld through its own startWorld), a second session runs the test alone and sees it pass in under half its limit, with the same assertions and the same counts of greetings and goodbyes named in its output line.

**Waits on.** Nothing.

**Files.** src/director/conversation.test.ts
