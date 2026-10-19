---
id: laws-stopgap-group-a-voting-missing-record
title: "Stopgaps in group-a-voting (missing-record): 1 open"
area: laws
kind: stopgap
priority: 2
status: done
claimed-by: claude/laws-group-a-voting-barred
pr: #4550
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/law-reach/group-a-voting.ts, kind missing-record"
claimed-at: 2026-10-16T02:47:07.824Z
---

**What.** The stopgap row(s) SG-GOV-named-voters-never-barred in src/core2/law-reach/group-a-voting.ts mark a shortcut that is still live in play. Today a named person is never barred from voting for a felony conviction, and the state's share is taken off the counted electorate instead. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** One model, two tiers: a named person and a counted voter are barred by the same rule from the conviction record and the state's law in force. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a named person with a felony conviction record is barred or restored by the state's law and is absent from the turnout, with the person record id and the conviction record id, named by record id. The test in src/core2/law-reach-group-a.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: see a neighbor with a record unable to vote where the law bars it, and able where it does not.

**Files.** src/core2/law-reach/group-a-voting.ts, src/core2/data/stopgaps.json, src/core2/law-reach-group-a.test.ts

**Notes.** First row: A named person is never barred from voting for a felony conviction; the state's share is taken off the counted electorate instead.
