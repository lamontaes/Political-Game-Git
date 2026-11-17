# Scene patterns from real lives

Written Nov 16 and 17, 2026, for the owner and the Story thread. Bank 1 (46 patterns) rewrites the first scene bank as patterns. Bank 2 (55 patterns) is new research, from the campaign through the first days in office, drawing on 65 people not in bank 1. Bank 3 (49 patterns, C01 to C49) covers what comes after the first election, from 15 lives of the last 30 years that neither earlier bank used; it is at the end of this file. The machine-readable copy is scene-patterns.json beside this file; the page is the Scene Bank artifact.

## How a pattern works

- **A pattern is not a place.** It is a moment that can happen to many players in many worlds. Real lives show that the moment happens; every name, place, office and number in play comes from the world's own records.
- **Slots.** A word in braces, like `{powerful officeholder}`, is a role the director fills from whoever holds such a part in that world. A senator, a representative, a governor or a big-city mayor can all fill `{powerful officeholder}`. Each pattern lists its own roles; the common ones are in the slot list below.
- **The setting is a slot too.** It names how the two came to be talking, and the director picks the place from the situation. A setting marked **fixed** names a place only because the moment needs it: the oath, the count, the debate stage, a hospital bed.
- **Gates and weights.** Gates are yes-or-no facts on record, and a pattern plays only when they hold. Weights are amounts (how many ties, how close the race, how long in office). They make a pattern likelier and never gate it at a number.
- **Branches** are versions by trait, household or record. Each is a different thing that happens, not another wording.
- **Every pattern has an outcome.** The choices are different things to do, and "If no" says what a no writes to the record. A no can set up something later.
- **Strings.** _Unlocks_ lists what this pattern's ending can open: its record is what the next pattern's gate reads. _Extends_ names an existing scene kind or catalog class this pattern adds to. _Merges with_ names patterns the director can blend with this one when both fit the same player at once. Ids: A = bank 1, B = bank 2, C = bank 3, a plain kind name is a scene kind the game has today, a catalog code (K1, M4) is a row in the scene catalog, and "needed later" marks a kind the inventory has not built yet.
- **Not locked to a stage** (bank 3). Each bank 3 pattern has a home stage and _Also plays in_: the other stages where its gates can hold. Pieces of several patterns that fit the same player can blend into one scene through _Merges with_; the aim is one coherent story, not a pick from a list. _Needs_ names the mechanics a pattern leans on that the game lacks or only partly has.
- Bank 1 merges: "The party asks you to run" holds the losing-seat committee, the organization's backing and the partner asked first; "Someone close to you runs" holds the friend, the partner and the grandparent; "Your people's votes, for a price" holds the block and the club; "The seat your patron leaves" holds the dying officeholder and the patron's judgeship; "Your people or theirs" holds the hostile council and the holdover department heads. Two-place scenes are split: the second place is now a branch or an unlock.

## Slots used across patterns

- `{the body}`: the place's own council, board, commission or legislature, by its own name from the record.
- `{the place}`: the town, county, state or district in play, by its own name.
- `{clerk}`: the official who runs filings and elections, by the title the place uses.
- `{open seat}`: an office on the ballot that the record says is open, short of candidates, or being left.
- `{household member}`: someone who lives with you: partner, parent, grandparent, adult child.
- `{close tie}`: a person the record ties to you closely: partner, parent, sibling, old friend.
- `{party official}`: someone holding a post in a party organization at the level in play, said with the post.
- `{powerful officeholder}`: whoever in that world holds an office with reach over yours: a senator, a representative, a governor, a big-city mayor, a chamber leader.
- `{recruiter}`: whoever does the asking: a party official, a cause group's organizer, a sitting officeholder.
- `{incumbent}`: the sitting holder of the seat in question.
- `{rival}`: your opponent in the race.
- `{winner}`: whoever won the race.
- `{campaign manager}`: whoever runs your campaign, said with the role.
- `{staffer}`: someone on your campaign or office staff, said with the job.
- `{ad maker}`: whoever makes your ads.
- `{donor}`: someone who gives or offers money, said with what they do.
- `{reporter}`: a reporter, said with the outlet.
- `{outlet}`: a paper, station or site on the place's press record.
- `{chamber leader}`: the leader of the body you were elected to, said with the post.
- `{senior member}`: a member of the body with power over committees or the calendar.
- `{organizer}`: someone who runs a group's work, said with the group.
- `{mentor}`: a teacher, coach or first boss the record ties to you as a mentor.
- `{volunteer}`: someone who works for the campaign unpaid.
- `{cause group}`: a group on record pushing a public question.
- `{local group}`: a group on record you belong to.
- `{the problem}`: a problem on record that touches your household, street or job.
- `{the cause}`: a public question on record with a group pushing it.
- `{candidate}`: a candidate named with the seat.
- `{treasurer}`: the campaign's treasurer.
- `{party}`: the party you are registered with or lean to.
- `{committee chair}`: the chair of a committee, said with years in the gavel.
- `{party leader}`: the leader of your party at your level or above it: a president, a governor, a mayor, or the party's leader in the body, said with the post.
- `{other-party leader}`: the leader of the other party at that level, said with the post.
- `{challenger}`: someone running against you, said with what they do.
- `{successor}`: whoever takes the office after you, said with party.
- `{higher government}`: the government above yours, said by its leader's post: the state over a town, the nation over a state.
- `{the disaster}`: a storm, flood, fire, heat wave, outage or attack on the world's record.

## Not in office (12)

A new adult with no office, and the moments that pull them in.

### A01. Brushed off by the body

Bank 1

**Moment.** You speak about {the problem} during public comment and {district member} brushes you off in front of {presiding officer}.

**Roles.** `{the problem}`: a problem on record that touches your home or street and that {the body} can act on. `{the body}`: the place's own council, board or commission, by its own name. `{presiding officer}`: whoever chairs {the body}, by the title the place uses. `{district member}`: the member for your district, said with how long they have held the seat.

**Setting (fixed).** the public comment period of {the body}'s meeting, because the turn at the microphone is the moment.

**Choices.** Press with what happened and who was hurt; ask who can act on it and when; say you will come back with neighbors; after a dismissive answer only: say the seat needs someone who listens.

**If no.** Leaving without answering writes that you let it go. A neighbor who was there can bring it up later.

**Gates (yes or no).** Not in office. {the problem} is on record and {the body} has the power to act on it. A meeting with public comment is on the calendar.

**Weights (amounts only).** How much {the problem} has cost your household. Traits that speak up. Meetings you attended before.

**Branches.**

- _By record, when {the body} acts on it:_ A member moves to fix it and it passes. You are known as the one who got it done, a fact the filing scenes read.
- _By record, when you keep coming back:_ {presiding officer} knows your name before you reach the microphone, and {district member} becomes the incumbent you would face.
- _By record, when your job is covering {the body} for {outlet}:_ You know the file better than the members, and speaking up puts your job's neutrality at stake.
- _By household, when {household member} came with you:_ That night {household member} asks whether you mean to do something about it.

**Unlocks.** A02 (The seat comes to you); A12 (The last day to file); A30 (Stay on your message); filing (kind); rival-word (kind).  
**Extends.** town-hall-question (kind).  
**Merges with.** A20 (Your plan goes to the voters).

**Real lives.**

- Jesse Ventura: In 1988, as a private citizen, he told the Brooklyn Park, Minnesota, council about storm runoff piped into a wetland and felt brushed off. He ran for mayor in 1990 and beat an 18-year incumbent. (https://news.minnesota.publicradio.org/features/199811/11_rabej_mayor/index.shtml)
- Ari Iaccarino: He emailed Somerville, Massachusetts, council members after each crash at the corner by his apartment until the city added a turn arrow in 2025, then ran for the council that year. (https://www.cambridgeday.com/2025/06/27/ari-iaccarino-dubbed-citys-intersection-guy-brings-safety-advocacy-to-somerville-race/)

### A02. The seat comes to you

Bank 1

**Moment.** Fewer people filed than there were seats, and enough voters wrote you in that {clerk} has to ask whether you will take {open seat}.

**Roles.** `{clerk}`: the official who runs the place's elections, by the title the place uses. `{open seat}`: a seat on {the body} that drew fewer candidates than openings.

**Setting.** Where {clerk} reaches you the day after the count, or the counting room if you worked the polls.

**Choices.** Accept the seat; decline it; ask for a day to talk it over at home.

**If no.** A decline writes that you turned the seat down. {the body} fills it another way, and whoever gets it knows you could have had it.

**Gates (yes or no).** Not in office. Fewer candidates filed than seats were open. Write-in votes for you are on the count.

**Weights (amounts only).** How many people in town know you. Traits that feel a duty to serve. Earlier asks to run that you turned down.

**Branches.**

- _By record, when you worked the count:_ You hear your own name read again and again, and the other counters look at you before {clerk} says a word.
- _By household, when you ask for a day:_ {household member} reminds you that you swore off this kind of thing, or tells you to take it.
- _By record, when you meant to run and missed the deadline:_ A friend offers to print stickers and postcards, and the write-in becomes your own campaign.

**Unlocks.** A40 (The empty chair); A38 (The paid post or the seat); swearing-in (kind); family-filing (kind).  
**Extends.** appointment (kind).  
**Merges with.** A12 (The last day to file); B33 (Write me in).

**Opened by.** A01 (Brushed off by the body); A08 (Your neighbors pick a leader).

**Real lives.**

- Eric Kitchen: In 2022 in Boonsboro, Maryland, two candidates filed for three council seats. Counting ballots on the election board, he kept hearing his own name, won the third seat on write-ins, and accepted it. (https://www.yahoo.com/news/lifelong-boonsboro-resident-learns-hes-090119486.html)
- Hal Colston: He missed the ballot deadline in Winooski, Vermont, and won a council seat as a write-in with stickers, posters and postcards. (https://www.sevendaysvt.com/news/colstons-write-in-bid-wins-him-a-winooski-city-council-seat-13392092/)

### A03. Turned away from voting

Bank 1

**Moment.** {poll worker} tells you, or {close tie} beside you, that a voting rule on record means no ordinary ballot today.

**Roles.** `{poll worker}`: the poll worker or deputy clerk at the table, said with the job. `{close tie}`: whoever came with you: a parent, grandparent, partner or neighbor.

**Setting (fixed).** the polling place or the clerk's registration counter, because the rule is applied there.

**Choices.** Cast a provisional ballot; ask to see the rule in writing; go to {clerk}'s office before the polls close; leave.

**If no.** Leaving writes that you did not vote this time and why. Someone outside saw you walk out.

**Gates (yes or no).** Old enough to vote. A voting rule in your state (ID, a roll purge, a moved polling place) that a fact of your household does not meet, such as a recent move or a name change. Election day or a registration deadline.

**Weights (amounts only).** Traits that push back. How strongly you hold views on the race.

**Branches.**

- _By household, when it is an older relative who is turned away:_ She asks you to drive her to {clerk}'s office, and whether she votes depends on you.
- _By record, when you are the poll worker:_ You must turn a neighbor away under the rule: follow it, offer the provisional ballot, or call {clerk}.
- _By record, when you tell a reporter:_ Your employer brings it up at work the next day, and your job is at stake for speaking out.

**Unlocks.** A19 (The token offer); cause-invite (kind); press-interview (kind).  
**Extends.** polling-place (kind, needed later).  
**Merges with.** A22 (You never asked).

**Real lives.**

- Fannie Lou Hamer: In 1962 the Mississippi sharecropper went with others to register, was failed on the literacy test and was fired by her boss for trying. She went on to help found the Mississippi Freedom Democratic Party. (https://en.wikipedia.org/wiki/Fannie_Lou_Hamer)

### A04. The speaker who never came

Bank 1

**Moment.** The person meant to speak for {candidate} at the gathering has not come, and the room looks for someone.

**Roles.** `{candidate}`: a candidate you back, named with the seat. `{host}`: whoever runs the gathering, named with the group. `{friend}`: the friend who brought you.

**Setting.** Wherever the gathering is: a candidates' night, a rally, a club meeting, from the calendar.

**Choices.** Stand up and speak for {candidate} (a short speech, one part at a time); stay seated; push {friend} to do it.

**If no.** Staying seated writes nothing against you. Someone else speaks, and an aide hands you flyers, a smaller door into the campaign.

**Gates (yes or no).** You attended the gathering. You back one of the candidates.

**Weights (amounts only).** Speaking traits, and a school record of debate or speeches. How strongly you back {candidate}.

**Branches.**

- _By record, when the speech lands:_ {candidate} finds you after and asks you to work on the campaign full time.
- _By record, when the speech falls flat:_ The parts you pick do not fit the room. {candidate} thanks you politely, and {host} remembers you tried.
- _By trait, when you are shy:_ {friend} volunteers you out loud. You can still decline, and {friend} brings it up later.

**Unlocks.** A16 (Someone close to you runs); A17 (The boss who hands you the work); volunteer-offer (kind).  
**Extends.** speech-afterward (kind); rally-word (kind).  
**Merges with.** A26 (A powerful officeholder comes to campaign).

**Real lives.**

- Lyndon B. Johnson: As a college student in 1930 he campaigned for Welly Hopkins, a state senate candidate, after a rousing speech at a political meeting in Blanco, Texas. Hopkins and Johnson's father then recommended him to a new congressman, who hired him. The speaker who fails to come is the game's addition. (https://www.discoverlbj.org/item/oh-hopkinsw-19650511-1-70-50, https://en.wikipedia.org/wiki/Lyndon_B._Johnson)

### A05. The party asks you to run

Bank 1

**Moment.** {recruiter} asks you to run for {open seat}, and what they want back is part of the ask.

**Roles.** `{recruiter}`: a party official, said with the post and how they know you or your family. `{open seat}`: a seat the party does not hold, or an open county or town seat.

**Setting.** Where {recruiter} would reach you: a letter or call where you live now, your home, or your shop or job near closing.

**Choices.** Say yes; say no; ask what they would put behind you, and what it costs once you hold the seat; ask for time to talk it over at home.

**If no.** A no writes that you turned the party down. The party runs someone else, and the next ask comes with less patience or from someone closer.

**Gates (yes or no).** Not in office. You are a party member or lean to the party. {open seat} is on the next ballot.

**Weights (amounts only).** Credentials the party values (service, a law degree, a business). How far your stances are from the incumbent's. Campaign work on your record. How many times in a row the party has lost the seat.

**Branches.**

- _By record, when your business or job is failing:_ The ask arrives with the debts on the counter, and the backing comes with a price you name or refuse.
- _By household, when they came for {household member} first:_ {household member} turns them down and they turn to you. {household member} is stung at being passed over, or relieved, by their traits.
- _By record, when you live elsewhere:_ Saying yes means moving home to meet the residency rule, and the talk at home is about the move as much as the race.
- _By record, when you were second choice:_ Someone else was asked first. A rival brings it up later, and {recruiter} admits it if asked.
- _By record, when they want your answers first:_ A sit-down with the committee follows, and each answer goes on your record as a stance.

**Unlocks.** filing (kind); M1 (catalog: Called in: sit down); A33 (The old debt comes to the door); A16 (Someone close to you runs).  
**Extends.** party-recruit (kind); K2 (catalog: The party comes to your shop).  
**Merges with.** A09 (Someone put your name in); A10 (The mentor who makes a call).

**Opened by.** A16 (Someone close to you runs).

**Real lives.**

- Richard Nixon: In 1945 a Republican committee in a California district held by the same Democrat looked for a candidate. A banker and family friend wrote to Nixon, then a Navy officer, who flew out, met the committee and won the seat in 1946. (https://en.wikipedia.org/wiki/Richard_Nixon)
- Harry S. Truman: In 1922, with his clothing store failing, the Pendergast organization recruited him for county judge, an office that ran county business. He won narrowly and lost in 1924 when a rival faction backed the Republicans. (https://flatlandkc.org/arts-culture/harry-trumans-remarkably-fraught-first-political-campaign/)
- Ann Richards: In 1975 Austin Democrats asked her husband David to run for county commissioner. He said no, so they asked her, and she won. (https://www.womenintexashistory.org/biographies/ann-richards/)

### A06. The regulars want a slate

Bank 1

**Moment.** {regular} says the people who gather at your work should run their own slate for {the body}, with you on it.

**Roles.** `{regular}`: someone who comes in often, named with their own work.

**Setting.** Your workplace, wherever your job record puts you with the public: a shop, a counter, a garage.

**Choices.** Join the slate as a candidate; offer the place to meet but stay off the ballot; keep politics out of work.

**If no.** Keeping politics out writes that you stayed out. The slate forms without you, and if it wins, its members come asking for your support on their first vote.

**Gates (yes or no).** Not in office. Your job record puts you where the public comes in. An election with more than one open seat on {the body} is coming.

**Weights (amounts only).** How many regulars you have ties with. Your household's income and line of work.

**Branches.**

- _By record, when you own the place:_ Hosting the meetings costs you customers who back the other side, and the lost business shows up later.
- _By record, when you work for someone:_ Your boss says no politics on the clock. Joining means meeting somewhere else, or risking the job.
- _By household, when {household member} helps:_ {household member} offers to write the flyers and coach your speeches, which widens the speech parts you can pick.

**Unlocks.** filing (kind); vote-sought (kind).  
**Extends.** nothing yet: a new kind.  
**Merges with.** A08 (Your neighbors pick a leader).

**Real lives.**

- Andrew Johnson: He ran a tailor shop in Greeneville, Tennessee, where locals argued politics while he worked. In 1829 he and friends put up a ticket of working men and he was elected to the town board. (https://www.nps.gov/anjo/learn/historyculture/overview.htm, https://en.wikipedia.org/wiki/Andrew_Johnson)

### A07. A neighbor starts a recall

Bank 1

**Moment.** {neighbor} wants to lead a recall of {officeholder} over {the decision}, and wants you beside them.

**Roles.** `{neighbor}`: someone {the decision} hurt the way it hurt you: another parent, a neighbor, a coworker. `{officeholder}`: a local officeholder the place's law lets voters recall: a school board member, a council member, a sheriff. `{the decision}`: a decision on record by {officeholder} that touched your household.

**Setting.** Where people {the decision} hurt would run into each other.

**Choices.** Lead the recall with them; sign the petition and no more; say you would rather run for the seat at the next election.

**If no.** Saying no writes that you stayed out. They run it anyway, and if it qualifies they ask again with {officeholder}'s name on every lawn sign.

**Gates (yes or no).** Not in office. {the decision} is on record and touched your household. The place's law allows a recall of {officeholder}.

**Weights (amounts only).** How much {the decision} cost your household. Your ties with others it hurt.

**Branches.**

- _By household, when a child of yours is in the schools and {officeholder} sits on the school board:_ {neighbor} is another parent, met at pickup, and the fight is over what the board did to your child's school.
- _By record, when a seasoned campaigner offers money and know-how:_ His price is a say in what the recall says, which changes who it answers to.
- _By record, when many families speak another language at home:_ A neighbor offers to gather signatures in it, which reaches voters the campaign could not.
- _By record, when you work for the body {officeholder} sits on:_ The recall is aimed at your employer, and {neighbor} wants you inside it.

**Unlocks.** door-signature (kind); appointment (kind).  
**Extends.** recall (kind).  
**Merges with.** A01 (Brushed off by the body).

**Real lives.**

- Siva Raj and Autumn Looijen: In 2021 two San Francisco parents with no political experience started a recall of school board members. A housing activist brought fundraising know-how, and in 2022 voters recalled three members. (https://www.educationnext.org/school-board-shakeup-san-francisco-arrogance-incompetence-woke-rhetoric-trigger-successful-recall-effort/)

### A08. Your neighbors pick a leader

Bank 1

**Moment.** At {local group}'s meeting, {member} nominates you out loud to lead it.

**Roles.** `{local group}`: a group on record you belong to: a volunteer fire company, a union local, a parents' group, a congregation committee, a neighborhood association. `{member}`: a member of {local group}, named with the group.

**Setting (fixed).** {local group}'s meeting, because the nomination happens in the room.

**Choices.** Accept; decline; accept only if someone you trust takes the second spot.

**If no.** A decline writes that you passed. Whoever takes it leads, and the next scene that needs a local leader goes to them.

**Gates (yes or no).** Not in office. You belong to {local group} and its leader post is open.

**Weights (amounts only).** Your ties within the group. Traits other people follow.

**Branches.**

- _By record, when the group must take a side:_ Soon it has to back or oppose a ballot measure or a candidate, and as its leader you speak for it.
- _By record, when someone else is nominated too:_ The vote is by hands, and the loser is someone you see every week.
- _By record, when only your own street backs you:_ The tally shows where your support lives, which a later race reads.

**Unlocks.** A02 (The seat comes to you); A35 (The loss that makes friends); party-recruit (kind); cause-invite (kind).  
**Extends.** nothing yet: a new kind.  
**Merges with.** A06 (The regulars want a slate).

**Real lives.**

- Abraham Lincoln: In 1832, about a year after moving to New Salem, Illinois, his neighbors elected him captain of their militia company. He lost his legislative race that year but carried New Salem almost to a man. (https://www.nps.gov/liho/learn/historyculture/newsalem.htm)

### A09. Someone put your name in

Bank 1

**Moment.** {recruiter} from {cause group} calls: {close tie} sent in your name, and they want you to challenge {incumbent} of your own party.

**Roles.** `{recruiter}`: an organizer from {cause group}. `{cause group}`: a group on record that recruits candidates. `{close tie}`: a sibling or friend who knows your views and did not tell you. `{incumbent}`: a long-serving member of your own party.

**Setting.** Where the call finds you: at work, at home.

**Choices.** Take a meeting with the group; decline; ask {close tie} why they did it before you answer.

**If no.** A decline writes that the group asked and you refused. It backs someone else against {incumbent}, who later asks for your endorsement.

**Gates (yes or no).** Not in office. {cause group} is active in your area. A recorded tie with {close tie}. Your stances differ from {incumbent}'s on a question the group cares about.

**Weights (amounts only).** How far your stances are from {incumbent}'s. A recent cause or protest you took part in.

**Branches.**

- _By record, when you keep your job:_ You campaign around your shifts, and customers start to recognize you.
- _By trait, when {close tie} meant it half as a joke:_ They are stunned you are taking it seriously. Their help depends on how you tell them.
- _By record, when the group wants a pledge:_ Signing its platform writes each stance to your record, and {incumbent} quotes it.

**Unlocks.** A28 (Called in to drop out); filing (kind); cause-invite (kind).  
**Extends.** party-recruit (kind).  
**Merges with.** A05 (The party asks you to run).

**Real lives.**

- Alexandria Ocasio-Cortez: After the 2016 election her brother nominated her to Brand New Congress, a group recruiting outsiders. She campaigned while working at a restaurant and beat a senior incumbent in the 2018 primary though heavily outspent. (https://en.wikipedia.org/wiki/Alexandria_Ocasio-Cortez)

### A10. The mentor who makes a call

Bank 1

**Moment.** {mentor}, who now holds or seeks an office, offers to call someone to get you {the job}.

**Roles.** `{mentor}`: a teacher, coach or first boss the record ties to you. `{the job}`: a government job you could not get alone: on a member's staff, in a department, on a police force.

**Setting.** Where {mentor} would reach you: a call home, a chance meeting at a school event.

**Choices.** Accept the help; turn it down and get there on your own; ask for a different kind of help, such as a reference.

**If no.** Turning it down writes that you refused a favor. {mentor} respects it or is hurt, by the tie, and stays in your life.

**Gates (yes or no).** Not in office. A mentor tie with someone now in politics. You need work or money for school.

**Weights (amounts only).** How strong the mentor tie is. Your household's money.

**Branches.**

- _By record, when the job falls through:_ The office loses your paperwork. {mentor} calls a second time, and the job comes with a debt you both carry.
- _By record, when you nearly quit later:_ Under pressure in the job, you think about leaving, and {mentor} says you will regret it.

**Unlocks.** A17 (The boss who hands you the work); A43 (Be my running mate); job-offer (kind).  
**Extends.** advice (kind).  
**Merges with.** A05 (The party asks you to run).

**Real lives.**

- Harry Reid: His high school government teacher and boxing coach, Mike O'Callaghan, called a congressman to insist on a promised job when it fell through; Reid got a police job that helped pay for law school. (https://thenevadaindependent.com/article/harry-reid-recalls-his-mentor-the-late-gov-ocallaghan, https://en.wikipedia.org/wiki/Harry_Reid)

### A11. A relative takes up a cause

Bank 1

**Moment.** {close tie} tells you they are about to do {the public act} for {the cause}.

**Roles.** `{close tie}`: an older relative or neighbor, named with how they are related to you. `{the cause}`: a public question on record with a group pushing it. `{the public act}`: something public and hard that the record lets them do: a long march, a fast, a sit-in, a vigil.

**Setting.** Wherever they would tell family first.

**Choices.** Join them for the first part; help from behind: drive, organize, raise money; try to talk them out of it; promise to be there at the end.

**If no.** Trying to talk them out of it writes that you opposed it. They go anyway, the press follows, and a reporter asks you why you did not.

**Gates (yes or no).** A recorded tie with {close tie}, whose stance on {the cause} is on record. A cause group is active on {the cause}.

**Weights (amounts only).** How strong the tie is. How strongly {close tie} holds the stance. Your own stance on {the cause}.

**Branches.**

- _By record, when {the public act} is a long march:_ Days on the road with them put you next to the cause group's organizers and in the papers, and both become ties and records.
- _By record, when their health turns bad:_ A hospital two towns away calls, and you decide whether to end it.
- _By record, when years later they file for office:_ They ask you to help, which opens the relative's race.

**Unlocks.** A16 (Someone close to you runs); cause-invite (kind); interview-invite (kind).  
**Extends.** cause-invite (kind).  
**Merges with.** none.

**Real lives.**

- Doris Haddock: At 88, in 1999, she set out from Pasadena to walk to Washington for campaign finance reform, about 3,200 miles over 14 months. In 2004, at 94, she ran for the U.S. Senate in New Hampshire on small donations and lost. (https://en.wikipedia.org/wiki/Doris_Haddock)

### A12. The last day to file

Bank 1

**Moment.** It is the last day to file for {open seat}, and {adviser} says today or never.

**Roles.** `{adviser}`: a friend or adviser, said with how they know you. `{open seat}`: a seat on the ballot, from the filing calendar.

**Setting.** Wherever the day finds you; filing itself happens at {clerk}'s counter.

**Choices.** File before the office closes; let the deadline pass; plan a write-in campaign instead.

**If no.** Letting it pass writes that you did not file. The race goes on without you, and the fight that made you think of running is still on the record.

**Gates (yes or no).** Not in office. It is the last filing day for {open seat}. A reason on record you have weighed running: a fight with {the body}, an ask you have not answered.

**Weights (amounts only).** How bad the fight with {the body} was. How many people in town know you.

**Branches.**

- _By record, when a fact on your record backs an attack:_ The incumbent says you cannot be reached (an unlisted number, a second home), and you answer it at the first forum.
- _By record, when the party's line is empty:_ The party's candidate just dropped out, and {party official} calls to ask you to fill the line before closing.

**Unlocks.** filing-clerk (kind); family-filing (kind); debate-invite (kind); A36 (Your people or theirs).  
**Extends.** filing (kind).  
**Merges with.** A02 (The seat comes to you); B33 (Write me in).

**Opened by.** A01 (Brushed off by the body); A35 (The loss that makes friends); B40 (Run again).

**Real lives.**

- Clint Eastwood: After fighting the Carmel, California, council over a building on his property, he decided to run for mayor hours before the 1986 filing deadline. The incumbent attacked his unlisted phone number, and he won in a landslide. (https://www.mentalfloss.com/article/78257/30-years-ago-clint-eastwood-was-elected-mayor-carmel-california, https://en.wikipedia.org/wiki/Political_life_of_Clint_Eastwood)

## Working inside politics (10)

Clubs, committees, staff jobs and appointed boards, before running.

### A13. Your first night in the party's room

Bank 1

**Moment.** At your first {party} meeting, {party official} and {old hand} size you up.

**Roles.** `{party}`: the party you are registered with or lean to. `{party official}`: the local party leader, said with years in the post. `{old hand}`: someone who has worked the district for decades, said with what they did before.

**Setting.** Wherever the party meets in this place, from its records: a back room, a hall, an office.

**Choices.** Sit in the back and listen; introduce yourself to {party official}; ask {old hand} how things work here.

**If no.** Not going writes that you were invited and stayed home. Whoever asked you notices.

**Gates (yes or no).** Not in office. You are registered with or lean to {party}. A local {party} meeting is on the calendar.

**Weights (amounts only).** Household money: a well-off home makes a scoff at home likelier. Traits that keep showing up.

**Branches.**

- _By household, when a well-off home:_ Before you go, a parent says these are not your kind of people. Answering that you mean to help run things goes on your record as a stance.
- _By household, when a working home:_ The scoff runs the other way: a relative says those people do not want anyone like you.
- _By record, when you keep coming:_ After several meetings {old hand} asks you for coffee, the tie a later nomination reads.

**Unlocks.** A14 (The empty party seat); A24 (The nomination fight in the room); A21 (The leaders pick alone).  
**Extends.** party-recruit (kind).  
**Merges with.** A21 (The leaders pick alone); B24 (Nobody sent you).

**Opened by.** B24 (Nobody sent you).

**Real lives.**

- Theodore Roosevelt: Around 1880, out of Harvard, he joined his district's Republican association, which met in a room over a saloon. His well-off friends laughed; he kept going, and his first ally was Joe Murray, who knew the district. (https://standardebooks.org/ebooks/theodore-roosevelt/an-autobiography/text/chapter-3)

### A14. The empty party seat

Bank 1

**Moment.** {volunteer} from the county party asks you to file for your precinct's seat on the party committee, which no one holds or no one uses.

**Roles.** `{volunteer}`: a county party volunteer, named with their own precinct.

**Setting.** Where a volunteer with a clipboard would find you during filing season.

**Choices.** File for the seat; ask what it takes before you decide; say no.

**If no.** A no writes that you passed. Whoever files later votes on whether you get the party's backing, or on a vacancy the party fills.

**Gates (yes or no).** Not in office. Party member. Your precinct's committee seat is empty, or its holder skips the meetings.

**Weights (amounts only).** How active you have been in the party. Your ties on your street.

**Branches.**

- _By record, when the seat is held but idle:_ Filing means a race for the smallest office on the ballot, and the holder's friends notice.
- _By record, when your first committee night:_ Within weeks you vote on who fills a vacancy. The vote is on your record, and someone owes you or blames you.
- _By record, when you have no party:_ Volunteers from each party ask you to register and file, and choosing writes your party.

**Unlocks.** A19 (The token offer); A15 (Your people's votes, for a price); A40 (The empty chair).  
**Extends.** filing (kind).  
**Merges with.** A13 (Your first night in the party's room).

**Opened by.** A13 (Your first night in the party's room); A15 (Your people's votes, for a price).

**Real lives.**

- Laura Loyacono: In 2020 she ran for a Democratic precinct committee seat in Kansas City, Missouri, after seeing members who were not active. Local public radio reported in 2024 that many committee seats in both Kansas Citys sat empty. (https://www.kcur.org/politics-elections-and-government/2024-07-15/kansas-citys-2024-ballots-include-hundreds-of-precinct-committee-members-heres-what-they-do)

### A15. Your people's votes, for a price

Bank 1

**Moment.** {party official} wants the people who follow your lead to vote and work for {the slate}, and asks what you want for them.

**Roles.** `{party official}`: the party's leader for your part of the place, said with how long they have held it. `{the slate}`: the leader's candidates in a contested primary or the fall race. `{your people}`: a street, a club or a group whose members follow your lead.

**Setting.** Where a leader would find you: your stoop, your club after a game, their storefront office.

**Choices.** Pledge your people to {the slate}; ask the rival faction what it offers; keep your people uncommitted and say so; put it to your people to vote on.

**If no.** Staying uncommitted writes that you would not deal. Both factions note it, and the winner remembers. If the party paid your club's bills, the money stops.

**Gates (yes or no).** Party member. A recorded following: a club you lead or a street that follows you. A contested primary or a race the party needs is coming.

**Weights (amounts only).** How many ties follow you. Traits that bargain. Your household's need for work.

**Branches.**

- _By record, when you ask for a public job in return:_ Where the place has a civil service law on record, {party official} cannot simply deliver, and says so, or offers to help with the test.
- _By record, when your first follower asks what he gets:_ A cousin or friend who followed you first wants his share, and his tie depends on the answer.
- _By record, when a bidding war:_ The rival faction offers more. Taking it makes an enemy of {party official}.
- _By record, when your club splits:_ Half work the polls and half quit, and the ones who quit blame you.

**Unlocks.** O1 (catalog: The jobs); M4 (catalog: The favor called in); A14 (The empty party seat); B39 (Everyone wants the credit).  
**Extends.** party-recruit (kind).  
**Merges with.** A21 (The leaders pick alone).

**Opened by.** A14 (The empty party seat).

**Real lives.**

- George Washington Plunkitt: The Tammany leader said in 1905 that he started with one follower, a cousin, added two friends next door, and worked down the block until the district leaders came courting. (https://www.marxists.org/reference/archive/plunkett-george/tammany-hall/)
- Richard J. Daley: He grew up in Chicago's Bridgeport and became president of the Hamburg Athletic Club, which local Democrats helped fund, then rose from precinct captain to the state House in 1936. (https://en.wikipedia.org/wiki/Richard_J._Daley)

### A16. Someone close to you runs

Bank 1

**Moment.** {close tie} has filed for office and asks what part you will play in the campaign.

**Roles.** `{close tie}`: someone the record ties to you closely: a friend, your partner, a parent or grandparent. `{the office}`: the seat they filed for.

**Setting.** Where {close tie} would ask you face to face, the day they file.

**Choices.** Run the campaign; help a few nights a week; keep the house running and stay out of the campaign; tell them it is a mistake, or ask why now.

**If no.** A no writes that you turned {close tie} down. They run without you, and the tie cools or holds by how you said it.

**Gates (yes or no).** {close tie} filed for office. A close recorded tie.

**Weights (amounts only).** How close the tie is. Organizing traits and campaign work on your record. Children at home. {close tie}'s health, when they are older.

**Branches.**

- _By household, when {close tie} is your partner:_ The talk is who covers the evenings and the money at home. Offering to be treasurer means you sign the reports, and a mistake on them is your record.
- _By household, when {close tie} is an older relative:_ Their health and your time are the stakes. If they lose by a lot and are proud of it, election night plays from the manager's side.
- _By record, when they win:_ They offer you a staff job, or you stand beside them on the stage and hear their promise with everyone else.
- _By record, when a fight over money:_ They want a donation you think will hurt. Overruling them or giving in goes on both your records.
- _By record, when you were asked first:_ If the party asked you first and you declined, it comes up again on election night.

**Unlocks.** A17 (The boss who hands you the work); A05 (The party asks you to run); race-won (kind); race-lost (kind); family-absence (kind).  
**Extends.** manager-offer (kind); family-filing (kind).  
**Merges with.** B02 (The manager you love).

**Opened by.** A04 (The speaker who never came); A05 (The party asks you to run); A11 (A relative takes up a cause); C48 (The cause you carry out).

**Real lives.**

- Ann Richards: In 1972 she ran her friend Sarah Weddington's winning campaign for the Texas House and worked as her aide; she had volunteered for years while raising four children. (https://www.biography.com/political-figures/ann-richards, https://www.womenintexashistory.org/biographies/ann-richards/)
- Doris Haddock: At 94 she entered a U.S. Senate race days before the filing deadline after the frontrunner left the race, took only small donations and lost to the incumbent. (https://en.wikipedia.org/wiki/Doris_Haddock)

### A17. The boss who hands you the work

Bank 1

**Moment.** {boss} is out again, and {visitor} wants a decision made in {boss}'s name.

**Roles.** `{boss}`: the officeholder you work for, named with the office. `{visitor}`: a constituent, lobbyist or department head, named with what they want.

**Setting.** Wherever {boss}'s office is.

**Choices.** Decide it yourself in {boss}'s name; tell {visitor} you will ask and wait; send {visitor} to someone else on the staff.

**If no.** Waiting writes that you did not overstep. {visitor} leaves unhappy and says the office does not answer.

**Gates (yes or no).** You work on an officeholder's staff.

**Weights (amounts only).** How often {boss} is absent or uninterested. Ambitious traits. How much {boss} trusts you.

**Branches.**

- _By trait, when a careful boss:_ {boss} finds out and tells you to stay in your lane. The tie drops and you are watched.
- _By record, when the rival calls:_ {boss}'s likely opponent asks you to lunch. Going is a betrayal if anyone sees.
- _By record, when you keep a list:_ A list of everyone you helped becomes a record your own race reads later.

**Unlocks.** A25 (The seat your patron leaves); warning (kind); K1 (catalog: A staffer asks for your endorsement).  
**Extends.** nothing yet: a new kind.  
**Merges with.** B01 (The local who knows every door).

**Opened by.** A04 (The speaker who never came); A10 (The mentor who makes a call); A16 (Someone close to you runs).

**Real lives.**

- Lyndon B. Johnson: In 1931 Congressman Richard Kleberg hired him, at 23, as his secretary. Kleberg had little interest in daily work and handed it to Johnson, who ran the office. (https://en.wikipedia.org/wiki/Lyndon_B._Johnson, https://www.lbjlibrary.org/object/text/transcript-1931-aegis-newspaper-article-lbj)

### A18. The appointment with a string on it

Bank 1

**Moment.** {appointer} tells you that your run for {the office} costs you the board seat they gave you.

**Roles.** `{appointer}`: the official who appointed you, or their chief of staff. `{the office}`: a race where {appointer} backs someone else.

**Setting.** Where {appointer} would summon you, on short notice.

**Choices.** Run and lose the seat; withdraw and keep the seat; ask for time and tell no one.

**If no.** Withdrawing writes that you backed down when told. {appointer} counts on you after that, and the candidate you would have faced knows why.

**Gates (yes or no).** You hold an appointed board seat. You filed or announced for an office where {appointer} backs someone else.

**Weights (amounts only).** How much the race matters to you. Traits that defy authority.

**Branches.**

- _By record, when you are removed:_ It is in the paper next morning. You can run on being the underdog or say nothing.
- _By record, when a quiet deal:_ {appointer} offers a better post after the election if you sit this one out, a promise on both records.
- _By record, when board business first:_ {appointer} asks how you will vote on a permit they care about, and the answer shows what you will trade.

**Unlocks.** filing (kind); interview-invite (kind); rival-word (kind).  
**Extends.** appointment (kind); M6 (catalog: The appointee who wants to run).  
**Merges with.** none.

**Real lives.**

- Harvey Milk: In 1976 Mayor George Moscone appointed him to San Francisco's Board of Permit Appeals; weeks later he announced for the state Assembly against the mayor's choice and was removed, which he said made him the underdog. (https://en.wikipedia.org/wiki/Harvey_Milk)

### A19. The token offer

Bank 1

**Moment.** {powerful officeholder} brings your group an offer: a token share of what it is fighting for, if it stops fighting.

**Roles.** `{powerful officeholder}`: someone with power over the party's convention or committee, carrying an offer from above. `{your group}`: a faction or cause group you belong to, challenging the party's slate or rules.

**Setting.** Wherever the party's convention or committee is meeting.

**Choices.** Take the offer; refuse it and keep the challenge going; counter with a demand of your own.

**If no.** Refusing writes that your group walked away from a deal. You are locked out this time, and the next convention reads that you held out.

**Gates (yes or no).** You belong to a group challenging the party's slate or rules. A party convention or committee meeting is on the calendar.

**Weights (amounts only).** How strong your group is on the record. Traits that hold out.

**Branches.**

- _By record, when you testify first:_ Before the offer you speak to the committee, one part at a time, and how it goes changes the offer.
- _By record, when your group splits:_ If you take it, the hard-liners blame you; some leave, and one runs against you later.
- _By record, when seated next time:_ If you held out, the next convention seats your group in full, and {powerful officeholder} has to greet you.

**Unlocks.** cause-invite (kind); rival-word (kind).  
**Extends.** nothing yet: a new kind.  
**Merges with.** A21 (The leaders pick alone).

**Opened by.** A03 (Turned away from voting); A14 (The empty party seat).

**Real lives.**

- Fannie Lou Hamer: In 1964 the Mississippi Freedom Democratic Party challenged the all-white state delegation at the national convention. Senator Hubert Humphrey brought an offer of two seats; the group refused, and was seated four years later. (https://en.wikipedia.org/wiki/Fannie_Lou_Hamer)

### A20. Your plan goes to the voters

Bank 1

**Moment.** {opponent} says what they fear about {your plan}, which {the body} must send to the voters.

**Roles.** `{your plan}`: a plan you put forward on a local board: merging schools, closing a branch, a new building. `{opponent}`: a resident who opposes it, named with what they fear. `{board chair}`: the chair of {the body}, said with years on it.

**Setting.** Where the plan is argued: {the body}'s meeting or a forum before the vote.

**Choices.** Send it to the ballot as written; change it to win over the opponents; pull it; answer the fear head on.

**If no.** Pulling it writes that you backed off. The problem it was meant to fix stays on the record and comes back.

**Gates (yes or no).** You hold a seat on a local board. {your plan} needs a vote of the people.

**Weights (amounts only).** How much the plan changes. How strong the opposition is on the record.

**Branches.**

- _By record, when the voters say no:_ Your name is on a losing measure, and rivals bring it up when you run.
- _By record, when it passes narrowly:_ The changes it makes produce effects that come back as scenes.

**Unlocks.** town-hall-question (kind); rival-word (kind); constituent-stop (kind).  
**Extends.** nothing yet: a new kind.  
**Merges with.** A01 (Brushed off by the body).

**Real lives.**

- Jimmy Carter: On the Sumter County, Georgia, school board he pushed to merge and reorganize the schools. Voters rejected it in a referendum, partly from fear it would lead to integration. (https://www.georgiaencyclopedia.org/articles/government-politics/jimmy-carter-b-1924, https://en.wikipedia.org/wiki/Jimmy_Carter)

### A21. The leaders pick alone

Bank 1

**Moment.** In {club}, the leaders choose the endorsements while newcomers set up chairs, and you ask for a say.

**Roles.** `{club}`: a party club you belong to. `{club leader}`: its leader, said with years in charge. `{rival leader}`: the leader of a rival club, said with the office they hold.

**Setting (fixed).** {club}'s meeting, because the vote is in the room.

**Choices.** Ask out loud for the members to vote; keep quiet and keep working; leave for the rival club.

**If no.** Keeping quiet writes that you went along. {club} endorses the leader's pick and you hand out its flyers.

**Gates (yes or no).** You belong to {club}. {club}'s endorsements are made by its leaders alone.

**Weights (amounts only).** Traits that speak up. How long you have been in {club}.

**Branches.**

- _By record, when you are told no in front of everyone:_ The sharp answer is earned now, and the room watches what you do next.
- _By record, when the rival club takes you in:_ {rival leader} gives you real work, a tie that matters when that seat opens.
- _By record, when two others stand with you:_ The leader gives in, or the three of you leave together.

**Unlocks.** A25 (The seat your patron leaves); K1 (catalog: A staffer asks for your endorsement).  
**Extends.** nothing yet: a new kind.  
**Merges with.** A13 (Your first night in the party's room); A15 (Your people's votes, for a price); B24 (Nobody sent you).

**Opened by.** A13 (Your first night in the party's room); B24 (Nobody sent you).

**Real lives.**

- Shirley Chisholm: In the 1950s she left Brooklyn's Bedford-Stuyvesant Political League after clashing with its leader over giving women members a say, and joined the Unity Democratic Club. (https://en.wikipedia.org/wiki/Shirley_Chisholm)

### B24. Nobody sent you

Bank 2 · volunteers

**Moment.** You offer to volunteer at {the party office}, and {committeeman} asks who sent you.

**Roles.** `{the party office}`: the party's ward or district office. `{committeeman}`: the party's man for the ward, said with the post.

**Setting (fixed).** {the party office}, because the door is the moment.

**Choices.** Name someone you know; leave and find another way in: a reform club, an independent group; come back with someone who vouches for you; argue.

**If no.** Leaving writes that the party turned you away. Another group may find you.

**Gates (yes or no).** Not in office. {the party office} is on record in your area.

**Weights (amounts only).** Your ties to anyone in the party. How closed the local party is.

**Branches.**

- _By record, when you know someone:_ The name opens the door, and you owe the name.
- _By record, when you go to the reform side:_ The faction tie is the start of your career.

**Unlocks.** A13 (Your first night in the party's room); A21 (The leaders pick alone); cause-invite (kind); volunteer-offer (kind).  
**Extends.** volunteer-offer (kind).  
**Merges with.** A13 (Your first night in the party's room); A21 (The leaders pick alone).

**Real lives.**

- Abner Mikva: In 1948 he walked into his Chicago ward office to volunteer for Adlai Stevenson and Paul Douglas. Asked who sent him, he said nobody, and was turned away; he later called it the start of his political career. (https://en.wikipedia.org/wiki/Abner_Mikva)

## The campaign (41)

From the filing to the polls closing: staff, money, endorsements, the opponent, attacks, debates, ads, doors, volunteers and the press.

### A22. You never asked

Bank 1

**Moment.** On election day {neighbor} tells you she will vote for you, though you never asked.

**Roles.** `{neighbor}`: someone who has lived beside your family for years, said with what they have done for each other.

**Setting.** Where you would meet on election day: outside the polling place, on your street.

**Choices.** Thank her and ask for her vote now; apologize for not asking; say you thought she knew.

**If no.** Saying you thought she knew writes that you took her for granted. After a loss, the talk at home turns on the streets you never knocked.

**Gates (yes or no).** Candidate, on election day. Your canvassing skipped your own street or precinct. A recorded tie with {neighbor}.

**Weights (amounts only).** How long the tie is. How close the race is.

**Branches.**

- _By record, when the tie is weaker:_ She says she voted for the other candidate because they came to her door.
- _By household, when a parent who once worked a precinct:_ After a loss, they say you lost your own neighborhood, and your answer decides whether the next campaign starts at home.
- _By record, when you did knock on her door:_ The scene does not play. She waves on her way in.

**Unlocks.** family-loss (kind); door-ask (kind); A35 (The loss that makes friends).  
**Extends.** door-ask (kind); election-night (kind).  
**Merges with.** A03 (Turned away from voting).

**Real lives.**

- Tip O'Neill: He lost his first race, for the Cambridge council, as a college student. A neighbor told him she voted for him though he never asked, and that people like to be asked. (https://massmoments.org/moment-details/tip-oneill-announces-run-for-congress.html, https://en.wikipedia.org/wiki/Tip_O%27Neill)

### A23. The count looks wrong

Bank 1

**Moment.** Word comes that in {county}, {chair} is telling voters how to vote and handling the ballots, and your race may turn on that count.

**Roles.** `{county}`: a part of your district where one official has run elections for years. `{chair}`: that official, said with the post and the years. `{messenger}`: whoever brings word, often a relative with ties there.

**Setting.** Where the word reaches you on election day: on the road between polling places, at headquarters.

**Choices.** Send a friend to watch; call a reporter; go there yourself; call a lawyer about the election contest law.

**If no.** Letting it go writes that you did not challenge. {chair} stays in charge, and if you run again the same county waits for you.

**Gates (yes or no).** Candidate, on election day. A recorded tie with someone in {county}. {chair} runs the count there.

**Weights (amounts only).** How close the race is. How many years {chair} has run things. Traits that fight or go by the book.

**Branches.**

- _By record, when you confront him:_ He says this is how it has always been done. What you saw earns the sharp reply, and he remembers it.
- _By record, when the reporter runs it:_ The story runs on the front page, and the reporter becomes a tie the press scenes read.
- _By record, when the challenge goes to a judge:_ Ballots turn up somewhere they should not be, and the ruling is a record the whole district reads.

**Unlocks.** K8 (catalog: The count is close); press-interview (kind); race-won (kind); B31 (The tie).  
**Extends.** election-night (kind).  
**Merges with.** B32 (The long count).

**Opened by.** B06 (The party leaves its own nominee).

**Real lives.**

- Jimmy Carter: On primary day in 1962 a cousin warned that something was wrong in Quitman County, Georgia. A friend saw the county boss telling voters how to vote; a judge later threw out the county's ballots, and Carter won his state senate seat. (https://www.atlantamagazine.com/news-culture-articles/the-first-campaign-an-excerpt-from-jimmy-carters-new-memoir-a-full-life/)

### A24. The nomination fight in the room

Bank 1

**Moment.** {old hand} puts your name up for the nomination against {party official}'s own pick.

**Roles.** `{old hand}`: a long-time worker in your party club, said with years there. `{party official}`: the district leader whose pick is being defied.

**Setting (fixed).** the party's nominating meeting, because the vote happens there.

**Choices.** Take the nomination fight; decline out of loyalty to {party official}; go to {party official} first and ask for a blessing.

**If no.** Declining writes that you stayed loyal. The leader's pick is nominated, and {old hand}'s tie with you drops.

**Gates (yes or no).** A recorded tie with {old hand}. {party official} has picked someone for an open nomination.

**Weights (amounts only).** How strong the tie with {old hand} is. How long you have come to meetings. How {party official}'s tie with you stands.

**Branches.**

- _By trait, when the leader takes it well:_ He helps in the fall and expects to be remembered.
- _By trait, when the leader is bitter:_ He sits out the general election and tells people you cannot be trusted.
- _By record, when you lose the vote:_ {old hand} says there is always next year, and {party official} knows who you are now.

**Unlocks.** filing (kind); A42 (The senior member sizes you up); rival-word (kind).  
**Extends.** nothing yet: a new kind.  
**Merges with.** A25 (The seat your patron leaves).

**Opened by.** A13 (Your first night in the party's room).

**Real lives.**

- Theodore Roosevelt: In 1881 Joe Murray broke with the district boss and backed the 23-year-old Roosevelt for the Assembly nomination. Roosevelt won it, the boss helped elect him, and he took his seat in 1882. (https://standardebooks.org/ebooks/theodore-roosevelt/an-autobiography/text/chapter-3, https://www.trlibrary.com/tr/new-york-politics/assembly)

### A25. The seat your patron leaves

Bank 1

**Moment.** {patron} is leaving {the seat} and you want it, before or against the people who usually decide.

**Roles.** `{patron}`: the officeholder the record ties you to: your spouse, your mentor, the member you worked for. `{the seat}`: their office. `{messenger}`: when they cannot ask themselves: a relative who carries the request.

**Setting.** Where {patron} would talk with you: their office, their home, a hospital room when they are ill.

**Choices.** Promise to run; go around the people who decide, through a group you lead; wait for the party's pick and back them; say you cannot think about that now.

**If no.** Waiting writes that you waited your turn. The pick owes you a little, and the seat may not open again for years.

**Gates (yes or no).** {patron} is leaving: an appointment to another post, retirement, or a grave illness on record. A close recorded tie with {patron}.

**Weights (amounts only).** How close the tie is. Your standing in a group outside the party. Your years in the party.

**Branches.**

- _By household, when {patron} is your spouse:_ They ask you to take the seat. The talk is about the marriage as much as the office, and it may come before a funeral.
- _By record, when the message comes through family:_ A brother or sister brings the request, and you have to trust it is what {patron} wants.
- _By record, when the club holds back:_ The committee says it is not sure you can win, and the reason comes from your record: age, how new you are, or who you are.
- _By record, when your own group carries you:_ Its members knock doors for you, and they expect you to remember.
- _By record, when nobody files against you:_ The other party fields no one in the special election, and you must win a full term months later.

**Unlocks.** filing (kind); funeral (kind); K7 (catalog: A death opens a seat); swearing-in (kind); A45 (A committee that does not fit your district).  
**Extends.** K1 (catalog: A staffer asks for your endorsement).  
**Merges with.** A24 (The nomination fight in the room).

**Opened by.** A17 (The boss who hands you the work); A21 (The leaders pick alone).

**Real lives.**

- Margaret Chase Smith: In 1940 her husband, Congressman Clyde Smith of Maine, ill after a heart attack, asked her to run for his seat. He died weeks later, and she won the special election. (https://en.wikipedia.org/wiki/Margaret_Chase_Smith)
- Nancy Pelosi: In 1987 Congresswoman Sala Burton, dying, asked that Pelosi succeed her. Pelosi won the special election. (https://capitolweekly.net/sala-burton-on-deathbed-sought-nancy-pelosi-to-succeed-her/)
- Shirley Chisholm: In 1964 the assemblyman whose club she worked in took a judgeship. The club hesitated to back her, so she went to women voters through a group she led and won. (https://en.wikipedia.org/wiki/Shirley_Chisholm)

### A26. A powerful officeholder comes to campaign

Bank 1

**Moment.** {powerful officeholder} offers to campaign beside you, and will want something afterward.

**Roles.** `{powerful officeholder}`: whoever in that world holds an office with reach: a senator, a representative, a governor, a big-city mayor, a chamber leader, said with the office and their rival. `{their rival}`: someone {powerful officeholder} is fighting who has ties to your place.

**Setting.** Where the offer reaches you: a call, a visit to your office.

**Choices.** Accept the whole tour; accept one event, not the tour; turn it down.

**If no.** Turning it down writes that you refused. You run on your own, and {their rival} hears and comes to you instead.

**Gates (yes or no).** Candidate. {powerful officeholder} is on record with a reason to want influence in your place.

**Weights (amounts only).** How weak your campaign is on the record. How much {their rival} matters to your place.

**Branches.**

- _By record, when the crowds come:_ You win, and the first ask comes before you are sworn in.
- _By record, when {their rival} calls to warn you off:_ Whatever you say goes on the record.
- _By record, when you speak first at the last stop:_ The speech you build shows whether you are their candidate or your own.
- _By record, when the crowd is hostile to the visitor:_ The visit becomes the story instead of the help.

**Unlocks.** M4 (catalog: The favor called in); M3 (catalog: The leader's treatment); race-won (kind).  
**Extends.** rally-word (kind).  
**Merges with.** B07 (The visit that goes wrong).

**Real lives.**

- Hattie Caraway and Huey Long: Appointed to her late husband's Senate seat in 1931, Caraway faced a primary in 1932. Senator Huey Long of Louisiana toured Arkansas with her for a week, partly to gain influence in the home state of a rival, and she won easily. (https://en.wikipedia.org/wiki/Hattie_Caraway, https://en.wikipedia.org/wiki/Huey_Long)

### A27. The incumbent who changed her mind

Bank 1

**Moment.** {incumbent}, who endorsed you for her seat, has filed to keep it after all.

**Roles.** `{incumbent}`: the sitting holder who backed you, said with years in the seat. `{lawyer}`: your campaign manager or lawyer, who has read the petitions.

**Setting.** Where you hear it: a call from {incumbent}, your campaign office.

**Choices.** Challenge her petition before the election board; run against her on the ballot; step aside for her.

**If no.** Stepping aside writes that you kept faith. She owes you, and the seat may open again when she leaves.

**Gates (yes or no).** Candidate. {incumbent} endorsed you and then filed for the seat again.

**Weights (amounts only).** How strong your campaign is. How close your tie with her is. Problems on her petition, when the record holds them.

**Branches.**

- _By record, when you win on paper:_ The board throws her off and you face no one. Some say you won on a technicality.
- _By record, when she calls you:_ She asks you to drop the challenge, and the talk is about promises; both records are read.
- _By record, when years later:_ You run against an entrenched member for a higher seat and lose badly; the people you knocked off the ballot do not help.

**Unlocks.** C2 (catalog: Someone challenges a petition); rival-word (kind); A35 (The loss that makes friends); race-lost (kind).  
**Extends.** C3 (catalog: The incumbent who said they would step aside).  
**Merges with.** A28 (Called in to drop out).

**Real lives.**

- Barack Obama: In 1995 state senator Alice Palmer backed him to succeed her, then filed to keep her seat. His campaign challenged petitions, and she withdrew after most of her signatures were ruled invalid; he ran unopposed. (https://en.wikipedia.org/wiki/Illinois_Senate_career_of_Barack_Obama)

### A28. Called in to drop out

Bank 1

**Moment.** {party official} asks you to drop your primary challenge to {incumbent} and wait your turn.

**Roles.** `{party official}`: the county or state chair of your own party. `{incumbent}`: your own party's sitting member, whom you filed against.

**Setting.** Where {party official} would summon you.

**Choices.** Stay in; drop out in return for support for a future open seat; ask for that promise in writing before you answer.

**If no.** Dropping out writes that you took the deal. {incumbent} is renominated, and the promise becomes a record {party official} has to keep.

**Gates (yes or no).** You filed in a primary against your own party's incumbent.

**Weights (amounts only).** How long {incumbent} has held the seat. How far your stances are from {incumbent}'s. Backing from a group outside the party.

**Branches.**

- _By record, when {incumbent} calls instead:_ He reminds you of something he did for your family, which the record holds.
- _By record, when your backers object:_ The group that recruited you says it will drop you if you take any deal.
- _By record, when you stay in and go where {incumbent} never goes:_ A voter asks you to come back after the election, and that promise goes on the record.

**Unlocks.** debate-sitting (kind); rival-word (kind); race-won (kind); race-lost (kind).  
**Extends.** M1 (catalog: Called in: sit down).  
**Merges with.** A09 (Someone put your name in); A27 (The incumbent who changed her mind).

**Opened by.** A09 (Someone put your name in).

**Real lives.**

- Gerald Ford: In 1948 he challenged a fellow Republican, an isolationist congressman, in the primary, campaigning at factory gates, church socials and farms from a Quonset hut, and won. (https://ford.blogs.archives.gov/2023/11/02/the-congressman-from-michigan/)

### A29. A friend files for the same seat

Bank 1

**Moment.** {friend} has filed for the seat you are running for.

**Roles.** `{friend}`: a close friend of many years, said with the cause or work you share.

**Setting.** Where {friend} would tell you face to face.

**Choices.** Stay in; step aside for {friend}; propose that neither of you goes negative.

**If no.** Stepping aside writes that you put the friendship first. {friend} may ask you to endorse them.

**Gates (yes or no).** Candidate. {friend} filed for the same office.

**Weights (amounts only).** How long the friendship is. How close the race is.

**Branches.**

- _By record, when your manager brings an attack ad on {friend}:_ Run it, cut it down to what the record holds, or refuse it. A charge beyond the record is marked as a lie.
- _By record, when a runoff:_ {friend} leads the first round, and the community's leaders pick sides.
- _By record, when after:_ Whoever loses makes a cold concession call. Years later one of you reaches out.

**Unlocks.** race-won (kind); race-lost (kind); reconciliation (kind); betrayal (kind, needed later).  
**Extends.** rival-word (kind); rally-opponent (kind).  
**Merges with.** B11 (Where were you).

**Real lives.**

- John Lewis: In 1986 he ran for an open Atlanta congressional seat against Julian Bond, a friend from the civil rights movement. In the runoff he challenged Bond to a drug test and his ads accused Bond of corruption; Lewis won 52 to 48. (https://en.wikipedia.org/wiki/John_Lewis, https://en.wikipedia.org/wiki/Julian_Bond)

### A30. Stay on your message

Bank 1

**Moment.** {campaign manager} hands you {incumbent}'s new mailer, which is about something other than {the problem} you run on.

**Roles.** `{campaign manager}`: your manager, said with the role. `{the problem}`: the one local problem your platform centers on.

**Setting.** Wherever the campaign works from.

**Choices.** Answer the mailer directly; say nothing and keep talking about {the problem}; turn it around: how little {incumbent} has done on {the problem}.

**If no.** Saying nothing writes that you stayed on message. That week's doors have read the mailer, and some ask you about it.

**Gates (yes or no).** Candidate. Your platform centers on {the problem}. {incumbent}'s campaign attacked you on another subject.

**Weights (amounts only).** How much {the problem} has cost the district. How far the attack goes.

**Branches.**

- _By record, when at a door:_ A resident who lives with {the problem} every day asks one thing: when it will be fixed. Your answer is a promise.
- _By record, when your old job was covering {the body}:_ {incumbent} says you broke your outlet's trust, and your old editor calls.
- _By record, when you win:_ {the problem} is your first bill, and later scenes read whether it got fixed.

**Unlocks.** door-ask (kind); debate-sitting (kind); D3 (catalog: The door that tells you something).  
**Extends.** rival-word (kind).  
**Merges with.** B12 (Not one of us); B17 (The letter in the last week).

**Opened by.** A01 (Brushed off by the body).

**Real lives.**

- Danica Roem: In 2017 the former local reporter ran for the Virginia House on fixing a clogged commuter road, said her 25-year incumbent spent more time on bathroom policy, knocked thousands of doors and won. (https://en.wikipedia.org/wiki/Danica_Roem, https://theintercept.com/2017/06/13/a-transgender-candidate-won-her-virginia-primary-with-a-focus-on-fixing-route-28/)

### A31. Taken ill before election day

Bank 1

**Moment.** You are in the hospital days before the polls open, and {campaign manager} asks what the campaign says.

**Roles.** `{campaign manager}`: your manager. `{household member}`: your partner or a parent, in the room.

**Setting (fixed).** the hospital room, because your being there is the moment.

**Choices.** Let {household member} speak for you at the final rally; put out a statement from the bed; tell {campaign manager} to keep it quiet.

**If no.** Keeping it quiet is a lie by silence on the record. If a reporter finds out, the story is the secret, not the illness.

**Gates (yes or no).** Candidate, in the final days. The health record puts you in the hospital (never authored).

**Weights (amounts only).** How close the race is. {household member}'s speaking traits.

**Branches.**

- _By household, when {household member} speaks:_ Their speech is built one part at a time, and how it goes changes how the town sees your household.
- _By record, when the reporter asks:_ Whether you will be able to serve.
- _By record, when you win from the bed:_ The victory plays at the bedside instead of on a stage.

**Unlocks.** race-won (kind); race-lost (kind); press-interview (kind); swearing-in (kind).  
**Extends.** care (kind).  
**Merges with.** A37 (The seat and the funeral).

**Real lives.**

- Lyndon B. Johnson: Running in a 1937 special House election, he was rushed to an Austin hospital with appendicitis about a day and a half before the polls opened, and won with under a third of the vote. (https://www.haysfreepress.com/article/1452,bedridden-lbj-wins-his-first-election)

### A32. The lines move

Bank 1

**Moment.** {organizer} shows you the new district map: a seat that now fits where your support lives.

**Roles.** `{organizer}`: a party worker or cause organizer. `{the change}`: a court ruling, a law or a measure on record that redrew districts or switched to district seats.

**Setting.** Wherever {organizer} would bring the map.

**Choices.** File for the new seat; wait to see who else files; stay out.

**If no.** Staying out writes that you passed. Whoever wins it holds it when you next think of running.

**Gates (yes or no).** {the change} is on record. You lost an earlier race.

**Weights (amounts only).** How much of your old support falls inside the new lines. How many times you have run.

**Branches.**

- _By record, when two neighbors file too:_ Your first doors are on streets where you know people.
- _By record, when the incumbent is drawn out:_ They call to ask whether you will step aside so they can move in.
- _By record, when you win:_ You arrive in a body that has never had anyone like you.

**Unlocks.** filing (kind); A42 (The senior member sizes you up); door-ask (kind).  
**Extends.** O5 (catalog: Changing the rules of the race).  
**Merges with.** A35 (The loss that makes friends).

**Real lives.**

- Barbara Jordan: She lost Texas House races in 1962 and 1964; after a court ordered new districts, a new Houston district elected her to the state senate in 1966. (https://en.wikipedia.org/wiki/Barbara_Jordan)
- Harvey Milk: He lost two citywide supervisor races; after voters approved district elections in 1976, he won his neighborhood's seat in 1977. (https://en.wikipedia.org/wiki/Harvey_Milk)

### A33. The old debt comes to the door

Bank 1

**Moment.** {creditor} is owed money from a business of yours that failed, and you are now a candidate.

**Roles.** `{creditor}`: a supplier, a lender, or a late partner's family, said with what they are owed for.

**Setting.** Where {creditor} would come: your door, your office.

**Choices.** Agree to pay on a schedule; ask a friend with money for help; tell them to take it to court; ask them to wait until after the election.

**If no.** Telling them to take it to court writes a lawsuit. It is public, and a rival or reporter can find it.

**Gates (yes or no).** A business of yours failed with debts unpaid. You are a candidate or hold office.

**Weights (amounts only).** How large the debt is. How public your profile is.

**Branches.**

- _By record, when a banker friend offers to cover it:_ Taking it clears the debt and makes a debt of another kind.
- _By household, when {household member} did not know:_ They learn of it at the door, and the talk after is about trust.

**Unlocks.** scandal (kind); M4 (catalog: The favor called in); rival-word (kind).  
**Extends.** scandal (kind).  
**Merges with.** B38 (The bills after the race).

**Opened by.** A05 (The party asks you to run).

**Real lives.**

- Harry S. Truman: His clothing store failed in the 1921 recession, and he did not pay off the last of its debts until 1935. (https://en.wikipedia.org/wiki/Harry_S._Truman)
- Abraham Lincoln: His New Salem store went into debt, and when his partner died he was left with what they owed. (https://www.nps.gov/liho/learn/historyculture/newsalem.htm)

### A34. After the threat

Bank 1

**Moment.** Someone has threatened or attacked your household after {your stand}, and {household member} asks what now.

**Roles.** `{your stand}`: a vote, a race or a cause on record. `{household member}`: your partner or the relative you live with.

**Setting.** Wherever your household is that night.

**Choices.** Send the family to stay with relatives for a while; stay and go to the police; go public about it; step back from the cause or the race.

**If no.** Stepping back writes that the threat worked. The people who made it know, and so does your side.

**Gates (yes or no).** A threat or attack on your household is on record (never authored). {your stand} is on record.

**Weights (amounts only).** Children at home. How public the stand was.

**Branches.**

- _By household, when {household member} wants to move for good:_ What you decide changes the household's records.
- _By record, when the police:_ They treat it as a prank or take it seriously, by the place's record, and either way it becomes a story.
- _By record, when coming back:_ Weeks later the neighbors who helped meet you, and they are the first of your volunteers.

**Unlocks.** cause-invite (kind); press-interview (kind); volunteer-offer (kind).  
**Extends.** warning (kind).  
**Merges with.** none.

**Real lives.**

- Fannie Lou Hamer: In 1962, days after she tried to register, shots were fired into the home where she was staying. She and her family left for about three months, then came back and kept organizing. (https://en.wikipedia.org/wiki/Fannie_Lou_Hamer)

### B01. The local who knows every door

Bank 2 · staff

**Moment.** {local operator}, who knows the district's families and doubted you, offers to work for you after hearing you speak where you did not expect anyone to listen.

**Roles.** `{local operator}`: someone with ties across the district and no campaign, said with where they grew up and what they do.

**Setting.** Where {local operator} would catch you after you spoke: the back of a hall, the sidewalk outside.

**Choices.** Ask them to run your days and your doors; ask only for names; thank them and keep your own people.

**If no.** Keeping your own people writes that you turned them down. They sit out or go to {rival}, and the doors they knew stay closed.

**Gates (yes or no).** Candidate. A person on record with ties across the district who is with no campaign. They attended an event where you spoke.

**Weights (amounts only).** How many ties they hold. How far your background is from the district's. Your speaking traits.

**Branches.**

- _By record, when they doubted you as a rich outsider:_ They say so first. Whether you answer it decides how hard they work.
- _By record, when they complain that politicians never knock:_ They take you door to door on their own streets, which opens doors no list would.
- _By record, when you win:_ They stay for years, a staff tie later scenes read.

**Unlocks.** door-ask (kind); volunteer-offer (kind); K1 (catalog: A staffer asks for your endorsement).  
**Extends.** manager-offer (kind).  
**Merges with.** A17 (The boss who hands you the work); B27 (The volunteer who wants a real job).

**Real lives.**

- John F. Kennedy and Dave Powers: In Kennedy's 1946 House race in Boston, Dave Powers, a Charlestown man who knew the district and had doubted a rich Harvard man, joined after hearing him speak to mothers who had lost sons in the war, and stayed with him until 1963. (https://en.wikipedia.org/wiki/David_Powers, https://jfk50.blogspot.com/2014/11/jfk-elected-to-congress.html)

### B02. The manager you love

Bank 2 · staff

**Moment.** {close tie} wants to run your campaign, and the campaign's people have doubts.

**Roles.** `{close tie}`: your partner, a sibling or someone you are seeing. `{their past work}`: a job or client on their record that a rival could use.

**Setting.** Where you would talk it over: home, the campaign office after hours.

**Choices.** Give them the job, with a salary on the reports; give them a role without pay; give them the money side only, as treasurer; keep the campaign to hired staff.

**If no.** Keeping them out writes that you kept the campaign separate. The tie strains or holds, by their traits.

**Gates (yes or no).** Candidate. A close recorded tie who has offered to run it.

**Weights (amounts only).** Their campaign or business experience. How close the tie is. How much money the campaign has.

**Branches.**

- _By household, when a sibling with money and connections:_ They pay for it and run it. The campaign is the family's, and the sibling's word carries.
- _By record, when their pay is on the reports:_ A reporter asks why your partner is paid what they are.
- _By record, when {their past work} comes out:_ A client, a foreign government or a lobby job on their record becomes {rival}'s line.
- _By record, when a money matter in your own family:_ A family payment that should have gone back to a public program surfaces. Pay it back and call it an error, or fight it.

**Unlocks.** scandal (kind); press-interview (kind).  
**Extends.** manager-offer (kind).  
**Merges with.** A16 (Someone close to you runs).

**Real lives.**

- Carol Moseley Braun: In her 1992 Illinois Senate race she paid her fiancé, Kgosie Matthews, a monthly fee as a strategist, which drew scrutiny. It also came out that part of a timber royalty from family land should have repaid Medicaid for her mother's care; she paid it and called it an error. (https://en.wikipedia.org/wiki/Carol_Moseley_Braun, https://www.newsweek.com/braun-brouhaha-192304)
- Jeannette Rankin: Her brother Wellington, a well-connected Montana Republican, financed and managed her 1916 campaign. (https://en.wikipedia.org/wiki/Jeannette_Rankin)

### B03. Outspent

Bank 2 · money

**Moment.** {rival} has many times your money, and {ad maker} pitches something cheap and odd instead of ads you cannot afford.

**Roles.** `{ad maker}`: a consultant or volunteer with a knack for ads.

**Setting.** Wherever the campaign works from.

**Choices.** Run the odd ad; put the money into a bus and doors instead; borrow to buy ordinary ads; ask {donor} to cover the gap, with whatever comes with it.

**If no.** Turning the pitch down writes that you ran a plain campaign, and {rival}'s ads fill the air.

**Gates (yes or no).** Candidate. {rival} has raised more than you on the reports.

**Weights (amounts only).** How far behind in money you are. Humor traits. How many young volunteers you have.

**Branches.**

- _By record, when students and first-time voters pour in:_ They want a say in the message, and how you answer keeps them or loses them.
- _By record, when the odd ad works:_ The news plays it for free, and {rival} has to answer it.
- _By record, when the odd ad flops:_ The press calls the campaign unserious.

**Unlocks.** volunteer-offer (kind); interview-invite (kind); B22 (The first spots).  
**Extends.** donor-ask (kind).  
**Merges with.** B04 (The check you send back); B22 (The first spots).

**Real lives.**

- Paul Wellstone: Outspent about seven to one by Senator Rudy Boschwitz in Minnesota in 1990, he campaigned from a bus and ran quirky low-budget ads, one a parody in which he goes looking for his opponent. Students and first-time voters joined, and he was the only challenger to beat a sitting senator that year. (https://en.wikipedia.org/wiki/Paul_Wellstone)

### B04. The check you send back

Bank 2 · money

**Moment.** {donor} sends money you did not ask for, and keeping it would make you look like theirs.

**Roles.** `{donor}`: a person or group with business before the office you seek.

**Setting.** Where the gift reaches you: the mail, a handoff at an event.

**Choices.** Keep it; send it back with a note; send it back and say so in public; make a rule to take no money at all.

**If no.** Keeping it writes the gift on the reports and a tie with {donor} that a rival or reporter can read.

**Gates (yes or no).** Candidate. A gift on record from someone with business before the office.

**Weights (amounts only).** How large the gift is. How close the race is. Thrift traits.

**Branches.**

- _By record, when you have lost before:_ After several losses you run on handshakes and almost no money, and the papers notice.
- _By record, when no money at all:_ In later races you spend almost nothing beyond the filing, and that becomes who you are.

**Unlocks.** press-interview (kind); B40 (Run again).  
**Extends.** donor-ask (kind).  
**Merges with.** B03 (Outspent).

**Real lives.**

- William Proxmire: He lost three races for governor of Wisconsin before winning the 1957 special Senate election. Late in his career he returned unsolicited donations and spent under $200 to win reelection, mostly on filing paperwork. (https://en.wikipedia.org/wiki/William_Proxmire, https://www.senate.gov/artandhistory/history/minute/Senator_William_Proxmire.htm)

### B05. Every paper against you

Bank 2 · press

**Moment.** Every outlet in {the place} has endorsed {rival}, and {staffer} says the campaign needs its own way to reach people.

**Roles.** `{staffer}`: whoever runs your message.

**Setting.** Wherever the campaign works from.

**Choices.** Start your own paper or sheet; buy radio time or sound trucks; go town to town in person; court one editor.

**If no.** Going on as before writes that you left the press to {rival}.

**Gates (yes or no).** Candidate. The outlets on record have endorsed {rival}.

**Weights (amounts only).** Money. How spread out the place is. Speaking traits.

**Branches.**

- _By record, when your own paper:_ It becomes a record of what you said that reporters can quote back.
- _By record, when the papers run your old words:_ The attacks become a daily box of your own lines.

**Unlocks.** interview-invite (kind); press-interview (kind); B15 (Your own words, cut up).  
**Extends.** interview-invite (kind).  
**Merges with.** B15 (Your own words, cut up); B16 (The attack on your partner).

**Real lives.**

- Huey Long: In the 1928 Louisiana governor's race he used sound trucks and radio ads; running for the Senate in 1930 with all of the state's daily papers backing his opponent, he started his own paper. (https://en.wikipedia.org/wiki/Huey_Long)
- Upton Sinclair: In the 1934 California governor's race the big Hearst and Chandler papers attacked him throughout. (https://en.wikipedia.org/wiki/End_Poverty_in_California)

### B06. The party leaves its own nominee

Bank 2 · endorsements

**Moment.** You won your party's primary, and {party official} says the organization helps only if it gets a say over {the post}.

**Roles.** `{party official}`: the county chair of your party. `{the post}`: a top appointment you would make, such as the police chief.

**Setting.** Where {party official} would summon you.

**Choices.** Give a say over one post; refuse and run without the organization; ask the state or national party to step in; take it public.

**If no.** Giving in writes an obligation {party official} calls in once you hold office.

**Gates (yes or no).** You won your party's nomination. A party organization on record with a chair.

**Weights (amounts only).** How much the organization's turnout matters in your place. How far your stances are from the chair's.

**Branches.**

- _By record, when the organization backs the other party's candidate:_ The attacks come from your own side, and the outside help they draw is real: money and volunteers from beyond the place.
- _By record, when you win anyway:_ {party official} is an enemy you face in the next primary.
- _By record, when trouble at the polls in your strongest precincts:_ A complaint, a lawyer and a watcher, as in the count that looks wrong.

**Unlocks.** A23 (The count looks wrong); M4 (catalog: The favor called in); rival-word (kind); race-won (kind).  
**Extends.** party-recruit (kind).  
**Merges with.** A28 (Called in to drop out).

**Real lives.**

- Richard Hatcher: After he beat Gary, Indiana's sitting mayor in the 1967 Democratic primary, the county chairman wanted a say over the police chief and other top posts. Hatcher refused, the organization swung behind the Republican, and its tactics backfired by drawing outside money and help. Hatcher won narrowly. (https://en.wikipedia.org/wiki/Richard_G._Hatcher, https://en.wikipedia.org/wiki/1967_Gary,_Indiana,_mayoral_election, https://content.time.com/time/subscriber/article/0,33009,844058-4,00.html)

### B07. The visit that goes wrong

Bank 2 · endorsements

**Moment.** {powerful officeholder} came to campaign beside you, and at {the stop} the crowd turns on you both.

**Roles.** `{powerful officeholder}`: whoever holds an office with reach in that world, said with the office. `{the stop}`: a place where voters who oppose you gather: a church, a market, a hall, from the record.

**Setting.** {the stop}, chosen from where opposition to you is strongest on the record.

**Choices.** Stay and speak; leave with your guest; come back alone another day; use the footage of the crowd in an ad.

**If no.** Leaving writes that you left. The footage runs without your answer.

**Gates (yes or no).** Candidate. A visit by {powerful officeholder} on the calendar. A stop in an area that opposes you.

**Weights (amounts only).** How hostile the area is. Calm traits. Your guest's traits.

**Branches.**

- _By record, when the footage:_ It can reach voters put off by the crowd. Using it writes an ad record and costs you the stop's voters for good.
- _By record, when your guest's people blame you:_ They say you chose the stop, and the next visit is harder to get.

**Unlocks.** press-interview (kind); B22 (The first spots).  
**Extends.** rally-opponent (kind).  
**Merges with.** A26 (A powerful officeholder comes to campaign).

**Real lives.**

- Harold Washington: In the 1983 Chicago general election, protesters confronted Washington and former Vice President Walter Mondale outside St. Pascal's church on the Northwest Side. The campaign later used footage of them in ads aimed at white liberals. (https://en.wikipedia.org/wiki/1983_Chicago_mayoral_election)

### B08. The rival who coasts

Bank 2 · opponent

**Moment.** {rival}, far ahead, takes days off and says something that sounds like the race is beneath them.

**Roles.** `{rival}`: the front-runner.

**Setting.** Wherever the news reaches you.

**Choices.** Go where {rival} will not: the stadium gate, the plant at shift change; put the remark in an ad; say nothing and keep working the district; ask whoever {rival} slighted for an endorsement.

**If no.** Saying nothing writes nothing. {rival}'s lead holds or slips on its own.

**Gates (yes or no).** Candidate. A remark or an absence on {rival}'s record.

**Weights (amounts only).** How far behind you are. How big the slip is. Traits that pounce.

**Branches.**

- _By record, when {rival} slights a well-known local figure:_ That person backs you.
- _By record, when you are the one far ahead:_ The days off and the remark are yours to take or not, and the record keeps where you were.

**Unlocks.** K5 (catalog: Answer for a vote you once cast); rival-word (kind); interview-invite (kind).  
**Extends.** rival-word (kind).  
**Merges with.** B10 (The rival under indictment); B11 (Where were you).

**Real lives.**

- Scott Brown: In the January 2010 Massachusetts special Senate election, Democrat Martha Coakley took days off less than a month out, asked whether she should be standing outside Fenway Park shaking hands, and called the pitcher Curt Schilling a Yankees fan. Brown, a Republican, won. (https://en.wikipedia.org/wiki/2010_United_States_Senate_special_election_in_Massachusetts)

### B09. The machine against you

Bank 2 · opponent

**Moment.** Your signs come down overnight, and {staffer} says people who work for {the place} are being told not to help you.

**Roles.** `{incumbent}`: the long-serving executive you are running against. `{staffer}`: whoever runs your field work.

**Setting.** Wherever the campaign works from, the morning after.

**Choices.** Put the signs back up every night; film it and go to the press; file complaints; answer the not-one-of-us charge at the doors.

**If no.** Letting it go writes nothing filed, and the doors go quieter.

**Gates (yes or no).** Candidate against a sitting executive. Workers or police on record pulling signs or pressuring staff (acts by people in the world, never authored).

**Weights (amounts only).** How long {incumbent} has held office. How many public workers live in your district.

**Branches.**

- _By record, when you lose:_ The run-again question comes the morning after.
- _By record, when a film crew follows the campaign:_ What they catch becomes a record later scenes read.

**Unlocks.** B40 (Run again); press-interview (kind); accusation (kind).  
**Extends.** rival-word (kind).  
**Merges with.** B12 (Not one of us).

**Real lives.**

- Cory Booker: Challenging Newark's longtime mayor Sharpe James in 2002, he was called a carpetbagger and too suburban to understand the city, and a documentary showed police and firefighters tearing down a big Booker sign. He lost about 53 to 47 and won in 2006. (https://en.wikipedia.org/wiki/2002_Newark_mayoral_election, https://www.governing.com/archive/Street-Fightin-Man.html)

### B10. The rival under indictment

Bank 2 · opponent

**Moment.** {incumbent} is under indictment, and you are the other party's long shot in a seat your party never wins.

**Roles.** `{incumbent}`: the sitting holder, with charges on the justice record.

**Setting.** Wherever the campaign works from.

**Choices.** Run on the charges; run on what the district needs; stay quiet and let the trial speak; reach for {incumbent}'s own voters.

**If no.** Staying quiet writes that you did not make the charges your campaign.

**Gates (yes or no).** Candidate of the party that does not hold the seat. Charges against {incumbent} on the justice record.

**Weights (amounts only).** How lopsided the district is. How far along the case is.

**Branches.**

- _By record, when a storm moves the election:_ A disaster on record pushes the dates back under the state's election law, and the trial now falls near the vote.
- _By household, when your own home was damaged:_ You campaign from a damaged house, and voters see it.

**Unlocks.** race-won (kind); interview-invite (kind).  
**Extends.** rival-word (kind).  
**Merges with.** B08 (The rival who coasts).

**Real lives.**

- Joseph Cao: In 2008 the nine-term New Orleans congressman William Jefferson was under federal indictment. Hurricane Gustav pushed the election back, and Cao, a Republican whose own home flooded in the storm, won a heavily Democratic seat. (https://en.wikipedia.org/wiki/Joseph_Cao, https://rollcall.com/2008/11/03/louisiana-campaigns-will-continue-next-month/)

### B11. Where were you

Bank 2 · attacks

**Moment.** {ad maker} has an ad that hunts for {incumbent} over missed votes and paid speeches.

**Roles.** `{incumbent}`: the sitting member, with absences or paid speeches on record. `{ad maker}`: your ad maker.

**Setting.** Wherever the campaign works from.

**Choices.** Run it; run it with the true attendance figure in it; refuse it.

**If no.** Refusing writes that you kept it off the air.

**Gates (yes or no).** Candidate against an incumbent. {incumbent}'s absences or paid speeches on record.

**Weights (amounts only).** How many absences there are. How close the race is.

**Branches.**

- _By record, when the attendance record is good:_ The ad overstates it and is marked as a lie. Anyone can find the true figure.
- _By record, when you are the target:_ Answer with your record, ignore it, or hit back.

**Unlocks.** L6 (catalog: Your absences used against you); rival-word (kind); debate-sitting (kind).  
**Extends.** L6 (catalog: Your absences used against you).  
**Merges with.** A29 (A friend files for the same seat); B08 (The rival who coasts).

**Real lives.**

- Mitch McConnell: In the 1984 Kentucky Senate race his ads showed bloodhounds searching for Senator Dee Huddleston over missed votes and paid speeches. Huddleston's voting record was in fact high, and McConnell won by about 5,000 votes. (https://en.wikipedia.org/wiki/1984_United_States_Senate_election_in_Kentucky)

### B12. Not one of us

Bank 2 · attacks

**Moment.** {rival} says you are not really from here: your schooling, your money or the years you lived elsewhere.

**Roles.** `{rival}`: your opponent.

**Setting.** Where the charge reaches you: a forum, an ad, a door.

**Choices.** Answer with where you were and why; answer with your roots; turn it on {rival}; let it go.

**If no.** Letting it go writes no answer, and voters who heard it keep it.

**Gates (yes or no).** Candidate. A fact on your record the charge can stand on: schooling elsewhere, a recent move, family money.

**Weights (amounts only).** How recently you moved. How far your background is from the district's.

**Branches.**

- _By record, when you were away serving:_ The answer is the service, said once at a forum, and it ends the charge.
- _By record, when you were away at school, from money:_ {rival} sets your school beside theirs, and it sticks unless you have something local to point to.
- _By record, when you lose on it:_ You never let yourself be outdone on roots again, a stance later scenes read.

**Unlocks.** debate-sitting (kind); town-hall-question (kind); B40 (Run again).  
**Extends.** rival-word (kind).  
**Merges with.** A30 (Stay on your message); B09 (The machine against you).

**Real lives.**

- George W. Bush: Running for an open West Texas House seat in 1978, he was painted by Democrat Kent Hance as out of touch with rural Texans. He lost, the only race he ever lost. (https://en.wikipedia.org/wiki/Kent_Hance, https://en.wikipedia.org/wiki/George_W._Bush)
- John McCain: A newcomer to Arizona accused of carpetbagging in 1982, he answered at a candidates' forum that the longest he had lived anywhere was Hanoi, as a prisoner of war. He won. (https://en.wikipedia.org/wiki/House_and_Senate_career_of_John_McCain_until_2000)

### B13. Wear the insult

Bank 2 · attacks

**Moment.** {boss} calls you a name meant to stick, and {staffer} hands you a way to wear it.

**Roles.** `{boss}`: a powerful figure backing {rival}. `{staffer}`: whoever runs your message.

**Setting.** Where you would answer it in public: a rally, a broadcast.

**Choices.** Wear it; ignore it; demand an apology; answer with a line that turns it around.

**If no.** Ignoring it writes no answer, and the name belongs to {rival}'s side.

**Gates (yes or no).** Candidate. A name or insult from {rival}'s side on record.

**Weights (amounts only).** Humor traits. How well known {boss} is.

**Branches.**

- _By record, when the symbol sticks:_ It is yours for every race after, and the press asks about it.
- _By record, when it backfires:_ People think you are mocking them.

**Unlocks.** rally-word (kind); interview-invite (kind).  
**Extends.** rival-word (kind).  
**Merges with.** B23 (The line on every sign).

**Real lives.**

- Estes Kefauver: In his 1948 Tennessee Senate race, Memphis boss E. H. Crump's side likened him to a raccoon. Kefauver answered in a coonskin cap, saying he might be a pet coon but not Crump's, won, and kept the cap as his trademark. (https://en.wikipedia.org/wiki/Estes_Kefauver)

### B14. Your past comes out

Bank 2 · attacks

**Moment.** {rival} tells the press about {the old act}.

**Roles.** `{the old act}`: a membership or act from years back on your record.

**Setting.** Where the press would find you that day.

**Choices.** Own it and say why you left; play it down (a lie if the record says more); go on the air about it; say nothing.

**If no.** Saying nothing writes that you did not answer, and the story runs its course.

**Gates (yes or no).** Candidate. {the old act} is on your record and a rival can find it.

**Weights (amounts only).** How bad the act was. How long ago it was. How public your profile is.

**Branches.**

- _By record, when a second document surfaces:_ A letter in your own hand shows more than you said. A denial now is a caught lie.
- _By record, when you call it the worst mistake of your life:_ The line goes on your record and follows you.

**Unlocks.** press-interview (kind); scandal (kind); debate-sitting (kind).  
**Extends.** scandal (kind).  
**Merges with.** B15 (Your own words, cut up); A30 (Stay on your message).

**Real lives.**

- Robert Byrd: In his first House race in West Virginia in 1952, a primary opponent revealed his past Ku Klux Klan membership. Byrd said he had joined in the early 1940s and left; his Republican opponent later found a 1946 letter from Byrd to the Klan's leader. He won, and years later called joining the worst mistake of his life. (https://talkingpointsmemo.com/edblog/was-byrd-compromised-by-the-klan, https://en.wikipedia.org/wiki/Robert_Byrd, https://time.com/archive/6853304/national-affairs-byrd-of-west-virginia-fiddler-in-the-senate)

### B15. Your own words, cut up

Bank 2 · attacks

**Moment.** {rival}'s side runs lines from {your writing}, cut from their context, every day.

**Roles.** `{your writing}`: books, columns, posts or old speeches on your record.

**Setting.** Wherever the campaign works from.

**Choices.** Defend the work whole; say the words were a character's, not yours; publish the full text; ignore it.

**If no.** Ignoring it writes no answer, and the quotes become what people think you said.

**Gates (yes or no).** Candidate. A body of writing or speeches on your record.

**Weights (amounts only).** How much you have written. How hostile the outlets are.

**Branches.**

- _By record, when employers lean on their workers:_ A big employer docks pay or presses staff to give to {rival}, and a worker tells you.
- _By record, when staged interviews:_ Filmed voter interviews against you turn out to use actors, and exposing it is a press story.

**Unlocks.** press-interview (kind); debate-sitting (kind).  
**Extends.** rival-word (kind).  
**Merges with.** B05 (Every paper against you); B14 (Your past comes out).

**Opened by.** B05 (Every paper against you).

**Real lives.**

- Upton Sinclair: Running for California governor in 1934, he was hit with out-of-context quotes from his own novels run daily in the papers, and with newsreels of staged voter interviews; studio heads pressured employees to give to his opponent. He lost. (https://www.americanheritage.com/how-media-politics-was-born, https://en.wikipedia.org/wiki/1934_California_gubernatorial_election)

### B16. The attack on your partner

Bank 2 · attacks

**Moment.** {outlet} has attacked {household member} in print, days before the vote.

**Roles.** `{outlet}`: a paper or station on record. `{household member}`: your partner.

**Setting.** Where you would answer: the outlet's door, a statement, your own front steps.

**Choices.** Answer it in public, at the outlet's door; answer in a statement; let {household member} answer; say nothing.

**If no.** Saying nothing writes that you let it stand.

**Gates (yes or no).** Candidate. An attack on {household member} on the press record.

**Weights (amounts only).** How close the vote is. Temper traits. How {outlet} stands with voters.

**Branches.**

- _By trait, when your voice breaks:_ The press says you cried, or that it was melting snow, and the story becomes your composure.
- _By record, when the letter behind it was forged:_ Later it comes out that a rival campaign planted it. The lie is theirs on the record.
- _By record, when you win by less than expected:_ The margin reads as a loss.

**Unlocks.** press-interview (kind); interview-invite (kind).  
**Extends.** press-interview (kind).  
**Merges with.** B05 (Every paper against you); B17 (The letter in the last week); B28 (Follow me around).

**Real lives.**

- Ed Muskie: Two weeks before the 1972 New Hampshire primary, the Manchester Union Leader ran a letter accusing him of laughing at a slur and an editorial attacking his wife. He answered outside the paper's offices in the snow, and reporters wrote that he cried, which he denied. The letter was later tied to the Nixon campaign's dirty tricks. (https://en.wikipedia.org/wiki/Canuck_letter)

### B17. The letter in the last week

Bank 2 · attacks

**Moment.** In the final week, a letter or flyer goes around about {the target}.

**Roles.** `{the target}`: your faith, your marriage, or a false charge against you.

**Setting.** Wherever it reaches you.

**Choices.** Fire back; ask {rival} to disown it; ignore it; find out who sent it.

**If no.** Ignoring it writes no answer.

**Gates (yes or no).** Candidate, in the final week. A letter or flyer on record.

**Weights (amounts only).** How false it is. How close the race is.

**Branches.**

- _By record, when it came from {rival}'s supporters:_ {rival} disowns it or does not, and both are records.
- _By record, when it is false and vile:_ Answering gives it air; not answering lets it spread.

**Unlocks.** press-interview (kind); rival-word (kind).  
**Extends.** rival-word (kind).  
**Merges with.** B16 (The attack on your partner); A30 (Stay on your message).

**Real lives.**

- Paul Wellstone: Late in his 1990 race, a letter from his opponent's supporters attacked him for marrying a non-Jew, and Wellstone fired back. (https://en.wikipedia.org/wiki/Paul_Wellstone)
- Harold Washington: In the 1983 Chicago race a flier made a false criminal accusation against him. (https://en.wikipedia.org/wiki/1983_Chicago_mayoral_election)

### B18. Your name is the only reason

Bank 2 · debates

**Moment.** On the debate stage, {rival} says that without your family's name your run would be a joke.

**Roles.** `{your relative}`: a well-known officeholder in your family.

**Setting (fixed).** the debate stage, because the line is said in front of everyone.

**Choices.** Answer with what you have done yourself; let it pass and give your closing; hit back at {rival}'s own family ties; lose your temper (only with the traits for it).

**If no.** Letting it pass writes that you took it. How it reads depends on who watched and who listened.

**Gates (yes or no).** Candidate in a debate. {your relative} is on your record.

**Weights (amounts only).** {rival}'s aggressive traits. Your temper traits. How famous {your relative} is.

**Branches.**

- _By trait, when you want to hit him:_ Your aide steers you out of the hall before you do anything.
- _By record, when watchers and listeners split:_ People who listened think {rival} won; people who watched think you did.
- _By record, when the line makes you the underdog:_ A supporter says {rival} made a rich candidate the underdog.

**Unlocks.** press-interview (kind); race-won (kind); race-lost (kind).  
**Extends.** debate-sitting (kind).  
**Merges with.** B20 (The comparison).

**Real lives.**

- Ted Kennedy: In a South Boston debate for the 1962 Massachusetts Senate primary, Edward McCormack said Kennedy's candidacy would be a joke if his name were Edward Moore. Kennedy's voice reportedly shook in his closing, an aide steered him out afterward, and he won the primary by more than two to one. (https://en.wikipedia.org/wiki/1962_United_States_Senate_special_election_in_Massachusetts, https://whenandwhereinboston.org/entry/edward-kennedy-and-edward-mccormack-jr-debate-in-south-boston, https://bostonirish.com/publishers-notes/2017/how-we-told-listeners-%E2%80%98eddie%E2%80%99-beat-%E2%80%98teddy%E2%80%99)

### B19. Who gets on the stage

Bank 2 · debates

**Moment.** You paid for the debate and brought the other candidates, and {moderator} orders your microphone cut.

**Roles.** `{moderator}`: the moderator, said with the outlet that set up the debate.

**Setting (fixed).** the debate hall, because the stage is what is being fought over.

**Choices.** Insist you are paying for it; go along with the two-person format; walk off with the candidates who were left out.

**If no.** Going along writes that you took the sponsor's format, and the left-out candidates remember.

**Gates (yes or no).** Candidate. A debate on the calendar that your campaign paid for.

**Weights (amounts only).** How far ahead or behind you are. Poise or temper traits.

**Branches.**

- _By record, when you are the one left out:_ You stand at the edge of the stage, and leaving quietly or speaking up is the scene.
- _By record, when {rival} refuses to go on with the others:_ {rival} looks small or principled, by the room.

**Unlocks.** debate-sitting (kind); press-interview (kind).  
**Extends.** debate-invite (kind).  
**Merges with.** B18 (Your name is the only reason); B21 (Under the lights).

**Real lives.**

- Ronald Reagan: Before the 1980 New Hampshire primary he paid for a debate a Nashua paper set up with George H. W. Bush and invited the other candidates. Bush refused to debate with them, the moderator ordered Reagan's microphone cut, and Reagan said he was paying for it. He won the primary easily. (https://en.wikipedia.org/wiki/1980_Republican_Party_presidential_primaries)

### B20. The comparison

Bank 2 · debates

**Moment.** You might compare yourself on stage to {the figure}, and {rival} knew them.

**Roles.** `{the figure}`: a revered officeholder from the world's own history. `{rival}`: an opponent on record with a tie to {the figure}.

**Setting (fixed).** the debate stage.

**Choices.** Make the comparison; leave it out; prepare an answer in case it comes up.

**If no.** Leaving it out writes nothing.

**Gates (yes or no).** Candidate in a debate. {the figure} is in the world's history, and {rival}'s tie to them is on record.

**Weights (amounts only).** How revered {the figure} is. How close {rival} was to them.

**Branches.**

- _By record, when your advisers warned you:_ The warning is on record, and making it anyway is your choice.
- _By record, when you are the one who knew them:_ Deliver the rebuke, or let it go.
- _By record, when you lose the exchange and win the race:_ The line follows you anyway.

**Unlocks.** press-interview (kind); debate-sitting (kind).  
**Extends.** debate-sitting (kind).  
**Merges with.** B18 (Your name is the only reason).

**Real lives.**

- Dan Quayle and Lloyd Bentsen: Pressed on experience in the 1988 vice-presidential debate, Quayle compared his time in Congress to John F. Kennedy's. Bentsen, who had known Kennedy, told him he was no Jack Kennedy. Quayle's advisers had warned him, and the ticket won anyway. (https://en.wikipedia.org/wiki/Dan_Quayle)

### B21. Under the lights

Bank 2 · debates

**Moment.** The first televised debate is tonight, and {staffer} asks how you want to look.

**Roles.** `{staffer}`: whoever handles the broadcast.

**Setting.** Where you get ready before the broadcast.

**Choices.** Take the makeup; rest instead of cramming; cram the briefing book; change your clothes for the set.

**If no.** Going on as you are writes nothing. The camera decides.

**Gates (yes or no).** Candidate. A televised debate on the calendar.

**Weights (amounts only).** Prep traits. How tired you are on the record.

**Branches.**

- _By record, when you were just ill:_ You look pale under the lights, and people talk about how you looked more than what you said.
- _By record, when {rival} rested and practiced:_ They look fresh, and the comparison is made for you.
- _By record, when who won is argued:_ The papers argue for weeks about whether it mattered.

**Unlocks.** debate-sitting (kind); press-interview (kind).  
**Extends.** debate-invite (kind).  
**Merges with.** B19 (Who gets on the stage).

**Real lives.**

- John F. Kennedy and Richard Nixon: Before the first televised debate in 1960, Nixon had been ill and hurt his knee and looked pale in a gray suit that blended into the set; accounts differ on his makeup. Kennedy had practiced and rested. The claim that radio listeners judged it differently rests on thin polling. (https://en.wikipedia.org/wiki/Kennedy%E2%80%93Nixon_debates, https://www.historynewsnetwork.org/article/161042)

### B22. The first spots

Bank 2 · ads

**Moment.** {ad maker} wants you to read short answers to ordinary voters' questions, filmed apart from them, to run between popular shows.

**Roles.** `{ad maker}`: an advertising man or consultant.

**Setting.** Where the spots are filmed: a studio, an office made up for it.

**Choices.** Do the spots; insist on long speeches instead; do them only with real voters in the room; refuse to do ads.

**If no.** Refusing writes that you would not be sold like soap, and {rival}'s spots run.

**Gates (yes or no).** Candidate. An ad budget on the reports.

**Weights (amounts only).** Money. How well known you are. Traits that dislike staging.

**Branches.**

- _By record, when the voters are recruited off the street:_ They are filmed apart from you, looking up as if at you, and a reporter can find out.
- _By record, when {rival} refuses:_ Their reach falls behind yours.

**Unlocks.** interview-invite (kind).  
**Extends.** campaign-answer (kind).  
**Merges with.** B03 (Outspent); A44 (The apology ad).

**Opened by.** B03 (Outspent); B07 (The visit that goes wrong).

**Real lives.**

- Dwight Eisenhower: In 1952 adman Rosser Reeves persuaded him that short spots placed near shows like I Love Lucy would reach more people than long speeches. Eisenhower read answers from cue cards to questions from tourists filmed separately. Adlai Stevenson refused to appear in his own TV ads. (https://www.livingroomcandidate.org/commercials/1952/never-had-it-so-good)

### B23. The line on every sign

Bank 2 · ads

**Moment.** {staffer} wants one line for every sign and ad, and the pick is yours.

**Roles.** `{staffer}`: whoever runs your message.

**Setting.** Wherever the campaign works from.

**Choices.** A line built from your own record and who you are (four drawn from it); a line about {rival}; no slogan, just your name.

**If no.** Just your name writes a plain campaign. Doors and ads carry no message.

**Gates (yes or no).** Candidate.

**Weights (amounts only).** Humor traits. How well the line fits your record.

**Branches.**

- _By record, when the line plays on who you are:_ It works where people already see you that way and costs you where they do not.
- _By record, when a symbol goes with it:_ A hat, a color or a cap becomes yours.
- _By record, when {rival} mocks it:_ The line becomes a target.

**Unlocks.** rally-word (kind); door-ask (kind).  
**Extends.** campaign-answer (kind).  
**Merges with.** B13 (Wear the insult).

**Real lives.**

- Bella Abzug: Running against a 14-year incumbent in a 1970 Manhattan Democratic primary, she used the slogan that a woman's place is in the House, the House of Representatives, was known for her hats, and won. (https://en.wikipedia.org/wiki/Bella_Abzug, https://www.pbs.org/wnet/americanmasters/five-ways-bella-abzug-opened-up-politics-to-women-and-fought-for-social-change/37863)

### B25. Register them first

Bank 2 · door knocking

**Moment.** {organizer} says the people who would vote for you are not registered, and asks for months before you run.

**Roles.** `{organizer}`: someone who runs house meetings and registration drives.

**Setting.** Where {organizer} would find you: after a meeting they ran, at your door.

**Choices.** Spend months registering voters before you run; run now with who is registered; join with labor and other groups to share the work.

**If no.** Running now writes that you ran on the rolls as they were.

**Gates (yes or no).** Adults who are not registered live in a part of your district that would back you, by the voter roll.

**Weights (amounts only).** How many are unregistered. Your ties there.

**Branches.**

- _By record, when you lost last time:_ The drive is your answer to the loss.
- _By record, when the coalition:_ The groups that join expect their share after the win.

**Unlocks.** door-ask (kind); filing (kind); B39 (Everyone wants the credit).  
**Extends.** door-ask (kind); C1 (catalog: Your papers have a problem).  
**Merges with.** A35 (The loss that makes friends); B26 (Go where people already are).

**Real lives.**

- Edward Roybal: After he lost a Los Angeles council race in 1947, the Community Service Organization he helped found, with organizer Fred Ross holding house meetings, registered about 15,000 new voters in Boyle Heights. With labor and Jewish voters behind him, he won in 1949. (https://scalar.usc.edu/hc/jewish-histories-boyle-heights/the-community-service-organization-cso, https://capitalandmain.com/fred-ross-cesar-chavez-and-lessons-for-ferguson)

### B26. Go where people already are

Bank 2 · door knocking

**Moment.** Your district is wide and thinly settled, and {staffer} asks where next week's stops go.

**Roles.** `{staffer}`: whoever runs your schedule.

**Setting.** Wherever the campaign plans its week.

**Choices.** Where crowds already gather: the station, a supper, a school event; where {rival} never goes; where your network from an earlier cause lives.

**If no.** Staying in the towns writes that the far places never saw you.

**Gates (yes or no).** Candidate. The district's places are on record.

**Weights (amounts only).** How spread out the district is. Ties from a cause you worked for.

**Branches.**

- _By record, when your old cause's network:_ People you worked with before turn out and host you.
- _By household, when a sibling runs the schedule:_ The family's ties set the stops.

**Unlocks.** door-ask (kind); speech-afterward (kind).  
**Extends.** speech-afterward (kind).  
**Merges with.** B25 (Register them first); A28 (Called in to drop out).

**Real lives.**

- Jeannette Rankin: Running statewide in Montana in 1916, she spoke at train stations, street corners, potlucks and one-room schools, drawing on the network from her suffrage campaigns, and became the first woman elected to Congress. (https://en.wikipedia.org/wiki/Jeannette_Rankin)

### B27. The volunteer who wants a real job

Bank 2 · volunteers

**Moment.** {volunteer}, who has knocked doors for weeks, asks for a staff job over a hired professional.

**Roles.** `{volunteer}`: a volunteer on record with weeks of work.

**Setting.** Wherever the campaign works from.

**Choices.** Promote them; keep roles as they are; set up child care at the office so parents can volunteer; ask what job they want.

**If no.** Keeping roles writes that you kept them a volunteer, and they may drift away.

**Gates (yes or no).** Candidate. {volunteer}'s work is on record.

**Weights (amounts only).** How much they have done. Your money.

**Branches.**

- _By record, when many of your volunteers are parents:_ Child care at the office changes who can come.
- _By record, when years later they run themselves:_ They come back to ask for your endorsement.

**Unlocks.** K1 (catalog: A staffer asks for your endorsement); volunteer-offer (kind).  
**Extends.** volunteer-offer (kind).  
**Merges with.** B01 (The local who knows every door).

**Real lives.**

- Bella Abzug: Her 1970 campaign office offered free drop-in child care, and she pushed to promote women from canvassers into staff jobs. (https://www.pbs.org/wnet/americanmasters/five-ways-bella-abzug-opened-up-politics-to-women-and-fought-for-social-change/37863)

### B28. Follow me around

Bank 2 · press

**Moment.** {reporter} asks about {the private fact} after a tip, and says they watched your home.

**Roles.** `{reporter}`: a reporter, said with the outlet. `{the private fact}`: something in your household record a reporter could learn.

**Setting.** Where {reporter} would confront you: outside your home, by your car.

**Choices.** Answer the question; refuse it; withdraw from the race; let {household member} answer.

**If no.** Refusing writes that you would not answer, and the story runs without you.

**Gates (yes or no).** Candidate. {the private fact} is on your record and a reporter could learn it.

**Weights (amounts only).** How public your profile is. Whether you dared reporters to follow you.

**Branches.**

- _By record, when you told reporters to follow you:_ They did, and the remark is quoted back.
- _By record, when you withdraw and come back:_ Months later you return, and the first question is the old one.

**Unlocks.** scandal (kind); press-interview (kind).  
**Extends.** interview-sitting (kind).  
**Merges with.** B16 (The attack on your partner).

**Real lives.**

- Gary Hart: In 1987 he told a reporter that anyone who wanted could follow him around. The Miami Herald acted on a tip, watched his townhouse and confronted him, and he suspended his campaign within days. (https://en.wikipedia.org/wiki/Gary_Hart_presidential_campaign,_1988)

### B29. A line of your own

Bank 2 · opponent

**Moment.** Neither big party will nominate you, and {organizer} asks how you get on the ballot.

**Roles.** `{organizer}`: whoever runs your effort.

**Setting.** Wherever the effort meets.

**Choices.** Run as an independent; run on a small party's line, suing if it is kept off; run on a fusion line with reformers of both parties; run as a write-in.

**If no.** Staying out writes that you did not run. Your backers find someone else.

**Gates (yes or no).** Candidate not nominated by a major party.

**Weights (amounts only).** How unpopular the major parties are on record. How many candidates split the vote.

**Branches.**

- _By record, when the state will not list your party:_ You sue to get it listed.
- _By record, when a three-way race:_ You win with a plurality, and the record says how few chose you.
- _By record, when reformers of both parties back a fusion ticket:_ Each expects its share after the win.

**Unlocks.** filing (kind); B33 (Write me in); B39 (Everyone wants the credit).  
**Extends.** filing (kind).  
**Merges with.** B33 (Write me in).

**Real lives.**

- Kshama Sawant: A Socialist Alternative candidate, she sued the state to list her party on the 2012 ballot, lost that race, and in 2013 beat a long-serving Seattle council member on a $15 minimum wage platform. (https://en.wikipedia.org/wiki/Kshama_Sawant)
- Fiorello La Guardia: He ran for New York mayor in 1933 on a Fusion ticket backed by reformers, Republicans and anti-Tammany Democrats, and won. (https://en.wikipedia.org/wiki/Fiorello_H._La_Guardia)
- Lowell Weicker: He left the Republicans and won the 1990 Connecticut governor's race on his own A Connecticut Party line with about 40 percent in a three-way race. (https://en.wikipedia.org/wiki/Lowell_Weicker)

## Election night (7)

The count, the call and the speech.

### B30. Ahead at eleven

Bank 2 · results

**Moment.** Early returns have you or {rival} ahead, and {campaign manager} says many ballots are still out.

**Roles.** `{campaign manager}`: your manager, with the count.

**Setting.** Where you watch the returns: headquarters, a hotel, home.

**Choices.** Declare victory; say every ballot counts and wait; go to bed; ask what is still out.

**If no.** Waiting writes no claim, so there is nothing to take back.

**Gates (yes or no).** Election night. Ballots still out on the count record: absentees, late counties.

**Weights (amounts only).** How big the lead is. How many ballots are out. Pride traits.

**Branches.**

- _By record, when you declared and you lose:_ The claim is on record, the press replays it, and conceding weeks later reads worse.
- _By record, when you are behind early:_ Concede now or wait; the late ballots may be yours.
- _By record, when the morning paper names the wrong winner:_ An early edition called it for the loser, and holding it up is the morning's picture.

**Unlocks.** B34 (The concession call); B32 (The long count); race-won (kind); race-lost (kind).  
**Extends.** election-night (kind).  
**Merges with.** A23 (The count looks wrong); B32 (The long count).

**Real lives.**

- Kamala Harris and Steve Cooley: In California's 2010 attorney general race, Republican Cooley declared victory on election night. Ballots counted afterward flipped the race, the lead swung for about three weeks, and he conceded to Harris. (https://www.kqed.org/news/4195/video-steve-cooley-prematurely-declares-victory-last-night, https://www.upi.com/Top_News/US/2010/11/24/Cooley-concedes-Calif-AG-race/93901290648184/)
- Tom Bradley: Some outlets projected him the winner of California's 1982 governor's race early in the night; once absentee ballots were counted he lost narrowly. (https://en.wikipedia.org/wiki/1982_California_gubernatorial_election)
- Thomas Dewey: In 1948 an early edition of the Chicago Daily Tribune declared him the winner, and Harry Truman held up a copy for photographers. (https://en.wikipedia.org/wiki/Dewey_Defeats_Truman)

### B31. The tie

Bank 2 · results

**Moment.** After the recount and the court, the race is tied, and the law says the winner is drawn by lot.

**Roles.** `{clerk}`: the election official who runs the drawing.

**Setting (fixed).** wherever the law holds the drawing, because the draw is the moment.

**Choices.** Accept the draw; challenge the disputed ballot in court; ask for another recount; concede before the draw.

**If no.** Conceding before the draw writes that you gave up the seat.

**Gates (yes or no).** A tie on the count record. The state's or place's tie law.

**Weights (amounts only).** What rides on the seat, such as control of the body. Fighting traits.

**Branches.**

- _By record, when a one-vote lead first:_ The recount puts you ahead by one; a court then counts a disputed ballot and it is tied.
- _By record, when control of the body rides on it:_ The leaders of both parties call you.
- _By record, when the method:_ {clerk} picks the game of chance, beads, dice or a coin, and both sides must accept it.
- _By record, when the final count changes it:_ The official canvass after a coin toss shows one side ahead, and the toss means nothing.

**Unlocks.** race-won (kind); race-lost (kind); swearing-in (kind).  
**Extends.** election-night (kind).  
**Merges with.** A40 (The empty chair); A23 (The count looks wrong).

**Opened by.** A23 (The count looks wrong); B33 (Write me in).

**Real lives.**

- Shelly Simonds and David Yancey: A 2017 recount for a Virginia House seat put Democrat Simonds ahead by one vote. A court panel then counted a disputed ballot for Republican Yancey, making a tie; his name was drawn from a bowl, keeping a Republican majority. (https://en.wikipedia.org/wiki/Virginia%27s_94th_House_of_Delegates_district)
- Everett Roy and Billy Lerma: A tied 2024 Corpus Christi council runoff was settled in 2025 by drawing numbered beads, after a roll of a die set the order. (https://www.texastribune.org/2025/01/10/corpus-christi-city-council-election-tie/)
- Maplewood, Minnesota: A tied 2018 council race was settled by a coin toss; the official canvass then showed the incumbent ahead. (https://www.cbsnews.com/minnesota/news/maplewood-city-council-race-decided-by-coin-toss-goes-to-incumbent-after-recount)

### B32. The long count

Bank 2 · results

**Moment.** The margin is a few hundred votes, the recount and the court fight will take months, and the seat sits empty.

**Roles.** `{lawyer}`: your lawyer.

**Setting.** Where you hear the count: headquarters, a call from {lawyer}.

**Choices.** Keep fighting in court; concede for the place's sake; press the official who certifies.

**If no.** Conceding writes it, and {rival} is sworn in.

**Gates (yes or no).** A margin inside the recount rule on the count record.

**Weights (amounts only).** How narrow the margin is. Money for lawyers. What rides on the seat.

**Branches.**

- _By record, when you win at the end:_ Months late, colleagues walk you in, and the oath is done twice so your family can stand with you.
- _By record, when you lose in court:_ A concession after months reads differently from one on the night.

**Unlocks.** B41 (The oath); race-won (kind); race-lost (kind).  
**Extends.** K8 (catalog: The count is close).  
**Merges with.** A23 (The count looks wrong); B30 (Ahead at eleven).

**Opened by.** B30 (Ahead at eleven); B34 (The concession call).

**Real lives.**

- Al Franken and Norm Coleman: Minnesota's 2008 Senate race went through a recount and a court contest for eight months. The state supreme court ruled for Franken by 312 votes, Coleman conceded, and Franken was sworn in that July, escorted by Amy Klobuchar and Walter Mondale. (https://www.mprnews.org/story/2009/07/07/franken_sworn_in, https://www.rollcall.com/2009/07/07/franken-takes-seat-in-the-senate/)

### B33. Write me in

Bank 2 · results

**Moment.** You lost the primary, and {staffer} asks whether you run anyway as a write-in.

**Roles.** `{staffer}`: your closest adviser.

**Setting.** Where you take the news of the primary loss.

**Choices.** Concede and endorse the winner; run as a write-in; run on another party's line; sit out.

**If no.** Conceding writes it, and the nominee expects your endorsement.

**Gates (yes or no).** You lost your party's primary. The state allows write-ins.

**Weights (amounts only).** How close the primary was. How well known your name is.

**Branches.**

- _By record, when teaching the spelling:_ The campaign's doors and ads are about how to write your name.
- _By record, when the count:_ {rival}'s observers challenge each misspelled ballot, and the election official decides which count.
- _By record, when you win:_ You are the first in years to win this way, and the party that dropped you has to deal with you.

**Unlocks.** race-won (kind); race-lost (kind); B31 (The tie).  
**Extends.** filing (kind).  
**Merges with.** A02 (The seat comes to you); A12 (The last day to file); B29 (A line of your own).

**Opened by.** B29 (A line of your own).

**Real lives.**

- Lisa Murkowski: After losing Alaska's 2010 Republican primary to Joe Miller, she ran as a write-in, taught voters to spell her name, and won. At the hand count Miller's observers challenged ballots over spelling, even a cursive letter, and the elections director made the calls. (https://en.wikipedia.org/wiki/2010_United_States_Senate_election_in_Alaska, https://rollcall.com/2010/11/11/murkowski-winning-nearly-all-write-ins/)

### B34. The concession call

Bank 2 · concession or victory

**Moment.** The count says you lost, and {campaign manager} holds the phone: call {winner} now, later, or not yet.

**Roles.** `{winner}`: the candidate who won. `{chairman}`: your campaign chair, who can speak for you.

**Setting.** Where you watch the returns, with the people who worked for you.

**Choices.** Call to concede now (the call follows its real form); wait for more returns; send {chairman} to tell the crowd to go home; speak to the crowd yourself tonight.

**If no.** Not calling writes no concession, and the press asks why.

**Gates (yes or no).** Election night. The count record shows you behind.

**Weights (amounts only).** How narrow it is. How many ballots are out. Pride traits.

**Branches.**

- _By record, when the margin collapses after you called:_ You call back and take it back, after the other side has begun to celebrate.
- _By record, when you call in private and speak in the morning:_ The crowd goes home without you, and the next day's speech is the concession on record.
- _By record, when you are the winner taking the call:_ Take the concession graciously, or snap when it is taken back.

**Unlocks.** race-lost (kind); B32 (The long count); B35 (The crowd boos the winner).  
**Extends.** race-lost (kind).  
**Merges with.** B30 (Ahead at eleven).

**Opened by.** B30 (Ahead at eleven).

**Real lives.**

- Al Gore: On election night 2000, after the networks called Florida for George W. Bush, Gore phoned Bush to concede, then, as the margin shrank, called back to take it back. His campaign chairman told the crowd the race was too close to call. (https://thecrimson.com/article/2000/11/9/gore-minutes-from-conceding-pnashville-on-the, https://www.heraldnet.com/news/at-the-bell-gore-decided-fight-wasnt-over)
- Hillary Clinton: In 2016 her campaign chairman told the crowd to go home; she called the winner that night and gave her concession speech the next morning. (https://wlos.com/news/nation-world/podesta-to-clinton-supporters-go-home, https://www.cbsnews.com/amp/news/hillary-clinton-concession-speech-2016-donald-trump)

### B35. The crowd boos the winner

Bank 2 · concession or victory

**Moment.** In your concession speech, your supporters boo when you say {winner}'s name.

**Roles.** `{winner}`: the candidate who beat you.

**Setting.** Where your supporters gathered for the night.

**Choices.** Quiet them and say the name again; let it pass and go on; praise what the win means; cut the speech short.

**If no.** Letting it pass writes the speech as heard with the boos in it, a record {winner}'s people and the press read.

**Gates (yes or no).** You conceded. A speech to your supporters that night.

**Weights (amounts only).** How bitter the race was. Gracious traits.

**Branches.**

- _By record, when the victory party was planned:_ The fireworks bought for it are never set off, and the empty lawn is the picture.
- _By record, when what you say tonight:_ It is the record {winner}'s people read when you next need them.

**Unlocks.** reconciliation (kind); race-lost (kind).  
**Extends.** race-lost (kind).  
**Merges with.** B34 (The concession call); B36 (The night you lose the first round).

**Opened by.** B34 (The concession call).

**Real lives.**

- John McCain: In his 2008 concession in Phoenix, some supporters booed when he said he had called Barack Obama, and at a mention of Joe Biden; applause rose when he praised the historic nature of Obama's win. (https://content.time.com/time/politics/article/0,8599,1856619,00.html, https://www.salon.com/2008/11/05/mccain_concession)

### B36. The night you lose the first round

Bank 2 · concession or victory

**Moment.** You finished far behind in the first contest, and the volunteers who came from everywhere wait for you to speak.

**Roles.** `{volunteers}`: the people who came to work for you.

**Setting.** Where the campaign gathered for the night.

**Choices.** Rally them on to the next contest (a speech built one part at a time); thank them quietly; say you are out.

**If no.** Thanking them quietly writes the speech as heard, and some volunteers lapse on the campaign's record.

**Gates (yes or no).** Candidate. You lost the first round of a primary or caucus on the calendar.

**Weights (amounts only).** How many volunteers came. Energetic traits.

**Branches.**

- _By record, when how it sounds on television:_ A microphone catches your voice and not the crowd's, and the yell at the end replays for days.
- _By record, when you go on:_ The next contest reads tonight.

**Unlocks.** press-interview (kind); volunteer-offer (kind).  
**Extends.** speech-afterward (kind).  
**Merges with.** B35 (The crowd boos the winner).

**Real lives.**

- Howard Dean: After finishing third in Iowa in 2004, he spoke to thousands of supporters and ended with a yell. A directional microphone cut out the crowd's noise, and the clip aired hundreds of times within days. He left the race in February. (https://en.wikipedia.org/wiki/Dean_scream)

## The morning after (6)

Between the result and the oath.

### A35. The loss that makes friends

Bank 1

**Moment.** Weeks after you lost {the wider race}, {party official} you met on the trail calls about {open seat} nearer home.

**Roles.** `{the wider race}`: a race you lost for a district- or statewide office. `{party official}`: a county chair you met campaigning, said with where you met. `{open seat}`: a nearer office that is opening.

**Setting.** Where the call finds you.

**Choices.** Say you will think about it; say yes now; say you are done with running.

**If no.** Saying you are done writes that you stepped back. {party official} calls someone else, and the people you met wait to see if you come back.

**Gates (yes or no).** You lost a race. Ties with party leaders made in that race are on record. {open seat} is opening.

**Weights (amounts only).** How many ties you made. How well you did in your home area.

**Branches.**

- _By record, when your own town voted for you:_ A neighbor says your town voted for you almost to a person, and it is the base of the next run.
- _By record, when nobody files against you:_ You file for a different office next cycle and no one runs against you.
- _By household, when {household member} says one loss was enough:_ Running again is a talk at home first.

**Unlocks.** filing (kind); family-loss (kind); A12 (The last day to file).  
**Extends.** race-lost (kind); O3 (catalog: Losing and then repairing).  
**Merges with.** B40 (Run again).

**Opened by.** A08 (Your neighbors pick a leader); A22 (You never asked); A27 (The incumbent who changed her mind); B40 (Run again).

**Real lives.**

- Pete Buttigieg: At 27 he lost the 2010 Indiana treasurer race badly after a year of county fairs and diners; party leaders he met helped when he won the South Bend mayoralty the next year. (https://rollcall.com/2019/07/10/pete-buttigieg-youngest-of-2020-hopefuls-was-unwilling-to-wait-his-turn-in-2010-too/)
- Abraham Lincoln: He lost his first race in 1832 but carried his own town almost to a man. (https://www.nps.gov/liho/learn/historyculture/newsalem.htm)
- Bill Clinton: He lost a 1974 race for Congress and was elected Arkansas attorney general, unopposed, two years later. (https://en.wikipedia.org/wiki/Bill_Clinton)

### A37. The seat and the funeral

Bank 1

**Moment.** Between your win and the oath, a death or grave injury hits your household, and {chamber leader} calls about the seat.

**Roles.** `{chamber leader}`: the leader of the body you were elected to. `{close tie}`: a sibling or parent with you.

**Setting.** Wherever your household is: a hospital waiting room, home after the funeral.

**Choices.** Tell {chamber leader} you will take the seat; say you will step down before the oath; ask for time.

**If no.** Stepping down writes that you left the seat for your family. The seat is filled another way, and people remember why.

**Gates (yes or no).** You won and have not yet been sworn in. A death or grave injury in your household since the election (never authored).

**Weights (amounts only).** How close the tie with the person lost or hurt. Children at home.

**Branches.**

- _By record, when sworn in at the bedside:_ The oath plays at the hospital, in its real form, with the clerk and your family there.
- _By household, when {close tie} steps in:_ They offer to move in and help raise the children, which changes the household.
- _By record, when you go home every night:_ Later scenes read the travel: missed votes, and a rival who counts them.

**Unlocks.** swearing-in (kind); funeral (kind); family-absence (kind); L6 (catalog: Your absences used against you).  
**Extends.** news-arrives (kind).  
**Merges with.** A31 (Taken ill before election day); B41 (The oath).

**Real lives.**

- Joe Biden: Weeks after winning a Delaware Senate seat at 29 in 1972, his wife and baby daughter were killed in a car crash and his sons were hurt. The majority leader persuaded him to stay, and he was sworn in at his sons' hospital. (https://en.wikipedia.org/wiki/Early_life_and_career_of_Joe_Biden)

### B37. Your manager's boast

Bank 2 · morning after

**Moment.** Days after you won, {campaign manager} told reporters the campaign paid people not to turn out voters for {rival}.

**Roles.** `{campaign manager}`: the manager who ran your race.

**Setting.** Where the story reaches you the next morning.

**Choices.** Disown it and let them go; say it is false and keep them; open the campaign's books; say nothing.

**If no.** Saying nothing writes that you let it stand, and the groups it insulted ask why.

**Gates (yes or no).** You won. {campaign manager}'s statement is on the press record.

**Weights (amounts only).** How damaging it is. Whether the record holds any such payment.

**Branches.**

- _By record, when it is false:_ {campaign manager} recants under oath, calling it a story told to needle the other side. The lie is on their record.
- _By record, when something was said:_ Staff told groups the campaign would be ahead if they stayed out. It is on record and can be found.
- _By record, when the insulted groups:_ Their leaders demand an apology and ask you to meet.

**Unlocks.** scandal (kind); press-interview (kind); accusation (kind).  
**Extends.** scandal (kind).  
**Merges with.** B38 (The bills after the race).

**Real lives.**

- Christine Todd Whitman and Ed Rollins: Days after she won New Jersey's governorship in 1993, her campaign manager told reporters the campaign had paid to keep Black ministers and Democratic workers from turning out voters. He soon called it an exaggeration and later told lawyers under oath it was made up; Black ministers demanded an apology. (https://www.deseret.com/1993/11/21/19077804/rollins-says-he-deeply-regrets-fallout-from-probe, https://www.thecrimson.com/article/1993/11/13/ministers-blast-nj-elections-plocal-ministers/, https://en.wikipedia.org/wiki/Ed_Rollins)

### B38. The bills after the race

Bank 2 · money

**Moment.** The race is over, the campaign owes vendors, staff and you, and {treasurer} asks who gets paid first.

**Roles.** `{treasurer}`: the campaign's treasurer.

**Setting.** Where the campaign's books are kept.

**Choices.** Write off what you lent it; keep raising money to pay the vendors; pay the top consultant last; rent the donor list to another campaign.

**If no.** Letting the debt sit writes unpaid vendors who talk, and the reports show it each quarter.

**Gates (yes or no).** The campaign ended in debt on its reports.

**Weights (amounts only).** How large the debt is. Your household's money.

**Branches.**

- _By record, when you take a post that bars you from raising money:_ A relative or ally has to raise it for you.
- _By record, when the consultant who lost:_ They wait longest for their money, and they talk.

**Unlocks.** donor-ask (kind); B40 (Run again).  
**Extends.** donor-ask (kind).  
**Merges with.** A33 (The old debt comes to the door); B37 (Your manager's boast).

**Real lives.**

- Hillary Clinton: She left the 2008 primary about $22.5 million in debt, millions of it her own loans, which she wrote off. As secretary of state she could not raise money herself, so Bill Clinton raised it; her pollster was paid last, and the debt was cleared in 2013. (https://en.wikipedia.org/wiki/Hillary_Clinton_2008_presidential_campaign)

### B39. Everyone wants the credit

Bank 2 · morning after

**Moment.** The morning after you win, each group that backed you calls to say it won the race, and what it wants.

**Roles.** `{the groups}`: the groups in your coalition on record: a union, a party faction, reformers, a neighborhood's organizers.

**Setting.** Wherever the calls reach you that morning.

**Choices.** Thank each group in turn; name one first in public; promise nothing yet; ask each what it most needs.

**If no.** Promising nothing writes no obligation. The groups wait, and the first to feel slighted says so.

**Gates (yes or no).** You won. Backing from more than one group on record.

**Weights (amounts only).** How much each group's turnout mattered in the precinct results. Its leaders' traits.

**Branches.**

- _By record, when the coalition spans parties:_ Each side expects jobs, and giving to one costs the other.
- _By record, when the voters you registered:_ Their organizers want a seat at the table.

**Unlocks.** O1 (catalog: The jobs); M4 (catalog: The favor called in); A36 (Your people or theirs).  
**Extends.** race-won (kind).  
**Merges with.** A15 (Your people's votes, for a price).

**Opened by.** A15 (Your people's votes, for a price); B25 (Register them first); B29 (A line of your own).

**Real lives.**

- Fiorello La Guardia: He won New York's mayoralty in 1933 with reform Democrats, Republicans, Socialists, and Jewish and most Italian voters, and once in office pushed Tammany appointees out. (https://en.wikipedia.org/wiki/Fiorello_H._La_Guardia)
- Edward Roybal: In 1949 a coalition of newly registered Mexican American voters, Jewish voters and labor elected him to the Los Angeles council. (https://capitalandmain.com/fred-ross-cesar-chavez-and-lessons-for-ferguson)

### B40. Run again

Bank 2 · morning after

**Moment.** You lost again, and {close tie} asks whether you will run next time.

**Roles.** `{close tie}`: your partner, a parent or your oldest friend.

**Setting.** Wherever you talk the next morning.

**Choices.** Run again for the same office; run for something smaller; say you are done; say not yet.

**If no.** Saying you are done writes it, and the people who worked for you go elsewhere.

**Gates (yes or no).** You lost a race.

**Weights (amounts only).** How many times you have lost. Your margin. Your household's money. Stubborn traits.

**Branches.**

- _By record, when you have lost several times:_ The next try comes as a special election, and the papers call you the one who never quits.
- _By record, when the incumbent who beat you retires:_ The next run is against someone else.

**Unlocks.** filing (kind); A12 (The last day to file); A35 (The loss that makes friends).  
**Extends.** family-loss (kind).  
**Merges with.** A35 (The loss that makes friends).

**Opened by.** B04 (The check you send back); B09 (The machine against you); B12 (Not one of us); B38 (The bills after the race).

**Real lives.**

- William Proxmire: He lost three Wisconsin governor's races, then won the 1957 special Senate election. (https://en.wikipedia.org/wiki/1957_United_States_Senate_special_election_in_Wisconsin)
- Cory Booker: He lost the 2002 Newark mayoral race and won in 2006, when the incumbent did not run. (https://en.wikipedia.org/wiki/Cory_Booker)
- Kshama Sawant: She lost a 2012 state house race to the speaker, then won a Seattle council seat in 2013. (https://en.wikipedia.org/wiki/Kshama_Sawant)

## The first days (16)

The oath and the first weeks: the first vote, the first deal, the first crisis, the first test.

### A36. Your people or theirs

Bank 1

**Moment.** You are the new executive, and the people who run the departments, or the body that confirms them, are not yours.

**Roles.** `{majority leader}`: the leader of the body's majority that opposed you, said with the seat. `{department head}`: a head appointed by your predecessor, said with the department and years in it. `{your aide}`: the aide whose job the body has just voted to cut.

**Setting.** Wherever the executive works, in the first weeks.

**Choices.** Keep each head, ask for a resignation letter to hold, or let them go; meet {majority leader} and trade one appointee for one of theirs; take the body to court; call your supporters to the next meeting; name the people the body wants.

**If no.** Keeping everyone, or naming the body's people, writes that you left the old team in place. If a head backed your opponent, the leaks start.

**Gates (yes or no).** You hold an executive office (mayor, county executive, governor) in your first months.

**Weights (amounts only).** How narrow your win was. How many members of the body are on the other side. How openly each head backed your opponent.

**Branches.**

- _By record, when the body rejects your picks:_ {majority leader}'s bloc votes down your appointees and cuts {your aide}'s job. {your aide} asks whether you will fight for her.
- _By record, when a fired head sues:_ The suit is a record for months, and reporters ask at every event.
- _By record, when the court rules:_ A loss is in the paper, and {majority leader} is less willing to deal.
- _By record, when a full room:_ Your supporters fill the next meeting. The majority gives a little or digs in with cameras rolling.
- _By record, when the one who recruited you calls:_ The member who brought you into politics says this is not what they backed you for.

**Unlocks.** O1 (catalog: The jobs); press-interview (kind); rally-word (kind); scandal (kind).  
**Extends.** appointment (kind); M1 (catalog: Called in: sit down).  
**Merges with.** B51 (The order on the first day); B48 (The first meeting is organized without you).

**Opened by.** A12 (The last day to file); B39 (Everyone wants the credit); B48 (The first meeting is organized without you); B51 (The order on the first day).

**Real lives.**

- Bernie Sanders: Elected Burlington, Vermont, mayor by about ten votes in 1981 as an independent, he faced a board where most members opposed him. They fired his secretary and rejected nearly all his appointees; he sued, lost, then worked out a compromise. (https://en.wikipedia.org/wiki/1981_Burlington,_Vermont_mayoral_election, https://en.wikipedia.org/wiki/Mayoralty_of_Bernie_Sanders)
- Sarah Palin: After beating the incumbent mayor of Wasilla, Alaska, in 1996, she asked the department heads for resignation letters and fired the police chief, who sued; the suit was dismissed. (https://en.wikipedia.org/wiki/Early_political_career_of_Sarah_Palin)

### B41. The oath

Bank 2 · oath

**Moment.** {official} gives you the oath in its real form, and something about you is not the usual.

**Roles.** `{official}`: the person who gives the oath, said with the post. `{the book}`: the book you swear on, or none.

**Setting (fixed).** where the oath is given, because the oath has its form.

**Choices.** Which book, or an affirmation without one; who stands with you; a second ceremonial oath for your family; how to answer a critic of your choice.

**If no.** Taking the plain form writes nothing extra, and a critic has nothing to say.

**Gates (yes or no).** You won, and the oath is on the calendar.

**Weights (amounts only).** How unusual what you bring is in that body. Critics on record.

**Branches.**

- _By record, when the hand:_ You cannot raise the hand everyone is told to raise, so you raise the other, and the room goes quiet.
- _By record, when the book:_ You ask for a book that means something to you. A member of the body tells voters he never would, and your answer is a record.
- _By record, when a senior figure jokes about you:_ Laugh, answer or let it pass. That figure later steers your committee.

**Unlocks.** B42 (Nobody walks you in); B44 (Your first vote is the big one); swearing-in (kind).  
**Extends.** swearing-in (kind).  
**Merges with.** A37 (The seat and the funeral); B32 (The long count).

**Opened by.** B32 (The long count); B42 (Nobody walks you in).

**Real lives.**

- Daniel Inouye: Sworn in as Hawaii's first representative in 1959 and asked to raise his right hand, he raised his left, having lost his right arm in the war. A colleague later said prejudice fell away in that moment. (https://history.house.gov/People/Detail/15647, https://www.staradvertiser.com/2012/12/21/hawaii-news/pivotal-moment/)
- Keith Ellison: The first Muslim in Congress took a ceremonial oath in 2007 on Thomas Jefferson's Quran, after a congressman wrote to voters criticizing the choice. (https://en.wikipedia.org/wiki/Quran_oath_controversy_of_the_110th_United_States_Congress)
- Al Franken: He was sworn in in 2009 on a Bible from the Wellstone family, and the oath was redone in the old chamber so his family could stand with him. (https://www.mprnews.org/story/2009/07/07/franken_sworn_in)

### B42. Nobody walks you in

Bank 2 · oath

**Moment.** Custom says {senior member} walks you to the oath, and he stays in his seat, reading.

**Roles.** `{senior member}`: the senior member from your state or place, with a grudge on record. `{stranger}`: a member from somewhere else.

**Setting (fixed).** the chamber floor, because the walk happens in front of everyone.

**Choices.** Walk up alone; wait; take {stranger}'s arm when he crosses the floor.

**If no.** Walking alone writes nothing owed to anyone.

**Gates (yes or no).** You are being sworn in. A custom of escort on record. A grudge between you and {senior member} on record.

**Weights (amounts only).** How bad the grudge is. How public the snub is.

**Branches.**

- _By record, when the grudge goes back to a race:_ You backed someone else against him once, and the record says why.
- _By record, when {stranger} walks with you:_ A tie, and a debt later votes read.

**Unlocks.** B41 (The oath); vote-sought (kind).  
**Extends.** swearing-in (kind).  
**Merges with.** B41 (The oath); A42 (The senior member sizes you up).

**Opened by.** B41 (The oath).

**Real lives.**

- Blanche K. Bruce: When he came to take his Senate seat in 1875, Mississippi's senior senator, James Alcorn, refused to escort him and kept reading a newspaper. Roscoe Conkling of New York crossed the chamber and walked with him. (https://www.senate.gov/artandhistory/history/minute/Alcorns_Great_Insult.htm)

### B43. They will not seat you

Bank 2 · first test

**Moment.** {the body} votes not to seat you over {the challenge}.

**Roles.** `{the challenge}`: a statement you made, a question about your citizenship or residence, or a complaint about how your election was run.

**Setting.** Where the vote happens, and where you hear it.

**Choices.** Sue; appear before the committee and explain; take the statement back; accept it.

**If no.** Accepting writes the seat vacated, and another election or an appointment fills it.

**Gates (yes or no).** You won. A challenge to your seat on record.

**Weights (amounts only).** How unpopular the statement is. How many members are against you.

**Branches.**

- _By record, when you sue:_ The highest court rules unanimously that views cannot bar you, and you take the seat late.
- _By record, when the fact is true:_ Your papers were never finished, and {the body} votes you out.
- _By record, when a whole delegation is challenged:_ You are one of several, and {the body} votes on all at once.

**Unlocks.** swearing-in (kind); press-interview (kind).  
**Extends.** swearing-in (kind).  
**Merges with.** B42 (Nobody walks you in).

**Real lives.**

- Julian Bond: In 1966 the Georgia House kept him out over his statements against the Vietnam War. The Supreme Court ruled unanimously that a legislator's views cannot disqualify him, and he was seated. (https://en.wikipedia.org/wiki/Bond_v._Floyd)
- Robert Desty: In 1880 the California Senate voted to disqualify him after it came out that he had never completed his citizenship. (https://www.onevoter.org/2020/03/14/robert-desty/)
- Mississippi, 1965: A New York congressman objected to seating Mississippi's members over the denial of Black voters' rights. The House seated them after a vote. (https://history.house.gov/HistoricalHighlight/Detail/15032403152)

### B44. Your first vote is the big one

Bank 2 · first vote

**Moment.** Days after your oath, {the body} votes on {the question}, and almost everyone is voting one way.

**Roles.** `{the question}`: the largest question on the record that week: a war, a bailout, an emergency.

**Setting (fixed).** the floor of {the body}, because the vote is cast there.

**Choices.** Vote with the majority; vote no; vote no and say why, against the rules; abstain.

**If no.** Voting with the majority writes the vote, and your cause's allies say nothing.

**Gates (yes or no).** First weeks in office. A vote on {the question} on the calendar.

**Weights (amounts only).** How lopsided the vote is. Your stance on {the question}. Your cause allies.

**Branches.**

- _By record, when your allies distance themselves:_ The group that helped elect you says you set it back.
- _By record, when a colleague defends you:_ A member from elsewhere stands up for you, a tie.
- _By record, when you are not alone:_ Dozens of others vote with you.

**Unlocks.** press-interview (kind); lobby-remembers (kind); constituent-stop (kind).  
**Extends.** floor-debate (kind).  
**Merges with.** A42 (The senior member sizes you up).

**Opened by.** B41 (The oath).

**Real lives.**

- Jeannette Rankin: Four days after being sworn in as the first woman in Congress in 1917, she voted against entering World War I, speaking briefly as she voted, against House rules. The national suffrage group distanced itself; 49 other members also voted no. (https://webharvest.gov/congress115th/20181223195351/https://history.house.gov/People/Detail/20147, https://en.wikipedia.org/wiki/Jeannette_Rankin)

### B45. The vote that will not end

Bank 2 · first vote

**Moment.** The first act of {the body} is choosing its leader, the vote fails round after round, and no one is sworn in until it ends.

**Roles.** `{leader candidate}`: the member seeking to lead the body. `{holdouts}`: a faction withholding its votes.

**Setting (fixed).** the floor of {the body}, because each round is cast there.

**Choices.** Hold out with {holdouts}; vote with {leader candidate} every round; vote present; broker a deal between them.

**If no.** Voting with the leadership writes a loyal vote, and {holdouts} win the rules without you.

**Gates (yes or no).** The first day of a new term of {the body}. The leadership vote has failed at least once.

**Weights (amounts only).** How narrow the majority is. Your ties to {holdouts}.

**Branches.**

- _By record, when the holdouts win rule changes:_ One member can now force a vote to remove the leader, and {holdouts} get seats on the rules committee.
- _By record, when voting present lowers the bar:_ Abstaining helps elect the leader without your name on it.

**Unlocks.** A46 (The vote for leader); M3 (catalog: The leader's treatment); vote-sought (kind).  
**Extends.** vote-asked (kind).  
**Merges with.** A46 (The vote for leader).

**Real lives.**

- Kevin McCarthy: It took 15 ballots over four days in January 2023 to elect him Speaker. No new member could be sworn in until it ended, and the holdouts won rule changes, including letting one member force a vote to remove the Speaker. (https://en.wikipedia.org/wiki/January_2023_Speaker_of_the_United_States_House_of_Representatives_election)

### B46. Say nothing until you have something to say

Bank 2 · first test

**Moment.** {senior member} tells you on your first day not to speak on the floor until you have something to say.

**Roles.** `{senior member}`: the leader who picked you, or the chamber's senior figure.

**Setting.** Where {senior member} would take you aside.

**Choices.** Follow it and learn the room; speak on your first bill anyway; ask whom to watch; ask what they want from you.

**If no.** Following it writes a quiet first season, and colleagues learn your name slowly.

**Gates (yes or no).** First term in a legislature.

**Weights (amounts only).** How much you owe {senior member}. Speaking traits.

**Branches.**

- _By record, when the old saying:_ A member says the way to get along is to go along, and asks whether you will.
- _By record, when a back seat:_ From high above the floor you learn who is who, a record of ties.

**Unlocks.** floor-debate (kind); bill-carry (kind); A42 (The senior member sizes you up).  
**Extends.** advice (kind).  
**Merges with.** A42 (The senior member sizes you up).

**Real lives.**

- Al Smith: Picked by Tammany leader Tom Foley for the New York Assembly, the young Smith got one piece of advice: do not speak until you have something to say. He sat as a back-bencher learning who was who. (https://thestrawfoot.com/2020/01/10/robert-caros-al-smith/, https://en.wikipedia.org/wiki/Al_Smith)
- Sam Rayburn: The advice to get along by going along is tied to him, though no record of him saying it to new members is known. (https://barrypopik.com/blog/to_get_along_go_along_sam_rayburn)

### B47. The chair who did not want you

Bank 2 · first test

**Moment.** {committee chair}, who did not want you on the committee, slights you and {other newcomer} in front of everyone at the first meeting.

**Roles.** `{committee chair}`: the chair of the committee, said with years in the gavel. `{other newcomer}`: another member the chair opposed.

**Setting (fixed).** the committee's first meeting, because the slight is made in front of the members.

**Choices.** Take it together as a silent protest; refuse it out loud; go to the chamber's leader; tell the press.

**If no.** Standing by the wall writes nothing filed, and the chair has won the morning.

**Gates (yes or no).** You were put on a committee over its chair's objection. {other newcomer} is on the same committee.

**Weights (amounts only).** How hostile the chair is. Patience traits.

**Branches.**

- _By record, when the slight is one chair for two:_ You and {other newcomer} share a single chair at the table, and the room sees it.
- _By record, when {other newcomer} got the seat only because the leader stepped in:_ You two are allies from here.
- _By record, when the chair loses power later:_ Reforms take the gavel away, and your silent protest is remembered.

**Unlocks.** serve-sought (kind); M2 (catalog: The bad committee seat); press-interview (kind).  
**Extends.** M2 (catalog: The bad committee seat).  
**Merges with.** A42 (The senior member sizes you up); A45 (A committee that does not fit your district).

**Real lives.**

- Pat Schroeder and Ron Dellums: In 1973 Armed Services chairman F. Edward Hébert set out a single chair for the two newcomers he had opposed. They shared it as a silent protest, and Hébert lost his chairmanship in 1975. (https://history.house.gov/Blog/Detail/15032398449)

### B48. The first meeting is organized without you

Bank 2 · first deal

**Moment.** At {the body}'s first meeting, {bloc leader}'s majority names the committee chairs without you.

**Roles.** `{bloc leader}`: the leader of the majority bloc against you.

**Setting (fixed).** {the body}'s first meeting, because the organizing vote is there.

**Choices.** Walk out with your allies; stay and fight each vote; deal with {bloc leader}; govern by veto and wait for the next election.

**If no.** Staying silent writes that the bloc organized {the body} unopposed.

**Gates (yes or no).** You are the new executive. A majority of {the body} opposed you.

**Weights (amounts only).** How big the bloc is. How many allies you have.

**Branches.**

- _By record, when you walk out:_ The bloc names the chairs, and years of deadlock follow.
- _By record, when a court or a special election changes the numbers:_ The deadlock breaks.

**Unlocks.** A36 (Your people or theirs); desk-visit (kind); press-interview (kind).  
**Extends.** M1 (catalog: Called in: sit down).  
**Merges with.** A36 (Your people or theirs); B51 (The order on the first day).

**Opened by.** B51 (The order on the first day).

**Real lives.**

- Harold Washington: At his first Chicago council meeting in 1983, he and 21 allied aldermen walked out; the other 29 named the committee chairs, and the bloc blocked his appointments until special elections in 1986. (https://en.wikipedia.org/wiki/Harold_Washington)

### B49. The hole in the budget

Bank 2 · first crisis

**Moment.** In your first week, {budget director} shows you the deficit you inherited.

**Roles.** `{budget director}`: the official who runs the place's budget.

**Setting.** Wherever the executive works in the first week.

**Choices.** Freeze hiring and cut every department; raise taxes; lay people off; cut your own perks and pay first.

**If no.** Putting it off writes nothing yet, and the hole grows on the record.

**Gates (yes or no).** An executive office in your first weeks. A deficit on the budget record.

**Weights (amounts only).** How large the deficit is. Your promises on taxes. The makeup of {the body}.

**Branches.**

- _By record, when the cuts are not enough:_ The tax you said you would not raise is the only way left.
- _By record, when layoffs:_ The people laid off are names in your place.
- _By record, when the old regime's people:_ You push them out of the jobs they hold.

**Unlocks.** budget-cut (kind); B50 (The promise on day one); layoff (kind).  
**Extends.** budget-cut (kind).  
**Merges with.** B50 (The promise on day one); B52 (The perks you refuse).

**Real lives.**

- Ronald Reagan: Sworn in as California governor just after midnight in 1967, he found a shortfall, froze hiring and ordered cuts, then signed what was called the largest tax increase proposed by any governor. (https://en.wikipedia.org/wiki/Governorship_of_Ronald_Reagan, https://thecrimson.com/article/1967/1/18/reagan-the-first-two-weeks-pas)
- Ella Grasso: Facing an inherited deficit in 1975, she laid off state workers and returned her own raise. (https://en.wikipedia.org/wiki/Ella_T._Grasso)
- Fiorello La Guardia: He inherited a deficit in 1934 and cut more than 1,000 positions in his first year. (https://en.wikipedia.org/wiki/Mayoralty_of_Fiorello_La_Guardia)

### B50. The promise on day one

Bank 2 · first test

**Moment.** {the promise} can be kept at once, by order, minutes after the oath, or broken when the numbers turn.

**Roles.** `{the promise}`: the main pledge of your campaign on record.

**Setting.** Where the executive signs orders, on the first day.

**Choices.** Keep it at once by order; keep it later through {the body}; break it and say why; delay.

**If no.** Delaying writes the promise as still open, and the people who voted for it count the days.

**Gates (yes or no).** You hold an executive office. {the promise} is on record.

**Weights (amounts only).** What it costs. The budget record.

**Branches.**

- _By record, when kept at once:_ You sign the order minutes after the oath. The cost lands on the budget and on the places that relied on the money.
- _By record, when the police unit you ran against:_ You disband it in your first weeks.
- _By record, when the numbers turn:_ You veto budgets until the tax you promised against passes. Tens of thousands rally against you, and you may not run again.

**Unlocks.** budget-cut (kind); rally-word (kind); constituent-stop (kind); action-confront (kind).  
**Extends.** desk-visit (kind).  
**Merges with.** B49 (The hole in the budget); A44 (The apology ad).

**Opened by.** B49 (The hole in the budget).

**Real lives.**

- Arnold Schwarzenegger: Minutes after his swearing-in as California governor in 2003, he signed an order repealing the tripled vehicle license fee, his main pledge. (https://consumerwatchdog.org/energy/governors-first-act-rescind-car-fee-hike/)
- Coleman Young: After taking office as Detroit's mayor in 1974, he disbanded the police decoy unit he had campaigned against. (https://en.wikipedia.org/wiki/Coleman_Young)
- Lowell Weicker: Elected in 1990 after saying he would not seek an income tax, he faced a large deficit, vetoed budgets without one, and signed a 6 percent income tax in 1991. Tens of thousands rallied against him, and he did not run again. (https://en.wikipedia.org/wiki/Lowell_Weicker)

### B51. The order on the first day

Bank 2 · first deal

**Moment.** You can sign an order on your first day that takes a long-held power away from the members of {the body}.

**Roles.** `{the power}`: a say members hold by custom over permits, licenses or jobs in their own districts.

**Setting.** Where the executive signs orders, on the first day.

**Choices.** Sign it on day one; negotiate with the members first; narrow it; leave it alone.

**If no.** Leaving it alone writes that the custom stands, and the reformers who backed you ask why.

**Gates (yes or no).** You hold an executive office. {the power} is on record.

**Weights (amounts only).** How many members use it. Your reform promises.

**Branches.**

- _By record, when members are surprised at its reach:_ They line up against your first bill.
- _By record, when you leave one power alone:_ Reformers say it is half done; members say you went too far.

**Unlocks.** desk-visit (kind); A36 (Your people or theirs); B48 (The first meeting is organized without you).  
**Extends.** M1 (catalog: Called in: sit down).  
**Merges with.** A36 (Your people or theirs); B48 (The first meeting is organized without you).

**Real lives.**

- Lori Lightfoot: Right after her 2019 inauguration as Chicago mayor, she signed an order curbing aldermen's long-held say over permits and licenses in their wards, leaving zoning alone. Many aldermen were surprised at its reach. (https://www.wbez.org/chicago/2019/05/20/lightfoot-inauguration, https://www.wbez.org/chicago/2019/07/01/how-far-should-mayor-lightfoot-go-to-curb-chicago-aldermen)

### B52. The perks you refuse

Bank 2 · first test

**Moment.** The residence, the car and the raise come with {the office}, and {chief of staff} asks which you will take.

**Roles.** `{the office}`: the office you now hold. `{chief of staff}`: your chief of staff.

**Setting.** Where the executive works in the first week.

**Choices.** Refuse the residence; take a plain car; give back the raise; take all of it.

**If no.** Taking it all writes nothing, and the press may count it.

**Gates (yes or no).** You hold an office with perks on record.

**Weights (amounts only).** Your household's money. How thrifty your record is. The state of the budget.

**Branches.**

- _By record, when a hole in the office rug:_ You leave it, and members who come asking for favors see it.
- _By record, when you live on part of your pay:_ You give the rest away, a public pledge on your record.

**Unlocks.** press-interview (kind); budget-cut (kind).  
**Extends.** interview-sitting (kind).  
**Merges with.** B49 (The hole in the budget).

**Real lives.**

- Jerry Brown: As California's new governor in 1975, he refused the new governor's residence, rented an apartment, and drove a Plymouth instead of riding in a limousine. (https://en.wikipedia.org/wiki/Jerry_Brown)
- Ella Grasso: She returned a $7,000 raise and sold the state's limousine and plane. (https://en.wikipedia.org/wiki/Ella_T._Grasso)
- Kshama Sawant: After winning her council seat she said she would live on about $40,000 of her salary. (https://en.wikipedia.org/wiki/Kshama_Sawant)

### B53. Who gets the work

Bank 2 · first deal

**Moment.** {the project} was contracted before you took office, and almost none of the work goes to {the left out}.

**Roles.** `{the project}`: a large public project on record. `{the left out}`: firms owned by people the old contracts shut out.

**Setting.** Wherever the executive meets the builders.

**Choices.** Stop the work until the contracts are redone; set a share for new contracts only; let it go ahead and fight later; negotiate with the business leaders.

**If no.** Letting it go ahead writes the contracts as they were, and the people who elected you count it.

**Gates (yes or no).** You hold an executive office. {the project} is on record with contracts {the left out} had no part in.

**Weights (amounts only).** How big the project is. Business leaders' ties. Your promises.

**Branches.**

- _By record, when business and state leaders push back:_ Lawsuits threaten, and the work sits idle.
- _By record, when the work resumes with a share:_ Years later, the share of work those firms did is the record.

**Unlocks.** press-interview (kind); lobby-remembers (kind); L3 (catalog: Using the money to win something else).  
**Extends.** L2 (catalog: Changing the bill for the other side).  
**Merges with.** B50 (The promise on day one).

**Real lives.**

- Maynard Jackson: In 1975 Atlanta's mayor halted work and withheld payment on the airport expansion to bring minority firms into its contracts. Despite pushback from business and state leaders, work resumed with a required minority share, and by 1980 minority firms did about a quarter of the work. (https://ajc.com/news/atlanta-black-history/how-maynard-jackson-jr-broke-the-good-old-boys-grip-on-city-funds/XGXLGKHP2VAUND7QRRBES5LKDM, https://en.wikipedia.org/wiki/Maynard_Jackson)

### B54. The strike on day one

Bank 2 · first crisis

**Moment.** The contract with {the union} runs out the day you take office, and the workers walk out.

**Roles.** `{the union}`: a public workers' union on record. `{union leader}`: its leader, said with years at its head.

**Setting.** Wherever the talks are held.

**Choices.** Meet {union leader}; lecture them in public; ask a judge to enforce the law; give them the package.

**If no.** Waiting writes nothing, and the place stops running.

**Gates (yes or no).** You take office. A public contract on record that runs out that day, or a strike on the record.

**Weights (amounts only).** How strong {the union} is. Your ties to labor. The budget record.

**Branches.**

- _By record, when the leader is jailed:_ A judge orders {the union}'s leaders arrested, and the strike hardens.
- _By record, when the deal:_ Wages rise, and the state passes a law limiting public strikes.
- _By record, when you lecture:_ The press says you talked down to them instead of bargaining.

**Unlocks.** S1 (catalog: The briefing when something goes wrong); budget-cut (kind); action-confront (kind).  
**Extends.** action-confront (kind).  
**Merges with.** B55 (The storm that decides the next race).

**Real lives.**

- John Lindsay: New York's transit workers struck on his first day as mayor in 1966. Their leader, Mike Quill, was jailed; after twelve days the union took a mediators' package, and the state later passed a law restricting public-employee strikes. (https://en.wikipedia.org/wiki/1966_New_York_City_transit_strike)

### B55. The storm that decides the next race

Bank 2 · first crisis

**Moment.** The first disaster of your term, {the disaster}, hits {the place}, the response falls behind, and {challenger} is watching.

**Roles.** `{challenger}`: whoever means to run against you. `{the disaster}`: a storm, flood, fire, heat wave or outage on the world's record.

**Setting.** Wherever the response is run from, or out with the crews.

**Choices.** Go out with the crews; say the place is handling it; fire the department head; open the books on the response.

**If no.** Saying it is handled writes your words against the record of the streets.

**Gates (yes or no).** You hold the executive office. {the disaster} is on the record in your place.

**Weights (amounts only).** How bad it is. How long it lasts. How service did by neighborhood.

**Branches.**

- _By record, when {the disaster} is snow:_ The plows fall behind, trains stop on some lines, and the snow sits for weeks.
- _By record, when you are the challenger:_ The response is your campaign.
- _By record, when service skips some neighborhoods:_ Those voters remember it at the primary.

**Unlocks.** S1 (catalog: The briefing when something goes wrong); constituent-stop (kind); home-damaged (kind).  
**Extends.** S1 (catalog: The briefing when something goes wrong).  
**Merges with.** A39 (Be there that night); B54 (The strike on day one).

**Real lives.**

- Michael Bilandic and Jane Byrne: A January 1979 blizzard paralyzed Chicago and the plows fell behind. Byrne used the anger to beat the sitting mayor, Bilandic, in the primary weeks later. (https://en.wikipedia.org/wiki/1979_Chicago_blizzard, https://en.wikipedia.org/wiki/Jane_Byrne)

## The first term (9)

The rest of the first term.

### A38. The paid post or the seat

Bank 1

**Moment.** {senior member} tells you a paid post that {the body} fills is opening, and it fits you.

**Roles.** `{senior member}`: a senior member of {the body}. `{the post}`: a paid appointed post: the town's lawyer, a clerk, a manager.

**Setting.** Where {senior member} would mention it in passing.

**Choices.** Seek the post and give up the seat; keep the seat; ask whether you can keep both, which the place's rules decide.

**If no.** Keeping the seat writes that you stayed. Someone else gets the post, and the household's money stays as it is.

**Gates (yes or no).** You hold a seat on a local body. {the post} is opening and your credentials fit it.

**Weights (amounts only).** Your household's need for income. Ambitious traits.

**Branches.**

- _By record, when the body turns over:_ Years later the other side takes the majority and gives the post to one of its own.
- _By record, when a rival wants it too:_ The vote splits, and you owe whoever breaks the tie.
- _By household, when {household member} asks:_ Whether the steady pay is worth giving up the seat you worked for.

**Unlocks.** serve-sought (kind); A40 (The empty chair); filing (kind).  
**Extends.** appointment (kind).  
**Merges with.** A02 (The seat comes to you).

**Opened by.** A02 (The seat comes to you).

**Real lives.**

- Calvin Coolidge: He won an unpaid Northampton, Massachusetts, council seat, then chose not to run again and sought the city solicitor's salaried post, which he held until a Democratic council replaced him. (https://standardebooks.org/ebooks/calvin-coolidge/the-autobiography-of-calvin-coolidge/text/chapter-3)

### A39. Be there that night

Bank 1

**Moment.** {family} in your district has just lost their home to {the disaster}.

**Roles.** `{family}`: a household in your district, said with the street and how long they have lived there. `{the disaster}`: a fire, flood or storm on the world's record.

**Setting (fixed).** in front of the damaged home that night, because being there is the act.

**Choices.** Stay and find them a place for the night; send your staff with help; call the agency the place has for it; put out a statement.

**If no.** A statement alone writes that you were not there. The family and their neighbors remember at the next election.

**Gates (yes or no).** You hold a local office for the district. {the disaster} damaged a home in your district (never authored).

**Weights (amounts only).** How many households it hit. Traits that show up in person.

**Branches.**

- _By record, when the family backed your opponent:_ Helping them anyway is noticed on the street.
- _By record, when a law provides aid:_ You can walk them through it, and its effects reach the household's own damage record.
- _By record, when a reporter is there:_ What you do is in the paper whether or not you wanted it there.

**Unlocks.** home-damaged (kind); office-hours (kind); O2 (catalog: Wakes, weddings and favors).  
**Extends.** O2 (catalog: Wakes, weddings and favors).  
**Merges with.** B55 (The storm that decides the next race).

**Real lives.**

- George Washington Plunkitt: He said he went to every fire in his district, found the burned-out families a place to stay and replaced their clothes without asking their party, and counted it as good politics. (https://www.marxists.org/reference/archive/plunkett-george/tammany-hall/)

### A40. The empty chair

Bank 1

**Moment.** {the body} must fill a vacancy, the vote is tied, and {member} backs a different applicant than you.

**Roles.** `{member}`: a fellow member of {the body}, said with the seat. `{applicants}`: the people who applied, each said with what they do.

**Setting (fixed).** {the body}'s vote on the vacancy, because the tie is in the room.

**Choices.** Hold your vote; switch to break the tie; ask for another round of questions to the applicants.

**If no.** Holding writes that you kept your vote. The tie goes on, and whoever breaks it is owed by the winner.

**Gates (yes or no).** A vacancy {the body} fills by vote. You hold a seat on {the body}, or you applied.

**Weights (amounts only).** Your ties with each applicant. What each applicant said.

**Branches.**

- _By record, when you are an applicant:_ You speak to {the body} for a few minutes, members question you, and the vote is the outcome.
- _By record, when a trade in the recess:_ {member} offers a vote on something you want if you switch, a deal on both records.
- _By record, when the seat could have been yours:_ If you turned down a seat that came to you, the one you passed over sits in the room.

**Unlocks.** swearing-in (kind); M4 (catalog: The favor called in); vote-sought (kind).  
**Extends.** appointment (kind).  
**Merges with.** B31 (The tie).

**Opened by.** A02 (The seat comes to you); A14 (The empty party seat); A38 (The paid post or the seat).

**Real lives.**

- Jennifer Munro: When a Westbrook, Maine, council seat fell vacant, four residents applied. The first vote ended in a three-way tie; one member changed his vote, and she won the revote. (https://www.pressherald.com/?p=6372281)

### A41. Your deputy files against you

Bank 1

**Moment.** {deputy} has filed for the office you were appointed to finish.

**Roles.** `{deputy}`: your top deputy, said with years in the office.

**Setting.** Where {deputy} would tell you, or where you hear it first.

**Choices.** Keep {deputy} at their desk through the race; take them off election work; ask them to withdraw.

**If no.** Asking them to withdraw writes that you tried to clear the field. Word reaches the party leaders who picked you.

**Gates (yes or no).** You hold an office by appointment to finish a term. {deputy} filed for it.

**Weights (amounts only).** {deputy}'s years in the office. Your own years there.

**Branches.**

- _By household, when a parent worked in the same office:_ The older staff take sides by family as much as by work.
- _By record, when you lose and stay:_ If the law keeps you in the post until the term ends, you serve for months beside the winner's people.
- _By record, when the party leaders:_ They stay neutral or back {deputy}, a record you read at the next filing.

**Unlocks.** race-lost (kind); filing (kind).  
**Extends.** nothing yet: a new kind.  
**Merges with.** A27 (The incumbent who changed her mind).

**Real lives.**

- Bette Conroy: After about 43 years in LaPorte County, Indiana, election work, she was picked in 2008 to finish the retiring clerk's term, then finished a distant third in the primary to her own top deputy. (https://www.wbez.org/2009/09/21/longtime-county-employee-won-then-lost-top-job)

### A42. The senior member sizes you up

Bank 1

**Moment.** {senior member} asks you to stop by in your first month and to back them on a procedural vote.

**Roles.** `{senior member}`: the chamber's most powerful senior member, said with the committee and years, from the other wing.

**Setting.** Where {senior member} would ask you to come.

**Choices.** Back them; say you will decide on the merits; ask what they can do for your district's bill.

**If no.** Deciding on the merits writes that you kept your distance. Your bills move slower, and they watch how you vote.

**Gates (yes or no).** First term in a legislature. {senior member} holds power over committees or the calendar.

**Weights (amounts only).** How far your stances are from theirs. Traits that are diligent or that charm.

**Branches.**

- _By record, when you are the first of your kind, or the youngest:_ The room expects you to keep quiet, and a first floor speech changes that.
- _By record, when the presiding officer:_ Months later you are asked to be vice-chair of the committee that draws districts.
- _By trait, when you are prepared:_ You know their bill better than they do and say so politely. They respect it or resent it, by their traits.

**Unlocks.** serve-sought (kind); bill-carry (kind); M3 (catalog: The leader's treatment); floor-debate (kind).  
**Extends.** vote-asked (kind).  
**Merges with.** B47 (The chair who did not want you); B46 (Say nothing until you have something to say).

**Opened by.** A24 (The nomination fight in the room); A32 (The lines move); B46 (Say nothing until you have something to say).

**Real lives.**

- Barbara Jordan: In 1967 the first Black woman in the Texas Senate won respect by befriending conservatives, among them the chamber's most powerful member, and was named outstanding freshman. (https://en.wikipedia.org/wiki/Barbara_Jordan)
- Theodore Roosevelt: He took his Assembly seat at 23, expected by the old members to keep quiet. (https://www.trlibrary.com/tr/new-york-politics/assembly)

### A43. Be my running mate

Bank 1

**Moment.** {mentor}, now running for governor, asks you onto the ticket.

**Roles.** `{mentor}`: someone the record ties to you as a mentor: teacher, coach, first boss.

**Setting.** Where {mentor}'s campaign works from.

**Choices.** Join the ticket; say you would rather keep your seat; ask what the job would really be.

**If no.** Saying no writes that you turned {mentor} down. They pick someone else, and the tie holds or cools by how you said it.

**Gates (yes or no).** A mentor tie with someone running for governor. You hold a seat in the legislature.

**Weights (amounts only).** How strong the tie is. How safe your own seat is.

**Branches.**

- _By record, when underdogs:_ The ticket is behind, and you work the small events the top of the ticket skips.
- _By record, when the office has little power:_ If you win, {mentor} offers you a board to chair, with its own pressures.

**Unlocks.** race-won (kind); appointment (kind); S1 (catalog: The briefing when something goes wrong).  
**Extends.** nothing yet: a new kind.  
**Merges with.** A10 (The mentor who makes a call).

**Opened by.** A10 (The mentor who makes a call).

**Real lives.**

- Harry Reid: In 1970 his former teacher and coach, Mike O'Callaghan, ran for governor of Nevada and chose Reid, then a young assemblyman, as his running mate; they won as underdogs. (https://en.wikipedia.org/wiki/Harry_Reid)

### A44. The apology ad

Bank 1

**Moment.** A year after losing reelection, {ad maker} brings a draft ad about the decision that cost you.

**Roles.** `{ad maker}`: your media adviser. `{the decision}`: an unpopular act of yours that the rival used: a fee or tax raised, a program cut.

**Setting.** Wherever the comeback campaign works from.

**Choices.** Apologize for {the decision}; defend it and say why; blame the other government whose decision landed on you (true only if the record shows it).

**If no.** Refusing to make an ad about it writes that you will not revisit it. The rival's ads still do.

**Gates (yes or no).** You lost reelection as an executive. {the decision} is on record and the rival used it. You filed or are weighing a rematch.

**Weights (amounts only).** How much {the decision} cost voters. Proud or humble traits.

**Branches.**

- _By record, when a warning shot:_ If you nearly lost your own primary, {ad maker} names it as the first sign you missed.
- _By record, when a friend's read:_ A friend says people felt you stopped listening. Agreeing changes the ad.

**Unlocks.** filing (kind); debate-sitting (kind); interview-invite (kind); S2 (catalog: The other government's decision lands on you).  
**Extends.** race-lost (kind).  
**Merges with.** B22 (The first spots); B50 (The promise on day one).

**Real lives.**

- Bill Clinton: He lost reelection as Arkansas governor in 1980 to Frank White, whose ads hit him for raising car license fees. In 1982 he ran ads apologizing and promising to listen, and won. (https://encyclopediaofarkansas.net/entries/frank-durward-white-125/, https://www.pbs.org/wgbh/pages/frontline/shows/arkansas/interviews/watkins.html)

### A45. A committee that does not fit your district

Bank 1

**Moment.** You were put on {the committee}, which has little to do with your district.

**Roles.** `{the committee}`: a committee whose subject does not match your district's industries and needs. `{community leader}`: a leader from your district with an idea that fits the committee. `{other-party member}`: a member of the other party on the committee.

**Setting.** Wherever the community leader would bring the idea to you.

**Choices.** Ask the leader to move you; make the committee serve your district; keep quiet and wait.

**If no.** Waiting writes that you accepted the seat. The term passes with little to show on that committee.

**Gates (yes or no).** First term in a legislature. {the committee}'s subject does not match your district's records.

**Weights (amounts only).** How far the committee is from your district. Ties with members of the other party.

**Branches.**

- _By record, when {other-party member} wants the same program:_ Writing the bill together goes on both records.
- _By record, when you ask to move:_ The leader says you can if you help in the next leadership vote.
- _By record, when {community leader}'s idea becomes the bill:_ Whether you credit them in public changes their tie.

**Unlocks.** bill-carry (kind); A46 (The vote for leader); M2 (catalog: The bad committee seat).  
**Extends.** M2 (catalog: The bad committee seat).  
**Merges with.** B47 (The chair who did not want you).

**Opened by.** A25 (The seat your patron leaves).

**Real lives.**

- Shirley Chisholm: In 1969 the Speaker put her on the Agriculture Committee, which made little sense for Brooklyn. Following a rabbi's idea to use surplus food for the hungry, she worked with Senator Bob Dole to expand food stamps and helped create WIC. (https://en.wikipedia.org/wiki/Shirley_Chisholm)

### A46. The vote for leader

Bank 1

**Moment.** {candidate one} and {candidate two} are running to lead your party in the body, and both want your vote.

**Roles.** `{candidate one}`: a member running for leader, said with the post they hold. `{candidate two}`: the other, said with theirs.

**Setting.** Where each would catch you: on the floor, by phone that evening.

**Choices.** Promise your vote to one; keep it to yourself; ask each what they would do for your district.

**If no.** Keeping it private writes nothing either can count on. The winner remembers you did not commit.

**Gates (yes or no).** You hold a seat in a legislature. A contest for party leader in the body.

**Weights (amounts only).** Your ties with each. What each offered.

**Branches.**

- _By record, when you back the winner:_ You get the committee you wanted, and the leader expects your vote on the first hard bill.
- _By record, when you back the loser:_ Your committee stays where it was, and the winner's people do not forget.
- _By record, when a long shot asks:_ Standing with a third candidate makes you a name in the body, for better or worse.

**Unlocks.** M3 (catalog: The leader's treatment); serve-sought (kind); vote-sought (kind).  
**Extends.** vote-asked (kind).  
**Merges with.** B45 (The vote that will not end).

**Opened by.** A45 (A committee that does not fit your district); B45 (The vote that will not end).

**Real lives.**

- Shirley Chisholm: She moved off the Agriculture Committee to Veterans' Affairs, and later Education and Labor, after voting for Hale Boggs for majority leader. (https://en.wikipedia.org/wiki/Shirley_Chisholm)

# Bank 3: after the first election

Written Nov 17, 2026. 49 patterns from 15 lives active between 1996 and 2026, none used in banks 1 or 2: five from the presidency and the national tickets, five members of Congress and five governors, across both parties and every region. Only one president who served in those years had not been used already, so the first five are that president plus four who stood on a national ticket. Every fact was read on the Wikipedia page cited and is paraphrased. The stages below are home tabs only; each pattern lists the other stages where it can also play.

**The lives.**

- Donald Trump (President and national ticket; Republican, New York and Florida): President 2017-2021 and from 2025.
- Mike Pence (President and national ticket; Republican, Indiana): Vice president 2017-2021; governor; U.S. House.
- John Kerry (President and national ticket; Democrat, Massachusetts): 2004 presidential nominee; senator; secretary of state.
- John Edwards (President and national ticket; Democrat, North Carolina): 2004 vice-presidential nominee; senator.
- Joe Lieberman (President and national ticket; Democrat, then independent, Connecticut): 2000 vice-presidential nominee; senator.
- Eric Cantor (Congress; Republican, Virginia): House majority leader.
- Arlen Specter (Congress; Republican, then Democrat, Pennsylvania): Senator 1981-2011.
- Gabby Giffords (Congress; Democrat, Arizona): U.S. House 2007-2012.
- Tom Daschle (Congress; Democrat, South Dakota): Senate Democratic leader.
- Liz Cheney (Congress; Republican, Wyoming): U.S. House 2017-2023.
- Gray Davis (Governor; Democrat, California): Governor 1999-2003, recalled.
- Kathleen Blanco (Governor; Democrat, Louisiana): Governor 2004-2008.
- Mark Sanford (Governor; Republican, South Carolina): Governor 2003-2011; U.S. House.
- Chris Christie (Governor; Republican, New Jersey): Governor 2010-2018.
- Scott Walker (Governor; Republican, Wisconsin): Governor 2011-2019.

**Mechanics bank 3 leans on.** Audit = cto-notes/story/mechanics-gap-audit.md; new = found while writing this bank.

- **A grudge from politics that votes, endorsements and the party act on** (C01, C13, C14, C15, C18, C21, C29, C30, C34, C36, C40, C47, C49). Audit gap 2: grudges form from layoffs, evictions and the press only, and only the press acts on them.
- **A favor owed outside the legislature, called in later** (C03, C04, C09, C28, C29, C36). Audit gap 3: favors exist only between members of a legislature.
- **Word spreads from the people who saw it** (C11, C16, C21, C25, C40, C46). Audit gap 4: nobody who watched you in a scene tells anyone.
- **Your past found and used against you** (C10, C11, C22, C23, C37, C44, C46). Audit gap 5: reporters dig only into interview answers and hidden bribes.
- **A public promise kept or broken by a later act** (C38). Audit: campaign promises are read by voters; other promise kinds are thin.
- **Backers who turn on you, groups that split** (C02, C03, C07, C13, C28, C47, C49). Audit: not built.
- **Approval that the economy and events move** (C17, C18, C19, C31, C41). Audit: the outcome web's links to approval and re-election are not running.
- **Impeachment, trial and removal of an officeholder** (C14, C27). New, confirmed missing: no impeachment anywhere in src on main.
- **A censure by a body or by a party** (C14, C15, C27). New, confirmed missing: no censure anywhere in src on main.
- **Members leaving to deny a quorum, and the moves around it** (C05, C07). New: quorum is read only for contingent elections (contingent-election.ts).
- **An executive choosing when a vacancy's vote is held** (C06). New: special election dates come from the law alone (specialElectionDate in elections.ts).
- **Officials who certify a result, and pressure on them to change it** (C26, C39). New: only recall petitions are certified (recalls.ts); no official certifies an election.
- **Attacks and threats aimed at officeholders and candidates** (C20, C26). New: crime.ts never names an officeholder or candidate as a target.
- **Acts in the weeks between losing and the handover** (C43). New, unchecked: not found in executive.ts or legislature.ts.
- **An executive calling the body into a special sitting** (C01). New, unchecked: not found in executive.ts or legislature.ts.
- **A sitting member changing party, with caucus, seniority and control following** (C04, C30). New, unchecked: people can leave and join parties (parties.ts); whether a seat's caucus and the body's control follow was not checked.
- **A caucus removing a member from a party post mid-term** (C15). New, unchecked: leadership.ts holds leader votes; removal was not found.
- **An executive appointing or removing the one investigating them** (C12). New, unchecked: investigations exist (justice.ts); who can remove the investigator was not checked.
- **Help from a higher government, and who commands it** (C17). New, unchecked: disasters.ts exists; requests for help and command were not found.
- **Refusing money offered by a higher government** (C08). New, unchecked: not found in the modules read.
- **Employers acting on a law: canceling, leaving, boycotting** (C02). New, unchecked; the owner asked on Nov 15 for industries to feed the story.
- **Jobs offered to people who left office: shows, firms, banks** (C45). New, unchecked: the jobs engine exists; offers to former officials were not checked.

## Governing (16)

The work of the office in any term: vetoes, deciding votes, deals, the rules, leadership posts, investigations, family and staff on the inside.

### C01. Your own party overrides you

Bank 3 · vetoes

**Also plays in.** The first days; The first term.

**Moment.** {the body}, where your own party holds the majority, overrides your veto of {the bill}, and {chamber leader} tells the press the votes were never in doubt.

**Roles.** `{the bill}`: a bill or budget line on record that you vetoed. `{chamber leader}`: the leader of the body's majority, of your own party, said with the post.

**Setting.** Wherever the news reaches you the day of the override: your office, a car between events.

**Choices.** Veto the next one too and take it to the public with a stunt; name the members who voted to override, in their own districts; meet {chamber leader} and trade: you sign one of theirs, they hold one of yours; stop vetoing and work on bills before they pass.

**If no.** Letting it go writes that your vetoes do not hold. The next budget comes with more in it, and members stop asking what you think first.

**Gates (yes or no).** You hold an executive office with a veto. You vetoed {the bill}, and {the body} voted to override it. Your party holds the majority in {the body}.

**Weights (amounts only).** How many of your vetoes the body has overridden. How far your views sit from the majority's. Traits that hate waste or dig in.

**Branches.**

- _By record, when you protest with a stunt:_ The picture runs everywhere. Voters like it, and the senior members whose projects you mocked remember it at the next vote.
- _By record, when you reject the whole budget:_ The body overrides you the next day in a special sitting, and the press calls it a failed protest.
- _By record, when it is your first year:_ The override is your first break with the majority, and members learn that your veto can be beaten.
- _By trait, when you hate waste:_ You veto lines in members' own districts, and those members stop returning your calls.

**Unlocks.** C05 (A move in the rules); C38 (The promise and the bill on your desk); floor-debate (kind); rally-word (kind).  
**Extends.** bill-held-chair (kind); K6 (catalog: The stunt that goes wrong).  
**Merges with.** B49 (The hole in the budget); B52 (The perks you refuse); C08 (Money from above, with strings).

**Opened by.** C08 (Money from above, with strings).

**Needs.** A grudge from politics that votes, endorsements and the party act on; An executive calling the body into a special sitting.

**Real lives.**

- Mark Sanford: As South Carolina governor, his own party's House overrode 105 of his 106 budget vetoes in one day in 2004. The next day he brought live pigs into the chamber to protest pork spending. In 2006 he rejected the whole budget, and the legislature overrode him the next day. (https://en.wikipedia.org/wiki/Mark_Sanford)
- Mike Pence: In 2013, his first year as Indiana governor, the Republican legislature overrode his veto of a local tax bill by wide margins in both houses. (https://en.wikipedia.org/wiki/Mike_Pence)

### C02. The law you signed, and the backlash

Bank 3 · a law and its cost

**Also plays in.** The first term.

**Moment.** Days after you sign {the law}, {employer} says it will take its jobs or its event elsewhere, and your own backers say any change is a betrayal.

**Roles.** `{the law}`: a law you signed, on record. `{employer}`: a big employer, convention or league on the place's record, said with what it does there.

**Setting.** Where the pressure finds you: a television interview, a call from {employer}, a meeting with your backers.

**Choices.** Defend it on the air; sign a fix that narrows it; ask {the body} to repeal it; say nothing and wait for it to pass.

**If no.** Saying nothing writes that you stood by it. {employer} acts on its threat, and the lost jobs go on the record with your name.

**Gates (yes or no).** You hold an executive office. You signed {the law}. An employer or group on record has said it will pull out, cancel or protest over it.

**Weights (amounts only).** How many jobs {employer} holds in the place. How close your next race is. How strongly your backers wanted the law.

**Branches.**

- _By record, when you say on the air you will not change it, then sign a fix:_ Both sides quote your first words against you.
- _By record, when {employer} cancels a planned expansion:_ The lost jobs are on the record, and the members who passed the law blame you for the fix or for the signing.
- _By trait, when you disagreed with part of it:_ You sign it anyway, saying a veto was not yours to cast, and your own side splits over it.
- _By record, when a health emergency asks you to bend your views:_ An outbreak spreads where clinics closed. Allow, for a time, the measure you opposed, or hold to your view.

**Unlocks.** C38 (The promise and the bill on your desk); C41 (Run again or step aside); press-interview (kind); layoff (kind).  
**Extends.** lobby-remembers (kind); L2 (catalog: Changing the bill for the other side).  
**Merges with.** C07 (Taking on the public workers); B50 (The promise on day one); A44 (The apology ad).

**Needs.** Employers acting on a law: canceling, leaving, boycotting; Backers who turn on you, groups that split.

**Real lives.**

- Mike Pence: In 2015 he signed an Indiana religious-objections law that businesses and conventions called anti-gay. He said on television the law would not change, then signed a revision days later; a company canceled a planned expansion, and backers of the original were angry. The same year he let counties open needle exchanges during an HIV outbreak, which he had opposed. (https://en.wikipedia.org/wiki/Religious_Freedom_Restoration_Act_(Indiana), https://en.wikipedia.org/wiki/Mike_Pence)
- Kathleen Blanco: In 2006 the Louisiana governor signed a ban on most abortions to take effect if the Supreme Court allowed it. She thought exceptions for rape and incest were reasonable but felt she should not veto it. (https://en.wikipedia.org/wiki/Kathleen_Blanco)

### C03. The deciding vote

Bank 3 · the vote

**Also plays in.** The first days; The first term.

**Moment.** {chamber leader} is one vote short on {the bill}, or the count is tied, and yours is the vote left.

**Roles.** `{the bill}`: a bill or nomination set for a vote on record. `{chamber leader}`: the leader who needs the vote, said with the post.

**Setting.** Where the leader catches you before the roll: the floor, the leader's office, a call that night.

**Choices.** Hold out for a change in the bill; trade your vote for money for your place; vote with your party; vote with the other side; stay away for the vote.

**If no.** Staying away writes an absence on the record, and the bill passes or fails without you. Both sides remember where you were.

**Gates (yes or no).** You hold a seat in {the body}, or preside over it with a vote to break ties. {the bill} is set for a vote. The count is one short or tied without you.

**Weights (amounts only).** How close the count is. What the leader can offer. How your district feels about the bill. Traits that bargain.

**Branches.**

- _By record, when you hold out for a change:_ The change goes in, a part of the bill is struck, and the bill's backers blame you for what it lost.
- _By record, when you trade for your place:_ The money for your place is in the bill, your party's base calls it a sellout, and a challenger from your own side starts to talk to donors.
- _By record, when you preside and the vote ties:_ You break the tie, the first time one was needed for that kind of vote, and both sides note it.
- _By record, when you voted no the first time and it failed:_ On the second vote you switch to yes, and the record shows both.

**Unlocks.** C28 (A challenger from your own side); C04 (One seat decides who runs the body); vote-confirmed (kind); lobby-remembers (kind).  
**Extends.** vote-asked (kind); M3 (catalog: The leader's treatment); L3 (catalog: Using the money to win something else).  
**Merges with.** B45 (The vote that will not end); A46 (The vote for leader); C04 (One seat decides who runs the body); C30 (Change your party).

**Needs.** A favor owed outside the legislature, called in later; Backers who turn on you, groups that split.

**Real lives.**

- Joe Lieberman: In 2009 he was the 60th vote needed to end debate on the health care bill, and his opposition to a government-run insurance option got it dropped from the law. (https://en.wikipedia.org/wiki/Joe_Lieberman)
- Arlen Specter: In 2009 he was one of three Republicans to vote for the stimulus, winning about $10 billion for medical research. Most Pennsylvania Republicans disapproved, and a primary challenger announced weeks later. (https://en.wikipedia.org/wiki/Arlen_Specter)
- Mike Pence: In 2017, presiding over a tied Senate, he cast the first tie-breaking vote ever needed to confirm a cabinet member. (https://en.wikipedia.org/wiki/Mike_Pence)
- Gabby Giffords: In 2008 she voted against the bank rescue the first time the House took it up, then voted yes on the second vote. (https://en.wikipedia.org/wiki/Gabby_Giffords)

### C04. One seat decides who runs the body

Bank 3 · control of the body

**Also plays in.** The first term.

**Moment.** {the body} is split down the middle, and {wavering member} is weighing a move that would hand control to the other side.

**Roles.** `{wavering member}`: a member whose party or caucus could change, said with the seat and years served. `{presiding officer}`: whoever presides over {the body} and breaks ties, said with the post.

**Setting.** Where a member would be worked in private: an office after hours, a dinner, a long phone call.

**Choices.** Offer {wavering member} a committee chair; promise help in their next race; make no offer; ask your own wavering members what they need first.

**If no.** Making no offer writes that you let it ride. If {wavering member} moves, you learn of it from the news.

**Gates (yes or no).** You hold a seat in {the body} or lead a party in it. The seats are split so that one member changes who holds the majority.

**Weights (amounts only).** How far {wavering member}'s views sit from their party's. What each side can offer. Years each member has served.

**Branches.**

- _By record, when {wavering member} moves to your side:_ Your party runs the body, and the chairs change hands in the middle of the session.
- _By record, when {presiding officer} breaks the tie:_ Control turns on who holds that post, so your side leads for days and loses it when the term changes.
- _By record, when the one who moved asks to keep their seniority:_ Your own members refuse to give up their chairs, and the newcomer starts at the bottom.
- _By record, when control flips and you gain a chair:_ You chair a committee you did not expect, and its first big bill is yours to carry.

**Unlocks.** C30 (Change your party); C15 (Your caucus votes on you); bill-carry (kind); serve-sought (kind).  
**Extends.** M1 (catalog: Called in: sit down); M3 (catalog: The leader's treatment).  
**Merges with.** C03 (The deciding vote); A46 (The vote for leader); B48 (The first meeting is organized without you); C09 (Running for a leadership post).

**Opened by.** C03 (The deciding vote); C30 (Change your party); C31 (The recall against you).

**Needs.** A sitting member changing party, with caucus, seniority and control following; A favor owed outside the legislature, called in later.

**Real lives.**

- Tom Daschle: With the Senate split 50-50 in January 2001, the outgoing vice president's tie-breaking vote made him majority leader for 17 days. In June a Vermont Republican left his caucus to become an independent, and control came back to Daschle. (https://en.wikipedia.org/wiki/Tom_Daschle)
- Joe Lieberman: When control flipped in June 2001 he became chair of the government affairs committee and pushed to fold border, emergency and coast agencies into one new department. (https://en.wikipedia.org/wiki/Joe_Lieberman)
- Arlen Specter: After he switched parties in 2009, his new colleagues refused to let him keep nearly 30 years of committee seniority. (https://en.wikipedia.org/wiki/Arlen_Specter)

### C05. A move in the rules

Bank 3 · the rules

**Also plays in.** The first term.

**Moment.** Your side can only win {the fight} by a move in the rules: {the move}.

**Roles.** `{the fight}`: a bill or deadline on record that your side cannot pass or stop the ordinary way. `{the move}`: a rule change, a split bill, a held vote or a skipped step that the body's rules allow.

**Setting.** The room where the body's rules are set: a rules committee, a joint committee, the leader's office the night before.

**Choices.** Use the move; pass the fight to the other side and let the deadline hit; split the bill and pass the part you can; drop the fight.

**If no.** Dropping it writes that your side gave way. The other side says so at every stop.

**Gates (yes or no).** You lead your party in {the body} or hold the executive office. {the fight} is on the calendar. The rules allow {the move}.

**Weights (amounts only).** How close the deadline is. What the fight costs residents each day. How the public blames each side.

**Branches.**

- _By record, when you hold the vote that would end it:_ The rules make you the only one who can bring the other side's bill up. You keep it down, the government shuts, and critics say you made it longer.
- _By record, when the other side has left to block the vote:_ You strip the spending parts so the vote no longer needs them in the room, and it passes in minutes.
- _By record, when a court says the move broke the rules:_ A judge voids the law over how it passed, and a higher court puts it back.

**Unlocks.** C07 (Taking on the public workers); C31 (The recall against you); floor-debate (kind); L5 (catalog: The court makes you act).  
**Extends.** O5 (catalog: Changing the rules of the race); bill-held-chair (kind).  
**Merges with.** C01 (Your own party overrides you); C07 (Taking on the public workers); B48 (The first meeting is organized without you).

**Opened by.** C01 (Your own party overrides you); C07 (Taking on the public workers).

**Needs.** Members leaving to deny a quorum, and the moves around it.

**Real lives.**

- Eric Cantor: The night before the 2013 shutdown, a House rules change made the majority leader the only member who could force a vote on the Senate's funding bill. He did not allow it, which critics said made the shutdown longer. (https://en.wikipedia.org/wiki/Eric_Cantor)
- Scott Walker: When Wisconsin Senate Democrats left the state in 2011 to deny a quorum, Republicans stripped the spending provisions so the bill could pass without one. A judge struck the law down over open-meetings rules, and the state supreme court reinstated it. (https://en.wikipedia.org/wiki/2011_Wisconsin_Act_10)

### C06. When the empty seat's vote is held

Bank 3 · a vacancy

**Also plays in.** The first term; Losing and leaving.

**Moment.** {the seat} is empty, or soon will be, and when its vote is held, or the day you leave, is yours to set.

**Roles.** `{the seat}`: a seat on record that is vacant or that you are leaving. `{popular rival}`: a popular figure of the other party who would be on that ballot, said with the office.

**Setting.** Wherever the law makes you decide: your office, with the clerk's calendar in front of you.

**Choices.** Hold the vote with the regular election; set a separate date; resign early so the one who follows starts sooner; appoint someone to hold the seat.

**If no.** Leaving it to the law's default writes nothing new. The seat waits, and the place goes without a voice until then.

**Gates (yes or no).** A seat is vacant or you have said you will leave one. You hold the power to set the date, to appoint, or to time your own leaving.

**Weights (amounts only).** What a separate election costs the place. How the date changes who turns out. Seniority at stake for the one who follows.

**Branches.**

- _By record, when you set a separate date:_ It costs the place millions, and the press says you did it to keep {popular rival} off the ballot on your own election day.
- _By record, when the one leaving resigns a day early:_ You, as the appointee, are sworn in a day before the new class and outrank them for years.
- _By record, when you ask for the vote on the general election day:_ The winner takes the seat at once, ahead of the rest of the new class.

**Unlocks.** C42 (Leaving before the term ends); appointment (kind); filing (kind).  
**Extends.** K7 (catalog: A death opens a seat); O5 (catalog: Changing the rules of the race).  
**Merges with.** C42 (Leaving before the term ends); A40 (The empty chair); C31 (The recall against you).

**Opened by.** C42 (Leaving before the term ends).

**Needs.** An executive choosing when a vacancy's vote is held.

**Real lives.**

- Chris Christie: In 2013 the New Jersey governor ordered a $25 million special election for a vacant U.S. Senate seat, 20 days before his own race, a move widely seen as keeping a popular Democrat off his ballot day. (https://en.wikipedia.org/wiki/Chris_Christie)
- John Kerry: In 1985 the outgoing senator resigned a day early, and Governor Dukakis appointed Kerry to the seat, giving him seniority over the other new senators. (https://en.wikipedia.org/wiki/John_Kerry)
- Eric Cantor: After losing his 2014 primary he resigned early and asked the governor to hold the special election on the general election day. (https://en.wikipedia.org/wiki/Eric_Cantor)

### C07. Taking on the public workers

Bank 3 · the budget

**Also plays in.** The first days; The first term.

**Moment.** You send {the body} a bill that cuts what public workers can bargain for, and {union} fills the building.

**Roles.** `{union}`: the unions of the place's public workers, said with who they represent. `{holdout}`: a member of your own party who will not vote for it, said with the seat.

**Setting.** The building where the body meets, full of people, or your office with the noise outside.

**Choices.** Push it as written; leave out police and firefighters; take the unions' money offer and drop the bargaining limits; make a deal with the other party's leaders.

**If no.** Dropping it writes that you backed down. The gap is still in the next budget.

**Gates (yes or no).** You hold an executive office. A budget gap is on record. The place's public workers bargain through unions.

**Weights (amounts only).** How large the gap is. How many public workers the place has. Your party's share of the body. Traits that dig in.

**Branches.**

- _By record, when the other party's members leave the place to block the vote:_ Without them the body cannot take up spending, and the standoff runs for weeks (C05).
- _By record, when {holdout} votes no:_ Your first defection. The bill passes anyway, or fails by one.
- _By record, when you once promised these workers no change:_ Their union sues and quotes your promise (C38).
- _By record, when it passes:_ A recall drive starts against you and the members who voted for it (C31).
- _By record, when you make a deal with the other party's leaders:_ They raise what workers pay and end bargaining over health plans, and their own base turns on them.

**Unlocks.** C31 (The recall against you); C05 (A move in the rules); rally-opponent (kind); budget-cut (kind).  
**Extends.** L2 (catalog: Changing the bill for the other side); budget-cut (kind).  
**Merges with.** B54 (The strike on day one); B49 (The hole in the budget); C02 (The law you signed, and the backlash); C38 (The promise and the bill on your desk).

**Opened by.** C05 (A move in the rules).

**Needs.** Members leaving to deny a quorum, and the moves around it; Backers who turn on you, groups that split.

**Real lives.**

- Scott Walker: In 2011 the Wisconsin governor proposed sharp limits on public unions' bargaining, leaving out police and firefighters. Protesters filled the Capitol, all 14 Democratic senators went to Illinois to deny a quorum, and one Republican voted no. A recall followed. (https://en.wikipedia.org/wiki/Scott_Walker_(politician), https://en.wikipedia.org/wiki/2011_Wisconsin_protests)
- Chris Christie: In 2010 the New Jersey governor signed pension changes after promising police and firefighters none, and their unions sued. In 2011 he made a deal with Democratic leaders raising what workers paid and ending bargaining over health benefits. (https://en.wikipedia.org/wiki/Chris_Christie)

### C08. Money from above, with strings

Bank 3 · money from above

**Also plays in.** The first days; The first term.

**Moment.** {higher government} offers {the place} money for {the program}, and taking it means rules and costs you campaigned against.

**Roles.** `{higher government}`: the government above yours, said by its leader's post. `{the program}`: a rail line, a relief program or a health program on the offer's record.

**Setting.** Wherever you announce it: a press conference, a letter to {higher government}.

**Choices.** Refuse it; take it with conditions; take part and refuse part; let {the body} decide.

**If no.** Not deciding writes that you took it by default, and your backers say so.

**Gates (yes or no).** You hold an executive office. {higher government} has offered the money on record.

**Weights (amounts only).** How much it is. How many jobs it would pay for. How strongly your backers oppose it. Unemployment in the place.

**Branches.**

- _By record, when you refuse it:_ The money goes to other places, and repairs it would have covered come out of your own budget.
- _By record, when the body sues to take it:_ The highest court in the place rules that only the body can turn the money down.
- _By record, when you take it on your own terms:_ You strike a version with {higher government}, and both sides call it a win.

**Unlocks.** C01 (Your own party overrides you); budget-cut (kind); press-interview (kind).  
**Extends.** S2 (catalog: The other government's decision lands on you).  
**Merges with.** B49 (The hole in the budget); C17 (The disaster bigger than your government); C01 (Your own party overrides you).

**Needs.** Refusing money offered by a higher government.

**Real lives.**

- Scott Walker: Elected Wisconsin governor in 2010, he said he would refuse an $810 million federal rail grant. The money went to other states, and the state paid at least $60 million for rail repairs. (https://en.wikipedia.org/wiki/Scott_Walker_(politician))
- Mark Sanford: In 2009 he became the first governor to formally reject part of his state's federal stimulus money. South Carolina's supreme court ruled that only the legislature could decline it. (https://en.wikipedia.org/wiki/Mark_Sanford)

### C09. Running for a leadership post

Bank 3 · leadership

**Also plays in.** The first term.

**Moment.** {the post} is open, and {favorite} has most of the votes counted already.

**Roles.** `{the post}`: a party post in {the body}: leader, whip, caucus chair. `{favorite}`: the member expected to win, said with the post they hold now.

**Setting.** Where members are counted: the members' dining room, the cloakroom, calls through the night.

**Choices.** Run against the favorite on a cause; back the favorite and ask for a lower post; wait for an appointed post; help other members win their races first.

**If no.** Not running writes nothing against you. The winner remembers who stood where.

**Gates (yes or no).** You hold a seat in {the body}. {the post} is open or contested.

**Weights (amounts only).** Your years in the body. Your ties with members. Money you raised for members' races.

**Branches.**

- _By record, when you lose badly:_ You lose by a wide margin. The next time a lower post opens, you take it without a fight.
- _By record, when the leader appoints you as a deputy:_ You count votes for years and learn who owes whom.
- _By record, when you raised money for members' races:_ The members you helped back you for the next post up.
- _By record, when you win the post:_ You are third in line in the party's leadership, and every break you make with {party leader} is now news (C15).

**Unlocks.** C15 (Your caucus votes on you); C49 (Break with the one you served); serve-sought (kind).  
**Extends.** vote-sought (kind).  
**Merges with.** A46 (The vote for leader); C04 (One seat decides who runs the body); B45 (The vote that will not end).

**Needs.** A favor owed outside the legislature, called in later.

**Real lives.**

- Mike Pence: He ran for House minority leader in 2006 and lost 168 to 27. In 2009 he won the third-ranking post without opposition. (https://en.wikipedia.org/wiki/Mike_Pence)
- Eric Cantor: The whip appointed him chief deputy whip in 2002. He was elected whip in 2008 and became majority leader in 2011, after raising more than $30 million for the party's House campaigns. (https://en.wikipedia.org/wiki/Eric_Cantor)
- Liz Cheney: Two years into her first term, in 2018, House Republicans elected her conference chair, the third-ranking post. (https://en.wikipedia.org/wiki/Liz_Cheney)

### C10. Meeting the government yours shuns

Bank 3 · the other side

**Also plays in.** The first term; After office.

**Moment.** You could go and meet {adversary leader}, whom your own government shuns, to open trade or to carry a message home.

**Roles.** `{adversary leader}`: the head of a government or rival power on record in conflict with yours. `{critic}`: a member of the other party who attacks the trip, said with the seat.

**Setting (fixed).** {adversary leader}'s own capital, because going there is the act.

**Choices.** Go and meet them; send a deputy; meet only with others present; decline.

**If no.** Declining writes nothing. The opening goes to someone else.

**Gates (yes or no).** You hold an office. {adversary leader} heads a government on record in conflict with yours.

**Weights (amounts only).** What trade or relief is at stake. How hostile your party is to the other side. Traits that take risks.

**Branches.**

- _By record, when you carry an offer home:_ The executive calls it propaganda, and the vote you hoped to move goes the other way.
- _By record, when {critic} calls the trip illegal:_ They say you broke the rule against private dealings with foreign governments, and it follows you.
- _By record, when years later you go as the executive's envoy:_ It is the first such meeting in decades, and a leak about what you said starts calls for an inquiry.

**Unlocks.** press-interview (kind); scandal (kind); C48 (The cause you carry out).  
**Extends.** S2 (catalog: The other government's decision lands on you).  
**Merges with.** C13 (The inquiry you could open); C48 (The cause you carry out); B28 (Follow me around).

**Needs.** Your past found and used against you.

**Real lives.**

- Kathleen Blanco: In 2004 the Louisiana governor went to Cuba to build trade and met Fidel Castro, a controversial trip at home. (https://en.wikipedia.org/wiki/Kathleen_Blanco)
- John Kerry: As a new senator in 1985 he went to Nicaragua with Tom Harkin and met Daniel Ortega, and the trip was criticized. In 2013, as secretary of state, he met Iran's foreign minister, the first such meeting since 1979. (https://en.wikipedia.org/wiki/John_Kerry)
- Eric Cantor: In 2007 he suggested that Nancy Pelosi's meeting with Syria's president might break the law against private diplomacy. (https://en.wikipedia.org/wiki/Eric_Cantor)

### C11. Family on the inside

Bank 3 · family

**Also plays in.** The campaign; The first term.

**Moment.** {family member} works for your campaign or near your office, and {go-between} offers them something you would never take yourself.

**Roles.** `{family member}`: a child, sibling or partner who works in your campaign, your business or your government, said with the job. `{go-between}`: someone offering a meeting, a post or a favor, said with who they work for.

**Setting.** Where family business happens: the family's office, a dinner, a phone call you hear about later.

**Choices.** Let them take it; tell them no; set a rule that family stays out of the work; ask the lawyers first.

**If no.** Saying nothing writes that you let them decide. What they do goes on your record as well as theirs.

**Gates (yes or no).** You hold an office or are running. {family member} holds a role in your campaign, business or government on record.

**Weights (amounts only).** How close the tie is. How much the family business touches your office. Traits that trust family.

**Branches.**

- _By record, when the meeting promised dirt on your rival:_ Emails show what it was for, and years later a committee refers {family member} to prosecutors.
- _By record, when a post is said to be made for them:_ Critics say the job was created for them while you held office, and it follows them into their own race.
- _By record, when {family member} runs for your old seat:_ They win the seat you once held, and every vote they cast is read against yours (C47).

**Unlocks.** C12 (The one investigating you answers to you); C23 (The case against you); scandal (kind).  
**Extends.** family-filing (kind).  
**Merges with.** A16 (Someone close to you runs); B02 (The manager you love); C23 (The case against you).

**Needs.** Your past found and used against you; Word spreads from the people who saw it.

**Real lives.**

- Donald Trump: During the 2016 race his eldest son, who also ran the family company, took a meeting offered with the promise of damaging material on the rival. Emails released in 2017 showed its purpose. (https://en.wikipedia.org/wiki/Donald_Trump_Jr.)
- Liz Cheney: In 2002, while her father was vice president, she took a State Department post that critics said was created for her. In 2016 she won the Wyoming House seat he had held from 1979 to 1989. (https://en.wikipedia.org/wiki/Liz_Cheney)

### C12. The one investigating you answers to you

Bank 3 · investigators

**Also plays in.** The first term.

**Moment.** {investigator}, who answers to you, is looking into {the matter}, and it touches your campaign or your people.

**Roles.** `{investigator}`: the head of an investigating office you can appoint and remove, said with the office. `{the matter}`: an investigation on record. `{replacement}`: someone you could name in their place, said with the seat they hold.

**Setting.** Your office, with {investigator} or about them.

**Choices.** Remove {investigator}; leave them alone; hand the case to someone outside your reach; ask them in private to ease off.

**If no.** Leaving them alone writes nothing new. The investigation goes where the evidence goes.

**Gates (yes or no).** You hold an executive office that appoints {investigator}. {the matter} names your campaign, your staff or your acts.

**Weights (amounts only).** How close it gets to you. How loyal {investigator} is. Traits about authority and rules.

**Branches.**

- _By record, when you remove them:_ A second, wider investigation opens because of the firing, run by someone you cannot remove.
- _By record, when you offer the post to {replacement}:_ {replacement} is interviewed, called the top pick, and withdraws within the week.
- _By record, when you are the one offered the post:_ Taking it means leaving your seat or your firm, and the one offering is a client of your firm.

**Unlocks.** C23 (The case against you); C27 (They move to impeach you); C44 (The post that falls through); scandal (kind).  
**Extends.** appointment (kind).  
**Merges with.** C23 (The case against you); C44 (The post that falls through); A36 (Your people or theirs).

**Opened by.** C11 (Family on the inside).

**Needs.** An executive appointing or removing the one investigating them.

**Real lives.**

- Donald Trump: In May 2017 he fired FBI director James Comey and then said he was concerned about Comey's role in the Russia investigations. The firing led to a special counsel. (https://en.wikipedia.org/wiki/Donald_Trump)
- Joe Lieberman: Days after the firing, the former senator was interviewed to replace Comey and called the top pick. His law firm had Trump as a client, and he withdrew a week later. (https://en.wikipedia.org/wiki/Joe_Lieberman)

### C13. The inquiry you could open

Bank 3 · oversight

**Also plays in.** The first term; After office.

**Moment.** You can open an inquiry into what {powerful officeholder} did, and {powerful officeholder} asks you not to.

**Roles.** `{powerful officeholder}`: whoever holds the office whose conduct is in question, said with the post. `{other-party leader}`: the leader of the other party in the body, said with the post.

**Setting.** Where you would be asked: a private meeting, a call, the hallway outside a closed hearing.

**Choices.** Open a full inquiry; agree to a narrower review; hold hearings but do not compel sworn testimony; drop it.

**If no.** Dropping it writes that you let it go. If the facts come out later, the record shows you were asked and said yes.

**Gates (yes or no).** You hold a seat with power to investigate: a chair, a party leader, a member named to a panel. Conduct by {powerful officeholder} is on record.

**Weights (amounts only).** How strong the evidence is. Your party's ties to {powerful officeholder}. The mood in the place after a crisis.

**Branches.**

- _By record, when they ask you not to look, citing a war or crisis:_ You agree to a narrower review by one committee, and later say you were asked.
- _By record, when {other-party leader} names you to their panel:_ You become its vice chair, and your own party calls it betrayal (C15).
- _By record, when the trail leads to your own party's people:_ You follow it anyway, and your party's elders criticize you.
- _By record, when you hold hearings without sworn testimony:_ Both sides say you went soft, and you mention removal as a remedy on the air.

**Unlocks.** C15 (Your caucus votes on you); C14 (Your own party's leader on trial); floor-debate (kind).  
**Extends.** S1 (catalog: The briefing when something goes wrong).  
**Merges with.** C14 (Your own party's leader on trial); C12 (The one investigating you answers to you); C10 (Meeting the government yours shuns); A42 (The senior member sizes you up).

**Needs.** A grudge from politics that votes, endorsements and the party act on; Backers who turn on you, groups that split.

**Real lives.**

- Tom Daschle: He said the vice president asked him not to investigate the September 11 attacks; the Intelligence Committee did a limited review instead. (https://en.wikipedia.org/wiki/Tom_Daschle)
- Liz Cheney: In 2021 Speaker Nancy Pelosi named her to the House committee on the January 6 attack, and she became its vice chair. (https://en.wikipedia.org/wiki/Liz_Cheney)
- John Kerry: His staff followed money to a bank, BCCI, that was shut in 1991. The 1992 report also named influential Democrats, and some in his party criticized him for it. (https://en.wikipedia.org/wiki/John_Kerry)
- Arlen Specter: In 2006, as Judiciary chair, he called warrantless wiretapping inappropriate and held hearings without forcing sworn testimony from the attorney general, while mentioning impeachment as a remedy. (https://en.wikipedia.org/wiki/Arlen_Specter)

### C14. Your own party's leader on trial

Bank 3 · impeachment

**Also plays in.** The first term.

**Moment.** {the body} is voting on whether to impeach or remove {party leader}, the head of your own party.

**Roles.** `{party leader}`: the executive from your party, said with the office.

**Setting (fixed).** the floor of {the body} on the day of the vote, because the vote is public.

**Choices.** Vote to impeach or remove; vote against; speak against what they did but vote against removal; cast a vote of your own kind.

**If no.** Not voting writes an absence in the most watched vote of your term.

**Gates (yes or no).** You hold a seat in a body that can impeach or try an executive. {party leader} is charged in that body.

**Weights (amounts only).** How strong the evidence is. How loyal your district is to {party leader}. Traits about loyalty and rules.

**Branches.**

- _By record, when you vote to remove:_ Members of your party demand your post, your party at home censures you, and a challenger is recruited (C15, C29).
- _By record, when you speak against them but vote to keep them:_ The speech is quoted against you years later, in a primary from the other side of your party.
- _By record, when you cast a vote of your own kind:_ The record writes it as a no, and both sides call you slippery.

**Unlocks.** C15 (Your caucus votes on you); C29 (The leader's word in your primary); C28 (A challenger from your own side).  
**Extends.** L4 (catalog: The sole no); K5 (catalog: Answer for a vote you once cast).  
**Merges with.** C27 (They move to impeach you); C15 (Your caucus votes on you); B44 (Your first vote is the big one).

**Opened by.** C13 (The inquiry you could open); C27 (They move to impeach you).

**Needs.** Impeachment, trial and removal of an officeholder; A censure by a body or by a party; A grudge from politics that votes, endorsements and the party act on.

**Real lives.**

- Liz Cheney: In January 2021 she voted to impeach President Trump after the Capitol attack. Colleagues demanded her removal from leadership, and Wyoming's party censured her. (https://en.wikipedia.org/wiki/Liz_Cheney)
- Joe Lieberman: In 1998 he was the first prominent Democrat to criticize President Clinton in a Senate speech, then voted against removal. The speech was used against him in his 2006 primary. (https://en.wikipedia.org/wiki/Joe_Lieberman)
- Arlen Specter: At President Clinton's 1999 trial he cited Scottish law to vote not proven. The Senate recorded it as not guilty. (https://en.wikipedia.org/wiki/Arlen_Specter)

### C15. Your caucus votes on you

Bank 3 · your caucus

**Also plays in.** The first term; Running again.

**Moment.** Members of your own party in {the body} call a vote on whether you keep {your post}, after you broke with {party leader}.

**Roles.** `{your post}`: a party post or committee chair you hold in {the body}. `{party leader}`: the leader of your party you broke with, said with the post. `{loyal member}`: a member of your party who wants your post, said with the seat.

**Setting (fixed).** the closed meeting of your party's members, because the vote happens there.

**Choices.** Make your case in a speech; promise to stay quiet; resign the post; ask for a secret ballot.

**If no.** Saying nothing writes that you let them decide, and the vote goes by who is loudest.

**Gates (yes or no).** You hold a party post or a chair in {the body}. You broke with {party leader} on a recorded vote, endorsement or statement.

**Weights (amounts only).** How many members agree with you. How popular {party leader} is with the party's voters. Your ties in the caucus.

**Branches.**

- _By record, when the ballot is secret:_ You keep the post by a wide margin. Days later your party at home censures you anyway.
- _By record, when the vote is by voice:_ No count is kept. You are out, and {loyal member} takes the post.
- _By record, when a powerful officeholder asks them to spare you:_ You keep your chair but lose a seat on another committee.
- _By record, when you have just switched parties:_ Your new colleagues refuse to give you your old seniority (C04).

**Unlocks.** C47 (Crossing over); C49 (Break with the one you served); C29 (The leader's word in your primary).  
**Extends.** vote-sought (kind).  
**Merges with.** C14 (Your own party's leader on trial); A46 (The vote for leader); C04 (One seat decides who runs the body).

**Opened by.** C04 (One seat decides who runs the body); C09 (Running for a leadership post); C13 (The inquiry you could open); C14 (Your own party's leader on trial); C47 (Crossing over); C49 (Break with the one you served).

**Needs.** A caucus removing a member from a party post mid-term; A censure by a body or by a party; A grudge from politics that votes, endorsements and the party act on.

**Real lives.**

- Liz Cheney: In February 2021 she kept her leadership post 145 to 61 in a secret ballot, and days later Wyoming's party censured her. In May she was removed by voice vote and replaced. (https://en.wikipedia.org/wiki/Liz_Cheney)
- Joe Lieberman: After he backed the Republican nominee in 2008, Senate Democrats voted 42 to 13 to let him keep his chairmanship, after President-elect Obama urged them not to punish him. He lost one committee seat. (https://en.wikipedia.org/wiki/Joe_Lieberman)
- Arlen Specter: When he joined the Democrats in 2009, they refused to let him keep his seniority on committees. (https://en.wikipedia.org/wiki/Arlen_Specter)

### C16. The boss is away

Bank 3 · the deputy

**Also plays in.** Working inside politics; The first term.

**Moment.** {the executive} is away, and the calls, the decisions and the press all come to you.

**Roles.** `{the executive}`: the officeholder you work for, said with the office. `{second in line}`: whoever stands next in line to act for {the executive}, said with the post.

**Setting.** The executive's office, with the executive's chair empty.

**Choices.** Decide what must be decided and say so; hold everything until they return; tell the press the truth about where they are; cover for them.

**If no.** Holding everything writes that the work waited. What waited is on the record.

**Gates (yes or no).** You are the chief of staff, the deputy or {second in line} to {the executive}. {the executive} is away on record: campaigning, traveling, unreachable.

**Weights (amounts only).** How long they are gone. How much is waiting. How much {the executive} trusts you.

**Branches.**

- _By record, when {the executive} is running for higher office:_ You run the place day to day for months. Later you say so, and it is the record you run on.
- _By record, when they will not answer:_ After many unanswered calls you have to tell the press something. Whatever you say is quoted when the truth comes out (C22).
- _By record, when {second in line} wants to act:_ They ask whether the office is vacant in law, and the question itself is news.

**Unlocks.** C22 (The secret comes out); press-interview (kind); desk-visit (kind).  
**Extends.** M5 (catalog: The department head who disagrees).  
**Merges with.** A17 (The boss who hands you the work); C22 (The secret comes out); B39 (Everyone wants the credit).

**Needs.** Word spreads from the people who saw it.

**Real lives.**

- Gray Davis: As chief of staff to California's governor, he later said he ran the state while his boss campaigned for president in 1980. (https://en.wikipedia.org/wiki/Gray_Davis)
- Mark Sanford: In 2009 the South Carolina governor told his staff he was hiking and did not answer 15 calls from his chief of staff while he was in Argentina. (https://en.wikipedia.org/wiki/Mark_Sanford)

## Crises and scandals (11)

Disasters, attacks, secrets, prosecutors, illness and impeachment, in any term.

### C17. The disaster bigger than your government

Bank 3 · disaster

**Also plays in.** The first days; The first term.

**Moment.** {the disaster} is past what {the place} can handle, and help from {higher government} comes with a question of who is in charge.

**Roles.** `{higher government}`: the government above yours, said by its leader's post. `{the disaster}`: a storm, flood, fire, outage or shortage on the world's record.

**Setting.** Wherever the response is run from, or out where the damage is.

**Choices.** Ask early, in writing, for everything; refuse to hand over command of your own forces; ask other places for help; blame {higher government} in public; accept the blame for your part.

**If no.** Not asking writes that you went alone. The record of the response is yours.

**Gates (yes or no).** You hold an executive office. {the disaster} is on record in your place. You can ask {higher government} for help.

**Weights (amounts only).** How bad it is. How fast help comes. Whether {higher government}'s leader is of your party. How ready your place was.

**Branches.**

- _By record, when {higher government} offers to take command:_ You refuse in writing to keep your powers, and the standoff is the story for weeks.
- _By record, when {higher government} will not step in:_ You are left to make costly deals on your own (C19).
- _By record, when {higher government}'s leader accepts blame:_ You accept your part too, and the blame stays with you longer than with them.
- _By record, when relief money is slow:_ Months later few have been paid. You call for an investigation into whether party politics slowed the help.
- _By record, when your own party's leaders delay the aid:_ You attack them by name (C18).

**Unlocks.** C18 (Thanking the other side's leader); C19 (The deal to end it now); C41 (Run again or step aside); home-damaged (kind).  
**Extends.** S2 (catalog: The other government's decision lands on you); S1 (catalog: The briefing when something goes wrong); B55 (The storm that decides the next race).  
**Merges with.** B55 (The storm that decides the next race); C18 (Thanking the other side's leader); C08 (Money from above, with strings).

**Needs.** Help from a higher government, and who commands it; Approval that the economy and events move.

**Real lives.**

- Kathleen Blanco: Before Hurricane Katrina in 2005 the Louisiana governor asked the president in writing for help. She declined his offer to federalize the state's National Guard, accepted responsibility for state failures after he accepted federal blame, and in 2007 called for an inquiry into whether partisan politics slowed the response. (https://en.wikipedia.org/wiki/Kathleen_Blanco)
- Gray Davis: In California's 2001 electricity crisis the federal administration refused to step in, and the state bought power itself. (https://en.wikipedia.org/wiki/Gray_Davis)
- Chris Christie: In January 2013 he attacked his own party's House Speaker for delaying a vote on hurricane aid. (https://en.wikipedia.org/wiki/Chris_Christie)

### C18. Thanking the other side's leader

Bank 3 · the other side

**Also plays in.** Running again.

**Moment.** {other-party leader} helps {the place} after {the disaster}, and the cameras catch you thanking them days before {party}'s big race.

**Roles.** `{other-party leader}`: the leader of the other party at the level above, said with the office. `{the disaster}`: a storm, flood, fire or attack on the world's record.

**Setting.** Where the help is seen: the site, the floor of {the body}, a joint appearance.

**Choices.** Thank them in public; thank them in private only; criticize the help; stand with them at the site.

**If no.** Saying nothing writes that you kept your distance. Residents who got the help notice.

**Gates (yes or no).** {the disaster} is on record in your place. {other-party leader} acted for your place on record.

**Weights (amounts only).** How close the race is. How much help came. How partisan your party's voters are.

**Branches.**

- _By record, when your party loses the big race:_ Your party blames your words, and you are passed over for the next ticket (C34).
- _By record, when you use the moment in your own ad:_ The other party demands the ad come down, saying it implies an endorsement.
- _By record, when your own party's leaders delay aid:_ You attack them by name. Your approval at home rises, and your party's base sours.

**Unlocks.** C34 (Choose a running mate); C35 (The long shot for the top); rally-word (kind).  
**Extends.** S2 (catalog: The other government's decision lands on you).  
**Merges with.** C17 (The disaster bigger than your government); B35 (The crowd boos the winner); B55 (The storm that decides the next race).

**Opened by.** C17 (The disaster bigger than your government).

**Needs.** Approval that the economy and events move; A grudge from politics that votes, endorsements and the party act on.

**Real lives.**

- Chris Christie: Days before the 2012 presidential vote he praised President Obama's storm relief. Conservatives said he hurt his party's nominee, and his approval at home peaked. (https://en.wikipedia.org/wiki/Chris_Christie)
- Tom Daschle: Nine days after the September 11 attacks he hugged President Bush on the Senate floor. When he used the footage in a 2004 ad, the Republican National Committee demanded it be pulled. (https://en.wikipedia.org/wiki/2004_United_States_Senate_election_in_South_Dakota)

### C19. The deal to end it now

Bank 3 · the deal

**Also plays in.** The first term.

**Moment.** {the crisis} is on you now, and {seller} offers to end it with a long deal at a high price.

**Roles.** `{the crisis}`: a shortage, blackout, closing plant or budget gap on the world's record. `{seller}`: a company, board or group offering the deal, said with what it does.

**Setting.** Where the deal is made: your office, a call with {seller}, a closed meeting.

**Choices.** Sign the long deal; cap prices and wait; let prices rise; open the books on the deal first.

**If no.** Waiting writes that you let it run, and the shortage or closing goes on.

**Gates (yes or no).** You hold an executive office. {the crisis} is on record in your place. {seller} has offered a deal on record.

**Weights (amounts only).** How bad it is. How large the deal is. How many years it runs. How close your next race is.

**Branches.**

- _By record, when you sign long contracts:_ Prices fall back within a year, and you are stuck paying the old price. Reporters sue to see the terms.
- _By record, when you keep prices capped:_ Households are spared the bill for now, and the companies' squeeze gets worse.
- _By record, when a board says the new benefit costs nothing:_ You sign it. When the markets fall it becomes a burden the budget carries for years.
- _By record, when you give a company billions to build:_ The plant is your mark at the next race, and whether the jobs come is the record.

**Unlocks.** C31 (The recall against you); C43 (The last weeks in office); budget-cut (kind).  
**Extends.** L3 (catalog: Using the money to win something else); S1 (catalog: The briefing when something goes wrong).  
**Merges with.** C17 (The disaster bigger than your government); B49 (The hole in the budget); C08 (Money from above, with strings).

**Opened by.** C17 (The disaster bigger than your government).

**Needs.** Approval that the economy and events move.

**Real lives.**

- Gray Davis: In California's 2001 electricity crisis he declared an emergency and the state agreed to pay $43 billion for power over 20 years, deals critics called overpriced. He kept household rates capped. In 1999 he had signed a pension expansion after the retirement board said it would need no added state money. (https://en.wikipedia.org/wiki/Gray_Davis, https://en.wikipedia.org/wiki/2000%E2%80%932001_California_electricity_crisis)
- Scott Walker: He backed a deal giving Foxconn billions in subsidies to build a plant in Wisconsin, and lost re-election in 2018. (https://en.wikipedia.org/wiki/Scott_Walker_(politician))

### C20. An attack aimed at you

Bank 3 · an attack

**Also plays in.** The campaign; The first term.

**Moment.** At {the event}, or through the mail, someone attacks you or your people, and {the place} watches what you do next.

**Roles.** `{the event}`: a public event on record that you hold: a meeting with residents, a rally. `{staffer}`: someone on your staff who was there, said with the job.

**Setting (fixed).** the hospital, the scene or your office in the days after, because the attack decides where you are.

**Choices.** Go back to public events; change how you meet people; speak about how hot politics has run; let your family speak for you; step back to recover.

**If no.** Staying silent writes nothing, and others decide what it meant.

**Gates (yes or no).** You hold an office or are a candidate. An attack or threat against you, your staff or your office is on record.

**Weights (amounts only).** How badly you or your staff were hurt. How heated the race had been. Traits that stand firm.

**Branches.**

- _By record, when you are badly hurt:_ Months of recovery. When you return to vote, the whole body stands.
- _By record, when it comes by mail:_ An aide opens it, the building closes, and the staff are tested.
- _By record, when the threats name your family:_ A caller threatens your partner and child, the case goes to court, and you pay for guards.
- _By record, when you survive in front of cameras:_ Your gesture becomes the picture of the race, and the head of the protection service resigns.
- _By record, when {staffer} is among the wounded:_ Later {staffer} runs for your seat and wins (C42).

**Unlocks.** C42 (Leaving before the term ends); C48 (The cause you carry out); care (kind); speech-afterward (kind).  
**Extends.** S1 (catalog: The briefing when something goes wrong); warning (kind).  
**Merges with.** B34 (The concession call); C24 (Sick in office); A39 (Be there that night).

**Needs.** Attacks and threats aimed at officeholders and candidates.

**Real lives.**

- Gabby Giffords: In 2011 she was shot in the head at a meeting with constituents outside a Tucson grocery store; six people died. She returned to vote that August, and a wounded staffer, Ron Barber, later won her seat. (https://en.wikipedia.org/wiki/2011_Tucson_shooting, https://en.wikipedia.org/wiki/Gabby_Giffords)
- Donald Trump: In July 2024 he was shot in the ear at an outdoor rally and raised his fist. The head of the Secret Service resigned after hearings. (https://en.wikipedia.org/wiki/Attempted_assassination_of_Donald_Trump_in_Pennsylvania)
- Tom Daschle: In October 2001 an aide in his Senate office opened a letter containing anthrax. (https://en.wikipedia.org/wiki/2001_anthrax_attacks)
- Eric Cantor: In 2011 a caller threatened his wife and daughter. The caller pleaded guilty and went to prison. (https://en.wikipedia.org/wiki/Eric_Cantor)

### C21. Your people did it in your name

Bank 3 · your staff

**Also plays in.** The first term.

**Moment.** {aide} and {appointee} did something to punish {local official} for not backing you, and {reporter} has the emails.

**Roles.** `{aide}`: someone on your staff, said with the job. `{appointee}`: someone you appointed to a board or agency, said with the post. `{local official}`: an official who refused to endorse you, said with the office.

**Setting.** Where you answer for it: a press conference, your office with your counsel.

**Choices.** Fire them and say you were lied to; defend them; joke it off; tell your staff to come forward; open a review.

**If no.** Saying nothing writes that you stood by them, and the next email out is worse.

**Gates (yes or no).** You hold an executive office. Staff or appointees acted on record against someone who refused you. The act is public.

**Weights (amounts only).** How many people were hurt. How close {aide} is to you. What the record shows you knew.

**Branches.**

- _By record, when you joke about it:_ Your line is played back to you when the emails come out.
- _By record, when you fire them:_ They are charged, and one says under oath that you lied. You are not charged.
- _By record, when an aide stole from a fundraiser:_ Your chief of staff tells you, you tell them to go to the prosecutor, and a long inquiry convicts people near you (C23).
- _By record, when the convictions are thrown out years later:_ The highest court overturns them. The damage to you stays.

**Unlocks.** C23 (The case against you); C34 (Choose a running mate); C44 (The post that falls through); scandal (kind).  
**Extends.** scandal (kind); X3 (catalog: People who lie to the player).  
**Merges with.** C22 (The secret comes out); C23 (The case against you); A36 (Your people or theirs); C25 (The joke that lands wrong).

**Needs.** A grudge from politics that votes, endorsements and the party act on; Word spreads from the people who saw it.

**Real lives.**

- Chris Christie: In 2013 his deputy chief of staff and Port Authority appointees closed bridge lanes into Fort Lee after its mayor did not endorse him. He joked that he worked the cones, then fired her in January 2014, calling her deceitful. Two were convicted in 2016; the Supreme Court overturned the convictions in 2020. (https://en.wikipedia.org/wiki/Fort_Lee_lane_closure_scandal)
- Scott Walker: As Milwaukee County executive, his chief of staff raised concerns about missing funds from a veterans' fundraiser, and Walker told him to report it to the district attorney. The inquiry convicted people around him, including a former deputy chief of staff. (https://en.wikipedia.org/wiki/Scott_Walker_(politician))

### C22. The secret comes out

Bank 3 · a secret

**Also plays in.** The campaign; The first term.

**Moment.** {reporter} is waiting where you did not expect, and asks where you have been and with whom.

**Roles.** `{the secret}`: an affair, a hidden trip or a second household on your record. `{partner}`: your spouse or partner on record. `{running mate}`: whoever shares the ticket with you, said with the office.

**Setting.** Where a reporter would catch you off guard: an airport, a hotel lobby, the curb outside home.

**Choices.** Admit all of it; admit part and deny the rest; deny it; resign; let someone close take the blame.

**If no.** Denying writes a lie the record can contradict, and the next thing found is worse.

**Gates (yes or no).** You hold an office or are running. {the secret} is on your record, and a reporter can find it.

**Weights (amounts only).** How long it was hidden. How many staff covered for it. How close the race is.

**Branches.**

- _By record, when you told staff a cover story:_ They repeated it to the press, and when it breaks they look like the liars.
- _By record, when an aide claims it to protect you:_ The aide takes it back later and writes it all down.
- _By household, when {partner} leaves:_ Divorce and custody fights in court, and {partner} speaks in public.
- _By record, when public money paid for the trip:_ You pay the place back, and ethics charges follow (C27).
- _By record, when the secret is {running mate}'s:_ A tape of their words comes out. Stand by the ticket, step away, or refuse to stand in for them at the next event.

**Unlocks.** C23 (The case against you); C27 (They move to impeach you); C46 (The comeback); breakup (kind).  
**Extends.** scandal (kind); X3 (catalog: People who lie to the player).  
**Merges with.** B14 (Your past comes out); C16 (The boss is away); C24 (Sick in office); C37 (They say you are not who you claim).

**Opened by.** C16 (The boss is away).

**Needs.** Your past found and used against you.

**Real lives.**

- Mark Sanford: In 2009 the South Carolina governor told staff he was hiking but was in Argentina with his mistress. A reporter met him at the airport and he admitted the affair. He repaid the state for travel, faced ethics charges, and his wife filed for divorce. (https://en.wikipedia.org/wiki/Mark_Sanford)
- John Edwards: He denied an affair until reporters caught him at a hotel in 2008. He admitted it but denied fathering the child, and an aide claimed paternity; in 2010 he admitted he was the father, and his wife separated from him. (https://en.wikipedia.org/wiki/John_Edwards, https://en.wikipedia.org/wiki/John_Edwards_extramarital_affair)
- Mike Pence: When a tape of his running mate's lewd remarks came out in 2016, he said he could not defend them but stayed on the ticket, and declined to stand in for Trump at an event. (https://en.wikipedia.org/wiki/Mike_Pence)

### C23. The case against you

Bank 3 · the prosecutor

**Also plays in.** Running again; After office.

**Moment.** {prosecutor} has opened a case about you, your campaign's money or what you kept, and it will run for years.

**Roles.** `{prosecutor}`: a prosecutor or special counsel on record, said with the office. `{backer}`: a rich supporter whose money is part of the case, said with what they do.

**Setting.** Where a case reaches you: your lawyer's office, the courthouse steps, a rally the day after.

**Choices.** Fight it in court; cooperate; attack {prosecutor} in public; take a plea; pay back what is owed.

**If no.** Saying nothing writes that you left it to the lawyers, and the case's filings become the story.

**Gates (yes or no).** You hold or held an office, or are running. A case naming you or your campaign is open on record.

**Weights (amounts only).** How strong the evidence is. How long it has run. How your backers see the prosecutor.

**Branches.**

- _By record, when money from {backer} hid something:_ It is the heart of the case. The jury acquits on one count and cannot agree on the rest; the case is dropped, and your career is over anyway.
- _By record, when you are convicted while running:_ You are the first in your office with a felony conviction. You win anyway, and the sentence is no sentence.
- _By record, when the case is kept secret:_ Subpoenas and searches go on under a gag order, and the highest court in the place ends it after years.
- _By record, when you win the office during the case:_ The case is dropped under the rule against charging the one who holds the office.

**Unlocks.** C46 (The comeback); C39 (You lost, and you won't accept it); prison-visit (kind).  
**Extends.** B10 (The rival under indictment); accusation (kind).  
**Merges with.** C22 (The secret comes out); C21 (Your people did it in your name); B10 (The rival under indictment); C12 (The one investigating you answers to you); C11 (Family on the inside).

**Opened by.** C11 (Family on the inside); C12 (The one investigating you answers to you); C21 (Your people did it in your name); C22 (The secret comes out); C26 (Asked to change the count).

**Needs.** Your past found and used against you.

**Real lives.**

- John Edwards: He was indicted in 2011 over more than $1 million from backers used to hide his affair during the 2008 race. In 2012 the jury found him not guilty on one count and deadlocked on the rest, and the government dropped the case. (https://en.wikipedia.org/wiki/John_Edwards, https://en.wikipedia.org/wiki/John_Edwards_extramarital_affair)
- Donald Trump: In May 2024 a New York jury convicted him on 34 felony counts over payments booked as business expenses; he won the election that fall and was sentenced to an unconditional discharge. The federal cases were dropped after his win. (https://en.wikipedia.org/wiki/Indictments_against_Donald_Trump, https://en.wikipedia.org/wiki/Donald_Trump)
- Scott Walker: A secret inquiry into whether his recall campaign coordinated with outside groups ran for years under a gag order until Wisconsin's supreme court ended it in 2015. (https://en.wikipedia.org/wiki/Scott_Walker_(politician))

### C24. Sick in office

Bank 3 · illness

**Also plays in.** The campaign; The first term; After office.

**Moment.** {doctor} tells you, or {household member}, that it is serious, in the middle of your term or your race.

**Roles.** `{doctor}`: the doctor giving the diagnosis, said with the hospital.

**Setting (fixed).** the doctor's office or the hospital, because the news is given there.

**Choices.** Announce it and keep working; keep it private; step back from a post; end the race; keep the race going together.

**If no.** Keeping it private writes a secret that a reporter or staffer can find.

**Gates (yes or no).** You hold an office or are running. A serious diagnosis is on record for you or someone in your household.

**Weights (amounts only).** How serious it is. How far into the term or race you are. How much the work needs you there in person.

**Branches.**

- _By record, when you keep working through treatment:_ A colleague shaves his head with you, and your committee keeps meeting.
- _By household, when {household member}'s illness comes back during the race:_ You and {household member} decide to keep campaigning together.
- _By record, when it comes back after you leave office:_ You say in public that you have made peace, and the place honors you at the end.

**Unlocks.** C41 (Run again or step aside); C42 (Leaving before the term ends); care (kind).  
**Extends.** care (kind); office-doubt (kind).  
**Merges with.** C20 (An attack aimed at you); C22 (The secret comes out); A31 (Taken ill before election day).

**Real lives.**

- Arlen Specter: He had a brain tumor removed in 1993, and in 2005, as the new Judiciary chair, worked through chemotherapy for Hodgkin's lymphoma; a colleague shaved his head in solidarity. (https://en.wikipedia.org/wiki/Arlen_Specter)
- John Edwards: The day after the 2004 concession he announced his wife's breast cancer. When it returned in 2007, the couple chose to keep his campaign going. (https://en.wikipedia.org/wiki/John_Edwards)
- Kathleen Blanco: Years after leaving office her cancer returned, and she said publicly she had made peace with it. (https://en.wikipedia.org/wiki/Kathleen_Blanco)

### C25. The joke that lands wrong

Bank 3 · your words

**Also plays in.** The campaign; Running again.

**Moment.** Asked about {the matter} at {the event}, you make a joke, and it lands on the wrong people.

**Roles.** `{the matter}`: a vote, a scandal or a fight on your record. `{the event}`: a rally, a press conference or a speech on record.

**Setting.** Where you spoke: the rally, the press room.

**Choices.** Call it a botched joke and refuse to apologize; apologize at once; apologize after a day or two; say it again.

**If no.** Not answering writes that the words stand, and rivals replay them.

**Gates (yes or no).** You hold an office or are campaigning. Your remark is on record from a public event or a reporter.

**Weights (amounts only).** How many heard it. How hurt the people it hit are. How close the race is.

**Branches.**

- _By record, when you wait two days to apologize:_ Your own party's candidates ask you to stay away, and you give up a run you had planned.
- _By record, when the joke was about a scandal that grows:_ The line is replayed every time a new email comes out (C21).
- _By record, when one line explains two votes:_ Your line about voting for a bill before voting against it becomes the other side's ad.

**Unlocks.** C35 (The long shot for the top); apology (kind); press-interview (kind).  
**Extends.** B15 (Your own words, cut up); K5 (catalog: Answer for a vote you once cast).  
**Merges with.** B15 (Your own words, cut up); A44 (The apology ad); C21 (Your people did it in your name).

**Needs.** Word spreads from the people who saw it.

**Real lives.**

- John Kerry: In 2004 his line explaining that he voted for war funding before voting against it became his opponents' theme. In 2006 a joke about students getting stuck in Iraq drew attacks; he apologized after two days and dropped plans to run again. (https://en.wikipedia.org/wiki/John_Kerry)
- Chris Christie: Asked about the bridge lane closures in December 2013, he joked that he worked the cones himself. (https://en.wikipedia.org/wiki/Fort_Lee_lane_closure_scandal)

### C26. Asked to change the count

Bank 3 · the count

**Also plays in.** Election night; The morning after.

**Moment.** {party leader} lost, and asks you, the one who must count, certify or preside over the result, to find a way to change it.

**Roles.** `{party leader}`: the head of your party who lost, said with the office. `{the result}`: the count you must certify, count or preside over.

**Setting.** Where the pressure comes: a long phone call with lawyers on the line, a meeting in {party leader}'s office.

**Choices.** Refuse in writing; refuse quietly; say you will look into it; do it.

**If no.** Saying nothing writes {the result} as it stands, and {party leader} takes the silence as a no.

**Gates (yes or no).** You hold an office with a duty to count, certify or preside over a result. {the result} is against your party's candidate on record.

**Weights (amounts only).** How close the result is. How loyal you have been. How many people are pressing you. Traits that keep rules.

**Branches.**

- _By record, when you refuse in writing:_ {party leader} says in front of a crowd that you lack courage, and some of the crowd come looking for you.
- _By record, when you record the call:_ The recording is published the next day and becomes evidence in court (C23).
- _By record, when you are the one who lost:_ You make the calls. Each official's answer is a record a prosecutor can read.
- _By trait, when you see it as a duty:_ You point to an official who once presided over their own defeat.

**Unlocks.** C23 (The case against you); C49 (Break with the one you served); C39 (You lost, and you won't accept it).  
**Extends.** election-night (kind); K8 (catalog: The count is close).  
**Merges with.** C39 (You lost, and you won't accept it); B32 (The long count); B34 (The concession call).

**Opened by.** C34 (Choose a running mate); C39 (You lost, and you won't accept it).

**Needs.** Officials who certify a result, and pressure on them to change it; Attacks and threats aimed at officeholders and candidates.

**Real lives.**

- Mike Pence: After the 2020 election he told President Trump the Constitution gave him no power to reject electors and said so in a letter before the joint session. Trump said he lacked courage as a mob entered the Capitol. (https://en.wikipedia.org/wiki/Mike_Pence)
- Donald Trump: On January 2, 2021, he pressed Georgia's secretary of state on a recorded call to find enough votes to flip the state. The recording was published the next day and cited in later charges. (https://en.wikipedia.org/wiki/Trump%E2%80%93Raffensperger_phone_call)

### C27. They move to impeach you

Bank 3 · impeachment

**Also plays in.** The first term.

**Moment.** {the body} opens proceedings to impeach or censure you over {the charge}.

**Roles.** `{the charge}`: an act on your record that the body says was an abuse.

**Setting.** Where you plan your answer: your office with counsel, a rally the same night.

**Choices.** Tell your people to refuse subpoenas; cooperate; resign; take it to the voters at rallies; offer to accept a lesser rebuke.

**If no.** Saying nothing writes that you let the body set the terms.

**Gates (yes or no).** You hold an executive office. {the body} has opened proceedings against you on record.

**Weights (amounts only).** How many of your party sit in the body. How strong the evidence is. Your approval.

**Branches.**

- _By record, when no one in your party votes against you:_ You are impeached on a party-line vote and acquitted in the other chamber.
- _By record, when some of your party join them:_ Several of your own vote to convict. It falls short, and you stop speaking to your party's leader there.
- _By record, when the committee chooses censure:_ They vote down impeachment and censure you instead, and the rebuke sticks to your name.

**Unlocks.** C14 (Your own party's leader on trial); C39 (You lost, and you won't accept it); C46 (The comeback).  
**Extends.** scandal (kind).  
**Merges with.** C14 (Your own party's leader on trial); C22 (The secret comes out); C12 (The one investigating you answers to you); A36 (Your people or theirs).

**Opened by.** C12 (The one investigating you answers to you); C22 (The secret comes out).

**Needs.** Impeachment, trial and removal of an officeholder; A censure by a body or by a party.

**Real lives.**

- Donald Trump: The House impeached him in 2019 with no votes from his own party, and the Senate acquitted him. Impeached again in 2021, he was acquitted 57 to 43 with seven Republicans voting to convict. (https://en.wikipedia.org/wiki/First_impeachment_of_Donald_Trump, https://en.wikipedia.org/wiki/Second_impeachment_of_Donald_Trump)
- Mark Sanford: In 2009 a South Carolina House committee voted against impeaching him and for censure instead, which the full House passed. (https://en.wikipedia.org/wiki/Mark_Sanford)

## Running again (11)

Re-election and what comes with it: a challenger from your own side, the party leader's word, a recall, a party switch, a run for something bigger, a running mate.

### C28. A challenger from your own side

Bank 3 · the primary

**Also plays in.** The campaign.

**Moment.** {challenger}, from your own party, files against you, saying you forgot {the place} or the party's cause.

**Roles.** `{challenger}`: a member of your party running against you in the primary, said with what they do.

**Setting.** Wherever you hear it: the filing list, a call from {party official}.

**Choices.** Spend hard against them; come home and hold events; call them a closet member of the other party; ignore them.

**If no.** Ignoring them writes that you thought it safe, and your own polls agree, until the night.

**Gates (yes or no).** You hold a seat and are running again. {challenger} from your own party has filed.

**Weights (amounts only).** How long since you held events at home. How far your record is from your party's voters. Money each side has. Your rank in the body.

**Branches.**

- _By record, when your polls show you far ahead:_ You outspend them many times over and lose. You are the first of your rank to lose a primary (C42).
- _By record, when the fight is over a war or a big vote:_ Your party's voters punish the vote, and you lose. You say you will run on your own line (C39).
- _By record, when {party leader} backs you:_ The party's leaders campaign for you, and you win by a hair. They come to collect.
- _By record, when you call them a closet member of the other party:_ The label does not stick, and it helps them.

**Unlocks.** C39 (You lost, and you won't accept it); C42 (Leaving before the term ends); C30 (Change your party); race-lost (kind).  
**Extends.** K5 (catalog: Answer for a vote you once cast); rival-word (kind).  
**Merges with.** C29 (The leader's word in your primary); C40 (The leader who forgot home); A41 (Your deputy files against you); B11 (Where were you).

**Opened by.** C03 (The deciding vote); C14 (Your own party's leader on trial); C30 (Change your party); C46 (The comeback).

**Needs.** A favor owed outside the legislature, called in later; Backers who turn on you, groups that split.

**Real lives.**

- Eric Cantor: In 2014 the House majority leader lost his primary to an economics professor, 55 to 45, though his polls showed him far ahead and he outspent the challenger many times over. Constituents said he took them for granted. (https://en.wikipedia.org/wiki/Eric_Cantor)
- Joe Lieberman: In 2006 he lost Connecticut's Democratic primary to Ned Lamont, largely over the Iraq war. (https://en.wikipedia.org/wiki/2006_United_States_Senate_election_in_Connecticut)
- Arlen Specter: In 2004 a conservative House member challenged him in the primary. The president and the state party backed Specter, and he won with 51 percent. (https://en.wikipedia.org/wiki/Arlen_Specter)

### C29. The leader's word in your primary

Bank 3 · the primary

**Also plays in.** The campaign.

**Moment.** Hours before {the primary}, {party leader} tells the party's voters to back {challenger} over you.

**Roles.** `{the primary}`: your party's primary for your seat. `{party leader}`: the leader of your party, said with the office. `{challenger}`: the one {party leader} backs, said with what they do.

**Setting.** Wherever the word reaches you on primary day: the last stop, the car, the room where you wait for results.

**Choices.** Say you vote with them most of the time; stand on your breaks with them; attack them; ask them to take it back.

**If no.** Saying nothing leaves the endorsement unanswered on the last day.

**Gates (yes or no).** You hold a seat and face a primary. {party leader} has endorsed {challenger} on record.

**Weights (amounts only).** How popular {party leader} is with the party's voters. How often you broke with them. How often you voted with them.

**Branches.**

- _By record, when you lose narrowly:_ {challenger} wins the nomination and loses the seat to the other party in the fall.
- _By record, when you lose by a landslide:_ You concede on primary night and turn to a cause (C48).
- _By record, when {party leader} backs you instead:_ You survive, and you owe them (C28).

**Unlocks.** C48 (The cause you carry out); C47 (Crossing over); C35 (The long shot for the top); race-lost (kind).  
**Extends.** rival-word (kind).  
**Merges with.** C28 (A challenger from your own side); C15 (Your caucus votes on you); B06 (The party leaves its own nominee).

**Opened by.** C14 (Your own party's leader on trial); C15 (Your caucus votes on you); C46 (The comeback).

**Needs.** A grudge from politics that votes, endorsements and the party act on; A favor owed outside the legislature, called in later.

**Real lives.**

- Mark Sanford: Hours before the polls closed in his 2018 primary, President Trump attacked him online and backed his challenger. Sanford lost narrowly, and a Democrat won the seat that fall. (https://en.wikipedia.org/wiki/Mark_Sanford)
- Liz Cheney: In 2022 she lost Wyoming's primary by a landslide to a Trump-endorsed challenger and conceded that night. (https://en.wikipedia.org/wiki/2022_United_States_House_of_Representatives_election_in_Wyoming)

### C30. Change your party

Bank 3 · your party

**Also plays in.** Working inside politics; Governing.

**Moment.** The poll says you lose your party's primary, or its leaders have refused you, and the other party says there is room.

**Roles.** `{old boss}`: a leader of your old party who backed you before, said with the post.

**Setting.** Where you would weigh it: a private meeting with the other party's leaders, home that night.

**Choices.** Switch parties; run on your own line; stay and fight the primary; retire.

**If no.** Staying writes that you stuck with your party, and the primary comes.

**Gates (yes or no).** You hold or seek a seat. A recorded poll shows you losing your party's primary, or your party's leaders refused to back you.

**Weights (amounts only).** How far behind you are. How close your views are to the other party's. Seniority you would lose.

**Branches.**

- _By record, when you switch in office:_ Your new colleagues refuse your seniority, the old party calls you a traitor, and you lose the new party's primary anyway.
- _By record, when you switch before your first race:_ You run under the new party from the start, and the old party never forgets.
- _By record, when the bosses refused to back you:_ You run on the other party's line, win, and {old boss} calls you a traitor.
- _By record, when your switch changes who runs the body:_ Control of {the body} moves with you (C04).

**Unlocks.** C04 (One seat decides who runs the body); C28 (A challenger from your own side); C39 (You lost, and you won't accept it).  
**Extends.** party-recruit (kind).  
**Merges with.** C04 (One seat decides who runs the body); C28 (A challenger from your own side); B29 (A line of your own).

**Opened by.** C04 (One seat decides who runs the body); C28 (A challenger from your own side).

**Needs.** A sitting member changing party, with caucus, seniority and control following; A grudge from politics that votes, endorsements and the party act on.

**Real lives.**

- Arlen Specter: In 1965 Philadelphia's Democratic leaders refused to back him for district attorney, so he ran as a Republican and won, and his old boss called him a traitor. In 2009, with a poll showing him far behind in the Republican primary, he switched back, lost his seniority, and lost the 2010 Democratic primary. (https://en.wikipedia.org/wiki/Arlen_Specter, https://en.wikipedia.org/wiki/2010_United_States_Senate_election_in_Pennsylvania)
- Gabby Giffords: She switched from Republican to Democrat in 2000, before her first race for the Arizona House. (https://en.wikipedia.org/wiki/Gabby_Giffords)

### C31. The recall against you

Bank 3 · recall

**Also plays in.** Governing; The first term.

**Moment.** {organizer} has filed to recall you, and {donor} has just promised to pay for the signatures.

**Roles.** `{organizer}`: whoever filed the recall, said with the group. `{donor}`: a rich backer of the recall, said with what they want.

**Setting.** Where the news reaches you: your office, a call from your campaign people.

**Choices.** Fight the recall itself; sign laws your own voters want; apologize for what went wrong; raise far more money than they can; challenge the signatures.

**If no.** Not fighting writes that you let it run, and the vote comes on the date set.

**Gates (yes or no).** You hold an office that the place's law lets voters recall. A recall petition against you is on record.

**Weights (amounts only).** How many signatures are needed, from the last race's turnout. The money behind it. Your approval. Traits that fight.

**Branches.**

- _By record, when turnout was low in your last race:_ The low turnout in your own last race made the signature count small (C32).
- _By record, when you are recalled:_ A newcomer wins the replacement vote. You concede and offer help with the handover (C43).
- _By record, when you survive:_ You are the first in your office to survive one, and recalls of members on the same day change who controls {the body}.
- _By record, when you sign bills to win back your base:_ Your base stays cool, and the polls do not move.

**Unlocks.** C43 (The last weeks in office); C04 (One seat decides who runs the body); race-lost (kind); race-won (kind).  
**Extends.** recall (kind); A07 (A neighbor starts a recall).  
**Merges with.** B50 (The promise on day one); C07 (Taking on the public workers); A07 (A neighbor starts a recall); C32 (Pick your opponent).

**Opened by.** C05 (A move in the rules); C07 (Taking on the public workers); C19 (The deal to end it now); C32 (Pick your opponent); C38 (The promise and the bill on your desk).

**Needs.** Approval that the economy and events move.

**Real lives.**

- Gray Davis: A recall drive against the California governor stalled until a congressman gave $2 million in 2003. The low turnout of the 2002 race had lowered the signatures needed. He signed bills his base wanted and apologized for being slow on the energy crisis, and was recalled. (https://en.wikipedia.org/wiki/2003_California_gubernatorial_recall_election, https://en.wikipedia.org/wiki/Gray_Davis)
- Scott Walker: Recall organizers gathered about 900,000 signatures, and he raised over $30 million. In 2012 he became the first governor to survive a recall; recalls of senators the same day briefly flipped the state Senate. (https://en.wikipedia.org/wiki/2012_Wisconsin_gubernatorial_recall_election, https://en.wikipedia.org/wiki/Scott_Walker_(politician))

### C32. Pick your opponent

Bank 3 · the opponent

**Also plays in.** The campaign.

**Moment.** Your next opponent will come out of the other party's primary, and you could spend now to help the weaker one win it.

**Roles.** `{strong rival}`: the other party's strongest candidate, said with the office they hold. `{weak rival}`: the weaker one, said with what they do.

**Setting.** Wherever the campaign plans its money: the campaign office, a call with {ad maker}.

**Choices.** Run ads against {strong rival}; stay out of it; attack both.

**If no.** Staying out writes nothing, and {strong rival} likely wins their primary.

**Gates (yes or no).** You hold an office and are running again. The other party's primary is contested on record.

**Weights (amounts only).** How much money you have. How much stronger one rival is. Traits that scheme.

**Branches.**

- _By record, when {weak rival} wins it:_ You beat them in a race so dull few vote, and the low turnout makes the next recall easy to qualify (C31).
- _By record, when the ads are traced to you:_ The other party calls it meddling, and it becomes an ad against you.

**Unlocks.** C31 (The recall against you); race-won (kind).  
**Extends.** donor-ask (kind); O5 (catalog: Changing the rules of the race).  
**Merges with.** B08 (The rival who coasts); B03 (Outspent); C28 (A challenger from your own side).

**Real lives.**

- Gray Davis: In 2002 he spent millions on ads during the Republican primary against Los Angeles mayor Richard Riordan, and the weaker Bill Simon won it. Davis beat Simon in the lowest-turnout governor's race in modern state history. (https://en.wikipedia.org/wiki/Gray_Davis)

### C33. Your seat or the bigger race

Bank 3 · the filing

**Also plays in.** Governing; The campaign.

**Moment.** The deadline to file for your own seat comes before you know whether you will be on {the bigger ticket}.

**Roles.** `{the bigger ticket}`: a higher office or a running-mate slot on record. `{successor}`: whoever would take your place on the ballot, said with the post.

**Setting.** Where the deadline catches you: the clerk's counter, a call from the party.

**Choices.** Drop your own race; run for both at once; skip the bigger race; leave your seat and back {successor}.

**If no.** Not choosing lets the deadline choose for you.

**Gates (yes or no).** You hold an office and could run again. You are on a short list for, or running in, {the bigger ticket}.

**Weights (amounts only).** How safe your seat is. How likely the bigger race is. Whether the law lets you run for both.

**Branches.**

- _By record, when you drop your race to join the ticket:_ {successor} takes your place on the ballot and wins.
- _By record, when you run for both:_ You lose the big race and keep your seat.
- _By record, when you leave the seat open and back {successor}:_ {successor} loses, and the seat goes to the other party.

**Unlocks.** C34 (Choose a running mate); C41 (Run again or step aside); filing (kind).  
**Extends.** A43 (Be my running mate); A38 (The paid post or the seat).  
**Merges with.** A43 (Be my running mate); C34 (Choose a running mate); C41 (Run again or step aside).

**Real lives.**

- Mike Pence: In July 2016, the day Trump announced him as his running mate, he filed to end his own race for re-election as Indiana governor; his lieutenant governor took his place and won. (https://en.wikipedia.org/wiki/Mike_Pence)
- Joe Lieberman: In 2000 he ran for re-election to the Senate while he was the Democrats' vice-presidential nominee, and kept his seat. (https://en.wikipedia.org/wiki/Joe_Lieberman)
- John Edwards: He did not run for a second Senate term in 2004 and backed Erskine Bowles, who lost the seat to a Republican. (https://en.wikipedia.org/wiki/John_Edwards)

### C34. Choose a running mate

Bank 3 · the ticket

**Also plays in.** The campaign.

**Moment.** You need a running mate, and the list is {rival}, who attacked you in the primary, {loyal ally}, who backed you early, and {safe pick}.

**Roles.** `{rival}`: your opponent in the primary just ended. `{loyal ally}`: someone who endorsed you early, said with the office. `{safe pick}`: someone who reassures your party's donors, said with the office.

**Setting.** Where the choice is made: a private meeting, your home with your closest advisers.

**Choices.** Pick {rival}; pick {loyal ally}; pick {safe pick}; let the party's leaders decide.

**If no.** Not choosing lets the party's leaders pick.

**Gates (yes or no).** You are your party's nominee for an office that has a running mate.

**Weights (amounts only).** What each brings in votes and money. Your ties with each. Scandals on each one's record.

**Branches.**

- _By record, when you pick {rival}:_ They campaign well. Years later you wish you had not, when their secret comes out (C22).
- _By record, when you pass over {loyal ally}:_ They say a scandal on their record cost them. You put them in charge of your transition and remove them later (C44).
- _By record, when {safe pick} backed someone else in the primary:_ They calm the party. Years later they are the one who must preside over your loss (C26).

**Unlocks.** C26 (Asked to change the count); C44 (The post that falls through); C49 (Break with the one you served).  
**Extends.** A43 (Be my running mate).  
**Merges with.** A43 (Be my running mate); C33 (Your seat or the bigger race); C36 (Endorse the one who beat you).

**Opened by.** C18 (Thanking the other side's leader); C21 (Your people did it in your name); C33 (Your seat or the bigger race).

**Needs.** A grudge from politics that votes, endorsements and the party act on.

**Real lives.**

- John Kerry: In 2004 he picked John Edwards, who had called him a Washington insider in the primary. A campaign adviser later wrote that Kerry wished he had not. (https://en.wikipedia.org/wiki/John_Kerry)
- Donald Trump: In 2016 he chose Mike Pence, who had backed Ted Cruz in the primary, over finalists including Chris Christie. (https://en.wikipedia.org/wiki/Mike_Pence)
- Chris Christie: Passed over for the 2016 ticket, he said the bridge scandal was a factor. Trump named him to lead the transition, then replaced him. (https://en.wikipedia.org/wiki/Chris_Christie)

### C35. The long shot for the top

Bank 3 · higher office

**Also plays in.** After office.

**Moment.** {donor} tells you that you can win {the top office}, and the first polls agree.

**Roles.** `{the top office}`: the highest office at the level above yours, on the ballot. `{front-runner}`: the leading candidate for the nomination, said with what they hold.

**Setting.** Where backers make the pitch: a dinner, a call, a meeting of big donors.

**Choices.** Run; wait; run, and quit early if it fails; run as the one who stops {front-runner}.

**If no.** Waiting writes that you passed, and your window may close.

**Gates (yes or no).** You hold or held an office. The nomination for {the top office} is open.

**Weights (amounts only).** Money pledged. How well known you are beyond your place. Your record of wins. Who else is running.

**Branches.**

- _By record, when you fall below one percent:_ You quit within weeks and urge others to quit too, to stop {front-runner}.
- _By record, when you quit after the first contest:_ You endorse the winner within weeks (C36).
- _By record, when your party cancels its primary:_ You debate a cardboard cutout of {front-runner}, and one reporter comes to your launch.
- _By record, when you once served under {front-runner}:_ You raise little, quit, and endorse no one (C49).

**Unlocks.** C36 (Endorse the one who beat you); C49 (Break with the one you served).  
**Extends.** donor-ask (kind).  
**Merges with.** C36 (Endorse the one who beat you); B19 (Who gets on the stage); B36 (The night you lose the first round).

**Opened by.** C18 (Thanking the other side's leader); C25 (The joke that lands wrong); C29 (The leader's word in your primary); C49 (Break with the one you served).

**Real lives.**

- Scott Walker: Donors expected him to win the 2016 nomination. By September 2015 he polled under one percent, quit, and urged other candidates to quit to stop Trump. (https://en.wikipedia.org/wiki/Scott_Walker_(politician))
- Chris Christie: He quit the 2016 race after New Hampshire and endorsed Trump weeks later. (https://en.wikipedia.org/wiki/Chris_Christie)
- Mark Sanford: Challenging Trump in 2019, he debated a cardboard cutout of him when South Carolina's party skipped its primary, and quit within months. (https://en.wikipedia.org/wiki/Mark_Sanford)
- Mike Pence: He ran against the president he had served, raised little, withdrew in October 2023, and endorsed no one. (https://en.wikipedia.org/wiki/Mike_Pence_2024_presidential_campaign)

### C36. Endorse the one who beat you

Bank 3 · endorsement

**Also plays in.** The morning after; After office.

**Moment.** {winner} beat you for the nomination and asks for your endorsement, with a role in it for you.

**Roles.** `{winner}`: the one who beat you, said with the nomination. `{old running mate}`: someone you once shared a ticket with, still in the race.

**Setting.** Where the ask comes: a call the week after, a meeting at {winner}'s office.

**Choices.** Endorse and take the role; endorse and take nothing; endorse no one; endorse {winner}'s rival.

**If no.** Endorsing no one writes that you held back, and {winner}'s backers remember.

**Gates (yes or no).** You lost a primary or a nomination to {winner} on record.

**Weights (amounts only).** How bitter the race was. What is offered. How your backers feel.

**Branches.**

- _By record, when you take the role:_ You run their transition. When your old aides are convicted you are dropped, and your people are purged (C44).
- _By record, when you endorse over {old running mate}:_ {old running mate} is still running and hears it from the news.
- _By record, when you endorse no one:_ You are the first in your position to refuse in decades.
- _By record, when you lost as a sitting member:_ You call {winner} and endorse them, and they lose in the fall.

**Unlocks.** C44 (The post that falls through); C49 (Break with the one you served); serve-sought (kind).  
**Extends.** O3 (catalog: Losing and then repairing); reconciliation (kind).  
**Merges with.** A35 (The loss that makes friends); B34 (The concession call); C35 (The long shot for the top).

**Opened by.** C35 (The long shot for the top).

**Needs.** A favor owed outside the legislature, called in later; A grudge from politics that votes, endorsements and the party act on.

**Real lives.**

- Chris Christie: He endorsed Trump weeks after quitting the 2016 race and led his transition until he was replaced after the bridge convictions. (https://en.wikipedia.org/wiki/Chris_Christie)
- John Kerry: In January 2008 he endorsed Barack Obama while his 2004 running mate, John Edwards, was still in the race. (https://en.wikipedia.org/wiki/John_Kerry)
- Arlen Specter: After losing the 2010 primary he called the winner, Joe Sestak, and endorsed him; Sestak lost in November. (https://en.wikipedia.org/wiki/2010_United_States_Senate_election_in_Pennsylvania)
- Mike Pence: After quitting the 2024 race he declined to endorse the man he had served as vice president. (https://en.wikipedia.org/wiki/Mike_Pence_2024_presidential_campaign)

### C37. They say you are not who you claim

Bank 3 · attacks

**Also plays in.** The campaign.

**Moment.** {attack group} says your proudest record is false, or that you are not really from {the place}.

**Roles.** `{attack group}`: a group or paper on record attacking your past or where you live, said with who funds it. `{sibling}`: a brother or sister on record.

**Setting.** Where the attack lands: the morning paper, an ad between programs, your own volunteers asking.

**Choices.** Answer fast with your records; let people from your past answer for you; ignore it; drop out.

**If no.** Not answering writes that the charge stood. You say later that not answering cost you.

**Gates (yes or no).** You are running. {attack group} attacks your past or your residence on record.

**Weights (amounts only).** The money behind it. How much of your record is public. How long you have lived in {the place}.

**Branches.**

- _By record, when you post your records:_ The attack still works, and its name becomes a word for that kind of attack.
- _By record, when you moved here recently:_ The local paper calls you an outsider for weeks, and you lose.
- _By household, when your family is drawn in:_ A public fight with {sibling} over your stand, and you quit the race citing family.

**Unlocks.** C46 (The comeback); press-interview (kind).  
**Extends.** B14 (Your past comes out); B11 (Where were you); B12 (Not one of us).  
**Merges with.** B11 (Where were you); B12 (Not one of us); B14 (Your past comes out).

**Needs.** Your past found and used against you.

**Real lives.**

- John Kerry: In his first race, for the House in 1972, a local paper called him un-American for weeks, and he lost. In 2004 a group of Swift boat veterans spent millions on ads disputing his war record. (https://en.wikipedia.org/wiki/John_Kerry, https://en.wikipedia.org/wiki/Swift_Vets_and_POWs_for_Truth)
- Liz Cheney: Running for the Senate in Wyoming in 2013, she was seen as a carpetbagger, fought publicly with her sister over same-sex marriage, and quit in January 2014 citing family health. (https://en.wikipedia.org/wiki/Liz_Cheney)

### C38. The promise and the bill on your desk

Bank 3 · a promise

**Also plays in.** Governing; The first term.

**Moment.** {the bill} on your desk breaks a promise you made in public, and its backers have the votes.

**Roles.** `{the bill}`: a bill on record that would break your promise. `{the promise}`: a public promise of yours on record.

**Setting.** Your desk, with the bill on it and the clock running.

**Choices.** Sign it and explain; veto it; keep {the promise}, even if it costs you the office; ask {the body} to wait.

**If no.** Not acting lets it become law without you, and both sides quote {the promise}.

**Gates (yes or no).** You hold an office. {the promise} is on record, and {the bill} would break it.

**Weights (amounts only).** How public the promise was. How much your backers want the bill. How close your next race is.

**Branches.**

- _By record, when you sign it:_ A fact-checker calls it a full reversal, and the groups who believed you sue.
- _By record, when the promise was to leave:_ You leave a safe seat because you said you would, and the move sets up your next race.
- _By record, when it is your last weeks:_ You sign limits you opposed when you were the newcomer (C43).

**Unlocks.** C43 (The last weeks in office); C31 (The recall against you); press-interview (kind).  
**Extends.** B50 (The promise on day one); K5 (catalog: Answer for a vote you once cast).  
**Merges with.** B50 (The promise on day one); C07 (Taking on the public workers); C02 (The law you signed, and the backlash).

**Opened by.** C01 (Your own party overrides you); C02 (The law you signed, and the backlash).

**Needs.** A public promise kept or broken by a later act.

**Real lives.**

- Scott Walker: He said a right-to-work law would not reach his desk, repeated it in 2014, then signed one in 2015. (https://en.wikipedia.org/wiki/Scott_Walker_(politician))
- Chris Christie: He promised police and firefighters no pension changes, then signed changes in 2010, and their unions sued. (https://en.wikipedia.org/wiki/Chris_Christie)
- Mark Sanford: He left the House in 2000 to keep his promise to serve only three terms, then ran for governor. (https://en.wikipedia.org/wiki/Mark_Sanford)

## Losing and leaving (6)

Refusing a loss, losing at home, stepping aside, resigning, the last weeks, a post that falls through.

### C39. You lost, and you won't accept it

Bank 3 · the loss

**Also plays in.** Election night; Running again.

**Moment.** The count is in and you lost, and {adviser} says there is a way to fight on.

**Roles.** `{adviser}`: a lawyer or campaign hand urging you on, said with the role.

**Setting.** Where you wait out the night and the days after: the campaign's rooms, home.

**Choices.** Concede the next day; contest it in court; claim fraud; run on another line; wait for a recount.

**If no.** Saying nothing for days writes that you would not concede, and the winner's people remember.

**Gates (yes or no).** You lost a race on record.

**Weights (amounts only).** How close it was. How strong your base is. Traits that cannot lose.

**Branches.**

- _By record, when you claim fraud without proof:_ Dozens of courts reject the suits, and the claims lead somewhere worse (C26).
- _By record, when you lost your party's primary:_ You say you will not let the result stand, run on your own line, and win in the fall with the other party's voters.
- _By record, when there were long lines and broken machines:_ You concede anyway rather than fight, and your backers argue for years over whether you should have.

**Unlocks.** C26 (Asked to change the count); C46 (The comeback); C47 (Crossing over); race-lost (kind).  
**Extends.** B34 (The concession call); K8 (catalog: The count is close).  
**Merges with.** B33 (Write me in); B34 (The concession call); B32 (The long count); C26 (Asked to change the count).

**Opened by.** C23 (The case against you); C26 (Asked to change the count); C27 (They move to impeach you); C28 (A challenger from your own side); C30 (Change your party).

**Needs.** Officials who certify a result, and pressure on them to change it.

**Real lives.**

- Donald Trump: After losing in 2020 he claimed fraud without evidence and pressed officials to overturn the result; courts rejected the suits. (https://en.wikipedia.org/wiki/Donald_Trump)
- Joe Lieberman: After losing the 2006 primary he said he would not let the result stand, ran as an independent, and won with most Republican voters behind him. (https://en.wikipedia.org/wiki/Joe_Lieberman)
- John Kerry: Despite long lines and machine trouble in Ohio in 2004, he conceded the next day. (https://en.wikipedia.org/wiki/John_Kerry)

### C40. The leader who forgot home

Bank 3 · home

**Also plays in.** Running again.

**Moment.** Your post in {the body} keeps you away, and {reporter} writes that {the place} feels used.

**Roles.** `{other-party leader}`: the other party's leader in {the body}, said with the post. `{old opponent's aide}`: someone who worked for the person you once beat, now running against you.

**Setting.** Wherever you go home to: an event in the district, a diner, a county fair.

**Choices.** Come home and campaign on your post; campaign on what you brought home; play down the post; say you will not run for anything higher.

**If no.** Saying nothing writes that you stayed in the capital, and the opponent says so.

**Gates (yes or no).** You lead your party in {the body} or hold a high post in it. A race against you at home is on record.

**Weights (amounts only).** Time spent away. The national fights you lead. How the place voted at the top of the ticket.

**Branches.**

- _By record, when {other-party leader} campaigns against you at home:_ They break the custom that leaders leave each other's seats alone, and you lose by a few thousand votes.
- _By record, when you flirted with a run for higher office:_ Voters felt used, and the flirtation is the opponent's line.
- _By record, when {old opponent's aide} is the one running:_ The one you beat years ago is avenged by his old aide.

**Unlocks.** C45 (The work between races); C42 (Leaving before the term ends); race-lost (kind).  
**Extends.** L6 (catalog: Your absences used against you); town-hall-question (kind).  
**Merges with.** C28 (A challenger from your own side); B11 (Where were you); A39 (Be there that night).

**Needs.** A grudge from politics that votes, endorsements and the party act on; Word spreads from the people who saw it.

**Real lives.**

- Tom Daschle: The Senate's Democratic leader lost his seat in 2004 by about 4,500 votes to John Thune, a former aide to the senator Daschle had beaten. The Republican leader broke custom to campaign against him, and voters felt used by his weighing of a presidential run. (https://en.wikipedia.org/wiki/Tom_Daschle, https://en.wikipedia.org/wiki/2004_United_States_Senate_election_in_South_Dakota)
- Eric Cantor: Before his 2014 primary loss, constituents told the local paper the majority leader took them for granted. (https://en.wikipedia.org/wiki/Eric_Cantor)

### C41. Run again or step aside

Bank 3 · stepping aside

**Also plays in.** Running again.

**Moment.** Your numbers are low, the next race is a year off, and {close tie} asks whether you want another term.

**Roles.** `{close tie}`: your partner, a sibling or an old friend on record. `{chosen successor}`: someone you could back for the seat, said with the post.

**Setting.** Where you would talk it over: home, a long drive, a quiet dinner.

**Choices.** Run again; announce you will not run, and govern; retire and back {chosen successor}; leave for another job.

**If no.** Waiting writes that you kept everyone guessing, and rivals start raising money.

**Gates (yes or no).** You hold an office and could run again.

**Weights (amounts only).** Your approval. Age and health. What you still want to do. Who would replace you.

**Branches.**

- _By record, when you announce early:_ You spend the rest of the term governing, and the rival you beat years ago takes the office after you.
- _By record, when a poll says few think you deserve another term:_ You retire, and your farewell speech is the last record of your time.
- _By record, when you back {chosen successor}:_ {chosen successor} loses, and the seat goes to the other party.

**Unlocks.** C43 (The last weeks in office); C45 (The work between races); last-day (kind).  
**Extends.** last-day (kind); office-doubt (kind).  
**Merges with.** C33 (Your seat or the bigger race); C24 (Sick in office); A37 (The seat and the funeral).

**Opened by.** C02 (The law you signed, and the backlash); C17 (The disaster bigger than your government); C24 (Sick in office); C33 (Your seat or the bigger race).

**Needs.** Approval that the economy and events move.

**Real lives.**

- Kathleen Blanco: With her popularity down after Hurricane Katrina, she announced in 2007 that she would not seek re-election as Louisiana governor. Bobby Jindal, whom she had beaten in 2003, succeeded her. (https://en.wikipedia.org/wiki/Kathleen_Blanco)
- Joe Lieberman: With polls showing few voters thought he deserved re-election, he announced his retirement in 2011. (https://en.wikipedia.org/wiki/Joe_Lieberman)
- John Edwards: He did not seek a second Senate term and backed a successor who lost the seat. (https://en.wikipedia.org/wiki/John_Edwards)

### C42. Leaving before the term ends

Bank 3 · resigning

**Also plays in.** Governing.

**Moment.** You will not serve out your term, and when and how you leave decides who comes next.

**Roles.** `{friend in the body}`: a member close to you, said with the seat.

**Setting (fixed).** the floor of {the body} or the office where resignations are filed, because leaving has its form.

**Choices.** Resign now; serve to the end; resign on a date that helps whoever follows; resign in person on the floor.

**If no.** Staying writes that you kept the seat, and the place waits on your health or your plans.

**Gates (yes or no).** You hold a seat. A reason to leave is on record: your health, a lost primary, an appointment.

**Weights (amounts only).** Months left in the term. Who could replace you. Your health.

**Branches.**

- _By record, when you resign to recover:_ {friend in the body} reads your letter, and your wounded staffer wins your seat.
- _By record, when you lost your primary:_ You quit your party post and then the seat, early, and a job outside office comes within weeks (C45).
- _By record, when you leave for a cabinet post:_ {the body} confirms you by a wide margin, and your seat is filled by appointment and then a special election (C06).

**Unlocks.** C06 (When the empty seat's vote is held); C45 (The work between races); C48 (The cause you carry out); last-day (kind).  
**Extends.** M7 (catalog: The resigned colleague); K7 (catalog: A death opens a seat).  
**Merges with.** C06 (When the empty seat's vote is held); C20 (An attack aimed at you); A38 (The paid post or the seat).

**Opened by.** C06 (When the empty seat's vote is held); C20 (An attack aimed at you); C24 (Sick in office); C28 (A challenger from your own side); C40 (The leader who forgot home).

**Real lives.**

- Gabby Giffords: A year after she was shot, she resigned in January 2012 to focus on recovery; a friend read her letter on the House floor, and her wounded staffer Ron Barber later won the seat. (https://en.wikipedia.org/wiki/Gabby_Giffords, https://en.wikipedia.org/wiki/2011_Tucson_shooting)
- Eric Cantor: After losing his 2014 primary he quit as majority leader, then resigned his seat early and took a job at an investment bank within weeks. (https://en.wikipedia.org/wiki/Eric_Cantor)
- John Kerry: Confirmed as secretary of state 94 to 3 in 2013, he resigned from the Senate. (https://en.wikipedia.org/wiki/John_Kerry)

### C43. The last weeks in office

Bank 3 · the handover

**Also plays in.** Governing.

**Moment.** You have lost, and the weeks before {successor} takes over are still yours.

**Roles.** `{successor}`: whoever won the office, said with party.

**Setting.** Your office in its last weeks, boxes half packed.

**Choices.** Sign laws that limit {successor}; help with the handover; close out the emergencies you declared; pardon or appoint your own people.

**If no.** Doing nothing writes a quiet handover.

**Gates (yes or no).** You hold an office and have lost it, been recalled or reached its term limit. The handover date is on the calendar.

**Weights (amounts only).** How bitter the race was. Your party's hold on {the body}. Emergencies still open.

**Branches.**

- _By record, when you sign limits on {successor}:_ The body your party holds passes them. You opposed the same thing when you were the newcomer, and courts and voters weigh in.
- _By record, when you close the emergency and offer help:_ Your last act ends the crisis you were blamed for, and your successor's first act undoes your fee (B50).
- _By record, when you were recalled:_ The handover comes in weeks, not months.

**Unlocks.** C45 (The work between races); C46 (The comeback); last-day (kind).  
**Extends.** last-day (kind).  
**Merges with.** B50 (The promise on day one); B51 (The order on the first day); C38 (The promise and the bill on your desk).

**Opened by.** C19 (The deal to end it now); C31 (The recall against you); C38 (The promise and the bill on your desk); C41 (Run again or step aside).

**Needs.** Acts in the weeks between losing and the handover.

**Real lives.**

- Scott Walker: After losing re-election in 2018 he signed laws passed in a lame-duck session that stripped powers from the incoming Democratic governor. (https://en.wikipedia.org/wiki/Scott_Walker_(politician))
- Gray Davis: Recalled in 2003, he conceded, offered to help with the transition, and formally ended the energy emergency days before leaving. (https://en.wikipedia.org/wiki/Gray_Davis)

### C44. The post that falls through

Bank 3 · a post

**Also plays in.** After office; The morning after.

**Moment.** {winner} names you for {the post}, and then {the problem} comes out.

**Roles.** `{the post}`: an appointed office or a transition job on record. `{the problem}`: unpaid taxes, a scandal near you, or a client of yours.

**Setting.** Where it falls apart: a confirmation hearing, a call from {winner}'s people.

**Choices.** Withdraw to spare {winner}; fight for the post; pay up and explain; ask {winner} to decide.

**If no.** Waiting writes that you let {winner} carry it, and they decide for you.

**Gates (yes or no).** You are offered or named to {the post} on record. {the problem} is on your record.

**Weights (amounts only).** How big the problem is. How much {winner} needs you.

**Branches.**

- _By record, when the problem is unpaid taxes:_ You pay what you owe and withdraw, saying you will not be a distraction.
- _By record, when your old aides are convicted:_ You are dropped from the post, and your allies with you.
- _By record, when the one appointing is your firm's client:_ You withdraw within a week.

**Unlocks.** C45 (The work between races); C49 (Break with the one you served).  
**Extends.** appointment (kind); serve-sought (kind).  
**Merges with.** C12 (The one investigating you answers to you); C36 (Endorse the one who beat you); B38 (The bills after the race).

**Opened by.** C12 (The one investigating you answers to you); C21 (Your people did it in your name); C34 (Choose a running mate); C36 (Endorse the one who beat you); C45 (The work between races).

**Needs.** Your past found and used against you.

**Real lives.**

- Tom Daschle: Named health secretary by President-elect Obama, he withdrew in February 2009 over unpaid taxes, saying he did not want to be a distraction. (https://en.wikipedia.org/wiki/Tom_Daschle)
- Chris Christie: He was dropped as head of Trump's transition after the 2016 bridge convictions, and his allies were removed. (https://en.wikipedia.org/wiki/Chris_Christie)
- Joe Lieberman: Interviewed for FBI director in 2017, he withdrew within the week; his firm had Trump as a client. (https://en.wikipedia.org/wiki/Joe_Lieberman)

## After office (5)

The work between races, the comeback, crossing over, a cause carried out, and old allies who become rivals.

### C45. The work between races

Bank 3 · work

**Also plays in.** The morning after; Not in office.

**Moment.** You lost or left, and {offerer} offers you {the job}.

**Roles.** `{offerer}`: whoever offers the job, said with what they run; it can be an old rival. `{the job}`: a radio or television show, a law or lobbying firm, a bank, a prosecutor's post.

**Setting.** Where the offer comes: a lunch, a call, the offerer's office.

**Choices.** Take the show; take the firm; go back to your old trade; teach; start a group of your own.

**If no.** Turning everything down writes that you stepped away, and your name fades.

**Gates (yes or no).** You lost or left an office on record. An offer of {the job} is on record.

**Weights (amounts only).** The money. How visible it keeps you. Rules on lobbying for former officials.

**Branches.**

- _By record, when you take a show:_ You become a voice across the place, and the contract ends the day you file again.
- _By record, when an old rival recruits you to a firm:_ The pay and the perks become the problem when you are named to a post (C44).
- _By record, when you go back to your old trade:_ You become a prosecutor and wait for your boss's job to open.
- _By record, when you take a bank job within weeks:_ Reporters call it the revolving door.

**Unlocks.** C46 (The comeback); C44 (The post that falls through); job-offer (kind).  
**Extends.** job-offer (kind).  
**Merges with.** B40 (Run again); A35 (The loss that makes friends); C46 (The comeback).

**Opened by.** C40 (The leader who forgot home); C41 (Run again or step aside); C42 (Leaving before the term ends); C43 (The last weeks in office); C44 (The post that falls through).

**Needs.** Jobs offered to people who left office: shows, firms, banks.

**Real lives.**

- Mike Pence: After losing two House races he hosted a statewide radio show, calling himself a decaf version of a famous host, and quit it to run for an open seat in 2000. (https://en.wikipedia.org/wiki/Mike_Pence)
- Tom Daschle: After losing his seat, he was recruited to a law and lobbying firm by Bob Dole, the former Republican Senate leader. (https://en.wikipedia.org/wiki/Tom_Daschle)
- Eric Cantor: Weeks after resigning in 2014 he became vice chairman of an investment bank. (https://en.wikipedia.org/wiki/Eric_Cantor)
- Liz Cheney: Fox News ended her contributor contract in 2013 after she began her Senate run. (https://en.wikipedia.org/wiki/Liz_Cheney)
- John Kerry: After losing his first race in 1972 he went to law school and became a prosecutor. (https://en.wikipedia.org/wiki/John_Kerry)

### C46. The comeback

Bank 3 · the comeback

**Also plays in.** Running again.

**Moment.** Years after your fall, {open seat} or your old office is on the ballot, and you can file.

**Roles.** `{ex-partner}`: a former spouse or partner on record.

**Setting.** Where you would announce it: a crowd of old supporters, a quiet filing at the clerk's counter.

**Choices.** Run on the fall and what you learned; run as if nothing happened; back someone else; stay out.

**If no.** Staying out writes that you are done, and old supporters move on.

**Gates (yes or no).** You lost, left or resigned an office on record. An office you could hold is on the ballot.

**Weights (amounts only).** Years since the fall. How it is remembered. How well known you still are. Money.

**Branches.**

- _By record, when you run for your old seat after a scandal:_ Your party's campaign committee pulls its support after {ex-partner} files a complaint, and you win anyway.
- _By record, when you lost the top office and run again:_ Twice impeached and convicted, you win the office back.
- _By record, when you lost twice and apologized:_ You publish an apology for your negative ads, and years later you win an open seat.
- _By record, when you lost three races in a row:_ You win by a small margin when the incumbent retires.

**Unlocks.** C28 (A challenger from your own side); C29 (The leader's word in your primary); filing (kind).  
**Extends.** B40 (Run again); O3 (catalog: Losing and then repairing).  
**Merges with.** B40 (Run again); A35 (The loss that makes friends); C45 (The work between races).

**Opened by.** C22 (The secret comes out); C23 (The case against you); C27 (They move to impeach you); C37 (They say you are not who you claim); C39 (You lost, and you won't accept it); C43 (The last weeks in office); C45 (The work between races).

**Needs.** Your past found and used against you; Word spreads from the people who saw it.

**Real lives.**

- Mark Sanford: In 2013 he won back his old House seat in a special election; the party's campaign committee pulled support after his ex-wife filed a trespass complaint. (https://en.wikipedia.org/wiki/Mark_Sanford)
- Donald Trump: After losing in 2020, two impeachments and a conviction, he won the presidency again in 2024. (https://en.wikipedia.org/wiki/Donald_Trump)
- Mike Pence: After losing House races in 1988 and 1990 he published an apology for his negative ads, and won an open seat in 2000. (https://en.wikipedia.org/wiki/Mike_Pence)
- Arlen Specter: After losing races for district attorney, senator and governor in the 1970s, he won a Senate seat narrowly in 1980 when the incumbent retired. (https://en.wikipedia.org/wiki/Arlen_Specter)

### C47. Crossing over

Bank 3 · across the line

**Also plays in.** Governing; Running again.

**Moment.** {other-party candidate} asks for your endorsement against your own party's nominee.

**Roles.** `{other-party candidate}`: the other party's nominee in a race, said with the office. `{parent}`: your father or mother, a former officeholder of your party, on record.

**Setting.** Where the ask would come: a private call, a stage you could share.

**Choices.** Endorse across party; speak at their convention; stay silent; endorse your own party's nominee.

**If no.** Silence writes that you sat it out, and both parties read it their own way.

**Gates (yes or no).** You hold or held an office. A race on record between your party's nominee and {other-party candidate}.

**Weights (amounts only).** How far your party's nominee is from your views. Your ties to each. How your old voters feel.

**Branches.**

- _By record, when you speak at the other party's convention:_ You were nearly picked for their ticket, and your caucus votes on your chair (C15).
- _By record, when you endorse across party for the first time:_ Two days later {parent} does the same.
- _By record, when you are asked to join the other party's caucus:_ You stay where you are, and both sides count you.

**Unlocks.** C15 (Your caucus votes on you); C48 (The cause you carry out).  
**Extends.** speech-afterward (kind); O3 (catalog: Losing and then repairing).  
**Merges with.** B06 (The party leaves its own nominee); C49 (Break with the one you served); C15 (Your caucus votes on you).

**Opened by.** C15 (Your caucus votes on you); C29 (The leader's word in your primary); C39 (You lost, and you won't accept it); C48 (The cause you carry out); C49 (Break with the one you served).

**Needs.** A grudge from politics that votes, endorsements and the party act on; Backers who turn on you, groups that split.

**Real lives.**

- Joe Lieberman: In 2008 he endorsed the Republican nominee, John McCain, and spoke at the Republican convention; he was reportedly McCain's first choice for running mate. Mitch McConnell asked him to caucus with Republicans. (https://en.wikipedia.org/wiki/Joe_Lieberman)
- Liz Cheney: After losing her seat she endorsed a Democrat in 2022 and Kamala Harris in 2024; two days later her father, the former vice president, did too. (https://en.wikipedia.org/wiki/Liz_Cheney)

### C48. The cause you carry out

Bank 3 · a cause

**Also plays in.** Losing and leaving.

**Moment.** Out of office, {the cause} still has your name on it, and {cause group} asks you to lead it.

**Roles.** `{the cause}`: a public question on record tied to your term or to what happened to you. `{cause group}`: a group on record pushing {the cause}.

**Setting.** Where the group would meet you: your home, its office, a hearing room.

**Choices.** Start a group of your own; testify before {the body}; take an envoy post for the cause; let {close tie} carry it.

**If no.** Turning it down writes that you stepped back, and the group finds another face.

**Gates (yes or no).** You left an office on record. {the cause} is on record and tied to your term or to something that happened to you.

**Weights (amounts only).** How public your story is. Money. Your health.

**Branches.**

- _By record, when you testify, haltingly:_ Your appearance moves the body more than the bill does.
- _By household, when {close tie} runs for office:_ {close tie} runs for a seat on the cause, and wins (A16).
- _By record, when you take an envoy post:_ You negotiate with a rival power on the cause, and a leak about you starts calls for an inquiry.
- _By record, when you start a committee against your old party's people:_ You endorse across party (C47).

**Unlocks.** C47 (Crossing over); A16 (Someone close to you runs); cause-invite (kind).  
**Extends.** A11 (A relative takes up a cause); cause-invite (kind).  
**Merges with.** A11 (A relative takes up a cause); A16 (Someone close to you runs); C20 (An attack aimed at you).

**Opened by.** C10 (Meeting the government yours shuns); C20 (An attack aimed at you); C29 (The leader's word in your primary); C42 (Leaving before the term ends); C47 (Crossing over).

**Real lives.**

- Gabby Giffords: After leaving Congress she and her husband founded a gun-safety group in 2013, and she testified at a Senate hearing. Her husband won a U.S. Senate seat in 2020. (https://en.wikipedia.org/wiki/Gabby_Giffords)
- John Kerry: He became the president's climate envoy in 2021 and negotiated a joint climate declaration with China; a leaked tape later led senators to ask for an inquiry. (https://en.wikipedia.org/wiki/John_Kerry)
- Liz Cheney: After her 2022 loss she formed a political action committee, which ran ads urging her own party's primary voters not to back Trump. (https://en.wikipedia.org/wiki/Liz_Cheney)

### C49. Break with the one you served

Bank 3 · old allies

**Also plays in.** Governing; Running again.

**Moment.** {former principal}, whom you served or backed for years, does something you will not defend, and the cameras wait for you.

**Roles.** `{former principal}`: an officeholder you served under or loudly backed on record, said with the office.

**Setting.** Where you would be asked: a television interview, a speech, a book.

**Choices.** Break in public; break in private; stay quiet; defend them.

**If no.** Staying quiet writes that you said nothing, and both sides take it as a side.

**Gates (yes or no).** You served under or backed {former principal} on record. {former principal} did something on record you oppose.

**Weights (amounts only).** Years of loyalty. What you owe them. How popular they are with your party.

**Branches.**

- _By record, when you break and then run against them:_ You are the first deputy in generations to run against the one you served, and you raise little.
- _By record, when you helped them prepare, then broke:_ They say your old scandal should be looked at again.
- _By record, when you voted with them nearly every time:_ After the break, your party treats those years of votes as nothing (C15).

**Unlocks.** C35 (The long shot for the top); C47 (Crossing over); C15 (Your caucus votes on you).  
**Extends.** O4 (catalog: The old comrade's letter); argument (kind).  
**Merges with.** C26 (Asked to change the count); C47 (Crossing over); A41 (Your deputy files against you).

**Opened by.** C09 (Running for a leadership post); C15 (Your caucus votes on you); C26 (Asked to change the count); C34 (Choose a running mate); C35 (The long shot for the top); C36 (Endorse the one who beat you); C44 (The post that falls through).

**Needs.** A grudge from politics that votes, endorsements and the party act on; Backers who turn on you, groups that split.

**Real lives.**

- Mike Pence: After January 6, 2021, he broke with the president he had served, ran against him in 2024, and declined to endorse him. (https://en.wikipedia.org/wiki/Mike_Pence, https://en.wikipedia.org/wiki/Mike_Pence_2024_presidential_campaign)
- Chris Christie: He helped Trump prepare for a 2020 debate, then broke with him over the 2020 result and ran against him in 2023. (https://en.wikipedia.org/wiki/Chris_Christie)
- Liz Cheney: She voted with Trump about 93 percent of the time, then broke with him after the Capitol attack. (https://en.wikipedia.org/wiki/Liz_Cheney)
