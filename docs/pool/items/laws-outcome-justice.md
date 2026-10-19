---
id: laws-outcome-justice
title: "Justice and public safety laws (civilian oversight, immigration partnership, cash bail, juvenile age, child access, concealed carry, handgun age, stand your ground) reach people as a read"
area: laws
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Eight justice and public-safety policies in src/core2/data/laws/reach-group-a.json still run the mechanic "none", which only writes a record: civilian oversight of police, partnering with federal immigration enforcement, ending cash bail, the juvenile court age, child access prevention, permit-to-carry, the handgun purchase age and stand your ground. Give each a real effect that another engine reads, such as who is held before trial, who may buy or carry, or what the police and jail engines do with a case. Where a policy truly has no money, person or place effect in the game, register it as a stopgap with the reason instead of leaving a silent record.

**Rules.** "An effect is a read, not a record": a policy counts only when a different engine reads it when it decides or pays. "The chain is the acceptance": follow one dollar or rule to a named person and the choice, view and journal line that moved.

**Done when.** A one-year run of buildBenchWorld in a drawn place (name and seed in the PR body) shows, for each policy here, the law record id, the payment, price or eligibility record that changed, the person record id reached and the knowing source, checked by a new test in src/core2/law-reach-balance.test.ts. The owner plays it: pass one of these laws and meet a neighbor it changed.

**Files.** src/core2/law-reach/group-a.ts, src/core2/data/laws/reach-group-a.json

**Notes.** Split from laws-outcome-map (Oct 19) because the parent covers 22 policies.
