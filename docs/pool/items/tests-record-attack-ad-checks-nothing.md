---
id: tests-record-attack-ad-checks-nothing
title: "The record test's attack-ad half passes on an empty list: no press is open, so the rival's ad reaches nobody"
area: elections
lead: laws-effects
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/record-attack-ad
pr: #6297
blocked-on:
source: laws-and-effects lead's helper, Oct 27 (release-red-record-broken-promise-voters)
claimed-at: 2026-10-27T11:26:16.333Z
---

**What.** `src/core2/record.test.ts`, "an incumbent's broken promise changes specific voters' choices, with reasons, and feeds the rival's attack ad", checks the ad with `attack.every((c) => c.act === "attack-ad")`, which is true on an empty list. On Oct 27 `attackAdReached` was 0 on all three seeds run (mainprobe-2 in 5644615, 4b9c8141... in Connecticut 0944660, and a fresh seed in 3439870): the rival raised $181, but `runAd` buys nothing, because `adAudience` in `src/core2/modules/campaigns.ts` returns null unless an outlet is registered, and `registerAdOutlet` is called only from `src/core2/modules/press.ts`, which this test's world never opens. The case has read this way since it was written on Oct 12 (fdbd9ea81b).

**Rules.** Wire to the world and ask why: the ad's effect is proven only when a voter who saw it names it among their reasons, by record id. Never skip, disable or quarantine the case.

**Done when.** The test's world opens the press the way buildBenchWorld does, the case requires at least one ballot whose reasons cite the rival's attack ad on the broken promise (printing the ad's record id and the ballot ids), and it passes in a drawn place on three fresh seeds named in the PR body and fails with `registerAdOutlet` removed.

**Time box.** 2 hours, any fixer or the laws-and-effects lead.

**Files.** src/core2/record.test.ts, src/core2/modules/campaigns.ts, src/core2/modules/press.ts

**Notes.** Found by the laws-and-effects lead's helper while fixing `release-red-record-broken-promise-voters` (branch claude/record-broken-promise-red), which leaves this half as it is.
