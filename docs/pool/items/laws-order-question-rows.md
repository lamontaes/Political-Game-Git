---
id: laws-order-question-rows
title: "Three executive orders get policy questions: contractor minimum wage, ban-the-box, agency climate targets"
area: laws
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Governors issue three orders by order alone that the executive engine cannot carry because the game has no policy question for them: a minimum wage for state contractors (24 states), ban-the-box in public hiring (18) and state-agency climate targets (25), all in data/research/executive/executive-powers-2026.json canOrder. Add one policy question per order, one question at a time, each with its state-level authority, starting law for all 56 places, wording and wiring, then map it in ORDERABLE (src/core2/modules/executive.ts) so a governor the player plays is brought the order and a governor the character plays issues it from their views. Today only restoring voting rights and public-sector collective bargaining recognition are mapped.

**Rules.** One rule, all 56 places; every number sourced; replace never layer; effect is a read; a half-built question fails the wiring guards.

**Done when.** For each of the three questions: a row in every file below with sourced starting law for all 56 places, the wiring guards pass, and in a played governor's year one governor is brought the order and issues or sets it aside, with the law row in force named by record id.

**Files.** data/research/powers-catalog/question-powers.json, data/research/laws/starting-law-2026/question-order.json, data/research/laws/starting-law-2026/ (the family file and its .d.json.ts), data/research/laws/catalog-terms-batch-02.json, data/research/campaigns/issue-axes-2026.json, data/research/campaigns/policy-support-2026.json, data/research/outcome-web/links.json, data/english/question-names.json, data/english/bill-names.json, data/english/bill-sections.json, src/core2/data/laws/reach-group-a.json, src/core2/data/legislature/bill-catalog.json, src/core2/data/legislature/series-powers.json, scripts/law-wiring/declared/*.json, src/core2/modules/executive.ts (ORDERABLE)

**Notes.** From Legislation, Nov 8. The fifteen files are those that name restore-voting-after-sentence, the one existing order question. The research citations for each order (which states, the order and its legal limit) are in data/research/executive/orders-and-vacancies-2026-11.json (fetched Nov 8, partial; every gap listed under notFound). It has Virginia EO 41 (ban-the-box, 2015, full text), Oregon EO 20-04 (agency climate targets, 2020, full text), Pennsylvania (contractor minimum wage, news source only, no order number) and the legal limit for each.

Legislation, Nov 8 (later): ban-the-box in public hiring has its 56-place starting-law research in data/research/executive/ban-the-box-public-hiring-2025-01.json (38 yes, 14 no, 4 NOT FOUND: Guam, American Samoa, Northern Mariana Islands, U.S. Virgin Islands; NH sources conflict). That is only the starting-law table (data/research/laws/starting-law-2026/). The other files that name an order question also need sourced content this session did not research: policy-support (public support by group), issue-axes, outcome-web links (what the law moves, with citations), bill-catalog, series-powers, reach-group, law-wiring grants and the English names. Contractor minimum wage and agency climate targets have no 56-place research yet.

Legislation, Nov 8 (support and outcomes): public support by group is in data/research/campaigns/ban-the-box-support-yougov-2022.json (YouGov Daily Question, Sept 16, 2022, 7,275 U.S. adults, all-employer wording: support 47%, oppose 35%; by party Dem 56/28, Rep 43/44, Ind 42/39; by age, race, region, gender), SOURCED and fetched. Measured effects are in data/research/executive/ban-the-box-outcomes-2026-11.json (26 sourced findings; partial). The game keeps none of the outcome measures those papers move (hiring of people with records), so the outcome-web link is status outcome-not-produced like police-to-property-crime. Still to do for the question row: a new power dial (the powers catalog has one dial per kind of power, with a per-place column), starting law in labor-workforce.json for 56 places from the research file above, then question-order, question-names, issue-axes, policy-support (use the YouGov figures, estimate true: all-employer wording), outcome-web link, bill-catalog, series-powers, reach-group-a, law-wiring grants, bill-names and bill-sections.
