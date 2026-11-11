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
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
size: M
checked: fable 2026-11-10
---

**What.** The item asks for a background year with a full chain: background bodies propose bills with money at stake so interest groups, offers, reports and cases arise from causes with no player push. Its premise (11 played years, 4 plain, with one bribe offer and zero reports, because only the player proposes a minimum-wage bill) is out of date. The Oct 20 plain-year table (Hickory Ridge AR `ch1`, Tryon NE `ch2`, Bethany Beach DE `ch3`, Williamsburg KS `ch4`) showed 58 to 78 background bills a year, employers' groups forming on their own and 11 to 93 lobbying meetings, but zero bribe offers, and a refusal left no record. Later measures found hundreds of offers in two years (434 in Davie, Florida, seed 694f68f1f5df5250). Which link of the chain is missing in a plain year today is not known.

**Cause.** Needs cause. Read the item's Oct 20 table against `gov-bribe-offer-reads-known-money-trouble` (434 offers in Davie, FL, seed 694f68f1f5df5250); `considerBribe` in `src/core2/modules/corruption.ts` changed in between. No replay of a plain year on main has been taken since.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session, to replay four plain years on main and name which link of the chain (bills, groups, meetings, offers or refusals, reports, cases, news) is missing. When it runs out, write what was counted in the item and stop.

**Rules.** No dice: who proposes and who offers a bribe follows traits, money and the law in force, with no fixed percentage. The chain is the acceptance: follow one background bill to an offer, a decision, a report, a case and the news line. Ask why: each proposal and offer keeps its reasons by record id. One rule, all 56 places. Speed: background proposals act on the day something changes, with no new daily world scan.

**Done when.** A second session replays a plain year (the player proposes nothing) in four places drawn from all 56 (names and seeds printed) with `scripts/research/bribe-chain-years.ts` and sees the item rewritten with `Measured:` counts per link (bills, groups, meetings, offers, refusals kept with reasons, taken, reported, cases, news lines) and a Fix naming the missing link, or the item dropped with that evidence if every link is present. Whether the offer count is the realistic rate is reported, not a pass or fail.

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
