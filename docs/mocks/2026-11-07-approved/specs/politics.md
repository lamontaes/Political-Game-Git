# Politics menu: the owner's record, screen by screen

Gathered Nov 5, 2026, 3:17 p.m. Eastern, read only. Nothing was built, committed or sent. The look (dark see-through panel, no boxes, glowing hover, lit selection, data instead of sliders, type sizes) is locked in the `menu-look` skill and isn't researched again here. This file covers what each Politics screen is for and what it shows.

**How to read it.** "In force" quotes Lamontae as recorded, with the date and where it's written down. When two rulings conflict, the newer one wins, and the replaced one is listed under "Superseded." **Picked** means he chose an option the CTO wrote, so the words are the option's, not his. **CTO log** means the CTO wrote the point down as he said it, close to his words. **Proposal** means only the CTO suggested it, and he hasn't ruled.

**Sources, short names used below**

- OD: `docs/coordination/OWNER-DECISIONS.md` on main, cited by section heading
- LAW: `docs/play-first/LAW.md`; ORDER: `docs/play-first/ORDER.md`
- MOCKS-1014: `docs/ui/mocks/screens-2026-10-14/README.md` (pass 2, his reaction "good")
- PT-1026, PT-1027: `cto-notes/playtest/2026-10-26-1.md` and `2026-10-27-1.md` (his typed words during the sittings); PT-1028: `docs/coordination/playtest/2026-10-28-1.md` (CTO log of the Oct 28 sitting)
- REG: `docs/coordination/DECISION-REGISTER.md` (read-only history, newest wins)
- REC: `docs/reports/owner-record/01-decisions-governing-current-work.md` and `05-overnight.md`
- NOV5: `cto-notes/menus/RULINGS-nov5.md`, plus today's session (his picks at 12:57 p.m.)
- Pool: `docs/pool/items/<name>.md`
- Proof: `docs/lanes/proof/` and `docs/play-first/shots/` on main
- Nov 1 mocks: `docs/mocks/2026-11-01/` on branch `play-first/mocks-issues-budgets`. Nov 4 board mock: `docs/mocks/2026-11-04/campaign-board.html` on main
- TPP: The Political Process's install folder on this Mac, `index.html` and `binFiles/*.bin` read with `strings`. Also `docs/design/references/political-process-patterns.md`.

---

## 0. The Politics menu as a whole

### Job

He wants to see the whole government at a glance and act through people. Sept 16, 12:18 p.m., playing: "it should go politics and then some kind of, like, view total government screen... state, federal, local, and then you should be able to choose legislative, judicial, executive." (REC 01, line 489; 05-overnight [20])

### Tabs, as of today

Government, Elections (always there), Parties, Issues, Budgets, and a how-your-place-is-doing tab (name not picked). Your office shows while you hold a seat. The campaign board shows once you've filed.

### In force (for every Politics tab)

- **Nov 5, 12:57 p.m. (Picked, "Elections tab, always there"):** "Upcoming races, who's running and past results, before you ever file. Your one campaign board stays separate and appears once you've filed." (today's session)
- **Nov 5, 12:57 p.m. (Picked, "New tab in Politics"):** "One place for how your town, state and country are doing, with this year beside last. A law's page links straight to the numbers it moves." (today's session)
- **Nov 5, about 1 p.m.:** "I don't want those sliders that's in the UI mockup, though. Those are too video game-like. I like data being shown." (NOV5 #2)
- **Nov 5, about 3 p.m.:** "take what you just learned from this initial round of stuff and apply it to everything else... take off, a word [ward] and shit like that. Again, American English." (NOV5 #9). No "ward" anywhere. Use district or at large, from the place's own record.
- **Nov 5, 12:49 p.m., generate on demand:** "just simulate based on the people there and then you can fill in the gaps based on what was simulated when things need to be generated. generate on demand." Opening another state's bill, vote or member builds that detail at that moment, the same way every time, agreeing with the stored result. (OD, "Nov 5, 12:49 p.m.")
- **Nov 4, 2:30 p.m.:** "you don't have to reinvent the wheel. Look at the political process." (CTO memory, player-menus-nov4). Same idea Oct 12: "I'm not reinventing the wheel here. Look at the political process, the game, and I'm just adding more visually to it."
- **Oct 29, 6:10 p.m., menus never scroll:** "The main menu shouldn't really be scrolling. It should be things inside." Long lists page inside a box. (OD, "Oct 29, 22:10 UTC" and "22:15 UTC")
- **Oct 29, 6:30 p.m.:** "redesign all the menu screens... So they're not blocks of text anymore with random buttons." Tabs sit on a rail and the selected one is lit. (OD, "Oct 29, 22:45 UTC")
- **Oct 29, 7 p.m.:** no bar, meter, scale, dot or band word for how anyone feels about you, on any screen: "you need to find a different way to display stuff other than bars like that." Bars that count what a record holds (roll calls, money) are allowed. (OD, "Oct 29, 23:00 UTC")
- **Oct 29, 12:10 p.m.:** "I said continue and back, needs to be removed from every single menu." And "It shouldn't take 5 seconds after you open a menu for it to load. It should be there instantly." (OD, "Oct 29, 16:30 UTC")
- **Oct 29, 6:30 p.m.:** "City council is, you know, whatever the equivalent is." Nov 1: "whatever the board? Do you mean city council? ... I'm in Northampton, Massachusetts." Every body goes by the name the place gives it. (OD, "Oct 29, 22:45 UTC"; "Nov 1, 23:30 UTC")
- **Oct 28 (CTO log, PT-1028):** #12 "No initials in circles anywhere in the game. Pictures: headshots or body shots." #19 Menus "carry hot links that take you there." #23 Guide is not a Politics tab. Terms get the dotted underline with the guide text on hover.
- **Oct 28, 12:45 a.m.:** "All this stuff happens in the engines and the simulation... It's just different ways of displaying the same information." Screens read the records and never keep their own copy. (OD, "Oct 28, 04:00 UTC: the map first")
- **Oct 27, afternoon:** "Remove all those... subheadings. I hate them all"; "there's so much dead space and empty space in these menus"; "How hard is it to look at other games and look at game design principles... and design a good goddamn screen?" (OD, "Oct 27, afternoon"; PT-1027)
- **Oct 26:** "politics there's more dev language again how does this keep happening." (PT-1026, line 47). No raw dates, codes, scores or record words on screen.
- **Oct 20, menu study:** "menus are overlays that pause time with the room's people still visible... Actions start from people, places and scenes, not menu lists." (OD, "Oct 20: rulings")
- **Oct 14 (MOCKS-1014, "good"):** "Charts: Not a screen of its own. One chart style (donuts, bars, this year against last) used anywhere numbers are compared: budget, money, votes."
- **Sept, register OCD-UI-004:** Politics opens on where the character is. Local / State / Federal comes first, with Legislative / Executive / Judicial under it. "Your office and campaign tabs retain the character's actual office/contest jurisdictions rather than following travel location." Browsing another place never moves you. (REG, OCD-UI-004)

### Superseded

- Oct 20: "Campaigns only once you've filed" and "the Campaigns tab shows standing and polls only." **Replaced by** the Nov 5 always-there Elections tab, and by the Oct 27 one board with an inbox and a team.
- Oct 24: "The politics screen needs a guide" (pool `play-first-18-politics-guide`). **Replaced by** Oct 28 #23: no Guide tab, underlined terms instead.
- Oct 29: "framed plates" under all content, and the Oct 30 CTO items putting each screen's content on plates. **Replaced by** Nov 5: one dark panel, no boxes.
- Sept register: one combined "Issues/Budget" tab. **Replaced by** the Oct 20 separate Issues and Budgets tabs.

### The Political Process

- **Top bar:** Office, Campaign, Politicians, Elections, Metrics, Profile, News, Menu, plus Next Turn and a week display.
- **Standing strip above it:** Name Recognition, Political Points, Approval Rating, Messages, Schedule Items and Search. Each opens its own pop-up.
- **Look:** menus open as centered manila folders with paper sheets.
- **Mapping to our tabs:** Politicians becomes Government, Elections stays Elections, Metrics becomes the new how-it's-doing tab, Office becomes Your office, and Campaign becomes the board. TPP has no Parties or Issues tab. Those live inside Office, Campaign and Metrics.

### Ours today

- **Tabs on main:** Government, Your office (only while holding a seat), Campaigns, Parties, Issues, Budgets. Budgets hides until you hold office, have filed, or are of voting age.
- **Campaigns** always shows and holds the coming ballot, so it already acts as a rough Elections tab.
- **Missing:** there is no Elections tab and no how-it's-doing tab. Every Politics tab still draws boxes around its content (Proof: `confirmer-lane4/issues-budgets-board/`, `confirmer-lane1-path1/`).

### Questions only he can answer

1. Tab order, and where Your office and the board sit when they appear. Today Your office comes second. Today's Government mock had neither.
2. The board's tab name ("Your campaign"? "Campaign"?) now that Elections holds the ballot.
3. Does Budgets still hide until 18 (or until you file or hold office)? Does the new how-it's-doing tab hide too?

---

## 1. Government (Local, State, Federal; Legislative, Executive, Judicial)

### Job

- **His words, Oct 29, 6:10 p.m., as the CTO recorded his answer:** "for seeing who runs things, how the parties split, how they voted and what is coming up, and jumping to anyone's card, where you act; one way to each action." (OD, "Oct 29, 22:10 UTC")
- **Sept 16:** "I should have a big thing of Congress and my state legislature. I want to see, you know, different coalitions of Congress. It doesn't have to be insider stuff, but what you can tell." (REC 05-overnight [20])

### In force

- **Oct 14 (MOCKS-1014, "good"):** "Each body: chamber picture, party split bar, members with party, recent votes as yes/no bars, what's coming up, the executive."
- **Oct 16:** "have a good division filter thing, like city, state, local, being able to change cities and states." Every legislator stays, your own first and everyone else behind the filter. (LAW §1; pool `play-politics-division-filter`; LAW conflicts, "State legislators on Politics")
- **Oct 29, 6:10 p.m.:**
  - A big chamber (a state House, Congress) shows "a half-circle seat chart of party-colored dots, your own members and the leaders as face cards, and the full roster as face cards paged with arrows."
  - A member card shows "face, name, party badge," and the district (the rest of that line is superseded; see below).
  - "The Judicial tab shows the judges who exist in the world as read-only cards." (OD, "Oct 29, 22:10 UTC")
- **Oct 28 (CTO log, PT-1028):**
  - #13: your senators and representatives must be clickable.
  - #14: "Your members" and the Local/State/Federal tabs need clear delineation: "Look at other games."
  - #15: the place is picked in a proper box that reads "Ohio," not "Your state."
  - #16: "Governor, Ohio" is repetitive.
  - #17: no measuring bar with a 1 for a single governor.
  - #18: leaders as real UI, not printed lines out of order.
- **Oct 27, about 3:23 p.m.:** "Serving when your story began. Like, what is that? No. Stop." Council members must never all show "60% of the vote," a placeholder. (PT-1027; OD, "Oct 27, afternoon"; pool `screens-government-rows-plain`)
- **Oct 26:** "Okay, it obviously doesn't show any of my representatives. And there was menu UI made. Why is everything being printed on the menu like a spreadsheet?" (PT-1026, line 50)
- **Oct 29, 7 p.m.:** the feeling dot on Government was removed. Nothing shows how a member feels about you. (OD, "Oct 29, 23:00 UTC")
- **Nov 5:** no "ward"; the look is locked; other states' members are named and built only when the player opens them (OD, "Nov 5, 12:49 p.m.", point 4).
- **Oct 15 (CTO ruling under his rules):** "'Wards' is not a term the game uses except where a place's own records use it." Nov 5 now bars the word on screen entirely. (OD, "Oct 15, afternoon")

### Superseded

- **Oct 29, 6:10 p.m., member card:** "ward or district, and how they feel about you, only when your character knows them." **Replaced by** Oct 29, 7 p.m. (no feeling shown) and Nov 5 (no "ward").
- **Oct 14 CTO question:** "say if it should list only the leaders and the player's own." **Replaced by** the Oct 16 division filter that keeps everyone.

### The Political Process (Politicians tab)

- **Level tabs:** City, State, Federal, Judicial Branch, Favorites, Relationships.
- **Inside a level:**
  - Mayor, City Council and School Board.
  - Departments, each head with a profile, View Report and Replace.
  - Politicians, Rankings, Summary and Districts.
- **A politician's profile:**
  - Political History, which covers leadership posts such as Speaker, majority and minority leaders and whips.
  - Win counts and percentages in primaries and generals.
  - Legislation written and passed, with a pass rate.
  - Fiscal and social ideology, policy positions and "Policy Agreement" with you.
  - Caucus membership. Its caucuses are a Progressive Democrats group, a Moderate Democratic Coalition, a Moderate Republican Caucus, a Libertarian Caucus and a conservative committee, each with a description.
- **Search** by name across every office, with Add to Favorites.
- **Judicial Branch:** state trial, appeals and supreme courts, and federal district, circuit and supreme courts. Each judge has a judicial philosophy (activism or restraint, originalism and so on), plus nominations, confirmation votes, the blue slip, retention elections and retirements.

### Ours today

- **The tab** (Proof: `confirmer-lane1-path1/haleyville-4-government-in-window.jpg`, Nov 4):
  - Local / State / Federal; Legislative / Executive.
  - A body picker (city council or county commission).
  - The chamber picture with its meeting rule ("Meets the 1st and 3rd Tuesday of the month · 5 seats").
  - A party split bar ("Nonpartisan · 5 seats").
  - Member cards with headshots and "At large."
  - Recent votes as yes/no bars, Coming up, and a Mayor card ("Since September 2020").
- **No Judicial tab:** "no judge exists in the world to show" (a registered stopgap in `src/bench/play.mjs`).
- **"Ward" is still in the code:** the seat line still uses a "ward" label for city bodies (`src/bench/play.mjs`, the government screen). That breaks Nov 5.
- **Today's look mock** (`cto-notes/menus/government-v4/government-chamber.png`):
  - Adds tabs for Elections and "How it's doing," plus a Judicial branch tab.
  - Member lines read "Won 58% in 2023 · On the board since 2015."
  - Adds a "This year" row (laws passed, failed, vetoed, meetings) and a Mayor line with "signed 21, vetoed 1 this year."
  - Problems: it prints "Ward 1," and its party letters sit in circles.

### Records to fill it

- **Bodies:** every body at each level, with seats, members and party, district or at large, meeting rule, next election, recent votes with yes and no counts, items coming up, and the executive with other elected officers (`src/bench/government-bodies.ts`, `government.ts`).
- **Officials:** each official is a named seat, built into a full person when opened. An official's card lists the colleagues they know (pool `play-official-ties-on-screen`, done).
- **Not on record yet:**
  - Judges. None exist in the world.
  - Caucuses and coalitions. There is no record, only a research request, `docs/research/requests/legislative-caucus-and-coalition-formation.json`. An older caucus count was removed from the code.

### Open pool items

None open for Government alone. Closed: `play-first-12-politics-screen-to-mock-a`, `play-politics-division-filter`, `play-politics-own-members-ui-implementation`, `play-politics-leaders-list-order`, `screens-government-rows-plain`, `play-government-screen-capitals`.

### Questions only he can answer

1. Judicial: judges don't exist in the world yet. Should the tab wait until they do, or should judges be generated when the tab opens? What should a judge card show besides face, name, court and since when: who appointed or elected them, the next retention vote, recent rulings?
2. Coalitions (his Sept 16 ask): should Government show Congress's and the legislature's blocs, like the groups he named? Should that live here or in Parties? It needs a caucus record first.
3. The member card line under the name: district or at large, plus "Won 58% in 2023" and "since 2015" as in today's mock? Is that the right data?
4. The "This year" counts (laws passed, failed, vetoed, meetings) and the executive's "signed, vetoed" line from today's mock: keep them?
5. The party badge on a card: a letter in a circle (as mocked), a colored edge, or the party name in words, given "No initials in circles anywhere"?

---

## 2. Elections (new Nov 5, always there)

### Job

- **Picked, Nov 5, 12:57 p.m.:** "Upcoming races, who's running and past results, before you ever file." Asked because before filing "nothing shows what's coming up or who won last time, except the clerk and the calendar." (today's session)

### In force

- **Nov 5 (Picked):** always there, and the board stays separate. (above)
- **Oct 28 #19 (CTO log, PT-1028):**
  - Show "the local races actually on the coming ballot (November, May, whatever the place has), the real races, clickable."
  - "Clicking a race shows who is running; clicking a candidate's rally lets you go there and learn their views."
  - "'File for it' on a race triggers the travel to the filing office."
  - His example: "click President, see the three running, click Run for President, and you are at the filing office."
- **Oct 30 (CTO ruling):** one File-for-it gate. It appears only on a race the player may run for. (OD, "Oct 30, 03:40 UTC")
- **Oct 29, 5:40 p.m.:** "The player only runs for city council, state legislator, mayor, governor, Congress, and president. That's it." (OD, "Oct 29, 21:40 UTC")
- **Nov 1:** "it just gives me the choice of a bunch of council seats. No, I should only be able to run for one council seat." (OD, "Nov 1, 22:25 UTC", third batch)
- **Nov 1, past results:** "All 54 votes were cast. No, I can tell that's the generated number of people, not the simulated amount of votes." Every race was also named "Legislator" instead of the office and district. (OD, "Nov 1, 22:25 UTC"; pool `elections-past-race-votes-from-electorate`, open)
- **Oct 14:** "The world has a past... the prior election for every seat exists with its campaign facts; officials have voting records from the prior term." (LAW §5)
- **Oct 14:** "Statewide races draw statewide candidates." (LAW §11)
- **Oct 14:** "Election day is a scene... the vote is cast in the scene, never in a menu." Oct 26: going to vote "should just be a choice." (LAW §4; OD, "Oct 26: rulings")
- **Oct 26, election night:** it "needs to be its own pop-up menu kind of thing" and "What do you mean turnout? Exit poll? This election night needs a lot of work." (OD, "Oct 26, evening"; PT-1026, line 113)
- **Sept 22:** "election night has a few skippable updates using aggregate reports"; results are unofficial until canvass and certification. (`docs/coordination/prior-rulings/elections.md`, R26)
- **Nov 5, generate on demand:** races in other places keep only the result, the vote count. Any detail is built when opened. (OD, "Nov 5, 12:49 p.m.")

### Superseded

- **Oct 20:** Campaigns "only once you've filed," with "standing and polls only." **Replaced** Nov 5: the ballot moves to the always-there Elections tab.
- **Oct 28 #19's "Campaigns should be the local races..."** The content stands, but it now belongs in Elections, not Campaigns.

### The Political Process (Elections tab)

- **Navigation:** levels (Federal, State, City), an Archive and Favorites. Offices: President, Governor, Senate, House, State Senate, State House, Mayor, City Council, School Board.
- **Each race:** General, the Democratic and Republican primaries, and independents. Candidates show with portraits, plus delegates for president and endorsements.
- **Polls:** by pollster, with a weekly average. Approval polls for the president and by party.
- **Results and history:**
  - "Election History" per office, with winners, margins and seats gained.
  - Exit polls and primary results.
  - Vote distribution, turnout, party turnout, registered voters and electoral votes.
- **Also:** a news feed per race, and a customization menu for setting candidates.
- **Election night:** separate coverage with projections, margins, a map and speed controls.

### Ours today

- **No Elections tab.** Campaigns stands in for it today:
  - "On the ballot" race cards, paged: office (incumbent's name), "1 running" or "No one has filed," election day, and filing closes.
  - A race page: who filed, File for it, and the dates.
  - Proof: `confirmer-lane1-path1/after-7239/haleyville-001-campaigns-open.jpg`, `-002-race-page.jpg`.
- **No past results anywhere** except election night (`confirmer-lane4/election-night/`) and the paper.
- **Election night:** returns pages show "0 votes" lines before the count comes in.

### Records to fill it

- **Contests:** every seat covering the town has a contest with its date, primary and filing deadline.
- **Filings:** each filing carries a petition, the signatures needed and gathered, and the clerk's check. Candidates' filed positions are kept too. (`src/core2/modules/elections.ts`)
- **Past elections:** every seat's last election with its campaign facts.
- **Polls:** campaign polls that asked real people.
- **Governor races nationwide** on election night (pool `play-governor-races-on-screen`, done).
- **Other places:** only results are kept.
- **Known defect:** past-race totals count only fully drawn people (pool `elections-past-race-votes-from-electorate`, open).

### Questions only he can answer

1. Which races: only those on your own ballot (town, county, state, federal), or every race in the country like The Political Process (other states' governors and Senate seats), with favorites?
2. Past results: how far back, and how much per race? Options: winner and vote counts; plus turnout; plus a map by neighborhood or county.
3. Polls on races you're not in: show any poll that exists in the world (a paper's, a campaign's), or none until you're running?
4. After you file, does your own race stay listed here with a link to the board, or move to the board only?
5. Primaries: show them as their own rows before the general?

---

## 3. Parties

### Job

- **Undecided.** The CTO's 12:55 p.m. table today: "Not decided; your only note is that it explains itself." (Proposal; today's session)
- **Nearest of his own words:** Sept 16, "different coalitions of Congress... the Squad... the Tea Party members... the Libertarian people... Independents, like Bernie Sanders, who caucuses with liberal Democrats. I should be able to, you know, glean that much." (REC 05-overnight [20])

### In force

- **Oct 28 #20 (CTO log, PT-1028):** "Parties makes no sense as printed (12 seats, 1 seat, names and offices). It needs to be illustrated. There was once a map with districts; bring it back. Parties illustrated in that same way, not Democracy 4's way but in that spirit."
- **Nov 1:** "First of all, I don't know what this is supposed to be... But it says Democratic. Views fit close. How do you know?" Your party reads your registration (or "not registered"). A fit says what it compares, or it doesn't show. (OD, "Nov 1, 22:25 UTC", second batch; pool `play-parties-says-how-it-knows`)
- **Sept 26, answered yes:** a party's stance on issues "comes from its members' and officeholders' views and shifts as they shift," so realignment happens over decades. (`cto-notes/04-questions-for-lamontae.md`, Q7)
- **Oct 14 and 15:** "The party asks someone to run only with some inroads on record"; "a player with a high-standing job may be propositioned to run for a seat someone needs filled." (OD, "Oct 26, evening")
- **Oct 29, 7 p.m.:** no meter for how anyone feels about you. A party "fit" is not a feeling, but it must say what it reads. (OD, "Oct 29, 23:00 UTC")

### Superseded

None of his rulings on Parties have been replaced. The Oct 30 CTO plates layout is superseded by Nov 5's no boxes.

### The Political Process

There's no Parties tab. Parties show up in four places:

- **Party Chair role:**
  - Fill empty positions with candidates by district and office.
  - Pick primary challengers.
  - Set the party platform's priorities and positions.
  - Party marketing (TV, radio, direct mail).
  - Party turnout and "Support for Party Policies."
- **Caucuses** in Politicians and Profile, described in words.
- **Metrics:** "Political Party Demographics," with registered voters by party.
- **Elections:** "Elections Won by Party," "Seats Gained," and approval by Democrats, Republicans and Independents.

### Ours today

- **The tab** (Proof: `docs/play-first/shots/play-parties-says-how-it-knows/after-state-1440x900.png`, Longwood, Florida):
  - A state map with your districts labeled and seats colored by party ("Republican · 12 seats").
  - "You are not registered with a party. Joining one lets you file under its name," with Join buttons for each party on the state's ballot.
  - "In office": face cards by party, paged, each with a letter badge in a circle.
- **Joining** stays on Parties (pool `play-menus-parties-rail-roster`, done).

### Records to fill it

- **Party organizations** in each state: those on its 2024 presidential ballot or holding its seats. Each has its own members, leader and chair, meetings and nomination rules.
- **Members:** each person's party tie, from their views and loyalty.
- **You:** your registration.
- **Seats** by party in every body.
- **Missing:** no caucus or coalition record, and no party platform shown as data. (`src/core2/modules/parties.ts`)

### Questions only he can answer

1. What is Parties for? Options:
   - (a) Who holds power, by party, at each level, on the district map.
   - (b) What each party wants, its positions from its members.
   - (c) Your membership: join, switch, and what the party asks of you.
   - (d) Blocs inside the parties, his Sept 16 coalitions.
   - Any mix of these.
2. The map: your state with its districts colored by who holds each seat (as built), a national map, or both by level?
3. The "fit" between you and a party: show which of your positions agree or disagree with its platform, item by item, or drop it?
4. The party organization: show the local chair and committee (who could ask you to run), or keep them as people you meet?

---

## 4. Issues (law cards; a law opens "like a bill")

### Job

- **CTO's 12:55 p.m. table today:** "What's the law here, and who can change it?" (Proposal)
- **His Nov 1 words:** "the game laws or the issues... I click on it and then it gives me no information about it. Give me options for what shows." (OD, "Nov 1, 22:25 UTC")

### In force

- **Nov 1, 6:30 p.m., the law page:** "I imagine clicking on it and the quote-unquote bill interface as it is in whatever place you're selecting. And seeing... what that does to say the budget or analysis on how homelessness affects graduation rates or anything like that. And if you've maybe run a poll, you could see what people are thinking. You could see recent legislation. You could see choose your position. Get me a mock." (OD, "Nov 1, 23:30 UTC", question 2; pool `play-issues-law-page-and-what-shows`, open)
- **Nov 1, the list:** "I kind of see the vision here, though. I don't like how it's just laid out and a bunch of cards. Again, this doesn't look like a real game menu." (OD, "Nov 1, 22:25 UTC", second batch)
- **Nov 1, mocks first:** "So the lane will show me a mock and you'll send it to me in this chat." Issues and Budgets get built only after he sees their mocks. (OD, "Nov 1, 23:30 UTC", question 3)
- **Oct 28 #21 (CTO log, PT-1028):** "what are these and why these four? Issues should open a real menu where you click an issue (minimum wage) and see the law itself and find the law." Rows reading "State, Ohio, January 1, 2026" are repetitive when you're already in Ohio.
- **Oct 24, "go ahead":** law cards, not a plain list ("like an Excel sheet"). (OD, "Oct 24: rulings")
- **Oct 14 (MOCKS-1014):** "Law cards grouped by subject, like Democracy 4 and Crusader Kings 3: icon, the law in force in large type... who can change it, since when." The part about a marker on a bar is superseded; see below.
- **Oct 26:** "the bill is illustrated on screen with the UI, and you can click that specific part... then it shows the simulated stuff on the right, how the CBO would estimate." "Citations open the game's own display of that law, never a web page." (OD, "Oct 26, evening")
- **Oct 14:** "Bills follow the real form." The player edits only the terms, each a clickable field. (OD, Oct 14 morning)
- **Oct 14, night:** "Law effects on the player belong under Politics, written as sentences, never as keys with 'undefined'." (OD, Oct 14 night)
- **Nov 5:** no sliders, which includes the Nov 1 mock's "Your position" bar. A law page links to the numbers it moves on the how-it's-doing tab. (NOV5 #1–2)
- **Oct 27:** real data only calibrates; "no real statistic in play." The Oct 27 audit kept starting laws' citations and enactment dates (pool `play-issues-real-statutes-and-dates`, open, re-scoped).

### Superseded

- **Oct 14 mock's "a marker between the two extremes"** and the Nov 1 mock's position slider. **Replaced by** Nov 5: no sliders.
- **Oct 15 "Issues follows this register, not its mockup"** (REG line 151). **Replaced by** Oct 24: cards.

### The Political Process

- **Office > Legislation:** topic tabs. A bill is a titled list of provisions, each a real change "from X to Y." The cost estimate comes at the committee hearing.
- **Each law's page:** status, history, sponsor, and an archive.
- **Metrics > Legislation:** "Legislation by Status" and "Policy Support History."
- **Campaign > Platform:** positions by policy area (support or oppose, increase, decrease or maintain), with "View Policy Impact."
- **Polls:** opinions by topic (economic, education, tax, guns and crime, health, environment and energy, immigration and more).

### Ours today

- **The list** (Proof: `confirmer-lane4/issues-budgets-board/meadow-issues-1440.jpg`):
  - Fifteen subject tabs wrapping onto two rows, and a search.
  - Law cards like "Adopt income tax / No / State law since 2024" and "Property tax rate / 1.06% of home value / County law since 2025."
- **A law's page** (`meadow-issue-law.jpg`): just "In force · State law · No · since July 1, 2024," the exact thing he complained about Nov 1.
- **The Nov 1 mock** (not built, no answer on record):
  - The list has filters by level (All, Federal, State, County, Town), by in force, not in force or being voted on, and by subject, with lines such as "reaches 1,214 homes here" and "you could change it as a state senator."
  - The law page has:
    - A header ("County law · Clark County · in force since January 1, 2025 · passed 5 to 2").
    - A plain summary.
    - "What it does to the county budget" ("Brings in $3.1M a year, 44% of the county's money; a point higher +$460K, about $73 more on a typical home").
    - "What changing it changes," as a chain of effects.
    - "Your position" (a slider, now ruled out).
    - "What people think" (your poll of 400 residents).
    - "Recent legislation."

### Records to fill it

- **The law itself:**
  - Every law in force at every level over the town, with its value, level, and since date.
  - Bills, votes and law-took-effect events, for recent legislation.
  - Who a law reaches here (the law reach records).
- **Its effects:**
  - The effects web: each law's links to the measures it moves, from the laws lead's matrices and the monthly outcome record.
  - Its budget lines and share.
- **Your side:** polls the player ran, and the platform positions the player filed.
- **Missing:** a record of the player's public positions outside filing.

### Questions only he can answer

1. "Choose your position" without a slider:
   - (a) the bill's real choices as buttons with their amounts ("cut to 0.62%," "keep 0.67%");
   - (b) type the amount you'd propose;
   - (c) no picker, where your position is what you've said in scenes and votes.
2. "Options for what shows": the Nov 1 filters (level; in force, not, or being voted on; subject; search). Are those right?
3. Which laws appear at all: every law over your town, or the ones that touch this place? He asked "why these four?"
4. On a law's page, the effects as numbers (this year beside last, linking to how-it's-doing) or as the chain of words in the Nov 1 mock?
5. Polls: only polls you ran (his words), or also public polls the paper ran?
6. When you hold a seat, should a law's page offer "Draft a bill to change it," making Issues the way into the bill desk in Your office?

---

## 5. Budgets (any government, this year beside last)

### Job

- **CTO's table today:** "Where does the money come from, and where does it go?" (Proposal)
- **His model (Nov 1):** "look at another political game, the political process, look how it displays budgets and stuff like that, and use that as inspiration."

### In force

- **Nov 1, 5:40 p.m.:** "It only shows the U.S. and the Virgin Islands. I don't know why it doesn't show every state either. And this is a good start to displaying the information... If you look on the budget enforce at the opening, remove that. I don't like that. And maybe put like when it is enforced, so October 1st, 2024 to blank." (OD, "Nov 1, 22:25 UTC", second batch; pool `play-budgets-every-government-political-process-style`, open)
- **Nov 1:** mocks first; build only after he sees one. (OD, "Nov 1, 23:30 UTC")
- **Oct 27, 9:55 p.m.:** "It should not just be words on this blank background." (OD, "Oct 28, 02:00 UTC")
- **Oct 24, "go ahead":** Budgets is hidden until it's the player's business: they hold office, have filed, or are old enough to vote. "No budgets for a 17-year-old." (OD, "Oct 24: rulings")
- **Oct 14 (MOCKS-1014):** one chart style, "donuts, bars, this year against last."
- **Nov 5 (Picked, the how-it's-doing option):** "this year beside last." The CTO's table proposed the same for Budgets: "Any government, this year beside last." (Proposal)
- **Oct 29, 5:40 p.m.:** "Your character sends the budget without you" (objecting). The executive's budget is the player's, a desk stop by default. That belongs to Your office. (OD, "Oct 29, 21:40 UTC")
- **Oct 14:** "a budget cut names the law and the line's history." (OD, Oct 14 morning, "Anything the tracer cannot answer")
- **Sept, register OCD-UI-008:** budgets and metrics are "inspectable graphically where actual data exists." Each graph names its period, place and units. "Graphs are readable views over canonical data." (REG)

### Superseded

- **Oct 20:** Budgets under Politics at all times. **Replaced by** Oct 24: hidden until relevant.
- **Today's "in force at the opening" line.** **Replaced by** Nov 1: show the budget's period instead.

### The Political Process

- **The executive's budget** (Mayor Budget, Governor Budget, Presidential Budget):
  - By department, each with its head and "View Department Report."
  - Tax Policy: every tax with its rate.
  - Mandatory and Discretionary Expenditures, each line with what it pays for and its budget request.
  - "Previous Budget" and "Balance Budget."
- **Metrics > Budget:**
  - Revenue and expenditure, tax revenue by source, and spending by type and by category.
  - Treasury and trust funds, surplus or deficit, and department expenses.
  - Pie charts and a timeline.

### Ours today

- **The tab** (Proof: `confirmer-lane4/issues-budgets-board/meadow-budgets-1440.jpg`):
  - One government in the picker.
  - "Borough of Matanuska-Susitna · fiscal year 2024 · $1 billion," then "Adopted July 1, 2024, in force at the opening." That's the line he asked to remove.
  - Two rings, "Where it comes from" and "Where it goes," with line amounts.
  - "The books": balance, taken in, paid out $0, cash on hand. Paid out $0 looks wrong, like his Nov 1 report of the nation taking in $111,000.
- **The Nov 1 mock** (not built, no answer on record):
  - A "Whose budget" list: federal, every state and territory, counties, your town and county, "56 governments in all · search."
  - The period and who adopted it.
  - Coming in and going out, each beside last year, with left over or short and reserves.
  - Spending lines with change from last year, sources, "Set by the council's property tax rate," and the books, where each line opens the people and laws behind it.

### Records to fill it

- **Budgets:** every government's latest adopted budget, with lines named from their source tables. The years before the start are now kept (pool `gov-prior-year-budgets-at-opening`, done).
- **Money actually moved:** each treasury's journal (taken in, paid out, cash).
- **The executive's priorities** for the next budget.
- **Today's limit:** the screen's data covers only the governments over your town (`src/bench/budget.ts`). Last year beside this year isn't on screen yet (pool `play-prior-budgets-on-screen`, open).

### Questions only he can answer

1. Did the Nov 1 Budgets mock's contents land (coming in, going out, last year, lines with change, the books)? The CTO found no answer on record.
2. The picker: the nation, every state and territory, and your county and town. Should it also include any other town or county you browse to (built when opened)?
3. How deep, The Political Process style: departments with their heads, taxes with their rates, required versus chosen spending? Or keep to where the money comes from and goes, with last year beside it?
4. Rings (his Oct 14 chart style) or bars for this year beside last?
5. When you're the executive, do your budget changes live here or in Your office?

---

## 6. How it's doing (new Nov 5; name not picked)

### Job

- **Picked, Nov 5, 12:57 p.m.:** "One place for how your town, state and country are doing, with this year beside last. A law's page links straight to the numbers it moves."
- **The question he answered:** "Ours has no screen for how your town or state is doing (jobs, rents, crime, schools, homelessness), so a law's effects have nowhere to show up except news and scenes." (today's session)

### In force

- **Nov 5 (Picked):** above. It's a Politics tab, not its own rail icon.
- **Nov 5:** "I like data being shown." Real numbers, never sliders. (NOV5 #2)
- **Oct 27 (OD, "Oct 27, 5:40 to 6:15 PM"):** "Real data is just used to calibrate as soon as you press start, it's alternate history." The numbers are the simulated world's, never real statistics.
- **Oct 28 #24 (CTO log, PT-1028):** the figures strip on top of News (Nation, area, jobs) is to be removed: "Said multiple times before." So the numbers need their own home rather than subheading rows on other screens.
- **Sept 29 (CTO notes of his playtest):** "The metrics (6.1% unemployment, prices 4.3% higher) are OK but need more context: compared with what, and what that means for a person." (`cto-notes/playtest-2026-09-29.md`, line 16)
- **Oct 14:** one chart style, "this year against last." (MOCKS-1014)
- **Sept, register OCD-UI-008:** graphs name their period, place and units, and never invent a forecast. (REG)
- **Nov 5, generate on demand:** numbers for places outside your own come from what was simulated, built when asked, and not stored row by row. (OD, "Nov 5, 12:49 p.m.")

### Superseded

None.

### The Political Process (Metrics)

- **Levels:** City, State, National.
- **Categories:**
  - Overview and Population: age, ancestry, party registration.
  - Education: graduation rate, academic score, dropouts by cause, teachers, college.
  - Poverty: poverty rate, unemployment, homeless sheltered and unsheltered, shelters versus permanent housing.
  - Economy: income per person, employment, skilled and unskilled labor.
  - Crime: violent, property, drug and public order crime; police; prisoners and jail cost; guns.
  - Infrastructure: road miles and condition, congestion, power sources.
  - Budget: revenue and spending, trust funds.
  - Health: coverage by type, life expectancy, births and deaths.
  - Environment, Military, Immigration and Other.
- **Government Approval Ratings,** overall and by category, by party.
- **Department Effectiveness.**
- **Views:** "View Timeline" on each number and pie charts.

### Ours today

There's no screen. Some figures show as rows on News and in scenes.

### Records to fill it

- **Monthly economy row for your town** (and every place with businesses): jobs, unemployment rate, median hourly pay, prices, businesses open, opened and closed, median rent, mortgages, bank lending, eviction orders and poverty.
- **Monthly outcome record per place,** two groups of 22 measures each:
  - Kept outcomes: births, assault, burglary, property crime, robbery, vandalism, middle-age deaths, youth gun deaths and suicides, evictions, rent, home values, incarceration, low-level arrests, pretrial detention, low-wage jobs, employment, wages, school enrollment, youth and local turnout.
  - Engine measures: unemployment, household income, home prices, rent as a share of income, eviction orders, violent crime, reported crime, poverty, property tax rate, police per 1,000 people, budget lines added, a local paper and more.
- **The nation's economy** (unemployment, inflation, interest rates, mortgage rates) and regional unemployment.
- **Links from each law to the measures it moves,** for "a law page links to the numbers it moves."
- **Gap:** state and national versions of most town measures aren't kept. Under the Nov 5 rule they'd be built from what was simulated when the tab asks.
- Sources: `src/core2/modules/world-metrics.ts`, `outcome-web.ts`, `src/core2/data/outcome-web/outcome-web.json`.

### Questions only he can answer

1. The name. Options: "How it's doing," "Conditions," "The numbers," "State of things," "Scorecard," "Metrics."
2. Which numbers come first. The Political Process groups them as jobs and pay, prices and rent, housing and evictions, crime, schools, health, poverty and homelessness, taxes and spending, turnout. Pick the first set.
3. Town, state and country: is it fine that state and country figures are built from the simulation when you open them, rather than kept month by month?
4. Approval of the government (The Political Process has it by party and topic): show it only as published poll numbers, or not at all, given "no meter for how someone feels about you"?
5. Comparisons: this year beside last only, or also neighboring towns and the state average, and a timeline like its "View Timeline"?
6. Hidden for a 17-year-old like Budgets, or always there?

---

## 7. Your office (only while holding a seat)

### Job

- **CTO's table today:** "What's on my desk?" (Proposal)
- **His Sept 16 playtest as governor:** "Okay, it doesn't appear that I can do anything as governor. See my calendar. Yeah, there's nothing on my calendar." (REC 05-overnight [20])

### In force

- **Oct 15 and Oct 20:** "Your office appears only once the player holds one"; "Your office only while you hold a seat." (REG line 151; OD, "Oct 20: rulings")
- **Sept 16, 5:37 p.m.:** "politics should show whatever is local to you right now, but, like, as those your office and shit like that in the tabs." (REC 05-overnight [54])
- **Sept, register OCD-UI-004:** the office tab keeps "the character's actual office... jurisdictions rather than following travel location." (REG)
- **Oct 29, 5:15 p.m., office life:**
  - "maybe you'll have a meeting with somebody... you look at your calendar and you have a bunch of stuff booked like you have a meeting with this person and then... an executive board... or maybe your meeting with the lobbyist."
  - What stops you: "your own bills, any vote where yours could decide it, your desk, and scenes, by default; you can customize it."
  - "Before a vote you see what colleagues told you plus your aide's estimate, marked as an estimate that can be wrong. No exact count."
  - Co-sponsors are promises, vague or firm, and can be broken. (OD, "Oct 29, 21:15 UTC")
- **Oct 29, 5:40 p.m.:**
  - "Your character sends the budget without you" (objecting), so the budget is a desk stop by default.
  - The voting and bill screens "need to be adjusted, and... they need to be tied to places."
  - "It should always make quorum." (OD, "Oct 29, 21:40 UTC"; pool `play-vote-and-bill-screens-redesign`, done)
- **Oct 26:** bills on paper, every term clickable, "how the CBO would estimate" beside it. (OD, "Oct 26, evening")
- **Oct 14:** bills follow the real form, and the player edits only the terms. "Play how you want": "The player chooses what stops them... Any act of office can be done or simulated." (OD, Oct 14 morning)
- **Oct 14, night:** "holding office is where day-level play (policy, talking, negotiating) begins"; "The day screen is for dealing: 'I'll do this if you do this', negotiating, talking with people, policy." (OD, Oct 14 night)

### Superseded

The Oct 30 CTO layout (pool `play-menus-your-office-plates`: seat facts, budget lines, open posts and drafts each on plates) is replaced by Nov 5's no boxes.

### The Political Process (Office)

- **Summary:**
  - Schedule: events, rallies and fundraisers, with "Attend All."
  - Messages by kind: general, election, president, governor, mayor, party, caucus, press conferences, budget legislation, chair decisions.
- **The work:**
  - Legislation and Appropriations.
  - Actions: nominate cabinet members and judges, challenge laws, fundraise for yourself or the party.
  - Challenges: constituent requests, each with a goal, deadline and reward.
- **Your district:**
  - Constituent Report: approval, trust, and top issues by party.
  - Constituent Priorities, District Demographics, and the office's history.
- **Other:** Contacts, Districts, Jobs, Events, Protégé, Automate Office Events, and Retirement.

### Ours today

- **Your seat** (Proof: `confirmer-lane1-path6/murray-your-office.jpg`):
  - Office, pay ("$940.00 a year") and next meeting.
  - "What you have done": "April 6, 2027 · Vote · yes · Decided for me"; "January 2, 2027 · Town hall · 40 came; 4 questions · Decided for me."
- **Drafts** (`docs/play-first/shots/play-menus-your-office-plates/drafts.png`):
  - Fellow members' names in a line.
  - "Draft a bill": a subject ("Highways"), "In force today: Not set," "The new amount: $0," and Draft.
- **Elsewhere in the code** (`src/bench/office.ts`):
  - Department-head picks, the budget to send with line changes, and deals to offer.
  - The meeting and the desk are scenes.

### Records to fill it

- **On record:**
  - The seat and pay, meetings and agendas.
  - Bills waiting on your desk and your drafts.
  - The budget you can send, open posts to fill, and deals offered.
  - Every act kept, done or simulated, plus stops and hiring an aide.
- **Missing or thin:**
  - The officeholder's booked calendar (meetings, boards, lobbyists, expert dinners, appearances) that he described Oct 29.
  - Constituent requests.
  - The aide's estimate before a vote.

### Questions only he can answer

1. What's the tab's first view: the desk (bills to sign, drafts, the budget to send, posts to fill), this week's schedule, or what you've done?
2. Constituent requests like The Political Process's Challenges: should they arrive here as items that open scenes, and should they carry a goal?
3. What your district thinks of you: only through polls you run and scenes, or a district report?
4. The booked office calendar (his Oct 29 picture): here, in Calendar, or both?
5. Where your stop settings ("you can customize it") live: here or in Options?
6. Keep "What you have done," and its "Decided for me" marks?

---

## 8. Campaign board (only once you've filed)

### Job

- **CTO's table today:** "Am I winning, and what's next?" (Proposal)
- **His Oct 27 words:** "One board, I'll have to see it explicitly... there should be some kind of inbox with media requests or building a campaign team... the political process has some kind of manager. I would like to be able to do that. Maybe you meet someone, maybe it's your significant other or your best friend." (OD, "Oct 27, 5:40 to 6:15 PM Eastern"; pool `screens-campaign-board`, open)

### In force

- **Oct 27 (above):** one board, an inbox, and a team built from people you know and met in scenes. He sees the board before anything more is asked.
- **Nov 5 (Picked):** "Your one campaign board stays separate and appears once you've filed."
- **Oct 27, about 3:3x p.m.:**
  - "What the race turns on? What the hell does that mean? Remove that. This is dev language."
  - "That you are on the ballot first of all on small letters. Why there's no reason for that to be there."
  - "Everything is squished." (PT-1027; OD, "Oct 27, afternoon"; local playtest block)
- **Oct 26:** "this campaign screens again. It's just jumbled mess... How do you know you knocked on 45 doors, 32 [22] reached? What the hell does that mean?" (PT-1026, line 67)
- **Oct 28 #35 (CTO log, PT-1028):** after filing, the raised/spent/volunteers/doors line, the row of action buttons, the "Where the race stands" lines and the races list must all go, and the menu needs a redesign.
- **Oct 20:** no "Today" list of acts. Campaign acts are scenes you go to (a speech venue, doors, an interview, a debate). Oct 27: "Door-knocking and every campaign act are scenes... Scenes are the game." (OD, "Oct 20"; "Oct 27, 5:40 to 6:15 PM")
- **Nov 1, the first filing's tutorial:** "do you know how to run a campaign? ... your goal is to get X amount of signatures to get on the ballot. You do that by doing this. Now, you'll need money... You can get TV ads. Etc. You may want to do media." It's asked by a person in a scene. (OD, "Nov 1, 23:30 UTC"; pool `play-first-filing-campaign-tutorial`, done)
- **Oct 29, 5:40 p.m.:** "Look at real races": an organization backing a challenger, an incumbent coming home to campaign, donor meetings, hosting a forum, debates; "it's raising money and stuff like that." (OD, "Oct 29, 21:40 UTC")
- **Oct 27:** volunteers stop the player only "some that matter... only when you're doing small local campaigns, or maybe your first campaign." (OD, "Oct 27, afternoon")
- **Oct 27, 4 p.m.:** the campaign record has "one count of volunteers for the header, the row and the director." (OD, "Oct 27, afternoon")
- **Oct 26:** campaign seasons are full of scenes: interviews, a debate, assembling a team, rallies, working with other candidates. (OD, "Oct 26, evening")
- **Oct 29, 7 p.m.:** no meter for how voters or anyone feel about you. Polls are counts of what real people said. (OD, "Oct 29, 23:00 UTC")

### Superseded

- **Oct 20:** "the Campaigns tab shows standing and polls only." **Replaced by** Oct 27: one board with an inbox and a team.
- **The Nov 4 mock's "What the race turns on" heading.** It conflicts with his Oct 27 ruling. Its boxes conflict with Nov 5.

### The Political Process (Campaign)

- **Tabs:** Overview, Events, Opponents, Polls, Finance, Contacts, Staff, Volunteers, Campaign Map, Marketing, Schedule, Platform.
- **Overview:**
  - General Information and Upcoming Elections.
  - Campaign Opportunities: general events, debates, fundraisers.
  - Finances: funds, overhead, remaining.
  - Name recognition and voter enthusiasm by party, and effect on public opinion.
- **Polls:** conduct a poll, choosing the state and contents (approval, voter intention, policy support, priorities, opinions by topic).
- **Finance report:**
  - Weekly revenue: individual and PAC donations.
  - Weekly expenses: salary, staff, field office staff, marketing, rent, other.
  - Personal funds and financial history.
- **Staff:** Campaign Manager, Event Manager, Event Coordinator and others, trainable. Its skill stars are a meter we wouldn't copy.
- **Other:** Predict Election, Election Analysis and Advice, and marketing (TV, radio, direct mail).

### Ours today

- **After filing** (Proof: `confirmer-lane4/issues-budgets-board/murray-campaign-board.jpg`):
  - "Your campaign" with the small-caps "Council member · November 3, 2026 · You are on the ballot." He rejected that line Oct 27.
  - "$0.00 raised · $0.00 spent · 0 volunteers · 54 doorsWhere the race stands," with two lines run together.
  - "So far 8 voters have heard from you," "No one else has filed for this seat yet," "A poll of 50 voters would cost $2,250."
  - The ballot cards below.
- **Acts** start as scenes from the trail card in Travel. Poll, Mail and "Put in your own money" are still buttons (pool `play-campaign-acts-as-scenes`, open).
- **The Nov 4 Lane 4 mock** (not seen by him, waiting on mocks):
  - A header: race, date, seats and number running.
  - The latest poll as a counted bar ("You 31% · Ruth Harmon 27% · ... undecided 15%"), "Standing 1st of 4, top two win," and "Money $1,240, raised $1,900."
  - On the ballot: signatures "38 of 25 needed," filed with, filing closed, and the clerk's check.
  - What the race turns on.
  - Inbox: debate, interview request, a donor wants to meet, yard signs, each opening its scene.
  - Your team: manager (your partner), treasurer, volunteers, press with "Ask someone."
  - This week: doors knocked, said they'd vote for you, days to the election.

### Records to fill it

- **The race:** your filing and petition (signatures needed, gathered and found valid) and the contest (seats, who filed).
- **Support:** polls that asked real people (who ran them, when, how many), and who you reached, by door, speech, ad and retelling.
- **Resources:** campaign money (raised, spent, cash, donors), volunteers, endorsements and ads.
- **Inbox:** invitations and asks as scene records (debate, interview, donor). (`src/core2/modules/campaigns.ts`, `elections.ts`)
- **Missing:**
  - The campaign team record (pool `screens-campaign-board`).
  - How the town leans on the race's issues (pool `play-issue-stances-on-screen`, open).
  - Your own record when you run again (pool `play-campaigns-shows-your-record`, open).

### Questions only he can answer

1. Does the Nov 4 board's content fit? Header with poll and standing; ballot and signatures; inbox; team; this week. It would be redrawn without boxes.
2. "What the race turns on": drop it, or keep the issues and each candidate's stance under plain words ("The issues," "Where you each stand")?
3. Money: just raised, spent and cash on hand, or a report like The Political Process (donations by kind, spending by kind, week by week)?
4. Polls: the latest poll only, or a line of polls over time? Show "Standing 1st of 4"?
5. Team roles: manager, treasurer, press, volunteers. Add more roles as the race grows (field, finance, a state or national staff)?
6. Bigger races (state, Congress, president): the same board scaled up, or more, like a map by county as in its Campaign Map?
7. The inbox: which kinds of items belong there (media requests, debate invitations, donor asks, endorsement offers, party asks)? Does each wait for your answer?

---

## Mocks and pages to bring to him when each screen comes up

- **Government:** `cto-notes/menus/government-v4/government-chamber.png` (today's look). Needs "Ward" removed and the party-letter circles settled.
- **Issues and Budgets:** `docs/mocks/2026-11-01/issues-list.png`, `issues-law.png`, `budgets.png` on branch `play-first/mocks-issues-budgets`. They have boxes, dead space and a position slider. No answer from him is on record.
- **Campaign board:** `docs/mocks/2026-11-04/campaign-board.png` on main. It has boxes everywhere and the "What the race turns on" heading.
- **The Oct 14 mocks he called "good":** `docs/ui/mocks/screens-2026-10-14/shots/` (gov, issues, budget).
- **The Political Process:** read its labels from `binFiles` (officeMenu, campMenu, electionPage, metricsPage, judicialBranch, profile, partyChairFile, budget files). Never launch it.
