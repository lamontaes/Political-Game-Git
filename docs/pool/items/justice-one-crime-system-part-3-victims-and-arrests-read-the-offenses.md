---
id: justice-one-crime-system-part-3-victims-and-arrests-read-the-offenses
title: "Victims and arrests are read from the offenses, and the rate-driven crime producer is deleted"
area: gov
kind: feature
priority: 3
size: M
status: blocked
standard: 2
claimed-by:
pr:
after:
blocked-on: justice-one-crime-system-part-0-the-design
lead: laws-effects
model: opus
effort: medium
root: none
source: part of justice-one-crime-system
checked: fable 2026-11-10
---

**What.** Victimization records and the month's arrests come from the offenses parts 1 and 2 write, and the code that makes crime happen from national rates with no offender is deleted with its two stopgaps. Part 3 of justice-one-crime-system. It is not built until the design step is written and the owner says to start.

**Cause.** Design: the owner's Nov 10, 2026 ruling in docs/coordination/OWNER-DECISIONS.md ("there shouldn't be a bribe system and an embezzlement system. It should be a crime system, or that kind of system, and things should go through that way... I don't necessarily want to rewrite it or anything now"), with his word the same day that crime is not only need ("Some people just commit crimes. You know, personalities. Or maybe they think they can get away with it"). In code today the rule holds only for corruption: src/core2/modules/corruption.ts decides a bribe from traits, money and ties through the one chooser (`decide`, line 107) and writes it to its `crimes` table, and src/core2/modules/justice.ts carries it (`intake`, line 338). Ordinary crime is a separate path: src/core2/modules/crime.ts makes burglary, robbery, assault and vandalism happen to households from national rates, with no offender and no decision (its header, lines 2 to 23, and the open stopgaps SG-CORE-crime-offenders and SG-CORE-crime-arrests in src/core2/data/stopgaps/core.json), and src/core2/public-safety.ts turns each month's recorded crimes into expected arrests by offense at a clearance rate (its header, lines 2 to 10) and hands them to justice as counted cases.

**Fix.** Build what docs/design/one-crime-system.md says: each offense finds its victim from records by the exposure rule src/core2/modules/crime.ts has, src/core2/public-safety.ts reads arrests from offenses and what the police know, a full person's offense reaches src/core2/modules/justice.ts as a named case, and the rate-driven producer and the stopgaps SG-CORE-crime-offenders and SG-CORE-crime-arrests are deleted in the same change. This item is rewritten from the design when part 0 lands; until then it holds the shape and is not claimed.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** This is a game (owner, Nov 10): a row only for a person the player can meet, counts for everyone else, no loop over every person every day, and a year no more than 20 percent slower than its base. One model, two tiers. No dice: real rates check totals and never pick an offender. Replace, never layer. One rule, all 56 places. Follow .agents/skills/played-world-proof/SKILL.md.

**Done when.** A second session, on main in a drawn place (place and seed named), sees what this part adds by record id in a played year, with the town's yearly count of each offense reported beside the real rate and the year's time on `npm run speed:year` beside its base; the exact lines are written when the item is rewritten from the design.

**Waits on.** justice-one-crime-system-part-0-the-design and justice-one-crime-system-part-1-a-named-persons-offense and justice-one-crime-system-part-2-the-counted-populations-offenses.

**Files.** src/core2/modules/crime.ts, src/core2/public-safety.ts, src/core2/modules/justice.ts, src/core2/data/stopgaps/core.json, docs/design/one-crime-system.md (new)
