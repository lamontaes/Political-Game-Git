---
id: gov-a-background-year-with-a-full-chain
title: "A background year with a full chain."
area: gov
kind: feature
priority: 3
status: open
claimed-by:
pr: #5665
blocked-on:
milestone:
source: "docs/coordination/OPUS-GOV.md line 195 (unchecked checklist line)"
claimed-at:
after:
lead: governing
standard: 2
model: opus
effort: high
root: rc8-law-judged-by-paperwork
size: M
checked: fable 2026-11-10
---

**What.** The item asks for a background year with a full chain: background bodies propose bills with money at stake so interest groups, offers, reports and cases arise from causes with no player push. Its premise (11 played years, 4 plain, with one bribe offer and zero reports, because only the player proposes a minimum-wage bill) is out of date. The Oct 20 plain-year table (Hickory Ridge AR `ch1`, Tryon NE `ch2`, Bethany Beach DE `ch3`, Williamsburg KS `ch4`) showed 58 to 78 background bills a year, employers' groups forming on their own and 11 to 93 lobbying meetings, but zero bribe offers, and a refusal left no record. Later measures found hundreds of offers in two years (434 in Davie, Florida, seed 694f68f1f5df5250). Which link of the chain is missing in a plain year today is not known.

**Cause.** Measured: `node --import tsx scripts/research/bribe-chain-years.ts --months 12 bg-1 bg-2 bg-3 bg-4` on main d59e6935d7, a plain year with every module and no player push, in Fairview, Oregon (4124250), Blencoe, Iowa (1906940), Brunswick, Missouri (2909046) and Dayton, Montana (3019525). Bills and lobbying are there: 84 to 117 lobbyist meetings with members on bills and 20 to 28 contract awards voted a year in each. Offers: 185 in Fairview (180 on state contracts, 5 on the town's), 0 in the other three, and none from any lobbyist meeting. Taken 0, surfaced 0, reported 0 in all four. Two links are missing, found in code. First, an offer reaches only an official who is a full person with a cash account: `offerBribe` in `src/core2/modules/interest-groups.ts` (line 400) and the contract award in `src/core2/modules/contracts.ts` (line 207) both skip any member without `residualAccountByOwner`, and `considerBribe` (`src/core2/modules/corruption.ts`, line 235) returns null for anyone not in `people`. Most lobbying is with state legislators, who are named officials never filled in, so most meetings cannot produce an offer. Fairview's offers came from its state representative, a town resident. Second, a background refusal never reaches the press or a case. `afterRefusal` (corruption.ts, line 406) records the refusal and lets the offerer decide whether to press, but the official who refused has no decision to report it. Reporting exists only for the player, in the scene (`reportPressedOffer`, line 470). So surfaced, reported and cases stay at zero whatever the offer count. No single official's take terms reached the pull of refusing (3); that taking is rare is consistent with the real charge rate the script prints, and not a defect.

**Fix.** 1. In `afterRefusal`, give the official who refused their own decision whether to report the offer, through the same `decide` chooser, from their own values: their honesty and temperament at the decision's weight, how much the offer was, their tie to the offerer, and whether the offerer pressed. On yes, run the same report path the player's scene uses (`reportToPress`, line 730, through the scandal record `reportPressedOffer` writes), naming the official as the source. Register the new decision's gap row in `data/content/trait-decision-gaps.json` if it is rare. 2. Leave the full-person gate as it is: bribery between officials nobody has met stays a result, under the two-level population rule. Record that as a sentence in the item's Notes, not as code. 3. Measure the town's own bodies, whose members are full people: why the 5 to 12 lobbyist meetings a year on town bills gave no offer (the stake `annual` passed at `src/core2/modules/interest-groups.ts` line 388, or the lobbyist's own account). Write what is found into this item's Notes, and fix it only if it is a gate like the one above.

**Time box.** 5 hours for one Opus session.

**Rules.** No dice: who proposes and who offers a bribe follows traits, money and the law in force, with no fixed percentage. The chain is the acceptance: follow one background bill to an offer, a decision, a report, a case and the news line. Ask why: each proposal and offer keeps its reasons by record id. One rule, all 56 places. Speed: background proposals act on the day something changes, with no new daily world scan.

**Done when.** A second session replays a plain year with `scripts/research/bribe-chain-years.ts` in four places drawn from all 56 (names and seeds printed) and sees, in any place with offers, refusals that an official reported reach the press as a story with the offer's record id, and the counts per link (bills, meetings, offers, refusals kept with reasons, taken, reported) written into the item.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/interest-groups.ts, src/core2/modules/corruption.ts, src/core2/modules/legislature.ts, src/core2/world-legislating.test.ts, scripts/research/bribe-chain-years.ts

**Notes.** Checklist line from OPUS-GOV.md; verify against main before starting.

Measured Oct 20 (claude/pool-background-chain), plain year (the player proposes nothing), `buildBenchWorld` two-level, 365 days, one draw each from `drawPlace(seed, "chain")`:

| place, seed                    | bills | groups | lobbying meetings | bribe offers | taken | reported |
| ------------------------------ | ----- | ------ | ----------------- | ------------ | ----- | -------- |
| Hickory Ridge, Arkansas, `ch1` | 58    | 11     | 22                | 0            | 0     | 0        |
| Tryon, Nebraska, `ch2`         | 74    | 11     | 11                | 0            | 0     | 0        |
| Bethany Beach, Delaware, `ch3` | 76    | 23     | 93                | 0            | 0     | 0        |
| Williamsburg, Kansas, `ch4`    | 78    | 25     | 50                | 0            | 0     | 0        |

So the premise (only the player's minimum-wage bill starts the chain) is out of date: background bodies pass 58 to 78 bills a year, employers' groups form on their own from policies that bind employers (`employerStakes` reads any policy-question provision, not only the wage floor), and those groups meet the members who vote. The break is the next link. `offerBribe` (`interest-groups.ts`) runs on each first meeting, but `considerBribe` (`corruption.ts`) writes a record to the `crimes` table only when the lobbyist offers, and in 4 draws and 11 to 93 meetings none did, so a refusal leaves nothing: its reasons (`record.reasons.offer`) are built and thrown away. What is left to build: keep a refusal with its reasons where an engine reads it (the bench's why view, the director), and decide from the offer decision's traits and stake why no lobbyist offers (the parameters `corruptionTraitWeight`, `bribeShareOfStake`, the stake against a year of the lobbyist's living costs). Not built: whether zero offers in a year is the realistic rate is the owner's call (a bribe attempt is rare), so the done-when's "at least one offer or refusal" is met by recording refusals, not by raising the offer rate.

Sent back 2026-10-23 from PR #5665 (branch claude/background-chain-refusals): the lobby meeting bribe field has no reader; implement the required downstream chain and its played-world proof; existing merger return still applies with no corrective source commit; finish on that branch, merge main into it first.

Deferred Oct 25: nothing on screen reads it yet.

Nov 11 (cause finder for Fable B): replayed a plain year in four drawn places on main d59e6935d7. Bills and lobbying are there; offers come only where an official is a full person (Fairview's resident state representative), and no refusal is ever reported, because only the player's scene can report one. The fix gives the refusing official a report decision through the existing chooser and press path.
