---
id: elections-council-by-population-class
title: "A town whose state sets its council by population class gets that council, read from the world's own population at each election"
area: elections
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: opus
effort: medium
root: none
source: hand-filed by Elections, Nov 24 (lead's ask)
---

**What.** Playtest sitting C9 (N8-P17) is half done. #10354 and #10359 give a town the council its state's law sets for its kind of town, read by the name in the Census listing ("BOROUGH OF", "VILLAGE OF"). The largest pairs still on the national fallback set the council by population class instead. An Illinois city elects aldermen by population (65 ILCS 5/3.1-20-10). An Idaho city has 4 or 6 council members by population (50-702). Arkansas and Missouri cities are first, second, third or fourth class by population. A North Dakota city of 600 or fewer elects at large (40-08-04). Kansas cities are first, second or third class. A West Virginia municipality is Class I to IV by population (8-1-3), and "Transition from one to another class shall occur automatically when the requisite population qualification has been met". Seen: Politics, Government, the town council's seats, term and chief for the place's population.

**Cause.** Design: the class tier (`src/core2/gov-rules/municipal-class-form.ts`) reads only the listing's name, so a state that classes towns by population has no row it can apply. A band can't read the real ACS figure: the owner, Nov 16, said "Everything comes from the simulation. Stop pegging things to real numbers." The class has to follow the world's own population, so a town that grows or shrinks across the century from 1925 changes class the way the statute says. The county board's bands (`county-governing-body-rules.ts`) read the 2024 ACS figure today, so the same change should move them to the world's population too.

**Fix.** Give a class row optional population bands, each with the statute's seats, term, staggering, method and chief, and its citation. Resolve the band from the world's own population of the place at each regular election, the same read History's seating (#10358) uses for the century, so the two never disagree. Add rows only where the statute text is read and quoted, one PR per batch. Covered first: IL city (300), AR city (313), MO city (681), KS city (621), ID city (198), ND city at-large rule (355), WV city and town (223), AL city (176) and MS city (110), in that order of places covered.

**Time box.** 6 hours

**Rules.** One rule, all 56 places: bands live in data, never in code. Everything comes from the simulation: the band reads the world's population, never a published figure. No dice. Each row says which statute page was read.

**Done when.** A second session takes a drawn place in a population-class state with a seed it names, opens Politics, Government, and sees the council the statute sets for that place's population in the world. In dev mode it then grows the place across a band's line before an election and sees the next election fill the new class's seats, with a screenshot of each.

**Waits on.** #10354 and #10359; History's #10358 for the shared population read

**Files.** src/core2/gov-rules/municipal-class-form.ts,src/core2/gov-rules/local-governing-body-rules.ts,src/core2/offices-local.ts,data/research/local-government/municipal-class-forms.json,src/core2/municipal-class-form.test.ts
