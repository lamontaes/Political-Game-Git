---
id: justice-one-crime-system-part-0-the-design
title: "The design for one crime system: what decides an ordinary offense, and how it stays fast"
area: gov
kind: feature
priority: 3
size: M
status: blocked
standard: 2
claimed-by:
pr:
after:
blocked-on: after the gameplay work (owner, Nov 10)
lead: laws-effects
model: fable
effort: high
root: none
source: part of justice-one-crime-system
checked: fable 2026-11-10
---

**What.** Write docs/design/one-crime-system.md: how an ordinary offense becomes a person's decision through the one chooser, how the counted population offends as counts by the same rule, how victims and arrests are read from offenses, and how a played year stays inside the speed bar. This is the design step of justice-one-crime-system and is Fable-level work. It builds nothing.

**Cause.** Design: the owner's Nov 10, 2026 ruling in docs/coordination/OWNER-DECISIONS.md ("there shouldn't be a bribe system and an embezzlement system. It should be a crime system, or that kind of system, and things should go through that way... I don't necessarily want to rewrite it or anything now"), with his word the same day that crime is not only need ("Some people just commit crimes. You know, personalities. Or maybe they think they can get away with it"). In code today the rule holds only for corruption: src/core2/modules/corruption.ts decides a bribe from traits, money and ties through the one chooser (`decide`, line 107) and writes it to its `crimes` table, and src/core2/modules/justice.ts carries it (`intake`, line 338). Ordinary crime is a separate path: src/core2/modules/crime.ts makes burglary, robbery, assault and vandalism happen to households from national rates, with no offender and no decision (its header, lines 2 to 23, and the open stopgaps SG-CORE-crime-offenders and SG-CORE-crime-arrests in src/core2/data/stopgaps/core.json), and src/core2/public-safety.ts turns each month's recorded crimes into expected arrests by offense at a clearance rate (its header, lines 2 to 10) and hands them to justice as counted cases. No design says what a person weighs in deciding an ordinary offense, when they are asked, or how a counted group of thousands is decided without a row or a loop per person.

**Fix.** Write the design, from the code named in the Cause and the research already in data/crime/victimization.json and src/core2/data/public-safety/parameters.json. It must settle: the reasons weighed (temperament at the trait engine's weight; perceived risk from what the person knows, such as the town's patrol hours and clearance, arrests among people they know and their own record; need from their household's money pressure and a grievance on record); when a full person is asked, by cause and never by a daily loop; how a counted group's offenses per month follow from the same weights applied to the group's own distribution, as one count per place, month and kind; how a victim is chosen from records with no roll, keeping the exposure rule crime.ts has; what the real rates are for (checking totals, calibrating weights) and what they may never do (pick an offender); what is deleted; and the measured cost on `npm run speed:year` that the parts must hold. It names the parts' order and anything the owner must decide about the player's own experience (may the player commit an ordinary crime, and how is it offered).

**Time box.** 6 hours for one Fable session. When it runs out, push what is written and list what is not settled.

**Rules.** This is a game: detail only where the player can see it. No dice. One model, two tiers. Research before building: the design cites its sources and says what each calibrates. A question about the player's own experience goes to the owner with the reading line; a mechanic the background simulation lacks is designed from research, not asked.

**Done when.** A second session reads docs/design/one-crime-system.md and can say, for a burglary in a drawn place (as a worked example in the design, place and seed named), who decided it and from what, where the row or the count is kept, how the victim was chosen, how it reaches justice, and what a played year costs; and the three part items are rewritten from the design with nothing left to guess.

**Waits on.** The gameplay work first (owner, Nov 10: "I want to be able to play the game").

**Files.** docs/design/one-crime-system.md (new), docs/design/treasury-diversion.md

**Notes (Fable B, Nov 10, the owner's answers).** Owner, Nov 10, 2026, about 7:16 p.m. Two rulings the design starts from. When it starts: "I want to be able to play the game", so the one crime system starts after the gameplay work. What the player may do: "Only corruption for the player." The player's only crime is corruption; every ordinary crime is something other people do, and the design offers the player no other offense.
