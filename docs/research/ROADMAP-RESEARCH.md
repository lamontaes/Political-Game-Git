# Roadmap research list

Owner-requested Oct 11, 2026: one research session works through the real-world research the whole roadmap needs (M1 to M7), so findings are ready before each work order starts. This page is the list and its rules. The session keeps its own log (below); the CTO keeps this page.

## Rules

1. **Research only.** No game code, no changes to `src/`. Findings are data files and short notes.
2. **Stay out of running sessions' folders.** Don't write in `data/research/laws/` (CODEX-LAWS), `data/research/macro/` (CODEX-MACRO), `data/research/views/` (CODEX-VIEWS), or `data/research/renewal/` outside its `moves/` subfolder (CODEX-RENEWAL). Their topics aren't on this list.
3. **Where findings go:** the folder each topic names below, new files only in folders that already exist. Every row carries its source, URL, retrieval date, the source's terms, which of the 56 places it covers, and whether it's an estimate (with its spread and basis).
4. **Depth:** federal and state facts are exact. Local facts come from a representative sample of real places of each kind in every state (largest city, a mid-size city, a small town, a county, an unincorporated area), then an estimate with a spread for the rest. The 56 places are the 50 states, D.C., Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa and the Northern Mariana Islands.
5. **Sources:** the agency or government that publishes the fact, not a mirror. Check and record every source's terms first. U.S. government data is free to use. **Don't use:** the Council of State Governments' Book of the States, Zillow research data, Eviction Lab, S&P Case-Shiller, Freddie Mac's survey, ANES or GSS, or Ballotpedia, unless the CTO confirms permission. Pew is allowed with its notices, attribution and disclaimer. If terms are unclear, record the question in the log and move on.
6. **Store derived tables, not raw dumps.** Keep each committed file under 5 MB; reference large raw files by URL and checksum.
7. **Answer existing requests in place.** Before each topic, search `docs/research/requests/` for matching requests without an `answer`, and fill in `answer` and `sourcesChecked` there.
8. **Don't stall.** When a fact can't be found after a reasonable search, record the gap with the best sourced estimate and move to the next item. Never invent a number.
9. **Real people:** collect aggregates only. Never record real officeholders' names.

## Where to log

Branch `pool/research-roadmap` from `main`, one draft PR. After each topic, add one line at the top of `docs/research/roadmap-research-log.md` (topic id, files written, places covered, gaps, terms questions) and commit. Put the same line at the top of the PR body. The CTO merges finished topics as they land.

## The list, in priority order

### Priority 1: M1 work orders that haven't started

Each work order's "Research first" section in `docs/packages/` is the exact brief.

- **R1 State and metro economies** (M1-regional): state and metro employment by industry (BLS CES state and area, QCEW), state output by industry (BEA), LAUS unemployment history to 2000, how each industry follows the national cycle and how long a state's gap lasts (requests `local-jobs-react-to-industry-shocks`, `unemployment-return-to-normal`), territory labor statistics. → `data/research/regional/`
- **R2 Credit and banks** (M1-credit): household debt by type and delinquency (New York Fed; check terms), consumer credit (Federal Reserve G.19), bank balance sheets (FDIC), who holds what (Survey of Consumer Finances), small business line decisions (request `town-bank-line-underwriting`), household underwriting from published federal guidance. → `data/research/credit/`
- **R3 Jobs** (M1-jobs): JOLTS openings, hires, quits and layoffs by industry and region (request `job-market-calibration`), the OEWS industry-by-occupation staffing matrix, unemployment duration (CPS), time to fill. → `data/research/jobs/`
- **R4 Housing** (M1-housing): every place's eviction steps from statute (notice and its length, cure period, filing, time to hearing, judgment, time to removal, right to counsel), with the section cited, for all 56; FHFA house price index by state and metro; vacancy and rental stock (Census); how fast supply responds; how often renters move. → `data/research/housing/` (new files)
- **R5 Treasuries, taxes and budgets** (M1-budgets-taxes): county and city fiscal year starts and adoption deadlines (sample per state), territory revenue by source, the share of public spending bought from local businesses (request `realized-public-money-macro-magnitudes`). → `data/research/budgets/`
- **R6 Programs reaching people** (M1-budgets-programs): unemployment insurance by state (Department of Labor's comparison of state laws), Medicaid and CHIP eligibility by state (CMS), SNAP by household size and the territories' nutrition programs (USDA), Social Security and Medicare rules (SSA, CMS), Title I and special education allocations (Department of Education), a sample of state school aid formulas, federal highway apportionments and pass-through (FHWA). → `data/research/programs/`
- **R7 Offices and seats** (M1-officials): every office's structure in all 56 (chamber sizes, districts, terms, term limits, staggering, statewide executive offices, how each vacancy is filled) from constitutions, statutes and official sites (requests `state-legislature-chamber-sizes-and-quorum`, `legislature-packs-for-every-unbuilt-jurisdiction`, `island-territory-legislatures-and-local-offices`); county and city offices by sample; officials' age, tenure and prior jobs in aggregate (request `state-legislator-age-tenure-and-district-lean`). → `data/research/offices/`
- **R8 Businesses** (M1-business): business births, deaths and location changes by age, size, industry and state (Census BDS, BLS BED), how owners fund a start (Census Annual Business Survey; the Small Business Credit Survey, check terms), owner pay and draws (IRS SOI), the share of establishments in multi-unit firms (CBP, BDS). → `data/research/business/`
- **R9 Moves** (M1-renewal Part 2): state and county flows (IRS migration data, ACS), components of population change, immigration from abroad including the territories, and why people move (CPS; request `migration-rates-and-reasons`). → `data/research/renewal/moves/`
- **R10 Drives from economic loss** (M1-drives-economy): how often job loss, eviction or a failed business turns into lasting anger at someone, a new ambition or joining a cause, and in whom; political participation after plant closings. → `data/research/drives/` (new files)
- **R11 Other places** (M1-other-places): Census population estimates by county and place, with Puerto Rico's municipios and the territories, and their recent rates of change. → `data/research/places/`
- **R12 Prior budgets** (M1-history Part 2): each level's adopted budgets and actual revenue and spending for the fiscal years 2021 to 2025, from Census finance data and state budget documents. → `data/research/history/`

### Priority 2: M2, running for office

- **R13 Election calendars and filing rules:** for every level in all 56, election dates, filing windows and deadlines, qualifications, petitions and fees, **which office takes filings** (clerk, registrar, board of elections, secretary of state) and how it's named, primaries, runoffs, top-two and ranked-choice where used. Local by sample. → `data/research/elections/` (new files)
- **R14 Campaign money:** contribution limits by office and state (FEC; state ethics and elections agencies), disclosure rules, and what campaigns spend by level. → `data/research/campaigns/`
- **R15 Who runs:** how often seats are contested, how often incumbents run again or retire, by level, from academic and government sources. → `data/research/elections/` (new files)
- **R16 Turnout by election type:** primaries, municipal and off-cycle elections, by state where published. → `data/research/elections/` (new files)
- **R17 Parties:** registration by party where states report it, each state's primary type by party, how party organizations are structured (state, county and local committees). Parties are data; record whatever parties the sources show. → `data/research/parties/`
- **R18 Basic news:** local outlets per county (check terms on any news-desert dataset), news habits by age and education (Pew), how news spreads by word of mouth. → `data/research/news/`

### Priority 3: M3, governing

- **R19 Legislative procedure** for every state, Congress and a sample of councils: session calendars, committees, quorum, required votes, veto and override windows, bill volumes (requests `legislative-step-pacing-and-veto-override`, `how-congress-moves-bills`, `local-council-legislative-volume`, `council-ordinance-passage-vote`, `legislative-committees-and-assignment-by-chamber`, `generated-legislature-session-frequency-and-carryover`). → `data/research/legislatures/`
- **R20 Executive powers:** governors (line-item veto, appointments, emergency orders, budget role), mayor and manager forms by sample, county executive forms, the presidency's powers. → `data/research/executive/`
- **R21 Staff:** legislative, executive and council staff sizes by state and level. → `data/research/executive/`
- **R22 Interest groups and lobbying:** registered lobbyists and spending by state, how groups form around a bill's costs. → `data/research/interest-groups/`
- **R23 Constituent cases:** how many cases offices handle and what kinds. → `data/research/constituent-cases/`
- **R24 Corruption base rates:** public corruption convictions by state (Department of Justice Public Integrity Section reports), ethics complaints. → `data/research/corruption/`
- **R25 Ballot measures and recalls:** where each is allowed, signature thresholds and timing, for state and local offices. → `data/research/direct-democracy/`

### Priority 4: M4 to M7

- **R26 Sources of real public speech** for the English engine: public-domain records of how people talk in government (the Congressional Record, state legislative journals, council minutes), cataloged with terms and coverage. → `data/research/speech-sources/`
- **R27 State and federal careers** (M5): how state legislators, governors and members of Congress got there, in aggregate. → `data/research/offices/` (new files)
- **R28 Release** (M7): Steam's current store and AI-disclosure requirements, typical minimum PC specs and prices for comparable simulation games. → `docs/research/release/`
- **R29 Data licenses** (M7 legal check): the terms of every source already in `data/research/` and `data/source/`, flagging anything that forbids commercial use. → `data/research/licenses/`
