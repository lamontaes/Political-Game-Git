---
id: world-opening-month-pays-rent-before-any-pay
title: "Every household's first month pays rent and bills before any pay, so the world opens a month poorer"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: world-kin-households-open-with-no-cash
blocked-on:
root: day-one-in-motion
lead: money
model: sonnet
effort: medium
source: "found by T54 measuring renters for world-counted-renters-buy (#9117), Nov 15; Account lead's ruling 08:52Z and 08:58Z: a day-one-in-motion fault, built after #9465 folds"
---

**What.** A world opens as if every household's pay starts on the day the world is built. The rent, groceries and premiums due in the first weeks are paid, but the pay a worker earned in the pay period already running has no payday, so the first month is a month of bills and little or no pay. A real household on any day is somewhere in its pay cycle, with its next paycheck already earned in part. Seen: in dev mode, a town's renters' balances on the player's first days are far below where they sit the same day of the month half a year later.

**Cause.** Measured at Bastrop, Louisiana (place 2204685, the seed `drawPlace("c3", "home-price-paths")` gives, world seed 452a3c32cb1dec08db7647f6288fecab595bf56002a3112926e035d4f043a7c0), on the Train at 3b168daf with the game's 31-day warm-up: the town's counted renters hold $1,186 per household on Jan 21 and $321 on Feb 1, then $303, $325, $446, $573 and $695 on the first of each month to Jul 1, and $1,131 on Aug 1. Without the warm-up the fall is $1,416 to $20 on Feb 1. Rent is about $1,200 a month against wages of about $1,400 to $1,550. Found in code, to confirm: the opening's employer pay calendars (src/core2/opening-payroll-calendar.ts, from data/opening-payroll-calendar.json) start each payroll's first period at the opening, paid after its lag, so the part of the period earned before the world's first day is never paid, while the rent and living-cost flows bill from the first day. The day-one-in-motion skill's one mechanism, the warm-up, runs the same days later and only hides the fall from the player; the Account lead ruled it is not the fix.

**Fix.** A household on day one holds the pay it would have earned before day one, from its own pay calendar: each payroll's first payday after the opening pays its whole period, the days before the opening included, from the employer's books (or the place's outside account for unplaced and outside work, as the regular paydays do), so every dollar balances. No flat top-up, no new parameter, no second engine. First step: at the seed above, follow one counted renter's wage flow from the opening to its second payday and record each payday's period and amount against a full period's pay.

**Time box.** 5 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Day one is in motion. One model, two tiers: full and counted workers are paid by the same calendar rule. Every dollar balances. One rule, all 56 places.

**Done when.** A test pinned at Bastrop with the seed above shows a counted worker's first payday paying its whole period, by flow id. Renters' balances per household at the world's start, at the player's day one and on Aug 1, before and after, at three named places with their seeds, are in the pull request body, with July renters able to cover a down payment before and after and year 1 time per record. A second session sees in dev mode, at a drawn place it names with its seed, renters' balances on the player's first days within the range they hold later in the year.

**Waits on.** world-kin-households-open-with-no-cash (#9465) to fold into the Train.

**Files.** src/core2/opening-payroll-calendar.ts, src/core2/work-pay-period.ts
