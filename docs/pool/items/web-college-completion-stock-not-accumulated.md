---
id: web-college-completion-stock-not-accumulated
title: "The higher education line's college completion effect is applied once as a level, not added each year to the stock of graduates"
area: laws
kind: bug
priority: 3
size: S
status: open
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
---

**What.** The link `higher-education-spending-to-college-completion` (data/research/outcome-web/links.json, size 0.000113, phased in over 24 months) is sized from Deming and Walters 2017: 0.46 percent more bachelor's degrees a year for each percent of spending, which its anchor converts to 0.0113 percent of the stock of adults with a degree "in each year the extra spending lasts". The outcome web applies a link as a level: it averages the cause over the phase-in months and multiplies by the size (`src/core2/modules/outcome-web.ts`, `phasedCause`, and `src/core2/outcome-web-model.ts`, the shape switch), so a lasting raise lifts the share once, by 0.0113 percent per percent of spending, and never adds the next year's graduates. The long-run effect is understated by the number of years the raise lasts (found by the laws lead in the health and schools PR body review, Oct 25).

**Cause.** Found in code: src/core2/modules/outcome-web.ts phasedCause (line 507) averages the cause over the phase-in months and src/core2/outcome-web-model.ts (switch on link.shape.kind, line 401) multiplies by the size, so higher-education-spending-to-college-completion (data/research/outcome-web/links.json, line 6588, size 0.000113, from Deming and Walters 2017) lifts the share once and never adds each year's graduates.

**Fix.** Add a stock shape (yearly flow added to the kept stock) to the link model and use it for this link; list in the PR any other link whose outcome is a stock.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Research before building: the yearly flow comes from the cited study, and the stock follows from it; real data checks the totals. One rule, all 56 places. An effect is a read: whichever engine reads the completion share sees the accumulated stock.

**Done when.** A second session holds a raise of the higher education line for three played years in buildBenchWorld in a drawn place (place and seed named) and sees school.college-completion-pct move by about three years' worth of the link's yearly addition, not one, shown by the web's month-row record ids; the outcome web tests pass.

**Waits on.** Nothing.

**Files.** src/core2/modules/outcome-web.ts, src/core2/outcome-web-model.ts, data/research/outcome-web/links.json

**Notes.** From the laws lead, Oct 25. The same level-versus-stock question may apply to other links whose outcome is a stock; list them in the PR.
