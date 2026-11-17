---
id: campaign-turn-closeness-and-pacing
title: "A campaign's attack ads and its spending pace follow the race, not two fixed rules"
area: elections
kind: bug
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: Fixer one, Nov 17 (record.test cause 2; CTO 20:23Z on #9747)
standard: 2
model: opus
effort: medium
root: none
checked:
---

**What.** A challenger facing an incumbent with a broken promise on record spends the same share of its ad money on attacking whether the race is close or a rout, and spends at an even pace from filing day to election day. Months out, a turn has too little money to buy a single attack spot; in the last weeks it has no more than an even share. Seen: the Campaign tab's spending and the attack-ad causes of a world candidate.

**Cause.** Measured: `src/core2/record.test.ts` at seed rec-probe-3 on `train/nov17b` (e700d077), a rival's own campaign turn 295 days before a November race: free cash $10,370 to $25,821, turn budget $40 to $306, the ad part $18 to $153, the attack part $9 to $27, and no spot bought. Found in code: `src/core2/modules/campaigns.ts`, the campaign turn's spending (about line 8264) sets `budget = free × campaignTurnDays / daysLeft`, an even pace to election day; the attack share (about line 8297) is `attackAdShare × (1 + spendTraitWeight × conflict)` whenever `attackTarget` finds a rival with any vote or promise on record, by temperament alone, whatever the race's closeness, the money in hand or how strong the record against the rival is.

**Fix.** Two reads, each from the campaign's own records: the attack share grows with how close the race reads to the campaign (its own polls or standing), the money it has left and the record's strength (the broken-promise items and their weight), and stays zero with no usable record; the turn's budget leans late, as real campaigns spend most of their money in the last weeks. Research before building: no campaign-spending research for local races is in the repo (searched `data/research/campaigns`); name the source used for the late share and the attack response, or register a stopgap for each. No fixed rate and no threshold. Prove it in drawn places: over N drawn races, attack ads happen at a rate above zero and more in closer races, and a campaign's spending in its last four weeks is a larger share than its first four. `src/core2/record-rival-turn.test.ts` (calibration lane, #10042) reads the attack ad end to end.

**Time box.** 4 hours, Opus at medium effort.

**Rules.** No dice: a campaign's share comes from its own money, polls and the rival's record. One rule for every candidate, player and world alike.

**Done when.** At three drawn places, the share of a campaign's money spent in its last four weeks is larger than its first four; over the calibration lane's drawn races, a rival with a usable record buys attack ads at a rate above zero that rises with the race's closeness, and one with no record buys none; dev mode's Trace on a campaign turn names the closeness, money and record that set its attack share. A second session plays a race to its last weeks in the running game, opens a rival's campaign in dev mode, and sees an attack ad with its Trace.

**Waits on.** Nothing.

**Files.** `src/core2/modules/campaigns.ts` (the campaign turn's spending and attack share), `src/core2/data/campaigns/parameters.json`, `src/core2/record-rival-turn.test.ts`.
