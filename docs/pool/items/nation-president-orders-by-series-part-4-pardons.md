---
id: nation-president-orders-by-series-part-4-pardons
title: "A presidential pardon ends a federal sentence, because the justice engine records which sovereign prosecuted"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: justice-federal-case-stream
blocked-on:
lead: nation
model: opus
effort: medium
root: rc7-player-cannot-drive
source: split from nation-president-orders-by-series in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** `pardonable` in src/core2/office-day-federal-president.ts returns nothing (stopgap SG-OFFICE-FED-pardons) because the justice engine tries every crime under the state's law, so there is no federal conviction to pardon. Once the justice engine records which sovereign prosecuted, a President may pardon offenses against the United States only (U.S. Const. art. II, sec. 2, cl. 1), through the executive engine. This is part 4 of nation-president-orders-by-series. Feeds: nation-president-orders-by-series

**Cause.** Found in code: `pardonable` (line 985) in src/core2/office-day-federal-president.ts returns an empty list and registers SG-OFFICE-FED-pardons.

**Fix.** Read the sovereign recorded on each conviction (from justice-federal-case-stream), list the federal convictions as pardonable, and make a pardon end the federal sentence through the executive engine.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One executive engine: pardons are an executive act through the same path. The chain is the acceptance: conviction, pardon, sentence ended, by record id. No dice: the President decides from their own view.

**Done when.** A second session, not the builder, plays a world with federal cases (a drawn place, seed named) and sees a President pardon a named federal conviction and that person's sentence end on the pardon's date, by record id, while a state conviction is not offered.

**Waits on.** justice-federal-case-stream (open): it must record which sovereign prosecuted.

**Files.** src/core2/office-day-federal-president.ts, src/core2/modules/executive.ts, src/core2/modules/president-acts.ts
