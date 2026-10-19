---
id: laws-outcome-civil-tech
title: "Civil, privacy and redistricting laws (housing and work discrimination, abortion, social-media age checks, facial recognition, data privacy, independent redistricting) reach people as a read"
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

**What.** Six civil, privacy and government-operations policies in src/core2/data/laws/reach-group-a.json run the mechanic "none", so passing them changes nothing anyone reads: discrimination in housing and work, restricting abortion, age verification for social media, government facial recognition, consumer data privacy and independent redistricting. Give each an effect another engine reads, for example redistricting changing the district a voter belongs to, or the discrimination ban changing who an employer or landlord may refuse. Where a policy has no effect the game can show, register a stopgap with the reason.

**Rules.** "An effect is a read, not a record": a policy counts only when a different engine reads it when it decides or pays. "The chain is the acceptance": follow one dollar or rule to a named person and the choice, view and journal line that moved.

**Done when.** A one-year run of buildBenchWorld in a drawn place (name and seed in the PR body) shows, for each policy here, the law record id, the payment, price or eligibility record that changed, the person record id reached and the knowing source, checked by a new test in src/core2/law-reach-balance.test.ts. The owner plays it: pass one of these laws and meet a neighbor it changed.

**Files.** src/core2/law-reach/group-a.ts, src/core2/data/laws/reach-group-a.json

**Notes.** Split from laws-outcome-map (Oct 19) because the parent covers 22 policies.
