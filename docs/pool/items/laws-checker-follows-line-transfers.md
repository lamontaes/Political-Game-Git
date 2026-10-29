---
id: laws-checker-follows-line-transfers
title: "The law checker follows a budget line's own transfers, so a line paid through the treasury's outside accounts shows its money"
area: laws
lead: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/laws-checker-line-transfers
pr: #6391
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T19:09:50.159Z
---

**What.** The corrections budget line's money grades partial in both audit towns: the town's treasury pays the line's workers and contractors elsewhere through `cash:outside-market:…` accounts, and the checker cannot see it. The justice helper traced it by hand (Oct 25, branch claude/laws-nine-links-justice): in Prescott, Michigan (seed a91c03e7d2b84f10), `journal:2025-02-01:1912` paid wages of $1,393.25 with the line raised against $1.08 without, and `:1913` paid contractors $750.21 against $0.58; in Uehling, Nebraska (seed 5e27b0c4196fd3a8), `journal:2025-03-01:8668` and `:8669` paid $1,651.03 and $889.01 against nothing. Two causes found: `accountIndex` in `scripts/law-wiring/check.ts` does not match a treasury id that contains colons (`cash:organization:treasury:place:…:residual`), and the treasury is a pooled account whose sums by date and kind barely move. Follow the transfers whose source id names the line (`…:corrections:<date>`), or extend the treasury-line tracer the taxes family added (`money.lines`) to a line law's own line, and map a counted worker to their household's group. Never weaken the own-payment rule.

**Rules.** An effect is a read, not a record. The chain is the acceptance: a dollar followed to whom it reached, by journal id, against the control world.

**Done when.** In the justice family's year runs in the two audit towns, `scripts/law-wiring/matrix.ts` grades budget-line:corrections money wired, naming the line's transfer by journal id with treatment and control amounts, and `scripts/law-wiring/own-payments.test.ts` (or a new checker test) has a case that fails without the change. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** scripts/law-wiring/check.ts, scripts/law-wiring/matrix.ts

**Notes.** Laws lead, Oct 25, from PR #6012.
