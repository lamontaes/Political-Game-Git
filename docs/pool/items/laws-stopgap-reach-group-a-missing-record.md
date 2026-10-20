---
id: laws-stopgap-reach-group-a-missing-record
title: "Stopgaps in reach-group-a (missing-record): 3 open"
area: laws
kind: stopgap
priority: 2
status: blocked
claimed-by:
pr:
blocked-on: people-citizenship-record, laws-convictions-counted-reach, people-household-firearms
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/laws/reach-group-a.json, kind missing-record"
claimed-at: 2026-10-16T02:49:10.292Z
---

**What.** The stopgap row(s) SG-GOV-REACH-A-citizenship, SG-GOV-REACH-A-convictions, SG-GOV-REACH-A-firearms in src/core2/data/laws/reach-group-a.json mark a shortcut that is still live in play. Today partnering with immigration enforcement reaches an estimated count of noncitizen adults by national share, and conviction and firearm laws reach estimated counts rather than named people with records. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** Estimate, never UNKNOWN: until a person record holds the status it starts from the real average with a per-world spread, marked as an estimate with its source. One model, two tiers: a named person and a counted group are read by one rule. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a citizenship, conviction or firearm law reaches a named person by their own record and the count of the rest is the sum of groups, with person record ids, named by record id. The test in src/core2/law-reach-group-a.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: pass an enforcement partnership law and see which of his neighbors it reaches.

**Files.** src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps.json, src/core2/law-reach-group-a.test.ts

**Notes.** First row: Partnering with immigration enforcement reaches an estimated count of noncitizen adults (national share) instead of named noncitizens.

**Split (Oct 16).** Three rows, three records: citizenship (`people-citizenship-record`), convictions for counted adults (`laws-convictions-counted-reach`) and household firearms (`people-household-firearms`). This item is done when all three are.

Oct 20: The Oct 16 claim has no PR and is over two days old, so the claim is cleared.
