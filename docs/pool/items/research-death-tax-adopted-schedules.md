---
id: research-death-tax-adopted-schedules
title: "Research: the exemption, heir classes and government-heir term an adopted estate or inheritance tax carries"
area: laws
kind: research
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: stand-in triage, Nov 10
claimed-at:
after:
lead: laws
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** A state with no estate or inheritance tax that adopts one by a bill sets only a rate, so the tax takes the whole estate or share with no exemption and no heir classes, and a government that takes an estate is assumed exempt. Find a sourced schedule to give such an adopting bill (an exemption, and for an inheritance tax the classes of heirs), and confirm Kentucky's term for the Commonwealth taking an estate by escheat. Closes stand-ins SG-LAW-death-tax-no-schedule and SG-LAW-government-heir-exempt-assumed.

**Cause.** Found in code: `flatSchedule` in src/core2/laws-death-taxes.ts (line 53) returns `{ exemption: 0, minRate: rate }` for a row with no terms, and the government-heir branch (line 182) assumes exempt when the row has no `governmentHeir` term or the term carries a `reading`; src/core2/data/stopgaps/law.json registers both.

**Fix.** From the statutes already quoted in data/research/money/death-taxes-2026.json and the other states' estate and inheritance taxes, write a default schedule for an adopting bill: the median exemption and heir classes of states that levy the tax, with each value tagged ESTIMATED with its source and spread. Add the table to the research file and to data (not code), and have the adopting bill's row carry it so `flatSchedule` and the government-heir default read it; delete the flat fallback. Find a Department of Revenue or court source for Kentucky's escheat reading and quote it, or keep the `reading` mark with the search recorded. Do not name a state in logic; the schedule is a data row.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: pages actually fetched and quoted, real rates check totals and never decide an actor's outcome. One rule, all 56 places: nothing in logic names a state. Estimate, never UNKNOWN: a value a player sees is marked with its source.

**Done when.** A second session, not the builder, plays a year in a place drawn from all 56 with a seed nobody chose (place and seed named), passes a bill adopting an estate tax and one adopting an inheritance tax where the state had none, then sees a death assessed with the researched exemption and heir classes (not the whole estate at the flat rate) and a government heir taxed or exempted by the researched term, with the assessment's law id; the two stand-ins are resolved or reduced to a cited reading in src/core2/data/stopgaps/law.json.

**Waits on.** Nothing. (Related, not blocking: law-levels-death-tax-zero-restoration.)

**Files.** data/research/money/death-taxes-2026.json, src/core2/laws-death-taxes.ts, src/core2/laws-death-taxes.test.ts, src/core2/data/stopgaps/law.json
