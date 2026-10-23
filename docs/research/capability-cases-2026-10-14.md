# Capability cases: forty real episodes against the engine (October 14, 2026)

None of the forty real episodes can run from start to finish in the engine today. Each is written below as causes and reads, checked against the engine modules, and the missing pieces are ranked at the end. The owner ordered this on October 14: no hard-coded scenarios; use real presidencies, politicians, corruption charges, books and films to stress-test the engine. Nothing in the game's code was changed. A machine-readable version holds the mechanisms only, with no proper names.

## What this says, in plain words

- The engine can produce the **front half** of a few of these cases. That means a bribe between two people with the money on the books, a recall started by a voter's grievance over an ordinance, a ballot measure that becomes law, a body's vote from members' own reasons, and a story carried to residents with a delay.
- It cannot yet produce **the back half of any of the forty**. Missing are someone investigating, the press choosing to run a story, voters weighing what they heard, a body removing a member, a successor being chosen, a pardon and a movement.
- **No dice found.** I searched the fourteen named modules for random draws, rolls and cutoffs and read the code that matters to these cases (corruption, the scandal path in the electorate, recalls' decision step, the news hand-off, offices' vacancy rule). None rolls. The one hash draw in `views.ts` seeds who someone is at the opening, which the no-dice rule allows. I name one **flag-that-flips** defect (D1), one **built-but-never-asked** defect (D2) and one **stand-in** (D3) below.
- The ten most useful missing causes or reads are in the last section, ranked by cases unlocked.

## How the sources were checked, honestly

Two Sonnet research helpers worked from web search. They saw search-result pages. They did **not** open primary documents (court records, inspector-general reports, the Congressional Record) in full. Every citation below is a page or reference actually seen in results. Where a primary document was found but not opened, the case says so. Items from memory are marked in each case's "open items". The JSON marks each case's source confidence: `secondary-seen` means search pages were seen. `mixed` means some facts are from memory. `fiction-mechanism` means the plot comes from summaries. `gap` means no measured source was found.

**Case 34 has no measured result**: I found no paper that measures the private-wage spillover of that raise, so its mechanism is a hypothesis; replace it if a measured natural experiment turns up. Case 16's separate electoral effect is not isolated by any source seen. No passages are copied; every line is a paraphrase.

## What the engines hold today (what I read)

| Engine (src/core2/modules)                  | What it holds that these cases need                                                                                                                                                                                    | What it does not                                                                                                                                          |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| corruption.ts                               | An offer and a take, each decided from traits, money, tie and need through the shared chooser; the payment on the cash journal; a record both parties know; a party may tell their closest contact after the tie sours | Nothing calls it in play (D2); only one crime kind (a bribe); no thing bought; no investigator; the telling is not a public record; surfaces by one route |
| interest-groups.ts                          | Employers losing under a fiscal note form a group, pay dues, lobby members who vote                                                                                                                                    | Only wage bills; no donations, no favors, no groups of other kinds                                                                                        |
| press.ts                                    | Local outlets sized from real counts; interviews with candidates; answers are promises on the record                                                                                                                   | No investigation, no tips, no editorial choice, no slant                                                                                                  |
| news.ts                                     | Any public record becomes a story for the place; residents hear by how much they follow politics; people retell                                                                                                        | One outlet per place (SG-P15-news-habits); every story weighs the same; no outlet trust or reach difference in the delivery                               |
| recalls.ts                                  | A resident's grievance over how a member voted on an ordinance starts a petition; neighbors sign; a vote removes                                                                                                       | Only local, only from an ordinance vote; the unnamed signers are a stand-in (SG-GOV-recall-signature-groups); no money, no performance causes             |
| ballot-measures.ts                          | A state measure put to every adult and to counted groups; passes by the state's rule; becomes law on its date                                                                                                          | No signature drive, no legislature reply, no suspension pending a vote                                                                                    |
| constituent-cases.ts                        | Wage and job problems brought to an official; help moves the resident's view                                                                                                                                           | No machine exchange; no other kinds of cases                                                                                                              |
| views.ts                                    | Opening lean from real survey cells including faith shares; stance moves by events with causes                                                                                                                         | No trust-in-an-official view; faith is a starting share, not an organization                                                                              |
| drives.ts                                   | Drives from events (cause, grudge, protect-family, status-ambition, calling); acts such as found a cause group, donate, confront a grudge target                                                                       | Several rows wait on engines that do not exist (its own gaps list); testify, run, lobby are not offered                                                   |
| legislature.ts / leadership.ts              | Bills, hearings, reasoned votes, veto and override; leadership races and committees                                                                                                                                    | No impeach, expel, censure, no-confidence                                                                                                                 |
| executive.ts                                | Appointments with confirmation; executive orders                                                                                                                                                                       | No clemency; no acting-succession                                                                                                                         |
| offices.ts                                  | Vacancies on death, move, resignation, removal, filled by the seat's rule                                                                                                                                              | The special-election path is a stand-in (SG-GOV-special-election-appointee)                                                                               |
| campaigns.ts                                | Acts that reach people; donations with contribution limits; polls                                                                                                                                                      | Limits are one rule per contest, not by source kind; no transfers, no reports, no violations                                                              |
| elections.ts / voting.ts / electorate-\*.ts | Filing, a vote by named adults from what they know, counted groups for the rest                                                                                                                                        | Scandal as a flag (D1); no approval record (D3)                                                                                                           |
| parties.ts                                  | Parties as organizations with members, leaders and rules; ties from views plus loyalty                                                                                                                                 | No discipline, no withdrawing a candidate, no counting votes                                                                                              |
| beliefs                                     | There is no beliefs module in `src/core2/modules`; views and the knowledge store are what hold beliefs today                                                                                                           |                                                                                                                                                           |

## Defects found in the existing engines

**D1: A flag that flips, with a flat price.** Where: src/core2/electorate-inputs.ts:165 (scandalOf), src/core2/electorate-blocks.ts:575, src/core2/data/electorate/parameters.json (scandalShare 0.05). A candidate is 'tainted' the moment one surfaced record of a taken bribe exists and loses a flat five points from the counted voter groups. It does not depend on how many voters heard of it, how popular the official is, what the economy is doing or how the press treated it. Named voters never read it (voting.ts holds no crime reference). It is a threshold with a constant, which the owner's 'sliding scales' rule forbids; named voters ignoring it also breaks 'an effect is a read'. Appears in cases: 2, 3, 4, 5, 10, 15, 16, 17, 18, 29.

**D2: The bribe engine is built and installed but never asked.** Where: src/director/play-modules.ts:38 registers it; src/core2/corruption.test.ts is the only caller of considerBribe. No engine in play offers or takes a bribe, so a played world holds no corruption record. It also surfaces by one route only (a sour tie), and the 'told' event is not a public record, so the news engine never carries it. Under 'wire to the world' this is an unregistered placeholder until U6 and U2 land. Appears in cases: 1, 2, 3, 4, 5, 6, 27, 35.

**D3: National mood has no approval record.** Where: src/core2/electorate-inputs.ts:99-101 (stopgap SG-GOV-electorate-approval). The mood is the economy plus a midterm penalty; no record of the president's approval exists to read. Every case with a popular official surviving, or an unpopular one falling, needs U4. Appears in cases: 11, 14, 15, 16, 17, 18, 19, 21, 30, 31, 39.

Not defects, noted: the recall petition starts only from the single most aggrieved resident and each signer or voter decides by a weighed sum above zero, which adds up smoothly across people; the signature requirement is law data, not a roll.

## The case table

| #   | Kind                                                                           | Mechanism (causes and reads)                                                                                                                                                                                                                                                                                                      | Engines that could produce part of it               | What is missing (gap codes, defects) | Source (first citation)                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | bribery: contractor kickbacks                                                  | Engineering firms paid cash to one executive through a chain from county to state to national office; a prosecutor squeezed the payers, their testimony made a trial likely, and the official traded resignation for a light plea.                                                                                                | corruption, offices                                 | U1, U6, U13, U19, U5 (D2)            | Spiro Agnew, Maryland contractor kickbacks and resignation, 1973 — UPI, "The fall of Spiro Agnew" (13 Oct 1973), upi.com/Archives/1973/10/13/The-fall-of-Spiro-Agnew/5948130122572                                                                              |
| 2   | bribery: contractor extortion and kickbacks (city)                             | A mayor steered water-department work to a friend's firm and leaned on other contractors for payments; years of lost trust, a perjury scandal and a long grand-jury probe ended in a racketeering conviction.                                                                                                                     | corruption, executive, news                         | U1, U2, U6, U3, U19, U5 (D1, D2)     | Kwame Kilpatrick, Detroit contract rigging and racketeering, 2002-2013 — Michigan Public, "Feds unveil corruption charges against Kwame Kilpatrick, his father and 3 others" (15 Dec 2010), michiganpublic.org (politics-government section, 15 Dec 2010 story) |
| 3   | bribery: lobbyist gifts for official acts                                      | A lobbyist bought trips, meals, tickets and donations for a member who then did favors for the lobbyist's clients; the lobbyist's own prosecution made him cooperate, the member's party leaders read the seat as lost and pushed him off the ballot.                                                                             | interest-groups, corruption, legislature, campaigns | U6, U1, U8, U5, U3, U2 (D1, D2)      | Jack Abramoff lobbying scandal and Rep. Bob Ney, 2000-2007 — New York Sun, "Ney sentenced to 30 months in Abramoff bribery" (Jan 2007), nysun.com/article/national-ney-sentenced-to-30-months-in-abramoff-bribery                                               |
| 4   | bribery: contractor padding in a machine; press exposé                         | A ring that controlled the city's contracts, payroll and nominations padded building bills; a member with a grievance leaked the ledgers, a newspaper and cartoonist made the sums legible to people who could not read, voters swept the slate, and a prosecutor outside the machine convicted the boss.                         | corruption, news, elections                         | U6, U2, U12, U1, U3, U9 (D1, D2)     | Tweed Ring, New York County courthouse, 1871 — American Heritage, "One Hundred and Twenty-Five Years Ago" (Tweed's trial), americanheritage.com/1873-one-hundred-and-twenty-five-years-ago-2                                                                    |
| 5   | bribery: system-wide kickbacks; party collapse                                 | A small-city arrest of a party official who was disowned by his leader made him confess; each confession gave prosecutors the next arrest until the ruling parties could not fill their rolls, and voters chose an outsider.                                                                                                      | corruption, parties, elections                      | U1, U6, U8, U2, U3, U5, U19 (D1, D2) | Italy, Mani Pulite / Tangentopoli, 1992-1994 — Il Post, "Tangentopoli: personaggi" (17 Feb 2022), ilpost.it/2022/02/17/tangentopoli-personaggi/                                                                                                                 |
| 6   | bribery: contractor-politician cartel; convictions later voided                | Plea bargains from cartel contractors convicted a leading politician and removed him from a race; years later higher courts read the procedure as flawed and voided the verdicts without re-deciding guilt.                                                                                                                       | corruption                                          | U1, U6, U8, U19, U13, U5 (D2)        | Brazil, Operation Car Wash (Lava Jato) and later annulments, 2014-2021 — Buenos Aires Herald, Supreme Court on Lula's imprisonment (2021), buenosairesherald.com/world/brazilian-supreme-court-calls-lulas-imprisonment-a-historical-mistake                    |
| 7   | patronage hiring; consent decree                                               | A voter's suit made political hiring and firing illegal, the city kept doing it informally, a bribery probe into truck contracts exposed the hiring files, and a judge imposed a monitor.                                                                                                                                         | executive, staff                                    | U9, U1, U13, U6, U10                 | Chicago patronage, Shakman decrees and the Hired Truck scandal, 1969-2005 — U.S. Attorney, N.D. Ill., press release on Hired Truck/hiring prosecution (18 Jul 2005), justice.gov/archive/usao/iln/chicago/2005/pr0718_01.pdf (seen, not opened)                 |
| 8   | nepotism: admissions favoritism for the connected                              | Trustees, legislators and donors put names on a tracking list; staff objected and were overruled; a newspaper obtained the list and a governor-named panel got sworn testimony that ended the careers of the administrators who ran it.                                                                                           | staff, executive                                    | U9, U2, U12, U13, U5                 | University of Illinois admissions "clout list", 2009 — NBC Chicago, "UofI admissions: not what you know but who" (2009), nbcchicago.com/news/local/uofi-admissions-not-what-you-know-but-who/1883444/                                                           |
| 9   | campaign-finance violation; conviction later reversed                          | A political committee collected corporate money that state law barred from candidates, sent it to a party committee, which sent the same total to chosen legislative candidates; a prosecutor read matching amounts and dates as laundering, a jury agreed, and appeals courts later read the statute narrowly.                   | campaigns                                           | U8, U1, U19, U13                     | Tom DeLay and TRMPAC, Texas, 2002-2014 — Wikipedia, "Tom DeLay campaign finance trial" (survey), en.wikipedia.org/wiki/Tom_DeLay_campaign_finance_trial                                                                                                         |
| 10  | campaign-finance: ad contracts kicked back to a party; inquiry; election loss  | A government paid ad firms linked to its own party large commissions for little work; an auditor's report and a new leader's inquiry put sworn testimony on television, opposition parties read it as grounds to bring the government down, and voters cut its seats.                                                             | campaigns, budgets                                  | U13, U8, U5, U2, U3, U6 (D1)         | Canada, Sponsorship scandal (Adscam), 1996-2006 — The Canadian Encyclopedia, "Sponsorship scandal (Adscam)", thecanadianencyclopedia.ca/en/article/sponsorship-scandal-adscam                                                                                   |
| 11  | recall that succeeded (governor)                                               | A governor re-elected months earlier saw approval collapse over a budget deficit and fee increases; a wealthy backer paid for signatures, a same-ballot slate of replacements made removal feel safe, and a majority removed him.                                                                                                 | recalls, ballot-measures, elections, campaigns      | U15, U4, U3, U18 (D3)                | Gray Davis recall, California, 2003 — Wikipedia, "2003 California gubernatorial recall election" (results survey), en.wikipedia.org/wiki/2003_California_gubernatorial_recall_election                                                                          |
| 12  | recall that failed (governor), after a labor law                               | A law limiting public-employee bargaining brought huge protests and an organized recall with 900,000+ signatures; the electorate that showed up matched the one that elected the governor, and he won by a slightly larger margin.                                                                                                | recalls, elections, campaigns, voting               | U11, U15, U10, U16, U8               | Scott Walker recall, Wisconsin, 2012 — Fox6 Milwaukee, "Walker declares victory in historic recall election" (5 Jun 2012), fox6now.com                                                                                                                          |
| 13  | ballot measure overturned a legislature; labor dispute                         | A law cutting public-sector bargaining was suspended when citizens gathered about 1.3 million signatures; unions and allies knocked on a million doors and the referendum repealed it by a wide margin.                                                                                                                           | ballot-measures, laws, law-effects, campaigns       | U15, U11, U10, U8                    | Ohio SB 5 / Issue 2, 2011 — Wikipedia, "2011 Ohio Issue 2", en.wikipedia.org/wiki/2011_Ohio_Issue_2                                                                                                                                                             |
| 14  | whistleblower; agency cover-up; outside researchers                            | A cost-saving switch in water source left pipes unprotected; a federal staffer's memo and independent researchers' data were dismissed by state agencies until doctors' blood-lead results made it undeniable, then a governor replaced officials and later faced charges.                                                        | executive, news, drives, views                      | U12, U13, U2, U1, U19, U4 (D3)       | Flint water crisis, 2014-2016 — Michigan Public, "Flint task force report says Snyder relied on bad information from state agencies" (23 Mar 2016), michiganpublic.org                                                                                          |
| 15  | press exposé that ended a career                                               | A front-running candidate who dared reporters to follow him was staked out after a tip; a published story and a photograph in days dried up money and staff and ended the campaign within the week.                                                                                                                               | press, news, campaigns                              | U2, U3, U4 (D1, D3)                  | Gary Hart, 1987 — American Heritage, "30 years ago: Gary Hart's monkey business", americanheritage.com                                                                                                                                                          |
| 16  | press exposé that fizzled                                                      | A major newspaper reported low tax payments and heavy debt of a candidate; voters who had already decided read it through their party and the poll lead did not move.                                                                                                                                                             | news, views, campaigns                              | U2, U3, U4 (D1, D3)                  | New York Times reporting on a president's taxes, Sept 2020 — Asia Times, "Tax bombshell has Trump on defensive before debate" (Sep 2020), asiatimes.com/2020/09/tax-bombshell-has-trump-on-defensive-before-debate/                                             |
| 17  | scandal survived by a popular official                                         | A strong economy and a public that read the investigation as overreach kept the president's approval high through impeachment, rewarded his party at the midterm, and left the upper chamber short of the two-thirds needed to remove him.                                                                                        | legislature, views, voting                          | U5, U4, U3, U1, U13 (D1, D3)         | Bill Clinton impeachment, 1998-1999 — Gallup, "Presidential job approval: Bill Clinton's high ratings in the midst of scandal", news.gallup.com/poll/4609                                                                                                       |
| 18  | scandal survived: conviction, then re-election                                 | A mayor caught in a sting served time, then won a ward seat by a landslide and the mayoralty four years later against an unpopular successor, because his base read the sting as entrapment and the city's voters wanted him over the alternative.                                                                                | constituent-cases, voting, elections                | U3, U4, U10 (D1, D3)                 | Marion Barry, 1990-1994 — Wikipedia, "1994 Washington, D.C., mayoral election" (results), en.wikipedia.org                                                                                                                                                      |
| 19  | resignation of a chief executive                                               | A court ordered recordings handed over, one tape proved the president had lied, and senators of his own party counted votes and told him he would be convicted, so he resigned.                                                                                                                                                   | offices, executive                                  | U5, U1, U13, U4, U7, U2 (D3)         | Richard Nixon, resignation, 1974 — United States v. Nixon, 418 U.S. 683 (1974), govinfo.gov/content/pkg/USREPORTS-418/pdf/USREPORTS-418-683.pdf (found, not opened)                                                                                             |
| 20  | expulsion from a legislature                                                   | After a jury convicted a member of bribery, racketeering and tax evasion, the ethics panel found nine violations and recommended expulsion, and the full chamber voted nearly unanimously to expel him.                                                                                                                           | legislature, leadership, offices                    | U5, U1, U13                          | James Traficant, expulsion, 2002 — Tampa Bay Times, "House votes 420-1 to expel Traficant" (25 Jul 2002), tampabay.com/archive/2002/07/25/house-votes-420-1-to-expel-traficant/                                                                                 |
| 21  | pardon                                                                         | An unelected successor pardoned his predecessor before any charge, most voters read it as a deal, approval fell about twenty points at once and his party lost heavily at the midterm, with the memory fading over a decade.                                                                                                      | executive, views                                    | U14, U4, U3, U19 (D3)                | Gerald Ford's pardon of Richard Nixon, 1974 — Gallup Vault, "Pardon took a decade to forgive", news.gallup.com/vault/218198/gallup-vault-pardon-took-decade-forgive.aspx                                                                                        |
| 22  | sudden death in office and local succession                                    | A mayor was killed by a former board member he refused to reappoint; the charter made the board's president acting mayor that day, the board then elected her permanent mayor by the narrowest majority, and the crisis appointment became incumbency.                                                                            | offices, leadership                                 | U7, U16, U5                          | Moscone assassination and Feinstein succession, San Francisco, 1978 — Wikipedia, "Assassinations of George Moscone and Harvey Milk", en.wikipedia.org                                                                                                           |
| 23  | sudden death in office; contested succession                                   | A mayor's sudden death with no clear heir let a council split between his reform bloc and the old organization pick a compromise successor overnight; crowds read it as the machine's return and demanded a special election.                                                                                                     | offices, leadership, legislature, parties           | U7, U16, U9, U10                     | Harold Washington's death and the council's succession vote, Chicago, 1987 — Christian Science Monitor, "Chicago's new mayor" (3 Dec 1987), csmonitor.com/1987/1203/agene.html                                                                                  |
| 24  | demagogue's rise from a movement                                               | A governor used state appointments, contracts and a loyal legislature to build a machine, then turned mass anger at a depression into a national club movement with a simple program; he used state power against a judge and was killed by the judge's relative, after which the opposing president took in much of the program. | speech, drives, executive, legislature              | U10, U16, U9, U17                    | Huey Long, Share Our Wealth, 1928-1935 — History.com, "Huey Long", history.com/topics/great-depression/huey-long                                                                                                                                                |
| 25  | dynasty's second generation riding a movement                                  | A candidate who had lost a brother told a crowd of a leader's killing in plain words, kept one city calm that night, and carried a coalition of Black and white working-class voters to primary wins until he was shot, after which delegates went to party organizers.                                                           | speech, campaigns, views                            | U17, U10, U16                        | Robert F. Kennedy, Indianapolis speech and the 1968 primaries — Indiana Humanities, "A fateful year: Robert Kennedy" (2011), indianahumanities.org/2011/04/06/a-fateful-year-robert-kennedy/                                                                    |
| 26  | dynasty return; online campaign                                                | The son of an ousted ruler won by double his rival's votes after a campaign that reshaped the family's story online and allied with a popular outgoing president's family, while decades-old wealth cases stalled in court.                                                                                                       | campaigns, speech, views                            | U17, U2, U10, U19                    | Ferdinand "Bongbong" Marcos Jr., Philippines, 2022 — Philippine Daily Inquirer, unofficial count (May 2022), newsinfo.inquirer.net/1596526                                                                                                                      |
| 27  | dynasty heir; influence-peddling scandal; impeachment                          | The daughter of a former ruler, elected on that name, gave an unelected friend access to speeches and documents and helped extract money from conglomerates; a television broadcaster read leaked files, parliament impeached and the top court removed her unanimously.                                                          | corruption, news, parties                           | U17, U2, U5, U16, U13, U1, U14 (D2)  | Park Geun-hye, South Korea, 2012-2021 — Wikipedia, "Impeachment of Park Geun-hye", en.wikipedia.org                                                                                                                                                             |
| 28  | faith-driven vote bloc                                                         | Pastors registered church members around school, tax and moral issues, evangelicals who had backed a born-again candidate in one election moved about twenty-five points in the next, and the effect varied with how strongly the local organizing reached them.                                                                  | views, drives, campaigns, voting                    | U10, U17                             | Moral Majority and the 1980 evangelical bloc — NBER working paper w32551, on the 1980 evangelical shift, nber.org/system/files/working_papers/w32551/w32551.pdf                                                                                                 |
| 29  | press exposé shifting a faith-heavy bloc; turnout composition                  | A newspaper's report of allegations that a candidate pursued teenagers divided voters by whether they believed it: about half did and almost all of them chose his opponent, while small rural counties of the candidate's own party turned out far less and Black voters turned out heavily.                                     | news, press, views, voting                          | U2, U3, U10, U8 (D1)                 | Alabama special Senate election, 2017 — Encyclopedia of Alabama, "2017 Alabama special Senate election", encyclopediaofalabama.org                                                                                                                              |
| 30  | labor dispute that swung an election                                           | A government pay limit met strikes by public-sector workers through a cold winter; satisfaction with the government fell to 17 percent, a no-confidence motion passed by one vote and the opposition won a clear majority.                                                                                                        | jobs, work, voting                                  | U11, U5, U4, U3 (D3)                 | Britain, the Winter of Discontent and the 1979 election — Wikipedia, "1979 United Kingdom general election" (results), en.wikipedia.org                                                                                                                         |
| 31  | tax revolt; party removes its leader                                           | A flat per-adult local tax replaced a property-based one; non-payment spread, a large demonstration ended in riots, her own party's members of the legislature read polls as losing their seats, forced a second leadership ballot, and cabinet colleagues told her to go.                                                        | budgets, parties                                    | U18, U5, U16, U4, U10 (D3)           | Britain, the Poll Tax revolt and the fall of the prime minister, 1989-1990 — EBSCO Research Starters, "British riot over poll tax", ebsco.com/research-starters/history/british-riot-over-poll-tax                                                              |
| 32  | tax revolt by ballot measure                                                   | Rising home assessments in a decade of inflation left homeowners with tax bills they could not pay while the legislature did nothing; an initiative capped the property tax and limited growth, passed by about two to one and cut local property revenue by more than half, pushing local governments to fees.                   | ballot-measures, budgets, laws                      | U18, U15, U10                        | California Proposition 13, 1978 — California Budget Center, "Proposition 13: its impact on California and implications" (1997), calbudgetcenter.org                                                                                                             |
| 33  | public-salary scandal; press exposé; recall and law change                     | A small city's manager and part-time council set salaries many times their peers' and no outside body read the numbers until a reporter requested the records; within days the state's attorney general subpoenaed files and within ten weeks charged eight officials.                                                            | staff, budgets, recalls, news                       | U2, U13, U1, U11, U15                | Bell, California, salary scandal, 2010 — Wikipedia, "City of Bell scandal", en.wikipedia.org/wiki/City_of_Bell_scandal                                                                                                                                          |
| 34  | public-salary change that moves private wages                                  | A large one-time raise to government pay raises the outside option of skilled workers and so may raise private wages where labor markets are tight, though in a slack market the spillover was reported as small.                                                                                                                 | jobs, work, budgets, laws                           | U11                                  | India's Sixth Pay Commission and private wages (evidence gap) — 15th Finance Commission study, "Pay Commissions: fiscal implications", fincomindia.nic.in (a regression with pay-commission-year dummies; found, partly read)                                   |
| 35  | selling an appointment; impeachment and removal; commutation                   | A governor with sole power to fill a vacant national seat was recorded trying to trade it; arrest came before the appointment, the legislature impeached and removed him almost unanimously within weeks, and a later president cut the sentence.                                                                                 | executive, offices, legislature, corruption         | U1, U5, U6, U7, U14, U13 (D2)        | Rod Blagojevich, Illinois, 2008-2020 — CBS News, "In 59-0 vote, Blago removed from office" (29 Jan 2009), cbsnews.com                                                                                                                                           |
| 36  | fiction: populist rise, machine use and fall (mechanism only)                  | A local official used as a decoy learns he was a pawn, turns to blunt appeals to ordinary people, wins the governorship, rules by contracts and favors, and falls when an aide's dirt on a rival and a private affair each push a relative of the harmed party to act.                                                            | executive, legislature, drives                      | U10, U9, U6, U16, U12                | Fiction: All the King's Men (novel, 1946) — Robert Penn Warren, All the King's Men (Harcourt, Brace, 1946)                                                                                                                                                      |
| 37  | fiction: old machine mayor's last campaign (mechanism only)                    | An aging mayor whose machine runs on jobs, favors and personal contact loses to a young rival when a publisher opposes him, the old establishment funds the rival, younger voters no longer need his favors and television changes how campaigns reach them.                                                                      | constituent-cases, executive, campaigns, press      | U9, U10, U2, U17                     | Fiction: The Last Hurrah (novel, 1956) — Edwin O'Connor, The Last Hurrah (Little, Brown, 1956)                                                                                                                                                                  |
| 38  | journalism film: an investigative team targets an institution (mechanism only) | A new editor points a reporting team at the institution instead of individual abusers; court records and survivors show that leaders knew and moved offenders for years, readers respond with their own accounts, and the leader resigns within the year.                                                                         | press, news, drives                                 | U2, U12, U13, U1, U19                | Film: Spotlight (2015) and the Boston Globe series — Spotlight (dir. Tom McCarthy, 2015)                                                                                                                                                                        |
| 39  | recall that succeeded (local prosecutor)                                       | Business donors and neighborhood groups who read crime numbers as the prosecutor's failure paid for signatures, the recall went on a low-turnout primary ballot, a majority removed him, and the mayor named the successor.                                                                                                       | recalls, campaigns, executive                       | U15, U8, U4, U7 (D3)                 | Chesa Boudin recall, San Francisco, 2022 — Wikipedia, "2022 San Francisco District Attorney recall election", en.wikipedia.org                                                                                                                                  |
| 40  | whistleblower                                                                  | Officers who reported graft to superiors and city officials were ignored for years by supervisors who benefited, until a reporter's series made it a political danger for the mayor, who created a commission; hearings changed the commissioner and the rules.                                                                   | staff, news                                         | U12, U2, U13, U1, U16                | Frank Serpico and the Knapp Commission, New York, 1970-1972 — Wikipedia, "Knapp Commission", en.wikipedia.org/wiki/Knapp_Commission                                                                                                                             |

Gap codes are defined in the last section.

## The cases in full

### 1. Spiro Agnew, Maryland contractor kickbacks and resignation, 1973

**Kind:** bribery: contractor kickbacks. **Level:** local/state/federal. **Era:** 1960s-1973. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Firms want repeat public work; the official wants cash and gets it from people who owe their business to his office; middlemen skim and carry.
- _Money:_ Cash in envelopes, a fixed share of each contract, over about a decade, through the same few payers.
- _Standing:_ Rose from county to state to national office with the payments continuing; the national party leader was already weakened by his own scandal and wanted him gone.
- _Law in force:_ Bribery and extortion statutes plus a tax law that makes unreported income a crime; leniency and immunity let payers trade testimony for safety.
- _The act:_ Repeated cash payments for awards of public engineering work.
- _Who could have known:_ The payers, the middlemen and the official; no outsider.
- _What read it afterward:_ A federal prosecutor who squeezed payers with their own tax exposure; the official's lawyers; the party leader.
- _Delay between act and consequence:_ Payments began about a decade before; a probe opened in the year of the plea; plea within months of the probe becoming known to the target.
- _Sliding factors:_ How many payers would testify and how much leniency each was offered; Whether the official's own party leader still needed him; Weight of documentary evidence against cash-only dealings.

**Capability check.** Holds part of it: corruption, offices. Missing:

- U1: Investigators and charging
- U6: Make the bribe buy something
- U13: Oversight bodies, audits and inquiries
- U19: Records that stay readable for years
- U5: Removal and pressure inside bodies and parties
  Defects: D2.

**Citations.**

- UPI, "The fall of Spiro Agnew" (13 Oct 1973), upi.com/Archives/1973/10/13/The-fall-of-Spiro-Agnew/5948130122572
- UPI, "Agnew ordered to repay bribes" (27 Apr 1981), upi.com/Archives/1981/04/27/Agnew-ordered-to-repay-bribes/8124357192000/
- Charging information (D. Md., Oct 1973) exists in the CIA reading room, cia.gov/readingroom/document/cia-rdp77-00432r000100250001-9 (found, not opened)

**Open items:** Charging document not opened; dates of payments from news summaries.

### 2. Kwame Kilpatrick, Detroit contract rigging and racketeering, 2002-2013

**Kind:** bribery: contractor extortion and kickbacks (city). **Level:** local. **Era:** 2002-2013. **Source confidence:** mixed.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ A mayor who rewards his circle; a friend-contractor who wants every large job; outside contractors who pay to stay in the game.
- _Money:_ Large utility contracts steered to one firm; payoffs and subcontract shares passed back up to the mayor's circle.
- _Standing:_ Re-elected once despite earlier allegations; the collapse came when private messages proved a sworn denial false.
- _Law in force:_ Perjury, extortion, racketeering and bid-rigging statutes; a department that awards by a bidding rule the mayor could bend.
- _The act:_ Rigging awards and demanding payments from bidders over several years.
- _Who could have known:_ Contractors, department staff, the friend; the press suspected, the public heard only pieces.
- _What read it afterward:_ A multi-year grand jury; reporters who obtained the private messages; the council; voters.
- _Delay between act and consequence:_ Acts about 2002-2008; indictment 2010; verdict 2013 (five or more years).
- _Sliding factors:_ Popularity at the first re-election; Whether a document (the messages) made denial impossible; Whether any insider turned witness.

**Capability check.** Holds part of it: corruption, executive, news. Missing:

- U1: Investigators and charging
- U2: Surfacing to the press, and the press's choice
- U6: Make the bribe buy something
- U3: Voters read scandal as what they heard
- U19: Records that stay readable for years
- U5: Removal and pressure inside bodies and parties
  Defects: D1, D2.

**Citations.**

- Michigan Public, "Feds unveil corruption charges against Kwame Kilpatrick, his father and 3 others" (15 Dec 2010), michiganpublic.org (politics-government section, 15 Dec 2010 story)
- Governing / McClatchy-Tribune, "Former Detroit mayor found guilty" (2013), governing.com/archive/mct-former-detroit-mayor-found-guilty.html
- CBS Detroit on later restitution judgment (cbsnews.com/detroit/news/former-detroit-mayor-kwame-kilpatrick-friends-owe-another-7-4m-in-restitution)

**Open items:** Federal press release not opened. The 2008 text-message perjury and resignation come from background knowledge, not a source seen.

### 3. Jack Abramoff lobbying scandal and Rep. Bob Ney, 2000-2007

**Kind:** bribery: lobbyist gifts for official acts. **Level:** federal. **Era:** 2000-2007. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ A lobbyist paid by clients to win results; a member who likes the perks and the access; staff who carry the asks.
- _Money:_ Gifts, travel, tickets, meals and campaign donations, from the lobbyist's circle, each small, together large.
- _Standing:_ A senior member in a committee that mattered to the clients; the party in a year when it faced its hardest challenge in a decade.
- _Law in force:_ Federal bribery and gift rules; disclosure of lobbying; ethics rules on gifts and travel.
- _The act:_ Official acts (a statement in the record, a letter, a vote) in return for gifts and donations.
- _Who could have known:_ The lobbyist, the member, staff and clients; later the lobbyist's emails.
- _What read it afterward:_ Prosecutors with the lobbyist's cooperation; party leaders counting seats; the press; the district's voters.
- _Delay between act and consequence:_ Acts about 2000-2004; exposure 2004-05; withdrawal from ballot Aug 2006; plea Oct 2006; sentence Jan 2007.
- _Sliding factors:_ National swing against the member's party in the election year; Seat's partisan lean; Cooperation of the lobbyist.

**Capability check.** Holds part of it: interest-groups, corruption, legislature, campaigns. Missing:

- U6: Make the bribe buy something
- U1: Investigators and charging
- U8: Campaign money as law-bound flows
- U5: Removal and pressure inside bodies and parties
- U3: Voters read scandal as what they heard
- U2: Surfacing to the press, and the press's choice
  Defects: D1, D2.

**Citations.**

- New York Sun, "Ney sentenced to 30 months in Abramoff bribery" (Jan 2007), nysun.com/article/national-ney-sentenced-to-30-months-in-abramoff-bribery
- Jurist, "Former Ohio congressman gets 30 months" (Jan 2007), jurist.org/news/2007/01/former-ohio-congressman-gets-30-month/
- PBS NewsHour, Ney withdraws from re-election (Aug 2006), pbs.org/newshour/politics/politics-july-dec06-ney_08-07
- Christian Science Monitor (8 Aug 2006), csmonitor.com/2006/0808/p04s01-uspo.html

**Open items:** The national House result of Nov 2006 was not retrieved here.

### 4. Tweed Ring, New York County courthouse, 1871

**Kind:** bribery: contractor padding in a machine; press exposé. **Level:** local. **Era:** 1860s-1873. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ The ring wants cash and permanent control; contractors want inflated work; a jilted insider wants revenge.
- _Money:_ Bills inflated by a large multiple and the excess split back to the ring.
- _Standing:_ Absolute inside the city organization: nominations, courts, payroll and contracts; weak with the reform press and the state's party.
- _Law in force:_ A city charter that put spending in few hands; criminal statutes with no outside auditor reading the books.
- _The act:_ Padded contracts and kickbacks over several years.
- _Who could have known:_ The ring, contractors and clerks; many ward leaders suspected.
- _What read it afterward:_ A rival newspaper and a political cartoonist; a lawyer named special prosecutor; voters at the next election; a court.
- _Delay between act and consequence:_ Built in the 1860s; leak and exposé in the autumn of 1871; arrest weeks later; conviction 1873.
- _Sliding factors:_ Hard numbers (copies of the ledgers) rather than rumor; Reach of the image to non-readers; Whether the prosecutor owed nothing to the machine; Margin by which the slate lost the next election.

**Capability check.** Holds part of it: corruption, news, elections. Missing:

- U6: Make the bribe buy something
- U2: Surfacing to the press, and the press's choice
- U12: Insider reports and what happens to the reporter
- U1: Investigators and charging
- U3: Voters read scandal as what they heard
- U9: Patronage and merit rules
  Defects: D1, D2.

**Citations.**

- American Heritage, "One Hundred and Twenty-Five Years Ago" (Tweed's trial), americanheritage.com/1873-one-hundred-and-twenty-five-years-ago-2
- Britannica, "Boss Tweed", britannica.com/biography/Boss-Tweed
- New York State Courts history, People v. Tweed, history.nycourts.gov/case/tweed-liscomb/

**Open items:** Amounts of the courthouse padding were not verified; trial counts differ between sources.

### 5. Italy, Mani Pulite / Tangentopoli, 1992-1994

**Kind:** bribery: system-wide kickbacks; party collapse. **Level:** other democracy. **Era:** 1992-1994. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Parties fund themselves by taking a share of public contracts; firms pay to be allowed to work; a caught man who feels abandoned by his own side talks.
- _Money:_ A fixed percentage of public contracts, collected for the party and for individuals.
- _Standing:_ Dominant coalition for decades; the leader's public disowning of the first man caught turned a loyal subordinate into a witness.
- _Law in force:_ Bribery and illegal party financing statutes; pretrial detention that gave prosecutors leverage; parliamentary immunity that was lifted by vote.
- _The act:_ Routine collection of kickbacks tied to contract awards.
- _Who could have known:_ Nearly every firm and party treasurer in the sector.
- _What read it afterward:_ A prosecuting team; the press; the legislature voting on immunity; voters at the next national election.
- _Delay between act and consequence:_ Practice ran for decades; first arrest in early 1992; parties dissolved 1993-94.
- _Sliding factors:_ Whether each new confession lowered the cost of the next; Party leader's reaction to the first arrest; Collapse of the party vote in local elections that followed.

**Capability check.** Holds part of it: corruption, parties, elections. Missing:

- U1: Investigators and charging
- U6: Make the bribe buy something
- U8: Campaign money as law-bound flows
- U2: Surfacing to the press, and the press's choice
- U3: Voters read scandal as what they heard
- U5: Removal and pressure inside bodies and parties
- U19: Records that stay readable for years
  Defects: D1, D2.

**Citations.**

- Il Post, "Tangentopoli: personaggi" (17 Feb 2022), ilpost.it/2022/02/17/tangentopoli-personaggi/
- Wikipedia, "Mani pulite" (survey; not primary), en.wikipedia.org/wiki/Mani_Pulite
- Italy On This Day, Mani Pulite entries, italyonthisday.com

**Open items:** Arrest and investigation counts are secondary-source figures.

### 6. Brazil, Operation Car Wash (Lava Jato) and later annulments, 2014-2021

**Kind:** bribery: contractor-politician cartel; convictions later voided. **Level:** other democracy. **Era:** 2014-2021. **Source confidence:** mixed.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ State-linked contractors pay for contracts; politicians and parties take shares; defendants trade confessions for sentences.
- _Money:_ Percentages on very large public contracts routed through accounts and intermediaries.
- _Standing:_ A popular ex-leader leading polls; a trial judge whose reputation rose with each conviction.
- _Law in force:_ Plea-bargain rules; jurisdiction rules about which court may hear what; rules on a judge's impartiality.
- _The act:_ Cartel payments and kickbacks across many contracts over a decade.
- _Who could have known:_ Contractors, intermediaries, party treasurers.
- _What read it afterward:_ A task force, a trial judge, appeals courts, later a higher court reading the same record under different rules; voters who saw a candidate removed.
- _Delay between act and consequence:_ Investigation from 2014; convictions 2017-18; annulments from 2021 (years later).
- _Sliding factors:_ Composition of the reviewing court; Which court had jurisdiction; Whether confessions were read as free or coerced.

**Capability check.** Holds part of it: corruption. Missing:

- U1: Investigators and charging
- U6: Make the bribe buy something
- U8: Campaign money as law-bound flows
- U19: Records that stay readable for years
- U13: Oversight bodies, audits and inquiries
- U5: Removal and pressure inside bodies and parties
  Defects: D2.

**Citations.**

- Buenos Aires Herald, Supreme Court on Lula's imprisonment (2021), buenosairesherald.com/world/brazilian-supreme-court-calls-lulas-imprisonment-a-historical-mistake
- MST, "From jurisdiction to a judge's misconduct" (Mar 2021), mst.org.br/2021/03/19/from-jurisdiction-to-a-judges-misconduct-what-will-clear-lula-in-corruption-cases/
- DN Portugal on annulment of decisions in the contractor's case, dn.pt (2021 or later)

**Open items:** Final ruling on the trial judge's partiality and the dates of later annulments not confirmed.

### 7. Chicago patronage, Shakman decrees and the Hired Truck scandal, 1969-2005

**Kind:** patronage hiring; consent decree. **Level:** local. **Era:** 1969-2005. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Ward leaders and the mayor's office pay for precinct work with city jobs; job holders owe their jobs and work for the organization.
- _Money:_ Salaries from the public payroll as payment for campaign work and turnout; bribes from firms for contracts.
- _Standing:_ A machine with decades of electoral wins; its enforcement was by an honor system.
- _Law in force:_ A consent decree banning political firing and hiring for non-policy jobs; contempt power.
- _The act:_ Hiring and promoting on recommendation from party officials, with the paper trail disguised.
- _Who could have known:_ Department heads, ward committee members, the job holders themselves.
- _What read it afterward:_ A federal prosecutor reading hiring files; the plaintiff's lawyer; a judge with contempt power; the press.
- _Delay between act and consequence:_ Decree 1972 and 1983; exposure of violations 2004-05; monitor after contempt (decades).
- _Sliding factors:_ How much of the decree was enforced by anyone other than the plaintiff; Whether a separate crime probe made the files readable; Judge's standard of substantial compliance.

**Capability check.** Holds part of it: executive, staff. Missing:

- U9: Patronage and merit rules
- U1: Investigators and charging
- U13: Oversight bodies, audits and inquiries
- U6: Make the bribe buy something
- U10: Organized blocs and movements

**Citations.**

- U.S. Attorney, N.D. Ill., press release on Hired Truck/hiring prosecution (18 Jul 2005), justice.gov/archive/usao/iln/chicago/2005/pr0718_01.pdf (seen, not opened)
- City ethics archive entry on the Shakman case, cityethics.org/index.php/node/2210
- Abraham Lincoln Presidential Library resource on the Shakman decrees (presidentlincoln.illinois.gov)

**Open items:** Date the city was released from hiring oversight not confirmed.

### 8. University of Illinois admissions "clout list", 2009

**Kind:** nepotism: admissions favoritism for the connected. **Level:** state. **Era:** decades to 2009. **Source confidence:** mixed.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Officials and donors want favors for friends; administrators want budgets and goodwill from the people who vote on them.
- _Money:_ No cash; favors exchanged for budget support and appointments.
- _Standing:_ The governor who benefited was already discredited; administrators depended on the same trustees.
- _Law in force:_ Admission rules written as merit-based; public-records and sworn-testimony powers of an appointed panel.
- _The act:_ Admitting applicants over staff objection because of who asked.
- _Who could have known:_ Admissions staff and the administrators who added names.
- _What read it afterward:_ A newspaper that got the list; a panel with subpoena-like power; legislators; the trustees who appointed the heads.
- _Delay between act and consequence:_ Practice ran for years; press and hearings within weeks of publication.
- _Sliding factors:_ Whether a governor was already discredited; Whether staff objections were written down; Whether the heads depended on the people who made the requests.

**Capability check.** Holds part of it: staff, executive. Missing:

- U9: Patronage and merit rules
- U2: Surfacing to the press, and the press's choice
- U12: Insider reports and what happens to the reporter
- U13: Oversight bodies, audits and inquiries
- U5: Removal and pressure inside bodies and parties

**Citations.**

- NBC Chicago, "UofI admissions: not what you know but who" (2009), nbcchicago.com/news/local/uofi-admissions-not-what-you-know-but-who/1883444/
- Chicago Defender, "Chancellor testifies about clout at U of Illinois", chicagodefender.com
- Minding the Campus, "The Illinois admissions scandal" (11 Jun 2009), mindingthecampus.org/2009/06/11/the_illinois_admissions_scanda/

**Open items:** Resignations and the commission's final findings not confirmed from a source seen.

### 9. Tom DeLay and TRMPAC, Texas, 2002-2014

**Kind:** campaign-finance violation; conviction later reversed. **Level:** state/federal. **Era:** 2002-2014. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ A party leader wants a legislative majority; corporate donors want influence they cannot buy directly.
- _Money:_ A committee's corporate-source dollars swapped for the same number of dollars of permitted money sent to candidates.
- _Standing:_ Majority leader of the national chamber, with a record of winning.
- _Law in force:_ State law forbidding corporate contributions to candidates; money-laundering statute defined by 'proceeds of crime'.
- _The act:_ The swap of funds through a party committee to hide the corporate source.
- _Who could have known:_ Committee staff, the party committee, the donors; the dates and amounts were in public filings.
- _What read it afterward:_ A county prosecutor; a civil plaintiff's discovery; a jury; two layers of appeals reading the same facts under the statute's wording.
- _Delay between act and consequence:_ Act 2002; indictment about 3 years; verdict about 8 years; reversal 11 years.
- _Sliding factors:_ Wording of the statute (proceeds of a crime or not); Partisan alignment of the prosecutor and the reviewing panel; Evidence that the two flows were linked rather than coincident.

**Capability check.** Holds part of it: campaigns. Missing:

- U8: Campaign money as law-bound flows
- U1: Investigators and charging
- U19: Records that stay readable for years
- U13: Oversight bodies, audits and inquiries

**Citations.**

- Wikipedia, "Tom DeLay campaign finance trial" (survey), en.wikipedia.org/wiki/Tom_DeLay_campaign_finance_trial
- Austin Chronicle, "Tom DeLay conviction overturned" (19 Sep 2013), austinchronicle.com (daily news, 19 Sep 2013 story)
- Public Citizen statement on the appeal, citizen.org

**Open items:** Indictment date from background knowledge; appellate opinions not opened.

### 10. Canada, Sponsorship scandal (Adscam), 1996-2006

**Kind:** campaign-finance: ad contracts kicked back to a party; inquiry; election loss. **Level:** other democracy. **Era:** 1996-2006. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ A party wants funds and presence in a restive province; firms want contracts; officials want to please the party.
- _Money:_ Hundreds of millions in program spending of which about a third went to fees and commissions to linked firms.
- _Standing:_ A long-governing party; a new leader who wanted distance from his predecessor.
- _Law in force:_ Procurement rules; an independent auditor with a duty to report; inquiry powers; a confidence rule that lets a minority government fall.
- _The act:_ Awarding sponsorship contracts without real work and routing commissions back to the party.
- _Who could have known:_ Senior officials, firm owners, party organizers.
- _What read it afterward:_ The auditor; the new leader (called the inquiry to distance himself); the televised hearings; opposition parties; voters.
- _Delay between act and consequence:_ Program 1996-2001; first report 2002; second 2004; inquiry report late 2005; confidence vote and election two months later.
- _Sliding factors:_ Government's seat count (minority or majority) at the confidence vote; Opposition parties' view of the polls; Whether the inquiry's televised testimony was heard widely.

**Capability check.** Holds part of it: campaigns, budgets. Missing:

- U13: Oversight bodies, audits and inquiries
- U8: Campaign money as law-bound flows
- U5: Removal and pressure inside bodies and parties
- U2: Surfacing to the press, and the press's choice
- U3: Voters read scandal as what they heard
- U6: Make the bribe buy something
  Defects: D1.

**Citations.**

- The Canadian Encyclopedia, "Sponsorship scandal (Adscam)", thecanadianencyclopedia.ca/en/article/sponsorship-scandal-adscam
- Wikipedia, "2006 Canadian federal election" (seat counts), en.wikipedia.org
- Government of Canada publications record for the Gomery commission report, publications.gc.ca/site/eng/9.687888/publication.html

**Open items:** Gomery report text not opened; inquiry court challenge by the former prime minister unresolved in sources seen.

### 11. Gray Davis recall, California, 2003

**Kind:** recall that succeeded (governor). **Level:** state. **Era:** 2003. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Voters angry about costs and services; a rival with money; replacement candidates who want the seat.
- _Money:_ A backer's spending on a signature drive; the state's deficit and a fee increase that landed on households.
- _Standing:_ Approval in the low twenties against more than half voting to remove.
- _Law in force:_ A state constitution that lets voters recall any statewide official with signatures and puts the replacement vote on the same ballot.
- _The act:_ A recall petition qualified and then voted.
- _Who could have known:_ Everyone: fees and deficits are public.
- _What read it afterward:_ Voters; the press; the governor's own party, which had no strong alternative.
- _Delay between act and consequence:_ Re-elected Nov 2002; recall vote Oct 2003 (under a year).
- _Sliding factors:_ Approval rating; Whether a credible replacement was on the same ballot; Size of the signature funding.

**Capability check.** Holds part of it: recalls, ballot-measures, elections, campaigns. Missing:

- U15: Recall and initiative from performance, with money
- U4: A kept standing measure for each official
- U3: Voters read scandal as what they heard
- U18: Tax-bill shock and fiscal substitution
  Defects: D3.

**Citations.**

- Wikipedia, "2003 California gubernatorial recall election" (results survey), en.wikipedia.org/wiki/2003_California_gubernatorial_recall_election
- Gallup, "California recall election" (Aug-Sep 2003), news.gallup.com/poll/10012/california-recall-election.aspx
- CNN transcript on the recall (9 Sep 2003), cnn.com/TRANSCRIPTS/0309/09/lt.03.html

**Open items:** Deficit size, fee increase and signature count not confirmed from sources seen.

### 12. Scott Walker recall, Wisconsin, 2012

**Kind:** recall that failed (governor), after a labor law. **Level:** state. **Era:** 2011-2012. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Public-sector unions lose bargaining rights and dues; supporters of the law see overdue reform; many voters object to recalling without crime.
- _Money:_ Union dues cut; large outside spending on both sides.
- _Standing:_ A governor with a committed base and a majority legislature of his party.
- _Law in force:_ A recall allowed by the constitution; a law that ended automatic dues and limited bargaining.
- _The act:_ Passing the law; collecting signatures; the vote.
- _Who could have known:_ Everyone.
- _What read it afterward:_ Voters in a polarized state; the press; donors.
- _Delay between act and consequence:_ Law 2011; recall election 2012 (months).
- _Sliding factors:_ Whether the electorate at the recall matched the original electorate; Share who opposed recalls on principle; Turnout on both sides.

**Capability check.** Holds part of it: recalls, elections, campaigns, voting. Missing:

- U11: Labor disputes and public pay
- U15: Recall and initiative from performance, with money
- U10: Organized blocs and movements
- U16: Crowds and violence from grievance
- U8: Campaign money as law-bound flows

**Citations.**

- Fox6 Milwaukee, "Walker declares victory in historic recall election" (5 Jun 2012), fox6now.com
- Talking Points Memo, "Walker wins Wisconsin recall" (2012), talkingpointsmemo.com/election2012/walker-wins-wisconsin-recall
- PolitiFact Wisconsin on recall opinion claims (22 Jun 2012), politifact.com

**Open items:** Law's passage date and exit-poll detail are background knowledge.

### 13. Ohio SB 5 / Issue 2, 2011

**Kind:** ballot measure overturned a legislature; labor dispute. **Level:** state. **Era:** 2011. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Police, firefighters, teachers and their families feel a law threatens pay and safety staffing; voters side with them.
- _Money:_ Over thirty million dollars raised by the repeal side; bargaining rights as the stake.
- _Standing:_ A new governor and legislature with a majority; popular sympathy for the workers affected.
- _Law in force:_ A state referendum procedure that suspends a law once enough signatures are filed; a simple majority repeals.
- _The act:_ Collecting signatures, campaigning, voting.
- _Who could have known:_ Everyone.
- _What read it afterward:_ Voters; the legislature that must accept the result.
- _Delay between act and consequence:_ Law spring 2011; vote Nov 2011.
- _Sliding factors:_ Gap between early polls and the result; Ground-game scale; Which public workers the law named.

**Capability check.** Holds part of it: ballot-measures, laws, law-effects, campaigns. Missing:

- U15: Recall and initiative from performance, with money
- U11: Labor disputes and public pay
- U10: Organized blocs and movements
- U8: Campaign money as law-bound flows

**Citations.**

- Wikipedia, "2011 Ohio Issue 2", en.wikipedia.org/wiki/2011_Ohio_Issue_2
- Mother Jones, "Ohio voters repeal SB 5" (Nov 2011), motherjones.com/politics/2011/11/issue-2-sb-5-ohio-repeal/
- UE union recap, ueunion.org/node/622

**Open items:** Exact date of the governor's signature unconfirmed.

### 14. Flint water crisis, 2014-2016

**Kind:** whistleblower; agency cover-up; outside researchers. **Level:** local/state. **Era:** 2014-2021. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Managers appointed to cut costs; state regulators who defend their own tests; a staffer, a professor and a pediatrician who read the same facts differently.
- _Money:_ Cost savings from switching source versus the later cost of repair and health harm.
- _Standing:_ Residents poor and with little pull on the state; the regulators were the officials the governor relied on.
- _Law in force:_ Environmental rules on lead and treatment; emergency-manager law that took power from local elected officials.
- _The act:_ Switching source without corrosion control; dismissing contrary data.
- _Who could have known:_ Plant operators, regulators, a federal staffer (from mid-2015); parents noticed smell and color first.
- _What read it afterward:_ A professor's sampling; a hospital's lead records; the press; the governor's task force; prosecutors years later.
- _Delay between act and consequence:_ Switch spring 2014; memo mid-2015; admission autumn 2015; resignations Dec 2015; charges 2021.
- _Sliding factors:_ Whether independent measurements existed that contradicted the official ones; Reach of local and national press; Voters' power over appointed managers (none).

**Capability check.** Holds part of it: executive, news, drives, views. Missing:

- U12: Insider reports and what happens to the reporter
- U13: Oversight bodies, audits and inquiries
- U2: Surfacing to the press, and the press's choice
- U1: Investigators and charging
- U19: Records that stay readable for years
- U4: A kept standing measure for each official
  Defects: D3.

**Citations.**

- Michigan Public, "Flint task force report says Snyder relied on bad information from state agencies" (23 Mar 2016), michiganpublic.org
- Jenner & Block, Flint Water Advisory Task Force final report summary (23 Mar 2016), environblog.jenner.com
- KUOW, interview with the Flint pediatrician on charges against the ex-governor, kuow.org

**Open items:** Outcome of the criminal charges against the former governor not confirmed here.

### 15. Gary Hart, 1987

**Kind:** press exposé that ended a career. **Level:** federal. **Era:** 1987. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Reporters read a dare and a tip as permission; donors and staff want a winner without risk.
- _Money:_ Contributions fell off at once.
- _Standing:_ Front-runner for the nomination; the party's voters had little attachment beyond his lead.
- _Law in force:_ None; norms of what the press may publish about private conduct.
- _The act:_ A private act made public by surveillance.
- _Who could have known:_ The candidate, a few friends; a tipster.
- _What read it afterward:_ A newspaper; a tabloid; donors; voters in the first primary state.
- _Delay between act and consequence:_ Days.
- _Sliding factors:_ Front-runner status; Candidate's own denial that a document then contradicted; Time left before the first vote.

**Capability check.** Holds part of it: press, news, campaigns. Missing:

- U2: Surfacing to the press, and the press's choice
- U3: Voters read scandal as what they heard
- U4: A kept standing measure for each official
  Defects: D1, D3.

**Citations.**

- American Heritage, "30 years ago: Gary Hart's monkey business", americanheritage.com
- Time, Gary Hart and the press (2018), time.com/5444465/gary-hart-donna-rice/

**Open items:** Exact withdrawal date differs between sources (7 or May 8).

### 16. New York Times reporting on a president's taxes, Sept 2020

**Kind:** press exposé that fizzled. **Level:** federal. **Era:** 2020. **Source confidence:** gap.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Voters hold strong prior views of the candidate; the opponent amplifies the story.
- _Money:_ Reported tax paid near zero in many years; large debts.
- _Standing:_ A divided electorate with few undecided voters in the final weeks.
- _Law in force:_ Tax law that allows legal deductions and losses; no rule requiring disclosure.
- _The act:_ Legal conduct that looks bad.
- _Who could have known:_ The candidate's accountants; the leak provider.
- _What read it afterward:_ Readers of the paper, partisans on both sides, the opposing campaign.
- _Delay between act and consequence:_ One month before the vote.
- _Sliding factors:_ Share of undecided voters; Whether the act was illegal; Whether readers of the outlet were already persuaded.

**Capability check.** Holds part of it: news, views, campaigns. Missing:

- U2: Surfacing to the press, and the press's choice
- U3: Voters read scandal as what they heard
- U4: A kept standing measure for each official
  Defects: D1, D3.

**Citations.**

- Asia Times, "Tax bombshell has Trump on defensive before debate" (Sep 2020), asiatimes.com/2020/09/tax-bombshell-has-trump-on-defensive-before-debate/
- AOL/Yahoo News, "Biden campaign jumps on Trump tax return story" (28 Sep 2020), aol.com

**Open items:** No clean before-and-after poll found; the story's separate effect is not isolated.

### 17. Bill Clinton impeachment, 1998-1999

**Kind:** scandal survived by a popular official. **Level:** federal. **Era:** 1998-1999. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Opposition-party members want removal; most voters want the economy to hold and distrust the prosecutor.
- _Money:_ None directly; a strong economy.
- _Standing:_ High approval at the start and higher at the end; party divided on strategy, not on loyalty.
- _Law in force:_ Impeachment by simple majority in one chamber and removal by two-thirds in the other.
- _The act:_ Private conduct and a sworn denial; a prosecutor's report to the legislature.
- _Who could have known:_ Everyone by the report's publication.
- _What read it afterward:_ A prosecutor; the lower chamber; the upper chamber; voters at a midterm; pollsters.
- _Delay between act and consequence:_ Conduct 1995-97; report Sept 1998; impeachment Dec 1998; acquittal Feb 1999.
- _Sliding factors:_ Economy; Approval before the scandal; Perceived overreach by the accuser; Two-thirds rule versus majority.

**Capability check.** Holds part of it: legislature, views, voting. Missing:

- U5: Removal and pressure inside bodies and parties
- U4: A kept standing measure for each official
- U3: Voters read scandal as what they heard
- U1: Investigators and charging
- U13: Oversight bodies, audits and inquiries
  Defects: D1, D3.

**Citations.**

- Gallup, "Presidential job approval: Bill Clinton's high ratings in the midst of scandal", news.gallup.com/poll/4609
- Pew Research, "Clinton's impeachment barely dented his public support" (3 Oct 2019), pewresearch.org
- Gallup, "Clinton leaves office: mixed public reaction", news.gallup.com/poll/2125

**Open items:** Senate tallies from background knowledge.

### 18. Marion Barry, 1990-1994

**Kind:** scandal survived: conviction, then re-election. **Level:** local. **Era:** 1990-1994. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ A base that credits him with jobs and respect; voters who see the sting as unfair; an unpopular incumbent.
- _Money:_ None directly; city jobs and contracts for supporters.
- _Standing:_ Deep loyalty in one part of the city; citywide popularity had fallen.
- _Law in force:_ Possession charges; a sting by federal agents; no bar on a convicted person standing again after sentence.
- _The act:_ Drug use recorded on video.
- _Who could have known:_ The informant, the agents; then everyone.
- _What read it afterward:_ A jury (partial conviction); the ward's voters; the citywide electorate.
- _Delay between act and consequence:_ Arrest Jan 1990; sentence 1991; ward seat 1992; mayor 1994.
- _Sliding factors:_ Ward-level loyalty; Unpopularity of the incumbent; Whether a base read the act as entrapment; Challenger's share.

**Capability check.** Holds part of it: constituent-cases, voting, elections. Missing:

- U3: Voters read scandal as what they heard
- U4: A kept standing measure for each official
- U10: Organized blocs and movements
  Defects: D1, D3.

**Citations.**

- Wikipedia, "1994 Washington, D.C., mayoral election" (results), en.wikipedia.org
- Wikipedia, "Electoral history of Marion Barry", en.wikipedia.org
- History.com, "Barry arrested on drug charges" (18 Jan 1990), history.com/this-day-in-history/january-18/barry-arrested-on-drug-charges

**Open items:** Sentence date differs by source.

### 19. Richard Nixon, resignation, 1974

**Kind:** resignation of a chief executive. **Level:** federal. **Era:** 1972-1974. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ A president wants to survive; his party's senators want to survive the next election and protect the party's name.
- _Money:_ None needed.
- _Standing:_ Approval collapsed over two years; his party's leaders held the votes that decided removal.
- _Law in force:_ Impeachment and two-thirds removal; a court rule that an executive cannot shield evidence in a criminal case.
- _The act:_ Directing a cover-up and lying about it.
- _Who could have known:_ Aides; the recordings held the truth.
- _What read it afterward:_ A special prosecutor; a court; the lower chamber's committee; party leaders counting votes in the upper chamber; the press and the public.
- _Delay between act and consequence:_ Break-in June 1972; court order July 1974; tape Aug 5; resignation Aug 9, 1974.
- _Sliding factors:_ Number of upper-chamber votes still with him (12 to 15); Approval; A court order that removed his last legal shield.

**Capability check.** Holds part of it: offices, executive. Missing:

- U5: Removal and pressure inside bodies and parties
- U1: Investigators and charging
- U13: Oversight bodies, audits and inquiries
- U4: A kept standing measure for each official
- U7: Succession and vacancy contests
- U2: Surfacing to the press, and the press's choice
  Defects: D3.

**Citations.**

- United States v. Nixon, 418 U.S. 683 (1974), govinfo.gov/content/pkg/USREPORTS-418/pdf/USREPORTS-418-683.pdf (found, not opened)
- NPR transcript on the last days (2019), npr.org/transcripts/749303304
- History.com, "The last hours of the Nixon presidency", history.com/news/the-last-hours-of-the-nixon-presidency-40-years-ago

**Open items:** Impeachment article vote counts not verified.

### 20. James Traficant, expulsion, 2002

**Kind:** expulsion from a legislature. **Level:** federal. **Era:** 2002. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Members want to protect the body's name and have no loyalty to a convicted colleague who had few allies.
- _Money:_ A monthly kickback from a staffer; unreported income.
- _Standing:_ Isolated in his own party and chamber.
- _Law in force:_ A two-thirds vote to expel; an ethics committee that investigates and recommends.
- _The act:_ Taking kickbacks and obstructing justice.
- _Who could have known:_ Staff and prosecutors.
- _What read it afterward:_ A jury; the ethics committee; the full chamber.
- _Delay between act and consequence:_ Conviction in April; expulsion in July of the same year.
- _Sliding factors:_ Strength of the conviction; Isolation of the member; Closeness of the next election.

**Capability check.** Holds part of it: legislature, leadership, offices. Missing:

- U5: Removal and pressure inside bodies and parties
- U1: Investigators and charging
- U13: Oversight bodies, audits and inquiries

**Citations.**

- Tampa Bay Times, "House votes 420-1 to expel Traficant" (25 Jul 2002), tampabay.com/archive/2002/07/25/house-votes-420-1-to-expel-traficant/
- UPI, "Traficant expelled" (24 Jul 2002), upi.com
- Mail & Guardian, convicted of bribery (2002), mg.co.za

**Open items:** Final prison sentence unconfirmed.

### 21. Gerald Ford's pardon of Richard Nixon, 1974

**Kind:** pardon. **Level:** federal. **Era:** 1974-1976. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ A successor wants to end a divisive trial; voters want accountability.
- _Money:_ None.
- _Standing:_ Approval over 70 percent before; he had never been elected to national office.
- _Law in force:_ An unreviewable power to pardon federal offenses, available before charge.
- _The act:_ A pardon a month after the resignation.
- _Who could have known:_ A few aides; announced publicly on a Sunday.
- _What read it afterward:_ Pollsters, the opposition party, the press, voters at the next two elections.
- _Delay between act and consequence:_ Immediate drop; midterm two months later; presidential election two years later.
- _Sliding factors:_ Approval before and after; Economy; Share who preferred prosecution (58 to 38); Time (the same poll turned positive a decade later).

**Capability check.** Holds part of it: executive, views. Missing:

- U14: Clemency
- U4: A kept standing measure for each official
- U3: Voters read scandal as what they heard
- U19: Records that stay readable for years
  Defects: D3.

**Citations.**

- Gallup Vault, "Pardon took a decade to forgive", news.gallup.com/vault/218198/gallup-vault-pardon-took-decade-forgive.aspx
- Gallup, "Gerald Ford retrospective", news.gallup.com/poll/23995/gerald-ford-retrospective.aspx
- Pew Research, "How the Watergate crisis eroded public support for Nixon" (25 Sep 2019), pewresearch.org

**Open items:** Senate seat change (+3 or +4) differs by source; effect of the pardon alone is disputed against the economy.

### 22. Moscone assassination and Feinstein succession, San Francisco, 1978

**Kind:** sudden death in office and local succession. **Level:** local. **Era:** 1978. **Source confidence:** mixed.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ A former member wants his seat back and reads the refusal as a personal wrong; board members want stability and their own standing.
- _Money:_ None.
- _Standing:_ The board president held the post because of an earlier internal vote.
- _Law in force:_ A charter naming the board's president as next in line and letting the board elect a mayor to finish the term.
- _The act:_ A killing; a succession vote a week later.
- _Who could have known:_ Nobody beforehand; the grudge was known to colleagues.
- _What read it afterward:_ The charter's clerk; the board's members; voters at the next election.
- _Delay between act and consequence:_ Acting mayor same day; board vote one week; election at term end.
- _Sliding factors:_ Earlier board-president vote; Six-vote majority just enough; Incumbency advantage afterward.

**Capability check.** Holds part of it: offices, leadership. Missing:

- U7: Succession and vacancy contests
- U16: Crowds and violence from grievance
- U5: Removal and pressure inside bodies and parties

**Citations.**

- Wikipedia, "Assassinations of George Moscone and Harvey Milk", en.wikipedia.org
- Mission Local, "Dianne Feinstein: San Francisco's meticulous 24/7 mayor" (2023), missionlocal.org
- UPI, "How Dan White changed San Francisco" (27 Oct 1985), upi.com/Archives/1985/10/27/How-Dan-White-changed-San-Francisco/9238499233600/

**Open items:** Later election win and aftermath unverified from sources seen.

### 23. Harold Washington's death and the council's succession vote, Chicago, 1987

**Kind:** sudden death in office; contested succession. **Level:** local. **Era:** 1983-1989. **Source confidence:** mixed.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Reform supporters want continuity; old-organization aldermen want patronage back; the compromise candidate wants the job.
- _Money:_ City jobs and contracts at stake.
- _Standing:_ The dead mayor had a base but not a controlling council bloc.
- _Law in force:_ A rule that the council elects an interim mayor from its members; a clerk served for a week first.
- _The act:_ The vote.
- _Who could have known:_ Everyone in the room; the crowd outside.
- _What read it afterward:_ The council; crowds; the press; voters at the next primary.
- _Delay between act and consequence:_ Death Nov 25; clerk interim a week; vote Dec 2; next primary 17 months later.
- _Sliding factors:_ Council bloc sizes; Crowd size at City Hall; Time left before the next election.

**Capability check.** Holds part of it: offices, leadership, legislature, parties. Missing:

- U7: Succession and vacancy contests
- U16: Crowds and violence from grievance
- U9: Patronage and merit rules
- U10: Organized blocs and movements

**Citations.**

- Christian Science Monitor, "Chicago's new mayor" (3 Dec 1987), csmonitor.com/1987/1203/agene.html
- Wikipedia, "Eugene Sawyer", en.wikipedia.org
- Chicago Public Library biography of David Orr, chipublib.org

**Open items:** Council vote totals and the earlier 'Council Wars' details are from background knowledge.

### 24. Huey Long, Share Our Wealth, 1928-1935

**Kind:** demagogue's rise from a movement. **Level:** state/federal. **Era:** 1928-1935. **Source confidence:** mixed.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Voters in a depression want relief and someone to blame; the leader wants national office; local foes want him stopped.
- _Money:_ State jobs, roads and hospitals; a program capping fortunes; club dues and mailings.
- _Standing:_ Control of nominations and the legislature at home; a national audience on the radio.
- _Law in force:_ State powers of appointment and districting; a legislature that follows a single leader.
- _The act:_ Building a program and clubs; redrawing a district to unseat a judge.
- _Who could have known:_ Press and rivals knew the methods; members knew the program.
- _What read it afterward:_ Voters; a rival national leader who absorbed the ideas; a relative of the judge.
- _Delay between act and consequence:_ Rise over seven years; the final act within days of the redistricting plan.
- _Sliding factors:_ Depth of the depression; Reach of radio; Whether a rival absorbed the program; Personal grievance of a target's family.

**Capability check.** Holds part of it: speech, drives, executive, legislature. Missing:

- U10: Organized blocs and movements
- U16: Crowds and violence from grievance
- U9: Patronage and merit rules
- U17: Kin and name inheritance

**Citations.**

- History.com, "Huey Long", history.com/topics/great-depression/huey-long
- Wikipedia, "Assassination of Huey Long", en.wikipedia.org
- T. Harry Williams, Huey Long (Knopf, 1969) (standard biography; cited from background knowledge, not opened)

**Open items:** Machine mechanics from background knowledge; club membership figure was self-claimed.

### 25. Robert F. Kennedy, Indianapolis speech and the 1968 primaries

**Kind:** dynasty's second generation riding a movement. **Level:** federal. **Era:** 1968. **Source confidence:** mixed.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ A crowd that hasn't heard the news; a speaker who shares a loss; voters who read him as the one person who can span two groups.
- _Money:_ A family's name, network and funds.
- _Standing:_ Brother of a martyred president; late entrant against a sitting president's stand-in.
- _Law in force:_ Primary rules that let a candidate win states; convention delegates held by party organizers in states without primaries.
- _The act:_ An unscripted speech, and then primaries.
- _Who could have known:_ The crowd learned of the killing from him.
- _What read it afterward:_ The crowd; the press that carried the speech; primary voters; party organizers.
- _Delay between act and consequence:_ Speech Apr 4; primary May 7; assassination June 5-6.
- _Sliding factors:_ Size of the audience (about 2,500) and press carriage; Whether the other campaigns were in the same state; Share of delegates controlled by organizers.

**Capability check.** Holds part of it: speech, campaigns, views. Missing:

- U17: Kin and name inheritance
- U10: Organized blocs and movements
- U16: Crowds and violence from grievance

**Citations.**

- Indiana Humanities, "A fateful year: Robert Kennedy" (2011), indianahumanities.org/2011/04/06/a-fateful-year-robert-kennedy/
- The Nation, "King, Kennedy and April 4, 1968", thenation.com
- Wikipedia on the 1968 Indiana primary results (Kennedy 42.3 percent, governor 30.7, third candidate 27)

**Open items:** The first Wikipedia link in the agent's block concerned a different speech and was not used; later primaries from background knowledge.

### 26. Ferdinand "Bongbong" Marcos Jr., Philippines, 2022

**Kind:** dynasty return; online campaign. **Level:** other democracy. **Era:** 1986-2022. **Source confidence:** mixed.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Voters tired of the current order read the old regime as stable; a family wants its name restored.
- _Money:_ Family wealth that recovery cases never reached; campaign money; media production.
- _Standing:_ A defeated runner-up six years earlier; a running mate with a regional base.
- _Law in force:_ A single-term presidency; slow civil forfeiture cases; election authorities with no power over false claims.
- _The act:_ A campaign that rewrote the record online.
- _Who could have known:_ Viewers received claims; researchers tracked them.
- _What read it afterward:_ Voters; fact-checkers; courts that had not acted.
- _Delay between act and consequence:_ Regime ended 1986; return in 2022 (36 years).
- _Sliding factors:_ Pre-election poll lead; Alliance with a base in another region; Reach of social media versus press.

**Capability check.** Holds part of it: campaigns, speech, views. Missing:

- U17: Kin and name inheritance
- U2: Surfacing to the press, and the press's choice
- U10: Organized blocs and movements
- U19: Records that stay readable for years

**Citations.**

- Philippine Daily Inquirer, unofficial count (May 2022), newsinfo.inquirer.net/1596526
- PCIJ report on disinformation in the campaign, pcij.org/?p=3894
- Pulse Asia April 2022 survey as cited by the Inquirer

**Open items:** Family-wealth case and 1995 tax conviction not sourced here; official vote shares from memory.

### 27. Park Geun-hye, South Korea, 2012-2021

**Kind:** dynasty heir; influence-peddling scandal; impeachment. **Level:** other democracy. **Era:** 2012-2021. **Source confidence:** mixed.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ A president who trusts one person outside government; firms that pay for favors; a broadcaster with documents.
- _Money:_ Funds from large firms to foundations controlled by the friend.
- _Standing:_ Elected on a family name; approval collapsed once the files aired.
- _Law in force:_ Impeachment by a legislative supermajority then a court's ruling; bribery and abuse-of-power statutes.
- _The act:_ Sharing state documents and soliciting payments through the friend.
- _Who could have known:_ Aides and executives of the paying firms.
- _What read it afterward:_ A broadcaster, then massive street protests, parliament, prosecutors, the court.
- _Delay between act and consequence:_ Acts 2013-2016; broadcast Oct 2016; impeached Dec; removed Mar 2017; verdicts 2018-2021.
- _Sliding factors:_ Size of protests; Whether the president's own party defected in the impeachment vote; Document leak proving access.

**Capability check.** Holds part of it: corruption, news, parties. Missing:

- U17: Kin and name inheritance
- U2: Surfacing to the press, and the press's choice
- U5: Removal and pressure inside bodies and parties
- U16: Crowds and violence from grievance
- U13: Oversight bodies, audits and inquiries
- U1: Investigators and charging
- U14: Clemency
  Defects: D2.

**Citations.**

- Wikipedia, "Impeachment of Park Geun-hye", en.wikipedia.org
- Korea JoongAng Daily, Supreme Court ruling (Jan 2021), koreajoongangdaily.com/korea/supreme-court-says-ousted-president-was-guilty/11368362
- Yale Journal of International Law, ruling analysis (May 2017), yjil.yale.edu

**Open items:** Park's 2012 margin, protest sizes and pardon are from background knowledge.

### 28. Moral Majority and the 1980 evangelical bloc

**Kind:** faith-driven vote bloc. **Level:** federal. **Era:** 1976-1980. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Church leaders read policies as threats to their schools and values; members trust their pastor and congregation.
- _Money:_ Direct-mail lists and church-based registration drives.
- _Standing:_ A previous candidate from the same faith who lost them on policy.
- _Law in force:_ Tax rules for religious schools; voter registration rules that permit church drives.
- _The act:_ Registration and turnout drives through congregations.
- _Who could have known:_ Members hear at services.
- _What read it afterward:_ Members; the campaign that courted them.
- _Delay between act and consequence:_ Organized in 1979; vote in 1980.
- _Sliding factors:_ Exposure to local organizing; Alignment of the candidate's faith with the voters'; Which issues the pastors named.

**Capability check.** Holds part of it: views, drives, campaigns, voting. Missing:

- U10: Organized blocs and movements
- U17: Kin and name inheritance

**Citations.**

- NBER working paper w32551, on the 1980 evangelical shift, nber.org/system/files/working_papers/w32551/w32551.pdf
- Christian Science Monitor (22 Oct 1980), csmonitor.com/1980/1022/102242.html
- History News Network on evangelicals and the 1980 vote, historynewsnetwork.org/article/39332

**Open items:** Estimates of evangelical vote share differ (about 61 to 67 percent) with the definition; national totals are from memory.

### 29. Alabama special Senate election, 2017

**Kind:** press exposé shifting a faith-heavy bloc; turnout composition. **Level:** state/federal. **Era:** 2017. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Voters weigh allegations against party and faith loyalty; organizers push turnout in one group.
- _Money:_ Campaign spending; late national party support.
- _Standing:_ A candidate well known and popular among evangelical voters; an opponent with a prosecutor's record.
- _Law in force:_ A special-election date set by the governor; ballot access.
- _The act:_ A report published weeks before the vote.
- _Who could have known:_ Women involved and a few contacts; the newspaper after months of work.
- _What read it afterward:_ Voters (52 percent said the claims were probably true); county party leaders; national party.
- _Delay between act and consequence:_ Report Nov 9; vote Dec 12.
- _Sliding factors:_ Belief in the claim split by group; Turnout drop by county type (about 37 percent overall); Margin of 1.5 points.

**Capability check.** Holds part of it: news, press, views, voting. Missing:

- U2: Surfacing to the press, and the press's choice
- U3: Voters read scandal as what they heard
- U10: Organized blocs and movements
- U8: Campaign money as law-bound flows
  Defects: D1.

**Citations.**

- Encyclopedia of Alabama, "2017 Alabama special Senate election", encyclopediaofalabama.org
- NBC News, exit-poll analysis (Dec 2017), nbcnews.com
- theGrio, exit poll and Black turnout (13 Dec 2017), thegrio.com

**Open items:** The newspaper story itself was not opened.

### 30. Britain, the Winter of Discontent and the 1979 election

**Kind:** labor dispute that swung an election. **Level:** other democracy. **Era:** 1978-1979. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Unions reject a pay limit that falls behind prices; voters read strikes as a government that cannot govern.
- _Money:_ A five percent wage guideline against higher inflation.
- _Standing:_ A minority government dependent on small parties' votes.
- _Law in force:_ A confidence rule that brings down a government by majority vote.
- _The act:_ Strikes by truck drivers, council and hospital workers.
- _Who could have known:_ Everyone; services stopped.
- _What read it afterward:_ Voters; small parties; the opposition.
- _Delay between act and consequence:_ Strikes Dec 1978-Feb 1979; confidence vote March 28; election May 3.
- _Sliding factors:_ Government satisfaction (17 percent); Personal rating of the leader; Unemployment as the opposition's campaign point; One-vote margin.

**Capability check.** Holds part of it: jobs, work, voting. Missing:

- U11: Labor disputes and public pay
- U5: Removal and pressure inside bodies and parties
- U4: A kept standing measure for each official
- U3: Voters read scandal as what they heard
  Defects: D3.

**Citations.**

- Wikipedia, "1979 United Kingdom general election" (results), en.wikipedia.org
- Ipsos UK, "Looking back at 1979", ipsos.com/en-uk

**Open items:** Strike details from background knowledge.

### 31. Britain, the Poll Tax revolt and the fall of the prime minister, 1989-1990

**Kind:** tax revolt; party removes its leader. **Level:** other democracy. **Era:** 1989-1990. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Households with several adults pay more; the party's members of the legislature in marginal seats fear defeat.
- _Money:_ A flat per-adult charge instead of a rate on property value; non-payment in some areas at 30 percent.
- _Standing:_ Long-serving leader with a strong majority but falling poll lead.
- _Law in force:_ A local tax law; party rules for challenging a leader with a vote threshold.
- _The act:_ Non-payment, protest, and a leadership challenge.
- _Who could have known:_ Everyone.
- _What read it afterward:_ Members of the legislature; cabinet ministers; the party's rules.
- _Delay between act and consequence:_ Introduced 1989-90; riot March 1990; resignation Nov 1990.
- _Sliding factors:_ Default rate; Poll standing in marginal seats; First-ballot margin short of the party threshold.

**Capability check.** Holds part of it: budgets, parties. Missing:

- U18: Tax-bill shock and fiscal substitution
- U5: Removal and pressure inside bodies and parties
- U16: Crowds and violence from grievance
- U4: A kept standing measure for each official
- U10: Organized blocs and movements
  Defects: D3.

**Citations.**

- EBSCO Research Starters, "British riot over poll tax", ebsco.com/research-starters/history/british-riot-over-poll-tax
- Libcom, "1989-1990 opposition to the poll tax", libcom.org

**Open items:** A senior minister's resignation speech role was not confirmed.

### 32. California Proposition 13, 1978

**Kind:** tax revolt by ballot measure. **Level:** state. **Era:** 1970s-1978. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Homeowners, especially on fixed incomes, see tax bills double; an organizer turns the grievance into a ballot text.
- _Money:_ Property tax revenue fell by over half; local governments substituted fees and special charges.
- _Standing:_ Legislature slow to give relief; voters enthusiastic.
- _Law in force:_ A constitutional initiative that needs only a majority; a two-thirds vote for local special taxes afterward.
- _The act:_ Signatures, campaign, vote.
- _Who could have known:_ Every owner got a bill.
- _What read it afterward:_ Voters; local councils that then had to cut or raise fees; the state, which backfilled schools.
- _Delay between act and consequence:_ Assessments surged through the 1970s; vote June 1978; revenue fall within a year.
- _Sliding factors:_ Size of assessment increases; Existence of a state surplus; Turnout of owners versus renters.

**Capability check.** Holds part of it: ballot-measures, budgets, laws. Missing:

- U18: Tax-bill shock and fiscal substitution
- U15: Recall and initiative from performance, with money
- U10: Organized blocs and movements

**Citations.**

- California Budget Center, "Proposition 13: its impact on California and implications" (1997), calbudgetcenter.org
- SCPR, "Prop 13 history", projects.scpr.org/prop-13/history/
- KPBS, "Birth of California's taxpayer revolt" (24 Dec 2018), kpbs.org

**Open items:** State surplus and the school-finance court case are background knowledge.

### 33. Bell, California, salary scandal, 2010

**Kind:** public-salary scandal; press exposé; recall and law change. **Level:** local. **Era:** 2010-2014. **Source confidence:** mixed.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Insiders vote themselves pay; residents in a poor city have little time to watch; a reporter requests records.
- _Money:_ A top salary of about three-quarters of a million dollars; council pay for part-time seats; later restitution in the millions.
- _Standing:_ A council re-elected in low-turnout races; residents with little organization.
- _Law in force:_ Open-records law; a charter city's right to set its own pay; criminal misappropriation statutes.
- _The act:_ Voting the pay and hiding it.
- _Who could have known:_ The insiders only.
- _What read it afterward:_ A newspaper; the state attorney general; the courts; residents (recall).
- _Delay between act and consequence:_ Years of pay; July 2010 story; subpoena in 11 days; charges in about 10 weeks; sentences 2014.
- _Sliding factors:_ Turnout in local races; Whether a pay table was public; Salary versus peers.

**Capability check.** Holds part of it: staff, budgets, recalls, news. Missing:

- U2: Surfacing to the press, and the press's choice
- U13: Oversight bodies, audits and inquiries
- U1: Investigators and charging
- U11: Labor disputes and public pay
- U15: Recall and initiative from performance, with money

**Citations.**

- Wikipedia, "City of Bell scandal", en.wikipedia.org/wiki/City_of_Bell_scandal
- NPR, "Ex-city manager caught in Calif. salary scandal gets 12 years" (16 Apr 2014), npr.org
- California Attorney General, press release on subpoena of Bell records (July 2010), oag.ca.gov/news/press-releases/brown-subpoenas-city-bell-records-related-excessive-public-official-salaries

**Open items:** State salary-disclosure statute and the 2011 council recalls from background knowledge, not confirmed.

### 34. India's Sixth Pay Commission and private wages (evidence gap)

**Kind:** public-salary change that moves private wages. **Level:** other democracy. **Era:** 2006-2009. **Source confidence:** gap.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Skilled workers compare public and private pay and may quit or hold out; private firms match only if short of staff.
- _Money:_ A pay raise for several million public employees, with arrears paid in a lump.
- _Standing:_ Not applicable.
- _Law in force:_ A commission recommends and the government adopts pay scales for its own staff.
- _The act:_ Adopting the scales.
- _Who could have known:_ Everyone: pay scales are public.
- _What read it afterward:_ Job seekers, private employers, the budget.
- _Delay between act and consequence:_ Effect on private wages: unmeasured in sources found.
- _Sliding factors:_ Slack in the labor market; Share of workers in the public sector; Size of the existing public premium.

**Capability check.** Holds part of it: jobs, work, budgets, laws. Missing:

- U11: Labor disputes and public pay

**Citations.**

- 15th Finance Commission study, "Pay Commissions: fiscal implications", fincomindia.nic.in (a regression with pay-commission-year dummies; found, partly read)
- Glinskaya and Lokshin, World Bank Policy Research Working Paper 3574 (public premium 62 to 102 percent before 2008), documents1.worldbank.org
- Kingdon, RECOUP Working Paper 29 (2010) on teacher pay

**Open items:** No paper was found that measures the private-wage spillover from this specific raise. The mechanism here is a hypothesis built from a documented public pay premium and a muted-spillover remark in an official economic survey. Replace this case if a measured natural experiment is found.

### 35. Rod Blagojevich, Illinois, 2008-2020

**Kind:** selling an appointment; impeachment and removal; commutation. **Level:** state. **Era:** 2008-2020. **Source confidence:** mixed.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ A governor wants jobs, money and office in return; the legislature wants to preserve its standing and the state's name.
- _Money:_ Offers of an appointment for campaign money or a post.
- _Standing:_ Unpopular and without allies in his own party; the legislature's majority was of his own party.
- _Law in force:_ Governor's sole power to appoint to a vacant seat; wiretap authority; impeachment by simple majority and removal by two-thirds of the upper chamber; clemency by a later chief executive.
- _The act:_ Soliciting benefits in return for the appointment.
- _Who could have known:_ The governor's circle; prosecutors had a recording.
- _What read it afterward:_ Prosecutors; the lower chamber (114-1); the upper chamber (59-0); a later president.
- _Delay between act and consequence:_ Arrest Dec 2008; removal Jan 2009; trials 2010-11; commutation 2020.
- _Sliding factors:_ Governor's lack of allies; Legislature's fear of the voters; A later president's view of the case.

**Capability check.** Holds part of it: executive, offices, legislature, corruption. Missing:

- U1: Investigators and charging
- U5: Removal and pressure inside bodies and parties
- U6: Make the bribe buy something
- U7: Succession and vacancy contests
- U14: Clemency
- U13: Oversight bodies, audits and inquiries
  Defects: D2.

**Citations.**

- CBS News, "In 59-0 vote, Blago removed from office" (29 Jan 2009), cbsnews.com
- NPR Political Junkie (Jan 2009), npr.org/sections/politicaljunkie/2009/01/blagojevich_is_out_illinois_vo.html
- Chicago Defender, commutation of the sentence (Feb 2020), chicagodefender.com

**Open items:** Criminal complaint not opened; how the contested appointee episode ended is not confirmed.

### 36. Fiction: All the King's Men (novel, 1946)

**Kind:** fiction: populist rise, machine use and fall (mechanism only). **Level:** fiction (state). **Era:** novel. **Source confidence:** fiction-mechanism.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ A once-honest man who has learned that reasonable appeals lose; an aide who digs up damaging facts; relatives who act on a private wrong.
- _Money:_ Public contracts and a large public hospital; favors for backers.
- _Standing:_ Strong mass following, weak among the old elite.
- _Law in force:_ Governor controls contracts and a compliant legislature.
- _The act:_ Pressure on an opponent with an old secret; a love affair.
- _Who could have known:_ The aide, the targets.
- _What read it afterward:_ The target's relatives; the aide.
- _Delay between act and consequence:_ A few years; fall in a day.
- _Sliding factors:_ Popularity among ordinary voters; Strength of old elite opposition; Personal grievances of those harmed.

**Capability check.** Holds part of it: executive, legislature, drives. Missing:

- U10: Organized blocs and movements
- U9: Patronage and merit rules
- U6: Make the bribe buy something
- U16: Crowds and violence from grievance
- U12: Insider reports and what happens to the reporter

**Citations.**

- Robert Penn Warren, All the King's Men (Harcourt, Brace, 1946)
- Wikipedia, "All the King's Men", en.wikipedia.org
- SuperSummary plot summary, supersummary.com/all-the-kings-men/summary/

**Open items:** Plot taken from summaries; read as mechanism only.

### 37. Fiction: The Last Hurrah (novel, 1956)

**Kind:** fiction: old machine mayor's last campaign (mechanism only). **Level:** fiction (city). **Era:** novel. **Source confidence:** fiction-mechanism.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Voters repay favors with loyalty; a publisher dislikes the mayor; younger voters want other things.
- _Money:_ City jobs and small favors; the establishment's funds for the rival.
- _Standing:_ A long incumbency in immigrant wards; weak with the old establishment.
- _Law in force:_ City hiring and contracts in the mayor's gift.
- _The act:_ Campaigning on personal contact; the paper's endorsement of the rival.
- _Who could have known:_ Everyone.
- _What read it afterward:_ Voters; a nephew who observes.
- _Delay between act and consequence:_ One campaign.
- _Sliding factors:_ Share of voters who still depend on favors; Newspaper endorsement; Establishment funding.

**Capability check.** Holds part of it: constituent-cases, executive, campaigns, press. Missing:

- U9: Patronage and merit rules
- U10: Organized blocs and movements
- U2: Surfacing to the press, and the press's choice
- U17: Kin and name inheritance

**Citations.**

- Edwin O'Connor, The Last Hurrah (Little, Brown, 1956)
- Wikipedia, "The Last Hurrah", en.wikipedia.org
- EBSCO Research Starters on the novel, ebsco.com

**Open items:** Plot taken from summaries; read as mechanism only.

### 38. Film: Spotlight (2015) and the Boston Globe series

**Kind:** journalism film: an investigative team targets an institution (mechanism only). **Level:** fiction/true story (city). **Era:** 2001-2002. **Source confidence:** fiction-mechanism.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ An editor who wants institutional answers; survivors who want to be heard; leaders who want to protect the institution.
- _Money:_ Sealed settlements paid quietly.
- _Standing:_ An institution with great local standing and many allies in law and media.
- _Law in force:_ Sealed court settlements, then an unsealing motion; public-records rules.
- _The act:_ Transferring offenders and sealing settlements.
- _Who could have known:_ Church leaders, lawyers, some reporters earlier.
- _What read it afterward:_ Readers who called in; prosecutors; the institution's head.
- _Delay between act and consequence:_ Practice for decades; investigation months; resignation within a year of publication.
- _Sliding factors:_ Number of survivors who came forward; Whether sealed documents could be unsealed; Standing of the institution.

**Capability check.** Holds part of it: press, news, drives. Missing:

- U2: Surfacing to the press, and the press's choice
- U12: Insider reports and what happens to the reporter
- U13: Oversight bodies, audits and inquiries
- U1: Investigators and charging
- U19: Records that stay readable for years

**Citations.**

- Spotlight (dir. Tom McCarthy, 2015)
- Boston Globe Spotlight series, from 6 Jan 2002 (Pulitzer Prize for Public Service, 2003), pulitzer.org/winners/boston-globe-1
- Boston Globe, "Journalists who broke church sex abuse scandal could not have foreseen impact" (20 Nov 2015), bostonglobe.com

**Open items:** Counts of accused priests vary; film dramatizes.

### 39. Chesa Boudin recall, San Francisco, 2022

**Kind:** recall that succeeded (local prosecutor). **Level:** local. **Era:** 2022. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Residents and businesses who fear crime; donors who object to the prosecutor's policy; the prosecutor's allies who outspend less.
- _Money:_ About nine million dollars across both sides; the largest committee funded by a few donors.
- _Standing:_ Elected on a reform platform in a city with a strong progressive lean but a wave of safety complaints.
- _Law in force:_ City charter recall with signatures; vacancy filled by the mayor's appointment.
- _The act:_ Gathering signatures, campaigning, vote.
- _Who could have known:_ Everyone: crime and policy are public.
- _What read it afterward:_ Voters (55 to 45); the mayor.
- _Delay between act and consequence:_ Elected 2019; recall vote June 2022.
- _Sliding factors:_ Turnout (46 percent); Spending gap; Perceived crime trend; Margin of 10 points.

**Capability check.** Holds part of it: recalls, campaigns, executive. Missing:

- U15: Recall and initiative from performance, with money
- U8: Campaign money as law-bound flows
- U4: A kept standing measure for each official
- U7: Succession and vacancy contests
  Defects: D3.

**Citations.**

- Wikipedia, "2022 San Francisco District Attorney recall election", en.wikipedia.org
- Mission Local, "Almost $9 million donated for and against Boudin recall" (May 2022), missionlocal.org
- SF Standard, "Boudin ousted in widely watched recall election" (June 2022), sfstandard.com

**Open items:** Polling not retrieved; appointment of the successor from background knowledge.

### 40. Frank Serpico and the Knapp Commission, New York, 1970-1972

**Kind:** whistleblower. **Level:** local. **Era:** 1967-1972. **Source confidence:** secondary-seen.

**Mechanism as the engine would have to produce it**

- _Drives, views, relationships:_ Honest officers want it to stop; supervisors protect their own income; a mayor wants to avoid blame.
- _Money:_ Regular payoffs from illegal businesses, split by squads.
- _Standing:_ The whistleblowers were low-ranking and isolated; the force's culture punished them.
- _Law in force:_ No outside body had authority to investigate the police; a mayor could create a commission.
- _The act:_ Taking regular payoffs and ignoring complaints.
- _Who could have known:_ Squad members; supervisors; some city officials.
- _What read it afterward:_ A reporter's series; the mayor; public hearings; a new commissioner.
- _Delay between act and consequence:_ Years of internal reports; the series; a commission within weeks; hearings a year and a half later.
- _Sliding factors:_ Whether insiders were believed; The press's reach; Mayor's exposure to blame; Violence against the whistleblower.

**Capability check.** Holds part of it: staff, news. Missing:

- U12: Insider reports and what happens to the reporter
- U2: Surfacing to the press, and the press's choice
- U13: Oversight bodies, audits and inquiries
- U1: Investigators and charging
- U16: Crowds and violence from grievance

**Citations.**

- Wikipedia, "Knapp Commission", en.wikipedia.org/wiki/Knapp_Commission
- Boston Globe obituary of the reporter who exposed police graft (2024), bostonglobe.com/2024/10/06/metro/david-burnham-times-reporter-who-exposed-police-graft-dies-91
- The Progressive, "Fifty years since Frank Serpico exposed New York corruption" (2021), progressive.org

**Open items:** Counts of indictments and the commissioner's resignation timing from secondary summaries.

## The ten missing causes or reads that unlock the most cases

Ranked by cases unlocked (a case counts once for each gap it needs; most cases need several, so counts overlap). Full ranking of all nineteen gaps is in the JSON. Owners are the pillars named in the order; each item is written as a work order.

1. **Investigators and charging** (U1; **17 cases**: 1, 2, 3, 4, 5, 6, 7, 9, 14, 17, 19, 20, 27, 33, 35, 38, 40). Owner: **GOV**. An investigator (a prosecutor's office, an inspector, an ethics body) that reads kept records (the cash journal, what people know, tips), takes cooperating testimony, files charges, accepts pleas and sets sentences. Each step is a decision from the investigator's own drives, workload and the law in force; nothing is rolled. Courts proper stay after early access, so start with the prosecutor's side and a plea.

2. **Surfacing to the press, and the press's choice** (U2; **17 cases**: 2, 3, 4, 5, 8, 10, 14, 15, 16, 19, 26, 27, 29, 33, 37, 38, 40). Owner: **PEOPLE**. When a person decides to tell, they can tell an outlet. An outlet's editor weighs the story by who it touches, what documents it has and its reach, then runs it or not. A run becomes a public record the news engine carries, with the outlet's trust and slant. Today the 'told' record reaches one listener and no outlet.

3. **Oversight bodies, audits and inquiries** (U13; **15 cases**: 1, 6, 7, 8, 9, 10, 14, 17, 19, 20, 27, 33, 35, 38, 40). Owner: **GOV**. An auditor or inspector that reports on a government's books, a commission that a leader calls to distance themselves, and hearings with sworn testimony. They read records and produce public records that the press, the body and voters read.

4. **Removal and pressure inside bodies and parties** (U5; **15 cases**: 1, 2, 3, 5, 6, 8, 10, 17, 19, 20, 22, 27, 30, 31, 35). Owner: **GOV**. Impeach, expel, censure, vote no-confidence, ask a member to withdraw from the ballot. Each member decides from their own count of the votes, their party leader's message and their next election; leaders count heads and tell the member. The rule (majority or two-thirds) is law data.

5. **Organized blocs and movements** (U10; **14 cases**: 7, 12, 13, 18, 23, 24, 25, 26, 28, 29, 31, 32, 36, 37). Owner: **PEOPLE**. Congregations, unions, ward organizations and cause groups as organizations with leaders who register, turn out and instruct members, and a movement that grows by contacts, funds itself and can be absorbed by a rival who adopts its program. Drives already has cause groups; this gives them reach into votes.

6. **Voters read scandal as what they heard** (U3; **13 cases**: 2, 3, 4, 5, 10, 11, 15, 16, 17, 18, 21, 29, 30). Owner: **GOV**. Replace the on/off 'scandal' flag and its flat 5-point penalty with each voter's own knowledge. Counted voter groups hear in the share the news reached, weigh it by their view of the official and their party tie, and forgive more when the official has done them good. Named voters read it too (today they do not).

7. **A kept standing measure for each official** (U4; **11 cases**: 11, 14, 15, 16, 17, 18, 19, 21, 30, 31, 39). Owner: **CORE**. A job-approval-style measure per official, kept by the core from what voters think of them and the economy (this is the open 'electorate approval' stopgap). Recalls, parties, legislators and the press read it. It has to rise and fall by cause.

8. **Make the bribe buy something** (U6; **10 cases**: 1, 2, 3, 4, 5, 6, 7, 10, 35, 36). Owner: **GOV**. Wire the corruption engine to the things that can be bought: a contract award, a permit, a vote, an appointment. The same people repeat the exchange over years, the payer's firm wins or loses the award, the official's cash moves through the journal, and a share can go up to a party. Today no engine asks for a bribe and none sells one.

9. **Crowds and violence from grievance** (U16; **9 cases**: 12, 22, 23, 24, 25, 27, 31, 36, 40). Owner: **PEOPLE**. People who share a grievance gather (a protest at city hall, a march) and some act on a grudge against a named official. Both are decisions from the person's drives and what they hold; officials, the press and voters read the crowd or the act.

10. **Records that stay readable for years** (U19; **9 cases**: 1, 2, 5, 6, 9, 14, 21, 26, 38). Owner: **CORE**. A dated record (a payment, a vote, a filing) stays indexed and readable for years without a daily scan. It carries the law that applied on its date. A later actor can read it under a later reading of that law, such as a successor prosecutor or an appeal.

Ties: gap U8 (campaign money) also unlocks 9 cases and ties for ninth place; U16 and U19 were kept by order of listing. Not in the top ten, by count:

- Campaign money as law-bound flows (U8, 9 cases)
- Patronage and merit rules (U9, 7 cases)
- Insider reports and what happens to the reporter (U12, 6 cases)
- Recall and initiative from performance, with money (U15, 6 cases)
- Kin and name inheritance (U17, 6 cases)
- Labor disputes and public pay (U11, 5 cases)
- Succession and vacancy contests (U7, 5 cases)
- Clemency (U14, 3 cases)
- Tax-bill shock and fiscal substitution (U18, 3 cases)

### The same ten, by pillar

- **GOV:** U1 Investigators and charging (17); U13 Oversight bodies, audits and inquiries (15); U5 Removal and pressure inside bodies and parties (15); U3 Voters read scandal as what they heard (13); U6 Make the bribe buy something (10).
- **PEOPLE:** U2 Surfacing to the press, and the press's choice (17); U10 Organized blocs and movements (14); U16 Crowds and violence from grievance (9).
- **CORE:** U4 A kept standing measure for each official (11); U19 Records that stay readable for years (9).

## Questions for the owner (not features)

- The 'This is a game, not a spreadsheet' rule means several real steps appear here as causes the engine should _read_, not as forms the player files (a charge, a disclosure, a hearing). If any of U1, U13 or U14 should wait for courts after early access, say so; U1 is written to start with the prosecutor's side only.
- Movements come after early access (`docs/archive/2026-10-23/roadmap/later-specs-draft.md`, speeches). U10 is ranked on case count, not schedule.
