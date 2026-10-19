---
id: world-corporate-office-staff-never-paid
title: "A county business-services office's staff are never paid: the regional office holds no cash and has no parent firm paying it"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/corporate-office-staff-paid
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T03:04:27.797Z
---

**What.** A county business-services office's staff are never paid: the regional office holds no cash and has no parent firm paying it, so its workers show wages owed and no pay. Give such an office the money its work earns, or have its parent company pay it, so payday moves real dollars to its staff. The same fix applies to every office of this kind, not only the one found.

**Rules.** Wire to the world: the office's payroll is paid from its own cash or its parent's, and the same dollar leaves that account. No dice: pay follows the employer's cash and the wage owed, never a roll.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and seed the builder did not choose, every worker of a county business-services office is paid on each payday by journal record id from the office's or its parent's account, none is owed more than one pay period, and a test in src/core2 states it.

**Files.** src/core2/modules/business.ts, src/core2/modules/work.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
