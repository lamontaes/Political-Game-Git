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
---

**What.** Source the numbers behind elections, campaigns and voting. Each row below is a registered stopgap whose replacement waits on sourced or estimated data, collapsed here from 4 pool item(s) on Oct 19, 2026 so one researcher takes the engine family at once. For each row, find a public source with a year and a unit, record the figure as a SOURCED or ESTIMATED parameter row with a citation and a spread, put the research file under data/research/elections/ with a reader, and resolve the stopgap row. Where a row's replacement is a mechanic rather than a number, source what that mechanic will read and leave the mechanic to the area's builder (name the pool item in the PR).

- `SG-GOV-campaign-pollster-seller` in src/core2/modules/campaigns.ts: Where the town records no professional-services business (NAICS 5419 includes public opinion polling), a campaign's poll interviews are paid to a stand-in pollster organization in town. Replacement: The region's or state's real polling firms (County Business Patterns NAICS 541910 by county) as recorded organizations a campaign buys from.
- `SG-GOV-campaign-mail-seller` in src/core2/modules/campaigns.ts: Where the town records no professional-services or manufacturing business (direct mail advertising, NAICS 54186; printing, NAICS 323), a campaign's mailers are paid to a stand-in mail house in town, postage included. Replacement: The region's printers and mail houses (County Business Patterns) as recorded sellers, with postage paid to the Postal Service's account.
- `SG-GOV-campaign-venue-seller` in src/core2/modules/campaigns.ts: Where the town records no recreation, lodging or food-service business, a campaign event's venue rent is paid to a stand-in venue in town. Replacement: The town's public buildings and halls as rentable places with their fee schedules, and the region's venues.
- `SG-GOV-filing-deadline-estimate` in src/core2/modules/elections.ts: A town's filing deadline where the state's municipal rule is unread (its row in filing-deadlines.json is 'unread'): the median number of days between the candidate filing deadline and the primary over the places with a 2026 row (85 days before the election). Replacement: Each unread state's deadline rule read from its code into src/core2/data/elections/filing-deadlines.json, and each ESTIMATED row checked against the current statute.
- `SG-GOV-filing-fallbacks` in src/core2/modules/elections.ts: Where a place's filing row carries no filing office, minimum age or voter-registration rule (county offices in Alaska, Connecticut, Rhode Island, D.C. Replacement: Each place's own rule read into data/research/elections/filing-requirements.json.
- `SG-GOV-polling-place-kind` in src/core2/modules/voting.ts: Where the town's records hold no government building, its polling places have no building and a kind of "unread"; where they hold one, every precinct votes in it. Replacement: Each state's polling place facility types from the EAC's full EAVS dataset and the town's own buildings of those kinds (its schools, churches and halls) as recorded places, one per precinct.
- `SG-GOV-ballot-order-estimates` in src/core2/modules/voting.ts: For 20 of the 56 places the ballot-order rule is read from a secondary source or assumed: the five territories' rules are guesses, and 15 states' primary rule or order within a party is assumed (the rows marked estimate in data/research/elections/ballot-order-2026.json). Replacement: Each estimated row checked against its statute (the state election code, or the territory's) and its estimate flag cleared.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself; a sourced rate calibrates the band the proof reports against, never the chance one person acts. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source in data, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Sliding scales and causes: if an engine reads the number as a cap, a cutoff or a chance, file a bug for the builder instead of sourcing it. Follow .agents/skills/researcher/SKILL.md.

**Done when.** Each listed row is SOURCED or ESTIMATED in its parameter table with a citation (publisher, year, URL) and a spread (low, high, unit, citation); each stopgap row above is resolved in src/core2/data/stopgaps.json with the source named; the research-data-reader guard (tests/guards/research-data-has-reader.test.ts) is green; the tripwire and calibration-guard tests pass; and a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) reports each band and where the town landed.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/elections.ts, src/core2/modules/voting.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/elections/

**Notes.** Folded from: elections-stopgap-campaigns-missing-data, elections-stopgap-elections-estimated-calendar, elections-stopgap-elections-missing-data, elections-stopgap-voting-missing-data. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.
