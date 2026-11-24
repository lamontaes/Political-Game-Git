# Laws and effects: what the owner already ruled, checked against main

Checked Nov 8, 2026, about 2:30 a.m. Eastern, against `main` on GitHub (no clone). For the Laws and effects session (brief: `docs/coordination/night-2026-11-08/laws-effects.md` on `docs/night-2026-11-08`).

How to read this:

- A quote in quotation marks is the owner's own words, with date and source.
- "Recorded" means a CTO or session wrote it down in its own words; the owner approved it, but the words are not his.
- Status: **done** (file and line or PR), **partly** (what is missing), **not done**.
- "Do" is one line on what the session should do next.
- Not-done and partly come first, most important first. Done items and conflicts are at the end.

Sources read: `docs/coordination/OWNER-DECISIONS.md`, `docs/play-first/LAW.md`, `docs/coordination/DECISION-REGISTER.md`, the voice notes (including the Nov 8 note on the night branch), `rulings-nov8.md`, the playtest records, the 18 local memory files named in the task, and the code and data named below.

---

## Part 1. Not done or partly done (most important first)

### 1. The consumer loan cap, finished

- **Ruling.** "I definitely want that one law finished. I want the rest of the research finished." (Nov 8; recorded in the brief, not in the saved voice note file.)
- **Earlier rulings it rests on.** Small-dollar lenders: yes, simulated in the background where state law allows them (owner, Oct 24; recorded, OWNER-DECISIONS "Oct 24: rulings"). Their records are background simulation: "Just go ahead and make them like a background process. That's one of those things that the player doesn't really need to see, but it needs to be simulated for laws and stuff like that." (Oct 29, 9:25 a.m.; OWNER-DECISIONS Oct 29 13:30 UTC).
- **Status: partly.**
  - Lenders exist and the cap binds them: #7000 (merged Nov 1).
  - The law-wiring table still grades the cap "partly" (`docs/reports/law-wiring-table.md`, last regenerated Nov 1). The web link is not shown: the cap's effect lags 12 months, the checker's run is one year, and in the one checker place with a lender the legislature put the cap back seven months in.
  - Pool `tests-loan-cap-case-red-by-draw` is open: in some drawn places no household quoted under the cap is lent to.
  - Congress has no route to a federal cap. The powers catalog lists `us-federal-positions:monetary-financial.cap-consumer-loan-interest` (`data/research/powers-catalog/question-powers.json`), but the bill catalog offers the cap at state level only (`src/core2/data/legislature/bill-catalog.json`, Banking and credit), and no member has a stance on the federal question (see item 3).
- **Do.** The Dev Mode session on the CTO's account is proving this law; don't duplicate it. Fix `tests-loan-cap-case-red-by-draw`, and post on the coordinator's channel what the dev-mode proof needs from your files (a hold on the law past the 12-month lag; the federal route if wanted).

### 2. Laws passed elsewhere do something there, and places drift apart

- **Rulings.**
  - "No, laws need to work federally. Other states and towns never sit. No, all 50 states need to." (Oct 29, about 5:40 p.m.; OWNER-DECISIONS Oct 29 21:40 UTC.)
  - Every other city and county meets on its real schedule; "Laws they pass are real records with real effects." (Sept 26; recorded, DECISION-REGISTER "The world outside your area".)
  - "Everything that I say I want my character to be able to do should be simulatable in the background. Remember, the world keeps living without my character. I am not the main character." (Oct 26 playtest; `docs/coordination/playtest/2026-10-26-1.md` line 25.)
  - "Can people start moving to different states because they're desirable? Do other states change their laws?" (Nov 8 voice note, `2026-11-08-story-and-night.md`.)
  - "just simulate based on the people there and then you can fill in the gaps based on what was simulated when things need to be generated. generate on demand" (Nov 5, 12:49 p.m.; OWNER-DECISIONS top.)
- **Status: partly.**
  - Done: every state, D.C. and territory legislature sits and passes laws, keeping only the result (#7290; `src/core2/modules/world-legislating.ts` lines 1068-1083, `openOutsideSession`, stopgap `SG-GOV-outside-session-result-only`).
  - Not done: those laws move nothing in their own state.
    - The outcome web reads law only for the player's town (`src/core2/modules/outcome-web.ts` line 319, `readsTownLaw`: "other places keep their own laws").
    - Counted movers weigh the player's state's income tax in force but every other state's tax from the fixed 2026 table (`src/core2/modules/counted-moves.ts` line 493, and the import at line 20). If another state repeals its income tax in play, nobody moves because of it. The code's own header (line 3) cites the owner, Oct 14: "if California repealed its state income tax, people would flood in" (recorded in that code comment only).
  - Not done: other states pass only yes-or-no policy questions (`world-legislating.ts` line 1111 loops `PLATFORM_QUESTIONS`), never amounts such as a wage or a tax rate.
  - Not done: other towns' councils. Unit U4 of `docs/reports/world-governing-plan-2026-10-29.md` ("Other towns' councils sit") has no PR on main. Only the town's council and its county board meet (`world-legislating.ts` lines 206-226). The pool marks `gov-every-state-and-town-governs` done, but its done-when asks for "three other towns' councils" and #7290 itself says "Done when: not met."
- **Do.** Make an outside law's result row count where it governs, at a coarse grain: the counted movers read each state's law in force; the web's state-level measures read that state's law. Keep only results (Nov 5). Then let outside sessions change amounts, through the same members' views.

### 3. Congress is a level for every question real federal law reaches

- **Rulings.**
  - "And these should all be able to be reversed as well." (Nov 7, about 2:30 p.m.; memory `laws-reversible-nov7.md`.) Brief: every law at every level, by the body that has the power.
  - "Why not federal legislator and president? Again, these all use the same engine. It shouldn't be that hard." (Oct 29, about 5:40 p.m.; OWNER-DECISIONS Oct 29 21:40 UTC.)
  - Congress is in early access, same engines as every other level (Oct 14; recorded, OWNER-DECISIONS Oct 14 overnight).
  - Federal-only questions enter Congress's pool only once each has a standing answer, members' stances and an effect reader (acting CTO, Oct 20 night; recorded).
  - Research depth: federal law exact (Oct 5; recorded, memory `research-depth-tiers.md`).
- **Status: partly.**
  - Done: Congress passes and repeals in play (#7326, Hamburg, New Jersey, replay `8d5e52aae98296b1`); income tax adoption (#7352), wages (#7334), cannabis (#7338), Social Security ages (#7324), work rules (#7322), federal amounts (#7328, #7329).
  - Missing: 20 federal-only questions sit in the powers catalog (`question-powers.json`, the `us-federal-positions:` rows: debt limit, top income rate, loan interest cap, defense, foreign aid, tariffs, immigration, drug prices, retirement age, student loans, vouchers, rail, power-plant carbon, farm subsidies, disaster costs, mandatory minimums, the stock-trading ban, data privacy, D.C. statehood, and the federal wage). Only the wage reaches the bill paper.
  - None of the 20 has a member stance axis (`data/research/campaigns/issue-axes-2026.json` has 54 axes, none federal-only), so no member can file one.
  - The federal government's own opening answer exists for only 2 questions (`src/core2/data/legislature/federal-answers.json`). A federal question with no answer is read as "not law" (`world-legislating.ts` `needsChange`, line 284).
  - Stopgap `SG-GOV-federal-proposal-coverage` still fires every Congress session (`world-legislating.ts` lines 968-970).
  - Pool `gov-congress-passes-policy-laws` (p1) is still open, though #7326 looks like it meets its done-when.
- **Do.** For each federal question, in order of what Congress really passes: a cited federal answer, a stance axis, a bill-catalog row at `federal`, an effect reader. Then close `gov-congress-passes-policy-laws` against #7326's records.

### 4. The unread effects reach people

- **Rulings.**
  - "the priority is to make the laws do something real." (Sept 27, 5:50 p.m.) "it's not just financial ... education, infrastructure, healthcare, social stuff ... Environment. Everything." (Sept 28, 8 a.m.) "I'm not worried about just the money ... Laws affect more things than money." (Sept 30, about 9:55 a.m.) (Memory `laws-must-do-something-real.md`.)
  - "the relationship and the degree needs to be correct for the simulation to actually produce incredible things." (Sept 28; memory `outcome-web.md`.)
  - "I assume everything in between needs to also be done as well" (Oct 29, about 5:40 p.m.; OWNER-DECISIONS Oct 29 21:40 UTC).
  - "go ahead and do family batches for the links reaching people and traits, etc." (Oct 28, 4:15 p.m.; OWNER-DECISIONS Oct 28 20:20 UTC.)
  - Records a law's outcome needs are background simulation, built through the engine that owns each record, never a new system beside it (Oct 29, 9:25 a.m., quoted in item 1; recorded rule).
- **Status: partly.**
  - 175 of 246 researched links reach people; 21 graded about zero; 50 unread (`docs/reports/law-wiring-table.md`, Nov 1). `src/core2/data/outcome-web/unwired.json` still lists the same 50 links today, so nothing has moved since Nov 1.
  - Of the plan's ten families (`docs/reports/effects-web-plan-2026-10-29.md`): family 1, grades, is done (#7021); family 10, research sizes, is done (#6847); medical debt is in (#7036). Families 2 (treasury interest), 4 (voting relief), 5 (jobs pull to work), 6 (sentencing), 7 (place prices), 8 (child health) and 9 (births into credit) have no merged PR.
  - Sixteen links wait on background records (weather and heat, child blood lead, adult mood, arrivals from abroad, school staffing, press trust, student loans, disaster job losses).
- **Do.** Run the families in the plan's order, one PR each, proven in two random places. Build each missing record from research through its owning engine. Never invent a size the research does not give.

### 5. Proofs run several twin pairs

- **Ruling.** "they should still drift because there are other circumstances. You know, someone may die earlier." Run several pairs. (Nov 8; `rulings-nov8.md` item 11.)
- **Status: partly.** The law checker and family proofs use twin worlds on two draws (effects-web plan, "The workflow for one family"). Nothing yet says "several pairs".
- **Do.** Every effects proof runs several twin pairs per place and reports the spread, not one pair.

### 6. More of the bill menu can be enacted

- **Rulings.**
  - "this is the entire backbone of the game, and you narrowed it." (Sept 27; memory `never-narrow-legislation-backbone.md`.)
  - The catalog is the 18-subject "Legislative Content Menus, Proposal V1", scoped by the real-bill research (Sept 25-26, restated Oct 14; recorded, OWNER-DECISIONS Oct 14).
  - No effectless bill enters the normal docket: a subject offered to the player needs an operative consumer (Sept 24; recorded, DECISION-REGISTER).
  - Fees set by bill: "yes", a council can set a fee level by bill where its powers allow; the fee is a law row the treasury reads (Oct 24; recorded, OWNER-DECISIONS Oct 24).
  - "I really just want to make the game playable, so I'm not worried about the super detailed stuff, just make the systems work for now." (Nov 7, about 9 p.m.; `rulings-nov8.md` item 1.)
- **Status: partly.** Counted from `bill-catalog.json` today:
  - 18 subjects, 133 topics, 45 topics with a policy, 149 policies.
  - By level: state 140, city 32, county 31, federal 19.
  - No policy in Immigration, Defense and Veterans, or Foreign Affairs and Trade.
  - Parks has one budget line. The brief says Parks has none; it has one.
  - "Dedicated parks funding" is filed under Rights, "Civil rights and equal treatment", which looks like a misfile.
  - Empty topics include Debt and borrowing, Fees and charges, Water and wastewater, Flood control, Campaign finance, Criminal law and sentencing, and Marriage, divorce and custody.
  - Fees by bill is not built: stopgap `SG-GOV-fee-level-by-bill` is still registered (`src/core2/data/stopgaps/gov.json`).
- **Do.** Add the policies each level really passes most often, each with its real effects: bonds and borrowing, fees, water, flood control, campaign finance and sentencing first, then federal immigration, defense and trade. Sentencing also unlocks effects family 6. Move the parks-funding row to Parks.

### 7. Moving is a weighed decision, and people move toward what is desirable

- **Rulings.**
  - Moving is a weighed decision: ties to stay (family, friends, job, a partner's job, the kids' school, a home they own) against pressures to leave (costs, taxes, crime, no work, disaster), weighted by temperament; "No flat rate per tax point." (Sept 26; recorded, DECISION-REGISTER "How laws reach people".)
  - The Nov 8 voice note's question, quoted in item 2.
  - The player's own family does not leave the player before 1.0 (Oct 20; recorded).
- **Status: partly.**
  - Full people leave town from stage of life, ties, eviction, job loss and rent burden, plus the web's out-migration factor (`src/core2/modules/moves.ts` header and line 1160).
  - Where full people go is a relative, else the county's most common IRS destination, else their own state (`moves.ts` line 750, `destinationFor`). They never compare places.
  - The tax pull is a stopgap (`SG-WEB-moves-full-tax-pull`, `moves.ts` line 81).
  - Counted people do compare every state on after-tax income, prices and unemployment (`counted-moves.ts` header), but on stale tax for other states (item 2) and not on rents.
  - Pool `world-town-net-moving-negative` (p1) is open: a town's net moving should land within 1.5 percent of its state's.
- **Do.** Read each state's law in force in the counted pull; consider rents where the research sizes them; let a full leaver's destination weigh the same pull. Keep the player's family hold.

### 8. States take up laws their neighbors passed

- **Ruling.** "Do other states change their laws?" (Nov 8 voice note, quoted above.) Outside sessions are decided by "members' and governor's views and the chamber's makeup ... no chance, cap or rate" (Nov 5; recorded, OWNER-DECISIONS top).
- **Status: not done.** Nothing in `world-legislating.ts` reads another state's law. Members file from their own reasons only.
- **Do.** Research it first (the policy-diffusion literature exists; size it from the studies). If it holds up, build it through the views engine: news of a neighbor's law moves a member's stance by the existing heard-event amount, the same way the Oct 22 ruling lets news of conditions move stances. Never as a script or a rate.

### 9. A session's pace of law changes is real

- **Ruling.** Take `laws-session-moves-too-many-questions` (real bill volume) as the ruled lever (CTO, Oct 29 22:40 UTC; recorded). No count of bills is set anywhere; volume follows the members' reasons (Sept 24; recorded).
- **Status: not done.** The pool item is open: a session moves 10 to 19 of 58 questions in one sitting, against a real pace of a few a year. The outside session passes every question where a majority and the governor agree (`world-legislating.ts` lines 1111-1135). That makes states drift far faster than real ones.
- **Do.** Find the real mechanism that limits volume (floor time, leadership, the cost of moving settled law) from research. Apply it to both the full and the result-only paths.

### 10. Reversals: the remaining holes

- **Ruling.** "And these should all be able to be reversed as well." (Nov 7; quoted in item 3.) Repealing a fresh law follows the body's own rules from data; where there are none, a sliding reluctance from how recently and by how much it passed; no fixed cooldown (Oct 14; recorded).
- **Status: partly.**
  - Done: every active starting law has a reversal draft (#7330, `src/core2/starting-law-repeal-routes.test.ts`); every bill-catalog policy has a reverse operation (enact and repeal, raise and lower, expand and restrict).
  - Done: a state's bar on its towns is itself a law (#7314); a federal mandate governs and Congress can repeal it (#7316, #7322).
  - Done: the state town-ban vote, on and off, was played: Hamburg, New Jersey, replay `8d5e52aae98296b1` (S3 bars local rent rules 117-0, S4 restores them 83-37, and the town's row returns) (#7323, merged Nov 7). But its report and screenshots stayed on the Astra branch. `docs/reports/law-levels-state-reversal-2026-11-07/` is not on main; only the Congress report is.
  - Open: `law-levels-death-tax-zero-restoration` (estate and inheritance tax bills must restore their schedules after a zero). It is claimed by the stopped Astra session on `astra/death-tax-restoration`.
  - Open: `laws-medicaid-repeal-coverage-reopens` (after a state repeals the expansion, a new coverage payment opens a month later).
- **Do.** Take over the death-tax item and the Medicaid repeal bug. Land the state-reversal report on main. Redo both played proofs in dev mode when it merges.

### 11. An unread power is never a refusal

- **Rulings.**
  - "Nothing's unknown just use deviations of the averages and the game's engine should be able to figure that out." (Sept 28, about 10:06 p.m.; memory `estimate-not-unknown.md`.) Oct 2, about 8:05 a.m.: "don't leave shit blank" (same file). A missing rule is the most common rule among similar places in this game right now, marked as an estimate (Oct 2; recorded, same file).
  - Missing exact real-law certification "must not disable otherwise approved gameplay" (Sept 21; recorded, DECISION-REGISTER "Nationwide government").
  - Cities and counties have ordinary authority by default unless a state law or charter narrows it (Sept 24; recorded, DECISION-REGISTER).
- **Status: partly.** `src/core2/policy-authority.ts` line 60 says "A recorded unknown blocks introduction". The `unsettled()` helper (line 94) refuses the bill and fires `SG-GOV-policy-power-unresolved`. That happens when a question has no catalog row, when a gate question has no state law, or when the state has no home-rule row.
- **Do.** Replace each refusal with the most common rule among similar states in this game, marked ESTIMATED, and count how often it fired before and after.

### 12. Every place starts on its real current law, the federal level too

- **Rulings.** "Yes, current real law, small parts can change, but for the most part, again, just be recognizable." (Sept 28, about 11:15 a.m.; memory `starting-law-real-current.md`.) Federal and state exact; below the state, a representative sample (Oct 5; recorded).
- **Status: partly.**
  - States and places: `src/core2/data/laws/starting-law.json` covers 317 jurisdictions.
  - Federal: 11 rows in 8 amount series, and only 2 federal answers on policy questions (`federal-answers.json`). Real federal answers are missing, for example cannabis under the Controlled Substances Act and the federal data-privacy question.
  - Open research: `law-levels-sanctuary-flags-from-state-code` (#7343 found the sanctuary question covers 287(g) only); `research-local-income-tax-authority-dc-territories`.
- **Do.** Add a cited federal answer for every question in item 3. Finish the sanctuary flags from statute.

### 13. A bill's numbers are the sponsor's own

- **Ruling.** "there's no reason to do a placeholder when you can just do it right the first time that doesn't make any sense to me." Also "bills also have staggered enactments." (Sept 28, 10:59 p.m.; memory `bills-carry-amounts.md`.)
- **Status: partly.** Phased steps work: #7166 (a phased minimum wage's cost note counts every step). But pool `laws-income-tax-flatten-sponsor-rate` is open: repealing a graduated income tax writes one national rate, not the sponsor's own.
- **Do.** Write the sponsor's flat rate from their views and place through the one terms record.

### 14. The rest of the research, finished

- **Ruling.** "I want the rest of the research finished." (Nov 8; recorded in the brief.) Also: "Most of this is simulated in the background. Look it up and make it in the game. Don't hardcode it." (Oct 24; OWNER-DECISIONS Oct 24.) And the anchor must come from research covering all places, never one state's study (Sept 29, 8:57 p.m.; memory `estimate-not-unknown.md`).
- **Status: partly.** Still open on main:
  - the 16 background records (item 4);
  - federal answers and stances (items 3 and 12);
  - the sanctuary flags;
  - New Hampshire's wage statute (RSA 279 could not be read; #7368 marks it an estimate);
  - `laws-outcome-links-unresearched`, `research-outcome-link-age-verification`, `laws-groundwater-farm-use`, `laws-medicaid-expansion-federal-share-is-the-regular-match`;
  - policy diffusion (item 8);
  - rent's pull on moving (item 7).
- **Do.** Run one research PR per family, the way the plan's family 10 did (one agent fetches and quotes, a second refetches and checks). Values are sourced, or estimated from the nearest study with its spread.

### 15. Pool items that look done but are still open

- `gov-congress-passes-policy-laws`: #7326 shows Congress enacting and repealing, signed, in Hamburg, New Jersey. Check it against the done-when ("one named person in the town reached by it through law-reach") and close it.
- `gov-bill-catalog-no-county-level`: #7318 and #7319 made counties their own level, and 31 policies list `county`. Check and close.
- `play-stop-06-texas-shows-local-income-tax` (p1): #7331 and #7333 split statistical tax estimates from enacted law, which may fix it. Replay it in a Texas town and close it or fix it.
- **Do.** Close each with the evidence, or fix what is left.

---

## Part 2. Done on main (for the record)

- **Wage lists fixed and cited.** Nevada, Vermont and New Hampshire: both lists now agree, citing NRS 268.003(1)(c), 24 V.S.A. 2291 and RSA 31:39, marked an estimate (Dillon's Rule) (#7368, merged Nov 8). Montana and North Dakota bars come from statute (#7342). State rates cite each labor department in `starting-law.json`: Nevada $12.00 (labor.nv.gov), Vermont $14.42 for 2026 (labor.vermont.gov), Montana $10.85 for 2026 (the 2026 poster). One loose end: New Hampshire's RSA 279.
- **One law system, every level a parameter.** "why is there just one system for laws and one system for beliefs? I know there is." (Sept 30, 3:15 p.m.; memory `one-law-system.md`.) "A legislative engine should work for all three levels of government." (Sept 30, about 4:20 p.m.; memory `level-generic-engines.md`.) "I don't understand why it's so hard to have a local layer, a state layer, and a federal layer." (Nov 4; memory `layers-are-his-design-nov4.md`.) Done for the law chain: one resolver, `resolveLawInForce` (`src/core2/laws-in-force.ts` line 274), applies floor, additive and single rules. Federal preemption comes from data (`federalPreemption` in `question-powers.json`) and state bars from `statePreempts`. The law chain reads the one place map (#7276).
- **The higher level governs where real law preempts.** The wage floor (#7312), town income tax ends when the state withdraws the power (#7310), state bars on towns (#7308, #7309, #7311), the federal mandate (#7316). Only two questions carry federal preemption data (the two work requirements); others gain it as item 3 adds them.
- **Counties are a real level.** "we need county level stuff too. this has to get done. this is essential." (Oct 6, 6:40 p.m.; memory `county-essential.md`.) Counties are their own level on the bill paper and read their own law (#7317, #7318, #7319).
- **Repealing a fresh law uses a sliding reluctance, no cooldown** (Oct 14; recorded). `src/core2/modules/legislature.ts` lines 2916-2945 and `world-legislating.ts` lines 386-421 (`reversalReluctance` times freshness and margin).
- **A "no" on adopting an income tax leaves an existing one standing; repeal is its own bill** (CTO, Oct 25; recorded). Repeal and restore of an opening income tax: #7337; collection restored after a zero-rate bill: #7347.
- **Every state legislature sits, keeping only results** (Sept 26 seating; Nov 5 results only). #7290; the roll call is built on demand (`world-legislating.ts` `rollCallOf`, line 1272).
- **News tells the laws other states passed** (#7313, #7340).
- **88 of 89 laws wired on all nine links**, with a working repeal on every one (law-wiring table, Nov 1). The one partly law is the loan cap (item 1).
- **The six laws' background records** (Oct 29): small-dollar lenders (#7000) and medical bills and medical debt (#7036) are in. The others are covered by item 4.
- **Effects-web grades and research sizes** (CTO rulings Oct 29 22:15 UTC): about-zero grades (#7021), verified sizes for ten links (#6847).
- **No dice, emergent conditions.** "Not roll fewer dice, roll no dice." (Sept 29, about 1 a.m.; memory `zero-dice-and-alive-by-morning.md`.) "we do not create conditions. we create a simulation to create emergent, living conditions." (Sept 30, about 1:00 p.m.; memory `golden-rule-emergent-conditions.md`.) The outcome web says "Nothing here draws a level or limits a factor" (`src/core2/modules/outcome-web.ts` line 13). Outside sessions decide by members' stances, not chance (`world-legislating.ts` lines 1111-1135). Keep checking new PRs.
- **No placeholders.** "there are no placeholder numbers or names or events being placed, right? That's still a gate." (Oct 2, about 11:00; memory `placeholder-gate.md`.) Standing gate: check code and data (starting-law terms, estimate rows) in every PR. Report counts, never "none" without measuring.

---

## Part 3. Rulings that conflict, and which one wins

1. **Unknown power: "unknown" versus "estimate".** Sept 22 (recorded): what a state preempts "stays unknown until sourced; unknown is neither permission nor refusal". Sept 28 morning (memory `starting-law-real-current.md`): "Unknown answers stay unknown, never 'no'." Then Sept 28 night and Oct 2, the owner: nothing is unknown, and a missing rule is the most common rule among similar places in this game, marked as an estimate. **The Oct 2 ruling is newer and wins.** The code's refusal (item 11) fits neither ruling.
2. **Seating every legislature.** Sept 26 (recorded): all 50 legislatures seated from day one, with full people. Nov 5 (owner): other states' roughly 7,500 legislators are not built at the opening if nothing needs them; keep results; build detail on demand. **Nov 5 wins.** Main seats them as named officials on term rows (`src/core2/modules/officials.ts` header); the Nov 5 text says "named and built on demand". That's the State Sessions and Speed sessions' call, not this one's.
3. **How effect sizes vary.** Sept 28 (memory `entire-world-changes.md`): link sizes drawn per world and place from research ranges (#880). Sept 30 (memory `golden-rule-emergent-conditions.md`): a per-world draw "still hands the world a number"; a place's effect comes from its own conditions, and studies only check the average. **Sept 30 wins.** Any new link should take its size from the place's conditions, not a draw.
4. **One start date or two.** Sept 26, LQ-03 (owner): "one law has one start". Oct 14 (CTO ruling, pending the owner): a law with two effective dates (premiums from one date, benefits from another) carries both. The Oct 14 ruling is newer but was never confirmed by the owner. Keep two dates only where the real statute has two.
5. **Speed bar.** Oct 29 22:40 UTC (CTO): a town's year under two minutes, and no change more than 20 percent slower. The night README (Nov 8): no change more than 5 percent slower, measured before and after on the same place. And Nov 8 (owner, `rulings-nov8.md` item 15): a coarse fast-forward is fine "as long as it makes sense in the end". **The Nov 8 5 percent rule wins** for this session's PRs. Outside places should be computed coarse.
6. **Brief versus code, not the owner.** The brief says Parks has no enactable policy; main has one budget line (item 6). The brief says the state ban vote was never played; it was played in #7323, but the record never reached main (item 10).

---

## Part 4. Order for tonight

1. Fix `tests-loan-cap-case-red-by-draw` and hand Dev Mode what the loan-cap proof needs (item 1).
2. Make other states' laws count where they govern: the counted movers and the state-level web read each state's law in force (items 2 and 7).
3. Take over the death-tax restoration and the Medicaid repeal bug; land the state-reversal report (item 10).
4. Federal questions one by one: cited answer, stance, catalog row, reader (items 3 and 12).
5. Effects-web families 2 and 4 to 9, several twin pairs each (items 4 and 5).
6. Bill-menu breadth, starting with bonds, fees, water, flood control, campaign finance and sentencing (item 6).
7. Research PRs for what is still unsized, then diffusion and session pace (items 8, 9 and 14).
8. Close the three stale pool items with evidence (item 15).

Every piece: name the place and seed, prove it in the running game (dev mode once it lands), and fix what breaks rather than report it ("when it finds these errors or finds that these laws don't pass, I want them fixed. I don't just want a report of everything that was broken." Nov 8, about 1:30 a.m.; voice note).
