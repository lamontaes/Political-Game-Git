---
id: laws-checker-day-loop-money-counted-as-reader
title: "The law-wiring checker counts any transfer the day loop makes as a reading engine's money"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In the government family's year runs (Oct 24), the money link of independent redistricting, same-day registration, the lobbying ban, home rule and term limits graded wired in Prescott, Michigan from one post, `accounts.transfer @ src/core2/life.ts:551` (`journal:2025-01-23:1638`). It differs from the control world but has nothing to do with these laws. The checker names a reader by the first source frame on the stack, so a law read from the day loop names `src/core2/life.ts`. Every transfer whose stack has no other source frame is then attributed to that same file, which makes it a reader of every law, so its transfers count as each law's direct money.

**Rules.** An effect is a read: a law's money is a post by the engine that read the law at the moment it paid, or a post that cites the law. One rule, all 56 places: the same attribution in every drawn town.

**Done when.** `scripts/law-wiring/check.ts` no longer counts the day loop (`src/core2/life.ts`) as a reader whose transfers are a law's direct money, shown in a played world (buildBenchWorld) by rerunning the government family in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8). Each law's money cell then names a post that cites the law, a post by its own engine, or untraced posts that a declaration may override.

**Files.** scripts/law-wiring/check.ts, scripts/law-wiring/matrix.ts

**Notes.** From the laws lead, Oct 24, reading the money evidence of PR #5582's year runs.
