---
id: world-opening-husks-in-town-hold-no-cash
title: "In a very small town 13 of 36 resident adults are husk-tier kin living in town with no cash (Golconda, Nevada, seed b90e85374cbb0b64)"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** GOLDEN_PATH_SEED=b90e85374cbb0b64 npx vitest run src/core2/opening-adults-cash.test.ts fails on clean main in Golconda, Nevada: 14 of 36 resident adults hold no cash, account or deposit, 39 percent against a bound of 26 percent. Thirteen of the 14 are husk-tier relatives of town residents whose records place them in the town (the test counts a husk as a resident when it lives in town), and one is a weekly-tier 18-year-old with no job. In a town this small the kin generator places many relatives locally and husks hold no wallet until they are met. Decide whether an in-town husk is a resident who should open with a wallet like a counted household member, or a relative the test should list as unmet, and make the records and the test agree.

**Rules.** One model, two tiers: a counted or husk adult who lives in town is read by the same rules as a full resident, times their count, so a resident should not be the only tier without money. Estimate, never UNKNOWN: a wallet a player can see starts from the real average, marked ESTIMATED with its spread.

**Done when.** In the played world (buildBenchWorld) with GOLDEN_PATH_SEED=b90e85374cbb0b64 and in two further drawn places, src/core2/opening-adults-cash.test.ts passes, and each husk living in town either holds cash by record id or is named in the test explained list with its pool item.

**Files.** src/core2/opening-adults-cash.test.ts, src/core2/population.ts, src/core2/opening-kin.ts

**Notes.** Found Oct 19 sweeping src/core2 tests m to o on clean main: 1 failure in 448 tests. The same sweep lost 7 vitest workers ("Worker exited unexpectedly"), which looks like memory under three parallel workers, not a defect. The central bank board missing cash is world-central-bank-board-opening-cash (#5202), a different failure.

Root cause Oct 20 (claude): the zero-cash residents in Golconda, Nevada (seed b90e85374cbb0b64) were not husks: 13 were the state cabinet heads (`person:cabinet:US-NV:*`, made in `seatCabinetPerson`, monthly tier, each on a state payroll job) and one a weekly-tier 18-year-old; the husks were already in the test's explained group. Fixed by giving cabinet appointees at the opening the SCF median balance for their post's pay, as press staff get (`openingLiquidMinor`). The 18-year-old with no job (born 2007) is under the test's bound.
