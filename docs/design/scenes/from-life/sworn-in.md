# Episode: taking the oath of office (council and mayor, then the speech)

Slug `sworn-in`. Season: holding office, day one. Types: `swearing-in`. Calibration only: nothing here ships as player text; no real name or quoted line is in any bank.

## Sources read (for calibration)

Opened in full (fetched and read):

1. Alamance News, a North Carolina town's swearing-in (https://alamancenews.com/graham-swears-in-new-mayor-new-councilman-and-reelected-councilman/). Four people sworn in at one council meeting, each by someone different: an attorney who had been the county's clerk of court (the mayor), a district court judge (a reelected member), the outgoing state legislator (a new member), the city clerk (the mayor pro tem). A family member held the book for each; the mayor's husband held it with their toddler beside him. Standing room only. Members of other towns' councils and school boards came. One member, recovering from surgery, was sworn in from the floor on a scooter. The article reports no remarks by the mayor.
2. City of Hoboken, New Jersey, news release on a mayor's second swearing-in and three council members (https://hobokennj.gov/news/mayor-bhalla-and-councilmembers-doyle-jabbour-and-quintero-sworn-into-office). The city clerk gave the oaths because city statute says so. On the steps of City Hall, limited to family during the pandemic. The mayor took the oath on a Sikh scripture, called it the honor of a lifetime, and said he looked forward to the term. The council members thanked residents and the clerk.

Search summaries only (page not opened): Seattle council's 2014 ceremony pictures page (a poet read and the mayor was sworn in on a family heirloom); a Texas paper's report of a council taking seats; Geneva, Illinois (a mayor starting his 25th year spoke of working with residents).

## Fact packet (what happens, in substance)

- **Who and why:** the one taking office; whoever gives the oath (a clerk where the charter or statute says so, a judge, a former clerk of court, the member they replace); family, one of whom holds the book; the body's other members; sometimes officials from nearby towns.
- **Trigger:** the count is certified and the term starts; the oath comes at the next meeting or on the steps.
- **The oath:** right hand up, a question, "I do." Some say more than the words ("honor of a lifetime"), some only the words.
- **The room:** family in front, colleagues on the dais or beside, press, residents.
- **The speech:** a mayor says a few words (thanks family and supporters, looks ahead); a council member mostly does not. A governor or a president gives an address.
- **Choice:** how to take it: plainly, with a promise, with thanks to the room, or by asking how it goes first. Then, for an executive office, what to say.
- **What changes after:** the person holds the office on the record, the officiant and the player have met, the journal says who swore them in, and (for an address) the people who heard it may be moved and may tell it at home.

## Ask the engine

| Packet line                                    | Record and type                                                                                                                                          | Status                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Count certified, term starts                   | `took-office:<seat>:<date>` written by `seatWinner`, `recordFill` or `seatTerm` in `src/core2/modules/offices.ts`, scored `directorElectionResultImpact` | exists, nothing fired on it (journal line only)                                |
| Someone gives the oath (clerk by statute)      | `filingClerkFor` (the clerk who took the filing), `localClerkFor` (the town's or county's clerk)                                                         | exists, now cast as the `oath-giver` fill                                      |
| Or the member they replace                     | the seat's term that ended the day the new one began                                                                                                     | exists, now cast                                                               |
| A judge or a justice                           | no courts or notaries in the world                                                                                                                       | no record: stopgap `SG-WORDS-swearing-in-no-court`                             |
| Family holds the book                          | the player's household                                                                                                                                   | exists, now cast as `family`                                                   |
| The body's other members, visitors from nearby | the government's other serving terms (`byJurisdiction`)                                                                                                  | exists, cast as `colleagues` (a few, smaller offices first); visitors not cast |
| A few words from the mayor                     | `speech.heard` through `deliverSpeech`                                                                                                                   | now written when the scene ends in an address; the world itself gives none     |
| The officiant is known after                   | `api.meet` on the scene's reply                                                                                                                          | now written                                                                    |

## Gaps

1. Courts: no judge or notary to give the oath (courts come after early access). Engine (justice, later).
2. The world's own mayors and governors give no inaugural: only the player's scene records one. Producer in the office-day engine, governing lead (stopgap `SG-WORDS-swearing-in-address-in-scene`).
3. The book held by a family member, and the scripture or heirloom it is: no record of what a person swears on. Not built; a scene detail, not a mechanic.
4. Visitors from other towns and bodies: no cast rule. Could read the press and party records; low priority.
5. The oath is said at the next meeting where a town's charter says so; the engine seats the winner the day of the count. The scene plays on the seating day.

## Lines the bank needs (substance only)

Speakers: the officiant (clerk, outgoing holder, or a presiding officer), the new officeholder.

- Officiant by trait: warm congratulates by name, calm confirms the office, blunt says they are sworn in and moves on, glad welcomes. Tie variants: acquainted greets by name, a stranger gives their own name.
- The player's four oath stances: a plain "I do," a pledge to keep it, thanks to the room, a question about how it goes (then the oath repeated a line at a time).
- The player's four address stances: say what they came to do, speak to those who did not vote for them, open the door, keep it short.
- The journal: who swore them in, and that they spoke.

## Other lives the same scene covers

- A county commissioner sworn in by the county clerk (the clerk route).
- A governor sworn in by someone who held the office or by the state's election office (the outgoing and clerk routes at the state level).
- A reelected member sworn in again (the officiant, the room and the journal line are the same; the repeat window keeps a second scene from staging within the month).
