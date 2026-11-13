---
id: gov-treasury-diversion-part-5-the-justice-path-takes-the-kind
title: "The one justice path prosecutes a crime by its kind, so a diversion is reported, charged and sentenced the way a bribe is"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: split from gov-treasury-diversion by Fable after the owner's Nov 10 rulings
checked: fable 2026-11-10
---

**What.** The justice engine carries a crime from the crimes table through report, investigation, charge, plea, trial and sentence, but it assumes every crime is a bribe. Make it read the offense from the crime's kind, so a diversion travels the same path with its own sentence range, and the money a court takes goes back to the treasury it left. This is part 5 of gov-treasury-diversion. Read docs/design/treasury-diversion.md first; this part builds the justice half of "What it changes in the world". It adds no second path. Feeds: gov-treasury-diversion.

**Cause.** Design: docs/design/treasury-diversion.md, from the owner's Nov 10, 2026 rulings in docs/coordination/OWNER-DECISIONS.md ("there shouldn't be a bribe system and an embezzlement system. It should be a crime system"). In code today, src/core2/modules/justice.ts takes new rows from the crimes table (`intake`, line 338) only for a bribe that was offered and refused, writes the complaint and the case with `offense: "bribery"` typed in (`considerReport`, line 379, and near lines 423, 819, 901 and 1044), and sentences every conviction from `briberyRange` (`convict`, line 913; src/core2/justice-law.ts line 211).

**Fix.** In src/core2/modules/justice.ts read the offense from the crime record's kind everywhere `"bribery"` is typed: a map from kind to offense key in data, with `bribe` to bribery and `diversion` to the state's offense for misuse of public funds. `intake` hands a diversion to `considerReport` for each person part 2 or part 3 gave a knowledge record of it (the books' keeper, the shorted department's head, the auditor), with the same report decision a bribe's witness makes. `followTheMoney` (line 529) already follows payments on the journal; make it follow the diversion's own source kind. In src/core2/justice-law.ts turn `briberyRange` into one range reader that takes the offense key, reading data/research/justice/sentencing-ranges-2026.json; until a place's range for misuse of public funds is read, use that place's bribery range, marked ESTIMATED under one registered stopgap in src/core2/data/stopgaps/gov.json, and add the offense to the research item research-gov-sourced-parameters in the pull request body. A fine or forfeit on a diversion conviction is paid to the treasury the money left, through `payToTreasury` (line 1126). The seat is vacated by the forfeiture rule that exists. Delete every typed `"bribery"` the map replaces.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One crime system (owner, Nov 10): one crimes record, one chooser, one justice path; a kind is data, never a branch of its own. Replace, never layer: the typed offense goes in the same change. No dice: every step stays decided from records, as it is for a bribe. One rule, all 56 places: the range is a per-place table. Estimate, never UNKNOWN. A bribe's own tests must pass unchanged. Follow .agents/skills/played-world-proof/SKILL.md.

**Done when.** A second session, on main in a drawn place (place and seed named), uses dev mode to have an official divert and a person who learned of it report it, plays on, and sees one case by record id go from complaint to sentence with the offense named for what it is, the sentence inside that place's range, the fine or forfeit arriving in the treasury the money left by journal record id, and the seat vacated where the place's rule says so. A bribe reported in the same world still ends as it did before. A test in src/core2 names the place, the seed and the record ids.

**Waits on.** gov-treasury-diversion-part-1-the-act-and-its-money and gov-treasury-diversion-part-2-the-shorted-line-and-the-complaint.

**Files.** src/core2/modules/justice.ts, src/core2/justice-law.ts, src/core2/modules/corruption.ts, src/core2/data/stopgaps/gov.json, data/research/justice/sentencing-ranges-2026.json, src/core2/treasury-diversion-justice.test.ts (new)
