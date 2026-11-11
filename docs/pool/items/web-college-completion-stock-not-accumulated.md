---
id: web-college-completion-stock-not-accumulated
title: "The higher education line's college completion effect is applied once as a level, not added each year to the stock of graduates"
area: laws
kind: bug
priority: 3
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The link `higher-education-spending-to-college-completion` (data/research/outcome-web/links.json, size 0.000113, phased in over 24 months) is sized from Deming and Walters 2017: 0.46 percent more bachelor's degrees a year for each percent of spending, which its anchor converts to 0.0113 percent of the stock of adults with a degree "in each year the extra spending lasts". The outcome web applies a link as a level: it averages the cause over the phase-in months and multiplies by the size (`src/core2/modules/outcome-web.ts`, `phasedCause`, and `src/core2/outcome-web-model.ts`, the shape switch), so a lasting raise lifts the share once, by 0.0113 percent per percent of spending, and never adds the next year's graduates. The long-run effect is understated by the number of years the raise lasts (found by the laws lead in the health and schools PR body review, Oct 25).

**Cause.** Found in code: decideCollege in src/core2/school-outcomes.ts (line 670) decides each graduating class's degrees and multiplies the completion rate by the web's factor (`webReach` at line 744), so the link higher-education-spending-to-college-completion now reaches each year's graduates. The measure school.college-completion-pct, the share of adults with a bachelor's degree, is still the outcome web's own number (its 2024 base times the links' factors): the degrees decided each year are never summed into it. That is the open stopgap SG-SCHOOL-college-stock-ledger in src/core2/data/stopgaps/school.json (line 30), which names this item as its replacement. The link's row in data/research/outcome-web/links.json (line 6588) still carries status outcome-not-produced.

**Fix.** Read the measure from people: the share of a place's adults 25 and older whose schooling record is a bachelor's or more (`schoolingOn` in src/core2/modules/jobs.ts), people who opened the world from the education they were generated with and graduates in play from their decided degree, a counted household's adults times its weight. The outcome web keeps no copy of the number and reads this one. Close SG-SCHOOL-college-stock-ledger, set the link's status in links.json to what the effect matrix (scripts/outcome-web/effect-matrix.ts) then grades it, and list in the pull request any other link whose outcome is a stock kept only as the web's number. Add no new link shape.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Research before building: the yearly flow comes from the cited study, and the stock follows from it; real data checks the totals. One rule, all 56 places. An effect is a read: whichever engine reads the completion share sees the accumulated stock.

**Done when.** A second session holds a raise of the higher education line for three played years in buildBenchWorld in a drawn place (place and seed named) beside the same world left alone, and sees school.college-completion-pct in the raised world above the other by the degrees the extra graduates hold, each named by the school engine's record id, with the measure equal to the share counted from people's schooling records; SG-SCHOOL-college-stock-ledger is closed and the outcome web tests pass.

**Waits on.** Nothing.

**Files.** src/core2/school-outcomes.ts, src/core2/modules/outcome-web.ts, src/core2/modules/jobs.ts, src/core2/data/stopgaps/school.json, data/research/outcome-web/links.json

**Notes.** From the laws lead, Oct 25. The same level-versus-stock question may apply to other links whose outcome is a stock; list them in the PR. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): it changes how one college-completion measure accumulates over years; no player reads it.
