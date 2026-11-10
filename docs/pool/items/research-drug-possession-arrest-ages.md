---
id: research-drug-possession-arrest-ages
title: "Drug possession arrests take the other minor offenses' age profile; the FBI's drug row suggests an older one"
area: laws
lead: laws
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: laws lead, Oct 26
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
after:
---

**What.** Drug possession was added as the sixth minor-offense category (owner ruling, October 25, 2026). Its cases share the age bands and case outcomes of the other five categories, because neither source the file uses gives drug possession its own: FBI Crime in the United States 2019, Table 38, has only a combined 'drug abuse violations' row (sale and possession), and BJS NCJ 305157 gives dispositions for all misdemeanors without an offense split. A rough check by the builder suggests the combined drug row skews older (less weight under 18, more at 25 to 34). Find an age distribution for drug possession arrests alone (FBI CDE arrest-by-age for the possession codes 156 to 160, or NIBRS), and a disposition share for possession misdemeanors if one is published, and record them as the category's own rows, SOURCED or ESTIMATED with the source.

**Cause.** Found in code: src/core2/data/public-safety/parameters.json gives drug possession the same age bands and dispositions as the five other minor-offense categories (the `estimatedFrom` text of its conviction-share row near line 287 and the Table 38 source note near line 678 say so), because FBI CIUS 2019 Table 38 has only a combined drug-abuse row.

**Fix.** Find age and disposition rows specific to possession (for example FBI CDE or NIBRS arrest data), cite page and quote, and give the category its own row in src/core2/data/public-safety/parameters.json read by src/core2/public-safety.ts.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: real data checks the simulation and never decides one person's outcome. Every number lives in a parameter table with its SOURCED, ESTIMATED or TUNABLE tag.

**Done when.** A second session runs src/core2/justice-low-level.test.ts on two drawn places named in the PR body and sees drug possession cases take the category's own age row (and its own disposition share where a source gives one) from src/core2/data/public-safety/parameters.json, each cited with its page and quote. On screen: none by design.

**Waits on.** Nothing.

**Files.** src/core2/data/public-safety/parameters.json, src/core2/public-safety.ts, data/research/justice/low-level-arrests-2024.json, src/core2/justice-low-level.test.ts

**Notes.** Laws lead, Oct 26, from the #6056 helper's report.
