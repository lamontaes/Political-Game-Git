---
id: laws-outcome-justice
title: "Justice and public safety laws (civilian oversight, immigration partnership, cash bail, juvenile age, child access, concealed carry, handgun age, stand your ground) reach people as a read"
area: laws
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-v8txtd
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:54:42.984Z
---

**What.** Eight justice and public safety laws (civilian oversight, immigration partnership, cash bail, juvenile court age, child access prevention, concealed carry, handgun purchase age, stand your ground) are group A policies whose mechanic is none, so each is a record on people or departments that no engine reads. The justice engine (modules/justice.ts) handles only corruption cases, with no arrests, bail, firearms or juvenile court, so each law needs a real reader before it can change anyone. Split this item into one sub-item per law family, each with the engine that reads it.

**Rules.** An effect is a read: another engine must read the law when it decides or pays, not a record beside it. No dice: outcomes follow traits, money and the law in force. The chain is the acceptance: law, record, payment or decision, person, view, journal line. Replace, never layer: a law's record is deleted where an engine reads it.

**Done when.** For each sub-item, in a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) the law record id, the decision or payment it changed, and the named person it reached appear, proven by a test in src/core2/law-reach-group-a.test.ts.

**Files.** src/core2/data/laws/reach-group-a.json, src/core2/modules/justice.ts, src/core2/law-reach/group-a.ts

**Notes.** Examined Oct 19 by the Medicaid session (PR #5179): not buildable as one M item. Stopgaps SG-GOV-REACH-A-pretrial, SG-GOV-REACH-A-stand-your-ground and SG-GOV-REACH-A-police-oversight name what is faked. Cash bail and juvenile age need arrests and custody decisions first.
