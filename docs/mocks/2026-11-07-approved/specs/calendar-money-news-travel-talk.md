# Menu record: Calendar, Money, News, Travel, Guide, the Esc menu, pop-ups, the talk box

Gathered Thursday, November 5, 2026, 3:20 p.m. Eastern, read only. Nothing was changed, committed or sent.

The look of every menu was locked today and lives in `~/.claude/skills/menu-look/SKILL.md` (one dark see-through panel, no boxes, glowing hover, lit selection, portraits in light, data not sliders, color-blind as one global setting). This file does not repeat the look. It records what each screen is for, what it must show, what The Political Process shows, what ours shows today, and what only Lamontae can decide.

How to read each section:

- **In force:** his rulings now standing, latest first, each with his words, the date and where it is written.
- **Replaced:** older rulings and what replaced them.
- **The Political Process:** what its files show for the matching screen (read with `strings`; the game was never launched).
- **Today:** what our game shows now, from the screen code and proof pictures, and which real records could fill it.
- **Questions for him:** only what his rulings don't answer.

Quotes are his own words unless marked **Recorded**, which means the CTO's written record of something he said aloud or ruled through a session. The record is binding; the wording is the CTO's.

Source key (repo `lamontaes/Political-Game-Git`, main, read Nov 5):

- **Decisions** = `docs/coordination/OWNER-DECISIONS.md`
- **Register** = `docs/coordination/DECISION-REGISTER.md`
- **Lane law** = `docs/play-first/LAW.md`; **Order** = `docs/play-first/ORDER.md`
- **Oct 14 mocks** = `docs/ui/mocks/screens-2026-10-14/README.md` and `shots/`
- **Oct 26 sitting** = `docs/coordination/playtest/2026-10-26-1.md`, his words in `cto-notes/playtest/2026-10-26-1.md` on the Mac
- **Oct 27 sitting** = `docs/coordination/playtest/2026-10-27-1-log.md` (his words) and `-1.md`
- **Oct 28 sitting** = `docs/coordination/playtest/2026-10-28-1.md`
- **Oct 24 voice note** = `docs/coordination/voice-notes/2026-10-24-playtest.md`
- **Owner record** = `docs/reports/owner-record/01-decisions-governing-current-work.md` and `07-tasks-making-the-game-alive.md`
- **Pool** = `docs/pool/items/<name>.md`
- **Proof** = `docs/lanes/proof/` and `docs/play-first/shots/`
- **Menu rulings today** = `cto-notes/menus/RULINGS-nov5.md`
- **Reference game files** = The Political Process's install folder under CrossOver on this Mac (the full path is in memory `reference-games-on-mac.md`) (`index.html`, `binFiles/newsPage.bin`, `uiMenus.bin`, `officeMenu.bin`, `campMenu.bin`, `campEvents.bin`, `electionResults.bin`, `profile.bin`, `metricsPage.bin`, `contactsJS.bin`)

## Rules that bind every screen here

These come up on every screen below, so they're listed once.

- **No Continue or Back on any menu.** "I said continue and back, needs to be removed from every single menu" (Oct 29, third time; Decisions, Oct 29 16:30 UTC). A menu closes with its close mark or Esc. Talks and scenes keep their own Continue, which is not a menu (Pool `play-menus-no-continue-back`).
- **No subheadings.** "Remove all those fucking subheadings. I hate them all" (Oct 27; Decisions, Oct 27 afternoon).
- **The menu never scrolls as a page; long lists page inside their own box.** "The main menu shouldn't really be scrolling. It should be things inside" (Oct 29; Decisions, Oct 29 22:10 and 22:15 UTC).
- **No dead space.** "there's so much dead space and empty space in these menus" (Oct 27; Decisions, Oct 27 afternoon).
- **Not blocks of text with random buttons.** "redesign all the menu screens... So they're not blocks of text anymore with random buttons" (Oct 29; Decisions, Oct 29 22:45 UTC).
- **One way to each screen; one left menu.** "one left menu, not a panel duplicating the rail" (Oct 27; Decisions, Oct 27 afternoon).
- **Screens are designed from game design principles and reference games.** "How hard is it to look at other games and look at game design principles, examples, and textbooks and stuff and design a good goddamn screen?" (Oct 27; Decisions, Oct 27 afternoon). The Political Process is the reference for menus, calendar, travel and news; Wildermyth for scenes.
- **The scene is home; menus are overlays that pause time with the room's people still visible** (Oct 20, from the menu study; Decisions, Oct 20).
- **Every word comes from records and the English engine; no developer words** (standing rule; Lane law sections 7 and 8).
- **Mocks first, then building.** "So the lane will show me a mock and you'll send it to me in this chat" (Nov 1; Decisions, Nov 1 23:30 UTC). On Nov 5 he chose "Yes, but wait": nothing gets built until the screens are mocked (memory `menus-dark-glass-no-boxes-nov5.md`).
- **Detail elsewhere is generated on demand.** Other places keep only results; detail is built when something asks for it (Nov 5, 12:49 p.m.; Decisions, Nov 5). Any screen that lists other places' laws, votes or people reads that path, never stored rows.

---

## 1. Calendar

### Job

"What's coming that I have to deal with?" That line is the CTO's Nov 5 summary, marked as his because he had ruled the parts: color-coded kinds he can hide, his own deadlines first. In his words, the calendar is where an officeholder sees "a bunch of stuff booked" (Oct 29).

### In force

- **Color-coded kinds that can be hidden.** "Sure... just make them color code those things. Like town meetings and stuff. And be able to hide them if you want." (Nov 1, 6:30 p.m.; Decisions, Nov 1 23:30 UTC; Pool `play-calendar-more-than-birthdays`)
- **Not mostly birthdays.** "Something on the calendar I don't like is that it's just people's birthdays." (Nov 1, 5:25 p.m.; Decisions, Nov 1 22:25 UTC). The CTO's reading, which his "Sure" confirmed: the player's own appointments and the town's dated public events first, birthdays only for the household and close family.
- **Usable, not "a blob."** "the calendar, it's just a blob. Look at real game design principles." Ruled: events on their days, one worded line each naming who and what, no duplicates, the player's own deadlines first, and no "LAW TAKES EFFECT" rows that name no body or effect: "these random laws take effects are not useful" (Oct 27; Decisions, Oct 27 afternoon; Oct 27 sitting log).
- **An officeholder's calendar fills from the simulation.** "you look at your calendar and you have a bunch of stuff booked like you have a meeting with this person and then... an executive board... or maybe your meeting with the lobbyist..." Recorded: booked meetings with named people, boards, lobbyists, expert dinners that teach a subject, speeches, talks and appearances (strikes, openings, protests), "each a stop the player can set to play or let happen" (Oct 29, about 5:15 p.m.; Decisions, Oct 29 21:15 UTC).
- **Things set in a talk land on the calendar.** "Tuesday nights. Then I'll see you there, and so will everybody I bring" is great, "and should put an event on the calendar" (Oct 16, batch 16; Decisions, Oct 16 afternoon).
- **Real community life, so it doesn't get old.** "there needs to be real ones with some good fluff or else it will get old" (Nov 1). Filed as fairs, parades, homecoming, church and club events, each a dated record the paper, journal and scenes read (Pool `world-community-calendar`, open).
- **No empty day panel; centered.** "look, you clicked February 3rd. If there's nothing there, the middle panel should not be there. What is wrong with this calendar? How hard is it to make a calendar? Why is it so off-center?" (Oct 26 sitting, his words).
- **Clicking a future day lets you move time to it.** Recorded: "On the calendar, clicking a future day shows a small skip-forward icon or button (no 'skip to event' label); pressing it runs time to that day. A scene stops any advance." (Oct 15; Decisions, Oct 15 afternoon). Day and Week stay on the player card.
- **Visual, not a spreadsheet** (Oct 1; `docs/packages/M6-screens.md`). The Oct 14 mock he called "good": one month plus Coming up, day tiles shorter than wide with small icons instead of printed text, a day panel that slides open between the month and Coming up (Oct 14 mocks; `shots/calendar.png`).
- **Kit 13 calendar notes still standing:** "I don't like the circle for the day. I also don't like the thin gold lines above and below calendar history and interruptions... I don't like the boxes. Again, it reminds me of Excel, HTML, CSS." (Oct 4; `cto-notes/owner-words-codex-oct2-5.md`; `docs/ui/kit13/APPROVED-2026-10-04.md`)
- **A calendar entry opens its details and a way to go.** The register's standing entry: selecting an event shows what it is, who invited you, who's going, and travel and time; there is "an explicit route to wait/depart/attend at the right time," the calendar is "a progression hub," and "Inspection never automatically attends" (September; Register, configurable confirmation entry). Menus carry hot links that take you there (Oct 28 sitting, point 19).
- **Only what the player acts on or will feel goes on it** (screen principle 8, built to his Oct 27 words; `docs/design/screens/principles-2026-10-27.md`).
- **Dates read month, day, year everywhere** (Sept 15; Register, American date entry).

### Replaced

- "The calendar is an opaque panel" (Oct 15 caveat on the mocks; Register) and "why is this screen not matte?" (Oct 26) are replaced by today's ruling for every menu: one dark panel, a little see-through (78% solid) with a little texture (Nov 5; Menu rulings today, item 3).
- The day "on a framed plate" (Oct 29 framed-plate ruling, built into the calendar in late October) is replaced by "i dont like the boxes being displayted like that" (Nov 5).
- "No skip-ahead control" (Oct 14) is replaced by the skip-forward on a future day (Oct 15).
- Law-took-effect rows that name nothing were deleted outright (Oct 27); nothing on record has allowed them back.

### The Political Process

- No month calendar. Time moves in weeks: "Week 1, 2015" sits in the middle of the top bar with a Next Turn button (`index.html`).
- The top bar counts **Messages** and **Schedule Items**; both open an office summary. Mandatory events are marked red and block the next turn until done ("One or more mandatory events have not been completed... (Mandatory events will be marked by a r[ed]...)", `nextTurn.bin`).
- You can automate recurring events ("Attend All Fundraisers," "Attend All Rallies," "Automate Office Events"; `officeMenu.bin`). Your week is a budget of hours ("Hours Remaining," `campEvents.bin`).
- Messages are sorted by kind: General, Election, Legislation, Party, Caucus, Governor, Mayor, President (`officeMenu.bin`).

### Today

- **What shows** (early November, `docs/play-first/shots/play-calendar-more-than-birthdays/after-kinds-1440x900.png`): a row of kind buttons (Birthdays, Meetings, Holidays) that hide and show each kind; a month grid of mostly empty boxed tiles with a small icon on a marked day; a day panel ("Monday, January 20, Today, Inauguration Day") with empty space below it; a Coming up list of boxed rows, paged "1 of 2."
- **Problems against his rulings:** every tile and every Coming up row is a box; the day panel shows even when the day is empty ("Nothing is on this day."); "Your birthday" in June sorts above Inauguration Day in January because a birthday counts as "your own"; big dead space under the day panel; the chosen day is outlined in a box.
- **Records that fill it today:** each race's filing opening, filing deadline, primary and election (seats of one office on one line; the player's own race first); the player's birthday and the birthdays of the household and close kin; each town and county council or board's next meeting; federal holidays. Kinds named in the labels: Birthdays, Filing dates, Elections, Meetings, Holidays.
- **Records that exist but don't reach it:** loan payments with due dates and rent paid monthly (Money's records); each body's meeting day and hour; state legislatures' session days; the player's job and its pay schedule (shifts never stop the player: Decisions, Oct 26 evening); scenes that set a date in a talk.
- **Not built:** booked meetings for officeholders, community events (Pool `world-community-calendar`), a long entry that overflows its row in some towns (Pool `screens-calendar-entry-overflows`, open).

### Questions for him

1. **What counts as "your own" and goes first:** only things you must act on (your race's filing deadline, your election day, your meetings), with your birthday among family dates?
2. **Laws that change your own life** (the minimum wage rising on your paycheck): one line naming the body and the effect, or never on the calendar and only in News?
3. **The kinds and their colors.** A proposed set: Yours (appointments and deadlines), Elections, Public meetings, Family, Holidays, Community (not built yet). Should work, bills due or campaign events be kinds too?
4. **An empty day:** the day panel disappears; should the month widen into the space, or should Coming up take it?
5. **Moving time to a day:** a small skip-forward mark with no words (Oct 15), or the mock's "Go to this day" button?
6. **"Play or let happen"** on an officeholder's booked meeting: set on the calendar entry itself, or somewhere else?

---

## 2. Money

### Job

His ruling on why money exists answers it: money is time, freedom and pressure, never a score (Oct 20). On Nov 5 the CTO proposed "Can I keep my life going, and what could I afford to risk?", shown as "What comes in, what goes out and how long it lasts, never a score." That line is a proposal; he hasn't ruled on it.

### In force

- **Why money exists for the player** (Oct 20, spoken; recorded by the CTO; Decisions, Oct 20; Pool `owner-why-money-exists`). Recorded: "money is time, freedom and pressure, never a score."
  1. Keeping a life afloat (rent, bills, the car, children) runs in the background and "just has to make sense; it is not a budgeting game." Missed payments have real consequences (eviction, credit, family stress), shown "in scenes and in how the person looks and lives," not because everything is tied to the wallet.
  2. Money buys time and risk: savings let a person quit a job to campaign, take a low-paying seat or survive a loss.
  3. Debt makes a person a target: "a broke official is who lobbyists and bribes go after."
  4. Access, giving and scrutiny: money opens rooms, donations earn endorsements and favors, and officials' finances are public, so unexplained wealth draws investigations.
- **Never a scoreboard; the advantage is time.** Recorded: "The player's money: a basic rent or mortgage, maybe college debt, money into one's own campaign; never a scoreboard." "Money's advantage is time: a good job buys more time to campaign and less at work." (Oct 14, his answers to the CTO's questions; Decisions, the Oct 14 answers; Register, the player's life: "Money (owner, Oct 14)")
- **Light, but real.** Recorded, from his answers on the game's vision: "Jobs exist for income, because money has to have value (and later for corruption to matter materially)." Kept light: "a home, with some real benefits (commute time, access to different people) and a mortgage that creates money pressure; rent and living costs as part of the simulation." (Sept 26; Register, vision and scope)
- **The systems stay; the minutia goes.** Recorded: the money systems stay and the player-facing minutia goes (Oct 13, about 11:57 a.m.; memory `owner-rulings-oct13.md`).
- **Taxes settle on their own:** Recorded: "Taxes settle automatically at year end: a refund arrives or a balance is taken, with no return to file." (Sept 28; Register)
- **Who you are shows money in one line**; Money holds the rest (Oct 14 night; Decisions).
- **The Oct 14 mock he called "good":** a big cash figure, six months of balances as bars, a ring of where the month went, what you own and owe as cards (Oct 14 mocks; `shots/money.png`). Recorded: "One chart style (donuts, bars, this year against last) used anywhere numbers are compared: budget, money, votes." (Oct 14; Lane law section 1)
- **Bars that count records are allowed.** Recorded: "Bars that count things a record holds (a roll call's yes and no votes, money) are not this ruling" (the no-meter ruling; Oct 29, 23:00 UTC; Decisions).
- **Data, not sliders.** "Those are too video game-like. I like data being shown." (Nov 5; Menu rulings today, item 2)

### Replaced

- "Why money exists... not settled yet. Until then money accumulates... nobody builds a scoreboard or a sink on a guess" (Oct 15; Decisions, Oct 15 afternoon) is replaced by the Oct 20 ruling above.
- Framed plates around each part (Oct 29) are replaced by no boxes (Nov 5). Today's Money is boxes inside boxes.

### The Political Process

- No personal money screen. Money appears only as **Campaign Funds** and **Salary** on the campaign menu and profile (`campMenu.bin`, `profile.bin`).
- Campaign funds pay for everything a campaign does and block what you can't afford: "You do not have enough campaign funds to travel," to open a field office, to conduct a poll, to train staff (`endorsements.bin`, `campVolunteer.bin`, `campMenu.bin`, `campStaff.bin`).
- Its Metrics page is a large data page (population, crime, economy, budget by department, approval by category; `metricsPage.bin`). That is the model for the new Politics tab for how your place is doing (Nov 5), not for Money.
- So our Money goes past the reference. The models are his Oct 14 mock and the Oct 20 ruling.

### Today

- **What shows on day one** (Nov 4 replays in eight towns, `docs/lanes/proof/confirmer-lane2-path1/*-4-money.jpg`): the title "Money and property," a big cash figure in a box ("$422"), and a Home box holding one smaller box ("Owned / House"). The rest of the panel is empty. No months have passed, so nothing else has data yet.
- **Three months in** (Oct 30, `docs/play-first/shots/play-menus-money/money.png`): cash at the bank ("$0" in that world), one bar for the one month reviewed ($9,740 in March), a ring for the household's last month that reads "Everyday living 100%," and the home with its worth ($211,000). Wide empty areas; boxes inside boxes.
- **Records that exist:** the household's cash now (all members' cash added together); savings at the town's bank; up to six monthly reviews by the credit engine (cash on each review date); the last month split into housing, everyday spending, paid and left unpaid; each loan payment with what was due, what was paid and what is past due; what is owed by kind (mortgage, personal loan, startup loan, cash advance) with months left and any foreclosure; the home, owned with its worth or rented with its rent; paycheck deductions; the job's pay (job offers show pay per hour).
- **Missing or not split:** what comes in (paychecks and payday), how long savings last at current costs, the month's costs split beyond "Everyday living," campaign money, money given away, and what the public can see of an official's finances.

### Questions for him

1. **The headline number:** cash alone, or cash beside how long it lasts at your current costs ("about 3 months")? That is the "time" in his ruling, shown as data.
2. **Whose money:** yours, your household's (today), or both side by side?
3. **Campaign money:** on Money, or only on the campaign board?
4. **What comes in:** show pay and the next payday, as the mock did ("Payday Friday: $656")?
5. **Public scrutiny:** once you seek or hold office, should Money show what the public can see of your finances?
6. **Compare how:** the last six months as bars (mock), or this year beside last, as on the other menus?
7. **Name:** "Money" on the rail, "Money and property" on the screen today. Which one?

---

## 3. News

### Job

In his words: "literally visually look like a newspaper or a magazine" (September). It is how the world reaches the player: "most people's friends don't talk about laws that were passed. Usually... the news and social media and stuff" (Oct 16; Decisions, Oct 16 evening).

### In force

- **A real newspaper with story text.** "there is still no newspapers, even though UI was made for them. I've talked about stories having actual text but there is none." Recorded ruling: "News is a newspaper with story text"; "no record kinds, series names or jurisdiction labels on screen" (Oct 27; Decisions, Oct 27 afternoon; Pool `screens-news-a-newspaper`).
- **Every story on the paper, not paged through.** "when you click continue and back, it's like headlines and then a little bit of story. Nothing is actually on the paper." (Oct 29, playing the build of that week; Decisions, Oct 29 16:30 UTC; Pool `play-news-paper-prints-the-stories`)
- **The whole sheet is the paper.** Sitting note, point 25: "News is still the dark menu panel with a masthead picture pasted in. The whole News sheet must look like a real newspaper... the page, the type, the columns, every story on it. Not a picture and a random photo in the dark panel." Point 26: a story opens with its text, never "the headline repeated as the body," and "'Back to front page' as a button is wrong." Point 24: remove the rows of figures at the top (Nation, the area, Jobs here). (Oct 28 sitting)
- **Many looks, one per outlet.** Recorded: "The owner loved the front page idea and wants many looks": old broadsheet, modern color daily, tabloid, town weekly, each with its own fonts and layout; "The game paints the photo of the actual story" (Oct 14 mocks). Recorded: "Each outlet gets its own newspaper layout" (Oct 15; Register, press).
- **Different titles, like a news app.** "there needs to be a bunch of different titles, kind of like Apple News." (September, overnight playtest; Owner record 01, section F)
- **Stories, not fact lists; every click works; numbers hold up.** "none of this is a story"; "I click on it, nothing happens"; a drop cap split "16" into "1" and "6"; "All 54 votes were cast. No, I can tell that's the generated number of people, not the simulated amount of votes." The bottom of the paper: "a bunch of nonsensical stuff there." (Nov 1, 5:25 and 5:40 p.m.; Decisions, Nov 1 22:25 UTC; Pools `words-news-stories-not-fact-lists`, `play-news-story-click-opens`, `play-news-drop-cap-splits-numbers`, `words-paper-law-and-budget-briefs-read-right`)
- **Side stories for realism.** Short briefs of a line or two, maybe a picture, not clickable: a fourth car stolen when crime is up, a business opening, a spelling bee, Division I recruits (Oct 29, to his words session; Decisions, Oct 29 17:40 UTC). Sized to what the town's records hold, never padded.
- **The paper prints what a body did, not that it sat.** A sitting is a story only when the body took something up; the rest go into one weekly "Meetings this week" brief (CTO ruling under his Nov 1 "there needs to be real ones with some good fluff or else it will get old"; Decisions, Nov 1 18:30 UTC).
- **Plain information for the player.** "And who is Linda? You have to say someone just won the presidency, blah, blah, blah. There needs to be more information, but not in dev speak. This is player focused." (Oct 24 voice note)
- **The press is a world of outlets.** Outlets have leans and wealthy owners; reporters are people; names are generated, never real brands; the world runs without the player (Oct 14, his answers; Decisions, the Oct 14 answers; Register, press). Papers endorse candidates: "Sure, I think that happens in real life, so if it happens in real life, sure." (Oct 16; Decisions, Oct 16 evening)
- **What reaches you.** National outlets carry big stories from anywhere, your state's paper covers your state, your town paper covers your town; news from other towns arrives with natural lags; each person has a news habit (Sept 26 register, quoted in the press digest, `docs/coordination/prior-rulings/press.md`, entry 5). Nobody pins a change on a law unless they learned of it (Oct 14; Decisions).
- **The register's newspaper entry** (September; Register, newspaper and world developments): look like authored newspapers and magazines with mastheads, hierarchy and type; text, dates and numbers stay live; a mixed front page (newsstand) and each outlet's own front page, with the player choosing which opens; a substantial story may run about three paragraphs when the facts support it ("not a filler quota"); "Not every small world update needs a pop-up"; distant news is sparse; stories link the real people, places, offices and bills.
- **TV and radio you overhear.** Recorded: "TV or radio speaks like anyone else: a small card in the conversation text style with a tiny radio/TV icon, the station, and the line." (Oct 14 mocks)
- **The world has a past.** Recorded: "the year before day one has a news archive" (Oct 14; Lane law section 5).
- **Detail on demand.** A story about another place's law or vote builds its detail from that place's result when the player opens it (Nov 5; Decisions).

### Replaced

- "Strip every authored sentence, helper line, explanation and developer word from the [screen]; keep record data" for News (Oct 7 patch order; prior-rulings screens digest, entry 3) is replaced by story text from the English engine (Oct 27).
- The public-record block of record rows is gone (Oct 27).
- The figure rows at the top of News are gone (Oct 28). On Nov 5 he gave those numbers a home: a new Politics tab for how your place is doing, this year beside last (memory `player-menus-nov4.md`).
- "Back to front page" and Continue and Back on story pages are gone; a story opens in place on the paper (Oct 28, Oct 29).
- A lane note that "nothing pages" on the paper is replaced by paging inside the paper (Nov 4, Pool `play-news-paper-turns-pages`), which fits his Oct 29 "things inside" page.

### The Political Process

- A **News** tab with three feeds: **City (n)**, **State (n)** and **Nation (n)** (`newsPage.bin`).
- Each feed is a list of one-line items, such as "has passed in the city council with a vote of (…)," "has been vetoed by Mayor …," "has announced her candidacy as a presidential nominee…," "died this week at the age of …" (`cityLegislation.bin`, `determineElectJS.bin`, `judicialBranch.bin`).
- A small newspaper header carries the place's stats and officials' portraits: "(Click on a portrait for more information.)" (`newsPage.bin`).
- An "Election News" line points away: "For in-depth election coverage, go to the 'Elections' Tab."
- A bill story carries the bill's title, a one-line description and what it changes, "from … to …" (`newsPage.bin`).
- It is a feed, not a paper. He has asked for more than that.

### Today

- **What shows** (Nov 4, `docs/play-first/shots/play-news-paper-turns-pages/news-1440.png`): a cream paper filling the panel; an engraved masthead picture with the word "NEWS" on a gray bar; the date; a lead story ("In memory of Paul Hernandez," one line under it); a side story ("Minimum wage rises to $15.00," two lines); then ten briefs that are bare facts ("Sales tax rate took effect on January 1, 2025."). The bottom half is empty. Page arrows turn the paper when stories don't fit.
- **Against his rulings:** most of the first paper is "X took effect on January 1" facts, the "nonsensical stuff" he named; stories that reached nobody's life read as records; the masthead still says "News" for stories with no outlet; a lead story with one sentence isn't a story.
- **Records that exist:** the stories that reached the player (newest first; News and the toast read the same list); each outlet's printed stories with its layout (broadsheet, modern, tabloid, weekly) and two daily and two weekly engraved mastheads (`art/newspaper-mockups`); the year-before archive; obituaries; laws taking effect; election results, including governor races elsewhere; the swearing-in; briefs from crime, business openings and closings, and school records; the weekly meetings brief; endorsements. Bodies of more than one sentence exist only for some kinds (laws and elections).
- **Open:** local ads (Pool `play-paper-shows-local-ads`), other states' jobs news (`play-other-states-news-on-screen`), which paper ran a story and paper closings (`play-town-paper-on-screen`), side stories with school and sports records (`words-paper-side-stories`), layoffs and home sales (Order, Tier 4).
- **Photos:** only room pictures on government stories. No face may stand for a real official, since it would not match the record (Pool `screens-news-mockups`). People art is paused (memory `people-paused-nov3.md`).

### Questions for him

1. **What opens first:** a mixed front page across outlets (the register's default), your town paper, or the paper you last read?
2. **Which outlets you see:** only the ones that reach you (your habit, what your household reads), or every outlet in town, state and nation?
3. **Laws that took effect:** print only when someone the reader knows is affected, or every law, as short briefs?
4. **TV and radio:** their own pages in News (a broadcast in words), or only overheard in the room?
5. **Photos while people art is paused:** room pictures only, or no photos until the people are ready?
6. **Paging:** keep page arrows inside the paper, or make every day's stories fit one front page?

---

## 4. Travel

### Job

"Where can I go right now?" (the CTO's summary, marked as his on Nov 5). From his Oct 28 sitting: Travel "is how you go places directly, and menus carry hot links that take you there" (Oct 28 sitting, point 19).

### In force

- **A list of places with a painting per place type and who is there now.** "I like number eight" (Oct 27, 5 p.m.; Decisions, Oct 27 5 PM). The Oct 14 Travel mock: "Approved as is" (Oct 14 mocks; `shots/travel.png`).
- **Always lists destinations, even at night.** Recorded: "Travel always lists destinations, including at night" (Oct 27; Decisions, Oct 27 afternoon). Closed places are listed as closed, never hidden (Pool `screens-travel-always-lists-places`).
- **No subheading, no subtitles.** "look, travel, you are at home. Top left. No, remove all those fucking subheadings." "These subtitles need to fucking go." (Oct 27 sitting log and block)
- **No "someone you know" lines.** "'Someone at home studies here' on a place card: remove. This goes for most of the game: things do not pop up because someone the player knows does them." (Oct 28 sitting, point 27)
- **A bigger view of a place.** "'and 5 more' on the filing office card helps nobody. Clicking a place... should open a bigger view: a larger picture, what you do there, who works there." (Oct 28 sitting, point 28)
- **Hot links into Travel.** "'File for it' on a race triggers the travel to the filing office... menus carry hot links that take you there (click President, see the three running, click Run for President, and you are at the filing office)." (Oct 28 sitting, point 19)
- **Say what you do there, not a list of names.** "Okay. This doesn't make any sense. It says what you do here. And then it's just a list of people's names." (Nov 1, 6:05 p.m.; Decisions, Nov 1 22:25 UTC, third batch; Pool `play-travel-place-card-says-what-you-do`)
- **Places keep their hours.** "I went to the office after the president's speech ended. So it should have not fast-forwarded, but it should have started the next day because obviously the office isn't open at 8:30 p.m." (Nov 1; Decisions, Nov 1 23:30 UTC)
- **Places that make sense.** "Why have to travel farm supplied borough of Albion? What are you talking about? Public Works Department? Why?" (Oct 26 sitting). The lane's answer, not his words: every card has a reason (you work or study there, a body you may file with or serve on meets there, something you can do there now), read from records (Pool `play-stop-43-travel-as-place-cards`).
- **Use the paintings, and vary them.** "Why there are hundreds of images generated? I don't understand why they're all not being used." (Oct 27). "I don't just wanna keep seeing the same pictures... real neighborhoods just make things look realistic" (Oct 28 night; Decisions, Oct 29 02:35 UTC).
- **Beyond the town.** In the Oct 26 sitting a sitting congresswoman got only three filing offices, with "no D.C., no Capitol." The reference he pointed to was The Political Process's travel between states (Oct 26 sitting; `docs/coordination/playtest/2026-10-26-1-assessment.md`).
- **The player chooses how often to travel.** Recorded: "The player chooses how often they go home to the district, sit in a cabinet meeting, or fly somewhere to meet people." (Oct 14 morning; Decisions)
- **Going includes the trip.** Choosing to attend includes the journey and brings you there "after showing time and cost," with no extra "Leave now" confirmation (Sept 12; Register, travel clarification).
- **Election day:** the polling place is a place you can go; voting is the player's choice (Oct 26; Decisions, Oct 26).

### Replaced

- The Oct 14 mock's subheading "You are at home, Pecan Street" is replaced by no subheadings (Oct 27).
- Reason lines on each card ("You work here," "Someone at home studies here") are replaced by no subtitles and no someone-you-know lines (Oct 27, Oct 28). The tiles still say who is there now and whether the place is open.
- Framed boxes around the picture and the Go button are replaced by no boxes (Nov 5).

### The Political Process

- Travel lives on the **Campaign Map**: you pick a state and press **Travel to State**. It costs campaign money and hours, and a Scheduler on your staff gives a travel discount (`campMenu.bin`, `campStaff.bin`).
- Events in another state need the trip first: "(To attend events in a different state, go to the Campaign Map tab, select a state, and then click 'Travel to State'.)" (`campEvents.bin`). Joining an endorsed candidate on the road shows "Travel ($15,000)" (`endorsements.bin`).
- The Oct 26 assessment sums it up: "travel is a map with cost and hours."
- It has no in-town places, rooms or people at a place.

### Today

- **What shows** (Nov 4, `docs/lanes/proof/confirmer-lane1-path1/haleyville-2-travel-in-window.jpg`): a search box; six picture tiles, three across and two down, paged "1 of 2"; a people mark on a picture where people are; under each, the place's name, "Open now" with names or "Closed now," and a gold reason line ("You file here," "You work here").
- **A place's own view** (early November, `docs/play-first/shots/play-travel-place-card-says-what-you-do/after-florida-1440x900.png`): title and the office's name, "Filing office," a large boxed picture, a boxed Go button, then "What you do here" with a sentence and "Closed now. Opens Tuesday, January 21, 2025 at 8:00 AM."
- **Against his rulings:** reason lines are still under the names; one tile is named "State party chair; Secretary of State"; two different restaurants share one painting; boxes everywhere; no trip time or cost shown.
- **Records that exist:** the town's organizations the player has a reason to visit (own job, school, the filing office for each office they can run for, bodies they serve on, places with something to do now); who is on shift there now; opening hours; the place type that picks the painting from about 900 paintings by type, time of day and region; campaign venues.
- **Missing:** anything outside the town (the state capital, Washington, a district office, other states), trip time and cost, the polling place on election day (Oct 26 stop), a bigger view for every place, not only the filing office.

### Questions for him

1. **Beyond your town:** the state capital, Washington and other states as more tiles, or a map like The Political Process's with time and cost?
2. **Trip time and cost:** show on each tile ("15 minutes," "a 3-hour drive, $40")?
3. **What gets a place on the list,** now that "someone you know works here" is off the tile: still a reason to list the place, or only your own reasons?
4. **Order:** home first, then where you need to be (your filing office, your polling place on election day, your next meeting), then the rest?
5. **The bigger view:** a page inside Travel, or should the tile grow in place?

---

## 5. Guide

### Job

It explains the words on the other screens: the inline civics helper and its encyclopedia. "I want it to read as a part of the game" (September).

### In force

- **The Guide is its own entry, not a tab in Politics; terms explain themselves on hover.** "Guide does not belong as a tab in Politics. Terms get the carbon-copy underline and show the guide text on hover; the Guide itself is a separate entry in the menu." (Oct 28 sitting, point 23). On Nov 5 the rail he saw put Guide last: Journal, Calendar, Money, Politics, News, People, Travel, Guide (menu-look skill).
- **Hovering an office says what it does.** "'What is a trustee?' Hovering Trustee should explain what the office does" (Oct 28 sitting, point 30).
- **Underlines, a hover meaning, and "learned."** Promised "a thousand times" (Sept 29, about 1:40 a.m.; memory `glossary-underlines-radial-portrait.md`). The shipped rule, recorded: "Clicking 'Got it' marks the term learned for this player. The underline then no longer appears anywhere, but the term stays in the glossary," and "the Guide can take the mark back" (Sept 29; prior-rulings screens digest, entries 6 and 11).
- **Part of the game, no outside sources, Shift-click to learn.** "I'd like for the inline thing to now be made... go ahead and start the kind of encyclopedia-ish. Not quite. I don't want it to lead to, like, actual sources... I want it to read as a part of the game... And I think the goal is to Shift-click to mark something as learned." (September, overnight [95]; Owner record 07, section U5)
- **The register's Guide entry:** one entry per term used everywhere; click or focus opens a short explanation in place; "More" opens the searchable Guide with related terms and the local context; no outside websites; Shift-click toggles learned, with an equally visible Mark learned button and a reset; learned state is the human player's, not the character's; the Guide is "a comprehension layer over the same game, not a separate encyclopedia engine" (September; Register, inline civics help and Guide).
- **The first-time player needs a way in.** "The politics screen needs a guide." (Oct 24, his read of the playtest pictures; Decisions, Oct 24). The Oct 28 ruling moved that help from a Politics tab to underlined terms and the Guide.

### Replaced

- "Options (settings, guide, quit to title) moves off the rail to the Esc key" (Oct 20) is replaced for the Guide by "the Guide itself is a separate entry in the menu" (Oct 28).
- A Guide control inside Politics (Oct 24 item, built as `play-first-18-politics-guide`) is replaced by the same Oct 28 point.

### The Political Process

- A long help section reached from the office menu, with topics: Getting Started, Introduction, Icons, Concepts, Other Concepts, How Metrics Work, Campaign Basics, Legislative Process, Money in Politics, Judicial Philosophy, Confirmation Process, Blue Slip Policy, Cloture Votes and more (`officeMenu.bin`).
- Each topic is a paragraph mixing civics with how to play: "There are five icons at the very top of the screen. From left to right they are: Name Recognition, Political Points, Approval Rating, Messages, and Schedule Items."
- Bills and laws carry their own one-line descriptions where they appear (`newsPage.bin`).

### Today

- **What shows** (Oct 30, `docs/play-first/shots/play-menus-guide-encyclopedia/guide.png`): a search box; term cards in two columns, each a boxed title and a one-line meaning, 16 to a page ("1 of 3"); the chosen term's article on the right in a box. About 38 civic terms. An office title on a Government member card is an underlined term with a hover meaning.
- **Against his rulings:** every card is a box; the panel behind the article is half empty.
- **Records that exist:** the civic term list with each meaning and article; the learned marks; the place's own offices (each office's duties are in the filing records the clerk reads).
- **Missing:** a Guide entry for each local office ("What is a trustee?"); how-to-play topics (the tutorial now lives in scenes, Nov 1); a reset for learned marks; open item: the Guide sheet once ran 611 pixels taller than its window (Pool `play-guide-sheet-scrolls`, open, no text).

### Questions for him

1. **Civics only, or how to play too,** like The Political Process's help topics?
2. **Learned:** a "Got it" button (Sept 29), Shift-click (September), or both? Where does reset go: the Guide or the Esc menu?
3. **All terms, or only terms you've met in play?**
4. **Local versions:** should "Trustee" in your town say what a trustee does here, from the place's records?

---

## 6. The Esc menu (Options)

### Job

Recorded: "Options (settings, guide, quit to title) moves off the rail to the Esc key and the title screen." (Oct 20). The Guide has since moved to the rail (Oct 28).

### In force

- **Options lives on Esc and the title screen** (Oct 20; Decisions, Oct 20, the menu structure).
- **Color-blind mode is one global setting there.** "just have colorblind be an option in the settings like it usually is in the game and be sure that that is constantly updated with you know new menu or whatever ever put in. It needs to be a global tick." (Nov 5, about 2:55 p.m.; Menu rulings today, item 8). Off by default; every menu, including future ones, reads it from one place.
- **What Esc does.** Recorded: "Escape dismisses the top applicable transient context and restores focus; when none is open, it opens the session menu." (Sept 20; Register, keyboard, title and quit). During the opening, Esc opens only options and quit (Oct 4; `docs/packages/M6-screens.md`).
- **No Continue or Back** on it (Oct 28 and 29). It closes with its close mark or Esc.
- **No dozen interrupt switches.** Recorded: "Options must not need a dozen interrupt toggles; the director decides what interrupts." (Oct 14 night; Decisions). But, also recorded: "The player chooses what stops them; the important few stop by default" (Oct 14 morning), and in office, "your own bills, any vote where yours could decide it, your desk, and scenes, by default; you can customize it." (Oct 29, 21:15 UTC; Decisions)
- **Real settings.** Recorded: "Options needs real settings (date format, profanity softening, reduced motion)." (Sept 27, UI brief; prior-rulings screens digest, entry 15). The register also lets the player choose which kinds of action need a confirmation (September; Register, configurable confirmation).
- **The Oct 14 mock "Approved as is":** version, Music and Sound sliders, a Full screen checkbox, Continue and Quit to title (Oct 14 mocks; `shots/options.png`). See Replaced for what no longer holds.
- **Dev mode is for developers only.** Never a player control (Lane law section 8).

### Replaced

- "Save, Options, Guide and Return to title go in a corner menu" (Sept 27, Team E order) is replaced by Options on Esc (Oct 20) and the Guide on the rail (Oct 28).
- The mock's Continue button is replaced by no Continue or Back on any menu (Oct 28, Oct 29).
- The Kit 13 slider with a brass handle (Oct 4) is replaced by "I don't want those sliders that's in the UI mockup, though. Those are too video game-like. I like data being shown." (Nov 5). The CTO applied that to every marker-on-a-bar control and readout on menus (memory `menus-show-data-no-sliders-nov5.md`). Whether volume levels in Options count is a question below.

### The Political Process

- A **Menu** tab: Return to Game, Save Game, Quick Save, Load Game, Options, Advanced Options, Exit to Main Menu, Exit to Desktop, with a warning before leaving: "Are you sure you want to exit to the main menu? Any unsaved data will be lost." (`uiMenus.bin`)
- **Options:** Music Volume, Sound Volume, Alert Sound, Button Clicking Sound, Tab Click Sound, Dark Mode (Style), autosave frequency and points, **Election Night Prompt Options** for each kind of election (Always, Never or Prompt: "Do you want it to always create an election night menu, without being prompted?..."), and Favorite Politician Colors so your favorites stand out in results (`uiMenus.bin`).
- Office automation lives in the office menu: Automate Office Events, Attend All Fundraisers, Attend All Rallies (`officeMenu.bin`).

### Today

- **What shows** (the screen code, `src/bench/play.mjs`, Options; labels in `src/bench/data/controls.json`): Version, a Full screen checkbox, Quit to title, and Dev mode for a developer's session only. Esc opens it from the room. Nothing else.
- **Not there:** color-blind mode, music or sound (the game plays no audio yet), reduced motion, text size, save or load, any confirmation before Quit to title, and any setting for what stops you.

### Questions for him

1. **Which settings, besides color-blind?** Candidates on record: full screen (there), reduced motion, date format, profanity softening (Sept 27), what stops you (Oct 14, Oct 29), and which actions ask first (register). Add text size?
2. **Volume and other levels:** with "no sliders," should levels be steps or numbers instead? There is no audio yet, so no sound settings until there is.
3. **Save and load in the Esc menu,** or autosave only and Continue on the title?
4. **Ask before Quit to title?**
5. **Election night:** a setting like The Political Process's (always open, never, or ask) for each kind of race?
6. **Version line:** keep it on Options?

---

## 7. Pop-ups: the news toast, election night, tutorials

### Job

Recorded: "Alerts: a toast for news that just reached you, a dot on a rail icon for something unread, a scene when something needs you; no pop-up lists." (Oct 20)

### In force: the toast and alerts

- **The toast is the pop-up when a story reaches you,** top right (Oct 14 mocks).
- **It fades, or goes with one click.** "The news, I guarantee you on the top right, that thing doesn't fade and there's no way to remove it." (Oct 24 voice note). "As I keep saying every single playthrough, on the top right, the news, there's no way to get rid of it and it doesn't leave for any reason. Same thing with a journal on the bottom right." (Oct 26 sitting). Recorded: "The news box fades or can be dismissed." (Oct 24; Lane law section 10). By the Oct 27 sitting the toasts faded on their own (sitting notes, under what was good).
- **Quiet weeks pop nothing.** "Nothing happened this week. It shouldn't pop up anything. There doesn't need to be any indicator other than the time and date on the bottom." (Oct 27, 5 p.m.; Decisions)
- **Not every update deserves one.** Recorded: "Not every small world update needs a pop-up." (September; Register). "Why am I getting a notification that a law took effect?" (Oct 27 sitting log). "things do not pop up because someone the player knows does them" (Oct 28 sitting, point 27). The "day in review" popup "should not pop up unprompted" (Sept 29 defect list; `cto-notes/owner-words-opus-oct1-3.md`).
- **A stop says what needs you.** Every "something needs you" stop names who or what needs the player and how to answer (Oct 24 playtest; Order line 42; Pool `play-stop-26-empty-something-needs-you`).
- **Say who it is.** "And who is Linda? You have to say someone just won the presidency... There needs to be more information, but not in dev speak." (Oct 24 voice note)

### In force: election night

- **Its own pop-up.** "the selection screen's god-awful. What do you mean turnout? Exit poll? This election night needs a lot of work. It's terrible. God-awful. This needs to be its own pop-up menu kind of thing" (Oct 26 sitting; Decisions, Oct 26 evening).
- **A played scene with your people, precinct by precinct.** Recorded: "election night is a played scene with your real people, precinct by precinct, crowd behind sized by turnout" (Oct 6; prior-rulings elections digest, R2).
- **Election day is about five minutes of scenes.** "see something like election day should take like at least 5 minutes to play out... a bunch of scenes post-election, whether that be conceding or, you know, celebrating." Going to vote: "this should be a scene, you know, maybe with a narrator." (Oct 26 sitting). Voting stays the player's choice (Oct 26).
- **Your race first, every candidate's votes, whether you won;** the next morning the Journal, News and Government say whether you won (Oct 24 playtest; Order lines 3 and 4). Governor races around the country show too (Order line 63).
- **Mirrors and branches.** "a victory speech obviously means there needs to be a concession speech... they had a contentious call with the other candidate" (Oct 27; Decisions, Oct 27 overnight).
- **No jargon:** "What do you mean turnout? Exit poll?" (Oct 26). A sitting congresswoman's first event in ten months being someone else's local election night was flagged (Oct 26 sitting).

### In force: tutorials

- **Asked by a person in a scene, yes or no, the first time.** "it should be the first time in a game that the player files for an office. It should start this quote unquote tutorial... do you know how to run a campaign? So that's essentially saying, do you want the tutorial, yes or no? And then it could be like, your goal is to get X amount of signatures to get on the ballot... Now, you'll need money... You can get TV ads. Etc. You may want to do media... That's how the tutorials should work in the game." (Nov 1, 6:30 p.m.; Decisions, Nov 1 23:30 UTC; Pool `play-first-filing-campaign-tutorial`). Figures come from the place's records. Never a pop-up.
- **Nobody teaches you today.** "You don't even know how to knock on doors. Like, nobody's teaching you this shit. There's zero transition between anything." (Oct 27 sitting log)
- **Learning a job.** "it's a mix of short scenes in a real orientation. I've said this before." (Oct 29, 21:15 UTC; Decisions)

### Replaced

- "election night has a few skippable updates using aggregate reports" (Sept 22) is replaced by the precinct-by-precinct played scene (Oct 6). The Oct 26 "its own pop-up menu kind of thing" adds to it.
- The standing news box (to Oct 24) is replaced by a toast that fades or closes.

### The Political Process

- **Election night:** it asks first, "Do you want to watch the election night coverage?" (and for presidents, "Do you want to watch the presidential election?"). You set how long the night runs in minutes, with Fast and Custom speeds. Results show votes, electoral votes, seats gained, and exit polls by state, with your favorite politicians highlighted (`electionResults.bin`, `exitPolls.bin`, `uiMenus.bin`).
- **Alerts:** counters on the top bar (Messages, Schedule Items), an alert sound, and messages sorted by kind (`index.html`, `uiMenus.bin`, `officeMenu.bin`).
- **Teaching:** help topics and mandatory events, not tutorials asked in a scene (`officeMenu.bin`, `nextTurn.bin`).

### Today

- **Toasts** (Nov 4, `docs/lanes/proof/confirmer-lane4/first-evening-storrs.jpg`): a News toast top right ("Estate tax rate took effect on January 1, 2025.") and a Journal toast bottom right ("Andrew Cooper was a friend of mine. He later became a selectman."). Each has a close mark and fades after about 8 seconds. Clicking the news toast opens the story on the paper.
- **Election night** (Nov 4, `docs/lanes/proof/confirmer-lane4/election-night/storrs-returns-p0-1440.jpg`): a tall panel on the right over an election-night hall with nobody in it. The office's name, "The polls closed. Everyone is watching the numbers for Selectman.", each candidate's name in small capitals with "0 votes," and Next returns. The pages go: the polls close; "The rest of the town is in"; the race is called with the totals; "Elsewhere tonight, 2 states chose a governor"; Close. Most of the panel is empty, and none of the player's people are there.
- **Election day:** choices to go canvassing or not, and to go vote or stay home; the ballot is marked at the polling place.
- **Tutorials:** the first filing asks in the clerk's scene (Pool `play-first-filing-campaign-tutorial`, done).
- **Records for election night:** the count's own returns place by place, smallest first; candidates' totals; who in the room would be there (household, close family and friends, active campaign staff); the room's TV, which shows a decided count for three days. Not built: precincts (the count knows places, not precincts) and the crowd sized by turnout.

### Questions for him

1. **Which stories earn a toast:** only news that touches you, your people or your race, or every story that reaches you?
2. **The Journal toast** (bottom right) isn't in his Oct 20 list. Keep it, or let the rail's dot carry it?
3. **Election night's shape:** a pop-up panel over the room, as now, or the scene in the talk box with the returns on the room's TV and your people reacting?
4. **Should it ask first,** like The Political Process ("Do you want to watch the returns?"), and let you skip to the result?
5. **Races you're not in:** should election night open by itself only for your own race, or for others too?
6. **More tutorials:** which other firsts get one (first doors, first council meeting, first bill, first debate, first day in office), always asked by a person in a scene?

---

## 8. The talk box

### Job

The conversation panel where scenes play: who is talking, what is said, and your replies. Recorded, Sept 27: "Chat box needs weight: speakers' small portraits inside it, and the reply buttons including Lie. It is the one element that should feel solid." (memory `ui-and-art-decisions-sept27.md`). Its tone: "Serious and political. I keep trying to tell you that." (Oct 1, about 11:55 p.m.; memory `ui-kit-picks-oct1.md`)

### In force

- **Narration alone shows one Continue, bottom left, nothing else.** "WHEN IT IS JUST THE NARRATOR REMOVE THE LEAVE/SAY NOTHING! I DON'T LIKE HOW TALK IS DISPLAYED. CONTINUE ON THE BOTTOM LEFT" (Oct 27, 6:20 p.m.; Decisions, Oct 27 5:40 to 6:15 PM). Earlier that day: "if the narrator is going to have something happen, like, have it happen. Like, it should just be continue or something like that. Not say nothing or leave." (Oct 27 sitting log)
- **No Say nothing when nothing is left to say.** "when there's nothing left to say, don't allow there to be a say nothing. Like that doesn't even make fucking sense." (Oct 27 sitting log)
- **Four replies, with Say nothing smaller beside them.** Recorded: "A conversation always offers four replies ranked by the engine, with 'say nothing' as a smaller control beside them, never one of the four." (Oct 14 afternoon; Decisions). Leave shows only where leaving is a real choice (Oct 27).
- **The narrator comes first, then Continue, then the person talks.** Recorded: "The narrator shows first, Continue, then the person talks (this replaces the Oct 27 'at once')." (Oct 28, the approved words and director plan; Decisions, Oct 28 18:15 UTC). Sitting point 36: "the narrator and Megan Peck popped up together." The narrator also speaks between lines ("the crowd grows louder"), as Baldur's Gate does (Oct 19; Decisions, batch 19).
- **Earlier lines set apart.** "I think that's supposed to be the chat history. It needs to be delineated, different color, separated, etc." and "The chat history thing that popped up needs to be delineated either with a different color or with a line or something" (Oct 26 sitting). Point 39: "there is not enough delineation between what the player said, what was said before, and what is being said now." (Oct 28 sitting)
- **Many choices open a real menu.** "If there's this many options, it should open an actual menu. It shouldn't just be in the chat" (Oct 26 sitting, on the filing seats).
- **Lie is the scales, top right.** The rule: replies start truthful; a Lie button beside them swaps in the false replies in place of the true answers they contradict, each marked as a lie; it is unavailable when nothing you could say is false. His picks on Oct 2: it is a symbol, the scales of justice in brass line art with no box ("maybe it should be a symbol instead of a button"); level at rest, it tips and glows red when on, and stays level and dim when nothing false can be said. No "Lie" text anywhere, not even on hover; the lying answers glow red. Locked at 34 pixels in the upper right of the box (Oct 2, 1:45 to 2:00 a.m.; memory `dialogue-box-and-lie-button.md`). The Oct 14 talk mock, recorded: "Uses the existing Lie scales button... top right of the talk box. Do not redesign it." The register adds: a visible lie marker on a deceptive reply before it is committed (September; Register, deliberate deception).
- **Portraits top left, real people.** Recorded: he wants the people's actual portraits in the top left of the conversation, after calling the round-two designs "absolutely terrible ... a step back" (Sept 27, about 11:55 a.m.; memory `dialogue-box-and-lie-button.md`). No initials in circles anywhere; headshots or body shots (Oct 28 sitting, point 12). Every portrait comes from a standing figure (Oct 29, 18:45 UTC; Decisions). Today's look: portraits sit in warm light, never "a circle around there and then it's still the same blank background" (Nov 5; menu-look skill).
- **A lower third.** Recorded: "Conversation box: smaller and at the bottom, like a lower third, with the scales Lie control in its upper right" (Oct 9; `docs/packages/M6-screens.md`).
- **Replies are plain numbers, not boxes.** He chose plain numbers ("1. I'll read the bill first.", no marks or shapes, the chosen line brighter) and said no boxed replies or buttons, "too video gamey" (Oct 1 to 2; memory `ui-kit-picks-oct1.md`). Recorded: "Conversation box: serious and political; portraits top-left; numbered replies, no chevrons." (Oct 2 locked decisions; prior-rulings screens digest, entry 5)
- **Click a person to talk; no Talk button; no talk, no click.** "the talk button you click on somebody. How hard is that to understand?" and "Remove the goddamn talk button" (Oct 27). "If there's no dialogue, you shouldn't be able to click on the person." (Nov 1, 5:25 p.m.; Decisions)
- **Under the name, plain words or nothing.** On "Warehouse worker · Quinn Supply Company · partner": "that needs work. I don't like the way that's displayed." (Oct 27 sitting log). See the conflict under Replaced.
- **No developer text.** No "(counter: director)" (Oct 28 sitting, point 33); no Mark gap on a player's screen (Lane law section 8).
- **Talk is speech, and you only say what you chose.** "this dialogue is absolutely god-awful. It's just listing things... That's not how normal people talk." After choosing File: "I never said that." (Nov 1, 6:30 p.m.; Decisions, Nov 1 23:30 UTC)
- **A scene's name sits above Day and Week, and the scene's Continue is "Skip scene" or "Simulate scene"** (Oct 26, his idea; Decisions, Oct 26 evening). The opening address now plays in the same talk box with Skip scene (Pool `play-opening-plays-in-the-talk-box`).
- **Extra replies from your own life.** Some replies are drawn from the player's life ("[Out of work]"), as in Baldur's Gate 3 (Oct 19; Decisions).

### Replaced

- Lie drawn as a fourth reply (Sept 27) is replaced by Lie as a button, then by the scales symbol (Oct 2).
- "The label is always just 'LIE'" and the small-caps "• LIE" line (Oct 2, about 1:20 a.m.) are replaced by "NO 'LIE' TEXT ANYWHERE" (Oct 2, about 1:50 a.m.).
- Lie under the replies (Oct 2, 12:05 a.m.) is replaced by the scales in the upper right (Oct 2, about 1:55 a.m.).
- "Say nothing and Leave are small plain buttons under them" (Oct 14 mock) is replaced by: Say nothing only when silence is an answer, Leave only when leaving is a real choice, and narration alone shows only Continue, bottom left (Oct 27).
- The narrator and the person "at once" (Oct 27) is replaced by narrator first, Continue, then the person (Oct 28).
- **Open conflict under the name:** at 3:30 p.m. on Oct 27 the ruling was "The talk box subtitle and the traits block speak plainly... sentences from the English engine" (built as "Your partner. Works at Quinn Supply."). At 6:20 p.m. the record reads "The talk box's look follows the mock: speaker, line, replies as a menu, no subtitle string under the name." Today's box shows nothing under the name. Question 1 below.
- A ring around the portrait (built in October) is replaced by warm light (Nov 5).

### The Political Process

- No conversation box. People speak in one-way quotes at campaign events ("Event Conversations"), and a contact shows Trust, Politics, Priority and Contributions as labels (`contactsJS.bin`).
- His references for talk are elsewhere: Wildermyth for scenes ("where you're clicking through dialogue," Oct 26), Baldur's Gate 3 for the narrator and replies from your life (Oct 19), and Suzerain for speeches (Oct 14).

### Today

- **A talk** (Nov 4, `docs/lanes/proof/confirmer-lane3-path4/murray-008-talk-94.jpg`): a lower third at the bottom center; the speaker's bust in a gold ring, top left; the name in carved capitals; nothing under the name; the line in the narrative type; four numbered replies; the scales, dim and level, top right.
- **Earlier lines** (Nov 4, `docs/lanes/proof/confirmer-lane3-path1/haleyville-clerk-02.jpg`): past lines sit above in small gray with each speaker's name in small capitals, a thin gold line under them, then the line said now. One numbered reply and Leave at the bottom left.
- **Narration or a speech** (early November, `docs/play-first/shots/play-opening-plays-in-the-talk-box/opening-address-1440x900.png`): the speaker, the paragraph, then Continue and Skip scene at the bottom left.
- **Against his rulings:** the portrait sits in a ring; history is set off by a thin gold line, which the Nov 5 look bars between sections; the history is a quieter gray more than "a different color."
- **What the box can show:** what the player said before, what the other person said before, and what is said now; a lying line in red; Say nothing and Leave, each only when the scene allows; Continue alone when nothing can be answered; Skip scene; the speaker's name and portrait; a grading control in dev mode only.

### Questions for him

1. **Under the name:** nothing (today), or one plain sentence of who they are to you ("Your partner. Works at Quinn Supply.")? His two Oct 27 rulings point different ways.
2. **Earlier lines:** what color, and how many stay above the line said now (today three)? A gap instead of a gold line, given no rules between sections?
3. **Portraits:** only the speaker's, or yours too? Head and shoulders from the standing figure in warm light?
4. **More than four choices** (picking a race at the clerk's counter): what should "an actual menu" look like beside the box?
5. **Say nothing and Leave:** both small at the bottom left beside the replies, or Say nothing beside the replies and Leave apart?
6. **Why someone acts:** his Oct 19 note asked that the context panel be plain English. Should players ever see that panel, or is it dev mode only?

---

## The biggest open questions, across screens

1. **Money's headline:** show how long your savings last beside your cash, to make "time, freedom and pressure" visible as data?
2. **News's front page:** a mixed front page across outlets, or one paper first, and which outlets reach you?
3. **Travel beyond your town:** more tiles, or a map with time and cost like The Political Process?
4. **Election night:** a pop-up panel over the room, or the scene in the talk box with the room's TV and your people?
5. **The talk box name line:** nothing, or one plain sentence of who they are to you?
6. **Esc menu settings beyond color-blind,** and whether level controls may be sliders at all.
7. **Calendar:** whether laws that change your own life ever appear, and what counts as "your own" first.
