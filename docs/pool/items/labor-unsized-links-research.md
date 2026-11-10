---
id: labor-unsized-links-research
title: "Source a size for four labor links that have none: transit loss, broadband, incentive deals and more immigrants"
area: core
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: researcher
standard: 2
model: sonnet
effort: medium
root: none
source: stand-in triage of labor.json, Nov 10, 2026 (SG-LABOR-unsized-links)
---

**What.** Four cause-and-effect links from public policy to jobs have no researched size the game can apply: transit loss to unemployment, broadband to employment, incentive deals to industry jobs, and more immigrants to the workforce. Find each link's size from published studies, with its range, so the jobs engine can later read them. The fifth link on the stand-in, a Medicaid work requirement's effect on employment, is measured at about zero and stays unwired by design.

**Cause.** Found in code: src/core2/outcome-web-labor-waiting.test.ts line 29 names the four links under SG-LABOR-unsized-links, and src/core2/jobs-web.ts line 400 (`markUnwiredLaborLinks`) marks them where the jobs engine runs. Each is listed in src/core2/data/outcome-web/unwired.json with no size.

**Fix.** For each link, fetch and quote at least one study that measures the effect (a size, a lag and a range), record the size, lag, range and citation in the link's row in src/core2/data/outcome-web/outcome-web.json tagged SOURCED or ESTIMATED, and say for each whether the cause is a record any engine keeps today (transit access, a deal record, a broadband record, a count of new immigrants). Where no study gives a usable size, write that, with what was searched. Wire nothing.

**Time box.** 5 hours for one Sonnet session.

**Rules.** Research before building: real data calibrates the simulation and never decides an outcome. Every number in a parameter table tagged SOURCED (with citation) or ESTIMATED (with source and spread). Quote from pages actually fetched (skill `researcher`).

**Done when.** A second session reads the four rows and, for each, sees a size, lag and range with a quoted source, or a stated reason none exists, and confirms the quotes on the cited pages. A second session also runs `npx vitest run src/core2/outcome-web-labor-waiting.test.ts` and sees it pass with the rows changed, and in a drawn place with a seed nobody chose (both named) opens the jobs engine's measures and sees the four links still unread, so nothing was wired by accident.

**Waits on.** Nothing.

**Files.** src/core2/data/outcome-web/outcome-web.json, src/core2/data/outcome-web/unwired.json, src/core2/outcome-web-labor-waiting.test.ts, src/core2/data/stopgaps/labor.json
