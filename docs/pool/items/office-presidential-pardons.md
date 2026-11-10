---
id: office-presidential-pardons
title: "Presidential pardons the court and prison read"
area: office
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: office-presidential-orders-pardons-the-situation-room
source: added with npm run pool -- add
standard: 2
model: opus
effort: high
root: none
lead: governing
checked: fable 2026-11-10
---

**What.** A president's pardon is a choice that the court and prison must read, but pardonable() returns no one. The justice engine tries every crime under the state's law, so it records no federal conviction to pardon (stopgap SG-OFFICE-FED-pardons). Build a federal-sovereign case record in justice and a pardon the president grants from it, so a pardoned person leaves custody or their sentence ends. This item also takes the leftover of the closed order umbrella: a played President's own choice over federal orders (stopgap SG-NATION-federal-axis-proxy). The player notices it on the politics screen as a choice among people, never a form.

**Cause.** Found in code: src/core2/office-day-federal-president.ts pardonable() (line 985) registers SG-OFFICE-FED-pardons (src/core2/data/stopgaps/office.json, line 135) and returns no one, because the justice engine in src/core2/modules/justice.ts records no federal conviction.

**Fix.** Add a federal-sovereign case record in justice, let the president grant a pardon from it, and have the justice engine read the pardon when it holds or releases that person. Also give the played President a choice over federal orders, in place of the proxy in SG-NATION-federal-axis-proxy.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the court and prison read the pardon at the moment they hold or release someone. Ask why: each pardon keeps its reasons and the case record cited by id. No dice: when the player does not choose, the character decides from traits and the law. No hand-written player text: the pardon is worded by the English engine. Placeholders: SG-OFFICE-FED-pardons closes only when its reader exists.

**Done when.** A second session plays a President in a drawn place (buildBenchWorld, place and seed named), grants a pardon from a federal case record, and sees the named person's custody or sentence record change, by record id, with the justice engine reading the pardon. SG-OFFICE-FED-pardons is resolved naming its reader, and the played President can choose among the federal orders on the politics screen. A played-year test covers the pardon.

**Waits on.** Nothing. Its after: line names office-presidential-orders-pardons-the-situation-room, whose orders and situation room are already built on main (proposed for drop).

**Files.** src/core2/office-day-federal-president.ts, src/core2/modules/justice.ts, src/core2/modules/executive.ts, src/core2/data/stopgaps/office.json, src/core2/data/stopgaps/nation.json

**Notes.** TODO

Deferred Oct 25: nothing on screen reads it yet.

**Notes (Fable's check, Nov 10).** **Notes (Fable's check, Nov 10, proposed for the CTO).** Proposed: drop as a duplicate. Pardons are nation-president-orders-by-series-part-4-pardons (the same `pardonable` at line 985 and SG-OFFICE-FED-pardons), and the played President's choice over federal orders is nation-president-orders-by-series-part-3-played-president-orders. Nothing here is missing from those two.
