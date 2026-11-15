---
id: core-counted-estate-transfer-reused-by-a-second-part-death
title: "A counted record that dies in part in two months running fails its second estate settlement: the transfer id names the person and heir, not the death"
area: core
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9410
after:
blocked-on:
lead: laws
model: opus
effort: medium
root: none
source: found by the Account lead while tracing the law-wiring-taxes red on the Train head, Nov 15, 2026
---

**What.** `settleCountedEstate` (src/core2/estates.ts) named its transfers `estate:<decedent>:<series>:<jurisdiction>:<heir>`. A record that dies in part keeps the person id it started with, so a second part death of the same record in the same or the next month booked the same transfer ids, and the accounts engine (which keeps an id for the month and the one before) threw "Transfer id is empty or reused". Seen: src/core2/law-wiring-taxes.test.ts at Dennis, Massachusetts (2516740), world seed f090a9034b487078ca7c3d2a2c1a40207804ca4e, where the game itself settled person_2954a3a6b957eaf6 on 2026-05-01 (a part death of one household) and the test settled the same person again on 2026-05-19.

**Cause.** Found in code: src/core2/estates.ts, `settleCountedEstate`, the estate-tax transfer id (about line 534) and the inheritance-tax transfer id (about line 590) hold no mark of the death. Logged with a line in `settleCountedEstate` for every call: `SETTLE 2026-05-01 person_2954… households 1` then `SETTLE 2026-05-19 person_2954… households 0.0759`. The same failure appears with births-counted.ts at its text before the counted-deaths fix (#9353), so that change did not cause it.

**Fix.** Each death's transfers carry its day: the id ends `:<date>`. A person's illness ends in one death, and one illness at a time runs per record person (`ill` in births-counted.ts, cleared by `endCountedIllness`), so two deaths of one record on one day come only from a caller that settles one death twice. No other code reads these ids (the tests match the prefix `estate:<decedent>:<series>:`).

**Time box.** 1 hour.

**Rules.** No dice. Replace never layer. No new stopgaps.

**Done when.** `npx vitest run src/core2/counted-part-death-estate-twice.test.ts` passes (Pike Creek Valley, Delaware, 1056500, seed c1d4df59…: a record dying in part 31 days apart, both estate taxes paid, the transfer ids distinct) and fails on the Train head without the change with "Transfer id is empty or reused". A second session then plays a drawn place (fresh seed, named) on main for a year with the estate and inheritance taxes set low through `enactLaw`, and reads that no counted record's second part death stops with a reused-transfer error.

**Waits on.** Nothing.

**Files.** src/core2/estates.ts, src/core2/counted-part-death-estate-twice.test.ts, src/core2/law-wiring-taxes.test.ts

**Notes.** law-wiring-taxes.test.ts, once past this, stopped at a later assertion in its counted-estate case ("journal entry for applied|inheritance-tax|person_cead8361…"). The applied row is correct: `lawApplied` keeps one row per law and target and adds each application's money to it, so the row held the 259,960 the game's own settlement moved on 2026-05-01 while this settlement moved nothing (the heir's group fund was emptied by the estate tax). The test's premise, that every applied row with money has a post in the settlement just run, was wrong for a record the game had already settled that month. The same test now stages a record that stands for a whole household or more (the staged one stood for 0.076 after the part death), same place and seed; it passes in 251 s.
