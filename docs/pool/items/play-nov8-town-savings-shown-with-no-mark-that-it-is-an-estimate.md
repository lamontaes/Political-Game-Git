---
id: play-nov8-town-savings-shown-with-no-mark-that-it-is-an-estimate
title: "Budgets shows a town's Savings as a plain figure, though day one's amount is an estimate drawn from one state's towns ($318.1M in the owner's Nov 8 playtest, Manchester, Connecticut)"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-play-nov8-town-savings-shown-with-no-mark-that-it-is-an-estimate
pr: #8598
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: none
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, point C22, partly fixed)
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:34:04.157Z
---

**What.** The owner, Nov 8, about 2:10 p.m. (v0.94.0, Manchester, Connecticut), on Budgets: "I can't really see any information about any of this stuff." The CTO's note (point C22): a town shows "Savings $318.1M" and dev text. Two of the three parts are fixed (a line the government spends nothing on is no longer listed, and "in force at the opening" is gone). The Savings row still prints the cash in the government's accounts, and on day one that cash is an opening estimate from one state's local observations, but the screen shows it as a settled fact with no mark that it is an estimate. A figure the player sees that starts from an estimate should be marked as one, in words, until play has replaced it.

**Cause.** Found in code: src/bench/play.mjs (line 3744) draws `typedRow(words.savings, roundedMoney(books.cashMinor))` and `cashMinor` comes from src/bench/budget.ts (line 131). Day one's cash is `fundOpeningTreasury` in src/core2/modules/budgets.ts (line 572), an estimate under stopgap SG-WORLD-government-opening-fund-balance (src/core2/data/stopgaps/world.json) whose source file data/research/money/treasury-opening-cash.json says local observations cover Michigan only. The $318.1M is from the owner's screenshot as the CTO recorded it, not re-measured.

**Fix.** Mark the Savings row as the game's starting estimate in a worded control name (src/bench/data/controls.json) until play has replaced the opening stock, with the mark and source read from the calibration record for that kind of government, never from a list of places. Whether the opening stock itself is too large for places outside the sample is a research question for the money lead, to be filed as its own item once the proof gives numbers from three drawn places.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: a value a player can see starts from the real average with a per-world spread and is marked as an estimate with its source, which the Savings row does not do. One rule, all 56 places: the mark and the source come from the calibration's own record for that kind of government, never from a list of places. Owner's Nov 8 call on Metrics (OWNER-DECISIONS): "'Last year' is the opening's source figures, marked as estimates."

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named), opens Politics, then Budgets, and takes a screenshot at 1440x900 of the town's (or county's) page on day one: the Savings row is marked as an estimate in words a player would use, with no stopgap id or file name on screen. The proof reports, for that government, Savings divided by a year's Coming in beside the figure the calibration file gives for that kind of government, and names the government's record id. It then plays twelve months with Week and takes a second screenshot, and the proof says whether the row still carries the mark and why (which record replaced the estimate, or that none has). The same two screenshots are taken for the state's page, and the check is repeated in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/budget.ts, src/core2/modules/budgets.ts, data/research/money/treasury-opening-cash.json, src/bench/data/controls.json

**Notes.** From the Nov 8 playtest, point C22 (docs/coordination/playtest/2026-11-08-1.md) and its row in `2026-11-08-1-check.md` (Check B): "Savings = cash in the town's accounts, opened at Michigan general-fund medians, 0.38 to 1.47 of a year's revenue; the code's own reserve is 1.2 months"; root cause there: "Opening stock calibrated on the wrong base"; owner: Money. Since the check, cash above the reserve is swept monthly (the check's own note), so the figure may fall through the first year; that is the reason for the second screenshot. Whether the opening stock itself is too large for towns outside the sample is a research question for the money lead (`.agents/skills/researcher/SKILL.md`: source local fund balances beyond one state, replacing the stopgap), and should be its own item once the proof above gives numbers from three drawn places; this item only makes the screen honest about what it shows. Marked done, related: world-government-opening-fund-balance (the opening stock exists so first closes can pay). Related open: play-budgets-every-government-political-process-style (the look of Budgets, the owner's point P28). Not verified: nothing here was measured in the running game on Nov 10; the $318.1M is from the owner's Nov 8 screenshot as the CTO recorded it.
