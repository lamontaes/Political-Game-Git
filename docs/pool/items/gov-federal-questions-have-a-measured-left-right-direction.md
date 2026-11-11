---
id: gov-federal-questions-have-a-measured-left-right-direction
title: "The President, Congress and voters hold a view on every federal question, so the address is not about the same point in every world"
area: gov
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: opus
effort: high
root: rc1-world-outside-town
source: lead's review of the opening talk (PR 8736), Nov 11, 2026; the stance half of gov-congress-passes-policy-laws-part-2-stances-on-questions
checked:
claimed-at:
branch:
---

**What.** In every new game the President's address speaks on the same one or two policy points, most often legal cannabis sales, and the first evening's talk at home is then about that point in every world. The President has no view at all on tariffs, immigration, the federal minimum wage, defense spending, Medicare drug prices or any other question only federal law answers. Seen: the President's address on the first day and the relative's line about it that evening, in three new lives.

**Cause.** Measured: in Shipshewana Lake, Indiana (seed `97219f519eeb50129d0d311d7f638dbdc919880715d6fc281c4b09eb8bf6b896`, main at b3a687e1), of the 80 named questions the President holds a view on 55 and federal law may answer 25, but only 4 questions have both, and 3 of those have a federal law row: a Medicaid work requirement, an income tax and legal cannabis sales. On 21 federal questions the President's stance is exactly 0. Found in code: `questionAxis` in src/core2/campaign-views.ts returns `axisOf[question]?.axis ?? 0`, and `axisOf` (src/core2/campaign-data.ts) is read from data/research/campaigns/issue-axes-2026.json. That file holds 55 directions, each measured as the correlation across states between a state's answer and its 2024 presidential vote. A question only federal law answers has one answer for the whole country, so it has no row. `personStance`, `memberSupportAt` and `ownStance` (src/core2/officials-roster.ts) then return 0, and `standsAt` in src/director/opening-story.ts drops every question whose stance is 0.

**Fix.**

1. **A second research file, same shape.** Add data/research/campaigns/federal-issue-axes-2026.json with `id`, `about`, `sources` and `axes`. One row for each federal-only question in data/research/powers-catalog/question-powers.json (the `us-federal-positions` questions and the federal tax terms): `axis`, `yesShare` and `source`.
2. **`axis` is measured, not authored.** For each question, find the most recent recorded roll-call vote in the U.S. House on the nearest real bill (the Senate where the House held none). `axis` is the Republican yes share minus the Democratic yes share among members voting, so it runs from -1 to 1 and positive leans right, the same sign as the state file. `source` names the chamber, the roll-call number, the date, the bill and the page fetched, with the two party counts quoted. Tag the row SOURCED. Where no roll call exists since 2010, use a national poll's party split (Pew, Gallup, AP-NORC or KFF), scaled the same way, tagged ESTIMATED with the poll's margin as the spread. Follow the `researcher` skill: every page is fetched and quoted, none recalled.
3. **`yesShare` is the consensus the members answer to,** as in the state file, measured the federal way: the share of all members voting who took the question's yes side on the cited roll call, or the poll's overall share. (The first draft of this item set it to 0 wherever federal law says no. With a direction near 1 that makes every member and every President oppose every such question, so no President could stand where his party voted. The builder found it on Nov 11.)
4. **One map.** `axisOf` reads both files as one map. A question in both files throws when the data loads.
5. **Nothing else changes.** `personStance`, `memberSupportAt`, `ownStance`, `standsAt` and the voters' views all read `axisOf` already. Add no second stance rule and no per-office code path.
6. **Tests, on drawn places** (skill `drawn-place-tests`): the President holds a stance other than 0 on at least 15 federal questions; `standsAt(api, official, "federal", "US")` returns at least 6 stands; across three drawn places with Presidents of both parties, at least 5 questions have the two parties' Presidents on opposite sides; and every row of the new file has a source with a date. Extend src/director/opening-story.test.ts so that three drawn addresses do not all open on the same question.
7. **Say what it does to the world.** Every member of Congress and every voter group now holds a view on these questions, so Congress may act where it did not. In one drawn place, run one played year on main and on the branch (skill `dev-tester`) and put in the pull request: federal bills introduced and passed on each, and the President's first three points on each. Run `npm run speed:year` for one year on each and state both times; the branch may be at most 20% slower.

**Time box.** 4 hours for one session. When it runs out, push what passes (the rows that are sourced so far load and are tested; the rest stay out), set the item's state honestly with a one-line note, and stop.

**Rules.** Research before building: real votes set the direction and never pick one member's vote. No dice. Every number is SOURCED or ESTIMATED with its spread. One rule, all 56 places: nothing names a state. One model, two tiers: the counted voters read the same direction as a full person. An effect is a read: the address, Congress and the voters' views all read the new rows.

**Done when.** A second session, in the running game on main at 1440x900, starts three new lives in drawn places it writes down with their seeds, and reads the President's address in each. Each address names at least three national points, at least two of them questions only federal law answers (it says which), and the President's side on each matches the side most of his party took in the roll call the row cites. That evening, the relative's talk names a point from that life's own address. src/director/opening-story.test.ts passes on a fresh draw.

**Waits on.** Nothing.

**Files.** data/research/campaigns/federal-issue-axes-2026.json (new), data/research/campaigns/issue-axes-2026.json, data/research/powers-catalog/question-powers.json, src/core2/campaign-data.ts, src/core2/campaign-views.ts, src/core2/officials-roster.ts, src/director/opening-story.ts, src/director/opening-story.test.ts, src/core2/federal-issue-axes.test.ts (new)

**Notes.** Found by the lead on Nov 11, 2026 while reviewing PR 8736: all three of that pull request's drawn places raised legal cannabis sales. gov-congress-passes-policy-laws-part-2-stances-on-questions asks for the same stances and for a cited federal answer on each question; this item is its stance half, with the cause measured, and that item keeps the answers. The President speaks only where a federal law row exists (`lawOn` in src/director/opening-story.ts), so a question with a view and no row stays silent until that item adds its answer; in the measured world at least 13 of the federal questions already have a row.

Lead's note (2026-11-11 07:50 UTC): the builder drew 14 places, all 14 seated a Republican President, and all 14 addresses opened on the same three points, because every President at the clamp ranks the questions in one order. So "the first point differs" cannot hold within one party from stances alone and is taken out of this item's Done when. What makes two worlds differ is who the President is: words-opening-address-leads-with-the-presidents-own-causes.
