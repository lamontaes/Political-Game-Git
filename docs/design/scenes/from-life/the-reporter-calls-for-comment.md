# Episode: the reporter calls for comment on a vote (phone or hallway, the day after the vote)

Slug `the-reporter-calls-for-comment`. Types: `press-interview`. Season: holding office. Calibration only: nothing here ships as player text; no real name or quoted line is in any bank. Written Oct 27, 2026 for the words lead.

## Sources read (for calibration)

Opened in full (text came back):

1. WSOC-TV, Charlotte, Sept. 13, 2021, a county commissioner and a possible proxy vote on a manager's bonus: "Scarborough did not return a request for comment on this story." and "Attempts by Channel 9 for months to get in contact ... have been unsuccessful." (https://www.wsoctv.com/news/local/county-attorney-looks-into-whether-someone-voted-behalf-commissioner-scarborough/KYDJQEODXJHCNPEAMJJE37M5RY). The non-answer is printed as a fact with the number of tries behind it.
2. Yahoo News, Polk County (Florida) commission on public notices, about Sept. 10, 2023: the chair is quoted giving the reason for the vote ("stay the course"), another commissioner says the outcome is "not what I wanted" (https://www.yahoo.com/news/polk-county-commission-votes-keep-091645802.html). Nobody declined; the quotes come from the dais. The vote itself is where the comment is taken.
3. Littleton, Colorado council orientation deck, Nov. 14, 2023, a city communications director who chairs the Colorado Municipal League information officers: "Never say, 'no comment'", "assume that nothing you say is 'off the record'", "Polls indicate that a 'no comment' response is almost the same as admitting guilt", bring a trusted colleague, set a time limit (https://www.littletonco.gov/files/sharedassets/public/v/1/city-council/documents-council/orientation-documents/city-council-orientation-11-14-2023-communications-ppt.pdf). Read as text from the saved PDF; the fetch tool could not read it.

Seen only as search summaries (not opened): 4. SPJ, "Anonymity" ethics paper (https://spj.org/ethics-papers-anonymity.asp): asks reporters to settle before the talk whether "off the record" means never usable or usable if confirmed elsewhere; a broken promise costs the outlet its credibility. The AP-style terms (on the record, background, off the record, agreed beforehand) came from a journalism-school guide summary, not the SPJ page. 5. Georgia weekly, Aug. 26, 2001 editorial (https://gahistoricnewspapers.galileo.usg.edu/lccn/sn84007709/2001-08-26/ed-1/seq-16): editors explain they tried repeatedly to reach a commissioner before an ethics story ran. 6. Iowa League of Cities and ICMA media-relations pages: build ties with editors; reporters work 24 hours a day (not opened).

## Fact packet (what happens, in substance)

- **Who:** a local reporter (daily, weekly, TV or a one-person site) and an official who cast or led a vote: council member, mayor, county commissioner.
- **Trigger on the record:** a vote or act with a name on it, public the day it happens. The reporter's story is already half written.
- **What the reporter wants:** the official's reason in one or two sentences, and a name on it. Often a second voice for balance, the loser of the vote.
- **When:** the evening of the vote, or the next morning before deadline. Hallway after the meeting, or a call or text to a cell phone.
- **What the reporter asks:** why did you vote that way; what does it cost or change for people here; will you change it; what do you say to those who opposed it.
- **The official's four options:** (1) answer on the record, name and all; (2) give a short written statement, or send the reporter to staff or the clerk; (3) go off the record or on background, which only works if agreed before the words are said; (4) decline or let the call ring.
- **Edge:** a "no comment" is printed as a flat fact and read as dodging. A lone off-the-record remark is not printed but sends the reporter to ask others.
- **Next day in print:** option 1 is a quote with the official's name and office, often the last paragraph of the vote story; option 2 is "said in a statement"; option 3 is a paraphrase with "a council member said" or nothing; option 4 is "did not return a call for comment", sometimes with "after several attempts".
- **What changes after:** readers hold the printed reason, not the vote alone. A declined call is remembered by the reporter and called again the next time, or gets a colder story. An official who answers gets called first next time.
- **The choice:** speak and own it, speak carefully, shield the talk, or stay out of the story.

## Ask the engine

| Packet line              | Record and what fires                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vote or act with a name  | Record exists, type fires on some. `press-interview` causes are `executive-action`, `veto-override`, `office.introduced`, `interview-published` (`src/director/data/situation-types.json`). A council or committee member's vote is `bill-vote:<bill>:<office>` (`legislature.ts:2940`) and prints as `office.voted`: nothing calls a scene on it. |
| Reporter exists to cast  | Record exists, fires. Role `reporter` binds `press-corps` (`civic-roles.ts:65`) or `press` (the outlet of an interview).                                                                                                                                                                                                                           |
| Official is the voter    | Exists. `official` binds `subject`; the executive-action cause matches `executiveId`, so a mayor who signs or vetoes fires. A council member who only voted does not.                                                                                                                                                                              |
| Reporter's question      | Record exists, fires. Bank has `press-comment` openers (`ask`, `confront`, `greet`) in `data/english/parts/scene-talk.json`, keyed `routine` only, 425 pieces in all.                                                                                                                                                                              |
| Four options             | Partly. Reply moves in the bank: `answer` (51), `deflect` (14), `stall` (14), `refuse` (16), `leave` (36), `lie`, `boast`, `confront`. No move for "send them to staff", none for "off the record".                                                                                                                                                |
| Phone or hallway         | Exists. Type setting is `venue` or `phone`; no rule picks one from the hour or the place of the vote.                                                                                                                                                                                                                                              |
| Declined call            | No record. The scene only plays when the player is the official and a call comes; a call the player never takes writes nothing, and the outlet's side (`status: "declined"` in `press.ts:193`) is about the outlet declining a candidate, not an official declining the outlet.                                                                    |
| Comment printed next day | No record read. `scene.reply` is written (`purpose-scene.ts:380`, facts `move`, `line`), but only `candidacy` reads it (`answerPartyAsk`, `candidacy.ts:1345`). `printedFacts` (`printed-words.ts:126`) builds stories from the source record's facts; it has no quote, no "did not return" line, and no reader of `scene.reply`.                  |
| Reporter remembers       | No record. `scene.reply` writes `contact` time with the reporter (`purpose-scene.ts:392`); nothing makes the next call, the next story's tone or who is called first depend on it.                                                                                                                                                                 |
| Reader holds the reason  | Exists for the vote (views read `press.printed` topic via `press-topics.ts`); not for the stated reason, since none is kept.                                                                                                                                                                                                                       |

## Gaps

| Gap                                                                                                                 | Kind                     |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| No `press-interview` cause on a member's vote (`bill-vote`, `office.voted`) or a council act; only executives       | producer (lead director) |
| Printed story has no official line: the stated reply (on record, statement, background) is never read               | engine (press)           |
| A call the official lets go unanswered writes no record, so "did not return a call" can never be printed            | engine (press)           |
| Reply moves lack "send to staff / written statement" and "off the record" as stances; all bank pieces are `routine` | lines                    |
| Reporter's memory of the exchange (who gets called first, how the next story reads) does not exist                  | engine (press)           |
| Reporter lines do not vary by outlet kind (daily, weekly, TV, one-person site) or by the reporter's trait           | lines                    |
| Hallway versus phone not chosen from the vote's hour and place                                                      | producer (lead director) |

## Lines the bank needs

**The reporter** (opener and follow-up, `press-comment`, versions by outlet kind and the reporter's top trait):

- Daily or TV, in a hurry: the vote in a clause, the reason asked for in one breath, a deadline said aloud; patient/thorough and blunt/pushy versions.
- Weekly or one-person site: knows the official by name and the ward, asks what it means for the street, can take a callback; warm/fair and wary/skeptical versions.
- Follow-ups that fit each stance below: pins a quote down ("so I can say that?"), accepts the statement, confirms the terms before the off-the-record remark, notes the refusal and says they will print that.

**Four reply stances for the official** (versions by trait and tie to the player):

1. **On the record:** gives the reason in plain words and lets the name go with it; the sure version and the hot-tempered version.
2. **A careful statement:** reads a short line, sends them to the clerk or staff; the cautious version and the evasive version.
3. **Off the record:** asks first, "can we keep this between us", states the terms; the trusting version and the calculating version.
4. **No comment:** declines, or says nothing and lets the call go; the curt version and the stung version.

## Other lives the same scene covers

- A school board member called by the local paper about a vote on a closed school: the vote record and the same four stances; the board president speaks for the body in the story (Georgia weekly editorial above shows the dodge).
- A mayor reached by a TV reporter after signing or vetoing an ordinance: the executive-action cause that already fires, and the printed story that quotes the signing statement or "did not return a request for comment" (WSOC story above).
