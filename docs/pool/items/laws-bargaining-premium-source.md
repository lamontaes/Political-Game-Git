---
id: laws-bargaining-premium-source
title: "Confirm the sourced public-sector union wage premium behind the bargaining law's 5 percent estimate"
area: laws
kind: research
priority: 3
size: S
status: in-pr
claimed-by: claude/bargaining-premium-source
pr: #5201
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:24:40.039Z
---

**What.** The public-sector bargaining law (PR for `laws-outcome-labor-cannabis`) moves public workers' pay toward an estimated 5 percent union premium over three years, citing Belman and Heywood without an exact source. This item confirms what a sourced premium would be. It is research only: it changes no code, and the PR that owns the number keeps it tagged ESTIMATED until a page-level citation is in hand.

**Rules.** Research before building: real data checks the simulation and never picks one actor's outcome. Estimate, never UNKNOWN: the premium stays an ESTIMATED value with its source and spread, not a bare number. This is a game, not a spreadsheet: the premium is a calibration of pay, not a step the player takes.

**Done when.** The finding below names the paper and what it does and does not say, so the PR that uses the 5 percent can cite it exactly or keep it ESTIMATED, and no test in a drawn place is needed because no code changes. The owner plays it: nothing at once.

**Files.** docs/pool/items/laws-bargaining-premium-source.md

**Notes.** Searched Oct 19, 2026 (standard web search, no paper full text opened).

Not confirmed: no source found that gives a public-sector union wage premium of 5 percent. What was found: (1) Belman, Heywood and Lund, "Public Sector Earnings and the Extent of Unionization," Industrial and Labor Relations Review 50(4), 610-628 (1997), 1991 CPS data: higher public-sector union density is linked to higher earnings for state and local workers, covered and not covered, and the effects are larger than typical private-sector estimates; the abstract gives no percentage. (2) Bender and Heywood (2011), with unionization controlled for, put state and local pay below comparable private pay by about 11 percent, which is a level gap, not a union premium. (3) Reviews call the literature mixed: small premiums in some studies, penalties in others once education and experience are controlled. (4) An Economic Policy Institute figure of 10 to 15 percent less for state and local workers than comparable private workers was found second-hand, also a level gap.

So the 5 percent is a modeling choice inside a range the literature does not pin down. Recommended handling: keep it ESTIMATED, cite the 1997 paper as the direction (union density raises public pay more than private), state the spread as 0 to 10 percent until someone reads the paper's tables, and have the owner of the bargaining PR make the premium a function of union density, which the paper's finding supports, not a flat number.
