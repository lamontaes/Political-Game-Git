---
id: director-greetings-and-goodbyes-under-thirty-red
title: "The greetings and goodbyes test finds 25 different lines in 100 talks, not 30"
area: director
kind: bug
priority: 2
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
source: Account lead carrier, Nov 14 (found carrying #8510; red the same way on the clean train head)
---

**What.** `src/director/conversation.test.ts`, "hellos and goodbyes are composed from the records › names when the two last met on a second talk, the employer of a talk about work, and says over 30 different greetings and goodbyes in 100 talks", fails with "expected 25 to be greater than or equal to 30" at its fixed seed ("conversation-test"). Seen: the 100 talks play 30 or more different greetings and goodbyes again.

**Cause.** Measured: red on train head 942bea34 and on 8bc765b3 with no change of ours, so a line change on the train (the pulled greetings and goodbyes, #9067's sweep of the banks) cut the supply of different openers and closers a talk can draw; the test counts distinct pieces played. Which bank change took the five away is not yet found (git log the greeting and goodbye pieces in data/english/parts/conversation.json against the test's last green).

**Fix.** Find the bank change that removed distinct greetings and goodbyes from play (the pulled-lines list or a changed "uses" condition), restore the supply with lines the Words lead has read; never loosen the 30.

**Time box.** 1 hour, one Sonnet session at medium effort.

**Rules.** No dice: the lines are chosen by the records (who met, when, where), as now. Plain American English. Never lower the test's number.

**Done when.** The test passes at its fixed seed with the count back at 30 or more, and the guard suite and english-parts-banks stay at their known reds. A second session, on main, plays one year in a drawn place, talks to a dozen people on a dozen different days, and hears at least as many different greetings and goodbyes as the train did before the sweep, with no line repeated back to back.

**Waits on.** Nothing.

**Files.** data/english/parts/conversation.json, src/director/conversation.test.ts
