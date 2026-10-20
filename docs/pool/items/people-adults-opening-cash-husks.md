---
id: people-adults-opening-cash-husks
title: Adults open with cash and accounts, not as husks
area: people
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/adults-opening-cash
pr: #5140
after:
blocked-on:
milestone:
source: PR #4309 (1,002 of 1,289 adults with no cash); acting CTO ruling, Oct 19
claimed-at: 2026-10-19T20:05:29.273Z
---

**What.** At the opening most adults carry no cash and no accounts ("husks"), so campaign-day fundraising, rent and purchases read zeros wherever they touch those people. PR #4309 counted 1,002 of 1,289 adults in a drawn place with no cash at all. Every adult, full or counted, opens with cash and accounts estimated from the place's income distribution and their household's record, so the money engines read a real balance, not a blank.

**Rules.** Estimate, never UNKNOWN: a value a player can see starts from the real average with a per-world spread, so no adult's wallet reads zero for lack of a build. One model, two tiers: counted adults carry the same opening cash and accounts as full ones, read from the same place and household records. An effect is a read: fundraising, rent and purchases read the balance the opening wrote.

**Done when.** A drawn place opened with `buildBenchWorld` shows no adult with zero cash and no account unless their record says why (a child, an institutionalized person, a noted bankruptcy), and the share of adults with savings falls within the surveyed band for the place's income distribution, named by record id in the test output. A test names the place and the seed and fails on the first unexplained husk.

**Files.** `src/core2/opening-finance.ts`, `src/core2/opening-income.ts`, `src/core2/modules/residents.ts` (see `opening-resident-cash.test.ts`), `src/core2/data/opening-finance.json`.

**Notes.** From PR #4309's audit of adults with no cash; the acting CTO ruled on Oct 19 that this is a defect for the pool, not a board section.

Oct 20: PR #5140 merged to main: every adult who opens with no cash is explained and the residents' zeros sit inside the survey band.
