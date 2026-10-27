# Episode: the donor who gave, and now wants something (office or phone)

Slug `the-donor-who-wants-something`. Types: `donor-ask`. Season: holding office, after a win. Calibration only: nothing here ships; no real name or quoted line goes into any bank. Related, not repeated: `envelope-refused-developer` (cash, a crime). This one is lawful money, reported, and a later ask.

## Sources read (for calibration)

Opened in full (WebFetch returned the page text):

1. azfamily (KPHO/KTVK), Nov 14-15, 2022, https://www.azfamily.com/2022/11/14/gilbert-residents-attorney-demand-recusal-rezoning-vote-after-developer-gives-thousands-town-councils-campaigns . A developer's vice president gave $5,000 to each of two Gilbert, Arizona council members' reelection campaigns in July; the developer's law firm gave too. Four months later a 255-acre industrial rezoning came to a vote. A watchdog lawyer said they "need to recuse themselves"; both said gifts have no bearing on their votes. The page does not report the vote or any recusal.
2. Fox 5 DC, Feb 4, 2021, https://www.fox5dc.com/news/ethics-concerns-stall-prince-georges-county-rezoning-effort . A county law bars developer money to council members and requires recusal on that developer's zoning cases. A member said a PAC funded by a developer gave to him and he learned of the link late; most of the council had similar gifts. Too many recusals meant no quorum for a six-year rezoning plan, so the council asked the state legislature for an exemption. Final result not reported.

Seen only as search summaries (not opened; the pages returned 403 or were not fetched):

3. San Diego Reader, Oct 2012, https://www.sandiegoreader.com/news/2012/oct/28/stringers-chula-vista-ethics-meeting-/ . A Chula Vista, California council member was accused of voting on a project after about $1,900 in donations tied to it; the ethics board voted 5-1 to dismiss for failing the code's prima facie test. Another member had taken money from the same developer and was not named.
4. Alexandria Times, June (year not seen), https://alextimes.com/?p=38019 . A vice mayor recused herself from a permit hearing after disclosing a roughly $100 gift from the building's owner, having said in her campaign she would return developer money.
5. Fox 5 and others on the Scottsdale, Arizona rezoning (search summary only): a candidate urged members who took the developer's money to return it. Not used in the packet.

## Fact packet (what happens, in substance)

- **Who:** a lawful donor, a local developer, a business owner or a union local, and an official the donor helped elect. Tie: a gift on the campaign's books, dealings at hearings.
- **Before:** the donor gave to the official's campaign (thousands, for a council seat), reported on the public finance filing. In source 1 the donor's lawyers and the firm gave as well, so one interest shows up as several names.
- **Trigger:** months later a matter touching the donor comes up: a rezoning, a contract, a permit.
- **The ask:** a meeting first, then a yes. The donor does not mention the gift; the gift is on the record anyway.
- **What each wants:** the donor wants a hearing and a vote; the official wants to hear them without being seen as bought, and to keep the next donor.
- **Official's answers seen:** hear them out and vote as before (source 1); recuse and say why (sources 4, 2); say nothing and let the law decide (source 2); wave off the complaint (source 3).
- **The choice:** meet, refuse the meeting, step out of the vote, or let them think it will go their way.
- **After:** a watchdog or a reporter ties the gift to the vote (source 1); a board examines it and may find nothing (source 3); recusal can strip a body of its quorum (source 2); or nothing follows.
- **What the genre teaches:** the gift is public from day one. What is private is what the donor said they wanted, and what the official answered.

## Ask the engine

| Line                                            | Record                                                                                                           | Fires?                                                                                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Donor gave to the campaign                      | `gifts` table row `<filing>                                                                                      | <donor>`, `donorId`, `totalMinor`, `lastDate` (`campaigns.ts:128`, written at `:1423`); journal posting `donation:<filing>:<donor>:<date>:<given>` | Record exists. **Names the donor.** Nothing fires: `donor-ask` waits on `awaitingProducer: "donor-ask"` (`situation-types.json` ~3168) |
| Donor has an interest (developer, owner, union) | Interest groups, contracts (see `envelope-refused-developer`); a gift row carries no link to a matter            | Exists elsewhere; the link gift-to-matter does not                                                                                                 |
| Matter comes up                                 | Ordinance and contract records in the legislature module                                                         | Exists, nothing fires                                                                                                                              |
| The ask (meeting, vote)                         | No `campaign-contribution` event; the type's cause names a record the campaigns engine does not emit as an event | **No record**                                                                                                                                      |
| Official's reply                                | `scene.reply` event only; nothing on `gifts` or any vote reads it                                                | Reply is written; no engine reads it                                                                                                               |
| Could a later vote read the gift?               | `src/core2/modules/legislature.ts` has no donor or recusal read (grep for recus, donor, contribut: none)         | **No.** The gift is on the books and no vote reads it                                                                                              |
| Recusal                                         | No recusal record in the legislature or ethics engines                                                           | **No record**                                                                                                                                      |
| Disclosure and press                            | `donation` postings are public to the filings view; press reads none (`press.ts` has no gift read)               | Exists as money; no story fires                                                                                                                    |
| Many names, one interest                        | Gifts are per person; no donor-to-group tie                                                                      | **No record**                                                                                                                                      |

## Gaps

1. **Producer (lead director):** `donor-ask` never fires. Needs an event on `gifts.put` or a matter record naming the donor's stake, so the cause matches (cast: donor from `gifts.donorId`, the official as `you`; no scene when the donor has no pending matter).
2. **Engine (campaigns):** a gift row has no link to the donor's interest. Add the donor's stake (contract bid, interest group, zoning applicant) so a matter can be found for a given gift. Filed with `lead: effects`.
3. **Engine (legislature, ethics):** no recusal and no read of `gifts` when a member votes. Needs: a recusal record (member, matter, reason, gift id), a vote that reads it, and where local law requires it, a quorum check (source 2).
4. **Engine (press):** nothing ties a gift to a later vote for a story. A press read of `gifts` against vote records, only where the public could learn it (`ask-why`).
5. **Lines:** the bank has the opener by purpose `donor-ask`, `key: favor-asked`; check four reply stances exist per trait and tie.
6. **Producer (lead director):** the written outcome. The reply must write a record that the vote reads (see 3), or the scene writes nothing.

## Lines the bank needs

The donor, by trait and size of gift:

- **Small gift, many hands (a union local, a shop owner):** warm, asks for time, "we were there for you."
- **Large gift, patient (a developer):** formal, never says the gift; says "the project," "your vote," "a short meeting."
- **Large gift, pressing:** reminds, hints at next cycle; guarded official hears the threat.
- **Plain, anxious:** says what the matter means to jobs; no mention of money.

The official's four stances, each by top trait and tie to the donor:

1. **Hear them out:** a meeting set in the open, "I will listen. I make no promise."
2. **Refuse:** no meeting off the record; "send it to the hearing."
3. **Recuse:** "I took your support. I will sit this one out," written to a recusal record.
4. **Promise:** "You will have my vote." Writes a promise the vote reads, kept or broken in the vote itself.

## Other lives the same scene covers

- A school board member and a vendor whose owner gave to the campaign and now asks for a meeting about a district contract (Dunwoody, Georgia rezoning sent back over a law firm's gifts, search summary only, https://www.reporternewspapers.net/2013/05/16/council-tells-commission-to-reconsider-zoning/).
