# Follow-ups (small stuff, noted, not blocking) — Oct 2

## HARD-CODED NUMBERS AND PLACEHOLDERS: FIX THESE FIRST (owner, Oct 2 11:05)

Owner: quick ones are fixed now; the rest are listed here and fixed first when he says go, ahead of the bug list.

- DONE (#2036): the HOME_PURCHASE_PLACEHOLDER is gone; down payments are sourced from NAR 2025. DONE (#2040): the mortgage rate is the policy rate plus a cited 2.525-point spread (FRED, Dec 31 2025). Also clear the stale placeholder-ledger.json rows. OLD ENTRY: Home buying: HOME_PURCHASE_PLACEHOLDER in src/simulation/home-purchase.ts:75 has a $50,000 down payment and a $1,200 monthly payment, national since Sept 23, scaled by town home prices. Fix: down payment = the game's recorded average down-payment share × price; monthly payment from the shared mortgage rate and term. Sent to Team 4 at 11:06 inside A53; if it takes more than 30 minutes it stays here.
- DONE (#2013): 40-hour week replaced by recorded hours, or the game's occupation average.
- Decision importance weights 1/2/4/6 in src/simulation/decision-scores.ts:8 (slight, moderate, strong, decisive). An authored scoring scale, not a world measure; listed for review.
- (IN PROGRESS #2025: the placeholder was removed, but it was sent back at 12:16 to record real cannabis sales.) Cannabis tax revenue = $40.70 per resident × state population (and an 11-month first year), in CANNABIS_TAX_EFFECT (public-budgets/rules.ts, moved there by #1888). It must come from recorded cannabis sales × the enacted rate. Not quick. Also: the end-to-end cannabis revenue tests are already red on main.
- College tuition is a catalog constant (life-paths2-catalog.ts, e.g. periodCostMinor: 500000, i.e. $5,000 a period everywhere), and colleges in play record no location or state ownership. Being fixed inside #2011 (A21) per the 13:06 send-back.
- STARTING LAW AMOUNTS (biggest gap): 40 starting laws declare amounts (rates, thresholds, ages, shares), and 886 of their 890 in-force places carry NO amount, so those laws do nothing at game start. Worst: balanced budget 55, income tax 47, voting restoration 45, Medicaid 44, grocery exemption 43, local authority 42, pensions 38, broadband 37, groundwater 37, collective bargaining 36. Systematic job posted in 00g at 2:58 (split by area, cited values, plus a test guard).
- Sweep of everything on main: a checker is listing all placeholder numbers, names and events (11:06); results go here.

From gates and the 7:30 playthrough. Fix after the audit reaches 80%, or when a team is free.

- Tests that pin one place instead of drawing from all 56: #1589 (Columbus), #1532 electorate-required.test.ts ("OR"), place-population-parts.test.ts (check).
- #1671: A114's third check (primary pull from recorded voters' support); the presidential share falls back to 0.5 when a state row is missing; CONTINUITY cases take 99 minutes.
- #1542: campaign screens show canonical support until the memo samples recorded contacts (poll-as-sample ruling); campaign-polling.ts orphaned.
- #1532: 13 election tests assert the old placeholder results; update them to real electorates.
- #1876: owner-draw constants (300k–900k per kind); three copies of settle-from-dated-cash (loans, rent, business) to unify.
- #1921: the nationwide retelling proof runs 521 s against 600 s; it tightens as speed improves.
- #1918: the D.C. council autonomous case is still over 180 s (turnover and principles dominate).
- Playthrough: the radial bubbles overlap the Now bar and player card; the journal leaks "I was home; my work schedule has no shift at this hour" and "As I heard it:"; the school gap 1998–2002; "Since 2026, you've worked at …" is listed before 2007; the "served by City of Belton" phrasing.
- 108 estimate values to convert (Team H's CSV): 85 convert plus 23 that need the spread; done by slice owners as follow-ups after 80%.
- Chronic illness: the young/old prevalence skew (Team A is investigating in its PR).
- #1932: funded-service-capability.test.ts:91 hard-codes Nevada as the fictional example (Nevada is now sourced); pick the state dynamically.
- #1532: 13 election tests and 1 editorial test assume the old placeholder results; estimate the electorate from the game where none is recorded.
- #1938: 38 states still pending ratification rules; fill them from docs/research/legal-rules-2026-10-02.md.
- #1955: portrait initials after Save, then Continue, not reproduced; Codex needs the player's age and last action.
- #1953: in an ordinary opened world, 'recorded monthly personal income' doesn't exist yet, so the A64 denominator may be absent. TEAM 4: produce monthly personal income from the game's own recorded household pay (averaged with the game's spread where missing); never blank.
- #1953: recorded monthly personal income doesn't exist in a normal opened world; produce it from household pay (Team 4).
- #1957: the chronic-illness PR is paused (MAX_SHARE constant; delete it); off-audit until after 1 p.m.
- #1958: officeholder speed is paused (off-audit) until after 1 p.m.
- Team 1's compact candidates (save size, owner-approved) are paused until after 1 p.m.
- #1820, #1935, #1939: households in Chicago, New Orleans and 7 WI places get no district; the board stack is held behind it.
- #1885: duplicate perception key, and an undecided case decided (decisions.test.ts).
- #1353: GAME-BREAKING world LOAD crash (an import cycle via player-monthly-money.ts; SAME_SEX_COUPLE_SHARE before init).
- #1950: kept editing scripts/audit/rules.json (never allowed); revert.
- #1922: an import-line conflict cleared on its own; check again at merge.

- [10:31] judicial-review.test.ts national-law court case runs ~30.4 s against a 30 s limit (on main via #1981/#1973). Codex Team 9: cut the fixture or give that one case a 60 s limit.
- [10:53] ordinary-adult-life.test.ts: 2 cases red on clean main (seen in #1993 gate, Team C). Find the merge that broke them; Codex fix after 1 p.m.
- [11:34] statehood-funds.test.ts: 3 cases red on clean main (seen in #2017 gate, Team E). Codex fix after 1 p.m.
- [11:49] central-bank.test.ts "Build 19: President names the chair…" red on clean main (seen in #2022 gate). Codex fix after 1 p.m.
- [12:50] A50 follow-up: schools, police, fire and state/federal offices still pay from the workplace (only city/county offices route through the government account after #2024). Give them their government identity at setup (Overflow 1).
- [13:17] Campaign outreach is not shown working in play: the outreach tests fail on main too (Team G, #1925 gate). Elections owner fixes after the 80% push.
- [13:17] Campaign outreach is not shown working in play: the outreach tests fail on main too (Team G, #1925 gate). Elections owner fixes after the 80% push.
- [14:03] federal-law-cost-stamps.test.ts: 5 farm-subsidy cases still fail after #2044 (were 20/24 failing on main). Team 9 (farm owner) fixes.
- [14:08] OWNER: delete the community-meeting title art (art/references/masters/scene-environment/PG_TITLE_BG_COMMUNITY_MEETING_HERO_SLOT_02_5504x3072.png). He says it was supposed to be removed weeks ago and the man in it is wrong; it must not be in the game. Check what still uses it (title screen) and replace it with current generated art.
- [14:32] 5 cannabis revenue tests red on main (seen in #2046 gate); #2025 (recorded purchases) should fix them.
- [14:47] FIX-FIRST: starting teacher salary floors (26 states) have no amounts, so they do nothing; starting levy bindings are missing (seen in #2055 gate). Team 6 sources them.

## 15:12 additions

- FIX-FIRST: #2061 gate found ~28 placeholder words in data files outside the two assumption ledgers (Team J). List them and map or fix.
- #2058 (A35) merged: in a 120-day random game no law story was published at all, so starting-law news never reached a reader in play. Check law-story publishing frequency.
- #2055 (A15) merged with a FAIL on the play proof: no starting law of the three kinds applies in a random new game. Cause is the 886 missing starting-law amounts (systematic job by area, Team 6 guard test).
- #2057: I added tests/support/recorded-civic-journalist.ts to tsconfig.node.json (TS6307); Team I re-gating typecheck.
- A24 #2063 merged: federal aid (Medicaid match etc.) pays $0 in a normal game on main too — no producer posts program payments. Main coordinator (Public money) owns it.
- Living-cost per-world spread lost its seeded draw in #1421; needs a recorded source (differences between places).
- FIX-FIRST: TOWN_HOME_PRICE_FACTOR (town-homes.ts:141, HARDWIRED home-price-by-kind), downsizeFromAge 65 and evictionOnRecordDays (HARDWIRED placeholders) in town-homes.ts.
- #2067: withholding test ~27 s / 30 s limit (shrink it); Illinois personal exemption instead of an estimated standard deduction.
- #2041 follow-ups: plain-words loan provenance (no CTO ticket wording); recorded lender org + default/collections thresholds; loan count vs ACS mortgaged-owner share (only 2 loans in 9,412 people).
- FIX-FIRST: teacher-salary-floor.ts recordedTeacherSalaryMedian multiplies by a fixed 40 hours (#2076); use the role's recorded hours / annual = period pay x periods.
- FIX-FIRST: opening teachers in a town are written at ONE identical rate (#2076 gate, 8 random games); opening pay must vary from recorded tenure/experience.
- #2076 test teacher-sponsor-floor fails on 3 of 8 random seeds (no bill filed, 1 teacher, adoption timeout).
