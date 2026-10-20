---
id: gov-bribe-offers-follow-reputation
title: "Bribe offers follow reputation: someone known to take bribes or trade favors for money draws many more requests"
area: gov
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/bribe-reputation
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:54:48.207Z
---

**What.** Owner ruling (Oct 20, #5333): zero offers in a plain year is fine, and offers follow reputation. Today the lobbyist's offer decision weighs only the offerer's temperament, the stake and the tie (considerBribe in src/core2/modules/corruption.ts). Add what the lobbyist has heard about the official: a person who took a bribe, or traded a favor for money, and whose act reached the lobbyist through news, a conversation or a notice, draws more offers from lobbyists who learned of it; an official nobody has heard anything about draws no more than before. The player would notice that a known-corrupt official is approached more often than an untouched one.

**Rules.** No dice: the offer follows what the lobbyist learned (a knowledge record with its source), never a percentage. Knowing is a read: cite how the lobbyist learned of the act. One rule, all 56 places. An effect is a read: the offer decision reads the knowledge record. Speed: act on the meeting day, no daily scan.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, an official whose taken bribe a lobbyist learned of (record id and how) draws an offer from that lobbyist whose decision values (kept on the meeting row, see gov-a-background-year-with-a-full-chain) include the reputation term, and an official the lobbyist heard nothing about shows the term as zero; a test in src/core2/interest-groups.test.ts reads both.

**Files.** src/core2/modules/corruption.ts,src/core2/modules/interest-groups.ts,src/core2/interest-groups.test.ts

**Notes.** TODO
