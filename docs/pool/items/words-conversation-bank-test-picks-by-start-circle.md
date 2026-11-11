---
id: words-conversation-bank-test-picks-by-start-circle
title: "The conversation-bank test picks its players by who they know on day one, which is only family, so on seed 11 none has anyone to talk to"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: words
source: Story session, Nov 10, checking PR #8151's gate; red on clean main at GOLDEN_PATH_SEED=11
claimed-at:
---

**What.** `src/english/mined/conversation-bank.test.ts` "words whole conversations in a generated place" fails on clean main at `GOLDEN_PATH_SEED=11`: "no adult had a whole conversation: person_4a07be4ca7548f78: 0 to talk to, 0 lines, 0 choices; …" for all five players tried. Cause, read in the population: on day one a full person's non-husk `knownIds` are their housemates only (seed words-conversation: three weekly housemates, everyone else a husk), so the test's `circle` (non-husk people known, housemates included) ranks players by household size. The talk itself skips housemates, so after a month lived the chosen players can have no one outside the home to talk to. Counting the circle without housemates does not help: on day one it is zero for every adult on seeds 11, 5, 41 and the default (tried on Nov 10, reverted).

**Rules.** One rule, all 56 places: the test must pass on any drawn place and seed, so it may not depend on a place having large households. Two-level population: the players' circles come from the people the world keeps whole after the month, not from husks.

**Done when.** The test ranks its players by who they know after the month it lives (the core's `knownIds`, outside the household, not husks), or lives the month once and picks from that, and passes on seeds 11, 5, 41 and the default; every line still cites its records.

**Files.** src/english/mined/conversation-bank.test.ts
