# Owner decisions

The CTO's only writer. When two rulings conflict, the most recent wins unless the older one makes more sense; either way the conflict is flagged here. Per-area digests of the owner's earlier Drive rulings live in `docs/coordination/prior-rulings/`; every session reads its area's digest before asking. Open questions block the release build (stopgap kind `owner-decision`). Rulings stay here so no session asks twice.

## Open

- **Towns larger than 10,000 (two-tier package, #4172).** A town under 10,000 now opens at its real Census size. A larger town still opens with 10,000, the October 9 target. Should a bigger town count its full population, each counted household standing for several? (SG-CORE-owner-decision-town-size)
- **What a town's districts are.** The game has no city wards; a town's districts are the state House districts its people split into, else the whole town. Should council wards come later as their own districts? (SG-CORE-owner-decision-town-districts)
- **Relatives of a person met for the first time.** They come with household, job, coworkers and employer, but no relatives living elsewhere. Acceptable for early access? (SG-CORE-owner-decision-fill-in-outside-kin)
- **Demotion wait.** A filled-in household returns to the counts after 180 days without contact (never the player's household, circle, officials, public workers, business owners). Is 180 days right? (SG-CORE-owner-decision-demotion-days)

- **Kit 12 versus Kit 13 (found by the Drive digests, Oct 14).** The play page was restyled tonight on Kit 12 (the Oct 2 packet). Kit 13's approved control set (docs/ui/kit13/APPROVED-2026-10-04.md, owner Oct 4 and 5) is newer: brass corner ornaments ON the panel, no scrolling inside a menu, the chevron rule (only on a static button while activated, never in radial menus), People / Calendar / Money tabs with the selected tab a raised glass box, the approved icons, search, dropdown, slider and progress bar. Same fonts. Newest wins: PLAY reconciles the page to Kit 13's controls. Owner to confirm that logo and Steam art stay navy (the UI ban on navy does not name them).

- **Who the opening's "key people" are** behind the president and in the state legislature: the owner clarifies tomorrow; ranked from the offices data until then (registered).

- **A player who loses an election (player-path audit, Oct 14), confirmed by the owner:** a loser can speak at a public meeting from the podium (the September 29 meetings ruling) and ask a council member they know to carry a bill (the constituent path), both through the existing conversation; no new control. Confirm or change.

- **Why money exists for the player (owner, Oct 14, open).** The owner wants money never to be a scoreboard: a basic rent or mortgage, maybe college debt, the ability to put money into a campaign, and a reason for money to exist that makes corruption a real temptation. He has not settled that reason. Build the basics (rent or mortgage, debt, self-funding a campaign) and register the rest as `owner-decision`.

## Ruled by the CTO overnight, October 14, 2026 (from standing rules; the owner may overrule)

- **Counted people keep about 30 bytes each in packed columns** (two-tier package) rather than being regenerated from the seed as the MEMORY-FLAT package said; the newer design meets the memory goal (heap after opening 766 MB to 451 MB) and the year halves (146 s to 72 s in Robbins). Conflict flagged; newest wins.

- **Town size (day-one audit):** a town opens at its real Census size; nothing pads it to 10,000. Follows one model, two tiers (counts must match the place).
- **Which place is the town:** the governing unit the player lives in, the one whose offices they could run for (the town, not the village inside it), from the place data.
- **A generated official's campaign past** holds an opponent, vote totals, promises and the result (#4190 built it); a date and a fixed share is a placeholder.
- **A law with two effective dates** (premiums collected from one date, benefits paid from another) carries both, each read by the engine that collects or pays.
- **The opening past** (falling-outs, favors, who held which job) may be seeded generation of what happened, consistent with each person's record, as the register allows for who exists; nothing after day one is a draw.
- **State party leaders** come from the whole state's generated people, not the player's town.
- **Tie by lot in a small race:** the state's statute from data where it names a size; else a registered ESTIMATED line (elections PR #4171).
- **Felony-barred share** on the voting-eligible base as published, an estimate with its source.
- **A named voter's single vote** follows a running account of their own voting record (sliding, no coin).
- **A primary where nothing separates two candidates** is still decided: voters read what does separate them (standing, incumbency, money, endorsements, name recognition from the press); a race is never left blank by most voters.
- **A child does not take up a cause:** drives read a person's age and standing on a sliding scale; a three-year-old with activist traits is a defect, not a personality (traitWeight 1.0 stands).
- **Tests of removed mechanics are retired** with the mechanic (replace, never layer).

- **The opening's sequence:** the president's address with the vice president and key people behind them, pointed out by name and office as the camera passes; then Congress; then your governor with a few important state legislators; then your family, if you have one (else skip); then into the game at home. Cutaways during the address follow the sentence's subject.

- **Election day is a scene.** The player goes to their polling place and marks a ballot there; the vote is cast in the scene, never in a menu. Firefly images already made may stand in for the place and the ballot while the screens are crude, on the kit.
- **Unions and strikes: 1.0. Police, the National Guard and the war design: 1.0;** specific questions may be asked later.
- **Ask why.** Every proof answers why, by record: why a vote was 5 to 0, why a person knew a law caused their smaller check. A session that cannot answer why has found a defect.
- **Knowing is a read.** Nobody attributes a change in their life to a law unless they learned of it: from the news they received, a conversation, a notice on the check, or an ad. Most people only notice something happened and grumble. A stance that cites a law must cite how the person heard of it.
- **Dev mode's Trace is the ultimate trace.** From any record, click every decision behind it: why a number was chosen, whose views and where they came from, who got the dollar, what they cut, how they learned, how they felt and which trait made them feel it, what they did or didn't do. Lightest weight: recorded reasons where kept, recomputed from the same seeded history where not. A report button writes the clicked chain so one Haiku agent can write the audit instead of ten.
- **Famous political careers are capability tests** (a bartender to Congress at 29, a governor to the White House): can the simulation produce the career from causes, never by script.
- **Grading batches may include lies and context.** The lie versions of lines are graded on the same axes, and a line may carry a made-up context scenario, on one condition: the simulation must be able to produce it. A scenario it cannot produce is a gap: search the register and the PRs for intent first, then flag it, never invent it.
- **Words (from grading batch 6, spoken):** lines must sound like people talk ("Where are you from?", "I'm from Washington. What about you?", "And you?"); a reply's second move must follow from its first (never "I'm from Washington. Have you talked to Omar?"); many variants of the same meaning so the player never sees a line twice; and the batches must cover legislation wording, journal wording, emotional register (happiness, sadness, arrogance, combinations), interviews, meeting speech and campaign lines, not one small-talk scenario. New lines are added to the grading page as other systems (press, debates) are built.
- **Slim the repository like a real game** before early access: unneeded files, tests of deleted or old-core code, duplicate tooling and documents go; the guards stay.

- **The world has a past.** History does not start on the day the player generates in. Laws in force carry their enactment history; the prior election for every seat exists with its campaign facts; officials have voting records from the prior term; the year before day one has a news archive; two seeds in one place produce different, recognizable pasts.
- **Public figures are known.** Everyone knows what the public knows about the president, the vice president, their governor, their representative and their mayor (positions, record, reputation), distinct from having met them; "you have never met" is never the only line.
- **The player's own context:** parents, their relationship, siblings, where the family came from and a few remembered moments are kept facts the journal and dossier render from day one.
- **Standard for the morning build:** the behind-the-scenes logic makes sense and every system works as intended; what remains is graphics, English and the human feel. The player can run for office, debate, read the news.
- **English calibration** may draw on everything readable (the web, books, Claude's own documents) to sound natural; nothing ships in dev speak.

- **The player casts their own ballot** (owner, Oct 13: "you should be able to cast your vote"); the engine never votes for the player, and a candidate's own ballot is theirs to cast.
- **A yes-or-no vote resolves from a sliding score** (CTO, from the sliding-scales rule, which governs causes, not the final yes or no): a deal offered to someone already in favor counts as accepted.
- **Filing under a party** requires being a member (joining reads the person's views against the party's positions, per the register's votes-from-principles ruling) or filing as an independent where the place allows it.
- **The executive proposes where the place's charter or constitution allows it** (data), and signs or vetoes everywhere (owner: "all of them").
- **Where the data has a primary date, the primary is held** (one rule, all places); Alabama county primaries skipping is a defect, not a decision.
- **Movements (from the proposal and the register's movement ruling):** in early access: marches, petitions, primary challenges, the player speaking, joining and founding; a person's lean may move over years from what happens to them and what they hear (realignment must be possible); the director gains public scenes (a rally, a march, a crowd, a speech to strangers); police, the Guard and the military as deciding bodies, boycotts and war are 1.0; a living retired leader keeps leading until they step down or die, then a similar successor inherits (the register).

- **What you know about a person:** faith and the rest come out only through what they say and do; the dossier shows what anyone would know (age, hometown, probably job), the rest emerges. The player's own traits emerge the same way, and people hold views on the player as they do on anyone.
- **Starting age:** 17 turning 18 is the early-access default; starting older (with a job, a home and a record) is allowed; the old client had a randomized-age control and may again.
- **Marriage and children:** the player has a household; how marriage works is not yet decided (the owner dislikes how The Political Process handles it). The world nudges the player toward politics: elections happen around them, and a player with a high-standing job may be propositioned to run for a seat someone needs filled (a Pendergast-style approach).
- **Money's advantage** is time: a good job buys more time to campaign and less at work.
- **A campaign day:** a handful of choices. **Debates are in early access.**
- **Speeches:** the player composes a speech by picking one of four parts at a time, as Suzerain does; the parts come from the English engine's speech acts and the player's own record and positions.
- **Writing a bill:** already decided in the Drive register (September 25 and 26, 2026): the bill-on-paper workflow. A subject index is navigation only; once a subject is chosen the bill itself is the workspace; the player selects provisions on the paper and a compact panel offers only the supported operations (eligibility, thresholds, funding, timing, reporting, replace or repeal, or ask staff for a revision); "add another section" adds a compatible typed component; the paper is the one authoritative draft. The catalog is "Legislative Content Menus, Proposal V1" (18 subjects, shared sections, operations raise, lower, expand, restrict, replace, repeal), scoped by the real-bill research. Then negotiate with named colleagues.
- **The executive** gets all of it in early access: appointments, the budget, vetoes, emergency decisions.
- **Time and scenes:** no skip-ahead control. The world runs day by day; scenes interrupt the player (major moments, filterable by kind), with short talk in the chat box between them; between scenes the player does the work through the interfaces. Scenes are the simulation's way of showing the character's view of what the player's actions did.
- **World setup:** a custom start lives in dev mode; a normal game has little preparation (RimWorld's amount at most).
- **Getting caught in a lie:** depends, as in life: the person's trust, and the press may or may not pick it up by its own reads.

- **Dev mode (the old "watch the world", to be renamed):** one mode where the owner or a player can do anything: pass or repeal any law at any level instantly, make any person or body take any decision, jump time, trace any record's causes, and watch the world run. "What if" experiments live here and are a player feature in early access.
- **Press:** the player can influence a paper and influence people; reporters are people in the world with their own records. Outlets have biases and owners: a landscape like today's (cable channels with a lean, a profile-writing magazine, an online opinion show, local papers), names generated, never real brands; owners are wealthy people whose relationships with politicians read into coverage of them and of their opponents, both ways. The world has to exist without the player: every outlet acts on everyone by the same reads.
- **Indictment and prison:** if the player is caught, the trial plays in scenes; then the player is gone for the sentence while the world runs, and may die in prison. The game is real, not raunchy: temptation and scandal exist (an affair, a payoff), told without graphic detail.
- **Capability tests belong in dev mode:** can the background world organize a protest, produce a demagogue, in rare cases overthrow a government, produce a realignment on the scale of 1933 to 1945, or drift toward a war? Real politicians' lives are tests of capability, never scripts.
- **The reward loop** is the effect of the player's actions on the simulation over time.
- **Square pegs:** when an engine or feature the owner asks about does not exist, the CTO says so plainly instead of fitting it into something else.

- **Ballot measures:** in early access. The player's main interaction is voting on them (and campaigning for or against through the existing campaign paths); writing one is not for early access.
- **Recalls:** in. Rare, from causes; the player as an officeholder can be recalled.
- **Interest groups and corruption:** in. The player is approached (support with strings, a bribe with a real risk), but never through hard-coded situations. The engine's causes must be able to produce what real corruption cases, books and films show; real cases are stress tests of capability, never scripted scenarios.
- **Constituent cases:** exist, but 95 to 99 out of 100 happen in the background; the few that reach the player are the ones their record makes theirs.
- **Faith (the beliefs engine):** has a place. For some people it shapes votes and relationships, for some it is a view, for some it is surface; the weight is per person from their record. A player may lie about it privately (say they are religious when they are not), through the existing lie.
- **Congress is in early access.** Same engines as every other level.
- **The player's money:** a basic rent or mortgage, maybe college debt, money into one's own campaign; never a scoreboard (see Open).
- **No game over.** When the player dies or steps away, a summary in the manner of Crusader Kings 3; continue as anyone in the world, keep watching the world, or start a new game. Dynasty play is in: an heir can "ride the wave of my movement" (the owner's long-standing example is RFK's Indianapolis speech).
- **Wealthy families on day one:** generated, realistic, with real power (old money, media owners, developers), from the wealth tables; they appear as donors, employers and rivals. Fortunes also grow in play.
- **Starting or buying a business:** 1.0, not early access. An owner sees the books.
- **The economy must answer "what if":** a player should be able to test a sweeping change (the owner's example: government raises every public salary to a $70,000 base) and see whether private employers follow, through causes, not a script.
- **Business and roles database:** private businesses may be simulated from a large calibrated database of business kinds and roles with real starting pay (public occupation and county business tables), moving with inflation and the economy; public institutions are full records; chains and tycoons emerge, no scripted chains, no real brands.

- **Business taxes:** the employer's payroll tax share, unemployment insurance, profit tax and property tax on premises exist as money flows read from the law in force, adjustable by legislation, with no step for the player.
- **Costs that leave town:** recorded, and paid to a business in town where one sells the goods, else to the outside account as such.
- **Counted workers' quits** keep no reasons (bookkeeping is a debug switch).
- **A new opening's pay** reads the region's pay level and the wage floor in force, sliding by role.
- **Filing:** no fee or petition mechanic; filing happens where the place's records say.
- **Starting politics:** seeded generation of who exists and of a person's starting lean is allowed; every vote and donation is decided by the person's reasons.
- **Turnout** is a sliding propensity from causes, never a yes-or-no coin.

- **Evictions without courts:** an eviction completes after the state's notice period from the law in force; the household moves as the housing engine moves leavers. No court scene until courts come.
- **Ties:** follow the law of the place; where it says lot, a recorded lot from the world's generator.
- **One elected seat and one appointed post at once:** the law of the place decides (incompatible-offices rules in data); where it allows, allow.
- **Family hires:** not banned. The relationship is a recorded reason of the hire; the press and views read it.
- **Repealing a fresh law:** the body's own rules from data; where none, a sliding reluctance from how recently and by how much it passed. No fixed cooldown.
- **Treasuries:** spend what the legislature appropriated, through the engines that exist; taxes and benefits are set by bills that change the law in force; the books balance in the background and the player touches money only by legislating.
- **Generated versus simulated people:** every named official (governors, Congress, cabinet, town and state officeholders) is a full person with a campaign past from day one; everyone else is counted until the player meets or clicks them, then built from the records and demoted when they leave the player's life.
- **Sources for tuning:** copyrighted writing may be read to calibrate the English engine; only public-domain or permissively licensed text ships verbatim.
- **Sub-agents:** three Haiku, two Sonnet or one Opus per session, for parallel work or research only; audits run as an Opus session with up to ten Haiku tracers and one Sonnet verifier.

## Rulings, October 14, 2026, morning (owner, spoken; recorded by the CTO)

- **Replacement means every role.** When anyone dies, leaves or is removed, the role is refilled by whoever fills it in life: an outlet hires a new reporter, a business hires a new clerk, an organization names a new chair, a seat follows its vacancy rule. No role stays empty because its holder is gone. The press engine's refill (#4180) is the pattern for every engine.
- **The journal is a dramatized story, not a list of facts.** It reads like a memoir: "When I was seven my dad died; I had no idea how much that would shape my life." School years are not entries unless something happened in them. Entries are procedural and revised later: an uneventful high school chapter gains "except for one person" twenty years on, when that friend becomes important. Running, winning, losing, deciding to run are entries. "The bill passed" is not a chapter about a son. No entry is a lone event with no story around it.
- **Bills follow the real form.** Numbering, title, sections and enacting language follow the norm for that body, as a real bill reads. The player edits only the terms (the amount, the date, yes or no on a provision), each a clickable field; the rest is written by the engine. Hearing minutes are fine as minutes. A notice from the election office is the kind of thing the newspaper prints.
- **Businesses are generated with real-sounding names.** Not "general store" (not what Americans say) and not real brands: generated chains and local names, with real people in them.
- **Anything the tracer cannot answer is a dev-mode item.** A legislative vote shows each member's reasons; a business closing shows its books; a budget cut names the law and the line's history; a person shows job, pay, hours and spending.
- **Why, every time.** Recall petitions against every board member at once, a legislature passing its whole year on one day, a nineteen-year-old cashier with $9,900 saved, a governor unopposed, a defeated state House member with no next chapter, every winner taking office on January 1: each is a defect until the record answers why.
- **Statewide races draw statewide candidates.** The state's party leaders and officeholders are the pool for governor, lieutenant governor, attorney general and the like; a race with only the town's people weighing it is wrong.
- **Taking office follows the law of the place**, from data (constitution or statute, cited), not a single date.
- **Legislatures meet on their calendar.** Bills are heard and voted across the session days the state's calendar gives (#4173), never all on one day.
- **An every-place runner.** The dev system runs every one of the 56 places at once for a number of years and reports every crash and broken invariant with the place, seed and stack, so a failure in one place is found before a player finds it.
- **A graded part withdraws the rest (owner, Oct 14, 2026, morning).** When the owner grades part of a words batch, the ungraded remainder is withdrawn, the engine applies the grades to every line it produces, regenerates the whole batch, and only then is a new batch put in front of him. A batch that is still repetitive is not ready; the pipeline carries an automatic repetition guard with its thresholds in the parameter table.
- **The CTO asks why before reporting (owner, Oct 14, 2026, morning).** A report of what the engine did carries the cause from the code or the record for every number and every repeated pattern, found by the CTO before the owner has to ask. The owner should not have to list the gaps; a lopsided total, a constant, a repeated date or a tiny balance is a question the report answers.
