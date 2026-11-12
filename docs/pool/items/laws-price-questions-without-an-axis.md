---
id: laws-price-questions-without-an-axis
title: "Fare-free transit and retail electric choice have no left-right axis, so members and districts read them as zero"
area: laws
kind: research
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** A town member weighs a bill by their own views and their district's lean, both read as a person's lean times the question's axis (personStance in src/core2/campaign-views.ts:269). Fare-free transit and retail electric choice have no row in data/research/campaigns/issue-axes-2026.json, so questionAxis returns 0 and every member's views and constituents read 0.00 on those bills. A bill on either question passes or fails on deals and traits alone, never on what the members or their districts think of it. Seen: how each member and district reads on a fare-free transit or electric choice bill (shows 0.00 today).

**Cause.** Measured: in Wilmore, Kentucky (2183550), seed e9350ff3852b41efa1addf6048c381681375180a2b31417e580711934b7883dc, the county board enacted fare-free transit 4 to 3 with every member's views and constituents 0.00 (LAWS_E2E_SEED=a1 npx vitest run src/core2/laws-end-to-end.test.ts, PR #8260). The axes are the correlation across states between a question's recorded yes and the 2024 Republican share (the file's about line; minimumStates 20). Fare-free transit's starting law (data/research/laws/starting-law-2026/transportation-infrastructure.json) answers no in every place, so there is no variance to measure. Retail electric choice's answers were recorded Nov 8, 2026 (environment-energy.json), after the axes were last exported; the export script the file names, scripts/research/export-issue-axes.py, is not in the repository.

**Fix.** Add the retail electric choice row by the file's own method: the correlation across states between its recorded yes and the 2024 Republican two-party share (data/source/electoral-calibration-2024/corpus.json), with its states count and yesShare, written by a new scripts/research/export-issue-axes.py that recomputes every row the same way and leaves the other rows unchanged. For fare-free transit, which no state answer can measure, add an axis from a published poll's party split on free public transit (researcher skill: fetch and quote the page, record the source, mark it ESTIMATED with its spread). No engine code changes.

**Time box.** 3 hours

**Rules.** Research before building: the number is fetched and quoted, never typed (researcher). Estimate, never UNKNOWN. One rule, all 56 places: the axis is national, never per place.

**Done when.** A second session sees questionAxis nonzero for both questions with their sources in issue-axes-2026.json, then runs LAWS_E2E_SEED=<a new seed> npx vitest run src/core2/laws-end-to-end.test.ts in a drawn place (the test names the place and seed) and sees, in a bill on either question, members whose views or constituents read other than 0.00.

**Waits on.** Nothing.

**Files.** data/research/campaigns/issue-axes-2026.json, scripts/research/export-issue-axes.py (new)
