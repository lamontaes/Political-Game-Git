# Episode: the story breaks (a local official's conduct is in the paper; the reporter calls, the house reads it)

Slug `the-story-breaks`. Types: `scandal`. Season: holding office. Calibration only: nothing here ships as player text; no real name, outlet or quoted line goes into any bank.

## Sources read (for calibration)

Opened in full (fetched and read):

1. Charlotte Ledger, "Council member resigns after taking construction job", Jan. 11, 2021, https://www.thecharlotteledger.com/p/breaking-council-member-resigns-after. An at-large member became minority owner and president of a firm holding two big city contracts; state law bars profit from city contracts even with recusal. He had said he would not vote on those contracts. He resigned the same day, calling it "in the best interest" of himself, the company and the city. Council members applauded. The page does not say whether the reporter asked for comment.
2. WSB-TV, "Reed repays $12K after AJC asks for his city credit card bills", Mar. 28, 2018, https://www.wsbtv.com/news/2-investigates/kasim-reed-repays-12k-after-ajc-asks-for-his-city-credit-card-bills/723257426. The paper filed an open records request for card statements; the former mayor repaid about $11,851 by six personal checks dated three days after the city said the statements would be released. He said the request had nothing to do with the timing; his spokesman said he had begun his own review. Charges included a political gift, course fees and restaurant tabs.
3. Voice of OC, "Anaheim mayor addresses conflict of interest issues", Oct. 12, 2011, https://voiceofoc.org/2011/10/anaheim-mayor-addresses-conflict-of-interest-issues/. A division head's firm got 80 percent of outsourced plan review (at least $18,954); he said others made the assignments, then resigned. An expert called it not "a healthy relationship". The mayor spoke about "perceptions of conflict". The page reports no council action.
4. Spokesman-Review, Spokane, July 22, 2021, https://www.spokesman.com/stories/2021/jul/22/does-spokane-city-council-candidate-tyler-lemaster. The reporter checked the charter's one-year district rule against ballot mailing records, voter registration and property records, then reached the candidate by phone and sent written questions. He said "There are no doubts about my eligibility". A judge later removed him from the ballot (headline only).

Seen only as search summaries (not opened): Sacramento Bee report on a council member's residence (CBS Sacramento: he said the city had verified it and the report left out "the full picture"); Chico News & Review residency piece (403 on fetch); Winnipeg councillor's city card ($57K personal charges, CBC); New Orleans council card repayment (state auditor).

## Fact packet (what happens, in substance)

- **Who:** an elected local official; a reporter on the local paper; the official's household.
- **Before print:** the reporter works from public records the official signed or the city kept (contract list, card statements, ballot and property records). The reporter asks for comment by phone and in writing, and the page shows that call.
- **Trigger:** the story runs. The official learns it from the reporter's call, then from the page.
- **What the reporter wants:** an answer on the record to a specific document.
- **What the official says (substance):** denies ("no doubt about my eligibility"); explains (staff made the assignments; I never voted on it); pays it back and says the timing is chance; or resigns and calls it best for the city.
- **Attack on the paper:** the report "does not give the full picture"; the only line in sources 1 to 4 that goes at the story itself is a spokesman's, on timing.
- **The household:** reads it with the official, is asked by neighbors and coworkers, and asks what is true. The sources show nothing of this; it is the part the game must supply from its own records.
- **The choice:** answer the paper, pay or step down, or say nothing.
- **Next council meeting:** colleagues and the public speak to it in the open; in the one resignation, the body applauded and named a replacement. The mayor of the other city spoke of "perceptions".
- **What changes after:** a repaid sum, a seat vacated or kept, and a record the next election reads.

## Ask the engine

| Packet line                    | Record and what fires                                                                                                                                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paper trail before print       | Record exists for bribes only: `crimes`/`tips` tables (`src/core2/modules/press.ts` ~2318-2486). Nothing for a conflict, card or residency record. Nothing fires.                                                                      |
| Reporter asks for comment      | No record. `tips` carries `dig` and `run` but no call-for-comment event (`press.ts` 2400-2420).                                                                                                                                        |
| Story runs                     | Record exists: `press.exposed:<crime>:<outlet>` (`press.ts` 2432), `publicRecord`, `news`, topic `conduct:<official>`. Type `scandal` fires on it (`situation-types.json` 2525, cause `press.exposed`). Fact is always `bribe-taken`.  |
| Official denies or explains    | Type has moves `deflect, lie, confess, apologize`; bank has `deny` x2, `lie`, `deflect`, `confess` x2, `refuse` x2 (`data/english/parts/scene-talk.json`, purpose `scandal-comment`). No `explain`, no `apologize` piece. Fires, thin. |
| Attacks the story              | Record exists as the story's `slant` and the owner/publisher regard in `press.ts`; no reply stance or move for it. Nothing fires.                                                                                                      |
| Household reads it             | Role `family` (`household`, moves `comfort, blame, ask`) is in the type, but the bank has no `scandal-comment` line for the role (only `asker` and `asked`). Casts, then has nothing to say.                                           |
| Choice: answer, repay, resign  | `confess`/`apologize` write no outcome; no repay row; resignation exists in `offices.ts` but nothing in the scene writes it.                                                                                                           |
| Next council meeting           | `staff-news` producer reads `press.exposed` (aide scene, `situation-types.json` ~3783). No colleague or public scene at the meeting.                                                                                                   |
| Record the next election reads | Record exists and is read: `press.exposed` is a `feeling` channel in `director.json` (~1424, `directorChargedImpact`); voting weighs exposed corruption (`outcome-web-civic-played.test.ts`).                                          |

## Gaps

1. **engine (press, ethics, offices):** the only exposure is a taken bribe. No conflict-of-interest record (a contract held by a business the official owns or works for), no card-charge record, no residency record, so no story can print on them. Lead: press, with ethics and offices for the record sources.
2. **engine (press):** no "asked for comment" event between tip and print, so the call that opens every story has no record; the official's answer cannot be kept as `deny`/`explain`/`attack`.
3. **lines:** `scandal-comment` has no household (`family`) lines and no `explain`, `apologize` or `attack the story` replies; the type lists `apologize` but no piece uses it.
4. **producer (lead director):** the scene writes nothing back: no repay, resignation or stance record for the exposed official, and no colleague/public scene at the next council meeting.
5. **producer (lead director):** the scene is bound to `press.exposed` alone; a conflict story whose fact is not `bribe-taken` needs the cast to read the fact key, so lines can name what was found.

## Lines the bank needs

Each in several versions by top trait and tie to the player (steady, hurt, guarded, anxious; spouse, parent, child). Plain, no ids.

- **Reporter (opens by phone):** says who they are and which paper; names the document in substance ("the city's own contract list", "the card statements", "the voter file") and not the accusation; asks for an answer by a stated hour; offers to hear it on the record. Versions: courteous, hurried, hard, and one who already likes the official.
- **Household (after the story, at home):** opens on what a neighbor, boss or school said, then asks "is it true"; one version defends, one blames the player for not telling them first, one only asks what they should say if asked.
- **Official's four replies:**
  - **Deny:** it is wrong, the record shows otherwise, I will say so on the record.
  - **Explain:** here is who decided it, here is why I did not vote, here is the paper that says so.
  - **Apologize:** I should have asked before I took it, I am paying it back, I will say so at the meeting.
  - **Attack the story:** the piece leaves out what matters and the paper has wanted this for a year; the only fact I will give is the date.

## Other lives the same scene covers

- A school board member whose family firm sold buses to the district, found from the district's vendor list (the contract-held-by-your-business case; sources 1 and 3 give the pattern).
- A county commissioner whose address on the ballot and property record differ, called by the paper before print (source 4).
