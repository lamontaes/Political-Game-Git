---
id: world-central-bank-board-opening-cash
title: "The central bank board's members open with a wallet"
area: world
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/political-game-pool-6qjq1s
pr: #5202
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:13:54.719Z
---

**What.** The central bank's board (a president and governors, `person:central-bank:*`) opens with no cash and no account, found by `src/core2/opening-adults-cash.test.ts`. They are named officials made by the world economy, with no household and no living costs. Give them a wallet from their pay, the way other officials get one, or record why they have none.

**Rules.** Estimate, never UNKNOWN: a value a player can see starts from the real average marked ESTIMATED with spread.

**Done when.** In a drawn place with `buildBenchWorld`, each central-bank board member holds cash or an account, and the group is removed from the explained list in `src/core2/opening-adults-cash.test.ts`.

**Files.** src/core2/central-bank-board.ts, src/core2/opening-adults-cash.test.ts

**Notes.** Found by people-adults-opening-cash-husks.
