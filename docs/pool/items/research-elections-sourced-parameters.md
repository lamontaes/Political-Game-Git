---
id: research-elections-sourced-parameters
title: "Research: sourced parameters for elections, campaigns and voting"
area: elections
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from elections-stopgap-campaigns-missing-data, elections-stopgap-elections-estimated-calendar, elections-stopgap-elections-missing-data, elections-stopgap-voting-missing-data"
claimed-at: 
---

**What.** Apply the sourced rows in docs/research/pool-feeder-oct20/research-elections-sourced-parameters.md to the parameter table(s) and data files for sourced parameters for elections, campaigns and voting. Each row already carries a value, a low and high spread, a tag (SOURCED or ESTIMATED) and a citation, so the builder enters them, adds a reader for each research file, and resolves these stopgap rows in src/core2/data/stopgaps.json: SG-GOV-campaign-pollster-seller, SG-GOV-campaign-mail-seller, SG-GOV-campaign-venue-seller, SG-GOV-filing-deadline-estimate, SG-GOV-filing-fallbacks, SG-GOV-polling-place-kind, SG-GOV-ballot-order-estimates. Rows tagged mechanic name a change the area's builder makes to read the sourced inputs; build the simplest version and register what remains.

Rows:

- `SG-GOV-campaign-pollster-seller` in src/core2/modules/campaigns.ts: Where the town records no professional-services business (NAICS 5419 includes public opinion polling), a campaign's poll interviews are paid to a stand-in pollster organization in town. Replacement: The region's or state's real polling firms (County Business Patterns NAICS 541910 by county) as recorded organizations a campaign buys from.
- `SG-GOV-campaign-mail-seller` in src/core2/modules/campaigns.ts: Where the town records no professional-services or manufacturing business (direct mail advertising, NAICS 54186; printing, NAICS 323), a campaign's mailers are paid to a stand-in mail house in town, postage included. Replacement: The region's printers and mail houses (County Business Patterns) as recorded sellers, with postage paid to the Postal Servi...
- `SG-GOV-campaign-venue-seller` in src/core2/modules/campaigns.ts: Where the town records no recreation, lodging or food-service business, a campaign event's venue rent is paid to a stand-in venue in town. Replacement: The town's public buildings and halls as rentable places with their fee schedules, and the region's venues.
- `SG-GOV-filing-deadline-estimate` in src/core2/modules/elections.ts: A town's filing deadline where the state's municipal rule is unread (its row in filing-deadlines.json is 'unread'): the median number of days between the candidate filing deadline and the primary over the places with a 2026 row (85 days before the election). Replacement: Each unread state's deadline rule read from its code into src/core2/data/elec...
- `SG-GOV-filing-fallbacks` in src/core2/modules/elections.ts: Where a place's filing row carries no filing office, minimum age or voter-registration rule (county offices in Alaska, Connecticut, Rhode Island, D.C. Replacement: Each place's own rule read into data/research/elections/filing-requirements.json.
- `SG-GOV-polling-place-kind` in src/core2/modules/voting.ts: Where the town's records hold no government building, its polling places have no building and a kind of "unread"; where they hold one, every precinct votes in it. Replacement: Each state's polling place facility types from the EAC's full EAVS dataset and the town's own buildings of those kinds (its schools, churches and halls) as recorded places, one per p...
- `SG-GOV-ballot-order-estimates` in src/core2/modules/voting.ts: For 20 of the 56 places the ballot-order rule is read from a secondary source or assumed: the five territories' rules are guesses, and 15 states' primary rule or order within a party is assumed (the rows marked estimate in data/research/elections/ballot-order-2026.json). Replacement: Each estimated row checked against its statute (the state election co...

**Rules.** Research before building: the sourced figures calibrate the totals the proof reports and never decide what one person does. Estimate, never UNKNOWN: any value without a measure keeps its ESTIMATED tag, source and spread. One rule, all 56 places: place values live in data keyed by place code, never named in logic, and the proof draws a random place. No dice: no seeded roll or fixed percentage picks an actor's outcome; causes and records do.

**Done when.** Each row is SOURCED or ESTIMATED in its parameter table with a citation and a spread, the stopgap rows above are resolved in src/core2/data/stopgaps.json (or kept with a reason), the research-data reader guard and the tripwire test pass, and a one-year played world (buildBenchWorld, a place drawn from all 56, seed named) reports each band and where the town landed against it.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/elections.ts, src/core2/modules/voting.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/elections/

**Notes.** Folded from: elections-stopgap-campaigns-missing-data, elections-stopgap-elections-estimated-calendar, elections-stopgap-elections-missing-data, elections-stopgap-voting-missing-data. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.

Oct 20 (pool feeder): research done in docs/research/pool-feeder-oct20/research-elections-sourced-parameters.md (7 rows: 3 sourced, 4 estimated, 0 mechanic).
