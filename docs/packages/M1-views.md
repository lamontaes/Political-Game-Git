# M1-views: what people believe, and how it changes

**Contract:** M1-10 in `docs/roadmap/features.json`. In a random place, views match real spreads by age, education, faith and region, checked against state and metro answer keys, so conservatives in two randomly drawn states can differ; a big event shifts the people it touches and no one else.

**Builder:** a new Codex session, CODEX-VIEWS, at **high**: it models people, to the owner's own design, and elections, officials and budgets all read it.
**Finisher:** a new Claude session, **Opus at high** (owner, Oct 10).
**Branch:** `pool/M1-views`, stacked on `pool/M0-core-pieces` with the latest `pool/P15-people-*` and `pool/P10-part-1` merged in locally. **Starts:** as soon as this work order is approved.
**Owns:** `src/core2/modules/views.ts`, `src/core2/views-*.ts`, `src/core2/data/views/`, `data/research/views/`, and their tests. Changes to `src/core2/voter-groups.ts` are shared core changes for review by CORE-PIECES and SOL-1258. Read `M1-common.md` first.

## The design (owner, Sept 26 and Oct 9, 2026; `docs/design/core2-porting-plan.md`, decision 4)

- **Shape:** deep values (the game's 14) held at personal strengths, plus stored stances on issues that drift on their own and can disagree with the person's values.
- **What changes them:** the people a person talks to and trusts; events that hit them; news, media and speeches, filtered by trust; and their party or trusted leaders changing position.
- **Party** follows views and never assigns positions when a person is created. Once someone has a party, loyalty is one reason among others: loyal members tend to follow when the party moves, and switching is slow.
- **Engagement:** people who follow politics closely hold tight, consistent views; most people hold weak, mixed views and no opinion on many issues.
- **Public and private views can differ** under social pressure, so private votes, polls and public speech can disagree.
- **Personality is the lens, not the side;** a view can have several reasons at once; a personal stake can outweigh a general position.
- **Real spreads are the answer key, never assigned.**

## What exists

- **Old core:** the 14 values are the principles in `src/simulation/policy-pack-us-policy-positions.ts` (limited government, collective provision, local control, fiscal restraint, equal treatment, personal liberty, public safety, property rights, environmental stewardship, equal opportunity, tradition, transparency, protection for working people, open competition). Views form from life facts in `src/simulation/principles-from-life.ts`, with each fact's weight set by hand, and party cues hand-set from Pew text. Private and public positions are separate records in `src/simulation/politics.ts`; party in `living-world/party-evolution.ts`. Parties are written in as Democratic and Republican in places, which breaks the one-rule-for-all-places rule.
- **New core:** nothing per person. Voter groups (`src/core2/voter-groups.ts`) hold one lean number per group. Closeness and contact (OPUS-PEOPLE) and event topics (drives branch) are the channels influence travels.
- **Data:** 2024 election returns by state and district (`data/source/electoral-calibration-2024/corpus.json`, which also holds real officeholder names that DATA-FIX is removing from shipped data; don't add a new read of names), CPS 2024 turnout and registration. **No individual survey data is in the repo,** and the map of where each place stands on each value is empty (784 cells).

## Research first

This is the work order's largest job; nothing is built on guessed spreads.

1. **Answer keys:** views by age, education, faith, race, income and region, nationally, by state and for the largest metros, from large public surveys. Candidates: the Cooperative Election Study (large state samples), the American National Election Studies, the General Social Survey, and Pew's Religious Landscape Study. **Check each one's terms for commercial use before using it**, record the terms, and ask the CTO about any that are unclear. Store derived spreads, not survey microdata. A state survey's margin of error measures how sure the state estimate is, not how much towns differ, so check towns against the real spread across places, not against the statewide margin (the core-pieces checker found the turnout helper does the latter).
2. **How views start and how fast they move:** answer the open requests `what-starts-and-paces-a-political-view`, `which-issues-people-care-about`, `where-each-place-stands-on-each-policy-question` and `what-leans-a-party-member-on-each-question` in `docs/research/requests/`, and build on the answered `where-a-persons-politics-comes-from`.
3. **How big events move people:** published estimates of how a plant closing, a disaster, a crime wave or a scandal shifts the people directly hit versus everyone else.
4. **Territories:** survey coverage is thin; use the territories' own election results and published polls where they exist, and labeled estimates otherwise.

## Build

1. **Tables.** Register module `views`: each person's value strengths, issue stances (position, strength, how they formed), engagement, party attachment and loyalty, and public versus private stance where they differ. Index by person and by issue.
2. **At the opening,** a person's values and stances come from their own life (upbringing, faith, schooling, work, place, family from OPUS-PEOPLE's deep past) through researched weights, then are checked against the answer keys for their place. If the generated town's spread misses the key, fix the weights' sources, never assign views to fit.
3. **Parties are data.** Party organizations and their positions are rows (M2-08 builds the organizations and primaries), so any number of parties can exist and none is named in code.
4. **Change from causes, on the day they happen:** a conversation with someone trusted (from contact and closeness), an event that touches the person (a layoff, an eviction, a crime, a law landing on them), news and speeches once M2-09 lands (expose the call now), and a party or trusted leader moving. Each change records its cause. Nothing drifts on a monthly schedule over everyone.
5. **Engagement** sets how tight and consistent a person's views are and how often they talk politics; most people stay weak and mixed, with no opinion on many issues.
6. **Private and public** stances split under social pressure (the views of the people around them and what's at stake for them), so a poll, a vote and a speech can disagree.
7. **Voter groups carry values:** extend each group row from one lean number to its spread on the 14 values and key issues, so other places and the coarse tier can use views without simulating every voter. Keep the core's rule: groups are checked against sourced spreads and never drawn.
8. **Bench:** a person's values and stances with the reasons behind each, and the town's spread against the answer key for its state and metro.

## Out of scope

Elections and the ballot (M2), party organizations (M2-08), news (M2-09), officials' positions (M1-officials reads this module), and other places' dynamics (M1-13).

## Hand-off

The finisher draws two states from all 56 and checks the generated towns' views against the state and metro answer keys by age, education, faith and region; shows the two states' conservatives differing; and runs one big event (a plant closing, from M1-business when available, else a recorded event) showing shifted views among the people it touched, with causes, and no change among those it didn't.
