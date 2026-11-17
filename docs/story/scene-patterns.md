# Scene patterns from real lives

Written Nov 16, 2026, for the owner and the Story thread. Bank 1 (46 patterns) rewrites the first scene bank as patterns. Bank 2 (55 patterns) is new research, from the campaign through the first days in office, drawing on 65 people not in bank 1. The machine-readable copy is scene-patterns.json beside this file; the page is the Scene Bank artifact.

## How a pattern works

- **A pattern is not a place.** It is a moment that can happen to many players in many worlds. Real lives show that the moment happens; every name, place, office and number in play comes from the world's own records.
- **Slots.** A word in braces, like `{powerful officeholder}`, is a role the director fills from whoever holds such a part in that world. A senator, a representative, a governor or a big-city mayor can all fill `{powerful officeholder}`. Each pattern lists its own roles; the common ones are in the slot list below.
- **The setting is a slot too.** It names how the two came to be talking, and the director picks the place from the situation. A setting marked **fixed** names a place only because the moment needs it: the oath, the count, the debate stage, a hospital bed.
- **Gates and weights.** Gates are yes-or-no facts on record, and a pattern plays only when they hold. Weights are amounts (how many ties, how close the race, how long in office). They make a pattern likelier and never gate it at a number.
- **Branches** are versions by trait, household or record. Each is a different thing that happens, not another wording.
- **Every pattern has an outcome.** The choices are different things to do, and "If no" says what a no writes to the record. A no can set up something later.
- **Strings.** *Unlocks* lists what this pattern's ending can open: its record is what the next pattern's gate reads. *Extends* names an existing scene kind or catalog class this pattern adds to. *Merges with* names patterns the director can blend with this one when both fit the same player at once. Ids: A = bank 1, B = bank 2, a plain kind name is a scene kind the game has today, a catalog code (K1, M4) is a row in the scene catalog, and "needed later" marks a kind the inventory has not built yet.
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
- *By record, when {the body} acts on it:* A member moves to fix it and it passes. You are known as the one who got it done, a fact the filing scenes read.
- *By record, when you keep coming back:* {presiding officer} knows your name before you reach the microphone, and {district member} becomes the incumbent you would face.
- *By record, when your job is covering {the body} for {outlet}:* You know the file better than the members, and speaking up puts your job's neutrality at stake.
- *By household, when {household member} came with you:* That night {household member} asks whether you mean to do something about it.

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
- *By record, when you worked the count:* You hear your own name read again and again, and the other counters look at you before {clerk} says a word.
- *By household, when you ask for a day:* {household member} reminds you that you swore off this kind of thing, or tells you to take it.
- *By record, when you meant to run and missed the deadline:* A friend offers to print stickers and postcards, and the write-in becomes your own campaign.

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
- *By household, when it is an older relative who is turned away:* She asks you to drive her to {clerk}'s office, and whether she votes depends on you.
- *By record, when you are the poll worker:* You must turn a neighbor away under the rule: follow it, offer the provisional ballot, or call {clerk}.
- *By record, when you tell a reporter:* Your employer brings it up at work the next day, and your job is at stake for speaking out.

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
- *By record, when the speech lands:* {candidate} finds you after and asks you to work on the campaign full time.
- *By record, when the speech falls flat:* The parts you pick do not fit the room. {candidate} thanks you politely, and {host} remembers you tried.
- *By trait, when you are shy:* {friend} volunteers you out loud. You can still decline, and {friend} brings it up later.

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
- *By record, when your business or job is failing:* The ask arrives with the debts on the counter, and the backing comes with a price you name or refuse.
- *By household, when they came for {household member} first:* {household member} turns them down and they turn to you. {household member} is stung at being passed over, or relieved, by their traits.
- *By record, when you live elsewhere:* Saying yes means moving home to meet the residency rule, and the talk at home is about the move as much as the race.
- *By record, when you were second choice:* Someone else was asked first. A rival brings it up later, and {recruiter} admits it if asked.
- *By record, when they want your answers first:* A sit-down with the committee follows, and each answer goes on your record as a stance.

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
- *By record, when you own the place:* Hosting the meetings costs you customers who back the other side, and the lost business shows up later.
- *By record, when you work for someone:* Your boss says no politics on the clock. Joining means meeting somewhere else, or risking the job.
- *By household, when {household member} helps:* {household member} offers to write the flyers and coach your speeches, which widens the speech parts you can pick.

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
- *By household, when a child of yours is in the schools and {officeholder} sits on the school board:* {neighbor} is another parent, met at pickup, and the fight is over what the board did to your child's school.
- *By record, when a seasoned campaigner offers money and know-how:* His price is a say in what the recall says, which changes who it answers to.
- *By record, when many families speak another language at home:* A neighbor offers to gather signatures in it, which reaches voters the campaign could not.
- *By record, when you work for the body {officeholder} sits on:* The recall is aimed at your employer, and {neighbor} wants you inside it.

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
- *By record, when the group must take a side:* Soon it has to back or oppose a ballot measure or a candidate, and as its leader you speak for it.
- *By record, when someone else is nominated too:* The vote is by hands, and the loser is someone you see every week.
- *By record, when only your own street backs you:* The tally shows where your support lives, which a later race reads.

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
- *By record, when you keep your job:* You campaign around your shifts, and customers start to recognize you.
- *By trait, when {close tie} meant it half as a joke:* They are stunned you are taking it seriously. Their help depends on how you tell them.
- *By record, when the group wants a pledge:* Signing its platform writes each stance to your record, and {incumbent} quotes it.

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
- *By record, when the job falls through:* The office loses your paperwork. {mentor} calls a second time, and the job comes with a debt you both carry.
- *By record, when you nearly quit later:* Under pressure in the job, you think about leaving, and {mentor} says you will regret it.

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
- *By record, when {the public act} is a long march:* Days on the road with them put you next to the cause group's organizers and in the papers, and both become ties and records.
- *By record, when their health turns bad:* A hospital two towns away calls, and you decide whether to end it.
- *By record, when years later they file for office:* They ask you to help, which opens the relative's race.

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
- *By record, when a fact on your record backs an attack:* The incumbent says you cannot be reached (an unlisted number, a second home), and you answer it at the first forum.
- *By record, when the party's line is empty:* The party's candidate just dropped out, and {party official} calls to ask you to fill the line before closing.

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
- *By household, when a well-off home:* Before you go, a parent says these are not your kind of people. Answering that you mean to help run things goes on your record as a stance.
- *By household, when a working home:* The scoff runs the other way: a relative says those people do not want anyone like you.
- *By record, when you keep coming:* After several meetings {old hand} asks you for coffee, the tie a later nomination reads.

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
- *By record, when the seat is held but idle:* Filing means a race for the smallest office on the ballot, and the holder's friends notice.
- *By record, when your first committee night:* Within weeks you vote on who fills a vacancy. The vote is on your record, and someone owes you or blames you.
- *By record, when you have no party:* Volunteers from each party ask you to register and file, and choosing writes your party.

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
- *By record, when you ask for a public job in return:* Where the place has a civil service law on record, {party official} cannot simply deliver, and says so, or offers to help with the test.
- *By record, when your first follower asks what he gets:* A cousin or friend who followed you first wants his share, and his tie depends on the answer.
- *By record, when a bidding war:* The rival faction offers more. Taking it makes an enemy of {party official}.
- *By record, when your club splits:* Half work the polls and half quit, and the ones who quit blame you.

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
- *By household, when {close tie} is your partner:* The talk is who covers the evenings and the money at home. Offering to be treasurer means you sign the reports, and a mistake on them is your record.
- *By household, when {close tie} is an older relative:* Their health and your time are the stakes. If they lose by a lot and are proud of it, election night plays from the manager's side.
- *By record, when they win:* They offer you a staff job, or you stand beside them on the stage and hear their promise with everyone else.
- *By record, when a fight over money:* They want a donation you think will hurt. Overruling them or giving in goes on both your records.
- *By record, when you were asked first:* If the party asked you first and you declined, it comes up again on election night.

**Unlocks.** A17 (The boss who hands you the work); A05 (The party asks you to run); race-won (kind); race-lost (kind); family-absence (kind).  
**Extends.** manager-offer (kind); family-filing (kind).  
**Merges with.** B02 (The manager you love).
  
**Opened by.** A04 (The speaker who never came); A05 (The party asks you to run); A11 (A relative takes up a cause).

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
- *By trait, when a careful boss:* {boss} finds out and tells you to stay in your lane. The tie drops and you are watched.
- *By record, when the rival calls:* {boss}'s likely opponent asks you to lunch. Going is a betrayal if anyone sees.
- *By record, when you keep a list:* A list of everyone you helped becomes a record your own race reads later.

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
- *By record, when you are removed:* It is in the paper next morning. You can run on being the underdog or say nothing.
- *By record, when a quiet deal:* {appointer} offers a better post after the election if you sit this one out, a promise on both records.
- *By record, when board business first:* {appointer} asks how you will vote on a permit they care about, and the answer shows what you will trade.

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
- *By record, when you testify first:* Before the offer you speak to the committee, one part at a time, and how it goes changes the offer.
- *By record, when your group splits:* If you take it, the hard-liners blame you; some leave, and one runs against you later.
- *By record, when seated next time:* If you held out, the next convention seats your group in full, and {powerful officeholder} has to greet you.

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
- *By record, when the voters say no:* Your name is on a losing measure, and rivals bring it up when you run.
- *By record, when it passes narrowly:* The changes it makes produce effects that come back as scenes.

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
- *By record, when you are told no in front of everyone:* The sharp answer is earned now, and the room watches what you do next.
- *By record, when the rival club takes you in:* {rival leader} gives you real work, a tie that matters when that seat opens.
- *By record, when two others stand with you:* The leader gives in, or the three of you leave together.

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
- *By record, when you know someone:* The name opens the door, and you owe the name.
- *By record, when you go to the reform side:* The faction tie is the start of your career.

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
- *By record, when the tie is weaker:* She says she voted for the other candidate because they came to her door.
- *By household, when a parent who once worked a precinct:* After a loss, they say you lost your own neighborhood, and your answer decides whether the next campaign starts at home.
- *By record, when you did knock on her door:* The scene does not play. She waves on her way in.

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
- *By record, when you confront him:* He says this is how it has always been done. What you saw earns the sharp reply, and he remembers it.
- *By record, when the reporter runs it:* The story runs on the front page, and the reporter becomes a tie the press scenes read.
- *By record, when the challenge goes to a judge:* Ballots turn up somewhere they should not be, and the ruling is a record the whole district reads.

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
- *By trait, when the leader takes it well:* He helps in the fall and expects to be remembered.
- *By trait, when the leader is bitter:* He sits out the general election and tells people you cannot be trusted.
- *By record, when you lose the vote:* {old hand} says there is always next year, and {party official} knows who you are now.

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
- *By household, when {patron} is your spouse:* They ask you to take the seat. The talk is about the marriage as much as the office, and it may come before a funeral.
- *By record, when the message comes through family:* A brother or sister brings the request, and you have to trust it is what {patron} wants.
- *By record, when the club holds back:* The committee says it is not sure you can win, and the reason comes from your record: age, how new you are, or who you are.
- *By record, when your own group carries you:* Its members knock doors for you, and they expect you to remember.
- *By record, when nobody files against you:* The other party fields no one in the special election, and you must win a full term months later.

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
- *By record, when the crowds come:* You win, and the first ask comes before you are sworn in.
- *By record, when {their rival} calls to warn you off:* Whatever you say goes on the record.
- *By record, when you speak first at the last stop:* The speech you build shows whether you are their candidate or your own.
- *By record, when the crowd is hostile to the visitor:* The visit becomes the story instead of the help.

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
- *By record, when you win on paper:* The board throws her off and you face no one. Some say you won on a technicality.
- *By record, when she calls you:* She asks you to drop the challenge, and the talk is about promises; both records are read.
- *By record, when years later:* You run against an entrenched member for a higher seat and lose badly; the people you knocked off the ballot do not help.

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
- *By record, when {incumbent} calls instead:* He reminds you of something he did for your family, which the record holds.
- *By record, when your backers object:* The group that recruited you says it will drop you if you take any deal.
- *By record, when you stay in and go where {incumbent} never goes:* A voter asks you to come back after the election, and that promise goes on the record.

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
- *By record, when your manager brings an attack ad on {friend}:* Run it, cut it down to what the record holds, or refuse it. A charge beyond the record is marked as a lie.
- *By record, when a runoff:* {friend} leads the first round, and the community's leaders pick sides.
- *By record, when after:* Whoever loses makes a cold concession call. Years later one of you reaches out.

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
- *By record, when at a door:* A resident who lives with {the problem} every day asks one thing: when it will be fixed. Your answer is a promise.
- *By record, when your old job was covering {the body}:* {incumbent} says you broke your outlet's trust, and your old editor calls.
- *By record, when you win:* {the problem} is your first bill, and later scenes read whether it got fixed.

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
- *By household, when {household member} speaks:* Their speech is built one part at a time, and how it goes changes how the town sees your household.
- *By record, when the reporter asks:* Whether you will be able to serve.
- *By record, when you win from the bed:* The victory plays at the bedside instead of on a stage.

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
- *By record, when two neighbors file too:* Your first doors are on streets where you know people.
- *By record, when the incumbent is drawn out:* They call to ask whether you will step aside so they can move in.
- *By record, when you win:* You arrive in a body that has never had anyone like you.

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
- *By record, when a banker friend offers to cover it:* Taking it clears the debt and makes a debt of another kind.
- *By household, when {household member} did not know:* They learn of it at the door, and the talk after is about trust.

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
- *By household, when {household member} wants to move for good:* What you decide changes the household's records.
- *By record, when the police:* They treat it as a prank or take it seriously, by the place's record, and either way it becomes a story.
- *By record, when coming back:* Weeks later the neighbors who helped meet you, and they are the first of your volunteers.

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
- *By record, when they doubted you as a rich outsider:* They say so first. Whether you answer it decides how hard they work.
- *By record, when they complain that politicians never knock:* They take you door to door on their own streets, which opens doors no list would.
- *By record, when you win:* They stay for years, a staff tie later scenes read.

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
- *By household, when a sibling with money and connections:* They pay for it and run it. The campaign is the family's, and the sibling's word carries.
- *By record, when their pay is on the reports:* A reporter asks why your partner is paid what they are.
- *By record, when {their past work} comes out:* A client, a foreign government or a lobby job on their record becomes {rival}'s line.
- *By record, when a money matter in your own family:* A family payment that should have gone back to a public program surfaces. Pay it back and call it an error, or fight it.

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
- *By record, when students and first-time voters pour in:* They want a say in the message, and how you answer keeps them or loses them.
- *By record, when the odd ad works:* The news plays it for free, and {rival} has to answer it.
- *By record, when the odd ad flops:* The press calls the campaign unserious.

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
- *By record, when you have lost before:* After several losses you run on handshakes and almost no money, and the papers notice.
- *By record, when no money at all:* In later races you spend almost nothing beyond the filing, and that becomes who you are.

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
- *By record, when your own paper:* It becomes a record of what you said that reporters can quote back.
- *By record, when the papers run your old words:* The attacks become a daily box of your own lines.

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
- *By record, when the organization backs the other party's candidate:* The attacks come from your own side, and the outside help they draw is real: money and volunteers from beyond the place.
- *By record, when you win anyway:* {party official} is an enemy you face in the next primary.
- *By record, when trouble at the polls in your strongest precincts:* A complaint, a lawyer and a watcher, as in the count that looks wrong.

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
- *By record, when the footage:* It can reach voters put off by the crowd. Using it writes an ad record and costs you the stop's voters for good.
- *By record, when your guest's people blame you:* They say you chose the stop, and the next visit is harder to get.

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
- *By record, when {rival} slights a well-known local figure:* That person backs you.
- *By record, when you are the one far ahead:* The days off and the remark are yours to take or not, and the record keeps where you were.

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
- *By record, when you lose:* The run-again question comes the morning after.
- *By record, when a film crew follows the campaign:* What they catch becomes a record later scenes read.

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
- *By record, when a storm moves the election:* A disaster on record pushes the dates back under the state's election law, and the trial now falls near the vote.
- *By household, when your own home was damaged:* You campaign from a damaged house, and voters see it.

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
- *By record, when the attendance record is good:* The ad overstates it and is marked as a lie. Anyone can find the true figure.
- *By record, when you are the target:* Answer with your record, ignore it, or hit back.

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
- *By record, when you were away serving:* The answer is the service, said once at a forum, and it ends the charge.
- *By record, when you were away at school, from money:* {rival} sets your school beside theirs, and it sticks unless you have something local to point to.
- *By record, when you lose on it:* You never let yourself be outdone on roots again, a stance later scenes read.

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
- *By record, when the symbol sticks:* It is yours for every race after, and the press asks about it.
- *By record, when it backfires:* People think you are mocking them.

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
- *By record, when a second document surfaces:* A letter in your own hand shows more than you said. A denial now is a caught lie.
- *By record, when you call it the worst mistake of your life:* The line goes on your record and follows you.

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
- *By record, when employers lean on their workers:* A big employer docks pay or presses staff to give to {rival}, and a worker tells you.
- *By record, when staged interviews:* Filmed voter interviews against you turn out to use actors, and exposing it is a press story.

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
- *By trait, when your voice breaks:* The press says you cried, or that it was melting snow, and the story becomes your composure.
- *By record, when the letter behind it was forged:* Later it comes out that a rival campaign planted it. The lie is theirs on the record.
- *By record, when you win by less than expected:* The margin reads as a loss.

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
- *By record, when it came from {rival}'s supporters:* {rival} disowns it or does not, and both are records.
- *By record, when it is false and vile:* Answering gives it air; not answering lets it spread.

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
- *By trait, when you want to hit him:* Your aide steers you out of the hall before you do anything.
- *By record, when watchers and listeners split:* People who listened think {rival} won; people who watched think you did.
- *By record, when the line makes you the underdog:* A supporter says {rival} made a rich candidate the underdog.

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
- *By record, when you are the one left out:* You stand at the edge of the stage, and leaving quietly or speaking up is the scene.
- *By record, when {rival} refuses to go on with the others:* {rival} looks small or principled, by the room.

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
- *By record, when your advisers warned you:* The warning is on record, and making it anyway is your choice.
- *By record, when you are the one who knew them:* Deliver the rebuke, or let it go.
- *By record, when you lose the exchange and win the race:* The line follows you anyway.

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
- *By record, when you were just ill:* You look pale under the lights, and people talk about how you looked more than what you said.
- *By record, when {rival} rested and practiced:* They look fresh, and the comparison is made for you.
- *By record, when who won is argued:* The papers argue for weeks about whether it mattered.

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
- *By record, when the voters are recruited off the street:* They are filmed apart from you, looking up as if at you, and a reporter can find out.
- *By record, when {rival} refuses:* Their reach falls behind yours.

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
- *By record, when the line plays on who you are:* It works where people already see you that way and costs you where they do not.
- *By record, when a symbol goes with it:* A hat, a color or a cap becomes yours.
- *By record, when {rival} mocks it:* The line becomes a target.

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
- *By record, when you lost last time:* The drive is your answer to the loss.
- *By record, when the coalition:* The groups that join expect their share after the win.

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
- *By record, when your old cause's network:* People you worked with before turn out and host you.
- *By household, when a sibling runs the schedule:* The family's ties set the stops.

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
- *By record, when many of your volunteers are parents:* Child care at the office changes who can come.
- *By record, when years later they run themselves:* They come back to ask for your endorsement.

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
- *By record, when you told reporters to follow you:* They did, and the remark is quoted back.
- *By record, when you withdraw and come back:* Months later you return, and the first question is the old one.

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
- *By record, when the state will not list your party:* You sue to get it listed.
- *By record, when a three-way race:* You win with a plurality, and the record says how few chose you.
- *By record, when reformers of both parties back a fusion ticket:* Each expects its share after the win.

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
- *By record, when you declared and you lose:* The claim is on record, the press replays it, and conceding weeks later reads worse.
- *By record, when you are behind early:* Concede now or wait; the late ballots may be yours.
- *By record, when the morning paper names the wrong winner:* An early edition called it for the loser, and holding it up is the morning's picture.

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
- *By record, when a one-vote lead first:* The recount puts you ahead by one; a court then counts a disputed ballot and it is tied.
- *By record, when control of the body rides on it:* The leaders of both parties call you.
- *By record, when the method:* {clerk} picks the game of chance, beads, dice or a coin, and both sides must accept it.
- *By record, when the final count changes it:* The official canvass after a coin toss shows one side ahead, and the toss means nothing.

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
- *By record, when you win at the end:* Months late, colleagues walk you in, and the oath is done twice so your family can stand with you.
- *By record, when you lose in court:* A concession after months reads differently from one on the night.

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
- *By record, when teaching the spelling:* The campaign's doors and ads are about how to write your name.
- *By record, when the count:* {rival}'s observers challenge each misspelled ballot, and the election official decides which count.
- *By record, when you win:* You are the first in years to win this way, and the party that dropped you has to deal with you.

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
- *By record, when the margin collapses after you called:* You call back and take it back, after the other side has begun to celebrate.
- *By record, when you call in private and speak in the morning:* The crowd goes home without you, and the next day's speech is the concession on record.
- *By record, when you are the winner taking the call:* Take the concession graciously, or snap when it is taken back.

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
- *By record, when the victory party was planned:* The fireworks bought for it are never set off, and the empty lawn is the picture.
- *By record, when what you say tonight:* It is the record {winner}'s people read when you next need them.

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
- *By record, when how it sounds on television:* A microphone catches your voice and not the crowd's, and the yell at the end replays for days.
- *By record, when you go on:* The next contest reads tonight.

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
- *By record, when your own town voted for you:* A neighbor says your town voted for you almost to a person, and it is the base of the next run.
- *By record, when nobody files against you:* You file for a different office next cycle and no one runs against you.
- *By household, when {household member} says one loss was enough:* Running again is a talk at home first.

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
- *By record, when sworn in at the bedside:* The oath plays at the hospital, in its real form, with the clerk and your family there.
- *By household, when {close tie} steps in:* They offer to move in and help raise the children, which changes the household.
- *By record, when you go home every night:* Later scenes read the travel: missed votes, and a rival who counts them.

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
- *By record, when it is false:* {campaign manager} recants under oath, calling it a story told to needle the other side. The lie is on their record.
- *By record, when something was said:* Staff told groups the campaign would be ahead if they stayed out. It is on record and can be found.
- *By record, when the insulted groups:* Their leaders demand an apology and ask you to meet.

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
- *By record, when you take a post that bars you from raising money:* A relative or ally has to raise it for you.
- *By record, when the consultant who lost:* They wait longest for their money, and they talk.

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
- *By record, when the coalition spans parties:* Each side expects jobs, and giving to one costs the other.
- *By record, when the voters you registered:* Their organizers want a seat at the table.

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
- *By record, when you have lost several times:* The next try comes as a special election, and the papers call you the one who never quits.
- *By record, when the incumbent who beat you retires:* The next run is against someone else.

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
- *By record, when the body rejects your picks:* {majority leader}'s bloc votes down your appointees and cuts {your aide}'s job. {your aide} asks whether you will fight for her.
- *By record, when a fired head sues:* The suit is a record for months, and reporters ask at every event.
- *By record, when the court rules:* A loss is in the paper, and {majority leader} is less willing to deal.
- *By record, when a full room:* Your supporters fill the next meeting. The majority gives a little or digs in with cameras rolling.
- *By record, when the one who recruited you calls:* The member who brought you into politics says this is not what they backed you for.

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
- *By record, when the hand:* You cannot raise the hand everyone is told to raise, so you raise the other, and the room goes quiet.
- *By record, when the book:* You ask for a book that means something to you. A member of the body tells voters he never would, and your answer is a record.
- *By record, when a senior figure jokes about you:* Laugh, answer or let it pass. That figure later steers your committee.

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
- *By record, when the grudge goes back to a race:* You backed someone else against him once, and the record says why.
- *By record, when {stranger} walks with you:* A tie, and a debt later votes read.

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
- *By record, when you sue:* The highest court rules unanimously that views cannot bar you, and you take the seat late.
- *By record, when the fact is true:* Your papers were never finished, and {the body} votes you out.
- *By record, when a whole delegation is challenged:* You are one of several, and {the body} votes on all at once.

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
- *By record, when your allies distance themselves:* The group that helped elect you says you set it back.
- *By record, when a colleague defends you:* A member from elsewhere stands up for you, a tie.
- *By record, when you are not alone:* Dozens of others vote with you.

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
- *By record, when the holdouts win rule changes:* One member can now force a vote to remove the leader, and {holdouts} get seats on the rules committee.
- *By record, when voting present lowers the bar:* Abstaining helps elect the leader without your name on it.

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
- *By record, when the old saying:* A member says the way to get along is to go along, and asks whether you will.
- *By record, when a back seat:* From high above the floor you learn who is who, a record of ties.

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
- *By record, when the slight is one chair for two:* You and {other newcomer} share a single chair at the table, and the room sees it.
- *By record, when {other newcomer} got the seat only because the leader stepped in:* You two are allies from here.
- *By record, when the chair loses power later:* Reforms take the gavel away, and your silent protest is remembered.

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
- *By record, when you walk out:* The bloc names the chairs, and years of deadlock follow.
- *By record, when a court or a special election changes the numbers:* The deadlock breaks.

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
- *By record, when the cuts are not enough:* The tax you said you would not raise is the only way left.
- *By record, when layoffs:* The people laid off are names in your place.
- *By record, when the old regime's people:* You push them out of the jobs they hold.

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
- *By record, when kept at once:* You sign the order minutes after the oath. The cost lands on the budget and on the places that relied on the money.
- *By record, when the police unit you ran against:* You disband it in your first weeks.
- *By record, when the numbers turn:* You veto budgets until the tax you promised against passes. Tens of thousands rally against you, and you may not run again.

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
- *By record, when members are surprised at its reach:* They line up against your first bill.
- *By record, when you leave one power alone:* Reformers say it is half done; members say you went too far.

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
- *By record, when a hole in the office rug:* You leave it, and members who come asking for favors see it.
- *By record, when you live on part of your pay:* You give the rest away, a public pledge on your record.

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
- *By record, when business and state leaders push back:* Lawsuits threaten, and the work sits idle.
- *By record, when the work resumes with a share:* Years later, the share of work those firms did is the record.

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
- *By record, when the leader is jailed:* A judge orders {the union}'s leaders arrested, and the strike hardens.
- *By record, when the deal:* Wages rise, and the state passes a law limiting public strikes.
- *By record, when you lecture:* The press says you talked down to them instead of bargaining.

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
- *By record, when {the disaster} is snow:* The plows fall behind, trains stop on some lines, and the snow sits for weeks.
- *By record, when you are the challenger:* The response is your campaign.
- *By record, when service skips some neighborhoods:* Those voters remember it at the primary.

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
- *By record, when the body turns over:* Years later the other side takes the majority and gives the post to one of its own.
- *By record, when a rival wants it too:* The vote splits, and you owe whoever breaks the tie.
- *By household, when {household member} asks:* Whether the steady pay is worth giving up the seat you worked for.

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
- *By record, when the family backed your opponent:* Helping them anyway is noticed on the street.
- *By record, when a law provides aid:* You can walk them through it, and its effects reach the household's own damage record.
- *By record, when a reporter is there:* What you do is in the paper whether or not you wanted it there.

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
- *By record, when you are an applicant:* You speak to {the body} for a few minutes, members question you, and the vote is the outcome.
- *By record, when a trade in the recess:* {member} offers a vote on something you want if you switch, a deal on both records.
- *By record, when the seat could have been yours:* If you turned down a seat that came to you, the one you passed over sits in the room.

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
- *By household, when a parent worked in the same office:* The older staff take sides by family as much as by work.
- *By record, when you lose and stay:* If the law keeps you in the post until the term ends, you serve for months beside the winner's people.
- *By record, when the party leaders:* They stay neutral or back {deputy}, a record you read at the next filing.

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
- *By record, when you are the first of your kind, or the youngest:* The room expects you to keep quiet, and a first floor speech changes that.
- *By record, when the presiding officer:* Months later you are asked to be vice-chair of the committee that draws districts.
- *By trait, when you are prepared:* You know their bill better than they do and say so politely. They respect it or resent it, by their traits.

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
- *By record, when underdogs:* The ticket is behind, and you work the small events the top of the ticket skips.
- *By record, when the office has little power:* If you win, {mentor} offers you a board to chair, with its own pressures.

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
- *By record, when a warning shot:* If you nearly lost your own primary, {ad maker} names it as the first sign you missed.
- *By record, when a friend's read:* A friend says people felt you stopped listening. Agreeing changes the ad.

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
- *By record, when {other-party member} wants the same program:* Writing the bill together goes on both records.
- *By record, when you ask to move:* The leader says you can if you help in the next leadership vote.
- *By record, when {community leader}'s idea becomes the bill:* Whether you credit them in public changes their tie.

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
- *By record, when you back the winner:* You get the committee you wanted, and the leader expects your vote on the first hard bill.
- *By record, when you back the loser:* Your committee stays where it was, and the winner's people do not forget.
- *By record, when a long shot asks:* Standing with a third candidate makes you a name in the body, for better or worse.

**Unlocks.** M3 (catalog: The leader's treatment); serve-sought (kind); vote-sought (kind).  
**Extends.** vote-asked (kind).  
**Merges with.** B45 (The vote that will not end).
  
**Opened by.** A45 (A committee that does not fit your district); B45 (The vote that will not end).

**Real lives.**
- Shirley Chisholm: She moved off the Agriculture Committee to Veterans' Affairs, and later Education and Labor, after voting for Hale Boggs for majority leader. (https://en.wikipedia.org/wiki/Shirley_Chisholm)
