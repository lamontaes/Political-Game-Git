---
id: gov-a-background-year-with-a-full-chain
title: "A background year with a full chain."
area: gov
kind: feature
priority: 2
status: claimed
claimed-by: claude/background-chain-refusals
pr: #5333
blocked-on:
milestone:
source: "docs/coordination/OPUS-GOV.md line 195 (unchecked checklist line)"
claimed-at: 2026-10-20T11:08:08.786Z
---

**What.** In 11 played years (4 plain, 7 where the player proposed a minimum-wage raise) the background world made one bribe offer and zero reports, because the only bribe route is the employers' lobby on a minimum-wage bill and only the player proposes one. Make background bodies propose bills with money at stake (a minimum wage where local authority allows it, budget lines with vendors, permits) so interest groups, offers, reports and cases arise from causes with no player push. The player would notice corruption stories, complaints and trials in the news that no one in the room started.

**Rules.** No dice: who proposes and who offers a bribe follows traits, money and the law in force, with no fixed percentage; The chain is the acceptance: follow one background bill to an offer, a decision, a report, a case and the news line; Wire to the world: it moves money and people in a generated world and applies to every body that legislates; Ask why: each proposal and offer keeps its reasons by record id; One rule, all 56 places: no place named in code; Speed: background proposals act on the day something changes, with no new daily world scan.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a plain year (the player proposes nothing) shows background bills with money at stake, at least one interest-group offer or refusal with reasons, and any report or case that follows, all by record id. A test in `src/core2/world-legislating.test.ts` runs the plain year and reads the offers. The owner plays it: skips a year without proposing anything and reads a corruption story in the news that started on its own.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/interest-groups.ts, src/core2/modules/corruption.ts, src/core2/modules/legislature.ts

**Notes.** Checklist line from OPUS-GOV.md; verify against main before starting.

Measured Oct 20 (claude/pool-background-chain), plain year (the player proposes nothing), `buildBenchWorld` two-level, 365 days, one draw each from `drawPlace(seed, "chain")`:

| place, seed                    | bills | groups | lobbying meetings | bribe offers | taken | reported |
| ------------------------------ | ----- | ------ | ----------------- | ------------ | ----- | -------- |
| Hickory Ridge, Arkansas, `ch1` | 58    | 11     | 22                | 0            | 0     | 0        |
| Tryon, Nebraska, `ch2`         | 74    | 11     | 11                | 0            | 0     | 0        |
| Bethany Beach, Delaware, `ch3` | 76    | 23     | 93                | 0            | 0     | 0        |
| Williamsburg, Kansas, `ch4`    | 78    | 25     | 50                | 0            | 0     | 0        |

So the premise (only the player's minimum-wage bill starts the chain) is out of date: background bodies pass 58 to 78 bills a year, employers' groups form on their own from policies that bind employers (`employerStakes` reads any policy-question provision, not only the wage floor), and those groups meet the members who vote. The break is the next link. `offerBribe` (`interest-groups.ts`) runs on each first meeting, but `considerBribe` (`corruption.ts`) writes a record to the `crimes` table only when the lobbyist offers, and in 4 draws and 11 to 93 meetings none did, so a refusal leaves nothing: its reasons (`record.reasons.offer`) are built and thrown away. What is left to build: keep a refusal with its reasons where an engine reads it (the bench's why view, the director), and decide from the offer decision's traits and stake why no lobbyist offers (the parameters `corruptionTraitWeight`, `bribeShareOfStake`, the stake against a year of the lobbyist's living costs). Not built: whether zero offers in a year is the realistic rate is the owner's call (a bribe attempt is rare), so the done-when's "at least one offer or refusal" is met by recording refusals, not by raising the offer rate.
