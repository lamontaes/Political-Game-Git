---
id: people-past-economy-by-year
title: "A person's working life before the world's window reads a sourced national series of unemployment and earnings by year, not the first month's economy"
area: people
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
standard: 2
lead: lives
model: sonnet
effort: medium
root: none
source: stand-in triage, Nov 10, 2026 (SG-PEOPLE-whole-past-first-month-economy)
claimed-at:
---

**What.** The years of someone's working life before the world starts are run as if the economy had stood at its first month: layoffs at the steady rate with no rise, and pay at that month's level. Real years had recessions, and pay was lower decades ago. Give the run a coarse national series by year.

**Cause.** Found in code: src/core2/past-work.ts line 521 (function runPastWork, marker SG-PEOPLE-whole-past-first-month-economy) and monthOn at line 169, which returns the first month for any date before the window.

**Fix.** Fetch and quote BLS national annual unemployment rate (from 1948) and average hourly earnings (from 1964, earlier years from the nearest sourced series, marked ESTIMATED), store them as one small data table by year tagged SOURCED, and have monthOn use the year's row before the window so past layoffs rise in bad years and past pay moves back by the national earnings of that year. By counts, once at the opening: no new loop.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building. No dice: the layoff rate is the series, never a roll on one person. Every number tagged. One rule, all 56 places. Speed bar: the opening may not run more than 20 percent slower.

**Done when.** A second session, in a played world in a drawn place (seed named), finds the series file with its sources quoted, an adult's past layoffs and past pay differing between a recession year and a boom year by record id, the opening no slower than 20 percent over base on the same machine, and SG-PEOPLE-whole-past-first-month-economy resolved in src/core2/data/stopgaps/people.json.

**Waits on.** Nothing.

**Files.** src/core2/past-work.ts, src/core2/data/stopgaps/people.json

**Notes.**
