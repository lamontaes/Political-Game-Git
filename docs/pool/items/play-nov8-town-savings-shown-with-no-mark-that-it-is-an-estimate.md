---
id: play-nov8-town-savings-shown-with-no-mark-that-it-is-an-estimate
title: "Budgets shows a town's Savings as a plain figure, though day one's amount is an estimate drawn from one state's towns ($318.1M in the owner's Nov 8 playtest, Manchester, Connecticut)"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, point C22, partly fixed)
---

**What.** The owner, Nov 8, about 2:10 p.m. Eastern (v0.94.0, Manchester, Connecticut; docs/coordination/playtest/2026-11-08-1-verbatim.md), on Budgets: "Why is there no money in the education? Like, I can't really see any information about any of this stuff." The CTO's note on the same screenshot (point C22): "'Higher education $0' and 'Savings $318.1M' for a town; 'in force at the opening' is dev text." Two of the three parts are fixed on main: a line the government spends nothing on is no longer listed, and the words "in force at the opening" are gone (`budgets()` in `src/bench/play.mjs`, lines 3611 and 3768). What main still does, read in code on Nov 10, not measured: the Savings row prints the cash in the government's accounts (`typedRow(words.savings, ...)`, line 3738; `cashMinor` in `src/bench/budget.ts`, line 131). On day one that cash is the opening stock from `fundOpeningTreasury` in `src/core2/modules/budgets.ts` (line 572), an estimate under stopgap SG-WORLD-government-opening-fund-balance whose own source file says "Local observations cover Michigan only" (`data/research/money/treasury-opening-cash.json`). The screen shows it as a settled fact, with no mark that it is an estimate and no way to see what it is measured against. Fix the class for every government in every place: a figure the player sees that starts from an estimate is marked as one, in the worded way the other screens use, until play has replaced it.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: a value a player can see starts from the real average with a per-world spread and is marked as an estimate with its source, which the Savings row does not do. One rule, all 56 places: the mark and the source come from the calibration's own record for that kind of government, never from a list of places. The Coordinator's Nov 8 call on Metrics (OWNER-DECISIONS, the night Coordinator's calls) is the pattern to follow: "'Last year' is the opening's source figures, marked as estimates."

**Done when.** A different session starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named in the proof), opens Politics, then Budgets, and takes a screenshot at 1440×900 of the town's (or county's) page on day one. The Savings row must be marked as an estimate in words a player would use, with no stopgap id or file name on screen. The proof gives, for that government, Savings divided by a year's Coming in, beside the range the calibration file allows for that kind of government, and names the government's record id. The session then plays twelve months with Week and takes a second screenshot: the proof says whether the row still carries the mark and why (which record replaced the estimate, or that none has). The same two screenshots are taken for the state's page. The check is then repeated in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro. The owner plays it: he opens his town's budget and can tell that the savings figure is the game's starting estimate, not something a council decided.

**Files.** src/bench/play.mjs, src/bench/budget.ts, src/core2/modules/budgets.ts, data/research/money/treasury-opening-cash.json, src/bench/data/controls.json

**Notes.** From the Nov 8 playtest, point C22 (docs/coordination/playtest/2026-11-08-1.md) and its row in `2026-11-08-1-check.md` (Check B): "Savings = cash in the town's accounts, opened at Michigan general-fund medians, 0.38 to 1.47 of a year's revenue; the code's own reserve is 1.2 months"; root cause there: "Opening stock calibrated on the wrong base"; owner: Money. Since the check, cash above the reserve is swept monthly (the check's own note), so the figure may fall through the first year; that is the reason for the second screenshot. Whether the opening stock itself is too large for towns outside the sample is a research question for the money lead (`.agents/skills/researcher/SKILL.md`: source local fund balances beyond one state, replacing the stopgap), and should be its own item once the proof above gives numbers from three drawn places; this item only makes the screen honest about what it shows. Marked done, related: world-government-opening-fund-balance (the opening stock exists so first closes can pay). Related open: play-budgets-every-government-political-process-style (the look of Budgets, the owner's point P28). Not verified: nothing here was measured in the running game on Nov 10; the $318.1M is from the owner's Nov 8 screenshot as the CTO recorded it.
