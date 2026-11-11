# The Political Process: budget, money, government, parties, campaign and elections screens

Gathered Nov 5, 2026, about 4:15 p.m. Eastern. Read only. Nothing in the TPP install folder was changed, and the game wasn't launched. This file adds detail to `politics.md` (same folder) and doesn't repeat its short TPP lists. Where it corrects an earlier note, it says so.

**Why now.** Today Lamontae said TPP's budget "looks like a real budget" and could be "the endpoint for what the code needs to tie into for player facing stuff." He also floated starting the way TPP does, with money "transferable into your campaign." He wants the Government screen to show the president's picture, the vice president, what you know about them and their priorities, and pictures of judges. He also wants parties you can click to see their structure and who's in them.

**Who made it.** Verlumino Studios LLC (developer and publisher). It came out in Early Access on Nov 22, 2019 and is still in Early Access. It isn't by Grimm Bros or Ryan Sumo; that's a different game. (Steam app 1184770, store page and SteamDB.)

**Source tags used below**

- **[files]**: on-screen text and ids recovered with `strings` from `binFiles/*.bin` in the TPP install folder (the path is in memory `reference-games-on-mac.md`). The file names are given, for example `budgetCalculations.bin`.
- **[help]**: TPP's own in-game "Concepts" help pages, stored in `officeMenu.bin`. They're paraphrased here, not copied.
- **[shot]**: an official Steam screenshot. The ones used are saved in `cto-notes/menus/refs/tpp/` (list at the end).
- **[store]**: Steam store "About this game" text.
- **[blog]**: awkwardmixture.blogspot.com, "The Political Process: From Senator to President?" (Dec 2023).
- **[inferred]**: my reading, not seen directly.

Screenshots are a few years old. The newest files have tabs the screenshots don't show yet: Judicial Branch and Relationships under Politicians.

---

## 1. Budgets

### 1a. The executive's budget screen (Mayor Budget, Governor Budget, Presidential Budget)

All three screens use the same three-column layout. **[shot ss14, ss15; files `budgetCalculations.bin`, `stateBudgetCalc.bin`, `cityBudgetCalc.bin`]**

**Left column: the department and its head.**

- At the top is the department head's title ("State Treasurer," "State Superintendent," "Secretary of the Treasury"), a portrait and the person's name. Below that is a **View Department Report** button. [shot, files]
- Below that is a list of department buttons. Clicking one jumps the middle column to that department's lines and swaps the portrait to that department's head. [shot, files]
  - **Presidential:** Taxes and Treasury, Health and Human Services, Agriculture, Housing and Urban Development, Education, Defense, Veterans Affairs, Transportation, Justice (Attorney General), Labor, Homeland Security, Energy, State Department, Interior, Commerce, Environmental Protection, Social Security, NASA, FCC, Other Expenditures (Chief of Staff). [files]
  - **Governor:** Taxes and Treasury (State Treasurer), Education (State Superintendent), Health and Human Services, Attorney General, Agriculture, Environmental Quality, Transportation, Corrections, State Police, Natural Resources, Housing, Financial Services, Other Expenses (Chief of Staff). [shot, files]
  - **Mayor:** Finance (Finance Director), Building and Housing, Social Services, Transportation, Corrections, Police Department (Police Chief), Fire Department (Fire Chief), Public Safety, City Attorney, Public Works, Human Resources, Parks and Recreation. The files also list ids for planning, health, utilities, watershed and communications heads. [files]

**Middle column: the budget, in three sections, scrolling.** The title is "Presidential Budget," "Governor Budget" or "Mayor Budget." [shot, files]

- **Tax Policy.** One card per tax. Each card has the tax's name, a one-paragraph plain description and a **True/False** switch for whether the tax exists. Then come its settings, each with a label and the value:
  - **Income tax:** each bracket labeled with its threshold, like "1st Tax Bracket (Income < $10,000)," up to six brackets federally, three for a city or state. Then Standard Deduction and Personal Exemption.
  - **Other taxes:** Flat Tax, Earned-Income Tax Credit (child and childless rates), Child Tax Credit, Corporate, Gasoline, Social Security payroll (rate, average benefit, eligibility age), Medicare payroll (same three), Universal Health Care, Unemployment payroll, Sales, Tobacco, Alcohol, Marijuana, Carbon Emissions, Hand Gun, and Renewable Energy Tax Credit.
  - **City and state extras:** property tax, vehicle registration tax, and a city "wheel tax." [files, shot ss14]
- **Mandatory Expenditures.** These are programs whose cost is set by law. Each card shows the program's rules, not a dollar amount you pick: Eligibility Rate, Average Benefits, "Percent of Rent that Government Pays," "Percent of Funding that Federal Government Provides." The resulting cost is computed and shown.
  - **Federal programs:** Medicaid and Medicaid Expansion, WIC, SNAP, TANF, Public Housing, Rural Rent Assistance, school lunch and breakfast (universal or need-based), Universal Preschool, low-income preschool, Title I-style grants, Free Community College, Higher Education Grants, veterans' disability, health care and education grants, Foster Care, Federal Disability Benefits.
  - **Interest Payments on the National Debt** has a line stating how much the government owes. [files]
  - **City and state mandatory cards** add the money's sources: "Total Expenditure / Federal Contribution / State Contribution / City Share" (or "State Share"). [files]
- **Discretionary Expenditures.** Every agency-level line item gets a card with the following. [files, shot ss15]
  - Its real name, for example: Interstate Highway Construction, USAID, NOAA, Bureau of the Census, National Park Service, Federal Prison System, NASA, FCC, Judicial Branch, Legislative Branch, Smithsonian, Corps of Engineers. City examples: Mayor's Office, City Council, County Assessor, Public Libraries, Animal Control.
  - A one-line description of what it pays for.
  - **"Budget Request: $X"**, what the department asked for.
  - **"Last Year's Budget: $Y"**.
  - A True/False switch to fund the line at all, and the amount chosen.
  - City lines that get outside money also show "Total Budget Request / Federal Contribution / State Contribution / Finalized Budget Request / Last Year's Budget." [files]
  - Defense is broken down by branch (Army, Navy, Air Force, Marines). Within each branch the lines are personnel, reserve, guard, procurement, operations, R&D and construction, with "Total Army Expenditure" and similar subtotals and a "Total Defense Expenditure." [files]
- **Buttons under the middle column:**
  - **Balance Budget** scales every discretionary line by the same share until the deficit is zero.
  - **Reset Treasury** (city and state only) zeroes a hopeless treasury.
  - **Previous Budget** reuses last year's choices _as a percent of each request_, not as last year's dollars. If you gave 80% of the request last year, you give 80% of this year's request.
  - **Save Budget** and **Load Budget**.
  - **Submit Budget**, with an "Are you sure" step. [files, help]

**Right column: live totals, always visible.** The panel id is `presBudgetInfoDiv`, `govBudgetInfoDiv` or `budgetTaxInfoDiv`. [shot ss14, ss15; files]

- **Tax Revenue:** Total Tax Revenue, General Tax Revenue, Dedicated Tax Revenue. The city version adds "City Revenue / State Funds / Total Funds."
- **Expenditure:** Total Expenditure. Then **General Expenditure**, with **Mandatory $** and **Discretionary $** under it. Then Dedicated Expenditure.
- **Budget Status:** Treasury (or City Treasury), Budget Deficit/Surplus (green when positive, red when negative), Total National Debt (federal only).
- **Trust Funds:**
  - Federal: Social Security, Medicare and Highway.
  - State: Unemployment, State Roads and Health Care.
  - City: Roadway.
- Dollar figures are full precision, for example "$27,704,095,820." [shot]

**What makes it "look like a real budget"** (my synthesis, from the items above):

1. Real agency and program names, each with a short "what it pays for."
2. Revenue split into **general** and **dedicated**, and spending split into **mandatory**, **discretionary** and **dedicated**, the way real budgets are.
3. Every discretionary line shows **what the department asked for** beside **last year's amount**.
4. Mandatory programs are set through their **rules** (eligibility, benefit level), and the cost follows from them.
5. A **running balance** that never leaves the screen: revenue, spending, deficit, debt and trust funds.
6. **Department heads with faces**, each with an annual report.
7. Lower governments show **who pays**: federal share, state share, local share.

### 1b. Department Report ("View Department Report")

- **Title:** "[Department] Annual Report, [year]," with the head's title. [files `metricsPage.bin`]
- **Summary:** what the department does. [files]
- **This year's key numbers and the change since last year.** Examples:
  - Police officers and support staff, the change in officers, and the change in crime.
  - Road quality and congestion percentages, with what it would cost to keep them as they are.
  - Homeless count and the shelter share. [files]
- **An "Analysis" sentence tying cause to effect.** For example, crime fell, and that's likely due in part to a larger police force. [files]
- **Program results.** Participants, diplomas, "Likely Savings to Jail Expenditure." [files]
- **Federal Treasury report:** the current national debt, this year's deficit or surplus, and interest per citizen. [files]
- **Funding and effectiveness:** a department's effectiveness drops when it's funded below its request. This shows as "Department Effectiveness" under Metrics. [files]

### 1c. How a budget moves (from TPP's help) [help]

- **School:** the top-ranked board member drafts it. Others amend, and the amendments are voted on. Then it's enacted.
- **City:** departments send requests to the mayor. The mayor proposes amounts per department and per program, plus tax changes. Spending can't exceed revenue. The council's top member writes a new version, which can keep the mayor's or ignore it. Members amend. It's enacted with no final vote.
- **State:** the governor proposes, and the budget must balance. The House and Senate budget committee chairs each write a version. A conference averages them, and the result is enacted.
- **Federal:** the president proposes. Each chamber's budget committee writes a **budget resolution** (totals and caps per category). It goes through amendments, a vote and a conference. Then the Appropriations subcommittees write one **appropriation bill per category** under those caps, amend them and vote. A conference follows, and the president signs automatically.
- **No veto of budget bills, no shutdown.** The store page confirms this. [store]
- **Legislature screens** [files]:
  - Each line shows "Budget Request / Mayor Budget (or Governor Budget) / Current Budget / Amendment," with "Budget Funds Remaining."
  - "Budget Amendment Vote" shows Subject, Sponsor, Description, Legislative Proposal and Support/Oppose.
  - A passed amendment is listed as "Original $ / Amendment $ / Difference $."
  - The federal committee vote shows "Authorized Expenditure."
- **The blog's experience:** the president is asked for a budget every year, and Congress is "incredibly deferential." [blog]

### 1d. Metrics > Budget

Levels: City, State, Nation. Topic tabs: Overview, Population, Education, Poverty, Economy, Taxes, Health, Crime, Infrastructure, **Budget**, Military, Immigration, Laws. [shot ss02]

- **Expenditure by Category:** a two-column table with a Total row. The Nation rows are Health Care, Social Security, Military, Interest on Debt, Other, Human Services, Education, Security & Safety. Beside it is a line chart across years, with **Timeline** and **Pie Chart** buttons. [shot ss02]
- **Treasury and Trust Funds:** a table with columns **Fund | Revenue | Expenditure | Surplus / Deficit | Fund Value**. The rows are Treasury Fund, Road Trust Fund, Social Security Fund and Medicare Fund. Deficits show in red and surpluses in green. Fund names are links. [shot ss02]
- **Also on the page** [files]:
  - "Federal Budget": total revenue against total spending, with a note that dedicated revenue doesn't count toward the deficit.
  - "General Budget": General Revenue, General Expenditure, Deficit/Surplus.
  - Revenue by Source.
  - "Expenditure by Type": Mandatory and Discretionary.
  - **Budget Expenses by Department**: each program with its Cost and Status, and a Total per department.
- **City and school versions:** City Budget, Education Revenue by Source, Education Treasury Fund. [files]
- **Metrics > Taxes:**
  - "Total Tax Revenue" with a year strip.
  - "Tax Revenue by Source" as a pie chart and a table: **Source | Revenue | %**, with Sales, Income, Corporate, Unemployment, Gasoline, Vehicle, Tobacco, Alcohol, Carbon and a Total.
  - Each tax has its own timeline. [shot ss41]
- **Metrics > Overview** has National Debt, Debt per Person and Budget Approval. [files]

---

## 2. Personal money and campaign money

**Correction to `calendar-money-news-travel-talk.md`:** that file says TPP has "No personal money screen" and shows only Campaign Funds and Salary. It's right that there's no dedicated money screen. But TPP does keep **personal Savings**, and it **lets you move savings into your campaign.**

- **Profile > General > Finance block:** **Savings**, **Salary**, **Campaign Funds**. These sit beside Political Summary (Political Points, Career, Party, Caucus, Approval Rating) and Statistics (primary and general wins and win percentages, legislation written and passed, judicial nominees). [files `profile.bin`]
- **Starting money:** Character Creation > Advanced lets you set starting **Savings**, Political Points and Starting Position. [files `candidateCreation.bin`]
- **Income:** every job card under Office > Jobs lists its **Salary**, along with Description, Term Length, Deadline and an Apply button. Examples: School Board Member $30,000; City Council $30,000; Mayor $60,000. [shot t17 / ss17, files]
- **The transfer.** Campaign > Finance has a **Donate Personal Funds** button. It opens a slider labeled "Select an amount of money to donate from your personal savings" with a running "Donation Amount: $." On confirming, it says the amount "has successfully been added to your campaign fund." **One way only:** I found no campaign-to-savings transfer. [files `campMenu.bin`; one-way is inferred from absence]
- **The two are kept apart elsewhere too:**
  - Scripted events can change "personal funds" or "campaign funds" separately.
  - A canned scandal reads "Misused campaign funds for private expenditures." [files `scriptedEvents.bin`]
- **Campaign Finance Report** (Campaign > Finance) [files `campMenu.bin`; help]:
  - **Campaign Funds:** $.
  - **Weekly Revenue: Donations.** Individual Donations and PAC Donations.
  - **Weekly Expenditures:**
    - Salary.
    - Campaign Staff, by role (New Media Director, Speech Writer, Marketing Strategist, Volunteer Coordinator and others).
    - Field Office Staff, by state.
    - State Director(s).
    - Marketing.
    - Rent.
    - Miscellaneous.
  - **Donate Personal Funds** (above).
  - **Financial History:** Total Donations, Individuals, PACs.
- **Campaign Overview > Finances:** a three-column strip, **Campaign Funds | Campaign Overhead | Remaining Funds**. Overhead shows in red. [shot ss24, ss50, ss57]
- **Where donations come from** [help, files `donateJS.bin`]:
  - **Individual:** fundraising events you attend; online giving, which grows with the New Media Director's skill; and volunteer fundraising hours.
  - **PAC:** given by how much the PAC trusts you and the size of the race.
    - **Ideology PACs** give to anyone who shares their views.
    - **Party PACs** give only within their party.
    - PAC types include construction, agribusiness, banking, insurance, real estate, lawyers, health, labor, energy (clean, coal, gas, oil), environment, pro-life, pro-choice, guns, education, and the two parties.
- **Contacts > PACs** shows "Contributions to [you]" in a **Type | Contributions** table with rows This Week, This Election and Total. [files `contactsJS.bin`]
- **Office fundraising:** when you hold office, Actions offers "Fundraise for Own Campaign" (hours slider, shows Current Campaign Funds) and "Fundraise for Political Party" (earns political points instead). [files `officeMenu.bin`, `endorsements.bin`]
- **Fundraisers with colleagues:** the event pop-up shows the host's portrait, a short comment, a "Candidate Biography" (ideology and political history by year) and "Event Results" ("You have received $5,138 from donations" plus political points). [shot ss59]
- **Spending is blocked when you can't pay:** travel, rallies, field offices, polls and staff training. The messages read like "You do not have enough campaign funds to travel." [files]
- **Money in endorsement deals:** in presidential primaries, "Endorsement Offers" shows Score Factors: Default Score, **Cabinet Position +** and **Campaign Funds +**. You can offer a cabinet post. [files `endorsements.bin`; blog]
- **Salary at higher offices:** the blog says a senator earns "millions a year." That conflicts with the job cards' real-scale salaries; the blog probably mixed up fundraising with salary. [blog; inferred]

---

## 3. Government: politicians, president, vice president, cabinet, judges

**Politicians tab, level tabs:** City | State | Federal | Judicial Branch | Favorites | Relationships. The screenshots show only City, State, Federal and Favorites. Judicial Branch and Relationships are in the current files. [shot ss44, ss45; files `profile.bin`]

- **City:** Mayor, City Council, School Board, Departments. **State:** Governor (plus a "Governors" list), State House, State Senate, Departments, **Other States**. **Federal:** President, House, Senate, Departments. [shot, files]
- **Other States:** for each state, the governor (party colored), the legislature's split as "D x% R y%" with a bar, and the districts counted as Safe D, Lean D, Competitive, Lean R and Safe R. [files]
- **President page:** two portraits, **President** and **Vice President**, each with a **Details** button. **History** above the portrait lists everyone who held the office. If you're your party's nominee, you also get "replace the Vice-President with a new running mate." [files `profile.bin`]
  - No priorities field is shown on this page. TPP politicians _have_ priorities internally (the help says they change as conditions change), but the profile shows policies, not priorities. [help; inferred from no label found]
- **House and Senate:** inner tabs **Summary | Politicians | Committees | Caucuses | Rankings | Districts**. [shot ss44, ss45]
  - **Summary:**
    - A seat bar ("211 Democrats ... Republicans 224") with View History.
    - A U.S. map shaded by each state's delegation. Click a state for its members.
    - Each member is a card: a **portrait on a party-colored background** (blue for Democrats, red for Republicans), the name with state and district, "**Policy Agreement: 40.3%**" (agreement with you), "**Approval Rating: 49%**" and **Details**.
    - Senators also show Term #, and there are "View Class 1/2/3 History" buttons. [shot, files]
  - **Legislature Summary table:** Category | Total | Democrats | Republicans, with rows 1st Term, Oldest, Youngest, Longest Serving. [files]
  - **Politicians:** leadership first (Speaker of the House, Majority Leader, Majority Whip, Minority Leader, Minority Whip, each with district), then every member. [files]
  - **Committees:** Chair, Ranking Member, Majority Members, Minority Members. There are Adjust Committee and Sub-Committee Membership buttons for leaders, and "replace the current leader." [files]
  - **Rankings:** All-Time / Current highest-ranking members by Political Points, plus Approval, including "Presidential Approval Ratings." [files]
- **Departments (the cabinet):** one card per department [files `profile.bin`]:
  - Department name and a one-line Summary of what it does.
  - Head's title, portrait, and **Employee Profile**: Age, Policy Agreement, Fiscal Ideology, Social Ideology, Experience, History.
  - **Replace** (when you're the executive) and View Report.
  - Federal heads in the files: State, Treasury, Attorney General, Interior, Agriculture, Commerce, Labor, Defense, HHS, HUD, Transportation, Energy, Education, VA, Homeland Security, Trade Representative, Intelligence, UN Ambassador, Budget (OMB), CIA, EPA, SBA, FBI, DEA, Social Security, NASA, FCC, Chief of Staff. [files `campMenu.bin` ids]
- **A politician's profile page:** tabs **Summary | History | Committees | Policies | Notable Events**. [files]
  - **Summary:** title, caucus (a link that jumps to the caucus), Traits, Relationship, Fiscal and Social Ideology, Policy Agreement. [files; the exact field order is inferred]
    - Buttons: View All Politician Elections, View All District Elections, Add to Favorites, **Mentor** (make them your protégé).
  - **History:** each office with years, including leadership posts ("Chair of the ...," "Vice-Chair of the ...," Speaker, whips).
  - **Policies:** one plain sentence per position, grouped (Economic and Tax, Education, Gun and Crime, Health, Immigration, Environment and Energy, Other). Example: "Supports raising teacher salaries."
  - **Short card used elsewhere** (Score Analysis): portrait, name, Fiscal Ideology, Social Ideology, Policy Agreement, Relationship, Details. [shot ss09]
- **Where "priorities" do show:** a candidate's **Campaign Platform** sentence on Campaign > Opponents ("I intend to [three priorities]"), and your district's **Constituent Priorities** under Office. [files `campMenu.bin`, `officeMenu.bin`]
- **Approval** [files `uiMenus.bin`; shot ss43; files `electionPage.bin`]:
  - The top-bar approval pop-up gives Approval Ratings by party (Democrats, Republicans, Independents, each colored).
  - It also has an "Approval Ratings by District" table (School Board through National) and a graph over time.
  - Elections > Polls has President Approval by state and nationally, split into Democrat, Republican, Independent and Total.
- **Judicial Branch tab:** St. Trial | St. Appeals | St. Supreme | U.S. District | U.S. Circuit | U.S. Supreme | U.S. Constitution | Case Archive, each with a Judges list. [files `profile.bin`]
  - **A judge's profile:** tabs Summary, History, Policy Positions, Notable Events ("Events (n)").
    - **Summary:** Fiscal Ideology, Social Ideology, Policy Agreement, **Term**, and **Judicial Philosophy** as seven opposed pairs, each with a description: Activism / Judicial Restraint, Living Constitution / Originalism, Federalism / States Rights, Individual / Institutional Rights, Equal Outcome / Equal Opportunity, Utilitarianism / Deontology, Altruism / Egoism.
    - **Ask to Retire** button. [files, help]
  - **Case Archive entries:** Case Summary, Claim, **Ruling: Constitutional / Unconstitutional**, Majority Opinion (the clause relied on, such as the commerce clause or the 2nd Amendment), Court Conclusion Agree/Disagree with the philosophy behind it, Concurring Judges, Dissenting Opinion, Individual Opinions. [files]
  - **Nominating a judge:** "Select a Nominee for the U.S. Supreme Court," with **Filter Nominees**. Each candidate shows [shot ss35]:
    - A large portrait and name (state), "Support: 52%" (expected Senate support), **Select** and **Details**.
    - Policy Agreement, Current Position (for example "United States Circuit Judge (Seventh Circuit)"), Age.
    - The seven philosophy pairs as rows: left %, a bar leaning toward one side, right %.
  - Nominees go through Senate confirmation, the blue slip and retention elections. There's an Automatic Nominations option. [help, files `judicialBranch.bin`]

---

## 4. Parties

**No Parties tab.** A party's structure is spread across five places:

- **Caucuses:** House and Senate > Caucuses, state and federal. Three per party:
  - Democrats: **Progressive Democrats**, **Moderate Democratic Coalition**, **Conservative Democrats**.
  - Republicans: **Republican Conservative Committee**, **Moderate Republican Caucus**, **Libertarian Caucus**.
  - Each caucus page shows its name, a short Description, Social and Fiscal Ideology, **Percent of Party**, the **Chairperson** and **Vice-Chair** (each with portrait, ideology and Political Points), and a **List of Members**. [files `profile.bin`, `uiMenus.bin`]
  - You join or switch caucus from Profile. Caucus leaders are elected at the start of each session. [help]
- **Party leadership:** the Speaker, majority and minority leaders and whips, at state and federal level, listed first on each chamber's Politicians tab. The Speaker or Majority Leader can grant or deny hearings. [files, help]
- **Political Influence pop-up** (click the star / Political Points in the top bar) [shot ss46; files `uiMenus.bin`]:
  - For each caucus: **Relationship %** and **Total Influence** ("19/34 56%"), split by State Senate and State House.
  - A table of influence by chair.
  - A **Political Points** line graph by year.
- **Party Chair job** (in TPP it's a player job, never a character you meet). It runs from the city campaign committee up to national. [files `partyChairFile.bin`; help; shot t17]
  - **Tabs:** Overview, Candidates, Marketing, Poll Data, Policy, Campaign Map.
  - **Overview:** election timing (which states have Senate races this year), Finances (Campaign Funds), Voter Turnout ("Increase to Turnout," "Percent of Voters"), Effect on Public Opinion by topic, and **Support for Party Policies** by party.
  - **Candidates:**
    - Pick an office (School Board up to Senate). Each district shows District Details (D/R/I %) and Candidate Details (Name, Fiscal, Social, Policy Agreement).
    - Pick or remove a **Primary Challenger**, **Promote** a local candidate to state level, choose a New, Current or Former Politician, Customize, and **Fill All Empty Positions**.
  - **Policy (the party platform):**
    - **Priority 1, 2 and 3**, each picked from about 30 topics with descriptions: Economy, Education, Tax, Health Care, Poverty, Crime, Terrorism, Military, Social Security, Immigration, Energy, Guns, Environment, Global Warming, Infrastructure, Jobs, Global Trade, Lobbyists, Tax System, Budget, World Affairs, Science, Money in Politics, Surveillance, Income Distribution, Race Relations, Homosexuality, Abortion.
    - The party's position on each policy question.
    - New candidates can "Use Party Platform."
- **Elsewhere:** Metrics "Political Party Demographics" (registered voters by party); Elections "Seats Gained" and "Elections Won by Party." [files `metricsPage.bin`, `electionPage.bin`]
- **Missing in TPP** [inferred from no labels found]:
  - No party membership roster.
  - No party chair, committee or headquarters shown as people.
  - No party platform page for an ordinary player to read. You see a party only through its caucuses, leaders and seat counts.

---

## 5. Campaign screen

**Tabs:** Overview | Events | Marketing | Opponents | Poll Data | Finance | Contacts | Staff | Policy | Volunteers | Campaign Map (presidential only). [shot ss24, ss50]

- **Left rail on every tab:** a staff portrait and name for that tab (Campaign Manager on Overview, Event Manager on Events, Marketing Strategist, Volunteer Coordinator), then buttons and Hours Remaining. On Overview the buttons are **Schedule, Marketing, Concepts, Withdraw**; the files also have Analysis / Advice and Difficulty. [shot, files]
- **Overview:** black section bars, one after another [shot ss24, ss50, ss57; files]:
  - **General Information:** weeks until the primary and the general, open or closed primary, and campaign messages ("Cooper Horner has run an ad campaign attacking your policy regarding income taxes"). Presidential races add **Upcoming Elections** (Week | State(s)) and **Delegate Count** (Candidate | Delegates).
  - **Campaign Opportunities:** Debates, Rallies and Fundraisers listed as rows ("Rally with Congressional Candidate Derrick Davies (WI-3)"), each with Continue and X, plus **Attend All Rallies** and **Attend All Fundraisers**.
  - **Finances:** Campaign Funds | Campaign Overhead | Remaining Funds.
  - **Campaign Metrics:** Name Recognition as a bar with %.
  - **Voter Enthusiasm:** Democrats, Republicans and Independents, each a bar with %.
  - **Effect on Public Opinion:** by topic (Economy, Education, Poverty, Taxes, Crime/Guns, Health Care, Environment, Immigration, Military), each a +/- % from a center line. Then **Support for Candidate Policies**.
- **Events:** Door Knocking, Interviews, Speeches, Rallies, Fundraising. Each has a description, "Select Length of Event" in hours, and which parties' voters to contact. A results pop-up follows (houses visited, name recognition gained, enthusiasm by party, quoted voter comments). [shot t23, t26]
- **Marketing:** Television, Radio, Internet and Direct Mail. Ads are General or Attack, by topic, with a budget, ad views and the states to run in. Results show views, name recognition, enthusiasm and opinion change by party. [shot t36, t40, t37]
- **Opponents:** a list by party with tabs Summary | Platform | History [shot ss42; files]:
  - **Profile:** Name, Age, Fiscal Ideology, Social Ideology, Current Location.
  - **Statistics:** Delegate Count, **Total Donations**.
  - A large portrait.
  - **Platform:** "I intend to ..." with the top three priorities, plus position statements by area.
- **Poll Data:** you commission polls (state; approval, vote intention, policy support, priorities). Cost rises with accuracy. [help, blog]
- **Finance:** the report in section 2.
- **Contacts:** organizations (speech invitations) and PACs (contributions table).
- **Staff:** about ten roles, each with skill stars, training cost and weekly salary. Skill resets each election. [help]
- **Policy:** your platform (three priorities and an optional promise) and positions. [help]
- **Volunteers:** Open or Close Field Office (weekly cost), volunteer hours, and how hours split across Door-Knocking, Phone Bank, Fundraising and Yard Signs. State Directors are needed per state for president. [shot t25, t39]
- **Campaign Map:** a U.S. map. Click a state for your name recognition, enthusiasm and policy support there, plus delegates, how they're split, and the primary's week. [help]
- **TPP's controls we would not copy:** most of its campaign controls are sliders and stars. Lamontae ruled out sliders on Nov 5 and bars for feelings on Oct 29, so we'd keep the data and drop the controls. [inferred, our rulings]

---

## 6. Elections page

**Tabs:** City | State | Federal | Archive | Favorite | Polls. Then the office (Federal: President | Senate | House), then Summary | News Feed (n). The race filters are Player, Endorsed, Favorite and All. [shot ss30, ss54; files `electionPage.bin`]

- **Federal Senate/House Summary** [shot ss30, t31]:
  - A national seat bar ("13 Democrats ... Republicans 20") with each party's popular vote and "Gained n Seats."
  - A **Winners / Margins** map toggle.
  - Click a state for its race. Each candidate row has a portrait, a **check mark for the winner** and **\* for the incumbent**, the name, votes, a large %, the margin ("+337,939") and "100% Reporting."
- **President by state:** state results with each candidate's Electoral College Votes and a table **Political Party | Votes | Party % | Total %** (Democrats, Republicans, Independents, Total). There's a Vote Distribution bar and a "Return to U.S. Map" button. [shot ss54, t60]
- **Results extras:** Voter Turnout (Political Party | Voters | % | Party Turnout, plus "Total Voters by Party"), Registered Voters, Electoral Votes, View Exit Polls, View Primary Results, Delegates, View Endorsements. [files, shot t61]
- **Polls:**
  - Polling On/Off.
  - Each race has a pollster table, **Week | Pollster | Sample | Results | Leader | Info**, plus a **Weekly Average**. Pollsters have hidden lean and error.
  - Approval: President Approval by state and nationally, and Democrat, Republican, Independent and Total Approval. [files, help]
- **Archive:**
  - Election History per office, with **Winners**, **Margins** and **Seats Gained** ("Democrats Gain n," "Net Seat Gains: No Change").
  - "All Elections for District n."
  - Each candidate has "View Politician Details" and Add to Favorites. [files]
- **Race pop-ups:** a candidate list with portrait, Fiscal and Social Ideology, History by year, **Details** and **Add to Favorites**. [shot ss64]
- **Election night:** live counting with speed controls, "Skip to End," and Projections / Margins. [shot t03, t52, t53]
- **Customization (sandbox):** add or remove candidates, and set running mates. [files]

---

## Saved screenshots (`cto-notes/menus/refs/tpp/`, from the Steam CDN, 1920x1080)

| File                                             | Shows                                                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| ss01-office-summary.jpg                          | Office > Summary: Chief of Staff portrait, messages by kind, schedule rows with Continue/X         |
| ss02-metrics-nation-budget.jpg                   | Metrics > Nation > Budget: Expenditure by Category table and chart; Treasury and Trust Funds table |
| ss09-score-analysis-politician-card.jpg          | Short politician card: ideology, Policy Agreement, Relationship, Details                           |
| ss11-bill-page-sponsor-support-history.jpg       | A bill: sponsor portrait, provision "from $7.25 to $12.00," support counts, week-by-week history   |
| ss14-governor-budget-tax-policy.jpg              | **Governor Budget**: State Treasurer portrait, department list, tax cards, live totals             |
| ss15-governor-budget-education-lines.jpg         | **Governor Budget**: State Superintendent, lines with Budget Request and Last Year's Budget        |
| ss17-office-jobs-salary.jpg                      | Office > Jobs: each office with description, term, **Salary**, deadline, Apply                     |
| ss24-campaign-overview-finances.jpg              | Campaign Overview: Campaign Funds / Overhead / Remaining Funds, name recognition, enthusiasm       |
| ss30-elections-federal-senate-map.jpg            | Elections > Federal > Senate: seat bar, map, a state's race                                        |
| ss33-metrics-overview-government-approval.jpg    | Metrics > Overview: Government Approval by category, with change since last year                   |
| ss35-supreme-court-nominee-select.jpg            | **Supreme Court nominee picker**: portraits, support, seven philosophy pairs                       |
| ss41-metrics-state-tax-revenue-by-source.jpg     | Metrics > State > Taxes: revenue by source, pie and table                                          |
| ss42-campaign-opponents-profile.jpg              | Campaign > Opponents: profile, statistics, total donations, portrait                               |
| ss43-approval-ratings-by-district.jpg            | Approval pop-up: by party, by district, over time                                                  |
| ss44-politicians-federal-house.jpg               | **Politicians > Federal > House**: seat bar, map, member cards with Policy Agreement and Approval  |
| ss45-politicians-federal-senate.jpg              | **Politicians > Federal > Senate**: the same for senators                                          |
| ss46-political-influence-caucus-relationship.jpg | Caucus relationship and influence, political points graph                                          |
| ss50-campaign-overview-presidential.jpg          | Presidential campaign overview: upcoming primaries, delegate count, finances                       |
| ss54-elections-president-state-results.jpg       | President results by state: electoral votes, votes by party                                        |
| ss57-campaign-overview-rallies-fundraisers.jpg   | Overview with rally and fundraiser invitations, finances                                           |
| ss59-fundraiser-event-candidate-bio.jpg          | Fundraiser with a colleague: biography, history, "$5,138 from donations"                           |
| ss64-governor-election-candidate-bios.jpg        | Governor race pop-up: candidate bios with Details and Add to Favorites                             |

Thumbnails of all 66 store screenshots are in this session's scratchpad only. Their numbers (t03, t17 and so on) match the order of Steam's screenshot list.

## What these screens need from our records [inferred, for the tie-in he described]

- **Budget, per government:**
  - Every line: name, what it pays for, department, kind (mandatory, discretionary, dedicated), the request, last year, this year's amount, and who pays (federal, state, local share).
  - Every tax: rate settings and revenue.
  - Running totals: treasury, deficit, debt, trust funds.
  - Each department's head (a person) and a yearly report built from the numbers it moves.
- **Your money:** savings, salary (from the job held), campaign funds, and a ledger of transfers from savings into the campaign. Donations by kind (individual, PAC, by PAC), and spending by kind (staff, offices, ads, rent, travel).
- **People shown as officials:** portrait, title, party, policy agreement with you, approval (as published polls, given the no-meter ruling), positions as sentences, history by year, and the campaign platform's three priorities. Judges add their term and their seven philosophy pairs.
- **Parties:** caucuses with chair, vice-chair, members and their share of the party; chamber leaders; and a platform with three priorities plus positions. TPP has no party chair as a person, which our game would add.
