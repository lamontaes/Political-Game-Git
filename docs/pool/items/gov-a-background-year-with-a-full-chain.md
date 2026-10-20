---
id: gov-a-background-year-with-a-full-chain
title: "A background year with a full chain."
area: gov
kind: feature
priority: 2
status: claimed
claimed-by: claude/pool-background-chain
pr:
blocked-on:
milestone:
source: "docs/coordination/OPUS-GOV.md line 195 (unchecked checklist line)"
claimed-at: 2026-10-20T00:27:47.643Z
---

**What.** In 11 played years (4 plain, 7 where the player proposed a minimum-wage raise) the background world made one bribe offer and zero reports, because the only bribe route is the employers' lobby on a minimum-wage bill and only the player proposes one. Make background bodies propose bills with money at stake (a minimum wage where local authority allows it, budget lines with vendors, permits) so interest groups, offers, reports and cases arise from causes with no player push. The player would notice corruption stories, complaints and trials in the news that no one in the room started.

**Rules.** No dice: who proposes and who offers a bribe follows traits, money and the law in force, with no fixed percentage; The chain is the acceptance: follow one background bill to an offer, a decision, a report, a case and the news line; Wire to the world: it moves money and people in a generated world and applies to every body that legislates; Ask why: each proposal and offer keeps its reasons by record id; One rule, all 56 places: no place named in code; Speed: background proposals act on the day something changes, with no new daily world scan.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a plain year (the player proposes nothing) shows background bills with money at stake, at least one interest-group offer or refusal with reasons, and any report or case that follows, all by record id. A test in `src/core2/world-legislating.test.ts` runs the plain year and reads the offers. The owner plays it: skips a year without proposing anything and reads a corruption story in the news that started on its own.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/interest-groups.ts, src/core2/modules/corruption.ts, src/core2/modules/legislature.ts

**Notes.** Checklist line from OPUS-GOV.md; verify against main before starting.
