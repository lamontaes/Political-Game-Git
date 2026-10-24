---
id: justice-low-level-offenses
title: "Model low-level offenses and their arrests, so police staffing moves low-level arrests"
area: laws
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: laws lead, Oct 24, from the owner's ruling
---

**What.** The owner ruled on Oct 24 that the game models low-level offenses (OWNER-DECISIONS.md, Oct 24, "Low-level offenses"). The justice case flow in src/core2/public-safety.ts and src/core2/modules/crime.ts carries ordinary crime but no class of minor quality-of-life offenses (disorderly conduct, loitering, public intoxication and the like), so the outcome web's police-to-low-level-arrests link has no size and no kept measure, and budget-line:police grades its web link partial (justice regrade, Oct 24, branch claude/laws-nine-links-justice). The class needs its own counts by place from real arrest data and a research-sized link from police staffing to these arrests.

**Rules.** Research before building: the offense counts come from real arrest data (FBI UCR or NIBRS) and the link's size from fetched and quoted research; real rates check totals and never decide one person's arrest. No dice. One model, two tiers. An effect is a read: the case flow reads the police line when it records an arrest.

**Done when.** In a played year of buildBenchWorld in a drawn place (seed named), the case flow records low-level offense arrests named by record id; a raised police line changes their count through a sized link in data/research/outcome-web/links.json with source and anchor quote; and the law-wiring matrix grades budget-line:police's web link wired in Prescott, Michigan and Uehling, Nebraska.

**Files.** src/core2/public-safety.ts, src/core2/modules/crime.ts, data/research/outcome-web/links.json, src/core2/data/outcome-web/outcome-web.json

**Notes.** Filed by the laws lead on Oct 24 from the owner's ruling.
