---
id: web-research-unsized-links
title: "Find a size, or a reason there is none, for the five outcome links that have no usable slope"
area: world
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "stand-in triage of the web register, Nov 10 (docs/stopgaps/triage-2026-11-10/web.md)"
claimed-at:
after:
standard: 2
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
lead: laws-effects
---

**What.** Five researched links move nothing because no size the game can apply was found: energy price to air-conditioning use, a newspaper closing to a county's borrowing cost, press attacks to media trust, preparedness spending to disaster damage, and student-debt relief to household debt. Find each size from pages actually fetched and quoted, or record that none exists. Closes SG-WEB-unread-housing-ac-share, SG-WEB-unread-gov-borrowing-cost, SG-WEB-unread-press-media-trust, SG-WEB-unread-disaster-damage and, for the student-debt link, part of SG-WEB-unread-finance-past-due-debt; part of SG-WEB-housing-links-unsized (the air-conditioning half).

**Cause.** Found in code: src/core2/data/outcome-web/unwired.json lists them (lines 50, 200, 206, 218, 245); data/research/outcome-web/links.json gives each `status: size-not-set` with its reason (no slope; a unit adapter missing; the effect shown only as a headline figure).

**Fix.** For each link, search for a published slope (an elasticity, a dollar or percent per unit), fetch and quote the page, and write `size`, `range`, `sizeSource` and the unit adapter it needs into links.json, tagged SOURCED or ESTIMATED. Where no study sizes it after a real search, write that in `notes` and mark the link `about-zero` or `no-size-found` so the stand-in is a documented estimate and not an open gap. Regenerate unwired.json with scripts/outcome-web/write-unwired.ts and keep src/core2/outcome-web-unwired.test.ts green.

**Time box.** 6 hours.

**Rules.** Research before building: real data checks the simulation and never decides an outcome. Sourced or marked estimate, never a typed number.

**Done when.** Each of the five links has a sized, sourced row or a written no-size finding, the unwired list and its test agree, and a second session, in a drawn place and seed it chose (named), plays a year with one sized link's cause moved and sees the web month record move its outcome by the quoted size, and reads each row's quoted page and finds the size matches it.

**Waits on.** Nothing.

**Files.** data/research/outcome-web/links.json, src/core2/data/outcome-web/unwired.json, scripts/outcome-web/write-unwired.ts, src/core2/data/stopgaps/web.json
