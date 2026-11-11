# Episode: a first-time candidate knocks on a stranger's door (door-ask)

Slug `the-first-door-of-the-day`. Types: `door-ask`. Season: campaigning, filed for a local seat. Calibration only: nothing here ships as player text; no real name or quoted line is in any bank.

## Sources read (for calibration)

Opened in full (fetched Nov 11, 2026):

1. Sebastopol Times, "What it takes to run for city council, Part 3" (https://www.sebastopoltimes.com/p/what-it-takes-to-run-for-city-council-0ad). Past and present candidates call door-to-door canvassing the most valuable campaign work, for the talk and for what the candidate sees on each street (road conditions, sidewalks, front yards). A former candidate advises starting early and going out every day; many people who ran for that council walked the entire town twice. One candidate walked after work until dusk, with friends, splitting the street. Residents were friendly: one offered a whiskey on a rainy day. When nobody is home, a door hanger shows "you at least tried." The article gives no script and says little about what goes wrong.

Seen only as search summaries (not opened):

2. A Farmington Hills candidate's account: many residents said a local candidate had never come to their door before, and that alone earned trust.
3. A campaign guide (GoodParty): voters remember how the exchange made them feel more than the pitch; a debrief after the walk on what was heard.
4. A local candidate's note: do not knock again and again at a door that did not answer, or you will annoy the voter.

All of this is training and press material from candidates; none of it measures how many doors move a vote.

## Fact packet (what happens, in substance)

- **Who:** a first-time candidate for a local seat, on foot, with or without a friend, in the town's own streets. The resident is a stranger, often home in the evening, sometimes not home at all.
- **Trigger:** the candidate has filed and has a list of streets. The knock itself is the cause; the resident did not ask for it.
- **What the candidate asks:** for a minute, for the resident's own concerns first, and then for support. The candidate is also there to learn the street (a road in bad shape, a closed storefront).
- **What the resident does:** answers warmly, answers guardedly, says "I'll think about it," says they never meet candidates at the door, or is not home.
- **What it costs:** the candidate's evenings, many days in a row; a repeat knock at a door that stayed closed costs goodwill.
- **What the candidate leaves:** a door hanger when nobody answers.
- **What changes after:** the resident's view of the candidate (warmer for having been asked in person, more so where the candidate listened); the candidate's own sense of what the town wants.

## Ask the engine

| Packet line                                         | Record? / fires?                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The candidate knocks on a resident's door           | Exists: the campaign engine's `campaign.door` record is the cause (`door-first` for the first knock at a door, `door-again` for a return) in situation-types.json. The scene-web report, Wheat Ridge, Colorado (0884440), seed 0e3f306ea1b7271286ee37f35d841492115e1abb, shows 0 fired in the played year. Why it did not fire is not yet traced. |
| The resident answers from where the knock left them | Exists in the type's note: the resident answers from the campaign engine's warmth toward the player. Not re-read in code here.                                                                                                                                                                                                                    |
| Nobody home: a door hanger                          | Not seen in the type's roles or note. Unknown.                                                                                                                                                                                                                                                                                                    |
| Friends walk the street with the candidate          | Not seen as a record.                                                                                                                                                                                                                                                                                                                             |
| The candidate learns what the street needs          | Not seen as a record the scene writes. The type's moves are request, press, thank, accept.                                                                                                                                                                                                                                                        |
| A repeat knock costs goodwill                       | `door-again` is its own cause; whether the engine lowers warmth for a second knock was not checked.                                                                                                                                                                                                                                               |

## Gaps

| Gap                                                         | Owner                        |
| ----------------------------------------------------------- | ---------------------------- |
| The scene did not fire in the played year (0 fired)         | producer (director engineer) |
| Nobody-home door and door hanger have no moves or record    | engine (campaigns), lines    |
| What the candidate learns on the street writes nothing back | engine (campaigns, issues)   |
| Whether a second knock lowers warmth                        | engine check                 |

## Lines the bank needs

For Story to write (builders never write data/english/parts):

- The resident, by trait and by tie to the candidate: warm ("nobody has come to the door before"), guarded ("I'll think about it"), declining politely, deflecting to the town's concern (a road, a closed shop).
- The candidate asking: first the minute and the resident's own concern, then the ask for support, then thanks whether or not it is a yes.
- Narration for a door nobody answers and the hanger left behind.

## Other lives the same scene covers

- A council candidate who canvassed after work until dusk, split the street with friends and met a resident who offered a whiskey on a rainy day (Sebastopol Times).
- A candidate who learned a street's sidewalks and front yards by walking it and called the walk "eye-opening" (Sebastopol Times).
