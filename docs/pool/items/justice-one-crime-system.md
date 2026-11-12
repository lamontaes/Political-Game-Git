---
id: justice-one-crime-system
title: "One crime system: every offense is a person's decision, written to one crimes record and carried by one justice path"
area: gov
kind: feature
priority: 3
size: S
status: blocked
standard: 2
claimed-by:
pr:
after:
blocked-on: after the gameplay work (owner, Nov 10)
lead: laws-effects
model: sonnet
effort: low
root: none
source: owner, Nov 10, 2026, through the CTO's 20:32Z line on issue 7365
checked: fable 2026-11-10
---

**What.** The owner wants one crime system, not a bribe system beside an embezzlement system beside a table of thefts. Every offense, from theft to assault to bribery to embezzlement, is a person's decision through the one chooser (who they are, how likely they think they are to be caught, and need), written to the one crimes record and carried by the one justice path. Today that is true only of corruption. Ordinary crime happens to households from national rates with nobody doing it. This item is the plan to join them. It is not built now (owner: "I don't necessarily want to rewrite it or anything now"); it is filed so that everything built meanwhile fits it.

**Cause.** Design: the owner's Nov 10, 2026 ruling in docs/coordination/OWNER-DECISIONS.md ("there shouldn't be a bribe system and an embezzlement system. It should be a crime system, or that kind of system, and things should go through that way... I don't necessarily want to rewrite it or anything now"), with his word the same day that crime is not only need ("Some people just commit crimes. You know, personalities. Or maybe they think they can get away with it"). In code today the rule holds only for corruption: src/core2/modules/corruption.ts decides a bribe from traits, money and ties through the one chooser (`decide`, line 107) and writes it to its `crimes` table, and src/core2/modules/justice.ts carries it (`intake`, line 338). Ordinary crime is a separate path: src/core2/modules/crime.ts makes burglary, robbery, assault and vandalism happen to households from national rates, with no offender and no decision (its header, lines 2 to 23, and the open stopgaps SG-CORE-crime-offenders and SG-CORE-crime-arrests in src/core2/data/stopgaps/core.json), and src/core2/public-safety.ts turns each month's recorded crimes into expected arrests by offense at a clearance rate (its header, lines 2 to 10) and hands them to justice as counted cases.

**Fix.** In four parts after a design step, each its own item, in this order: justice-one-crime-system-part-0-the-design (the design, Fable's); justice-one-crime-system-part-1-a-named-persons-offense (full people decide an offense through the chooser and the row joins the crimes table); justice-one-crime-system-part-2-the-counted-populations-offenses (the counted population by the same rule times its count, kept as counts per place and month, never a row a person); justice-one-crime-system-part-3-victims-and-arrests-read-the-offenses (victimization and arrests are read from the offenses, and the rate-driven producer and its two stopgaps are deleted). This parent's own work is the closing check.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** This is a game (owner, Nov 10: "it has to perform like a game"): a row only for a person the player can meet, counts for everyone else, and no loop over every person every day. One model, two tiers: the counted population offends by the same rule as a full person, times its count. No dice: real rates check the totals and never pick who offends. Replace, never layer: crime.ts's rate-driven victimization and its two stopgaps go when part 3 lands. One rule, all 56 places. Follow .agents/skills/seen-in-game/SKILL.md.

**Done when.** A second session, not a builder of any part, plays a drawn place (place and seed named) on main and follows one ordinary offense end to end by record id: the person's decision with its three reasons, the row in the one crimes table, the victim's record, the arrest and the case on the one justice path, and the story in the paper. It sees the town's yearly counts of each offense beside the real rate as a report, a year no more than 20 percent slower than its base, and no rate-driven victimization left in the code.

**Waits on.** The gameplay work first (owner, Nov 10: "I want to be able to play the game"), and then its parts: justice-one-crime-system-part-0-the-design, justice-one-crime-system-part-1-a-named-persons-offense, justice-one-crime-system-part-2-the-counted-populations-offenses and justice-one-crime-system-part-3-victims-and-arrests-read-the-offenses. What waits on it: gov-justice-incident-producer and the items that name it should be built to fit this design; the diversion parts (gov-treasury-diversion) already do and do not wait.

**Files.** src/core2/modules/corruption.ts, src/core2/modules/justice.ts, src/core2/modules/crime.ts, src/core2/public-safety.ts, src/core2/data/stopgaps/core.json

**Notes (Fable B, Nov 10, the owner's answers).** Owner, Nov 10, 2026, about 7:16 p.m. Two rulings the design starts from. When it starts: "I want to be able to play the game", so the one crime system starts after the gameplay work. What the player may do: "Only corruption for the player." The player's only crime is corruption; every ordinary crime is something other people do, and the design offers the player no other offense.
