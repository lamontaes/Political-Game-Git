# Episode: a primary challenge from your own side (office or phone, the filing list is out)

Slug `a-primary-challenge-from-your-own-side`. Types: `filing`, `party-ask`, `rally-opponent`; missing: a "challenged from within" type fired by a same-party filing against a sitting holder. Season: filing and campaign. Owner asked for "primary challenges" (Oct 14, OD:185; `owner-scene-examples.md` line 92; loss side is `words-primary-loss-scene`, #6022). Calibration only: no real name or quoted line goes into any bank.

## Sources read (for calibration)

Opened in full (fetched pages):

1. WFAE, "Swing-vote Charlotte lawmakers have target on them in Democratic primary", Feb 26, 2026, https://www.wfae.org/politics/2026-02-26/swing-vote-charlotte-lawmakers-have-target-on-them-in-democratic-primary. Two sitting state House members, long-serving, were challenged by fellow Democrats after voting with Republicans to override vetoes. The state party backed the challengers; the governor and a Black political caucus endorsed one. The page does not say when either incumbent learned of the challenge. One incumbent said, in substance, that voting with your party every time is not serving constituents. A forum host skipped one incumbent on the call.
2. North State Journal, "Mecklenburg Democrat switches to unaffiliated following primary ouster", reported Apr 26, 2026, https://nsjonline.com/?p=104797. The incumbent lost the March primary, then changed her registration, calling the governor's endorsement of her opponent "about power". No party statement in the piece.

Seen only as search summaries (not opened): 3. Axios Charlotte, Dec 19, 2025, https://www.axios.com/local/charlotte/2025/12/19/democrats-overrides-primaries-cunningham-majeed (fetch returned 403). Summary says the county party chair stayed neutral and the state party does not formally endorse in primaries. Treat as unverified. 4. Nashville Scene, "Democratic Caucus Chair Mike Stewart Fends Off Primary Challenge", https://www.nashvillescene.com/news/pithinthewind/democratic-caucus-chair-mike-stewart-fends-off-primary-challenge/article_281ab086-3347-57fc-919a-9641f137a4da.html (date not seen). A caucus chair beat a local pastor. 5. Iowa Starting Line, 2016, https://iowastartingline.com/?p=5112. A three-term Democratic state representative faced a strong primary challenge from another Democrat.

## Fact packet (what happens, in substance)

- **Who and why:** the sitting state representative; a fellow party member files against the seat; a third person (a staffer, a caucus colleague or a reporter) brings the news.
- **Trigger:** a challenger files in the incumbent's own party for the seat, or a local group announces a recruit. The holder sees it on the filing list or hears it from a reporter asking for a response.
- **Why the challenge:** a recorded vote the party disliked (a veto override, a budget vote, a utility bill). The challenger names the vote and the donors behind it, and promises housing, wages and local say.
- **Party's local leaders:** split. The state party backs the challenger and blocks the incumbent from its voter file; the governor endorses the challenger; allied groups endorse; the county chair says the party is neutral. A forum host skips the incumbent on the call.
- **Money:** the incumbent has more PAC money than the challenger at first; the challenger has more small donors (about $121,000 to about $50,000 at year end in one race).
- **The incumbent's stand:** votes by conscience, not the party line, "I serve my district".
- **Choice faced:** fight the primary, soften the vote record, ask allies for endorsements, or leave the party or the seat.
- **How it ended:** the challenger won by a wide margin (70% in one race); the loser then left the party and changed registration, and the chamber's balance moved.
- **After:** the next contest begins from the loss; friends and the party hear which side the loser took.

## Ask the engine

| Packet line                              | Record and type                                                                                                                                                                                                                                                                                                                                                                             | Citing                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Challenger files in the same party       | A filing row names a party (`FilingRow.party`, `src/core2/modules/elections.ts:107`); `primaryDate` is set per contest (`elections.ts:469`) and `holdPrimary` counts a party primary (`voting.ts:1452`). Record exists; a type fires only on `candidate-filed` with `counterpart: none` (`filing`), which is the filer's own visit, not the holder's news. Nothing fires for the incumbent. | `situation-types.json` `filing`             |
| Holder learns of it                      | `candidate-filed` event exists; no cast of "the sitting holder" as the asked. No type fires.                                                                                                                                                                                                                                                                                                | `voting.ts:351-402`, `situation-types.json` |
| The vote that caused it                  | Vote records exist in the legislature engine; no link from a vote to a challenger's reason, so `ask-why` has no source. No record of the challenger's stated reason.                                                                                                                                                                                                                        | `src/core2/modules/` (no field found)       |
| Party leaders' stance (neutral, backing) | No endorsement-by-party record. Candidate endorsements exist (`endorserIds`, `campaigns.traits.test.ts:446`) and `party-ask` fires on `party.nomination`, but the party never takes a side against a sitting member. Record does not exist.                                                                                                                                                 | `situation-types.json` `party-ask`          |
| Blocked from party voter tools           | No record.                                                                                                                                                                                                                                                                                                                                                                                  | none found                                  |
| Money gap                                | Campaign gifts and contributions exist; nothing reads them to open a scene. Record exists, nothing fires.                                                                                                                                                                                                                                                                                   | `campaigns.ts`                              |
| Primary count and winner                 | `primary-result:<contest>` emitted with votes (`voting.ts:1677`). Record exists; no director type reads it (`primary-result` appears only in `purpose-scenes.test.ts`).                                                                                                                                                                                                                     | `voting.ts:1677`                            |
| Loser leaves the party                   | `partyTie` and filing under a label take membership (`elections.ts:668-694`); no leave-the-party decision after a loss. Record does not exist.                                                                                                                                                                                                                                              | `elections.ts`                              |
| Next contest starts from the loss        | `election-result` feeds `candidacyReasons` (`household-after-the-loss`); a primary loss is not read the same way. Partly.                                                                                                                                                                                                                                                                   | `candidacy.ts`                              |

Can two of the same party file for one seat? The filing rule checks party membership only (`elections.ts:668-694`), and a primary ballot is built from the filings, so yes in the engine. Whether a played world ever produces an incumbent with a same-party filer was not run.

## Gaps

- Holder never gets the news when a same-party filer appears. **producer (lead director):** a `challenged-from-within` type on `candidate-filed` where the party equals the sitting holder's, asked = holder, asker = a staffer, the party chair or a reporter.
- Party takes no side. **engine (parties):** a party's stance on a contested primary (neutral, backs holder, backs challenger) as a record the chair can state and a voter can learn of. Needs a cause, such as the holder's vote against the party's platform.
- Challenger has no stated reason. **engine (elections/candidacy):** the filing keeps the reason (a vote, a donor, an issue) so the scene and `ask-why` can cite it.
- Vote-to-challenge link. **engine (legislature):** a recorded vote the party named against a member, readable by candidacy.
- Primary result unread. **producer (lead director):** a win and a loss scene on `primary-result:<contest>` (the `words-primary-loss-scene` item covers the loss).
- Loss then leave the party. **engine (parties):** a leave-party decision after a primary loss, read by candidacy.
- Lines for the news, the chair and the challenger. **lines:** below.

## Lines the bank needs

Each speaker has versions by top trait and by tie to the player; none carries a real name or phrase.

- **The bearer** (a staffer, a reporter, a colleague): says who filed, in which party, for which seat; names the vote if the record carries one; asks for a response. Hurried, careful or eager, by trait.
- **The party chair:** stays neutral and asks the holder to keep it clean; or says the party is backing the challenger and names the vote; or says nothing and the call goes unreturned. Warm, blunt, or cold, by tie.
- **The challenger:** at a forum or door, says what they will do for the district and what the holder did, in the challenger's own trade or neighborhood terms.
- **Player replies (four stances):** take it on (I will run on my record); soften (I hear the district, I will look at that vote again); call in allies (ask for an endorsement or a favor); step back (I will not seek the seat again, or I will switch party).

## Other lives the same scene covers

- A three-term Iowa state representative facing another Democrat in a strong primary (Iowa Starting Line, 2016, search summary only, https://iowastartingline.com/?p=5112).
- A Nashville caucus chair who beat a local pastor's primary challenge (Nashville Scene, search summary only, URL in source 4).
