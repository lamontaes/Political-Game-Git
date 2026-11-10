---
id: research-local-government-audit-rules
title: "Who audits a town, a county and a state government in each of the 56 places, and how often"
area: gov
kind: research
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: researcher
model: sonnet
effort: medium
root: none
source: split from gov-treasury-diversion by Fable after the owner's Nov 10 ruling
checked: fable 2026-11-10
---

**What.** The yearly audit of a government's books (gov-treasury-diversion-part-3-the-yearly-audit) needs to know, for each of the 56 places, who audits a town, a county and the state itself (the state's elected or appointed auditor, or an outside firm), how often, and below what size a government is excused. Build that table from the states' own laws.

**Cause.** Design: docs/design/treasury-diversion.md, written from the owner's Nov 10, 2026 ruling in docs/coordination/OWNER-DECISIONS.md ("Yes, keep it": an official can move money from one budget line to another outside the law, found out the way bribery is, through audits, the press or complaints). No such table exists: a search of data/research for local government audit rules finds none, and part 3 starts from one ESTIMATED default row for every place.

**Fix.** For each of the 56 places read the state's or territory's statute or its auditor's published rule on audits of local governments and of the state's own accounts (pages fetched and quoted, with section, year and URL), and write data/research/gov/government-audit-rules-2026.json: per place and kind of government, who audits, how often, and any size below which no audit is required, each row tagged SOURCED or ESTIMATED with its spread. A place whose rule cannot be read keeps the default, marked, with the pages tried. Add a reader beside the table and have part 3's audit read it in place of the default; resolve the stopgap for each place read. Follow .agents/skills/researcher/SKILL.md.

**Time box.** 6 hours for one Sonnet session. When it runs out, push the places read, list the rest in the item, and stop.

**Rules.** Research before building: real data calibrates and never decides an outcome. One rule, all 56 places: the table is data, no place named in logic. Estimate, never UNKNOWN. A size rule is read as the law writes it and reported to the builder if the engine would treat it as a cutoff.

**Done when.** A second session opens the table and finds a row for each of the 56 places with its source quoted, picks five at random and reads the cited page, and in a drawn place (place and seed named) sees an audit row name the kind of auditor that place's row gives.

**Waits on.** Nothing for the table. Its reader waits on gov-treasury-diversion-part-3-the-yearly-audit.

**Files.** data/research/gov/government-audit-rules-2026.json (new), src/core2/data/stopgaps/gov.json

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have built a table of who audits each government in 56 places; one named auditor per government is enough and nobody sees the table.
