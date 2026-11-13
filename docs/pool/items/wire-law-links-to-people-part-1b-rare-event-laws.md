---
id: wire-law-links-to-people-part-1b-rare-event-laws
title: "Seven laws are wired in code but reach nobody in a checker run: the disaster share, the debt limit and the contribution limits"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: wire-law-links-to-people-part-1-partly-wired-laws
blocked-on:
lead: laws
model: opus
effort: medium
root: none
source: split from wire-law-links-to-people-part-1-partly-wired-laws by opus-5234, Nov 11, 2026 (the seven of the 31 left at its time box; PR 8523)
---

**What.** Seven of the 31 partly-wired laws still grade partly in docs/reports/law-wiring-matrix.json although an engine reads each: us-federal-positions:emergencies.states-share-disaster-costs, us-federal-positions:budget.pay-for-a-higher-debt-limit, federal-campaign-contribution-limit and the four state-contribution-limit-* rows (governor, state-senate, state-house, local). The other 24 were wired or registered in PRs 8765, 8775, 8780, 8781, 8782 and 8785. Seen: each reaches a named person, organization or government in a checker run, or carries a specific stopgap.

**Cause.** Found in code: each reader records its reach only when its event happens, and the checker's runs hold no such event. The disaster share is applied in `declare` (src/core2/modules/disasters.ts line ~481) only on a declaration day. The debt limit binds in `borrowFederal` (src/core2/budgets-treasury.ts line ~975) only once borrowing reaches the scaled statutory limit, and records no reach when it does. The contribution limits record `gift-held-to-the-limit` in `donationAnswer` (src/core2/modules/campaigns.ts line ~3388) only when an asked donor would give past the limit, and the campaigns ask only full people in the town's own races. PR 8523's checker now lowers the five limits to a tenth: in Peacham, Vermont (seed 5b7f20c9e1a43d68) the local limit then holds back 29 donors (all full people), and the state and federal limits reach nobody (no state or federal race asked a town donor in the window).

**Fix.** Disaster share: run the checker with `--days` in a drawn place with a declaration inside the window (the disasters engine's own records name one), or declare its reach on SG-LAWS-disaster-share-size. Debt limit: record the reach in `borrowFederal` on the federal government when the limit holds borrowing back (`lawApplied`, target `government`), and run the checker past a binding month. Contribution limits: have the state and federal races' campaigns ask the town's donors (full and counted, one model, two tiers) through `donationAnswer`, or register a stopgap naming that gap. Then regenerate the matrix.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the reach is a record an engine writes when it decides or pays, by record id. One model, two tiers: counted donors are asked by the same rule as full ones. A missing reader is a registered stopgap naming the engine, not a new mechanic.

**Done when.** The regenerated docs/reports/law-wiring-matrix.json grades each of the seven wired or stopgapped, and `scripts/law-wiring/check.ts --only <key>` in two drawn places (places and seeds named) shows the reach by record id for each one wired; then a second session in the running game passes one of them through dev mode's bill page in a drawn place and reads "Who it reached" naming the donors, governments or Treasury it held, by record id.

**Waits on.** wire-law-links-to-people-part-1-partly-wired-laws (PR 8523, the checker's lowered caps).

**Files.** src/core2/modules/disasters.ts, src/core2/budgets-treasury.ts, src/core2/modules/campaigns.ts, scripts/law-wiring/check.ts, docs/reports/law-wiring-matrix.json
