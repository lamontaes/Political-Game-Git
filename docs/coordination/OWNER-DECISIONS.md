# Owner decisions

The CTO's only writer. When two rulings conflict, the most recent wins unless the older one makes more sense; either way the conflict is flagged here. Per-area digests of the owner's earlier Drive rulings live in `docs/coordination/prior-rulings/`; every session reads its area's digest before asking. Open questions block the release build (stopgap kind `owner-decision`). Rulings stay here so no session asks twice.

## Open

- **Kit 12 versus Kit 13 (found by the Drive digests, Oct 14).** The play page was restyled tonight on Kit 12 (the Oct 2 packet). Kit 13's approved control set (docs/ui/kit13/APPROVED-2026-10-04.md, owner Oct 4 and 5) is newer: brass corner ornaments ON the panel, no scrolling inside a menu, the chevron rule (only on a static button while activated, never in radial menus), People / Calendar / Money tabs with the selected tab a raised glass box, the approved icons, search, dropdown, slider and progress bar. Same fonts. Newest wins: PLAY reconciles the page to Kit 13's controls. Owner to confirm that logo and Steam art stay navy (the UI ban on navy does not name them).

- **Who the opening's "key people" are** behind the president and in the state legislature: the owner clarifies tomorrow; ranked from the offices data until then (registered).

- **A player who loses an election (player-path audit, Oct 14), confirmed by the owner:** a loser can speak at a public meeting from the podium (the September 29 meetings ruling) and ask a council member they know to carry a bill (the constituent path), both through the existing conversation; no new control. Confirm or change.

- **Why money exists for the player (owner, Oct 14, open).** The owner wants money never to be a scoreboard: a basic rent or mortgage, maybe college debt, the ability to put money into a campaign, and a reason for money to exist that makes corruption a real temptation. He has not settled that reason. Build the basics (rent or mortgage, debt, self-funding a campaign) and register the rest as `owner-decision`.

## Ruled, October 14, 2026 (late)

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
