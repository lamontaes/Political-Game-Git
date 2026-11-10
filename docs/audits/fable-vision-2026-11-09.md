# The game against your vision: one town is alive, the country around it is not

My one recommendation: before adding sessions, have a top-level session write three designs and one acceptance rule. They are named at the end of page one. Here is why. You can start a life, open every screen and advance time. In ten weeks of play I got as far as meeting people; my character was 17 and no race opened. A 20-year game did not finish: it crashed in year 12. The town's people are simulated. The nation, the other states and their legislatures are formulas and one-time tallies. Scenes still play the lines you rejected. A grade removes one line or nudges odds; it does not learn your reasons.

## Page one: the game today against what you asked for

| What you asked for                                               | What a player gets today                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Grade                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| The whole world simulated, never steered to real numbers         | One town is simulated from its people. The nation is one formula with a built-in wave. States follow the nation. Moves between states are forced to match the Census every month.                                                                                                                                                                                                                                                                                              | Doesn't work                   |
| Laws at every level change lives and can be reversed             | With the votes forced in dev mode, every law a body may pass does pass and every repeal passes (170 laws at four bodies in one town). Taxes and wages move money. But a town's tax is mostly charged to officials elsewhere, some laws moved money the wrong way, and most test bills picked up an unrelated rider. State and federal laws barely move the economy. One proof tool names the voters and the other names almost nobody; neither names the people a law reached. | Works in town, with gaps named |
| The rest of the country moves on its own                         | Other states pass a pile of laws in year one, then almost nothing. No screen can open them. They change nobody's life.                                                                                                                                                                                                                                                                                                                                                         | Doesn't work                   |
| A played life has real history, real people, scenes with purpose | A 17-year-old's life is four lines. Seven scenes played in ten weeks. None had a purpose, and five were the same "someone has news" small talk.                                                                                                                                                                                                                                                                                                                                | Doesn't work                   |
| Words sound like real people                                     | The scene you called terrible on November 8 still plays, word for word. A forced "serious illness" scene played the President's-speech talk.                                                                                                                                                                                                                                                                                                                                   | Doesn't work                   |
| Screens match your approved designs                              | The frames match. The content you approved (a life in sentences, what people say about you) is missing, and old designs still sit beside new ones.                                                                                                                                                                                                                                                                                                                             | Works, with the gap named      |
| A 20-year game finishes fast and fits in memory                  | A village's 20-year run crashed in year 12 after 16 minutes. A second world needed 51 minutes for 19 years. Years slow down and records grow every year. There is no fast clock a player can press.                                                                                                                                                                                                                                                                            | Doesn't work                   |

What is solid: the town's money (every dollar moves by a balanced entry), the steps a bill goes through in your own state, town budgets, the Metrics tab, and dev mode's controls for forcing a vote. Pillar 2 names the flaws inside each.

## The ten root causes, ranked by how much of the game each holds back

1. **The world outside your town is equations and tables, not people.** The engine has one way to simulate people and uses it for one town. The nation, the states, migration and other legislatures were each built as a separate shortcut. This holds back the first three rows of the table above.
2. **"Done" is measured in records and self-written tests, not from the player's chair.** A feature counts as finished when a record exists and its builder's test passes. Nobody has to open the game and see it. This is why you keep being told things are done.
3. **A life holds too little to tell.** The records keep births, schools, jobs and moves. They do not keep what happened between people. So the journal, the person card, the You screen and every scene have nothing specific to say.
4. **The words are a pile of hand-written lines picked by weights.** A bad grade removes that one line. Everything else is a weight, and the weights favor lines you rejected: the engine gives "Then we agree on something for once" 1.44 times a neutral line's chance. Your reasons are stored as notes that no code reads. A scene with no lines of its own borrows small talk.
5. **Everything the game tracks is played at full detail every day and kept forever, and there is one clock speed.** That includes every full person, every rival's campaign event, and officials and votes in places the player never sees. This is the speed and memory problem. A long world also stops making sense: in one, households that moved in were credited with 1.7 jobs per adult, and median earnings tripled in eleven years.
6. **A scene plays whenever something in the world matches it, for any person, every time it recurs.** Nothing asks whether this scene belongs in this person's story now.
7. **The player can watch and react but cannot drive.** A mayor or governor cannot propose a bill. Repeal means typing a zero. You cannot call a meeting, start a movement or run a campaign trail.
8. **A law is judged by its paperwork.** A law counts as working when a saved note says it reached someone. Nobody checks what happened to the person. The crew counts 147 of 178 laws as working on that basis. When I followed the money for every law, about half of the test results were the effect of a rider the legislature adds to the bill, not of the law.
9. **Place facts are one default stretched over 56 places.** My New Hampshire town votes for selectmen on November 4; New Hampshire towns vote in March (measured on the Government screen). Every Connecticut town without its own record gets a three-seat Board of Selectmen (`data/research/local-government/township-governing-bodies.json:7`). No town race anywhere has a primary (`src/core2/elections-calendar.ts:410`). The News printed an income tax story in a state that taxes no wages (measured).
10. **Screens were copied in as layouts, each keeping its own copy of the facts.** Old looks were left beside new ones, against your replace-never-layer rule.

**What I would approve first.** Three designs and one rule, written by a top-level session (Fable or Opus at high effort) before more building:

- One design for causes 1 and 5: what a state is, what is kept, what is rebuilt when opened, and how time advances.
- One design for cause 3: what a remembered event in a life is, and who writes and reads it.
- One design for cause 4: how your notes become rules that act on every line.
- One rule for cause 2: what a second session must do in the running game before anything is called done.

Causes 6 through 10 are Sonnet work once each task carries that acceptance check. The scene and screen-content parts also wait on the life-record design. I filed nothing to the pool; this audit was read-only. The year-12 crash has been an open pool item since October 20 and is still unfixed. The other defects named below still need filing.

## How to read the rest

Audit by Fable, November 9, 2026. It was read-only: no game code was changed and nothing was merged. Every date in this report is in 2026.

Each pillar has the same parts: what you ruled, what the code does, what a player sees, the gap, the root cause and the size of the fix. Sizes: **small** is days for one session. **Medium** is about a week for one strong session with helpers. **Large** is a design first, then weeks.

Everything marked "measured" I ran myself on main as of November 9 (version 0.97.0). Everything marked "read" comes from the code. What I could not verify is listed at the end.

## Pillar 1: the whole world is simulated, not steered

### What you ruled

- November 8: "None of the simulation should be hard-coded like that or, you know, set against a baseline. The baselines are to calibrate... a cause formula... things can take drastic turns, wild turns, or just be, you know, calm and everything in between."
- November 8: "ranges aren't targets. And look, that's not just for economics. It goes for everything."
- November 8: "this stuff needs to follow, not follow, but be influenced by local, state, and national events or trends."
- November 5: "just simulate based on the people there and then you can fill in the gaps based on what was simulated when things need to be generated. generate on demand."
- November 1: "EVERY. LIFE. IS. SIMULATED. WHAT DO YOU NOT UNDERSTAND. THIS IS LOW INTENSITY STUFF."

### What the code does

- **The nation is one formula (read, and confirmed by an independent reviewer).** Each month one function computes unemployment, prices and interest rates from last month's figures (`src/core2/macro-model.ts:395`). It has two inputs from the world. One is the central bank's rate. The other is your town's income, multiplied by 0.000000003 per resident (`src/core2/data/macro/parameters.json`, `macroTownWeightPerPerson`), which rounds to nothing. No tax, spending bill, tariff, disaster or business failure enters it.
- **The business cycle is built in (read and measured).** The formula contains a swing that feeds itself (`src/core2/macro-model.ts:428`). Its length is set once per world, near nine years. In my run the highs came about seven and a half years apart and the lows nine. In my Wickliffe, Oklahoma world, unemployment rose from 3.7% to 6.3% by 2028, fell to 2.7% by 2031, was back at 6.4% in 2035, fell to 2.7% again by 2040 and was rising again in 2043. The economy now moves, as you asked. It moves like a clock, and nothing a government does can start or stop a recession except the central bank.
- **Each state follows the nation (read, reviewer confirmed).** A state's unemployment is the nation's rate plus the state's own gap from last month, shrunk by about half a percent each month (`src/core2/regional-model.ts:325`). So every state stays a nearly fixed distance from the nation. No state law, tax or budget enters. The only local shock is a disaster's job loss (`src/core2/modules/regional.ts:353`).
- **Moves between states are forced to match the Census every month (read, reviewer confirmed).** On the first of each month the engine adjusts every state's pull until arrivals match the Census survey (`src/core2/modules/counted-moves.ts:825`). Departures are pinned to the survey rate too (`src/core2/modules/counted-moves.ts:1086`). A law that makes a state attractive changes who moves there, never how many. I found no registered stopgap for this.
- **Routine layoffs follow a fixed pace (read, corrected by the reviewer).** Firms do cut hours and staff from their own sales and losses (`src/core2/modules/jobs.ts:1336`). On top of that, every private job fills a meter at a national rate and the worker is laid off when it is full (`src/core2/modules/jobs.ts:2278`). The stopgap's own note says that without it "the town's firms almost never separate anyone" (`src/core2/data/stopgaps/labor.json:133`).
- **I tested it with twin worlds (measured).** Woods Cross, Utah, same seed twice. In the second world I set the state income tax and the federal income tax to zero on day one, through dev mode's own law control. After one year the national and state figures matched to four decimal places. After three years national unemployment was 5.722% against 5.727%, a gap of five thousandths of a point. The jobless rate in the town's part of Utah was 6.405% against 6.409%. That region's population, about 730,000 people, was 729,822 in both worlds, the same to the person. Meanwhile the town's residents held $50 million more cash. The money reached people. The economy and the map did not answer.
- **What is right (read):** national unemployment and inflation no longer return to 4.5% and 2.45%. Those figures now only seed the opening (`src/core2/macro-model.ts:442`). Business closings come from each firm's own losses and cash (`src/core2/modules/business.ts:675`). Four of the old checks against real-world ranges now warn and let the run go on (for example `src/core2/macro.test.ts:87`).
- **What still fails a run for leaving a real-world range (read):** regional population change (`src/bench/m1-13-check.ts:114`), yearly population change (`src/core2/counted-moves-balance.test.ts:69`) and turnout (`src/core2/electorate.test.ts:128`). The roadmap's own test for the national economy still reads "keeps national figures within real historical spreads" (`docs/roadmap/features.json`, M1-02).

### What a player sees

The Metrics tab shows the country, the state and the town with "since last year," as you approved. A player sees the economy rise and fall. A player who passes a state tax cut, or signs a federal budget as President, will not see the economy answer.

### The gap and its root cause

You asked for one simulation whose numbers come from the people in it. The game has that for one town. Everything larger is a second kind of model, written top-down, that the town cannot push and laws cannot touch. Root cause 1.

### Size of the fix: large

Build one coarse country tier out of the model you already have. Every state becomes counted groups and a state ledger, stepped monthly by the same rules the town uses, times their counts. The nation becomes the sum of the states. The cycle then comes from causes: credit, prices, a federal budget, a disaster. Real data sets the opening and the parameters only. This is the one design that removes four things together: the national formula, the pull of each state toward the nation, the forcing of moves to match the Census, and the fixed layoff pace. It needs top-level design work first.

## Pillar 2: laws at every level change lives and can be reversed

### What you ruled

- November 7: "these should all be able to be reversed."
- November 8: "they've got to spend money... They should be passing stuff."
- November 8: "when it finds these errors or finds that these laws don't pass, I want them fixed. I don't just want a report of everything that was broken."
- November 8, on dev mode: "Making it happen should just trigger the code in the game that makes it happen. So again, it has to be built out to where the player can get to it."
- October 13, standing rule: an effect is a read. A record nobody else reads is a placeholder.

### What the code does

- **A town tax moves money and reverses, but mostly out of the wrong pockets (measured, traced account by account).** In Denver, Missouri I passed a property tax raise from 0.817% to 2% through the real board, 4 to 1. I passed the repeal later and the rate went back to 0.817%. Ninety days after the raise I compared every account with a twin world that had no raise. I added up every cash account in the game. That includes the accounts of counted households, the town's people who are kept as counts and not as individuals. Full people are the ones kept as individuals. The raise took about $380,000 more out of people's accounts. Only about $3,600 of that came from the village itself: $3,000 from its full residents and $600 from its counted households. About $359,000 came from officials elsewhere and $18,000 from other full people who live elsewhere. Members of Congress from California and Hawaii each paid about $1,800 extra toward this village's tax, and the delegate from the District of Columbia paid $4,652. The cause is one step in the code (read). Officials across the country are kept as full people who own homes. The tax lookup ignores where a home is and returns the played town's rate and the played county's collector for every home in the world (`src/core2/modules/budgets.ts:1123`). So those officials were paying this village's tax before the raise too, at the old rate. The payments' own labels show where it went. The county tax collector took in about $385,000 more in property tax. It still held $192,000 after 90 days and had passed $193,000 on to governments. A step the game calls a reserve sweep then moved $192,000 out to the outside-market account. So no treasury ended with more.
- **A wage law reaches pay (measured).** In American Samoa a yes on raising the minimum wage wrote a "pay raised to minimum wage" record. A repeal lowers the floor but leaves raised pay where it is (`src/core2/wage-floor.ts:171`), which is how real pay behaves.
- **About 120 places in 48 files read a law at the moment they decide or pay (my count).** They cover wages, benefits, taxes, housing, credit, campaign gifts, retirement ages and immigration (for example `src/core2/modules/campaigns.ts:2908` and `src/core2/modules/retirement-claims.ts:98`).
- **Dev mode's own proof came back empty (measured).** In As Matuis, Northern Mariana Islands, I used dev mode to pass a minimum wage raise from $7.25 to $11.60. It passed the House 13 to 7 and the Senate 7 to 2, and the governor signed. Two hundred days later its "who did this reach" control said 0 records, 0 people. Its trace of the law said "record-not-found." The reach control only reads one family of records (`src/bench/dev-mode.ts:515`), so a pay raise would not show in it. I did not check pay in that world. The sweep below did, in Mississippi, and pay moved.
- **Trace answered why for none of 19 records (measured).** In Savage Town, Virginia I played 45 days, then asked dev mode's Trace about 19 records that the journal and the news name as their own sources. Ten came back "record-not-found." Nine came back "no-saved-reason."
- **The reach control sees income tax and misses other laws (measured).** In Woods Cross, Utah it reported 72 people reached by a state income tax change, out of about 1,200 full people. In that test it counted nobody from the counted population. In Bigelow, Arkansas I passed a town property tax raise from 0.487% to 1.23%, 3 to 2. Four months later reach reported 0 people, and Trace said "record-not-found." The Denver, Missouri raise moved about $380,000 out of people's accounts, so a property tax acts and the control cannot see it.
- **What works in dev mode (measured).** Forcing a vote at a chosen margin. A bribe three ways in Bigelow: left to the engine the resident chose not to offer; forced to "takes," $250 moved and the reasons were kept; forced to "refuses," the refusal was recorded. In Bigelow the "what they remember" control listed 19 events for the player and 9 for a household member, with the dates they fade. These are things heard or seen since day one, such as a speech or a news story, and most fade within weeks. They are not the life record pillar 4 asks for: they hold nothing from before the game starts.
- **Run-until stops on things far from the player (measured).** In San Roque, Northern Mariana Islands, "until a law takes effect" stopped on a Hawaii law. "Until a death" stopped on a Minnesota legislator. "Until a bill passes" ran 400 days and never stopped. A forced layoff answered "They worked today: lay them off tomorrow" on two days running before it worked on the third.
- **A repeal I passed was overtaken the next day in one run and held in another (measured).** In that As Matuis world the raise to $11.60 was still in force 200 days in. That day I passed a repeal putting the wage back to $7.25, by the same margins. Two hundred days after that the wage in force was $15.00. The law record shows why. On the day of my repeal the legislature passed a bill of its own, HB 55. It answered "raise the minimum wage" yes, and that answer sets $15.00 the day after it passes. I ran the same world a second time with no played character, and it went differently. There the legislature's own $15.00 bill passed 28 days into the game. It was the Senate's fifth try in four weeks, each try tied to a different unrelated question; the one that passed was tied to private-school funding. My repeal, 200 days in, then wrote $7.25 as the newest law and held. In both runs the legislature raised the wage on its own within months. American Samoa's legislature passed the same kind of bill in its first April, from $5.80. Dev mode could tell me none of this.
- **Bills come out with unrelated riders (measured).** My one-line wage bill in As Matuis left the body carrying a second section, a no on shifting highway funds to transit. Seven of the eight wage bills in the Northern Mariana Islands legislature paired two unrelated questions.
- **Forced bills fail when a committee chair holds them (measured, cause traced).** With every member voting yes, a sales tax bill, a federal wage bill and two repeal bills in American Samoa failed. I replayed one repeal: the record says "held in committee," 0 to 0, by the labor committee's chair, on the day it was filed. A held bill is marked failed the same day. Dev mode has a switch that makes the chair hear a bill; the crew's test harness does not.
- **Laws that reach nobody (read; I found no part of the game that names them).** Nothing in the game acts on forgiving student loans, banning congressional stock trading or statehood for the District of Columbia. Nothing acts on three federal budget lines either: community development, veterans and foreign affairs. The sweep below agrees on all three laws. The stock trading and statehood bills showed only their rider's change. The student loan bill carried a different rider, and its result matched, to the dollar, another bill carrying that rider (my inference: it added nothing of its own).
- **Three separate pieces of code answer "what is the law now" (read)** (`src/core2/modules/laws.ts:602`, `src/core2/modules/outcome-web.ts:195`, `src/core2/laws-death-taxes.ts:58`).
- **State and federal laws barely move the economy (measured).** See the twin-world test in pillar 1. Your Kentucky example, abolishing the income tax and watching the metrics, does not work. With both income taxes at zero, national unemployment moved by 0.005 of a point in three years, and the jobless rate in the town's part of Utah by 0.004. That region's population did not change by one person.

### Every law in dev mode's list, tried at four bodies (measured)

You asked me to test the laws through dev mode, since it uses the game's own code. I drew a place at random that has a town board, a county board and a state legislature: Marion, Mississippi. Dev mode lists 170 laws there: 37 amounts such as tax rates, 73 yes-or-no questions and 60 grants of power to local government. For each law at each body I built a fresh world and introduced a one-section bill with dev mode's Introduce. I passed it with dev mode's own vote at a margin of three yes votes over no, or four where a chamber has an even number of seats. That is 4 to 1 at the town board, 219 to 216 in the U.S. House and 52 to 48 in the Senate. The executive signed. I ran 120 days for local bodies and 180 for the state and for Congress. Then I compared every cash account with a twin world that had no bill, and passed a second bill putting the old value back. That is 680 tries. Congress needed a second pass at a wider margin, described below.

- **Each body's powers come from the place's own law, and that works.** The Marion board could pass 18 of the 170, the county board 18, the Mississippi House 147 and Congress 40. The refusals gave reasons, such as "state preempts local minimum wage." The crew's "147 of 178" is a different count that happens to share the number 147.
- **Every repeal passed.** All 223 did. At the town, county and state the old value was on the books two weeks later, scheduled for the date the state's rule sets. In Congress 31 of 40 went straight back to the old value. The other 9 repeals passed too. Those laws had no federal value before my bill, and a bill can set a value but cannot remove one, so a value stayed where there had been none. I also followed four passed state laws past the next January 1, when the game's starting data lists a value of its own for the new year. My passed values stayed in force.
- **Congress keeps the Senate's 60-vote rule.** At narrow margins all 40 bills Congress may pass failed, 219 to 216 in the House and 52 to 48 in the Senate. At 233 to 202 and 65 to 35 all 40 passed.
- **A forced bill is not a clean test, because the body adds a rider.** Your October 14 ruling lets a sponsor short of votes trade a section for a vote. That step still runs when dev mode has already fixed every vote (measured: the bill's own record shows the trade). A rider here means a second section on a different subject. My one-section bills left with a second, unrelated section in 35 of 40 cases in Congress, 6 of 18 at the county board and 2 of 18 at the town board. In the Mississippi House I checked 74 bills for a rider. Of the 72 with results of their own, 38 had one. The other two came from the 75 bills with the identical result below, and both had one. In Congress 33 of the 40 came out carrying a yes on raising the minimum wage. Two, a student loan bill among them, came out carrying a no on having a federal income tax.
- **So about half of the twin tests measured the rider.** A twin test compares the world with the bill against the same world without it. Of the 147 state laws, 75 changed the town's money by exactly the same amounts, to the dollar: $51,945 out of governments and $46,646 into counted households. The two of those bills I read both carried a no on public broadband, and I infer it for the rest from the identical result. In Congress 18 of the 40 show one change, the same to within two dollars. It is the wage rider's: businesses $308,500 lower, households $30,500 higher, governments $194,000 higher and $82,000 gone to the outside. Seven of those 18 are yes-or-no questions that did nothing of their own in 180 days. Among them are raising tariffs, banning congressional stock trading and statehood for the District of Columbia. The crew's harness holds its votes through the same step (read, `src/core2/modules/legislature.ts:5126`), so its matrix has the same flaw.
- **The proof tools rarely name the people a law reached.** I ran both on the same 147 state laws. Dev mode's reach control gave a number above zero for 23 of them. It named a full person for 9 and a counted person for 2. The crew's harness searches every record that names the law. It found 175 people for 120 of the laws and three more for the other 27. The House has 122 members and the Senate 52, and there is one governor: 175. So it is counting the people who voted, to the person (my inference from the sum).
- **An income tax raise shows the gap.** Raising the state rate from 4.4% to 6.6% took $479,000 from counted households and $7,000 from full people in town. Reach reported 86 full people and no counted ones.
- **A wage raise moves pay, in opposite directions at two levels.** Both bills were clean, with no rider. The Mississippi House raised the minimum wage from $7.25 to $10.88: households ended $18,200 higher and businesses $14,100 lower. Reach named four people. Congress passed the same raise: households ended $4,200 lower and businesses $28,000 lower, and governments $15,200 higher. I did not trace why the two differ. The yes-or-no wage question that rides on other bills is a different law: it sets $15.00. This answers the As Matuis case above, where I had not checked pay: pay does move.
- **The property tax result repeats.** Raising Marion's rate from 0.921% to 1.381% took $1,900 from full people in town, $31,100 from its counted households and $197,700 from officials elsewhere. The result was the same to the dollar whether the town board or the county board passed it.
- **A sales tax raise falls on businesses, and the money leaves town.** The town board added 10.59 points. Businesses ended $277,900 lower and households $24,100 lower. Governments gained $19,600, and $283,600 was recorded as leaving to the outside. When the county board passed the same raise, governments ended $7,700 lower. I did not trace whether shoppers went elsewhere or the tax was paid outward.
- **Some results point the wrong way (measured; the first traced to its payer).** A county work requirement for assistance, passed with no rider, left households $94,000 higher. The payer was the United States treasury, $134,000 lower. The state version did the same. Answering no on funding pensions on schedule sent $20.6 million out of governments in 180 days. Making transit free brought governments $8.25 million. The pension and transit figures have the broadband rider's amounts taken out. The wage question in Congress cost businesses ten times what households gained, as the rider figures above show. The county sales tax and the wage raise from Congress, above, also look wrong.
- **What I did not test here.** Budget lines, and amounts with no value in force at a body, I set to 1 of whatever unit they use. That proves a bill passes and nothing more. The same goes for the 60 grants of local power, which I did not follow into a town using the power.

### Dev mode on the screen (measured, with screenshots)

A helper drove dev mode through the game's own screens in Ten Broeck, Kentucky, for five months of game time and took 136 screenshots. I checked the ones I cite with my own eyes. Ten are saved beside this report in `fable-vision-2026-11-09-screens`.

- **The bill page's dev card works.** It lists each member with Yes and No, a margin, and Sign, Veto, Override and Trace. A property tax ordinance passed 5 to 0, the mayor signed, and the page said so (screenshot 04).
- **The Bills and Bribe panels cannot be read.** On the Government screen they are drawn underneath the Members cards. Their result lines show through in pieces (screenshot 05).
- **A person's record list prints "[object Object]" in every slot.** Clicking one opens a Trace that says "kind missing, record null" (screenshot 06).
- **The Watch panel is black text on a black sheet.** Its tables cannot be read (screenshot 07).
- **The scene list does not say which scenes it can cause.** The panel shows 98 plain buttons for the 99 kinds dev mode lists. A "visit" I asked for began and then played nothing in four days, which matches my own sessions, where four scenes that dev mode could only wait for never came (screenshot 08).
- **Dev mode's own status table agrees with pillar 3.** On the same screen it lists "Other places: not in the new core yet," and state and federal government as "partly running," missing "budgets and governing" (screenshot 08).
- **Run-until still stops far away.** "Until a law takes effect" stopped on laws in Colorado, Hawaii, Delaware and the Virgin Islands, and never on the law just passed in town.
- **A bribe on a town council bill was recorded between two members of Congress.** The bribe panel offers officials who have no vote on the bill. The record it wrote names a senator from Kentucky and a House member from California as the two parties. The bill was before a five-member town council (screenshot 10).
- **The player's own screen shows a bill with no name.** After the dev bills, the council's Coming up list read "Jul 1 2025-11:" with nothing after it (screenshot 10).

### What a player sees

A council member can draft from 32 town policies; a state legislator from 152 (`src/bench/legislature.ts:64`). A mayor or governor has no bill menu at all, because only bodies with two or more seats get one (`src/bench/legislature.ts:93`). There is no Repeal button outside dev mode (`src/bench/ui/dev-bills.mjs:134`); a player repeals by typing 0. After a law passes, no screen shows the people it reached.

I took three seats in Davenport, North Dakota to check (measured). The council member's Your office screen has a Draft a bill list. The mayor's Your office screen shows "Office: Mayor" and "Pay: $4,262.00 a year" and nothing else. The word "repeal" appears on none of them.

### The gap and its root cause

"147 of 178 laws work" means 147 laws have a reach record. It does not mean a player can watch 147 laws change a life. The matrix measures records (root causes 2 and 8). The effects that matter most to a politician, jobs, growth and people moving, are cut off by root cause 1.

### Size of the fix: medium for the town and the screens, large for the economy

- Small: a Repeal action on every law page; a bill menu for single-seat executives.
- Medium: after any law passes, one "what this did" page built from the same records, per person and in dollars, with the repeal shown the same way. Make dev mode's reach and trace read every effect record, and say why a bill failed.
- Large: state and federal laws reaching the economy. That is pillar 1's fix.

## Pillar 3: the rest of the country moves on its own

### What you ruled

- November 8: "The other 49 states changing laws and, stuff happening nationally and locally and stuff is to the utmost importance, even simulation kind of stuff."
- November 5: for every government outside your own chain, the members' and governor's views decide; keep only the result; build the detail on demand; do not build 7,500 legislators at the opening. Your finish line: "at least 40 states change a law in force" in a played year.
- November 8, on other states' budgets built as a published figure times one factor: sent back. Budgets move from each state's own economy and laws.
- October 14: "a legislature passing its whole year on one day... each is a defect until the record answers why."

### What the code does

- **One tally per session (read, reviewer confirmed).** On the day a session convenes, the engine walks 55 yes-or-no questions. A change passes if each chamber has more members leaning yes than no and the governor agrees (`src/core2/modules/world-legislating.ts:1386`). Public opinion, the state's economy and lobbying are not inputs. Only yes-or-no questions can change. Tax rates, wage amounts and budgets in other states never do.
- **A flood in year one, then silence (measured).** In my Wickliffe, Oklahoma world, 54 other states and territories changed 467 laws in the first year. Fourteen states capped property tax growth in the same year. In the ten years after, the whole country changed 41 laws, and three of those years had none. Over eighteen years after the first, the count was 54 laws. The year-one flood is the starting law being brought into line with the members' leanings all at once. After that a state changes only when an election changes its members. Your 40-state finish line is met in year one only, by the flood.
- **The results change nobody's life (read, reviewer confirmed).** Another state's law becomes a news item. The two parts of the game that carry a law to people both skip it (`src/core2/law-reach/host.ts:151`, `src/core2/modules/outcome-web.ts:723`). The one exception is a carbon price, which feeds national warming (`src/core2/modules/climate.ts:97`). I checked in a played year in Caño Martín Peña, Puerto Rico (measured): 54 other states and territories changed 473 laws, and the only records that mention any of them are 463 "law took effect" notices and 127 news records. The ten laws without a notice take effect after the year I ran ended. None of those records names a person.
- **The detail on demand has no door (read, reviewer confirmed).** The roll call for another state's vote is built correctly when asked (`src/core2/modules/world-legislating.ts:1548`). Nothing in the game asks. Only its own test ever asks for it.
- **The legislators are built at the opening anyway (measured).** A village in Vermont held 21,030 office-term records after one year, the largest table in the game, and 34,088 by year four. Your November 5 ruling said not to. On day one of a North Dakota game the Play as list offered 6,489 officeholders, among them 4,032 state representatives and 1,635 state senators from across the country. That list is of office records. I counted how many are kept as full people only in the Puerto Rico world: 716 of its 910 full people on day one were officials somewhere else. Another 139 lived in the town, 31 worked for the press and 24 were others.
- **Other states' budgets (read).** Each revenue line is now the published figure times a wage or price factor times a tax-rate factor (`src/core2/modules/outside-budgets.ts:125`). The tax rates it reads can never change in other states, so the rate factor does nothing. It is still a published budget scaled by a factor.
- **Washington (read and measured).** Congress runs the full bill process, but in that Puerto Rico year it introduced five bills: two on the minimum wage, one on a Medicaid work rule, one on an income tax and one budget. The Senate introduced none. The President nominates a cabinet and weighs one executive order (`src/core2/data/executive/federal-orders.json:5`). The federal courts module counts prisoners and hears no cases.
- **Other towns and counties (measured).** In that Puerto Rico year 130 bills were introduced in the whole world: 111 in the home legislature, 14 in the player's own municipal board and 5 in Congress. All 25 local sittings were the player's own board. No other town or county body met. The pool item for it is marked done (`docs/pool/items/gov-every-state-and-town-governs.md`).
- **National elections (read, not run).** Results are counted from simulated voters. They start from each county's 2024 result and move with the year's conditions. Seats can change hands (`src/core2/modules/voting.ts:5205`). I did not measure how often control of Congress changes.

### What a player sees

A Nation heading in the News with one-line items such as "Bottle deposit in New York became law." No screen opens another state, its governor, its legislature or its vote. A player cannot see a state turn, a governor rise or a neighbor's law pull people across the line.

### The gap and its root cause

The rest of the country is a one-time sort of the starting laws, shown as headlines. It does not move from its people, and what it does reaches no one. Root cause 1, plus root cause 2: the finish-line test passes on the year-one flood.

### Size of the fix: large, and it is the same fix as pillar 1

When every state is counted groups with a ledger, a state's opinion and economy exist to drive its legislature, and its laws have people to land on. Before that, two medium pieces are worth doing: let other states change amounts (taxes, wages, budgets), and add one States screen that opens any state's laws, governor and roll calls from the records already kept.

## Pillar 4: a played life has real history, real people and scenes with a purpose

### What you ruled

- October 14: "The world has a past. History does not start on the day the player generates in."
- October 15: "A scene has an endpoint. It exists for something: money, a bill, or the player's political life."
- November 8: "None of my history is simulated. I can't see anything that my character went through. No, a girlfriend or a car accident or college or whatever."
- November 8: "I guarantee you if I go to somebody, their history isn't simulated." And: "I'm Mexican and my son is white."
- November 8: "There's lots of irrelevant scenes popping up." And: "this is a terrible scene. And this should have been taken out of the game a long time ago."
- November 8: every kind working, then "30 different scenes within there."

### What the code does

- **The past holds six kinds of event (read).** Work spells, school stages and moves are run quarter by quarter from the birth year with no dice (`src/core2/past-work.ts:498`, `src/core2/past-school.ts:166`, `src/core2/past-moves.ts:171`). Family, a parent's death and a partner are drawn once at the opening (`src/core2/opening-kin.ts:358`). There are no illnesses, accidents, arrests, former partners, college years, wins or losses. I counted the records in the Puerto Rico world (measured). The town has 117 full adults aged 25 and up. Every one has a past, and it is thin: the typical one, a 51-year-old, has four jobs and one spell out of work, and nothing else. 115 of the 117 have a job record, 44 a family record, 21 a school record and one a move. The code runs school for everyone, yet 96 have no school record; I did not find out why. None has an illness, an accident, a college year, an arrest, a win or a loss.
- **A clicked person gets the same thin past (read).** Filling in a person runs the same work and school passes (`src/core2/modules/people.ts:561`). The day-one job agrees with the employer's books.
- **Family looks (read).** A household now shares one origin and a newborn takes one parent's origin (`src/core2/opening-origin.ts:155`). The crew's November 8 check found no origin record; one is on main now. A mixed couple cannot exist at the opening. No record explains a sibling's different surname.
- **99 kinds of scene (read, corrected by the reviewer).** Sixteen have no purpose and no reply tree. Ten more end keeping nothing. For 18, what they keep is a favor owed or a promise made that no engine reads (`src/director/data/stopgaps.json:436`). Promises in speeches, interviews and floor-vote asks are kept and used (`src/core2/modules/voting.ts:812`).
- **One version each (read).** Five families of scene have variants, 26 in all. The other 94 kinds play one arc.
- **Dev mode can directly cause 6 of the 99 kinds (measured).** For 92 it runs the world and waits, and one cannot be caused at all. I asked for four of the 92: a concession call, a farewell, an argument and a new friendship. Each ran a full game year and never happened.
- **What you asked for on November 8 (read).** Starting a movement, forming a task force, calling a hard meeting, a campaign trail around the state and a 15-person debate have no scene kind. Two doubt scenes exist.

### What a player sees (measured: Blodgett Landing, New Hampshire, a 17-year-old girl the game named Ray Kent)

- **The life is four lines.** Born 2007. Started school 2012. Middle school 2018. High school 2021.
- **The journal's third paragraph says one thing three times:** "Three years on, my mother started a new job. My mother got a new job. My mother Tonya works as a sales representative." It popped up during the President's address.
- **The mother's card says** "Has served as commissioner since 2022, reelected each time." The journal says she is a sales representative. At 8:30 p.m. the Travel screen places her at a supply company.
- **One person, two faces.** The You screen's bust has light brown hair and pale skin. The Your life tab shows a full figure with black hair and tan skin. Her mother's bust resembles neither of them.
- **Seven scenes in ten weeks. None had a purpose. Five were the "someone has news" kind: the mother's two and the stranger's three.**
  - A legislator "comes down the aisle to find you" and asks a high-school student, "Did the governor's speech sound like your district to you, Ray?"
  - Your mother, who lives with you, "stops in at the house" to say a county budget passed. Then: "Did you catch the President's speech?" "You and me both." "Then we agree on something for once." "I'll let you get back to it." That is the scene you rejected on November 8, unchanged.
  - Three times a stranger "walks up to you in the street" and asks, "Have you heard about Compass News Network?" The replies offered: "We'll manage. We always do." "I haven't heard." "Good. That's been a long time coming."
  - Your mother again: "Did you hear about WGBK-TV?" "I can't believe it." "That's what they're saying."
  - "You knock on Susan Kent's door. Your aunt has come to say goodbye." You went to her, yet she "has come." She says, "We're being evicted." You say, "How can I help?" She says, "I'd better get going." The scene ends.
- **Forced through dev mode (measured: As Matuis, Northern Mariana Islands):** I forced a serious illness on the player. The scene: "You've been seriously ill. Your mother sits down with you." "We need to talk." "I've heard those promises too many times." The replies were about the President. It was March 2026, 13 months after the address.

### The gap and its root cause

Three causes stack. The life record is too thin to tell (root cause 3). Scenes fire from any matching record, to anyone, and repeat (root cause 6): the "someone has news" scene played five times in ten weeks, and a floor scene went to a child. A scene with no lines of its own borrows the President's-speech talk (root cause 4).

### Size of the fix: medium to large

- Medium: a casting rule on every kind (who may receive it), a cap on repeats, and no scene without a purpose. Remove the borrowed small talk: a scene with no lines of its own does not play.
- Large: a life record. Each person keeps a short list of remembered events with who, what and what it changed, written by the engines that already run (health, justice, partnerships, school, elections) and by the past. The journal, the card, the You screen and the scenes all read that one list.

## Pillar 5: words sound like real people

The grading system has its own section below. This part covers what plays.

### What you ruled

- October 14: lines must sound like people talk; a reply's second move must follow from its first.
- October 15: "Nobody closes with 'Talk to you soon' after a question was answered." A yes or no never ends a talk.
- October 24: the opening speech "shouldn't be formulaic, and it should be customized to the world."
- November 8: "it's always good news. It's never bad news... Sometimes, you could have a Jimmy Carter, a crisis of confidence kind of thing."
- November 8: "instead of saying, you know, okay, that's great, you could say, all right, I got you, man."
- November 8: "This news is terrible. There's no information here."

### What the code does and what a player sees

- **The banks hold 10,612 lines in 21 files (read).** Scene talk is 6,707 of them. About 2,700 were written on November 8 and 9. Every line was written by a session. Twelve are marked as your voice.
- **Your phrasing (read).** "All right, I got you." appears 7 times among 6,707 scene lines. "Got you, man" appears nowhere.
- **The opening address (measured).** It now has moods and it did name bad news: "work has grown harder to find this year." It still reads as stock paragraphs in a row. Two back-to-back sentences say the same thing: "I begin this work with a glad heart... I took the oath with a light heart." One line is a law record printed as a sentence: "Federal law answers legal cannabis sales with a no."
- **The news (measured).** The lead story on day one: "Unemployment insurance program became law on January 15, 2025." It is a starting law printed as news. The briefs: "Income tax rate took effect on January 1, 2025," in New Hampshire, which taxes no wages. And "State campaign contribution limit: stateHouse took effect on January 1, 2025," with a code name on the page.
- **A talk that ends as soon as it starts (measured, forced through dev mode in As Matuis).** The player's mother, Deborah Meadows, said, "Your grandfather is seriously ill." I answered, "Oh, no. Give Bob my best." She said, "I'll talk to you later," and the scene was over.
- **Three replies as often as four (measured).** Of 14 sets of replies I was offered, 7 had three choices and 7 had four. Your rule is four, always.

### The gap and its root cause

The lines are grammatical and many are good alone. Together they do not sound like people, because nothing knows what the talk is about. Root causes 3 and 4.

### Size of the fix: large. See the grading section.

## Pillar 6: screens match your approved designs

### What you ruled

- November 7: You, the person card, Government and Budgets approved. "The 'you' section is exactly what i have been complaining about. just an excel sheet of facts." And: "on 'their life' again i said no timeline."
- November 7: "NONE OF THESE SUBTITLES ON MENUS." Busts, never full bodies: "we're going to keep the busts."
- November 8: "No arrows and no '1 of N' pages anywhere." "There's one date and there's one time."
- October 14, standing rule: replace, never layer.

### What the code does

Of the 72 defects from your November 8 playtest, on main today: 24 fixed, 20 partly, 15 not fixed, 13 that only a running game can settle (read, by a helper; I checked the ones below in the game).

- **Fixed and confirmed in the game:** the News date now follows the world's date. Patch notes are a list beside the detail. The loading bar is back with named steps. The glossary underlines work. Metrics shows real figures with "since last year."
- **Not fixed (measured):**
  - Races are still named by their holder: "Selectman (Brandon Reed)" (`src/bench/government.ts:479`).
  - The law page still prints "STATUTE 19 U.S.C. 1862; 19 U.S.C. 2411(c)(1)" (`src/bench/play.mjs:5070`).
  - Issues still shows 12 subjects with a "1" beside each.
  - New game is two bare words in a box with no busts. The creator opens as one large Start a life box with no figure in it until a gender is picked.
  - Join a party changes the tab to "Registered Republican since January 20, 2025." No scene plays and there is no headquarters to visit.
  - The opening still lands at 8:30 p.m. (`src/bench/opening.ts:11`).
  - Travel in a village of 128 people lists three markets and three kitchens and no town office.
- **Against your newest rulings (measured):** the You screen's Your life tab and the person card still draw a timeline (`src/bench/play.mjs:3157`). You approved a timeline on October 29 and withdrew it on November 7; the game shows the older design. Your life shows a full-body figure. The calendar still steps months with arrows (`src/bench/ui/calendar.mjs:201`). The bill page still has a "Back to the bills" button. Government has a caption line under the body's name.
- **The approved content is missing (measured against the mock).** Your approved You screen says: "I was born and raised in Latimer. I live with Marisol Vega on Pecan Street and work the warehouse floor at Gulf South. I'm running because the west side floods every spring." The game says: "I live in Blodgett Landing, New Hampshire. I was born in Blodgett Landing, New Hampshire in 2007." The approved trait line: "I haven't been late to a shift in five years." The game's: "Acts on impulse. I act on impulse." "What people say about me" is absent. "My people" is the names-with-relation list you called "still just the Excel lists."
- **One renderer per menu type is not met (read).** There are six ways to draw a person card and three ways to draw a face. Six list-beside-detail screens each build their own. The stylesheet carries the older framed-plate look under the newer strips look.

### The gap and its root cause

The layout arrived without the content. The content cannot be copied in, because it is made of specific life detail the simulation does not keep (root cause 3) and sentences the word engine cannot write (root cause 4). The leftovers are root cause 10.

### Size of the fix: small for the leftovers, blocked for the content

- Small, cheaper sessions: the not-fixed list above, deleting the timeline and full figures, one face per person everywhere, one list-beside-detail screen.
- The content of You and the person card waits on the life record in pillar 4.

## Pillar 7: a 20-year game finishes fast and fits in memory

### What you ruled

- November 8: "I would love if 20 years only took, 5 seconds... Click 20 years."
- November 8: "You're simulating, not generating. You're just writing things and making the history match."
- November 8: "every single thing that's measurable does not need to be measured for every single person."
- November 9: "I don't understand why it's taking so long to get rid of that memory problem for a 20-year run. Keep saying that it's been solved."
- November 8: "3 seconds is too slow," about one Week.
- October 29: "I want simulations to be able to go hundreds of years."

### What the code does

- **A 20-year game did not finish (measured).** South Hero, Vermont, a village, seed 9bf1ede27ce5a00e. The run crashed in year 12, after 16 minutes, with "Not in the wider population" when the press module tried to fill in a staff member who was no longer in the counts (`src/core2/modules/press.ts:3493`). This is a hard stop, not memory. I ran the same seed a second time and it crashed at the same line in the same year, with the same record counts, so it repeats.
- **Why it crashes (measured, traced on a third replay).** Lily Taylor ran for Vermont auditor in 2032 as a full person. Afterward the game returned her to the counted population to save memory. Her record was marked "returned to the counts," but no household for her existed in the counts. In November 2036 the town's TV station hired her. The press module then tried to bring its new hire back as a full person, could not find her household, and stopped the game (`src/core2/state.ts:2313`). Seven parts of the game call the same fill-in step directly (read), so any of them can hit this. People in this condition pile up in every world I checked (measured): ten after four years in the Oklahoma world, and seven after four years in a third world, Frankfort, South Dakota. This crash is not new. It has been an open, top-priority pool item since October 20, first seen in Bascom, Florida (`docs/pool/items/core-press-staff-counted-job-not-resident.md`). The crew's own 20-year run in Montpelier, Vermont stopped on it in year 19 on November 9, by their post on the thread. It has now stopped long runs in three places.
- **Years slow down and records pile up (measured, same run).** Year 1 took 30 seconds and kept 231,743 records. Year 10 took 108 seconds and kept 1,171,896. The fastest growing tables are per-place vote counts, every member's votes and office terms, most of them for places the player never sees. Memory after cleanup grew from 714 MB in year 1 to 1,770 MB in year 11.
- **A second world took 51 minutes for 19 years (measured).** Wickliffe, Oklahoma. My own time limit stopped it in year 20. Year 1 took 44 seconds and year 18 took 316. Thirteen of the 19 years ran over the 120-second bar. The first 15 years shared the machine with my other tests. The last four did not, and all four were over the bar, at 217 to 316 seconds. Memory after cleanup reached 2.9 GB. Full people grew from 930 to 3,981.
- **The long world stops making sense (measured, cause measured in its first year).** In that Oklahoma world the crew's own vital-statistics tool read 5.7% of adults at work at the opening, 125% after eleven years and 200% after eighteen. None of the three could be a real place. Median household earnings went from $40,665 to $120,056 in eleven years. I broke the count down household by household for the first year. The counted records cover the town and the county around it. At the opening they are 2,339 records standing for about 19,100 households; one record can stand for many households that are alike. Their 25,600 working-age adults hold about 1,550 jobs between them, or 6%, which agrees with the tool's 5.7%. So the county opens almost jobless. Each household's jobs are kept as a share, a number such as 0.4, tied to no particular adult. The same adults are also treated as jobless and looking. In year one 1,865 of them took a real job, and each hire added a whole job on top of the share. Nothing took the share away. After one year 1,576 of the 3,651 household records held more jobs than working-age adults. The records grew from 2,339 because households moved in and existing records were regrouped; I did not separate the two. Arrivals make it compound. A household that moves in is handed its new place's jobs per adult on arrival (`src/core2/modules/counted-moves.ts:1521`), and its adults then go looking and take real jobs as well. The game files these households under three place records. I did not look up which place each one is. In one of them that rate was already 1.5 after one year: 1,738 jobs for 1,124 adults. After three years the arrivals held 9,629 jobs for 5,551 working-age adults, 1.7 each and rising. The vital-statistics tool that reads these counts is the one that showed you "more people working, less poverty" on November 8.
- **Every full person is walked every day (read).** The day loop visits each full person daily (`src/core2/calendar.ts:126`). Drives and school loop over them too. A profile of that Puerto Rico year shows where the time goes (measured): 17% cleaning up memory, about 13% inside the record store itself, and 14% in deciding who runs for office, in a year with no election.
- **Off-screen campaigns are still played event by event (read).** A rival's town hall builds its audience one adult at a time and writes a row per listener (`src/core2/modules/campaigns.ts:3812`). Two cuts on November 9 grouped strangers for speeches, ads and mail.
- **Relationships are never removed (read and measured).** The code says so: "Ties are only ever added here, never removed" (`src/core2/state.ts:1320`). In Woods Cross the count went from 10,747 after one year to 23,158 and then 35,975.
- **The fast clock is not in the game (read).** A fast-forward exists as a switch that makes campaigns act a quarter as often (`src/core2/fast-forward.ts:14`). It is off, and only test scripts turn it on. Day, Week and the calendar all step day by day.

### What a player sees

In a village of 128 people a Week took 0.05 to 1.8 seconds, and a new game built in 9 seconds. That is the best case. In Woods Cross, Utah, a town of about 11,000, three years took 16 minutes with nothing else on the machine, which is a little over five minutes a year against a two-minute bar (measured). The crew's own report of November 8 put the later years of Montpelier, Vermont at four to twenty minutes each, with memory at 6.7 GB in year 10 (`docs/reports/speed-2026-11-08.md`). After a day of cuts, their latest run was at 3.9 GB in year 9. There is no "20 years" button.

### The gap and its root cause

The crew is shaving the day loop one table at a time. That will not reach seconds. Twenty years in seconds needs a second way of advancing time that keeps results and skips the telling. Root cause 5.

### Size of the fix: large

- Small, now: fix the year-12 crash and run one 20-year game to the end on main every night, so a crash or a nonsense world is caught the day it lands.
- Large: a results-first tier. Anything the player is not watching (rival campaigns, interviews, other towns' voters, other states' officials) keeps only its outcome and rebuilds detail when opened. Time then advances in months for that tier. Tables for places off screen stop existing. This is the same design as pillar 1's country tier and should be written as one.

## The words and grading system

You asked three questions. Each has a short answer and the evidence under it.

### Does a grade change what plays? Barely.

- **A bad grade on a line removes that one line (read).** A line you graded "bad" or "needs a fix," and never "good," is held back (`src/english/english-grades.ts:69`, `src/english/bank-parts.ts:30`).
- **Everything else is odds, and the odds favor the wrong lines (measured in the engine).** I ran the engine's own weight function over all 10,612 lines. A bad grade holds back 39 of them. The rest get a chance between 0.49 and 2.04 times a neutral line's. Lines you graded good sit near 1.4 to 1.6. But 73% of all lines sit above 1.1, graded or not, so a good grade barely stands out.
- **Lines from the scene you rejected, and lines like them, are boosted (measured in the engine).** "Then we agree on something for once" carries 1.44. "That's what they're saying" carries 1.52. "I'll talk to you later" carries 1.34. "I liked what the President had to say" carries 1.31. None is graded, so none is held back. All four sit in the top 36% of all lines by weight, well above a neutral line's 1.0.
- **How a grade spreads (read).** A grade also reaches other lines of the same kind: the same move (a thank-you, a threat), the same mood and the same setting, such as private talk or a public speech (`src/english/grade-reach.ts:67`). That reach moves a neighbor's odds by at most 20% down or 25% up (`data/english/calibration.json`, `reachFloor` and `reachCeiling`). It never removes or changes a line. This spreading is a separate measure from the weights above: it touches 36% of the lines, and the other 64% share no group with any graded line.
- **The whole record of your grading is 93 rows (measured).** 61 good and 32 bad. A row can cover more than one line piece, so the 93 rows touch 184 pieces. Of those, 118 are still in the banks: 79 graded good and 39 graded bad. Your October batches of voice notes, numbered up to 22, were boiled down to that. Nothing from November 8 or 9 is in it on main.
- **Odds mean nothing where there is one choice (measured).** Beyond removing a bad line, a grade can only shift the odds between the lines left, and most spots have one line. I counted each exact choice the engine makes as a spot: 3,186 of 5,661 spots have a single line, which is 56%. Two other counts group the spots differently. A helper's gives 491 of 2,713 and the crew's own gives 2,465 of 3,857. I use mine because it counts the choice the engine really makes.
- **The proof is in play (measured).** On November 9, the day after you called that scene terrible, "Then we agree on something for once" and "I'll let you get back to it" played in my Blodgett Landing game. "I liked what the President had to say" played in my As Matuis dev-mode session, in a game month 13 months after the address. None of the three carries a grade, so nothing holds them back.
- **The reach you ordered restored is restored (read).** The narrowing to one kind of scene is gone. A weaker form survives as one of six small weights.

### Does it learn your reasons? No. People hand-copy some of them.

- **Your reasons are stored as text nobody reads (read).** Every grade row has a note with your words. No game code and no check reads the note field.
- **Twenty-six of your reasons were hand-written as rules (read).** They are good rules: "reply follows the line before," "no filler," "stake is named," "names something specific" (`data/english/writing-rules.json`). Thirteen have a detector, a small test that spots the fault in a line. A detector changes a line's odds between 0.6 and 1.4 times. Thirteen have no detector; the file says the writer checks them.
- **The system's own to-do list is ignored (read).** The grade map flags 73 lines as bad enough to rewrite. Nothing reads that list except a message printed for developers (`scripts/dialogue-batch/grade-map.ts:230`).
- **A reason you give that matches no rule is lost (read).** "Nobody says that two weeks after a speech" has nowhere to go.
- **Liked lines were deleted, then restored and protected (measured).** The crew's check of November 8 found 28 of the 79 lines you had graded good gone, removed by rewrites. They have been put back: 79 lines carrying a good grade are in the banks today. A test now fails the build if one goes missing (`scripts/dialogue-batch/liked-lines-kept.test.ts`), and it passes.
- **Your newest grading is not in the game (measured).** Your notes on the new batches 2 and 3 became 44 and 42 grades. All 86 sit in open work that had not been added to the game when I read it. I fetched that work and ran the engine's grade function over it.

### What your newest batches change, once they are added (measured on the open work)

- **Your batch 3 lessons were taken to every bank, by hand.** "This town" appears in 78 lines in the game today and in none in the open work. "The list" with nothing before it goes from 22 lines to 1. "That's real" and its cousins go from 6 to 1. Held lines rise from 39 to 72. Six new rules were written from your words, each with a detector. This is the right direction and it is the first time one of your notes reached the whole bank.
- **It is still a person reading your note each time.** The session wrote nine lessons from your note and searched the banks for each by hand. Six of them became the new rules with detectors. By the session's own account one lesson was left undone: lesson 9, "Don't apologize, I should be apologizing to you," because no scene had that exchange. A later change that day added it, by the thread's account; I did not play it. Three things you said have no lesson at all. "Everybody in this room" is still in 14 lines, down from 18. "I'm for it" on an issue is still in 4 lines, 2 of them now held back. Your question about how "You remember earlier?" shows up in play has no answer.
- **What you say while playing still goes nowhere.** Every line from the scene you called terrible on November 8 is in the open work too, ungraded and not held: "I liked what the President had to say," "Then we agree on something for once," "I'll let you get back to it." You graded those by voice in a playtest, and only lines you grade in a written batch become grades.

### Do new lines obey your rules? Only the rules that are a banned word.

- **What is checked on every new line (read):** American spelling, nine developer words, about ten banned phrases ("talk to you soon," "see you later," "X is with you"), raw ids and dates, and length.
- **What is not checked (read):** a reply continues the conversation in scene talk; no cold "How is X?"; four replies; a scene has a stake; a second move follows the first; it sounds like a person; it sounds like you.
- **I ran the project's own banned-pattern list against ten lines (measured).** It blocked "Talk to you soon." and a bare "Yes." It let through the other eight: "I'll talk to you later.", "How is Bob?", "Okay.", "All right.", "Okay, bye.", "Have you heard about {outlet}?", "We'll manage. We always do." and "I liked what the President had to say."
- **What is already in the banks (measured).** 15 cold "How is X?" questions, 131 replies of one or two words, and 10 closers such as "I'll talk to you later."
- **So the 2,700 lines added in two days were checked for spelling and a short list of phrases, not for your rules.**

### The root cause

The engine picks lines from a bank and adjusts their odds. You have been describing a different machine since October 23: "every time I update a batch... it should update through the entire game." A weight cannot do that. A grade needs to become a rule, and a rule needs to act on every line: reject it, flag it for rewrite, or block a new one like it.

### Size of the fix: large, because a design comes first

1. **Turn every note into a rule with a detector, once.** Read all your voice notes and write each reason as a rule a program can test, by pattern where it can and by a reviewing model at development time where it cannot. The 26 rules are the start.
2. **Run every rule over all 10,612 lines after every grading.** A line that breaks a rule is pulled and queued for rewrite. This is the step that makes one grade reach the whole game.
3. **Gate new lines on the same rules.** A line that breaks one does not merge.
4. **Keep the check that protects lines you graded good.** It exists and passes today.
5. **Remove the fallback.** A scene whose own lines are missing does not play.
6. **Write lines from life records.** This waits on pillar 4's life record. Until a line can say what happened, it will stay generic however it is graded.

## Reported done that is not done

I checked each line below myself, in the game or in the code, as marked.

Each line gives the claim, then what I found.

1. **"The other states legislate; at least 40 change a law in a year."** True in year one only, as a one-time flood of 467 changes. Then 1, 15, 5, 15, 0, 1, 3, 1, 0 and 0 in the years after (measured).
2. **"A roll call and sponsor are built on demand for other states."** Built, and no screen or story can ask for it. Only its own test ever asks for it (`src/core2/state-sessions.test.ts:82`).
3. **"147 of 178 laws work end to end."** That counts reach records. I ran dev mode's reach control on the 147 state laws my sweep enacted, a different count from the crew's 147. It named a full person for 9 laws and a counted person for 2 (measured). The tests behind such a count pass bills through a step that adds riders (read). In my sweep about half the results were the rider's effect, not the law's (measured). The crew's law matrix also listed immigration, retirement ages and contribution limits as reaching nobody when engines do read them (`src/core2/modules/counted-moves.ts:193`).
4. **"Every town and state governs" (pool item marked done).** In a played year no town council or county board outside the player's own met (measured).
5. **"Dev mode can force 79 of 97 scenes."** The claim counted 97 kinds; today there are 99. Dev mode directly causes 6. For 92 it runs the clock and waits, and one cannot be caused at all. Four I tried never came in a year each (measured).
6. **"The 20-year memory problem is solved."** You said on November 9 that you keep hearing this. The crew's own last run was at 3.9 GB in year 9 against a 2 GB goal. My village run crashed in year 12, three times out of three (measured).
7. **"The economy is no longer steered."** The two national anchors are gone. The pull of each state toward the nation, the forcing of moves to match the Census and the fixed layoff pace remain (read). With both income taxes abolished, the population of the town's part of Utah, about 730,000 people, did not change by one person (measured).
8. **"The approved screens are in the game."** The frames are. The approved content is not, and the withdrawn timeline and full figures remain (measured).
9. **"The words carry your grades."** 93 rows. A bad grade removes one line; everything else only shifts odds, and lines from the scene you rejected on November 8 are weighted at 1.3 to 1.4 times a neutral line. Your newest notes are not on main (measured).
10. **"People's histories are simulated."** Work, school and moves are simulated. A 17-year-old's life is four lines, and a typical 51-year-old's whole past is four jobs and one spell out of work (measured).
11. **"The 'I liked what the President had to say' scene was fixed."** It played unchanged on November 9 (measured).
12. **"Pop-ups wait until a scene ends."** A journal pop-up appeared over the President's address (measured).
13. **"Dev mode is the proving ground."** Forcing a vote works. A bribe and the memory list work when called directly; on the screen the bribe panel cannot be read. The controls that prove an effect do not (measured). Reach read zero for a wage law and for a property tax. Trace gave no reason for any of 19 records. Most scenes can only be waited for, and "run until a bill passes" ran 400 days without stopping.
14. **The project's own scoreboards agree with you, not with the status reports.** The roadmap's feature list marks 21 of 67 features passing; "Laws change the world," "Other governments legislate," "History before your start," "Conversations" and "Speed and memory" are all marked not passing (`docs/roadmap/features.json`). The five lanes confirmed 6 of 64 played paths before you stopped them on November 4 (`docs/lanes/state/`).
15. **The pool says done 1,926 times.** 722 of its 3,096 items carry a send-back note, and 151 carry three or more (measured by search of `docs/pool/items`).

## Duplicate systems worth merging

I checked each item below in the code myself.

1. **Two worlds: the town's simulation and the formulas for everything else.** The national formula, the state formula, the forcing of moves to match the Census and the one-tally sessions of other states are a second engine for the same things the town engine does. This is the duplicate that matters most. See pillar 1.
2. **Counted copies of full rules.** Moves (`modules/counted-moves.ts`, 1,793 lines, beside `modules/moves.ts`, 1,775), births (`births-counted.ts`, 1,253 lines, beside three files for full people), money (`counted-money.ts` beside four payroll files), illness and news. Your rule is one model in two tiers. These are two models.
3. **Three answers to "what is the law now."** Listed in pillar 2.
4. **Six person cards and three ways to draw a face.** The cards are `memberCard`, `leaderBlock`, `personCardNode`, `candidate`, `townRow` and `savedLifeRow`; the faces are `headshot`, `bust` and `fillArtwork`, all under `src/bench`. This is how one character showed two faces on one screen.
5. **Six list-beside-detail screens that each build their own, two generations of panel, three kinds of tab strip.** Patch notes, Journal, Calendar, People, Travel and the Guide never call the shared list-and-detail parts (`src/bench/ui/roster-screen.mjs`, `src/bench/ui/split-screen.mjs`). The play screen still calls the older framed plate 8 times beside the newer strip section 47 times. The campaign screen builds its own tab strip (`src/bench/ui/campaign-acts.mjs:23`).
6. **Two proof tools that count different things (read).** Dev mode's reach control reads one family of records (`src/bench/dev-mode.ts:515`). The crew's test harness searches every record that names the law (`scripts/dev-tests/law-run.ts:57`). I ran both on the same 147 state laws (measured). Reach named a full person for 9 laws and a counted person for 2. The harness's search named the 175 people who voted, plus three more on 27 of the laws; I did not look up who the three are.
7. **Two fast-forwards, neither in the game.** The switch that makes campaigns act a quarter as often, and a planned monthly step that is not built.
8. **Three files that each say what places exist (checked by me).** `place-lookup.ts`, `places.ts` and `place-map.ts` in `src/core2`; the last calls itself "the one place map." The nine files named calendar are not duplicates; each keeps a different calendar.
9. **Scene fallbacks.** The President's-speech talk doubles as the filler for any talk without lines.

## Where cheaper sessions kept failing, and why

The pattern is the same in every area. A cheaper session is handed one item and finishes that item. The item is real. What goes wrong is the part of the game next to the item, which the item did not mention.

- **They fix the instance, not the class.** Your grade was applied to one scene. After the origin fix, one character still showed two different faces on one screen. A range check on people's ambitions was tuned to the test towns and then failed in at least six more places, by the pool item's own notes (`docs/pool/items/drives-displaced-prove-oneself-over-band-again.md`); I did not re-run it. The pool holds ten items about the press staff alone, and the crash among them still stops a long game. You called this out on November 5: "why are you just doing it to Mississippi? It should be everywhere."
- **They build beside instead of through.** A second lookup, a second copy for counted people, a new card. Each is faster than learning the existing one. You called it on October 27: "Sessions should not be building their own shit."
- **They prove with their own test.** A test that builds its own small world, forces the state it wants, or reads the record it just wrote. The scales for lying and the ban-the-box law were each proved in a situation the test set up by hand. I read both accounts in the night-crew thread: the scales were shown in "an empty conversation box with the scales set on, no person and no replies," and for ban-the-box the tester wrote, "In an ordinary played year at a place nobody chose, I find no read to show."
- **They report the record, not the screen.** "Wired" means a row exists.
- **They cannot hold your rulings.** The rulings log is 262,000 characters. A session reads the top and its item. That is why you keep re-ruling.
- **They port a design by its frame.** The approved You screen went in as layout, because the layout is what shows in a before-and-after comparison of the code.
- **They choose a pull or a fixed rate when a cause is hard.** A pull toward the real number passes a range check today. A cause formula takes design.
- **The process rewards merges.** About 600 merges in two days, at least eight builds on November 8 alone, main red several times that day, and builders told not to run the type check. Those come from the merge desk's notes, the game's own patch notes list, the night-crew thread and AGENTS.md. Speed of merging became the measure.
- **The measuring tools are themselves unchecked.** One vital-statistics reading of 125% employment went unnoticed.

Cheaper sessions can still do most of the work. What they are handed has to change.

### What truly needs top-level work

1. **The country tier and the results-first clock (root causes 1 and 5).** One design, written once. It decides what a state is, what is kept, what is rebuilt on open and how time advances. Every cheaper session that touches the economy, other states, speed or memory then builds to it.
2. **The life record (root cause 3).** What a remembered event is, which engines write it, and how the journal, cards and scenes read it.
3. **The words machine (root cause 4).** Turning your notes into rules that act on every line.
4. **The acceptance rule (root cause 2).** For each kind of work, what a second session must do in the running game before the word "done" is allowed. Dev mode is the place to do it; its reach and trace need to see everything first.

### What cheaper sessions can do well, with that in place

- The screens' not-fixed list and the deletions in pillar 6.
- Place facts: election days, town bodies and primaries, one state at a time against a checker.
- A Repeal action, an executive's bill menu, a "what this law did" page.
- Scene casting rules, repeat caps and variants, once a scene has a life record to read.
- Detectors for each writing rule, once the rules are written.
- Folding old tables, once the design says what is kept.

## What I ran, and what I could not verify

**Ran on main as of November 9, version 0.97.0:**

- A 20-year run without the screens, on a place and seed drawn at random: South Hero, Vermont. It crashed in year 12. I ran it three times, the third with the failing record captured, and it crashed the same way each time.
- A second 20-year world with my own readings each year: Wickliffe, Oklahoma, seed 8832429ff1e53841. It ran 19 years in 51 minutes without crashing before my time limit stopped it. Other work shared the machine for its first 15 years.
- A played life in the browser: Blodgett Landing, New Hampshire, a random world. Every menu, then ten weeks of Day and Week, with every scene recorded.
- Five dev-mode sessions. Four were mine: As Matuis and San Roque, Northern Mariana Islands; Savage Town, Virginia; and Bigelow, Arkansas. They covered two laws passed through real bodies at a chosen margin, one repeal, the reach, trace and memory controls, a bribe three ways, run-until for seven events, and seven scene requests: three caused directly and four waited for. A helper ran the fifth through the screens in Ten Broeck, Kentucky, with 136 screenshots.
- The law sweep: all 170 laws in dev mode's list at four bodies in Marion, Mississippi, seed 7df73e53cd67. The first place drawn had no town board, so I took the second. That is 720 bills with the second pass in Congress, each compared with the same world without the bill, and a repeal after each of the 223 that passed. A further pass checked 150 of the bills for a rider. One more twin run traced the county work requirement to its payer.
- A four-year count of people in the crash condition in two worlds: Wickliffe, Oklahoma, and Frankfort, South Dakota, seed cd7e15c74e5f7692.
- One year with my own readings and a record of where the time went: Caño Martín Peña, Puerto Rico, seed 50fe2d1143af.
- Six traces. Four state laws in Mississippi, followed past the next January 1. The crashing seed, replayed with the failing record captured. The Oklahoma world's jobs, split by household, then its first year again with every household record open. The Denver, Missouri tax raise, account by account against its twin. The wage bills in As Matuis and American Samoa, replayed with the bill records open. Your batch 2 and 3 grades, fetched from the open work and run through the engine's grade function.
- Six law bills against a twin world with the crew's own harness, in American Samoa and Denver, Missouri. Four passed and two were held in committee. I then ran a repeal bill for each of the four that passed. Two repeals passed and two failed.
- A twin-world tax test: Woods Cross, Utah, seed f61d987b2e0e, three years each, with and without the state and federal income tax.
- The engine's own grading functions over all 10,612 lines, and the project's own banned-pattern list against ten test lines.
- Three seats taken through Advanced, Play as, in Davenport, North Dakota: a council member, the mayor and a state legislator.
- The project's tests for liked lines and banned phrases. Both pass.
- The approved mock, rendered beside the game's screens.

**Read, not run:** everything marked "read." Eight helpers gathered file and line evidence. I checked their main claims in the code myself, and an independent reviewer tried to refute six groups of my claims. They cover the eight bullets marked "reviewer" or "corrected" in pillars 1 to 4. Four groups held, two of them with small corrections. Two were wrong as I first worded them, on routine layoffs and on unread promises. The report uses the corrected wording.

**Could not verify:**

- How many seeds reach the year-12 crash itself. Of the two long worlds I ran, one crashed and one reached year 19. The condition that causes it was present in all three worlds I checked for it, and the crew's own Montpelier run hit the crash in year 19.
- Why 96 of 117 town adults in the Puerto Rico world have no school record.
- In the Oklahoma world: how much of the growth in household records was arrivals and how much was regrouping, and which place each of the three place records is.
- Who the three extra people are that the crew's harness names on 27 of the state laws.
- Whether tying each job share to an adult stops the runaway jobs. The loop is measured in year one; proving the fix takes a code change, which this audit does not make.
- Why several laws in the sweep moved money the wrong way, why the same wage raise helped households from the statehouse and cost them from Congress, and where a sales tax raise's money goes once it leaves town. I measured each. I traced only the work requirement, and only as far as its payer.
- What budget lines, amounts with no value in force at a body, and the 60 grants of local power do once passed. The sweep proved only that they pass.
- Thirteen of your 72 playtest defects that a helper marked as needing a running game. I checked in the game only the ones named in pillar 6.
- Why two runs of the As Matuis world differed. One had a played character and one did not; I did not test whether that is the reason.
- Whether the ambition check still fails in the six places its pool item names. I read the item and did not re-run it.
- Whether the sweep's results hold in other places. It ran in one town, on one seed.
- A screen fault the helper reported: a state bill came back "vetoed" with the executive set to sign. The same call made directly enacts the bill, so the fault may be in the helper's script.
- How often Congress or a statehouse changes hands over 20 years.
- Speed and memory in a city; the largest place I ran had about 11,000 people.
- The history of fixes: this copy of the repository holds only November 9's commits, so I could not date any change.
- Anything on your Drive, and the Mac build itself. I played the same code through its browser screen.
