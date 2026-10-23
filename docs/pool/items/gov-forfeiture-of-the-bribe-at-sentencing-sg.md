---
id: gov-forfeiture-of-the-bribe-at-sentencing-sg
title: "Forfeiture of the bribe at sentencing (SG-GOV-justice-no-forfeiture)."
area: gov
kind: feature
priority: 2
status: done
claimed-by: claude/gov-bribe-forfeiture
pr: #4491
blocked-on:
milestone:
source: "docs/archive/2026-10-23/coordination/OPUS-GOV.md line 196 (unchecked checklist line)"
claimed-at: 2026-10-15T22:04:48.835Z
---

**What.** A convicted official keeps the bribe they took; the court collects only the fine (stopgap SG-GOV-justice-no-forfeiture, `justice.ts` line 670). Build forfeiture so that at sentencing the bribe's amount leaves the official's cash for the treasury on the journal, from each place's forfeiture law (18 U.S.C. 981 and the states' laws). The player would notice that a convicted official loses the money, that the news says so, and that the treasury has the amount.

**Rules.** One rule, all 56 places: the forfeiture rule is law data for all 56 places and names none in code; No dice: the sentence and the law in force decide the amount, never a roll; The chain is the acceptance: follow the bribe from the briber's cash to the official, to the sentencing, to the treasury, to the news line; An effect is a read, not a record: the budgets and the journal read the forfeited amount at sentencing; Ask why: the sentence record keeps the law row and the amount; Placeholders: the SG-GOV-justice-no-forfeiture row closes only because forfeiture runs, never by deleting it; Research before building: the forfeiture rules cite the statutes, tagged SOURCED or ESTIMATED with spread.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a bribery case in the year ends in conviction and the bribe amount moves from the official's cash to a treasury on the journal, with the case, bribe and journal entry ids named. Tests in `src/core2/justice-player.test.ts` cover conviction with and without forfeiture law. Close the stopgap row. The owner plays it: catches an official in a bribe and sees the amount returned to the town.

**Files.** src/core2/modules/justice.ts, src/core2/justice-law.ts, src/core2/data/justice/parameters.json, src/core2/data/stopgaps.json

**Notes.** Checklist line from OPUS-GOV.md; verify against main before starting.
